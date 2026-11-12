'use strict';
// Ponte com os comentários, presentes e curtidas REAIS da sua live, usando a biblioteca de terceiros
// "tiktok-live-connector" (não oficial; não pede senha nem cookie; só precisa do @ de quem está ao vivo).
// Instalação:  npm install tiktok-live-connector
//
// Limites e riscos (importante):
//  - Não é uma API oficial do TikTok. Pode parar de funcionar quando o TikTok mudar algo, e não tem garantia.
//  - O @ informado precisa estar AO VIVO no momento de conectar.
//  - Pode exigir uma chave de assinatura de terceiros (Euler Stream). Se a conexão falhar por isso,
//    defina a variável TIKTOK_SIGN_API_KEY antes de rodar o servidor.
//  - Se a conexão cair, a ponte tenta reconectar sozinha (5s, 10s, 20s... até 60s).
// O modo TESTE do painel continua funcionando mesmo se esta ponte não estiver conectada.

function pick(...values) { return values.find(v => v !== undefined && v !== null && v !== ''); }

function userOf(data) {
    const u = data.user || {};
    const pic = u.profilePicture || {};
    return {
        user: pick(u.uniqueId, data.uniqueId),
        nickname: pick(u.nickname, data.nickname, ''),
        avatar: pick(pic.url, Array.isArray(pic.urls) ? pic.urls[0] : undefined, Array.isArray(u.profilePictureUrls) ? u.profilePictureUrls[0] : undefined, data.profilePictureUrl, '')
    };
}

function createBridge({ engine, log = console, story, apiKey, lib = null }) {
    let connection = null;
    let wanted = null;        // @ que o usuário pediu para conectar
    let retryTimer = null;
    let retryMs = 5000;
    let manualStop = false;

    function status(connected, text) {
        engine.setTikTokStatus({ connected, text, username: wanted });
    }

    function loadLib() {
        if (lib) return lib;
        try { return require('tiktok-live-connector'); } catch (_) { return null; }
    }

    function attach(conn, L) {
        const E = L.WebcastEvent || { CHAT: 'chat', GIFT: 'gift', LIKE: 'like' };
        const C = L.ControlEvent || { CONNECTED: 'connected', DISCONNECTED: 'disconnected', ERROR: 'error' };

        conn.on(E.CHAT, data => {
            try {
                const u = userOf(data);
                const text = pick(data.comment, data.content, '');
                if (u.user && text) engine.handleComment({ user: u.user, nickname: u.nickname, avatar: u.avatar, text, source: 'tiktok' });
            } catch (err) { log.error('Erro ao processar comentário do TikTok', err); }
        });

        conn.on(E.GIFT, data => {
            try {
                const details = data.giftDetails || data.extendedGiftInfo || {};
                const giftType = pick(data.giftType, details.giftType, details.type);
                // Presentes em sequência chegam várias vezes: só vale quando a sequência termina.
                if (giftType === 1 && data.repeatEnd === false) return;
                const u = userOf(data);
                const name = pick(data.giftName, details.giftName, details.name);
                const count = pick(data.repeatCount, 1);
                const diamonds = Number(pick(data.diamondCount, details.diamondCount, 0)) * Number(count);
                if (u.user && name) engine.handleGift({ user: u.user, nickname: u.nickname, avatar: u.avatar, giftName: name, count, diamonds });
            } catch (err) { log.error('Erro ao processar presente do TikTok', err); }
        });

        conn.on(E.LIKE, data => {
            try { engine.addLikes(Number(pick(data.likeCount, 1))); } catch (err) { log.error('Erro ao processar curtidas', err); }
        });

        conn.on(C.DISCONNECTED, () => {
            log.warn('TikTok: conexão encerrada');
            if (manualStop) return;
            status(false, 'Conexão caiu. Reconectando...');
            scheduleRetry();
        });
        conn.on(C.ERROR, err => log.warn('TikTok: erro na conexão:', (err && (err.message || err.info)) || String(err)));
    }

    function friendly(err) {
        const msg = String((err && (err.message || err.info || err.exception)) || err || 'erro desconhecido');
        if (/offline|not live|isn't online|not currently live|LIVE has ended/i.test(msg)) return 'Esse usuário não está ao vivo agora. Inicie a live e tente de novo.';
        if (/sign|401|403|api key|rate/i.test(msg)) return 'O TikTok recusou a conexão (assinatura/limite). Veja o guia: pode ser preciso definir TIKTOK_SIGN_API_KEY. Detalhe: ' + msg.slice(0, 120);
        return 'Não foi possível conectar: ' + msg.slice(0, 160);
    }

    async function open() {
        const L = loadLib();
        if (!L) return { ok: false, error: 'Biblioteca não instalada. No terminal, rode: npm install tiktok-live-connector' };
        const Conn = L.TikTokLiveConnection || L.WebcastPushConnection;
        if (!Conn) return { ok: false, error: 'Versão da biblioteca não reconhecida.' };
        const options = { processInitialData: false };
        if (apiKey) options.signApiKey = apiKey;
        const conn = new Conn(wanted, options);
        attach(conn, L);
        connection = conn;
        try {
            await conn.connect();
            retryMs = 5000;
            status(true, `Conectado em @${wanted}`);
            log.info(`TikTok conectado em @${wanted}`);
            return { ok: true };
        } catch (err) {
            connection = null;
            return { ok: false, error: friendly(err) };
        }
    }

    function scheduleRetry() {
        clearTimeout(retryTimer);
        retryTimer = setTimeout(async () => {
            if (manualStop) return;
            try { if (connection && connection.disconnect) connection.disconnect(); } catch (_) { /* ignora */ }
            const r = await open();
            if (!r.ok && !manualStop) {
                status(false, `${r.error} (nova tentativa em ${Math.round(retryMs / 1000)}s)`);
                retryMs = Math.min(retryMs * 2, 60000);
                scheduleRetry();
            }
        }, retryMs);
        if (retryTimer.unref) retryTimer.unref();
    }

    return {
        async connect(username) {
            const name = String(username || '').replace(/^@/, '').trim();
            if (!/^[A-Za-z0-9_.]{2,40}$/.test(name)) return { ok: false, error: 'Digite o @ da sua conta (só letras, números, _ e .)' };
            manualStop = false;
            wanted = name;
            status(false, 'Conectando...');
            const r = await open();
            if (!r.ok) status(false, r.error);
            return r;
        },
        async disconnect() {
            manualStop = true;
            clearTimeout(retryTimer);
            try { if (connection && connection.disconnect) await connection.disconnect(); } catch (_) { /* ignora */ }
            connection = null;
        }
    };
}

module.exports = { createBridge };
