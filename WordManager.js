'use strict';
// Sorteio de palavras, validação de respostas e histórico antirrepetição (persistente).
const { readJson, writeJsonAtomic } = require('./jsonStore');

// Normaliza uma resposta: sem acentos, sem maiúsculas, sem pontuação, sem espaços
// e sem artigo inicial ("o gato" == "gato"). A comparação é SEMPRE exata (nunca por trecho).
function normalizeAnswer(text) {
    let t = String(text == null ? '' : text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    t = t.replace(/[^a-z0-9]+/g, ' ').trim();
    t = t.replace(/^(o|a|os|as|um|uma)\s+(?=\S)/, '');
    return t.replace(/\s+/g, '');
}

// Gera os espaços do jogo: letras ocultas e caracteres fixos (espaço, hífen, apóstrofo).
function buildSlots(word) {
    const slots = [];
    for (const ch of String(word).normalize('NFC')) {
        if (/[\p{L}\p{N}]/u.test(ch)) slots.push({ t: 'l', c: ch.toUpperCase() });
        else if (ch === ' ') slots.push({ t: 's' });
        else if (ch === '-') slots.push({ t: 'd' });
        else slots.push({ t: 'f', c: ch });
    }
    return slots;
}

class WordManager {
    constructor({ words, historyFile, hasDrawing = null, log = console }) {
        this.words = words;
        this.historyFile = historyFile;
        this.hasDrawing = hasDrawing;
        this.log = log;
        this.activeId = null;
        this.history = [];
        this.used = new Set();
        this.answerCache = new Map();
        this._load();
    }

    _load() {
        let data = readJson(this.historyFile, []);
        let dirty = false;
        if (!Array.isArray(data)) data = [];

        // Formato antigo (lista de textos): guarda uma cópia e começa o histórico novo.
        if (data.some(item => typeof item === 'string' || !item || typeof item !== 'object')) {
            const backup = this.historyFile.replace(/\.json$/, '') + `.antigo-${Date.now()}.json`;
            writeJsonAtomic(backup, data);
            this.log.warn(`Histórico em formato antigo salvo em ${backup}. Começando um histórico novo.`);
            data = [];
            dirty = true;
        }

        // Rodada que estava em andamento quando o programa fechou.
        for (const item of data) {
            if (item.result === 'em_andamento') { item.result = 'interrompida'; dirty = true; }
        }

        this.history = data;
        this.used = new Set(data.map(item => item.id));
        if (dirty) this._save();
    }

    _save() {
        writeJsonAtomic(this.historyFile, this.history);
    }

    availableWords() {
        return this.words.filter(w => !this.used.has(w.id) && (!this.hasDrawing || this.hasDrawing(w.drawing)));
    }

    stats() {
        const inBank = this.words.filter(w => this.used.has(w.id)).length;
        const available = this.availableWords().length;
        return {
            total: this.words.length,
            used: inBank,
            available,
            unusedWithoutDrawing: this.words.length - inBank - available
        };
    }

    // Sorteia uma palavra inédita e já a registra como usada (nunca repete, mesmo se o programa cair).
    pick(round) {
        if (this.activeId) throw new Error('Já existe uma palavra em uso na rodada atual');
        const pool = this.availableWords();
        if (pool.length === 0) return null;
        const entry = pool[Math.floor(Math.random() * pool.length)];
        this.activeId = entry.id;
        this.used.add(entry.id);
        this.history.push({
            id: entry.id,
            word: entry.word,
            category: entry.category,
            round,
            usedAt: new Date().toISOString(),
            result: 'em_andamento',
            winner: null
        });
        this._save();
        return entry;
    }

    finish(result, winner = null) {
        if (!this.activeId) return;
        for (let i = this.history.length - 1; i >= 0; i--) {
            const item = this.history[i];
            if (item.id === this.activeId && item.result === 'em_andamento') {
                item.result = result;
                item.winner = winner;
                item.finishedAt = new Date().toISOString();
                break;
            }
        }
        this.activeId = null;
        this._save();
    }

    isCorrect(entry, text) {
        const guess = normalizeAnswer(text);
        if (!guess) return false;
        let accepted = this.answerCache.get(entry.id);
        if (!accepted) {
            accepted = new Set([entry.word, ...entry.aliases].map(normalizeAnswer).filter(Boolean));
            this.answerCache.set(entry.id, accepted);
        }
        return accepted.has(guess);
    }

    getHistory(limit = 50) {
        return this.history.slice(-limit).reverse();
    }

    // Reinício manual do histórico (a confirmação é exigida por quem chama). Guarda cópia de segurança.
    reset() {
        if (this.activeId) throw new Error('Não é possível reiniciar o histórico durante uma rodada');
        if (this.history.length > 0) {
            writeJsonAtomic(this.historyFile.replace(/\.json$/, '') + `.copia-${Date.now()}.json`, this.history);
        }
        this.history = [];
        this.used = new Set();
        this._save();
    }
}

module.exports = { WordManager, normalizeAnswer, buildSlots };
