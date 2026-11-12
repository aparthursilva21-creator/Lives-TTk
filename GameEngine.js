'use strict';
// Motor do jogo: máquina de estados das rodadas, dicas, pontuação, ferramentas e comentários.
// Não conhece Socket.IO nem HTTP: recebe funções toPublic/toAdmin para enviar eventos.
//
// Fases: idle (aguardando) | drawing (rodada) | paused (rodada pausada) | reveal (mostrando resposta) | exhausted (banco esgotado)
const { buildSlots } = require('./WordManager');
const { Scoreboard } = require('./Scoreboard');
const { readJson, writeJsonAtomic } = require('./jsonStore');

const TICK_MS = 200;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const ok = (extra = {}) => ({ ok: true, ...extra });
const fail = error => ({ ok: false, error });

function cleanText(text, max) {
    return String(text == null ? '' : text).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function cleanName(name) {
    return String(name == null ? '' : name).replace(/[^\p{L}\p{N}_.\-]/gu, '').slice(0, 40);
}
function cleanAvatar(url) {
    const s = String(url || '');
    return /^https?:\/\//i.test(s) && s.length <= 500 ? s : '';
}

class GameEngine {
    constructor({ words, scoreboard, story, settingsFile, drawings = null, toPublic, toAdmin, log = console }) {
        this.words = words;
        this.scoreboard = scoreboard;
        this.story = story;
        this.drawings = drawings;
        this.toPublic = toPublic || (() => {});
        this.toAdmin = toAdmin || (() => {});
        this.log = log;
        this.settingsFile = settingsFile;

        const saved = settingsFile ? readJson(settingsFile, {}) : {};
        this.settings = {
            roundSeconds: story.round.seconds,
            baseSpeed: story.drawing.baseSpeed,
            auto: story.round.auto,
            mode: 'test',
            ...(saved && typeof saved === 'object' ? saved : {})
        };
        this.settings.roundSeconds = clamp(Number(this.settings.roundSeconds) || story.round.seconds, story.round.minSeconds, story.round.maxSeconds);
        this.settings.baseSpeed = clamp(Number(this.settings.baseSpeed) || 1, story.drawing.minSpeed, story.drawing.maxSpeed);
        if (!['test', 'tiktok'].includes(this.settings.mode)) this.settings.mode = 'test';

        this.phase = 'idle';
        this.live = false;
        this.round = null;
        this.lastEnd = null;
        this.gameOver = null;
        this.likes = 0;
        this.comments = [];
        this.commentSeq = 0;
        this.tickTimer = null;
        this.nextTimer = null;
        this.turboUntil = 0;
        this.lastTickAt = 0;
        this.lastSecond = null;
        this.tiktokStatus = { connected: false, text: 'Desconectado' };
    }

    // ---------- utilidades ----------
    _both(event, data) { this.toPublic(event, data); this.toAdmin(event, data); }
    _saveSettings() { if (this.settingsFile) writeJsonAtomic(this.settingsFile, this.settings); }
    _roundActive() { return this.phase === 'drawing' || this.phase === 'paused'; }
    _clearTick() { if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null; } }
    _clearNext() { if (this.nextTimer) { clearTimeout(this.nextTimer); this.nextTimer = null; } }
    _speed(now = Date.now()) { return this.settings.baseSpeed * (now < this.turboUntil ? this.story.drawing.turboFactor : 1); }
    setTikTokStatus(status) { this.tiktokStatus = status; this.emitState(); }

    emitState() {
        this.toPublic('state', this.getPublicState());
        this.toAdmin('state', this.getAdminState());
    }

    // ---------- estado enviado às telas ----------
    _publicSlots() {
        const r = this.round;
        if (!r) return [];
        const showAll = this.phase === 'reveal' || this.phase === 'gameover';
        return r.slots.map((s, i) => (s.t === 'l' ? { t: 'l', c: (showAll || r.revealed.has(i)) ? s.c : null } : s));
    }

    _drawingState() {
        const r = this.round;
        if (!r) return null;
        return {
            // Sem id: o id do desenho é igual ao id da palavra e entregaria a resposta.
            data: r.drawing,
            totalMs: r.drawDurationMs,
            elapsedMs: Math.round(r.drawElapsedMs),
            speed: this._speed(),
            paused: this.phase === 'paused'
        };
    }

    getPublicState({ includeDrawing = true } = {}) {
        const r = this.round;
        const active = this._roundActive();
        const state = {
            phase: this.phase,
            live: this.live,
            mode: this.settings.mode,
            round: this.scoreboard.round,
            record: this.scoreboard.record,
            roundSeconds: r ? Math.round(r.durationMs / 1000) : this.settings.roundSeconds,
            timeLeft: r && active ? Math.max(0, Math.ceil(r.timeLeftMs / 1000)) : (r && (this.phase === 'reveal' || this.phase === 'gameover') ? 0 : this.settings.roundSeconds),
            slots: this._publicSlots(),
            category: r && r.hints.category ? r.entry.category : null,
            description: r && r.hints.description ? r.entry.hint : null,
            hits: { count: r ? r.winners.length : 0, max: this.story.scoring.winnersPerRound },
            likes: { current: this.likes, perHint: this.story.hints.likesPerHint },
            tools: this.story.tools.map(t => ({ id: t.id, name: t.name, icon: t.icon, gift: t.gift || '', command: t.command, costLabel: `${t.pointsCost} PTS` })),
            gameOver: this.phase === 'gameover' ? this.gameOver : null,
            top: this.scoreboard.top(3),
            participants: this.scoreboard.participantsWithHits(),
            winnersThisRound: r ? r.winners.map(w => ({ rank: w.rank, username: w.username, points: w.points })) : [],
            reveal: this.phase === 'reveal' ? this.lastEnd : null,
            comments: this.comments.slice(-this.story.chat.recentMessages),
            drawing: includeDrawing ? this._drawingState() : null
        };
        return state;
    }

    getAdminState() {
        const r = this.round;
        const state = this.getPublicState({ includeDrawing: false });
        state.admin = {
            settings: { ...this.settings },
            secret: r ? { id: r.entry.id, word: r.entry.word, difficulty: r.entry.difficulty, aliases: r.entry.aliases, hint: r.entry.hint } : null,
            words: this.words.stats(),
            top: this.scoreboard.top(10),
            recentWinners: this.scoreboard.recentWinners(10),
            history: this.words.getHistory(20),
            tiktok: this.tiktokStatus,
            drawingProgress: r ? Math.round((r.drawElapsedMs / r.drawDurationMs) * 100) : 0
        };
        return state;
    }

    // ---------- ciclo da live ----------
    start() {
        this.live = true;
        this.log.info('Live iniciada');
        if (this.phase === 'idle') return this.startRound();
        this.emitState();
        return ok();
    }

    stop() {
        this.live = false;
        this._clearNext();
        this._clearTick();
        if (this._roundActive()) this.words.finish('interrompida');
        this.round = null;
        this.lastEnd = null;
        this.gameOver = null;
        this.phase = 'idle';
        this.log.info('Live parada');
        this.emitState();
        return ok();
    }

    shutdown() {
        this._clearNext();
        this._clearTick();
        if (this._roundActive()) this.words.finish('interrompida');
    }

    startRound() {
        if (this._roundActive()) return fail('Já existe uma rodada em andamento');
        this._clearNext();
        if (this.phase === 'gameover') this._finishGameOver();

        const number = this.scoreboard.round + 1;
        let entry = this.words.pick(number);
        if (!entry && this.story.game.autoRecycleWords && this.words.stats().used > 0) {
            this.log.warn('Palavras esgotadas: reiniciando o histórico automaticamente (autoRecycleWords)');
            this.words.reset();
            entry = this.words.pick(number);
        }
        if (!entry) {
            this._clearTick();
            this.round = null;
            this.phase = 'exhausted';
            const stats = this.words.stats();
            const text = stats.unusedWithoutDrawing > 0
                ? 'Sem palavras disponíveis: as restantes ainda não têm desenho.'
                : 'Banco de palavras esgotado! Reinicie o histórico no painel para jogar de novo.';
            this.log.warn(text);
            this._both('status', { kind: 'exhausted', text });
            this.emitState();
            return fail(text);
        }

        this.scoreboard.nextRound();
        const durationMs = Math.round(this.settings.roundSeconds * 1000);
        const slots = buildSlots(entry.word);
        this.round = {
            entry,
            slots,
            letterIdx: slots.map((s, i) => (s.t === 'l' ? i : -1)).filter(i => i >= 0),
            revealed: new Set(),
            hints: { category: false, description: false },
            hintStep: 0,
            timeHintIdx: 0,
            durationMs,
            timeLeftMs: durationMs,
            drawDurationMs: Math.round(durationMs * this.story.round.drawFraction),
            drawElapsedMs: 0,
            drawing: this.drawings ? this.drawings.getDrawing(entry.drawing) : null,
            winners: [],
            winnerKeys: new Set(),
            toolReadyAt: {}
        };
        this.likes = 0;
        this.turboUntil = 0;
        this.lastEnd = null;
        this.lastSecond = null;
        this.phase = 'drawing';
        this.lastTickAt = Date.now();

        this.log.info(`RODADA ${this.scoreboard.round} | ${entry.word} (${entry.category}, ${entry.difficulty}) | ${this.settings.roundSeconds}s`);
        this._clearTick();
        this.tickTimer = setInterval(() => this._tick(), TICK_MS);
        this.toPublic('round:new', this.getPublicState());
        this.toAdmin('state', this.getAdminState());
        return ok();
    }

    _tick() {
        const now = Date.now();
        const dt = Math.min(now - this.lastTickAt, 1000);
        this.lastTickAt = now;
        const r = this.round;
        if (!r || this.phase !== 'drawing') return;

        try {
            const wasTurbo = this.turboUntil > 0 && now - dt < this.turboUntil;
            r.timeLeftMs -= dt;
            r.drawElapsedMs = Math.min(r.drawDurationMs, r.drawElapsedMs + dt * this._speed(now));

            if (wasTurbo && now >= this.turboUntil) {
                this.turboUntil = 0;
                this._both('draw:control', { action: 'speed', speed: this._speed(now), elapsedMs: Math.round(r.drawElapsedMs) });
            }

            const fractions = this.story.hints.byTime.fractions;
            if (this.story.hints.byTime.enabled) {
                const elapsed = 1 - r.timeLeftMs / r.durationMs;
                while (r.timeHintIdx < fractions.length && elapsed >= fractions[r.timeHintIdx]) {
                    r.timeHintIdx++;
                    this._nextHint();
                }
            }

            const secs = Math.max(0, Math.ceil(r.timeLeftMs / 1000));
            if (secs !== this.lastSecond) {
                this.lastSecond = secs;
                this._both('timer', { timeLeft: secs, drawElapsedMs: Math.round(r.drawElapsedMs), speed: this._speed(now) });
            }
            if (r.timeLeftMs <= 0) this.endRound('timeout');
        } catch (err) {
            this.log.error('Erro no relógio da rodada', err);
        }
    }

    endRound(reason = 'admin') {
        if (!this._roundActive()) return fail('Não há rodada em andamento');
        this._clearTick();
        const r = this.round;
        const winners = r.winners.map(w => ({ rank: w.rank, username: w.username, points: w.points }));
        const first = winners[0] ? winners[0].username : null;
        const result = winners.length > 0 ? 'acertada'
            : reason === 'timeout' ? 'sem_acertos'
            : reason === 'skipped' ? 'pulada' : 'encerrada';

        this.words.finish(result, first);
        if (winners.length === 0 && reason === 'timeout' && this.story.game.loseOnTimeout) return this._beginGameOver(r.entry);
        if (winners.length > 0) {
            this.scoreboard.pushWinners({ round: this.scoreboard.round, word: r.entry.word, winners, at: new Date().toISOString() });
        }

        this.phase = 'reveal';
        const revealMs = Math.round(this.story.round.revealSeconds * 1000);
        this.lastEnd = { reason, answer: r.entry.word, category: r.entry.category, winners, nextInMs: revealMs };
        this.log.info(`Fim da rodada ${this.scoreboard.round}: ${reason} | ${winners.length} acerto(s)`);

        this.toPublic('round:end', this.lastEnd);
        this.emitState();

        this._clearNext();
        this.nextTimer = setTimeout(() => {
            this.nextTimer = null;
            if (this.phase !== 'reveal') return;
            if (this.live && this.settings.auto) {
                this.startRound();
            } else {
                this.phase = 'idle';
                this.emitState();
            }
        }, revealMs);
        return ok();
    }

    // Ninguém acertou a tempo: mostra a tela dos melhores e recomeça na fase 1.
    _beginGameOver(entry) {
        const g = this.story.game;
        this.gameOver = {
            phase: this.scoreboard.round,
            answer: entry.word,
            category: entry.category,
            players: this.scoreboard.runPlayers(),
            top: this.scoreboard.runTop(g.leaderboardSize),
            seconds: g.gameOverSeconds
        };
        this.phase = 'gameover';
        this.lastEnd = null;
        this.log.info(`FIM DE JOGO na fase ${this.gameOver.phase} (palavra: ${entry.word})`);
        this.toPublic('game:over', this.gameOver);
        this.emitState();
        this._clearNext();
        this.nextTimer = setTimeout(() => {
            this.nextTimer = null;
            if (this.phase !== 'gameover') return;
            this._finishGameOver();
            if (this.live && this.settings.auto) this.startRound();
            else { this.phase = 'idle'; this.emitState(); }
        }, g.gameOverSeconds * 1000);
        return ok();
    }

    _finishGameOver() {
        this.scoreboard.resetRun();
        this.scoreboard.setRound(0);
        this.gameOver = null;
    }

    // Recomeça tudo na fase 1 (placar da partida zerado). Não mexe no ranking geral nem no histórico de palavras.
    resetGame() {
        this._clearNext();
        this._clearTick();
        if (this._roundActive()) this.words.finish('interrompida');
        this.round = null;
        this.lastEnd = null;
        this._finishGameOver();
        this.phase = 'idle';
        this.log.info('Jogo reiniciado na fase 1');
        if (this.live) return this.startRound();
        this.emitState();
        return ok();
    }

    skip() {
        if (!this._roundActive()) return fail('Não há rodada para pular');
        this.endRound('skipped');
        // Pular não espera a tela de resposta: começa a próxima rodada se a live estiver automática.
        if (this.live && this.settings.auto) { this._clearNext(); return this.startRound(); }
        return ok();
    }

    nextRound() {
        if (this._roundActive()) return fail('Termine a rodada atual antes de iniciar a próxima');
        return this.startRound();
    }

    pause() {
        if (this.phase !== 'drawing') return fail('A rodada não está em andamento');
        this.phase = 'paused';
        this._both('draw:control', { action: 'pause', elapsedMs: Math.round(this.round.drawElapsedMs) });
        this.emitState();
        return ok();
    }

    resume() {
        if (this.phase !== 'paused') return fail('A rodada não está pausada');
        this.phase = 'drawing';
        this.lastTickAt = Date.now();
        this._both('draw:control', { action: 'resume', elapsedMs: Math.round(this.round.drawElapsedMs), speed: this._speed() });
        this.emitState();
        return ok();
    }

    // ---------- desenho ----------
    restartDrawing() {
        if (!this._roundActive()) return fail('Não há rodada em andamento');
        this.round.drawElapsedMs = 0;
        this._both('draw:control', { action: 'restart', elapsedMs: 0, speed: this._speed() });
        return ok();
    }

    completeDrawing() {
        if (!this._roundActive()) return fail('Não há rodada em andamento');
        this.round.drawElapsedMs = this.round.drawDurationMs;
        this._both('draw:control', { action: 'complete', elapsedMs: Math.round(this.round.drawDurationMs) });
        return ok();
    }

    turbo() {
        if (!this._roundActive()) return fail('Não há rodada em andamento');
        this.turboUntil = Date.now() + this.story.drawing.turboSeconds * 1000;
        this._both('draw:control', { action: 'speed', speed: this._speed(), elapsedMs: Math.round(this.round.drawElapsedMs) });
        return ok();
    }

    setSpeed(value) {
        const v = Number(value);
        if (!Number.isFinite(v)) return fail('Velocidade inválida');
        this.settings.baseSpeed = clamp(v, this.story.drawing.minSpeed, this.story.drawing.maxSpeed);
        this._saveSettings();
        if (this.round) this._both('draw:control', { action: 'speed', speed: this._speed(), elapsedMs: Math.round(this.round.drawElapsedMs) });
        this.emitState();
        return ok({ speed: this.settings.baseSpeed });
    }

    // ---------- dicas ----------
    _hintPayload(type) {
        const r = this.round;
        return { type, category: r.hints.category ? r.entry.category : null, description: r.hints.description ? r.entry.hint : null, slots: this._publicSlots() };
    }

    _letterCap() {
        const n = this.round.letterIdx.length;
        return Math.max(0, Math.min(n - 2, Math.floor(n * this.story.hints.maxRevealFraction)));
    }

    _revealRandomLetter() {
        const r = this.round;
        if (r.revealed.size >= this._letterCap()) return false;
        const candidates = r.letterIdx.filter(i => !r.revealed.has(i));
        if (candidates.length === 0) return false;
        r.revealed.add(candidates[Math.floor(Math.random() * candidates.length)]);
        return true;
    }

    _applyHint(type) {
        const r = this.round;
        if (type === 'category') { if (r.hints.category) return false; r.hints.category = true; return true; }
        if (type === 'description') { if (r.hints.description || !r.entry.hint) return false; r.hints.description = true; return true; }
        if (type === 'letter') return this._revealRandomLetter();
        if (type === 'drawing') {
            if (r.drawElapsedMs >= r.drawDurationMs) return false;
            r.drawElapsedMs = Math.min(r.drawDurationMs, r.drawElapsedMs + r.drawDurationMs * this.story.hints.drawingBoost);
            this._both('draw:control', { action: 'seek', elapsedMs: Math.round(r.drawElapsedMs) });
            return true;
        }
        return false;
    }

    _nextHint() {
        const r = this.round;
        const seq = this.story.hints.sequence;
        while (r.hintStep < seq.length) {
            const type = seq[r.hintStep++];
            if (this._applyHint(type)) {
                this._both('hint', this._hintPayload(type));
                return true;
            }
        }
        return false;
    }

    showHint() {
        if (!this._roundActive()) return fail('Não há rodada em andamento');
        return this._nextHint() ? ok() : fail('Não há mais dicas disponíveis');
    }

    revealLetter() {
        if (!this._roundActive()) return fail('Não há rodada em andamento');
        if (!this._revealRandomLetter()) return fail('Limite de letras reveladas atingido');
        this._both('hint', this._hintPayload('letter'));
        return ok();
    }

    addLikes(count) {
        const n = clamp(Math.floor(Number(count) || 0), 0, 10000);
        if (n === 0 || !this._roundActive()) return ok();
        const per = this.story.hints.likesPerHint;
        this.likes += n;
        let guard = 3; // no máximo 3 dicas por chamada
        while (this.likes >= per && guard-- > 0) {
            this.likes -= per;
            this._nextHint();
        }
        if (this.likes >= per) this.likes = per - 1;
        this._both('likes', { current: this.likes, perHint: per });
        return ok();
    }

    // ---------- ferramentas ----------
    // by: { username, nickname, avatar } quando o pedido vem de um espectador (gasta pontos); sem "by" é o painel admin (grátis).
    useTool(toolId, by = null, label = null) {
        const tool = this.story.tools.find(t => t.id === toolId);
        if (!tool) return fail('Ferramenta desconhecida');
        if (!this._roundActive()) return fail('Não há rodada em andamento');

        const now = Date.now();
        const readyAt = this.round.toolReadyAt[toolId] || 0;
        if (by && now < readyAt) return fail(`${tool.name} em recarga (${Math.ceil((readyAt - now) / 1000)}s)`);

        let key = null;
        if (by) {
            key = Scoreboard.keyFor(by.username);
            if (!this.scoreboard.canSpend(key, tool.pointsCost)) {
                return fail(`@${by.username} precisa de ${tool.pointsCost} pontos para usar ${tool.name}`);
            }
        }

        const actions = {
            revealLetter: () => this.revealLetter(),
            turbo: () => this.turbo(),
            completeDrawing: () => this.completeDrawing(),
            hint: () => this.showHint()
        };
        const result = actions[toolId]();
        if (!result.ok) return result;

        if (key) this.scoreboard.spend(key, tool.pointsCost);
        if (by) this.round.toolReadyAt[toolId] = now + tool.cooldownSeconds * 1000; // admin e presentes não têm recarga
        const who = by ? `@${by.username}` : (label || 'Admin');
        this._both('toast', { text: `${who} usou ${tool.name}`, kind: 'tool', tool: tool.id });
        this.log.info(`Ferramenta ${tool.name} usada por ${who}`);
        if (by) this._both('scores', { top: this.scoreboard.top(3), participants: this.scoreboard.participantsWithHits() });
        return ok();
    }

    // Presente do TikTok (ou simulado pelo painel). Presentes já foram "pagos" no TikTok: não gastam pontos.
    handleGift({ user, nickname, avatar, giftName, count = 1, diamonds = 0 } = {}) {
        const username = cleanName(user);
        const name = cleanText(giftName, 40);
        if (!username || !name) return fail('Presente inválido');
        const times = clamp(Math.floor(Number(count) || 1), 1, 3);
        const tool = this.story.tools.find(t => t.gifts.some(g => g.toLowerCase() === name.toLowerCase()));
        this._both('gift', { username, nickname: cleanText(nickname, 40), avatar: cleanAvatar(avatar), giftName: name, count: times, diamonds: Number(diamonds) || 0, tool: tool ? tool.name : null });
        this.log.info(`PRESENTE de @${username}: ${name} x${times}${tool ? ' -> ' + tool.name : ' (sem ferramenta)'}`);
        if (!tool) return ok({ unmapped: true });
        if (!this._roundActive()) return ok({ ignored: true });
        let applied = 0;
        for (let i = 0; i < times; i++) {
            if (!this.useTool(tool.id, null, `@${username} (${name})`).ok) break;
            applied++;
        }
        return ok({ applied });
    }

    // ---------- comentários e palpites ----------
    _pushComment(c) {
        this.comments.push(c);
        const max = this.story.chat.recentMessages;
        if (this.comments.length > max) this.comments.splice(0, this.comments.length - max);
        this._both('comment', c);
    }

    handleComment({ user, nickname, avatar, text, source = 'test' } = {}) {
        const username = cleanName(user);
        const message = cleanText(text, this.story.chat.maxMessageLength);
        if (!username || !message) return fail('Comentário inválido');

        const key = Scoreboard.keyFor(username);
        const profile = { username, nickname: cleanText(nickname, 40), avatar: cleanAvatar(avatar) };
        const base = { id: ++this.commentSeq, user: username, nickname: profile.nickname, avatar: profile.avatar, source };

        // Comandos de ferramentas pelo chat (ex.: !letra)
        if (message.startsWith('!')) {
            const tool = this.story.tools.find(t => t.command === message.toLowerCase());
            if (tool) {
                const result = this.useTool(tool.id, profile);
                this._pushComment({ ...base, text: message, correct: false });
                if (!result.ok) this._both('toast', { text: result.error, kind: 'info' });
                return result;
            }
        }

        const r = this.round;
        if (this._roundActive() && this.words.isCorrect(r.entry, message)) {
            // A resposta nunca aparece no chat enquanto a rodada está aberta (evita entregar aos outros).
            if (r.winnerKeys.has(key)) {
                this._pushComment({ ...base, text: '(já acertou esta rodada)', correct: false });
                return ok({ duplicate: true });
            }
            const rank = r.winners.length + 1;
            const pts = this.story.scoring.points;
            const points = pts[Math.min(rank, pts.length) - 1];
            r.winnerKeys.add(key);
            r.winners.push({ key, username, rank, points });
            const total = this.scoreboard.addHit(key, profile, points);

            this._pushComment({ ...base, text: 'acertou a palavra!', correct: true });
            this._both('correct', {
                username, nickname: profile.nickname, avatar: profile.avatar, rank, points,
                total: total.points, position: total.position,
                hits: { count: r.winners.length, max: this.story.scoring.winnersPerRound }
            });
            this._both('scores', { top: this.scoreboard.top(3), participants: this.scoreboard.participantsWithHits(), record: this.scoreboard.record });
            this.log.info(`ACERTO #${rank}: @${username} (+${points})`);

            if (r.winners.length >= this.story.scoring.winnersPerRound) this.endRound('complete');
            return ok({ correct: true, rank, points });
        }

        this._pushComment({ ...base, text: message, correct: false });
        return ok();
    }

    // ---------- configurações e manutenção ----------
    setRoundSeconds(value) {
        const v = Number(value);
        if (!Number.isFinite(v)) return fail('Tempo inválido');
        const { minSeconds, maxSeconds } = this.story.round;
        this.settings.roundSeconds = clamp(v, minSeconds, maxSeconds);
        this._saveSettings();
        this.emitState();
        return ok({ seconds: this.settings.roundSeconds, appliesFrom: this._roundActive() ? 'próxima rodada' : 'agora' });
    }

    setAuto(value) {
        this.settings.auto = Boolean(value);
        this._saveSettings();
        this.emitState();
        return ok({ auto: this.settings.auto });
    }

    setMode(value) {
        if (!['test', 'tiktok'].includes(value)) return fail('Modo inválido');
        this.settings.mode = value;
        this._saveSettings();
        this.emitState();
        return ok({ mode: value });
    }

    resetScores({ includeRecord = false } = {}) {
        this.scoreboard.reset({ includeRecord });
        if (this.round) { this.round.winners = []; this.round.winnerKeys = new Set(); }
        this._both('scores', { top: [], participants: 0, record: this.scoreboard.record });
        this.emitState();
        return ok();
    }

    resetHistory() {
        if (this._roundActive()) return fail('Termine a rodada atual antes de reiniciar o histórico');
        try { this.words.reset(); } catch (err) { return fail(err.message); }
        this.log.warn('Histórico de palavras reiniciado manualmente');
        if (this.phase === 'exhausted') this.phase = 'idle';
        if (this.live && this.phase === 'idle') return this.startRound();
        this.emitState();
        return ok();
    }
}

module.exports = { GameEngine };
