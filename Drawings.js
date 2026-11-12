'use strict';
// Banco de desenhos vetoriais. Cada desenho é uma lista de TRAÇOS, desenhados na ordem em que aparecem aqui.
// O id do desenho é o mesmo id da palavra em Data/Words.js (ex.: "gato", "guarda-chuva").
//
// Um traço é: { d, fill, c, w, wu, thin, g, t }
//   d     caminho SVG (coordenadas livres: o motor encaixa e centraliza o desenho no quadro sozinho)
//   fill  cor de preenchimento, aplicada quando o traço termina ("none" = só linha)
//   c     cor da linha (padrão: tinta escura)
//   w     espessura da linha em pixels do quadro (padrão 8)   | thin: true = linha fina (5)
//   wu    espessura em unidades do desenho (escala junto com ele; usada em traços grossos)
//   g     nome do grupo (há uma pequena pausa entre grupos)   | t: peso de tempo (padrão 1)
//
// Para adicionar um desenho novo, crie uma função em DRAWINGS com o id da palavra.
// Não é preciso mexer no motor (public/Drawer.js).

const INK = '#1d1b2e';
const c = {
    or: '#F4A340', or2: '#E07B1F', wh: '#FFFFFF', cr: '#FFF1D6', pk: '#FF8FAB', rd: '#E53935', bl: '#4DA3F5',
    dbl: '#1F6FD1', gr: '#5CBF60', dgr: '#2E8B3E', yl: '#FFD93B', br: '#A06A3B', dbr: '#5D3A24', gy: '#B8C4CE',
    dgy: '#5F7283', pu: '#A94FC4', sk: '#FFE0BD', lb: '#CDEBFF', nv: '#2B2F4A', st: '#D9CDBD', tan: '#E9C98F'
};

// ---------- ajudantes de forma ----------
const f = n => Math.round(n * 10) / 10;
const rad = d => d * Math.PI / 180;
const pt = (cx, cy, r, deg) => [f(cx + r * Math.cos(rad(deg))), f(cy + r * Math.sin(rad(deg)))];
function ell(x, y, rx, ry, deg = 0) {
    const co = Math.cos(rad(deg)), si = Math.sin(rad(deg));
    const a = [f(x - rx * co), f(y - rx * si)], b = [f(x + rx * co), f(y + rx * si)];
    return `M ${a[0]} ${a[1]} A ${rx} ${ry} ${deg} 1 1 ${b[0]} ${b[1]} A ${rx} ${ry} ${deg} 1 1 ${a[0]} ${a[1]} Z`;
}
const circle = (x, y, r) => ell(x, y, r, r);
function rect(x, y, w, h, r = 0) {
    if (!r) return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
    return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}
const poly = (pts, close = true) => 'M ' + pts.map(p => p.join(' ')).join(' L ') + (close ? ' Z' : '');
const line = (x1, y1, x2, y2) => `M ${x1} ${y1} L ${x2} ${y2}`;
const star = (cx, cy, R, r, n = 5, rot = -90) => poly(Array.from({ length: n * 2 }, (_, i) => pt(cx, cy, i % 2 ? r : R, rot + i * 180 / n)));

const S = (d, fill = 'none', o = {}) => ({ d, fill, ...o });
const T = (d, o = {}) => S(d, 'none', { thin: true, ...o });                     // linha de detalhe fina
const dot = (x, y, r = 5, fill = INK, o = {}) => S(circle(x, y, r), fill, { thin: true, ...o });
const thick = (d, color, wu, g) => [S(d, 'none', { wu: wu + 12, c: INK, g }), S(d, 'none', { wu, c: color, g })]; // traço grosso com contorno
const mirror = (pts, cx) => pts.map(([x, y]) => [2 * cx - x, y]);

const DRAWINGS = {
    // ===== ANIMAIS =====
    gato: () => [
        S('M 270 330 Q 360 335 352 255 Q 350 228 332 232 Q 336 285 272 300 Z', c.or, { g: 'corpo' }),
        S(ell(200, 300, 82, 88), c.or, { g: 'corpo' }),
        S(ell(200, 315, 48, 58), c.cr, { g: 'corpo' }),
        S(ell(163, 385, 30, 15), c.or, { g: 'corpo' }), S(ell(237, 385, 30, 15), c.or, { g: 'corpo' }),
        S(poly([[128, 165], [122, 88], [184, 130]]), c.or, { g: 'cabeca' }), S(poly([[272, 165], [278, 88], [216, 130]]), c.or, { g: 'cabeca' }),
        S(poly([[137, 150], [135, 110], [168, 132]]), c.pk, { g: 'cabeca', thin: true }), S(poly([[263, 150], [265, 110], [232, 132]]), c.pk, { g: 'cabeca', thin: true }),
        S(ell(200, 190, 80, 68), c.or, { g: 'cabeca' }),
        T('M 200 125 V 148'), T('M 178 130 L 184 148'), T('M 222 130 L 216 148'),
        S(circle(168, 185, 14), '#8BE05A', { thin: true, g: 'rosto' }), S(ell(168, 185, 4.5, 11), INK, { thin: true }),
        S(circle(232, 185, 14), '#8BE05A', { thin: true }), S(ell(232, 185, 4.5, 11), INK, { thin: true }),
        S(poly([[192, 207], [208, 207], [200, 218]]), c.pk, { thin: true }),
        T('M 200 218 Q 190 232 176 226'), T('M 200 218 Q 210 232 224 226'),
        T('M 140 205 L 95 195'), T('M 140 215 L 95 220'), T('M 260 205 L 305 195'), T('M 260 215 L 305 220')
    ],
    cachorro: () => [
        S('M 272 325 Q 335 305 338 245 Q 312 268 270 282 Z', c.br, { g: 'corpo' }),
        S(rect(158, 345, 30, 48, 13), c.br, { g: 'corpo' }), S(rect(212, 345, 30, 48, 13), c.br, { g: 'corpo' }),
        S(ell(200, 300, 80, 85), c.br, { g: 'corpo' }),
        S(ell(200, 318, 44, 58), c.cr, { g: 'corpo' }),
        S('M 142 140 Q 98 150 104 218 Q 136 224 152 186 Z', c.dbr, { g: 'cabeca' }),
        S('M 258 140 Q 302 150 296 218 Q 264 224 248 186 Z', c.dbr, { g: 'cabeca' }),
        S(ell(200, 170, 62, 58), c.br, { g: 'cabeca' }),
        S(circle(222, 158, 17), c.dbr, { thin: true, g: 'rosto' }),
        S(ell(200, 196, 36, 27), c.cr, { g: 'rosto' }),
        S(ell(200, 184, 13, 9), INK, { thin: true }),
        dot(178, 158, 6), dot(222, 158, 6, INK),
        T('M 200 192 V 204'), T('M 200 204 Q 189 214 178 206'), T('M 200 204 Q 211 214 222 206'),
        S('M 194 209 Q 200 238 208 209 Z', c.pk, { thin: true })
    ],
    elefante: () => [
        S(rect(105, 290, 44, 90, 15), c.dgy, { g: 'corpo' }), S(rect(178, 300, 44, 80, 15), c.dgy, { g: 'corpo' }), S(rect(255, 300, 44, 80, 15), c.dgy, { g: 'corpo' }), S(rect(318, 285, 40, 90, 15), c.dgy, { g: 'corpo' }),
        S(ell(220, 240, 125, 88), c.gy, { g: 'corpo' }),
        T('M 340 215 Q 372 240 362 285', { c: INK }),
        S('M 70 225 Q 32 262 45 325 Q 52 350 74 342 Q 64 300 88 258 Z', c.gy, { g: 'cabeca' }),
        S(ell(98, 195, 62, 58), c.gy, { g: 'cabeca' }),
        S(ell(160, 190, 42, 58, 10), '#CFD8DC', { g: 'cabeca' }),
        S('M 84 250 Q 58 278 74 290 Q 94 274 94 252 Z', c.wh, { thin: true }),
        dot(88, 180, 6), T('M 70 170 Q 80 165 90 168')
    ],
    girafa: () => [
        S(rect(118, 295, 22, 95, 8), c.yl, { g: 'corpo' }), S(rect(150, 295, 22, 95, 8), c.yl, { g: 'corpo' }), S(rect(232, 295, 22, 95, 8), c.yl, { g: 'corpo' }), S(rect(264, 295, 22, 95, 8), c.yl, { g: 'corpo' }),
        S(ell(205, 275, 98, 56), c.yl, { g: 'corpo' }),
        S('M 296 258 Q 330 272 322 318', 'none', { thin: true }), dot(322, 322, 8, c.dbr),
        S('M 135 262 Q 143 160 150 96 L 194 96 Q 192 175 200 250 Z', c.yl, { g: 'pescoco' }),
        S(ell(178, 82, 40, 28, -12), c.yl, { g: 'cabeca' }),
        S(ell(212, 98, 26, 19, -12), c.cr, { g: 'cabeca' }),
        T('M 168 56 L 166 32'), dot(166, 28, 6, c.dbr), T('M 192 56 L 194 32'), dot(194, 28, 6, c.dbr),
        S(ell(152, 70, 13, 7, 30), c.yl, { thin: true }), dot(190, 74, 4.5),
        dot(222, 100, 3, INK),
        dot(165, 160, 11, c.dbr), dot(172, 215, 13, c.dbr), dot(158, 115, 8, c.dbr),
        dot(215, 268, 15, c.dbr), dot(262, 275, 12, c.dbr), dot(165, 290, 11, c.dbr)
    ],
    coruja: () => [
        S(rect(60, 380, 280, 22, 10), c.br, { g: 'galho' }),
        S(ell(200, 255, 98, 122), c.br, { g: 'corpo' }),
        S('M 108 200 Q 58 262 95 345 Q 140 320 150 250 Z', c.dbr, { g: 'corpo' }),
        S('M 292 200 Q 342 262 305 345 Q 260 320 250 250 Z', c.dbr, { g: 'corpo' }),
        S(ell(200, 290, 62, 84), c.cr, { g: 'corpo' }),
        T('M 170 255 Q 200 275 230 255'), T('M 165 295 Q 200 317 235 295'), T('M 172 335 Q 200 355 228 335'),
        S(ell(165, 378, 24, 10), c.or2, { thin: true }), S(ell(235, 378, 24, 10), c.or2, { thin: true }),
        S(poly([[125, 150], [108, 82], [172, 125]]), c.dbr, { g: 'cabeca' }), S(poly([[275, 150], [292, 82], [228, 125]]), c.dbr, { g: 'cabeca' }),
        S(circle(158, 185, 43), '#FFE9A8', { g: 'olhos' }), S(circle(242, 185, 43), '#FFE9A8', { g: 'olhos' }),
        dot(158, 185, 19), dot(242, 185, 19), dot(150, 177, 6, c.wh), dot(234, 177, 6, c.wh),
        S(poly([[187, 205], [213, 205], [200, 240]]), c.or2, { thin: true })
    ],
    pinguim: () => [
        S(ell(160, 378, 38, 14), c.or, { g: 'corpo' }), S(ell(240, 378, 38, 14), c.or, { g: 'corpo' }),
        S(ell(200, 235, 92, 138), '#2B3047', { g: 'corpo' }),
        S(ell(200, 262, 64, 104), c.wh, { g: 'corpo' }),
        S('M 112 195 Q 62 262 88 322 Q 128 290 130 235 Z', '#2B3047', { g: 'corpo' }), S('M 288 195 Q 338 262 312 322 Q 272 290 270 235 Z', '#2B3047', { g: 'corpo' }),
        S(circle(170, 150, 17), c.wh, { thin: true, g: 'rosto' }), S(circle(230, 150, 17), c.wh, { thin: true }),
        dot(172, 152, 7), dot(228, 152, 7),
        S(circle(143, 182, 11), c.pk, { thin: true }), S(circle(257, 182, 11), c.pk, { thin: true }),
        S(poly([[180, 168], [220, 168], [200, 200]]), c.or, { thin: true })
    ],
    coelho: () => [
        S(ell(172, 85, 24, 72, 8), c.wh, { g: 'orelhas' }), S(ell(172, 90, 11, 50, 8), c.pk, { thin: true }),
        S(ell(228, 85, 24, 72, -8), c.wh, { g: 'orelhas' }), S(ell(228, 90, 11, 50, -8), c.pk, { thin: true }),
        S(circle(290, 335, 22), c.wh, { g: 'corpo' }),
        S(ell(200, 305, 82, 78), c.wh, { g: 'corpo' }), S(ell(200, 320, 44, 52), c.cr, { thin: true }),
        S(ell(160, 382, 34, 14), c.wh, { g: 'corpo' }), S(ell(240, 382, 34, 14), c.wh, { g: 'corpo' }),
        S(ell(200, 195, 66, 56), c.wh, { g: 'cabeca' }),
        dot(176, 185, 7), dot(224, 185, 7),
        S(poly([[190, 203], [210, 203], [200, 214]]), c.pk, { thin: true }),
        T('M 200 214 V 224'), T('M 200 224 Q 190 233 181 226'), T('M 200 224 Q 210 233 219 226'),
        S(rect(193, 228, 14, 14, 3), c.wh, { thin: true }),
        T('M 150 212 L 112 206'), T('M 150 222 L 114 230'), T('M 250 212 L 288 206'), T('M 250 222 L 286 230')
    ],
    borboleta: () => [
        S('M 200 195 Q 100 40 38 110 Q 15 190 200 218 Z', c.pu, { g: 'asas' }), S('M 200 195 Q 300 40 362 110 Q 385 190 200 218 Z', c.pu, { g: 'asas' }),
        S('M 200 225 Q 70 235 80 325 Q 150 365 200 260 Z', c.pk, { g: 'asas' }), S('M 200 225 Q 330 235 320 325 Q 250 365 200 260 Z', c.pk, { g: 'asas' }),
        dot(95, 120, 20, c.yl), dot(305, 120, 20, c.yl), dot(125, 300, 14, c.wh), dot(275, 300, 14, c.wh),
        S(ell(200, 235, 13, 78), c.nv, { g: 'corpo' }), S(circle(200, 150, 17), c.nv, { g: 'corpo' }),
        T('M 195 138 Q 170 90 140 78', { wu: 3 }), T('M 205 138 Q 230 90 260 78'), dot(140, 78, 6), dot(260, 78, 6)
    ],

    // ===== COMIDAS E BEBIDAS =====
    banana: () => [
        S('M 90 140 Q 118 305 300 335 Q 335 340 345 320 Q 205 292 155 118 Q 122 104 90 140 Z', c.yl, { g: 'fruta' }),
        S('M 84 142 Q 80 112 108 100 L 126 108 Q 104 120 112 150 Z', c.dbr, { g: 'fruta' }),
        S('M 300 335 Q 335 340 345 320 L 352 328 Q 340 346 305 342 Z', c.dbr, { thin: true }),
        T('M 128 160 Q 160 285 300 322'), T('M 118 190 Q 170 290 265 318')
    ],
    melancia: () => [
        S('M 30 190 A 170 170 0 0 0 370 190 Z', c.dgr, { g: 'casca' }),
        S('M 52 190 A 148 148 0 0 0 348 190 Z', c.wh, { g: 'casca' }),
        S('M 64 190 A 136 136 0 0 0 336 190 Z', c.rd, { g: 'polpa' }),
        ...[[130, 225], [200, 250], [270, 225], [165, 285], [235, 285], [200, 320], [110, 195], [290, 195]].map(([x, y]) => S(ell(x, y, 7, 11, 15), INK, { thin: true, g: 'sementes' }))
    ],
    abacaxi: () => [
        S('M 200 175 L 150 70 L 188 120 L 200 40 L 212 120 L 250 70 Z', c.gr, { g: 'coroa' }),
        S('M 175 180 L 110 110 L 160 150 Z', c.dgr, { g: 'coroa', thin: true }), S('M 225 180 L 290 110 L 240 150 Z', c.dgr, { g: 'coroa', thin: true }),
        S(ell(200, 275, 86, 106), c.or, { g: 'fruto' }),
        T('M 138 205 L 255 340'), T('M 120 250 L 215 372'), T('M 175 175 L 285 300'),
        T('M 262 205 L 145 340'), T('M 280 250 L 185 372'), T('M 225 175 L 120 300')
    ],
    morango: () => [
        S('M 200 365 Q 85 290 98 190 Q 110 140 200 152 Q 290 140 302 190 Q 315 290 200 365 Z', c.rd, { g: 'fruto' }),
        ...[[160, 200], [240, 200], [200, 235], [150, 250], [250, 250], [200, 300], [175, 280], [225, 280]].map(([x, y]) => S(ell(x, y, 5, 8, 20), c.yl, { thin: true, g: 'sementes' })),
        S(star(200, 150, 70, 28, 6), c.gr, { g: 'folhas' }),
        S('M 200 150 Q 205 110 225 95', 'none', { wu: 7, c: c.dgr })
    ],
    pizza: () => [
        S('M 50 105 Q 200 30 350 105 L 200 375 Z', c.tan, { g: 'massa' }),
        S('M 74 122 Q 200 65 326 122 L 200 338 Z', c.yl, { g: 'queijo' }),
        S(circle(150, 150, 26), c.rd, { g: 'recheio' }), S(circle(250, 155, 26), c.rd, { g: 'recheio' }), S(circle(200, 230, 26), c.rd, { g: 'recheio' }), S(circle(195, 115, 18), c.rd, { g: 'recheio' }),
        dot(145, 145, 5, '#B71C1C'), dot(255, 150, 5, '#B71C1C'), dot(205, 225, 5, '#B71C1C'),
        S(circle(105, 130, 9), c.dgr, { thin: true }), S(circle(298, 128, 9), c.dgr, { thin: true }), S(circle(200, 295, 9), c.dgr, { thin: true }),
        S('M 175 338 Q 188 360 200 338', c.yl, { thin: true })
    ],
    hamburguer: () => [
        S('M 60 190 Q 60 85 200 85 Q 340 85 340 190 Z', '#E0A050', { g: 'pao' }),
        ...[[130, 130], [185, 112], [240, 125], [285, 150], [160, 160], [220, 160]].map(([x, y]) => S(ell(x, y, 9, 5, 20), c.cr, { thin: true, g: 'pao' })),
        S('M 50 205 Q 75 232 100 205 Q 125 232 150 205 Q 175 232 200 205 Q 225 232 250 205 Q 275 232 300 205 Q 325 232 350 205 V 195 H 50 Z', c.gr, { g: 'recheio' }),
        S(rect(60, 225, 280, 22, 8), c.rd, { g: 'recheio' }),
        S('M 55 248 H 345 L 310 282 L 280 252 L 230 252 L 200 282 L 170 252 L 90 252 L 80 282 Z', c.yl, { g: 'recheio' }),
        S(rect(55, 262, 290, 40, 18), c.dbr, { g: 'recheio' }),
        S('M 60 315 H 340 Q 340 365 285 365 H 115 Q 60 365 60 315 Z', '#E0A050', { g: 'pao' })
    ],
    bolo: () => [
        S(ell(200, 362, 175, 22), c.gy, { g: 'prato' }),
        S(rect(70, 250, 260, 110, 16), '#C98A55', { g: 'bolo' }),
        S(rect(100, 170, 200, 90, 14), c.pk, { g: 'bolo' }),
        S('M 100 188 Q 100 160 130 160 H 270 Q 300 160 300 188 Q 290 218 275 192 Q 262 228 245 192 Q 225 222 205 192 Q 185 228 165 192 Q 150 218 135 192 Q 112 218 100 188 Z', c.wh, { g: 'cobertura' }),
        S(rect(60, 290, 280, 14, 7), c.wh, { thin: true, g: 'cobertura' }),
        S(rect(158, 110, 14, 50, 4), c.bl, { g: 'velas' }), S(rect(193, 110, 14, 50, 4), c.yl, { g: 'velas' }), S(rect(228, 110, 14, 50, 4), c.gr, { g: 'velas' }),
        S('M 165 105 Q 180 80 165 62 Q 150 80 165 105 Z', c.or, { thin: true }), S('M 200 105 Q 215 80 200 62 Q 185 80 200 105 Z', c.or, { thin: true }), S('M 235 105 Q 250 80 235 62 Q 220 80 235 105 Z', c.or, { thin: true }),
        dot(150, 330, 5, c.yl), dot(220, 320, 5, c.bl), dot(290, 335, 5, c.yl), dot(100, 300, 5, c.pk)
    ],
    sorvete: () => [
        S('M 130 215 L 270 215 L 200 395 Z', '#D9A15B', { g: 'casquinha' }),
        T('M 150 225 L 245 235'), T('M 165 262 L 235 272'), T('M 185 305 L 225 312'), T('M 170 217 L 215 380'), T('M 230 217 L 185 380'),
        S('M 118 218 Q 100 150 160 135 Q 200 100 245 135 Q 305 150 282 218 Q 262 238 245 218 Q 225 245 200 218 Q 175 245 155 218 Q 135 238 118 218 Z', c.pk, { g: 'bolas' }),
        S('M 135 135 Q 135 85 200 80 Q 265 85 265 135 Q 235 120 200 135 Q 165 120 135 135 Z', '#8D5B3A', { g: 'bolas' }),
        S(circle(200, 62, 17), c.rd, { g: 'cereja' }), T('M 200 46 Q 205 25 222 18')
    ],
    donut: () => [
        S(ell(200, 205, 150, 128), '#D9964B', { g: 'massa' }),
        S('M 70 195 Q 55 105 150 95 Q 200 70 250 95 Q 345 105 330 195 Q 340 255 290 292 Q 250 320 200 308 Q 150 320 110 292 Q 60 255 70 195 Z', c.pk, { g: 'cobertura' }),
        S(ell(200, 200, 48, 38), c.wh, { g: 'buraco' }),
        T('M 110 160 l 18 -8', { c: c.yl, wu: 5 }), T('M 150 125 l 14 12', { c: c.bl, wu: 5 }), T('M 230 120 l 18 -6', { c: c.gr, wu: 5 }),
        T('M 290 160 l -14 12', { c: c.wh, wu: 5 }), T('M 105 235 l 16 6', { c: c.gr, wu: 5 }), T('M 295 238 l -10 14', { c: c.yl, wu: 5 }),
        T('M 195 270 l 16 -4', { c: c.bl, wu: 5 }), T('M 165 100 l 4 -14', { c: c.wh, wu: 5 }), T('M 150 255 l -10 -10', { c: c.wh, wu: 5 })
    ],
    cafe: () => [
        T('M 150 90 Q 135 65 155 45 Q 170 25 155 5'), T('M 200 90 Q 185 65 205 45 Q 220 25 205 5'), T('M 250 90 Q 235 65 255 45 Q 270 25 255 5'),
        S(ell(190, 350, 135, 22), c.cr, { g: 'pires' }),
        ...thick('M 288 175 Q 355 170 350 235 Q 345 295 272 290', c.wh, 16, 'xicara'),
        S('M 85 145 H 295 L 272 320 Q 268 342 245 342 H 135 Q 112 342 108 320 Z', c.wh, { g: 'xicara' }),
        S(ell(190, 145, 105, 20), c.dbr, { g: 'cafe' }),
        T('M 130 200 Q 190 235 250 200', { c: c.rd }), dot(190, 270, 14, c.rd, { thin: true })
    ],

    // ===== OBJETOS =====
    foguete: () => [
        S('M 120 200 L 62 295 L 122 272 Z', c.rd, { g: 'aletas' }), S('M 280 200 L 338 295 L 278 272 Z', c.rd, { g: 'aletas' }),
        S('M 200 25 Q 285 118 282 262 H 118 Q 115 118 200 25 Z', '#ECEFF1', { g: 'corpo' }),
        S('M 200 25 Q 248 82 264 132 H 136 Q 152 82 200 25 Z', c.rd, { g: 'corpo' }),
        S(circle(200, 192, 36), c.dgy, { g: 'janela' }), S(circle(200, 192, 26), c.lb, { thin: true }), T('M 188 182 Q 192 176 200 175'),
        S(rect(160, 262, 80, 24, 7), c.dgy, { g: 'base' }),
        S('M 165 288 Q 200 400 235 288 Q 200 330 165 288 Z', c.or, { g: 'chama' }), S('M 183 290 Q 200 350 217 290 Q 200 312 183 290 Z', c.yl, { thin: true }),
        S(star(70, 80, 14, 6, 4), c.yl, { thin: true }), S(star(340, 120, 12, 5, 4), c.yl, { thin: true }), S(star(330, 40, 10, 4, 4), c.yl, { thin: true })
    ],
    relogio: () => [
        S(circle(200, 200, 150), c.rd, { g: 'caixa' }),
        S(circle(200, 200, 125), c.wh, { g: 'caixa' }),
        ...Array.from({ length: 12 }, (_, i) => { const a = pt(200, 200, i % 3 === 0 ? 98 : 106, i * 30 - 90), b = pt(200, 200, 118, i * 30 - 90); return T(line(a[0], a[1], b[0], b[1]), { g: 'marcas', wu: i % 3 === 0 ? 7 : 4, c: INK }); }),
        S('M 200 200 L 200 112', 'none', { wu: 9, c: INK, g: 'ponteiros' }), S('M 200 200 L 262 238', 'none', { wu: 7, c: INK, g: 'ponteiros' }),
        S(circle(200, 200, 11), c.rd, { thin: true })
    ],
    'guarda-chuva': () => [
        T('M 200 55 V 28', { wu: 8, c: INK }),
        S('M 40 190 Q 40 55 200 55 Q 360 55 360 190 Q 320 160 280 190 Q 240 160 200 190 Q 160 160 120 190 Q 80 160 40 190 Z', c.rd, { g: 'copa' }),
        T('M 200 55 Q 150 100 120 188'), T('M 200 55 V 188'), T('M 200 55 Q 250 100 280 188'), T('M 200 55 Q 100 90 62 170'), T('M 200 55 Q 300 90 338 170'),
        ...thick('M 200 190 V 330 Q 200 372 165 366', c.br, 12, 'cabo')
    ],
    oculos: () => [
        S(circle(120, 200, 62), c.lb, { g: 'aros' }), S(circle(280, 200, 62), c.lb, { g: 'aros' }),
        S('M 180 190 Q 200 170 220 190', 'none', { g: 'ponte' }),
        S('M 60 190 L 20 165', 'none', { g: 'hastes' }), S('M 340 190 L 380 165', 'none', { g: 'hastes' }),
        T('M 88 178 Q 100 160 122 154'), T('M 248 178 Q 260 160 282 154')
    ],
    chave: () => [
        S('M 165 188 H 360 V 212 H 165 Z', c.yl, { g: 'haste' }),
        S(rect(300, 212, 20, 36, 4), c.yl, { g: 'dentes' }), S(rect(335, 212, 20, 26, 4), c.yl, { g: 'dentes' }), S(rect(268, 212, 18, 22, 4), c.yl, { g: 'dentes' }),
        S(circle(115, 200, 66), c.yl, { g: 'argola' }), S(circle(115, 200, 28), c.wh, { g: 'argola' }), T('M 85 160 Q 105 140 135 142')
    ],
    vela: () => [
        S(ell(200, 372, 110, 20), c.gy, { g: 'base' }),
        S(rect(155, 160, 90, 210, 10), c.cr, { g: 'cera' }),
        S('M 155 170 Q 155 160 165 160 H 235 Q 245 160 245 170 V 195 Q 232 215 222 192 Q 212 225 198 192 Q 185 220 170 195 Q 160 215 155 195 Z', c.wh, { g: 'cera' }),
        T('M 200 160 V 138', { wu: 4, c: INK }),
        S('M 200 62 Q 250 118 200 148 Q 150 118 200 62 Z', c.or, { g: 'chama' }), S('M 200 98 Q 224 126 200 142 Q 176 126 200 98 Z', c.yl, { thin: true })
    ],
    balao: () => [
        T('M 120 268 Q 105 310 125 345 Q 140 375 118 410', { wu: 3, c: INK }), T('M 285 262 Q 300 305 282 340 Q 268 372 290 405', { wu: 3, c: INK }),
        S('M 120 260 Q 48 235 52 150 Q 56 75 125 72 Q 195 75 198 150 Q 200 235 120 260 Z', c.bl, { g: 'azul' }), S(poly([[120, 258], [108, 278], [132, 278]]), c.bl, { thin: true }),
        S('M 285 255 Q 218 232 220 158 Q 224 92 285 90 Q 346 92 350 158 Q 352 232 285 255 Z', c.yl, { g: 'amarelo' }), S(poly([[285, 253], [273, 272], [297, 272]]), c.yl, { thin: true }),
        T('M 200 330 Q 178 365 205 395 Q 228 422 200 450', { wu: 3, c: INK }),
        S('M 200 322 Q 100 300 100 195 Q 100 70 200 70 Q 300 70 300 195 Q 300 300 200 322 Z', c.rd, { g: 'vermelho' }),
        S(poly([[200, 320], [182, 345], [218, 345]]), c.rd, { thin: true }),
        T('M 135 140 Q 145 100 180 88', { c: c.wh, wu: 8 })
    ],
    lampada: () => [
        T('M 200 8 V 28', { wu: 4 }),
        S('M 200 45 C 105 45 78 150 128 210 C 150 236 155 250 155 280 H 245 C 245 250 250 236 272 210 C 322 150 295 45 200 45 Z', c.yl, { g: 'vidro' }),
        T('M 175 280 L 182 195 L 200 222 L 218 195 L 225 280'),
        S(rect(150, 280, 100, 18, 4), c.gy, { g: 'base' }), S(rect(155, 298, 90, 18, 4), c.gy, { g: 'base' }), S('M 165 316 H 235 L 222 345 H 178 Z', c.dgy, { g: 'base' }),
        T('M 70 60 L 95 85'), T('M 330 60 L 305 85'), T('M 45 150 H 78'), T('M 355 150 H 322')
    ],

    // ===== VEÍCULOS =====
    carro: () => [
        S('M 40 250 Q 40 215 80 210 L 125 205 Q 160 148 230 146 Q 292 146 322 205 L 352 212 Q 388 220 388 255 V 282 H 40 Z', c.bl, { g: 'carroceria' }),
        S('M 140 205 Q 168 165 215 165 V 205 Z', c.lb, { g: 'janelas' }), S('M 228 165 Q 276 165 302 205 H 228 Z', c.lb, { g: 'janelas' }),
        T('M 222 165 V 262'), T('M 190 228 H 212'),
        S(ell(372, 238, 10, 14), c.yl, { thin: true }), S(rect(40, 228, 12, 24, 4), c.rd, { thin: true }),
        S(rect(30, 268, 365, 16, 8), c.gy, { g: 'parachoque' }),
        S(circle(112, 288, 40), c.nv, { g: 'rodas' }), S(circle(112, 288, 18), c.gy, { thin: true }),
        S(circle(312, 288, 40), c.nv, { g: 'rodas' }), S(circle(312, 288, 18), c.gy, { thin: true })
    ],
    aviao: () => [
        S('M 232 172 L 282 118 L 312 118 L 292 172 Z', c.dbl, { g: 'asas' }),
        S('M 60 172 L 30 88 L 82 88 L 128 172 Z', c.dbl, { g: 'cauda' }),
        S('M 28 202 Q 28 170 80 168 H 332 Q 392 170 398 202 Q 392 234 332 236 H 80 Q 28 234 28 202 Z', c.wh, { g: 'fuselagem' }),
        T('M 40 214 H 385', { c: c.bl, wu: 6 }),
        S('M 340 176 Q 382 180 390 198 H 336 Z', c.lb, { thin: true }),
        ...[100, 140, 180, 220, 260, 300].map(x => S(circle(x, 195, 9), c.lb, { thin: true, g: 'janelas' })),
        S('M 190 220 L 112 335 L 172 335 L 285 220 Z', c.bl, { g: 'asas' }),
        S(ell(218, 262, 30, 13), c.gy, { thin: true })
    ],
    helicoptero: () => [
        S('M 100 208 L 18 178 L 18 198 L 108 240 Z', c.rd, { g: 'cauda' }),
        S(ell(24, 160, 6, 28), c.nv, { thin: true }), S(circle(24, 188, 7), c.dgy, { thin: true }),
        S('M 90 215 C 90 150 250 138 292 200 C 322 245 292 282 210 282 H 130 C 100 282 90 252 90 215 Z', c.rd, { g: 'cabine' }),
        S('M 215 163 C 258 163 288 188 292 215 H 215 Z', c.lb, { g: 'cabine' }),
        T('M 180 200 V 262'),
        S(rect(185, 122, 14, 36, 4), c.dgy, { g: 'rotor' }), S(ell(192, 120, 165, 7), c.nv, { g: 'rotor' }),
        S('M 118 312 H 290 Q 318 312 322 296', 'none', { wu: 9, c: INK, g: 'trem' }), T('M 160 284 V 312'), T('M 250 284 V 312')
    ],
    submarino: () => [
        S('M 52 230 L 20 192 V 268 Z', c.dgy, { g: 'helice' }),
        S('M 170 168 V 128 H 232 V 168 Z', c.or2, { g: 'torre' }), S('M 200 128 V 82 H 240', 'none', { wu: 8, c: INK, g: 'torre' }),
        S(ell(200, 232, 152, 72), c.yl, { g: 'casco' }),
        S(circle(125, 232, 22), c.lb, { g: 'janelas' }), S(circle(200, 232, 22), c.lb, { g: 'janelas' }), S(circle(275, 232, 22), c.lb, { g: 'janelas' }),
        T('M 330 215 Q 352 232 330 250'),
        dot(60, 120, 7, c.lb), dot(85, 95, 5, c.lb), dot(40, 85, 4, c.lb)
    ],
    bicicleta: () => [
        S(circle(100, 285, 68), 'none', { g: 'rodas' }), S(circle(305, 285, 68), 'none', { g: 'rodas' }),
        ...Array.from({ length: 8 }, (_, i) => { const a = pt(100, 285, 66, i * 45), b = pt(305, 285, 66, i * 45); return [T(line(100, 285, a[0], a[1]), { g: 'raios' }), T(line(305, 285, b[0], b[1]), { g: 'raios' })]; }).flat(),
        S('M 100 285 L 190 285 L 170 170 Z', 'none', { g: 'quadro' }), S('M 170 170 L 272 165 L 190 285', 'none', { g: 'quadro' }), S('M 272 165 L 305 285', 'none', { g: 'quadro' }),
        S('M 255 138 H 292 L 272 165', 'none', { g: 'guidao' }), S('M 140 158 H 200', 'none', { wu: 12, c: INK, g: 'selim' }), T('M 170 170 V 158'),
        S(circle(190, 285, 14), c.gy, { thin: true }), T('M 190 285 L 170 318', { g: 'pedal' })
    ],

    // ===== NATUREZA =====
    sol: () => [
        ...Array.from({ length: 12 }, (_, i) => S(poly([pt(200, 200, 98, i * 30 - 9), pt(200, 200, 148, i * 30), pt(200, 200, 98, i * 30 + 9)]), c.yl, { g: 'raios', thin: true })),
        S(circle(200, 200, 90), c.yl, { g: 'disco' }),
        dot(172, 185, 8), dot(228, 185, 8), T('M 160 225 Q 200 265 240 225'), S(circle(152, 215, 12), c.or, { thin: true, w: 3 }), S(circle(248, 215, 12), c.or, { thin: true })
    ],
    lua: () => [
        S('M 250 50 A 150 150 0 1 0 335 285 A 125 125 0 1 1 250 50 Z', c.yl, { g: 'lua' }),
        dot(130, 215, 16, c.tan), dot(165, 290, 11, c.tan), dot(115, 140, 9, c.tan),
        S(star(315, 80, 20, 8), c.yl, { thin: true }), S(star(345, 175, 14, 6), c.yl, { thin: true }), S(star(290, 20, 10, 4), c.yl, { thin: true })
    ],
    'arco-iris': () => {
        const cols = [c.rd, c.or, c.yl, c.gr, c.bl, c.pu];
        const bands = cols.map((col, i) => { const R = 190 - i * 28, r = R - 28; return S(`M ${200 - R} 280 A ${R} ${R} 0 0 1 ${200 + R} 280 L ${200 + r} 280 A ${r} ${r} 0 0 0 ${200 - r} 280 Z`, col, { g: 'faixas', thin: true }); });
        return [...bands,
            S('M 20 300 Q 5 270 40 262 Q 50 235 85 245 Q 115 232 130 262 Q 160 270 150 300 Z', c.wh, { g: 'nuvens' }),
            S('M 250 300 Q 240 270 270 262 Q 285 235 320 245 Q 355 235 372 265 Q 395 275 385 300 Z', c.wh, { g: 'nuvens' })];
    },
    vulcao: () => [
        dot(125, 40, 18, c.gy, { g: 'fumaca' }), dot(150, 15, 24, c.gy), dot(270, 30, 20, c.gy),
        S('M 175 150 Q 140 85 200 45 Q 262 85 225 150 Z', c.or, { g: 'fogo' }), S('M 188 148 Q 170 105 200 78 Q 232 105 212 148 Z', c.yl, { thin: true }),
        S('M 30 372 L 148 160 H 252 L 370 372 Z', c.br, { g: 'montanha' }),
        S(ell(200, 160, 52, 12), c.dbr, { g: 'cratera' }),
        S('M 165 165 Q 175 215 158 250 Q 185 272 200 240 Q 215 280 240 250 Q 225 210 235 165 Z', c.or2, { g: 'lava' }),
        T('M 80 300 L 60 340'), T('M 320 300 L 345 345')
    ],
    arvore: () => [
        S('M 172 385 Q 185 310 180 250 H 228 Q 220 310 236 385 Z', c.br, { g: 'tronco' }),
        T('M 195 330 Q 200 300 198 270'),
        S(circle(200, 140, 74), c.gr, { g: 'copa' }), S(circle(138, 205, 58), c.gr, { g: 'copa' }), S(circle(264, 205, 58), c.gr, { g: 'copa' }), S(circle(200, 225, 54), c.gr, { g: 'copa' }),
        dot(180, 120, 10, c.rd), dot(240, 170, 10, c.rd), dot(135, 205, 10, c.rd), dot(215, 240, 10, c.rd), dot(275, 215, 10, c.rd)
    ],
    flor: () => [
        ...thick('M 200 190 Q 190 300 205 395', c.gr, 12, 'caule'),
        S('M 198 330 Q 135 300 118 345 Q 150 378 198 350 Z', c.gr, { g: 'folhas' }), S('M 204 300 Q 268 268 285 312 Q 255 345 204 320 Z', c.gr, { g: 'folhas' }),
        ...Array.from({ length: 8 }, (_, i) => { const [x, y] = pt(200, 150, 58, i * 45); return S(ell(x, y, 34, 24, i * 45), c.pk, { g: 'petalas' }); }),
        S(circle(200, 150, 36), c.yl, { g: 'miolo' }), dot(188, 140, 4), dot(212, 140, 4), dot(200, 162, 4)
    ],
    nuvem: () => [
        S('M 250 215 Q 215 215 220 180 Q 225 148 262 150 Q 268 108 318 112 Q 352 112 362 148 Q 395 152 392 188 Q 390 215 355 215 Z', '#DCEFFF', { g: 'nuvem de tras' }),
        S('M 90 262 Q 38 262 45 215 Q 52 172 102 178 Q 108 118 172 122 Q 215 88 258 135 Q 335 118 340 190 Q 385 200 368 245 Q 358 266 322 264 Z', '#EAF6FF', { g: 'nuvem' }),
        T('M 100 225 Q 120 200 150 205'), T('M 235 170 Q 262 160 285 182'), T('M 160 150 Q 180 135 205 140'),
        T('M 120 245 H 300', { c: '#B9DDF7' })
    ],
    raio: () => [
        S('M 90 150 Q 40 150 48 108 Q 56 70 100 76 Q 108 28 170 32 Q 210 8 250 46 Q 320 36 330 96 Q 372 106 356 142 Q 346 156 312 154 Z', '#8FA3B5', { g: 'nuvem' }),
        S(poly([[240, 130], [128, 300], [196, 300], [168, 440], [310, 244], [236, 244], [282, 130]]), c.yl, { g: 'raio' }),
        T('M 100 230 L 70 214'), T('M 330 330 L 362 342'), T('M 96 380 L 66 398'), T('M 60 300 L 30 300')
    ],
    cogumelo: () => [
        S('M 150 215 Q 140 330 122 352 Q 200 380 278 352 Q 260 330 250 215 Z', c.cr, { g: 'caule' }),
        S('M 55 205 Q 55 55 200 55 Q 345 55 345 205 Q 200 238 55 205 Z', c.rd, { g: 'chapeu' }),
        dot(130, 130, 24, c.wh, { thin: true }), dot(215, 100, 20, c.wh), dot(285, 160, 22, c.wh), dot(190, 180, 14, c.wh),
        T('M 100 372 L 95 355'), T('M 300 372 L 305 355')
    ],
    cacto: () => [
        S('M 105 385 L 125 320 H 275 L 295 385 Z', c.or2, { g: 'vaso' }), S(rect(115, 305, 170, 24, 6), c.or2, { g: 'vaso' }),
        S(rect(160, 55, 80, 260, 40), c.gr, { g: 'corpo' }),
        S(rect(80, 140, 44, 100, 22), c.gr, { g: 'bracos' }), S(rect(105, 205, 62, 36, 14), c.gr, { g: 'bracos' }),
        S(rect(276, 110, 44, 100, 22), c.gr, { g: 'bracos' }), S(rect(235, 175, 62, 36, 14), c.gr, { g: 'bracos' }),
        T('M 200 80 V 300'), T('M 180 90 V 290'), T('M 220 90 V 290'),
        T('M 150 120 l -10 -4'), T('M 250 150 l 10 -4'), T('M 150 250 l -10 4'), T('M 250 240 l 10 4'),
        S(star(200, 52, 22, 10, 5), c.pk, { thin: true })
    ],

    // ===== TECNOLOGIA E INSTRUMENTOS =====
    celular: () => [
        S(rect(120, 25, 160, 330, 28), c.nv, { g: 'corpo' }),
        S(rect(134, 62, 132, 250, 8), c.lb, { g: 'tela' }),
        S(rect(180, 40, 40, 9, 4), c.gy, { thin: true }), S(circle(200, 335, 10), c.dgy, { thin: true }),
        ...[0, 1, 2].flatMap(r => [0, 1, 2].map(k => S(rect(148 + k * 40, 80 + r * 44, 30, 30, 8), [c.rd, c.gr, c.yl, c.pu, c.or, c.bl, c.pk, c.dgr, c.dbl][r * 3 + k], { thin: true, g: 'apps' }))),
        S(rect(148, 275, 104, 24, 10), c.wh, { thin: true })
    ],
    computador: () => [
        S(rect(50, 30, 300, 200, 16), c.gy, { g: 'monitor' }), S(rect(66, 46, 268, 168, 6), c.lb, { g: 'tela' }),
        S(rect(86, 66, 120, 80, 5), c.wh, { thin: true, g: 'janelas' }), S(rect(222, 66, 96, 36, 5), c.yl, { thin: true }), S(rect(222, 116, 96, 30, 5), c.pk, { thin: true }),
        T('M 96 90 H 190'), T('M 96 108 H 170'), T('M 96 126 H 180'),
        S('M 172 230 H 228 L 242 282 H 158 Z', c.gy, { g: 'suporte' }), S(rect(118, 282, 164, 16, 8), c.gy, { g: 'suporte' }),
        S(rect(55, 325, 240, 48, 8), c.wh, { g: 'teclado' }),
        ...[0, 1, 2, 3, 4, 5].map(i => T(line(80 + i * 36, 335, 80 + i * 36, 363), { g: 'teclado' })), T('M 65 349 H 285'),
        S(ell(335, 350, 16, 24), c.wh, { g: 'mouse' }), T('M 335 326 V 346')
    ],
    robo: () => [
        S(rect(145, 326, 40, 56, 10), c.gy, { g: 'pernas' }), S(rect(215, 326, 40, 56, 10), c.gy, { g: 'pernas' }),
        S(rect(133, 372, 62, 20, 8), c.dgy, { g: 'pernas' }), S(rect(205, 372, 62, 20, 8), c.dgy, { g: 'pernas' }),
        S(rect(115, 186, 170, 142, 18), c.bl, { g: 'corpo' }),
        S(rect(150, 214, 100, 62, 8), c.wh, { g: 'corpo' }), dot(172, 245, 9, c.rd), dot(200, 245, 9, c.yl), dot(228, 245, 9, c.gr),
        S(rect(72, 200, 40, 100, 16), c.gy, { g: 'bracos' }), S(rect(288, 200, 40, 100, 16), c.gy, { g: 'bracos' }),
        S(circle(92, 314, 18), c.dgy, { g: 'bracos' }), S(circle(308, 314, 18), c.dgy, { g: 'bracos' }),
        S(rect(185, 168, 30, 20, 4), c.dgy, { thin: true }),
        S(rect(112, 100, 18, 42, 6), c.dgy, { g: 'cabeca' }), S(rect(270, 100, 18, 42, 6), c.dgy, { g: 'cabeca' }),
        S(rect(130, 62, 140, 108, 20), c.gy, { g: 'cabeca' }),
        S(rect(150, 90, 38, 28, 6), c.lb, { thin: true }), S(rect(212, 90, 38, 28, 6), c.lb, { thin: true }), dot(169, 104, 6), dot(231, 104, 6),
        S(rect(160, 138, 80, 18, 5), c.wh, { thin: true }), T('M 180 138 V 156'), T('M 200 138 V 156'), T('M 220 138 V 156'),
        T('M 200 62 V 32'), S(circle(200, 26, 11), c.rd, { thin: true })
    ],
    violao: () => [
        S(rect(188, 40, 24, 140, 4), c.dbr, { g: 'braco' }), S(rect(176, 8, 48, 42, 8), c.dbr, { g: 'braco' }),
        dot(168, 22, 6, c.gy), dot(168, 40, 6, c.gy), dot(232, 22, 6, c.gy), dot(232, 40, 6, c.gy),
        S('M 150 215 Q 140 168 200 160 Q 260 168 250 215 Q 235 240 252 262 Q 292 290 286 332 Q 276 388 200 388 Q 124 388 114 332 Q 108 290 148 262 Q 165 240 150 215 Z', '#C97B3A', { g: 'corpo' }),
        S(circle(200, 268, 28), c.dbr, { g: 'detalhes' }), S(rect(172, 340, 56, 12, 4), c.dbr, { g: 'detalhes' }),
        T('M 194 30 V 344', { w: 2, c: c.gy }), T('M 200 30 V 344', { w: 2, c: c.gy }), T('M 206 30 V 344', { w: 2, c: c.gy }),
        T('M 188 80 H 212', { w: 3, c: c.gy }), T('M 188 115 H 212', { w: 3, c: c.gy }), T('M 188 148 H 212', { w: 3, c: c.gy })
    ],

    // ===== ROUPAS, MÓVEIS E ELETRODOMÉSTICOS =====
    camiseta: () => [
        S('M 125 55 Q 200 95 275 55 L 358 112 L 322 178 L 282 152 V 365 H 118 V 152 L 78 178 L 42 112 Z', c.bl, { g: 'camiseta' }),
        S('M 125 55 Q 200 112 275 55 Q 200 85 125 55 Z', c.dbl, { thin: true }),
        T('M 118 210 H 282'), T('M 118 250 H 282'),
        S(star(200, 300, 30, 13), c.yl, { thin: true })
    ],
    bone: () => [
        S('M 70 235 Q 70 88 205 88 Q 340 88 340 235 Z', c.rd, { g: 'copa' }),
        T('M 205 90 V 235'), T('M 140 105 Q 110 160 112 232'), T('M 270 105 Q 300 160 298 232'),
        S(circle(205, 82, 10), c.rd, { thin: true }),
        S('M 62 238 Q 200 258 392 285 Q 385 232 335 236 Z', '#B71C1C', { g: 'aba' }),
        S(circle(205, 175, 24), c.wh, { thin: true })
    ],
    cadeira: () => [
        S(rect(105, 225, 24, 155, 6), c.br, { g: 'pernas' }), S(rect(271, 225, 24, 155, 6), c.br, { g: 'pernas' }),
        S(rect(129, 305, 142, 14, 4), c.br, { g: 'pernas' }),
        S(rect(95, 195, 210, 32, 9), c.br, { g: 'assento' }),
        S(rect(110, 30, 180, 160, 14), c.br, { g: 'encosto' }), S(rect(132, 52, 136, 116, 8), c.tan, { g: 'encosto' }),
        T('M 166 52 V 168'), T('M 200 52 V 168'), T('M 234 52 V 168')
    ],
    ventilador: () => [
        S(ell(200, 368, 78, 17), c.gy, { g: 'base' }), S(rect(188, 290, 24, 78, 6), c.gy, { g: 'base' }),
        S(rect(170, 262, 60, 40, 10), c.dgy, { g: 'motor' }), dot(190, 282, 5, c.rd), dot(210, 282, 5, c.gr),
        S(circle(200, 160, 120), c.wh, { g: 'gaiola' }),
        ...[90, 210, 330].map(a => { const [x, y] = pt(200, 160, 52, a); return S(ell(x, y, 40, 26, a), c.bl, { g: 'helice' }); }),
        S(circle(200, 160, 82), 'none', { thin: true, g: 'gaiola' }), S(circle(200, 160, 44), 'none', { thin: true, g: 'gaiola' }),
        ...Array.from({ length: 8 }, (_, i) => { const a = pt(200, 160, 44, i * 45), b = pt(200, 160, 120, i * 45); return T(line(a[0], a[1], b[0], b[1]), { g: 'gaiola' }); }),
        S(circle(200, 160, 18), c.dgy, { g: 'miolo' }), dot(200, 160, 5, c.wh)
    ],
    geladeira: () => [
        S(rect(110, 380, 24, 14, 4), c.dgy, { g: 'pes' }), S(rect(266, 380, 24, 14, 4), c.dgy, { g: 'pes' }),
        S(rect(105, 20, 190, 365, 18), '#E3F2FD', { g: 'porta' }),
        T('M 105 140 H 295', { thin: false, w: 8 }),
        S(rect(130, 60, 10, 54, 5), c.dgy, { thin: true }), S(rect(130, 170, 10, 90, 5), c.dgy, { thin: true }),
        S(star(235, 80, 14, 6, 4), c.rd, { thin: true }), S(rect(220, 190, 40, 28, 4), c.yl, { thin: true }), dot(250, 300, 12, c.gr)
    ],
    televisao: () => [
        T('M 200 80 L 140 20', { wu: 5, c: INK }), T('M 200 80 L 265 25', { wu: 5, c: INK }),
        S(rect(60, 80, 280, 215, 20), c.nv, { g: 'tv' }), S(rect(76, 96, 205, 183, 10), c.lb, { g: 'tela' }),
        S(circle(130, 150, 24), c.yl, { thin: true }), S('M 76 279 L 150 190 L 200 245 L 235 205 L 281 279 Z', c.dgr, { thin: true }),
        dot(310, 120, 10, c.rd), dot(310, 158, 10, c.gy), T('M 298 200 H 325'), T('M 298 215 H 325'), T('M 298 230 H 325'),
        S(rect(120, 295, 20, 40, 6), c.nv, { g: 'pes' }), S(rect(260, 295, 20, 40, 6), c.nv, { g: 'pes' })
    ],

    // ===== LUGARES E PERSONAGENS =====
    castelo: () => [
        S(rect(125, 150, 150, 215, 4), c.st, { g: 'muralha' }),
        S('M 125 150 V 124 H 148 V 140 H 170 V 124 H 192 V 140 H 214 V 124 H 236 V 140 H 252 V 124 H 275 V 150 Z', c.st, { g: 'muralha' }),
        S(rect(55, 120, 72, 245, 4), c.st, { g: 'torres' }), S(rect(273, 120, 72, 245, 4), c.st, { g: 'torres' }),
        S(poly([[45, 122], [91, 40], [137, 122]]), c.rd, { g: 'telhados' }), S(poly([[263, 122], [309, 40], [355, 122]]), c.rd, { g: 'telhados' }),
        T('M 91 40 V 12'), S(poly([[91, 12], [123, 22], [91, 32]]), c.yl, { thin: true }), T('M 309 40 V 12'), S(poly([[309, 12], [341, 22], [309, 32]]), c.yl, { thin: true }),
        S('M 172 365 V 285 Q 200 240 228 285 V 365 Z', c.dbr, { g: 'portao' }), T('M 200 262 V 365'),
        S(rect(84, 160, 14, 34, 7), c.nv, { thin: true }), S(rect(302, 160, 14, 34, 7), c.nv, { thin: true }), S(rect(84, 240, 14, 34, 7), c.nv, { thin: true }), S(rect(302, 240, 14, 34, 7), c.nv, { thin: true })
    ],
    farol: () => {
        const l = y => 150 + (350 - y) * 20 / 230, r = y => 250 - (350 - y) * 20 / 230;
        const band = (a, b) => poly([[l(a), a], [r(a), a], [r(b), b], [l(b), b]]);
        return [
            S(poly([[228, 80], [395, 30], [395, 130]]), '#FFF3A8', { thin: true, g: 'luz' }), S(poly([[172, 80], [5, 30], [5, 130]]), '#FFF3A8', { thin: true, g: 'luz' }),
            S(ell(200, 368, 125, 22), c.gy, { g: 'pedras' }),
            S(poly([[150, 350], [170, 120], [230, 120], [250, 350]]), c.wh, { g: 'torre' }),
            S(band(300, 250), c.rd, { g: 'faixas' }), S(band(200, 150), c.rd, { g: 'faixas' }),
            S('M 188 350 V 315 Q 200 295 212 315 V 350 Z', c.dbr, { thin: true }),
            S(rect(158, 100, 84, 20, 4), c.dgy, { g: 'topo' }), S(rect(172, 58, 56, 42), c.yl, { g: 'topo' }), T('M 200 58 V 100'),
            S(poly([[162, 60], [200, 22], [238, 60]]), c.rd, { g: 'topo' })
        ];
    },
    fantasma: () => [
        S('M 90 352 V 180 Q 90 55 200 55 Q 310 55 310 180 V 352 Q 286 322 263 352 Q 240 382 217 352 Q 194 322 172 352 Q 150 382 127 352 Q 108 330 90 352 Z', '#F4F7FB', { g: 'corpo' }),
        S('M 92 235 Q 50 225 45 268 Q 72 268 92 285 Z', '#F4F7FB', { g: 'bracos' }), S('M 308 235 Q 350 225 355 268 Q 328 268 308 285 Z', '#F4F7FB', { g: 'bracos' }),
        S(ell(165, 170, 16, 23), INK, { thin: true, g: 'rosto' }), S(ell(235, 170, 16, 23), INK, { thin: true }), dot(160, 160, 5, c.wh, { w: 2 }), dot(230, 160, 5, c.wh),
        S(ell(200, 235, 17, 24), INK, { thin: true }),
        S(circle(135, 212, 13), c.pk, { thin: true, w: 3 }), S(circle(265, 212, 13), c.pk, { thin: true, w: 3 })
    ],
    despertador: () => [
        S(circle(112, 72, 34), c.yl, { g: 'sinos' }), S(circle(288, 72, 34), c.yl, { g: 'sinos' }),
        T('M 200 90 V 62', { wu: 6, c: INK }), S(rect(178, 48, 44, 16, 6), c.dgy, { thin: true }),
        ...thick('M 130 322 L 98 385', c.dgy, 14, 'pes'), ...thick('M 270 322 L 302 385', c.dgy, 14, 'pes'),
        S(circle(200, 218, 130), c.rd, { g: 'corpo' }), S(circle(200, 218, 104), c.wh, { g: 'mostrador' }),
        ...Array.from({ length: 12 }, (_, i) => { const a = pt(200, 218, 80, i * 30 - 90), b = pt(200, 218, 94, i * 30 - 90); return T(line(a[0], a[1], b[0], b[1]), { wu: i % 3 === 0 ? 6 : 3, g: 'marcas' }); }),
        S('M 200 218 L 200 150', 'none', { wu: 8, c: INK, g: 'ponteiros' }), S('M 200 218 L 252 248', 'none', { wu: 6, c: INK, g: 'ponteiros' }), S(circle(200, 218, 9), c.rd, { thin: true })
    ]
};

const cache = new Map();

function build(id) {
    const strokes = DRAWINGS[id]().map(s => ({ ...s, fill: s.fill || 'none' }));
    return { strokes };
}

// Devolve { strokes } (sem o id, para não revelar a palavra) ou null.
function getDrawing(id) {
    if (!Object.prototype.hasOwnProperty.call(DRAWINGS, id)) return null;
    if (!cache.has(id)) cache.set(id, build(id));
    return cache.get(id);
}
const hasDrawing = id => Object.prototype.hasOwnProperty.call(DRAWINGS, id);
const ids = () => Object.keys(DRAWINGS);

module.exports = { getDrawing, hasDrawing, ids, INK };
