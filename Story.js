'use strict';
// Configurações das rodadas, pontuação, dicas e ferramentas.
// Edite os valores aqui; nenhum outro arquivo precisa mudar.
module.exports = {
    server: {
        port: 3000,
        host: '127.0.0.1' // somente este computador acessa. Use HOST=0.0.0.0 só se souber o que está fazendo.
    },

    round: {
        seconds: 60,           // duração padrão: se ninguém acertar em 2 minutos, a partida acaba (30, 45, 60, 90, 120...)
        minSeconds: 10,
        maxSeconds: 300,
        revealSeconds: 6,       // tempo mostrando a resposta antes da próxima rodada
        drawFraction: 0.85,     // o desenho termina quando 85% do tempo da rodada passou
        auto: true,             // começa a próxima rodada sozinho
        autoStartOnBoot: true   // inicia a live automaticamente ao abrir o servidor
    },

    // Regra de fim de jogo: se NINGUÉM acertar dentro do tempo, a partida termina,
    // aparece a tela dos melhores e o jogo recomeça na FASE 1.
    game: {
        loseOnTimeout: true,
        gameOverSeconds: 14,      // tempo da tela dos melhores
        leaderboardSize: 8,       // quantos jogadores aparecem nela
        autoRecycleWords: false   // true = quando as palavras acabarem, reinicia o histórico sozinho
    },

    scoring: {
        points: [100, 50, 25],  // 1º, 2º e 3º acerto
        winnersPerRound: 3      // a rodada termina quando este número de pessoas acertar
    },

    hints: {
        // Ordem em que as dicas são liberadas (por tempo, curtidas ou botão DICA)
        sequence: ['category', 'description', 'letter', 'drawing', 'letter', 'letter'],
        byTime: {
            enabled: true,
            fractions: [0.30, 0.50, 0.65, 0.80] // fração do tempo da rodada em que cada dica sai
        },
        maxRevealFraction: 0.5, // no máximo metade das letras pode ser revelada (sempre sobram 2 ocultas)
        drawingBoost: 0.12,     // a dica "drawing" adianta o desenho em 12%
        likesPerHint: 84        // a cada 84 curtidas, uma dica
    },

    drawing: {
        baseSpeed: 1,
        minSpeed: 0.25,
        maxSpeed: 8,
        turboFactor: 3,
        turboSeconds: 8
    },

    chat: {
        maxMessageLength: 140,
        recentMessages: 30
    },

    // Ferramentas, ligadas a presentes do TikTok. "gifts" = nome EXATO do presente em inglês, como o TikTok envia.
    // Troque por outros presentes quando quiser (a lista completa aparece no seu painel de presentes do TikTok).
    // Também funcionam pelo painel admin (grátis) e por comando no chat gastando pontos do espectador.
    tools: [
        { id: 'revealLetter',    name: 'REVELA LETRA',   icon: 'gift-rose',    gift: 'Rose',         command: '!letra',  pointsCost: 60,  cooldownSeconds: 12, gifts: ['Rose'] },
        { id: 'turbo',           name: 'PINCEL TURBO',   icon: 'gift-donut',   gift: 'Doughnut',     command: '!turbo',  pointsCost: 40,  cooldownSeconds: 20, gifts: ['Doughnut'] },
        { id: 'completeDrawing', name: 'DESENHO PRONTO', icon: 'gift-perfume', gift: 'Perfume',      command: '!pronto', pointsCost: 120, cooldownSeconds: 30, gifts: ['Perfume'] },
        { id: 'hint',            name: 'DICA',           icon: 'gift-heart',   gift: 'Finger Heart', command: '!dica',   pointsCost: 30,  cooldownSeconds: 10, gifts: ['Finger Heart'] }
    ]
};
