'use strict';
// Placar persistente: pontos, acertos, ranking, recorde e histórico de vencedores.
const { readJson, writeJsonAtomic } = require('./jsonStore');

const MAX_WINNERS_HISTORY = 200;

class Scoreboard {
    constructor({ file }) {
        this.file = file;
        const base = { meta: { round: 0, record: 0 }, users: {}, winners: [], run: { users: {} } };
        const saved = readJson(file, null);
        if (saved && typeof saved === 'object') {
            this.data = {
                meta: { ...base.meta, ...(saved.meta || {}) },
                users: saved.users && typeof saved.users === 'object' ? saved.users : {},
                winners: Array.isArray(saved.winners) ? saved.winners : [],
                run: saved.run && saved.run.users ? saved.run : { users: {} }
            };
        } else {
            this.data = base;
        }
    }

    _save() { writeJsonAtomic(this.file, this.data); }

    get round() { return this.data.meta.round; }
    get record() { return this.data.meta.record; }

    nextRound() {
        this.data.meta.round += 1;
        this._save();
        return this.data.meta.round;
    }

    // A chave tem prefixo para nunca colidir com nomes especiais de objetos JavaScript.
    static keyFor(username) { return 'u_' + String(username).toLowerCase(); }

    addHit(key, profile, points) {
        const user = this.data.users[key] || (this.data.users[key] = { username: profile.username, nickname: '', avatar: '', points: 0, hits: 0 });
        user.username = profile.username;
        user.nickname = profile.nickname || user.nickname || '';
        user.avatar = profile.avatar || user.avatar || '';
        user.points += points;
        user.hits += 1;
        user.lastHitAt = new Date().toISOString();
        if (user.points > this.data.meta.record) this.data.meta.record = user.points;
        const r = this.data.run.users[key] || (this.data.run.users[key] = { username: profile.username, avatar: '', points: 0, hits: 0 });
        r.username = profile.username; r.avatar = profile.avatar || r.avatar || ''; r.points += points; r.hits += 1;
        this._save();
        return { ...user, key, position: this.positionOf(key) };
    }

    pointsOf(key) { return this.data.users[key] ? this.data.users[key].points : 0; }
    canSpend(key, cost) { return this.pointsOf(key) >= cost; }

    spend(key, cost) {
        if (!this.canSpend(key, cost)) return false;
        this.data.users[key].points -= cost; // o recorde nunca diminui
        this._save();
        return true;
    }

    _sorted() {
        return Object.entries(this.data.users).sort(([, a], [, b]) =>
            b.points - a.points || b.hits - a.hits || a.username.localeCompare(b.username));
    }

    positionOf(key) {
        const index = this._sorted().findIndex(([k]) => k === key);
        return index < 0 ? null : index + 1;
    }

    top(n = 3) {
        return this._sorted().slice(0, n).map(([key, u], i) => ({
            pos: i + 1, key, username: u.username, nickname: u.nickname, avatar: u.avatar, points: u.points, hits: u.hits
        }));
    }

    participantsWithHits() {
        return Object.values(this.data.users).filter(u => u.hits > 0).length;
    }

    // Placar só da partida atual (zera quando o jogo recomeça na fase 1)
    runTop(n = 8) {
        return Object.values(this.data.run.users)
            .sort((a, b) => b.points - a.points || b.hits - a.hits || a.username.localeCompare(b.username))
            .slice(0, n).map((u, i) => ({ pos: i + 1, username: u.username, avatar: u.avatar, points: u.points, hits: u.hits }));
    }
    runPlayers() { return Object.keys(this.data.run.users).length; }
    resetRun() { this.data.run = { users: {} }; this._save(); }
    setRound(n) { this.data.meta.round = n; this._save(); }

    pushWinners(entry) {
        this.data.winners.push(entry);
        if (this.data.winners.length > MAX_WINNERS_HISTORY) {
            this.data.winners.splice(0, this.data.winners.length - MAX_WINNERS_HISTORY);
        }
        this._save();
    }

    recentWinners(n = 10) { return this.data.winners.slice(-n).reverse(); }

    reset({ includeRecord = false } = {}) {
        this.data.users = {};
        this.data.winners = [];
        if (includeRecord) this.data.meta.record = 0;
        this._save();
    }
}

module.exports = { Scoreboard };
