'use strict';
// Servidor: HTTP + Socket.IO. Toda a lógica do jogo fica em GameEngine.js.
//   /            -> tela de transmissão (public/index.html)
//   /admin.html  -> painel administrativo (somente neste computador + senha)
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');

const log = require('./logger');
const story = require('./Data/Story');
const { words } = require('./Data/Words');
const { WordManager } = require('./WordManager');
const { Scoreboard } = require('./Scoreboard');
const { GameEngine } = require('./GameEngine');

const DATA_DIR = path.join(__dirname, 'Data');
const PORT = Number(process.env.PORT) || story.server.port;
const HOST = process.env.HOST || story.server.host;
const ALLOW_REMOTE_ADMIN = process.env.ALLOW_REMOTE_ADMIN === '1';

// ---------- módulos opcionais (entregues nos próximos lotes) ----------
function loadDrawings() {
    try {
        const mod = require('./Data/Drawings');
        if (typeof mod.getDrawing === 'function' && typeof mod.hasDrawing === 'function') return mod;
        log.warn('Data/Drawings.js está no formato antigo. As rodadas rodam sem desenho até o Lote 2 ser instalado.');
    } catch (err) {
        log.warn('Data/Drawings.js não pôde ser carregado:', err.message);
    }
    return null;
}
const drawings = loadDrawings();

function loadTikTokBridge() {
    if (!fs.existsSync(path.join(__dirname, 'TikTokBridge.js'))) return null;
    try { return require('./TikTokBridge'); } catch (err) { log.error('Falha ao carregar TikTokBridge.js', err); return null; }
}
const bridgeModule = loadTikTokBridge();
let bridge = null;

// ---------- senha do painel ----------
function loadAdminToken() {
    if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
    const file = path.join(DATA_DIR, 'admin-token.txt');
    try {
        const saved = fs.readFileSync(file, 'utf8').trim();
        if (saved.length >= 16) return saved;
    } catch (_) { /* gera abaixo */ }
    const token = crypto.randomBytes(18).toString('hex');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, token, 'utf8');
    return token;
}
const ADMIN_TOKEN = loadAdminToken();
const safeEqual = (a, b) => {
    const A = Buffer.from(String(a || ''));
    const B = Buffer.from(String(b));
    return A.length === B.length && crypto.timingSafeEqual(A, B);
};
const isLocal = addr => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr);

// ---------- express ----------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e5 }); // sem CORS: só a própria página se conecta

app.disable('x-powered-by');
app.use((req, res, next) => {
    if (req.path.toLowerCase().startsWith('/admin') && !ALLOW_REMOTE_ADMIN && !isLocal(req.socket.remoteAddress)) {
        return res.status(403).send('Acesso negado');
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.json({ ok: true }));

// ---------- jogo ----------
const adminNs = io.of('/admin');
const scoreboard = new Scoreboard({ file: path.join(DATA_DIR, 'scores.json') });
const wordManager = new WordManager({
    words,
    historyFile: path.join(DATA_DIR, 'history.json'),
    hasDrawing: drawings ? id => drawings.hasDrawing(id) : null,
    log
});
const engine = new GameEngine({
    words: wordManager,
    scoreboard,
    story,
    drawings,
    settingsFile: path.join(DATA_DIR, 'settings.json'),
    toPublic: (event, data) => io.emit(event, data),
    toAdmin: (event, data) => adminNs.emit(event, data),
    log
});

// Tela pública: só recebe. Palpites de teste só são aceitos no modo TESTE e vindos deste computador.
io.on('connection', socket => {
    socket.emit('state', engine.getPublicState());
    socket.on('testGuess', payload => {
        if (engine.settings.mode !== 'test' || !isLocal(socket.handshake.address)) return;
        const p = payload && typeof payload === 'object' ? payload : {};
        engine.handleComment({ user: p.user || 'Voce_Teste', text: p.text, source: 'test' });
    });
});

// Painel admin: exige senha e conexão local.
adminNs.use((socket, next) => {
    if (!ALLOW_REMOTE_ADMIN && !isLocal(socket.handshake.address)) return next(new Error('Acesso negado'));
    if (!safeEqual(socket.handshake.auth && socket.handshake.auth.token, ADMIN_TOKEN)) return next(new Error('Senha incorreta'));
    next();
});

const commands = {
    getState: () => ({ ok: true }),
    start: () => engine.start(),
    stop: () => engine.stop(),
    startRound: () => engine.startRound(),
    nextRound: () => engine.nextRound(),
    pause: () => engine.pause(),
    resume: () => engine.resume(),
    skip: () => engine.skip(),
    endRound: () => engine.endRound('admin'),
    restartDrawing: () => engine.restartDrawing(),
    completeDrawing: () => engine.useTool('completeDrawing', null),
    turbo: () => engine.useTool('turbo', null),
    revealLetter: () => engine.useTool('revealLetter', null),
    hint: () => engine.useTool('hint', null),
    setSpeed: p => engine.setSpeed(p.value),
    setRoundSeconds: p => engine.setRoundSeconds(p.value),
    setAuto: p => engine.setAuto(p.value),
    setMode: p => engine.setMode(p.value),
    addLikes: p => engine.addLikes(p.count),
    testGuess: p => engine.handleComment({ user: p.user || 'Voce_Teste', text: p.text, source: 'test' }),
    resetGame: p => (p.confirm === true ? engine.resetGame() : { ok: false, error: 'Confirmação necessária' }),
    simulateGift: p => engine.handleGift({ user: p.user || 'Voce_Teste', giftName: p.gift, count: p.count || 1, source: 'test' }),
    resetScores: p => (p.confirm === true ? engine.resetScores({ includeRecord: p.includeRecord === true }) : { ok: false, error: 'Confirmação necessária' }),
    resetHistory: p => (p.confirm === true ? engine.resetHistory() : { ok: false, error: 'Confirmação necessária' }),
    getHistory: p => ({ ok: true, history: wordManager.getHistory(Math.min(Number(p.limit) || 50, 500)) }),
    connectTikTok: async p => {
        if (!bridgeModule) return { ok: false, error: 'A integração com o TikTok (Lote 3) ainda não foi instalada' };
        if (bridge) await bridge.disconnect();
        bridge = bridgeModule.createBridge({ engine, log, story, apiKey: process.env.TIKTOK_SIGN_API_KEY });
        engine.setMode('tiktok');
        return bridge.connect(String(p.username || ''));
    },
    disconnectTikTok: async () => {
        if (bridge) { await bridge.disconnect(); bridge = null; }
        engine.setTikTokStatus({ connected: false, text: 'Desconectado' });
        return { ok: true };
    }
};

adminNs.on('connection', socket => {
    log.info('Painel admin conectado');
    socket.emit('state', engine.getAdminState());
    socket.on('cmd', async (name, payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        try {
            const handler = Object.prototype.hasOwnProperty.call(commands, name) ? commands[name] : null;
            if (!handler) return reply({ ok: false, error: 'Comando desconhecido' });
            const p = payload && typeof payload === 'object' ? payload : {};
            const result = (await handler(p)) || { ok: true };
            if (!result.ok) log.warn(`Comando ${name} recusado: ${result.error}`);
            reply({ ...result, state: engine.getAdminState() });
        } catch (err) {
            log.error(`Erro no comando ${name}`, err);
            reply({ ok: false, error: 'Erro interno ao executar o comando' });
        }
    });
});

// ---------- inicialização e encerramento ----------
server.on('error', err => {
    if (err.code === 'EADDRINUSE') log.error(`A porta ${PORT} já está em uso. Feche o outro servidor ou use PORT=3001.`);
    else log.error('Erro no servidor', err);
    process.exit(1);
});

server.listen(PORT, HOST, () => {
    const stats = wordManager.stats();
    log.info(`Servidor em http://localhost:${PORT}  (tela do jogo)`);
    log.info(`Painel admin: http://localhost:${PORT}/admin.html#${ADMIN_TOKEN}`);
    log.info(`Palavras: ${stats.available} disponíveis de ${stats.total} (${stats.used} já usadas)`);
    if (story.round.autoStartOnBoot) engine.start();
});

function shutdown(signal) {
    log.info(`Encerrando (${signal})...`);
    engine.shutdown();
    if (bridge) bridge.disconnect().catch(() => {});
    io.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', err => log.error('Erro não tratado (o jogo continua):', err));
process.on('unhandledRejection', err => log.error('Promessa rejeitada (o jogo continua):', err));
