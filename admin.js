'use strict';
// Painel administrativo: fala com o servidor pelo canal protegido /admin (senha + somente este computador).
(() => {
    const $ = id => document.getElementById(id);
    let token = location.hash.slice(1) || sessionStorage.getItem('painel-senha') || '';
    if (!token) token = prompt('Cole a senha do painel (aparece no terminal, no link "Painel admin"):') || '';
    sessionStorage.setItem('painel-senha', token);
    history.replaceState(null, '', location.pathname);

    $('preview').src = '/?mute=1';
    const socket = io('/admin', { auth: { token } });
    const PHASES = { idle: 'Aguardando', drawing: 'Desenhando', paused: 'Pausada', reveal: 'Mostrando a resposta', gameover: 'Fim de jogo (tela dos melhores)', exhausted: 'PALAVRAS ESGOTADAS' };
    let state = null;
    let msgTimer = 0;

    function say(text, error) {
        const m = $('msg');
        m.textContent = text; m.className = 'msg show' + (error ? ' err' : '');
        clearTimeout(msgTimer); msgTimer = setTimeout(() => { m.className = 'msg'; }, error ? 7000 : 3000);
    }
    function cmd(name, payload = {}) {
        return new Promise(resolve => socket.emit('cmd', name, payload, res => {
            res = res || { ok: false, error: 'Sem resposta do servidor' };
            if (!res.ok) say(res.error || 'Não foi possível', true);
            else if (name === 'resetHistory' || name === 'resetGame' || name === 'resetScores') say('Feito!');
            if (res.state) render(res.state);
            resolve(res);
        }));
    }

    // ---------- feed ----------
    const feed = $('feed');
    function log(text, cls) {
        const d = document.createElement('div');
        if (cls) d.className = cls;
        const t = document.createElement('span'); t.className = 't'; t.textContent = new Date().toLocaleTimeString().slice(0, 8) + ' ';
        d.append(t, document.createTextNode(text));
        feed.prepend(d);
        while (feed.children.length > 120) feed.removeChild(feed.lastChild);
    }

    // ---------- estado ----------
    const set = (id, v) => { $(id).textContent = v; };
    const span = t => { const e = document.createElement('span'); e.textContent = t; return e; };
    function render(s) {
        state = s;
        const a = s.admin || {};
        set('s-phase', PHASES[s.phase] || s.phase);
        set('s-round', s.round);
        set('s-time', s.phase === 'drawing' || s.phase === 'paused' ? `${s.timeLeft}s de ${s.roundSeconds}s` : '-');
        set('s-cat', a.secret ? a.secret.category || s.category || '-' : '-');
        set('s-hits', `${s.hits.count}/${s.hits.max}`);
        set('s-likes', `${s.likes.current}/${s.likes.perHint}`);
        set('s-words', a.words ? `${a.words.available} sobrando de ${a.words.total} (${a.words.used} usadas)` : '-');
        set('s-secret', a.secret ? a.secret.word.toUpperCase() : '-');
        $('s-prog').style.width = `${a.drawingProgress || 0}%`;

        const conn = $('b-conn'); conn.textContent = 'Painel conectado'; conn.className = 'badge ok';
        const live = $('b-live'); live.textContent = s.live ? 'Live: rodando' : 'Live: parada'; live.className = 'badge' + (s.live ? ' ok' : '');
        set('b-mode', `Modo: ${s.mode === 'tiktok' ? 'TikTok' : 'Teste'}`);
        const tt = $('b-tt'); const t = a.tiktok || {};
        tt.textContent = `TikTok: ${t.text || 'desconectado'}`; tt.className = 'badge' + (t.connected ? ' ok' : '');

        const al = $('alert');
        if (s.phase === 'exhausted') { al.textContent = 'As palavras acabaram. Clique em "Reiniciar histórico de palavras" (seção 6) e depois em "Iniciar rodada".'; al.style.display = 'block'; }
        else if (!s.live) { al.textContent = 'A live está parada. Clique em "Iniciar live".'; al.style.display = 'block'; }
        else al.style.display = 'none';

        if (a.settings) {
            if (document.activeElement !== $('seconds')) { if (![...$('seconds').options].some(o => Number(o.value) === a.settings.roundSeconds)) $('seconds').add(new Option(a.settings.roundSeconds, a.settings.roundSeconds)); $('seconds').value = a.settings.roundSeconds; }
            $('auto').checked = a.settings.auto;
            if (document.activeElement !== $('mode')) $('mode').value = a.settings.mode;
            if (document.activeElement !== $('speed')) { $('speed').value = a.settings.baseSpeed; set('speed-v', `${a.settings.baseSpeed}x`); }
        }
        const gifts = $('g-gift');
        if (!gifts.options.length && s.tools) s.tools.forEach(tool => gifts.add(new Option(`${tool.gift} → ${tool.name}`, tool.gift)));

        const rank = $('rank'); rank.textContent = '';
        (a.top || []).forEach(u => { const li = document.createElement('li'); li.append(span(`${u.pos}. @${u.username}`), span(`${u.points} pts (${u.hits})`)); rank.appendChild(li); });
        if (!rank.children.length) rank.innerHTML = '<li>Ninguém pontuou ainda</li>';
        const hist = $('hist'); hist.textContent = '';
        (a.history || []).slice(0, 10).forEach(h => { const li = document.createElement('li'); li.append(span(h.word), span(`fase ${h.round} - ${String(h.result).replace(/_/g, ' ')}`)); hist.appendChild(li); });
    }

    // ---------- eventos ----------
    socket.on('connect', () => log('Painel conectado', 'sys'));
    socket.on('disconnect', () => { $('b-conn').textContent = 'Desconectado'; $('b-conn').className = 'badge bad'; });
    socket.on('connect_error', e => { $('b-conn').textContent = 'Acesso negado'; $('b-conn').className = 'badge bad'; say(`Não consegui entrar: ${e.message}. Abra o link "Painel admin" que aparece no terminal.`, true); });
    socket.on('state', render);
    socket.on('comment', c => log(`@${c.user}: ${c.text}`, c.correct ? 'win' : ''));
    socket.on('correct', c => log(`ACERTOU #${c.rank}: @${c.username} (+${c.points} pts)`, 'win'));
    socket.on('gift', g => log(`PRESENTE: @${g.username} enviou ${g.giftName} x${g.count}${g.tool ? ' → ' + g.tool : ' (sem ferramenta)'}`, 'gift'));
    socket.on('round:end', r => log(`Fim da rodada. Resposta: ${r.answer}`, 'sys'));
    socket.on('game:over', g => log(`FIM DE JOGO na fase ${g.phase}. Resposta: ${g.answer}`, 'sys'));
    socket.on('toast', t => log(t.text, 'sys'));
    socket.on('status', s => { if (s.text) log(s.text, 'sys'); });
    socket.on('timer', t => { if (state) set('s-time', `${t.timeLeft}s de ${state.roundSeconds}s`); });

    // ---------- botões ----------
    document.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.confirm && !confirm(b.dataset.confirm)) return;
        cmd(b.dataset.cmd, b.dataset.payload ? JSON.parse(b.dataset.payload) : {});
    }));
    $('tt-connect').addEventListener('click', async () => {
        const name = $('tt-user').value.trim();
        say('Conectando ao TikTok...');
        const r = await cmd('connectTikTok', { username: name });
        if (r.ok) say('Conectado! Os comentários da sua live já chegam aqui.');
    });
    $('speed').addEventListener('input', e => set('speed-v', `${e.target.value}x`));
    $('speed').addEventListener('change', e => cmd('setSpeed', { value: Number(e.target.value) }));
    $('seconds').addEventListener('change', e => cmd('setRoundSeconds', { value: Number(e.target.value) }));
    $('auto').addEventListener('change', e => cmd('setAuto', { value: e.target.checked }));
    $('mode').addEventListener('change', e => cmd('setMode', { value: e.target.value }));
    const sendGuess = () => { const text = $('g-text').value.trim(); if (text) cmd('testGuess', { user: $('g-user').value.trim() || 'Voce_Teste', text }); $('g-text').value = ''; };
    $('g-send').addEventListener('click', sendGuess);
    $('g-text').addEventListener('keydown', e => { if (e.key === 'Enter') sendGuess(); });
    $('g-giftbtn').addEventListener('click', () => cmd('simulateGift', { user: $('g-user').value.trim() || 'Voce_Teste', gift: $('g-gift').value }));
    $('g-likes').addEventListener('click', () => cmd('addLikes', { count: 84 }));
})();
