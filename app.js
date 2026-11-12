'use strict';
// Tela de transmissão: só desenha o que o servidor manda. Nenhuma lógica do jogo (nem a palavra) fica aqui.
// Parâmetros úteis na URL: ?test=1 (campo de palpites de teste), ?mute=1 (sem sons).
(() => {
    const $ = id => document.getElementById(id);
    const params = new URLSearchParams(location.search);
    const MUTED = params.get('mute') === '1';
    const stage = $('stage');

    // ---------- escala do palco (1080x1920) para a janela ----------
    function fit() {
        const s = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
        stage.style.transform = `scale(${s})`;
        stage.style.left = `${(window.innerWidth - 1080 * s) / 2}px`;
        stage.style.top = `${(window.innerHeight - 1920 * s) / 2}px`;
    }
    window.addEventListener('resize', fit);
    fit();

    // ---------- bolhas decorativas ----------
    (() => {
        const bg = $('bg');
        const spots = [[60, 300, 120], [900, 420, 90], [820, 1180, 150], [40, 1010, 80], [930, 60, 70], [450, 1860, 110], [980, 1700, 100], [120, 1720, 90]];
        spots.forEach(([x, y, size], i) => {
            const b = document.createElement('span');
            b.className = 'bubble';
            b.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;animation-delay:${-i * 1.3}s`;
            bg.appendChild(b);
        });
    })();

    // ---------- som (Web Audio, sem arquivos) ----------
    let audio = null;
    function initAudio() {
        if (MUTED) return;
        try {
            if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
            if (audio.state === 'suspended') audio.resume();
        } catch (_) { /* sem som */ }
    }
    function tone(freq, start, dur, type = 'sine', vol = 0.12) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain); gain.connect(audio.destination);
        osc.start(start); osc.stop(start + dur + 0.02);
    }
    function playSound(kind) {
        if (MUTED || !audio) return;
        const t = audio.currentTime;
        if (kind === 'tick') tone(620, t, 0.08, 'sine', 0.05);
        else if (kind === 'hint') { tone(880, t, 0.15, 'triangle'); tone(1320, t + 0.1, 0.2, 'triangle'); }
        else if (kind === 'correct') [523.25, 659.25, 783.99].forEach((f, i) => tone(f, t + i * 0.08, 0.25, 'triangle', 0.14));
        else if (kind === 'win') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.1, 0.4, 'triangle', 0.15));
        else if (kind === 'timeout') { tone(190, t, 0.35, 'sawtooth', 0.12); tone(120, t + 0.15, 0.4, 'sawtooth', 0.12); }
        else if (kind === 'tool') tone(700, t, 0.12, 'square', 0.06);
    }
    ['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, initAudio, { once: true }));

    // ---------- confetes ----------
    const confetti = $('confetti');
    const cctx = confetti.getContext('2d');
    let particles = [];
    let confettiRaf = 0;
    function launchConfetti(count = 90) {
        const colors = ['#3DDC84', '#FFD93B', '#4DA3F5', '#FF4081', '#FFFFFF', '#FF9A3C'];
        for (let i = 0; i < count && particles.length < 260; i++) {
            particles.push({
                x: 540, y: 620, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 28 - 6,
                size: Math.random() * 14 + 8, color: colors[(Math.random() * colors.length) | 0], life: 110 + Math.random() * 40, rot: Math.random() * 6
            });
        }
        if (!confettiRaf) confettiRaf = requestAnimationFrame(stepConfetti);
    }
    function stepConfetti() {
        cctx.clearRect(0, 0, 1080, 1920);
        particles = particles.filter(p => p.life > 0);
        for (const p of particles) {
            p.x += p.vx; p.y += p.vy; p.vy += 0.9; p.vx *= 0.99; p.life--; p.rot += 0.2;
            cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot); cctx.fillStyle = p.color;
            cctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); cctx.restore();
        }
        confettiRaf = particles.length ? requestAnimationFrame(stepConfetti) : 0;
        if (!particles.length) cctx.clearRect(0, 0, 1080, 1920);
    }

    // ---------- desenho ----------
    const drawer = new Drawer({ svg: $('drawing-svg'), brush: $('brush'), width: 1000, height: 900, padding: 80 });
    let loadedRound = null;
    let state = null;

    // ---------- utilidades de interface ----------
    const upper = s => String(s == null ? '' : s).toUpperCase();
    function colorFor(name) {
        let h = 0;
        for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
        return `hsl(${h} 65% 48%)`;
    }
    function avatarEl(name, url) {
        const a = document.createElement('div');
        a.className = 'avatar';
        a.style.background = colorFor(name);
        a.textContent = upper(name.charAt(0));
        if (url) {
            const img = document.createElement('img');
            img.alt = '';
            img.referrerPolicy = 'no-referrer';
            img.onload = () => { a.textContent = ''; a.appendChild(img); };
            img.src = url; // só chega aqui se o servidor validou como http(s)
        }
        return a;
    }
    let toastTimer = 0;
    function toast(text) {
        const el = $('toast');
        el.textContent = text;
        el.classList.remove('hidden');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
    }

    // ---------- relógio ----------
    const RING = 2 * Math.PI * 42;
    function setTimer(left, total) {
        $('timer').textContent = left == null ? '--' : left;
        const frac = total > 0 && left != null ? Math.max(0, Math.min(1, left / total)) : 1;
        $('timerRing').style.strokeDashoffset = String(RING * (1 - frac));
        $('timerBox').classList.toggle('warning', left != null && left <= 10 && left > 0);
    }

    // ---------- letras ----------
    let prevLetters = '';
    function renderSlots(slots) {
        const box = $('slots');
        box.textContent = '';
        const count = slots.length;
        if (count === 0) { prevLetters = ''; return; }
        const gaps = slots.filter(s => s.t === 's').length;
        const size = Math.max(34, Math.min(92, Math.floor((1000 - (count - 1) * 10) / Math.max(1, count - gaps * 0.5)) ));
        const prev = prevLetters.split('');
        let letters = '';
        slots.forEach((s, i) => {
            const el = document.createElement('div');
            el.className = 'slot';
            el.style.width = `${s.t === 's' ? size * 0.4 : size}px`;
            el.style.height = `${Math.round(size * 1.25)}px`;
            el.style.fontSize = `${Math.round(size * 0.62)}px`;
            if (s.t === 's') el.classList.add('gap');
            else if (s.t === 'd' || s.t === 'f') { el.classList.add('fixed'); el.textContent = s.t === 'd' ? '-' : s.c; }
            else if (s.c) {
                el.textContent = s.c;
                el.classList.add('hit');
                if (prev[i] !== s.c) el.classList.add('pop');
            }
            letters += s.t === 'l' && s.c ? s.c : '_';
            box.appendChild(el);
        });
        prevLetters = letters;
    }

    function renderHints(s) {
        const cat = $('category');
        cat.textContent = s.category ? `CATEGORIA: ${upper(s.category)}` : 'CATEGORIA: ???';
        cat.classList.toggle('on', Boolean(s.category));
        const d = $('description');
        d.classList.toggle('hidden', !s.description);
        d.classList.toggle('on', Boolean(s.description));
        d.textContent = s.description ? `DICA: ${upper(s.description)}` : '';
    }

    function renderInfo(s) {
        $('info').textContent = `ACERTOS ${s.hits.count}/${s.hits.max} • ♥ ${s.likes.current}/${s.likes.perHint} CURTIDAS = DICA`;
    }

    function renderTools(tools) {
        const box = $('tools');
        if (box.dataset.built === JSON.stringify(tools.map(t => t.id))) return;
        box.textContent = '';
        for (const t of tools) {
            const row = document.createElement('div');
            row.className = 'tool';
            row.dataset.id = t.id;
            row.innerHTML = `<svg><use href="#ic-${t.icon}"/></svg>`; // ícone vem de uma lista fixa do Story.js
            const text = document.createElement('div');
            const b = document.createElement('b'); b.textContent = t.name;
            const sm = document.createElement('small'); sm.textContent = t.gift ? `${upper(t.gift)} • ${t.costLabel}` : t.costLabel;
            text.append(b, sm);
            row.appendChild(text);
            box.appendChild(row);
        }
        box.dataset.built = JSON.stringify(tools.map(t => t.id));
    }

    function renderTop3(top, participants) {
        const box = $('top3');
        box.textContent = '';
        for (let i = 0; i < 3; i++) {
            const u = top && top[i];
            const chip = document.createElement('div');
            chip.className = 'chip' + (u ? '' : ' empty') + (u && i === 0 ? ' leader' : '');
            const medal = document.createElement('span');
            medal.className = 'medal';
            medal.textContent = String(i + 1);
            if (u && i === 0) medal.innerHTML = '<svg class="crown"><use href="#ic-crown"/></svg>1';
            const n = document.createElement('span'); n.className = 'n'; n.textContent = u ? `@${u.username}` : '---';
            const pts = document.createElement('b'); pts.textContent = u ? u.points : '';
            chip.append(medal, n, pts);
            box.appendChild(chip);
        }
    }

    // ---------- comentários ----------
    const MAX_MSGS = 4;
    function messageEl(c) {
        const m = document.createElement('div');
        m.className = 'msg' + (c.correct ? ' correct' : '');
        const who = document.createElement('span'); who.className = 'who'; who.textContent = `@${c.user}`;
        const txt = document.createElement('span'); txt.className = 'txt'; txt.textContent = c.text;
        m.append(avatarEl(c.user, c.avatar), who, txt);
        return m;
    }
    function addComment(c) {
        const chat = $('chat');
        chat.appendChild(messageEl(c));
        while (chat.children.length > MAX_MSGS) chat.removeChild(chat.firstChild);
    }
    function renderComments(list) {
        const chat = $('chat');
        chat.textContent = '';
        (list || []).slice(-MAX_MSGS).forEach(c => chat.appendChild(messageEl(c)));
    }

    // ---------- faixas, resultado e avisos ----------
    const banners = [];
    let bannerBusy = false;
    function showBanner(text) {
        banners.push(text);
        if (!bannerBusy) nextBanner();
    }
    function nextBanner() {
        const el = $('banner');
        const text = banners.shift();
        if (!text) { bannerBusy = false; el.classList.add('hidden'); return; }
        bannerBusy = true;
        el.classList.add('hidden');
        void el.offsetWidth; // reinicia a animação
        el.textContent = text;
        el.classList.remove('hidden');
        setTimeout(nextBanner, 1900);
    }

    function showReveal(r) {
        if (!r) return;
        const won = r.winners && r.winners.length > 0;
        $('ov-title').textContent = won ? '🎉 ACERTARAM!' : (r.reason === 'skipped' ? 'PALAVRA PULADA' : '⏰ TEMPO ESGOTADO!');
        $('ov-word').textContent = upper(r.answer);
        const list = $('ov-winners');
        list.textContent = '';
        (r.winners || []).forEach(w => {
            const li = document.createElement('li');
            li.textContent = `${w.rank}º @${w.username} `;
            const sp = document.createElement('span'); sp.textContent = `+${w.points}`;
            li.appendChild(sp);
            list.appendChild(li);
        });
        $('overlay').classList.remove('hidden');
    }

    // ---------- fim de jogo (tela dos melhores) ----------
    let goTimer = 0;
    function showGameOver(g) {
        const box = $('gameover');
        clearInterval(goTimer);
        if (!g) { box.classList.add('hidden'); return; }
        $('go-phase').textContent = g.phase;
        $('go-word').textContent = upper(g.answer);
        const list = $('go-list');
        list.textContent = '';
        if (!g.top || g.top.length === 0) {
            const li = document.createElement('li'); li.className = 'go-empty'; li.textContent = 'Ninguém pontuou nesta partida. Na próxima vai!';
            list.appendChild(li);
        } else {
            g.top.forEach(u => {
                const li = document.createElement('li');
                const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = u.pos;
                const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = `@${u.username}`;
                const hits = document.createElement('span'); hits.className = 'hits'; hits.textContent = `${u.hits} ${u.hits === 1 ? 'acerto' : 'acertos'}`;
                const pts = document.createElement('span'); pts.className = 'pts'; pts.textContent = `${u.points} pts`;
                li.append(pos, nm, hits, pts);
                list.appendChild(li);
            });
        }
        let left = Math.max(1, Math.round(g.seconds || 10));
        $('go-count').textContent = left;
        goTimer = setInterval(() => { left = Math.max(0, left - 1); $('go-count').textContent = left; if (left <= 0) clearInterval(goTimer); }, 1000);
        box.classList.remove('hidden');
    }

    function setNotice(text) {
        const n = $('notice');
        n.textContent = text || '';
        n.classList.toggle('hidden', !text);
    }

    // ---------- estado completo ----------
    function applyDrawing(s) {
        const active = s.phase === 'drawing' || s.phase === 'paused';
        if (s.phase === 'reveal' || s.phase === 'gameover') { if (drawer.loaded) drawer.complete(); return; }
        if (!active) { drawer.clear(); loadedRound = null; return; }
        const d = s.drawing;
        if (!d || !d.data) { drawer.clear(); loadedRound = s.round; return; }
        if (loadedRound !== s.round || !drawer.loaded) {
            drawer.load(d.data, { totalMs: d.totalMs, elapsedMs: d.elapsedMs, speed: d.speed, paused: d.paused });
            loadedRound = s.round;
        } else {
            drawer.setSpeed(d.speed);
            drawer.sync(d.elapsedMs);
            if (d.paused) drawer.pause(); else drawer.resume();
        }
    }

    function renderState(s) {
        state = s;
        $('round').textContent = s.round;
        $('record').textContent = s.record;
        setTimer(s.phase === 'drawing' || s.phase === 'paused' ? s.timeLeft : (s.phase === 'reveal' || s.phase === 'gameover' ? 0 : null), s.roundSeconds);
        renderSlots(s.slots);
        renderHints(s);
        renderInfo(s);
        renderTools(s.tools);
        renderTop3(s.top, s.participants);
        renderComments(s.comments);

        showGameOver(s.phase === 'gameover' ? s.gameOver : null);
        $('overlay').classList.toggle('hidden', s.phase !== 'reveal');
        if (s.phase === 'reveal') showReveal(s.reveal);

        let notice = '';
        if (s.phase === 'idle') notice = s.live ? 'PRÓXIMA RODADA EM INSTANTES...' : 'AGUARDANDO A LIVE COMEÇAR';
        else if (s.phase === 'exhausted') notice = 'FIM DAS PALAVRAS! VOLTAMOS JÁ JÁ';
        else if (s.phase === 'paused') notice = 'RODADA PAUSADA';
        else if ((s.phase === 'drawing') && (!s.drawing || !s.drawing.data)) notice = 'PREPARANDO O DESENHO...';
        setNotice(notice);
        applyDrawing(s);
    }

    // ---------- Socket.IO ----------
    const socket = io();

    socket.on('connect', () => $('conn').classList.add('hidden'));
    socket.on('disconnect', () => $('conn').classList.remove('hidden'));
    socket.on('connect_error', () => $('conn').classList.remove('hidden'));

    socket.on('state', renderState);
    socket.on('round:new', s => { prevLetters = ''; banners.length = 0; renderState(s); });

    socket.on('timer', t => {
        if (!state) return;
        state.timeLeft = t.timeLeft;
        setTimer(t.timeLeft, state.roundSeconds);
        if (t.timeLeft <= 10 && t.timeLeft > 0) playSound('tick');
        if (typeof t.drawElapsedMs === 'number' && drawer.loaded && !drawer.paused) {
            if (t.speed) drawer.setSpeed(t.speed);
            drawer.sync(t.drawElapsedMs);
        }
    });

    socket.on('draw:control', c => {
        if (!drawer.loaded) return;
        if (c.speed) drawer.setSpeed(c.speed);
        switch (c.action) {
            case 'pause': drawer.pause(); break;
            case 'resume': drawer.sync(c.elapsedMs); drawer.resume(); break;
            case 'speed': drawer.sync(c.elapsedMs); break;
            case 'seek': drawer.seek(c.elapsedMs); break;
            case 'restart': drawer.seek(0); break;
            case 'complete': drawer.complete(); break;
            default: break;
        }
    });

    socket.on('hint', h => {
        if (!state) return;
        state.category = h.category;
        state.description = h.description;
        state.slots = h.slots;
        renderSlots(h.slots);
        renderHints(state);
        playSound('hint');
    });

    socket.on('comment', c => addComment(c));

    socket.on('correct', c => {
        if (state) { state.hits = c.hits; renderInfo(state); }
        showBanner(`🎉 @${upper(c.username)} ACERTOU! +${c.points}`);
        launchConfetti(c.rank === 1 ? 110 : 50);
        playSound('correct');
    });

    socket.on('scores', s => {
        if (state) { state.top = s.top; state.participants = s.participants; }
        renderTop3(s.top, s.participants);
        if (typeof s.record === 'number') $('record').textContent = s.record;
    });

    socket.on('likes', l => { if (state) { state.likes = l; renderInfo(state); } });

    socket.on('round:end', r => {
        showReveal(r);
        if (drawer.loaded) drawer.complete();
        if (r.winners && r.winners.length) { launchConfetti(130); playSound('win'); } else playSound('timeout');
    });

    socket.on('toast', t => {
        toast(t.text);
        if (t.kind === 'tool' && t.tool) {
            const row = document.querySelector(`.tool[data-id="${t.tool}"]`);
            if (row) { row.classList.add('used'); setTimeout(() => row.classList.remove('used'), 1400); }
            playSound('tool');
        }
    });

    socket.on('game:over', g => { showGameOver(g); playSound('timeout'); });
    socket.on('gift', g => { showBanner(`🎁 @${upper(g.username)} ENVIOU ${upper(g.giftName)}!`); });

    socket.on('status', s => { if (s && s.text) toast(s.text); });

    // ---------- entrada de teste (?test=1) ----------
    if (params.get('test') === '1') {
        const form = $('testbox');
        form.classList.remove('hidden');
        form.addEventListener('submit', e => {
            e.preventDefault();
            initAudio();
            const text = $('test-input').value.trim();
            if (text) socket.emit('testGuess', { user: $('test-user').value.trim() || 'Voce_Teste', text });
            $('test-input').value = '';
        });
    }
})();
