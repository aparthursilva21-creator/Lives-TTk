'use strict';
// Leitura e gravação segura de arquivos JSON (gravação atômica: arquivo temporário + rename).
const fs = require('fs');
const path = require('path');

function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        if (err.code !== 'ENOENT') {
            // Arquivo existe mas está corrompido: guarda uma cópia antes de seguir com o valor padrão.
            try { fs.copyFileSync(file, `${file}.corrompido-${Date.now()}`); } catch (_) { /* ignora */ }
        }
        return fallback;
    }
}

function writeJsonAtomic(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const text = JSON.stringify(data, null, 2);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, text, 'utf8');
    try {
        fs.renameSync(tmp, file);
    } catch (_) {
        // Windows pode bloquear o rename (antivírus, por exemplo): grava direto como alternativa.
        fs.writeFileSync(file, text, 'utf8');
        try { fs.unlinkSync(tmp); } catch (__) { /* ignora */ }
    }
}

module.exports = { readJson, writeJsonAtomic };
