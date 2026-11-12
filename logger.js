'use strict';
// Log simples: console + arquivo Data/logs/game.log (rotaciona ao passar de 2 MB).
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'Data', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'game.log');
const MAX_BYTES = 2 * 1024 * 1024;
const fileEnabled = process.env.LIVE_LOG_FILE !== '0';
let writes = 0;

function rotateIfNeeded() {
    try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
        if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_BYTES) {
            fs.renameSync(LOG_FILE, `${LOG_FILE}.antigo`);
        }
    } catch (_) { /* log nunca pode derrubar o jogo */ }
}
if (fileEnabled) rotateIfNeeded();

function write(level, args) {
    const text = args.map(a => (a instanceof Error ? (a.stack || a.message) : (typeof a === 'string' ? a : JSON.stringify(a)))).join(' ');
    const line = `${new Date().toISOString()} [${level}] ${text}`;
    (level === 'ERRO' ? console.error : level === 'AVISO' ? console.warn : console.log)(line);
    if (!fileEnabled) return;
    if (++writes % 500 === 0) rotateIfNeeded();
    fs.appendFile(LOG_FILE, line + '\n', () => { /* ignora erros de escrita */ });
}

module.exports = {
    info: (...a) => write('INFO', a),
    warn: (...a) => write('AVISO', a),
    error: (...a) => write('ERRO', a)
};
