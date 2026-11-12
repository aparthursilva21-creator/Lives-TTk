'use strict';
// Motor de desenho (navegador). Recebe { strokes: [...] } de Data/Drawings.js e anima traço por traço,
// com pincel acompanhando a linha. O tempo é controlado de fora (servidor), então pausar, retomar,
// acelerar, voltar ao início, mostrar o desenho completo e ressincronizar são operações simples.
//
//   const drawer = new Drawer({ svg, brush, width: 1000, height: 900, padding: 70 });
//   drawer.load(data, { totalMs, elapsedMs, speed, paused });
//   drawer.pause(); drawer.resume(); drawer.setSpeed(2); drawer.seek(ms); drawer.restart();
//   drawer.complete(); drawer.clear();
(function () {
    const NS = 'http://www.w3.org/2000/svg';
    const INK = '#1d1b2e';
    const GAP = 0.06;        // fração do tempo de um traço entre traços seguidos
    const GROUP_GAP = 0.5;   // pausa extra (em "traços") ao mudar de grupo
    const MIN_LEN = 40;      // traços muito curtos ganham um tempo mínimo

    class Drawer {
        constructor({ svg, brush, width = 1000, height = 900, padding = 70 }) {
            this.svg = svg;
            this.brush = brush;
            this.width = width;
            this.height = height;
            this.padding = padding;
            this.art = document.createElementNS(NS, 'g');
            // O desenho fica ATRÁS do pincel (o pincel precisa aparecer por cima das formas preenchidas).
            if (brush && brush.parentNode === svg) svg.insertBefore(this.art, brush);
            else svg.appendChild(this.art);
            this.items = [];
            this.total = 1;
            this.t = 0;
            this.speed = 1;
            this.paused = true;
            this.raf = 0;
            this.last = 0;
            this.scale = 1;
            this.tx = 0;
            this.ty = 0;
            this.loaded = false;
            this.onFinish = null;
            this._loop = this._loop.bind(this);
        }

        clear() {
            this._stop();
            while (this.art.firstChild) this.art.removeChild(this.art.firstChild);
            this.items = [];
            this.loaded = false;
            this.t = 0;
            this._hideBrush();
        }

        // data: { strokes } | null.  state: { totalMs, elapsedMs, speed, paused }
        load(data, state = {}) {
            this.clear();
            if (!data || !Array.isArray(data.strokes) || data.strokes.length === 0) return false;

            for (const s of data.strokes) {
                const p = document.createElementNS(NS, 'path');
                p.setAttribute('d', s.d);
                p.setAttribute('fill', s.fill && s.fill !== 'none' ? s.fill : 'none');
                this.art.appendChild(p);
            }
            this.art.removeAttribute('transform');

            // Encaixa e centraliza mantendo a proporção (medido com tudo visível).
            const box = this.art.getBBox();
            const availW = this.width - this.padding * 2;
            const availH = this.height - this.padding * 2;
            this.scale = Math.min(availW / Math.max(box.width, 1), availH / Math.max(box.height, 1));
            this.tx = this.width / 2 - this.scale * (box.x + box.width / 2);
            this.ty = this.height / 2 - this.scale * (box.y + box.height / 2);
            this.art.setAttribute('transform', `translate(${this.tx} ${this.ty}) scale(${this.scale})`);

            // Linha do tempo: cada traço recebe um trecho proporcional ao seu comprimento.
            const weights = [];
            let prevGroup = null;
            data.strokes.forEach((s, i) => {
                const path = this.art.children[i];
                const length = path.getTotalLength();
                let w = Math.max(MIN_LEN, length) * (s.t || 1);
                if (i > 0 && s.g !== prevGroup) w += MIN_LEN * GROUP_GAP * 4;
                prevGroup = s.g;
                weights.push({ length, w });
                const px = s.wu ? s.wu : (s.w || (s.thin ? 5 : 8)) / this.scale;
                path.setAttribute('stroke', s.c || INK);
                path.setAttribute('stroke-width', px);
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                path.style.strokeDasharray = length;
                path.style.strokeDashoffset = length;
                path.style.display = 'none';
            });
            const sum = weights.reduce((a, b) => a + b.w, 0);
            let cursor = 0;
            this.items = data.strokes.map((s, i) => {
                const share = weights[i].w / sum;
                const start = cursor;
                const end = start + share * (1 - GAP);
                cursor += share;
                return { el: this.art.children[i], length: weights[i].length, start, end, fill: s.fill && s.fill !== 'none' ? s.fill : null, state: 'hidden' };
            });

            this.total = Math.max(1, state.totalMs || 40000);
            this.speed = state.speed || 1;
            this.t = Math.min(this.total, Math.max(0, state.elapsedMs || 0));
            this.loaded = true;
            this.paused = Boolean(state.paused);
            this._render(true);
            if (!this.paused) this._run();
            return true;
        }

        // ---------- controles ----------
        pause() { this.paused = true; this._stop(); this._render(); }
        resume() { if (!this.loaded) return; this.paused = false; this._run(); }
        setSpeed(v) { this.speed = Math.max(0.1, Number(v) || 1); }
        seek(ms) { this.t = Math.min(this.total, Math.max(0, ms)); this._render(true); if (!this.paused) this._run(); }
        restart() { this.t = 0; this._render(true); if (!this.paused) this._run(); }
        complete() { this.t = this.total; this._stop(); this._render(true); }
        showAll() { this.complete(); }
        isFinished() { return this.t >= this.total; }
        // Corrige a diferença com o servidor sem "pulos" pequenos
        sync(ms) { if (Math.abs(ms - this.t) > 400) this.seek(ms); }

        // ---------- interno ----------
        _run() {
            if (this.raf || this.t >= this.total) return;
            this.last = performance.now();
            this.raf = requestAnimationFrame(this._loop);
        }
        _stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }

        _loop(now) {
            this.raf = 0;
            if (this.paused || !this.loaded) return;
            const dt = Math.min(now - this.last, 100);
            this.last = now;
            this.t = Math.min(this.total, this.t + dt * this.speed);
            this._render();
            if (this.t < this.total) {
                this.raf = requestAnimationFrame(this._loop);
            } else if (this.onFinish) {
                this.onFinish();
            }
        }

        _hideBrush() { if (this.brush) this.brush.style.display = 'none'; }

        _render(force) {
            if (!this.loaded) return;
            const p = this.t / this.total;
            let active = null;
            let lastDone = null;

            for (const it of this.items) {
                const local = p <= it.start ? 0 : p >= it.end ? 1 : (p - it.start) / (it.end - it.start);
                if (local <= 0) {
                    if (it.state !== 'hidden' || force) { it.el.style.display = 'none'; it.el.style.fillOpacity = 0; it.state = 'hidden'; }
                } else if (local >= 1) {
                    if (it.state !== 'done' || force) {
                        it.el.style.display = '';
                        it.el.style.strokeDasharray = 'none';
                        it.el.style.strokeDashoffset = 0;
                        if (it.fill) it.el.style.fillOpacity = 1;
                        it.state = 'done';
                    }
                    lastDone = it;
                } else {
                    it.el.style.display = '';
                    it.el.style.strokeDasharray = it.length;
                    it.el.style.strokeDashoffset = it.length * (1 - local);
                    it.el.style.fillOpacity = 0;
                    it.state = 'drawing';
                    active = { it, local };
                }
            }

            // Pincel: segue a ponta da linha do traço ativo (ou fica no fim do último traço).
            if (!this.brush) return;
            if (this.t >= this.total || (!active && !lastDone)) { this._hideBrush(); return; }
            const target = active ? active.it : lastDone;
            const at = active ? target.length * active.local : target.length;
            const point = target.el.getPointAtLength(at);
            const x = this.tx + this.scale * point.x;
            const y = this.ty + this.scale * point.y;
            this.brush.style.display = '';
            this.brush.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        }
    }

    window.Drawer = Drawer;
})();
