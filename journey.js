(() => {
  'use strict';
  const page = document.body.dataset.journey;
  const $ = selector => document.querySelector(selector);
  const continueWhen = ready => { const next = $('#chapterContinue'); if (next) next.hidden = !ready; };
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem('garden:' + key)) ?? fallback; }
    catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('garden:' + key, JSON.stringify(value)); return true; }
    catch { return false; }
  }
  function resultSource() {
    const from = new URLSearchParams(window.location.search).get('from');
    let previous = from;
    try {
      if (from === 'improve' || from === 'sarange') sessionStorage.setItem('garden:previousResult', from);
      else previous = sessionStorage.getItem('garden:previousResult');
    } catch { /* Explicit URL parameters also work without browser storage. */ }
    return previous === 'improve' ? 'improve' : 'sarange';
  }
  if (page === 'quiz') {
    $('.chapter-back').href = `${resultSource()}.html`;
    const shuffle = values => {
      const result = [...values];
      for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
      return result;
    };
    const sourceQuestions = [
      { id: 'apollo', q: 'Аполлонның шын есімі кім?', a: ['Нұрқасым', 'Олжас', 'Алихан', 'Азамат'], correct: 'Олжас', yes: 'Дәл өзі — Олжас! Аполлонның құпиясы ашылды :)', no: 'Аполлон дегеніміз — Олжас 😌' },
      { id: 'drink', q: 'Менің сүйікті сусыным қандай?', a: ['Мохито', 'Пепси', 'Диззи', 'Фанта'], correct: 'Фанта', yes: 'Фантааа! Мені жақсы біледі екенсіз 🍊', no: 'Дұрысы — Фанта 🍊 Келесі жолы ұмытпайсыз енді :)' },
      { id: 'lobster', q: 'Lobster аудармасы қандай?', a: ['Жамбыл', 'Омар', 'Ару', 'Думан'], correct: 'Омар', yes: 'Дұрыс — Омар! Осы сөздің өзі таныс қой ♡', no: 'Дұрысы — Омар ♡ Енді lobster дегенде кім еске түсетінін білесіз :)' },
      { id: 'love', q: 'Мен үйде кімді қатты жақсы көрем?', a: ['Ару әпке', 'Ару жеңге', 'Жамбыл аға', 'Өзімді'], correct: 'Өзімді', yes: 'Кішкентай жазуды байқап қойдыңыз ғой 😂 Өзімді! Бірақ сізді де қатты жақсы көрем ♡', no: 'Мұқият қарасаңыз… «өзімді» деген кішкентай жауап бар еді 😂 Сізді де жақсы көрем, уайымдамаңыз ♡' },
      { id: 'ranking', q: 'Мен үйде қай баланы қатты жақсы көрем? Рейтинг жасаңыз.', ranking: true },
    ];
    const names = ['Інжу', 'Омар', 'Мейірім', 'Алишаһ'];
    let questions = shuffle(sourceQuestions), current = 0, score = 0, answered = false;
    function finish(correct, message) {
      if (answered) return;
      answered = true; if (correct) score++;
      $('#quizFeedback').textContent = message; $('#quizProgress').value = current + 1;
      $('#quizNext').hidden = false;
      $('#quizNext').textContent = current === questions.length - 1 ? 'Нәтижені көру ♡' : 'Келесі сұрақ →';
      $('#quizNext').focus({ preventScroll: true });
    }
    function renderRanking() {
      const root = $('#quizAnswers'); root.classList.add('is-ranking');
      const order = shuffle(names), placements = new Map(); let selected = null;
      const instructions = document.createElement('p'); instructions.className = 'ranking-help';
      instructions.textContent = 'Аттарды қатарларға сүйреп апарыңыз. Телефонда: атты, содан кейін қатарды басыңыз. Бір қатардағы балалар тең болады.';
      const pool = document.createElement('div'); pool.className = 'ranking-pool'; pool.setAttribute('aria-label', 'Орналастырылатын аттар');
      const lanes = [], cards = new Map();
      const status = document.createElement('p'); status.className = 'ranking-status'; status.setAttribute('aria-live', 'polite');
      const check = document.createElement('button'); check.type = 'button'; check.className = 'rank-check'; check.textContent = 'Рейтингті тексеру ♡'; check.disabled = true;
      function select(name) {
        if (answered) return; selected = name;
        cards.forEach((card, key) => card.setAttribute('aria-pressed', String(key === name)));
        status.textContent = `${name}: енді орнын таңдаңыз.`;
      }
      function place(rank) {
        if (answered || !selected) return;
        const name = selected; placements.set(name, rank); lanes[rank].append(cards.get(name));
        cards.get(name).setAttribute('aria-label', `${name}, ${rank + 1}-орында. Орын ауыстыру үшін таңдаңыз.`);
        selected = null; cards.forEach(card => card.setAttribute('aria-pressed', 'false'));
        check.disabled = placements.size !== names.length;
        status.textContent = placements.size === names.length ? 'Барлығы орналасты. Қаласаңыз, орындарын ауыстыра аласыз.' : `${placements.size} / 4 орналасты.`;
      }
      root.append(instructions, pool);
      for (let rank = 0; rank < names.length; rank++) {
        const lane = document.createElement('section'); lane.className = 'ranking-lane'; lane.dataset.rank = rank;
        const heading = document.createElement('button'); heading.type = 'button'; heading.className = 'rank-destination';
        heading.textContent = `${String(rank + 1).padStart(2, '0')} · ${rank + 1}-орын`;
        heading.setAttribute('aria-label', `Таңдалған атты ${rank + 1}-орынға қою`);
        const row = document.createElement('div'); row.className = 'ranking-row'; row.setAttribute('aria-label', `${rank + 1}-орындағы балалар`); lanes.push(row);
        heading.addEventListener('click', () => place(rank));
        lane.addEventListener('click', event => { if (event.target === row || event.target === lane) place(rank); });
        lane.addEventListener('dragover', event => { if (!answered) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } });
        lane.addEventListener('drop', event => { event.preventDefault(); if (!answered) place(rank); });
        lane.append(heading, row); root.append(lane);
      }
      order.forEach(name => {
        const card = document.createElement('button'); card.type = 'button'; card.className = 'rank-name'; card.textContent = name; card.draggable = true;
        card.setAttribute('aria-pressed', 'false'); card.addEventListener('click', () => select(name));
        card.addEventListener('dragstart', event => { if (answered) { event.preventDefault(); return; } select(name); event.dataTransfer.setData('text/plain', name); event.dataTransfer.effectAllowed = 'move'; });
        cards.set(name, card); pool.append(card);
      });
      check.addEventListener('click', () => {
        if (answered || placements.size !== names.length) return;
        const correct = ['Інжу', 'Омар', 'Мейірім'].every(name => placements.get(name) === 0) && placements.get('Алишаһ') === 3;
        // Show the intended ties after checking, without singling out a wrong card.
        order.forEach(name => { const card = cards.get(name); lanes[name === 'Алишаһ' ? 3 : 0].append(card); card.disabled = true; card.draggable = false; card.setAttribute('aria-label', name); });
        root.querySelectorAll('button').forEach(button => button.disabled = true);
        status.textContent = 'Інжу = Омар = Мейірім · содан кейін Алишаһ.';
        finish(correct, correct ? 'Дәл солай! Інжу, Омар, Мейірім — үшеуі де тең ♡ Алишаһ әзірге соңында :)' : 'Менің рейтингім осындай: Інжу, Омар, Мейірім — бір қатарда, үшеуі тең ♡ Алишаһ — соңғы орында.');
      });
      root.append(status, check);
    }
    function render() {
      continueWhen(false);
      $('#quizCoupon').hidden = true;
      $('#quizSheet').hidden = false;
      $('#quizHeading').hidden = false;
      document.body.classList.remove('quiz-complete');
      answered = false;
      const question = questions[current];
      $('#quizCount').textContent = `0${current + 1} / 0${questions.length}`; $('#quizProgress').max = questions.length; $('#quizProgress').value = current;
      $('#quizQuestion').textContent = question.q; $('#quizFeedback').textContent = '';
      $('#quizNext').hidden = true; $('#quizRestart').hidden = true;
      const root = $('#quizAnswers'); root.replaceChildren(); root.classList.remove('is-ranking');
      if (question.ranking) { renderRanking(); return; }
      const answers = question.id === 'love'
        ? [...shuffle(question.a.filter(answer => answer !== 'Өзімді')), 'Өзімді']
        : shuffle(question.a);
      answers.forEach((answer, index) => {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.answer = answer;
        if (question.id === 'love' && answer === 'Өзімді') {
          button.className = 'secret-answer'; button.setAttribute('aria-label', 'Өзімді');
          const tiny = document.createElement('small'); tiny.textContent = 'өзімді'; button.append(tiny);
        } else {
          const letter = document.createElement('span'); letter.textContent = 'ABCD'[index]; letter.setAttribute('aria-hidden', 'true');
          button.append(letter, document.createTextNode(answer));
        }
        button.addEventListener('click', () => {
          if (answered) return;
          Array.from(root.children).forEach(option => { option.disabled = true; option.dataset.correct = String(option.dataset.answer === question.correct); if (option === button) option.dataset.chosen = 'true'; });
          root.querySelector('.secret-answer')?.classList.add('is-revealed');
          finish(answer === question.correct, answer === question.correct ? question.yes : question.no);
        });
        root.append(button);
      });
    }
    $('#quizNext').addEventListener('click', () => {
      if (!answered) return;
      if (current < questions.length - 1) { current++; render(); $('#quizAnswers button')?.focus({ preventScroll: true }); }
      else {
        $('#quizSheet').hidden = true;
        $('#quizHeading').hidden = true;
        $('#quizCoupon').hidden = false;
        $('#couponScore').textContent = `${score} / ${questions.length} · Бірге ойнағанымызға рақмет ♡`;
        document.body.classList.add('quiz-complete');
        continueWhen(true);
        $('#quizRestart').hidden = false;
        $('#quizCoupon').focus({ preventScroll: true });
        $('#quizCoupon').scrollIntoView({block:'start',behavior:'instant'});
      }
    });
    $('#quizRestart').addEventListener('click', () => { current = 0; score = 0; questions = shuffle(sourceQuestions); render(); $('#quizAnswers button')?.focus({ preventScroll: true }); });
    render();
  }
  if (page === 'letter') {
    $('#openLetter').addEventListener('click', () => {
      const open = $('#openLetter').getAttribute('aria-expanded') !== 'true';
      $('#openLetter').setAttribute('aria-expanded', String(open)); $('#openLetter').classList.toggle('is-open', open);
      $('#letterBody').hidden = !open;
      continueWhen(open);
      $('.envelope-action').textContent = open ? 'Хатты жабу ♡' : 'Хатты ашу ↗';
      if (open) $('#letterBody').focus({ preventScroll: true });
    });
  }
  if (page === 'bouquet') {
    const panel = $('.journey-panel');
    const handle = panel.querySelector('.chapter-heading');
    let finished = false;
    handle.tabIndex = 0;
    handle.setAttribute('aria-label', 'Карточканы сүйреп жылжыту. Пернетақтада бағыттауыштарды басыңыз, ортаға қайтару үшін Home.');
    let x = 0, y = 0, drag = null;
    function movePanel(nextX, nextY) {
      const rect = panel.getBoundingClientRect();
      const left = rect.left - x, top = rect.top - y;
      x = Math.max(44 - rect.width - left, Math.min(window.innerWidth - 44 - left, nextX));
      y = Math.max(-top, Math.min(window.innerHeight - 80 - top, nextY));
      panel.style.setProperty('--bouquet-x', `${x}px`);
      panel.style.setProperty('--bouquet-y', `${y}px`);
    }
    handle.addEventListener('pointerdown', event => {
      if (finished || !event.isPrimary || event.button !== 0) return;
      drag = { id:event.pointerId, x:event.clientX, y:event.clientY, originX:x, originY:y };
      handle.setPointerCapture(event.pointerId);
      panel.classList.add('is-dragging');
      event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (drag?.id === event.pointerId) movePanel(drag.originX + event.clientX - drag.x, drag.originY + event.clientY - drag.y);
    });
    function stopDrag(event) {
      if (drag?.id !== event.pointerId) return;
      drag = null;
      panel.classList.remove('is-dragging');
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    }
    handle.addEventListener('pointerup', stopDrag);
    handle.addEventListener('pointercancel', stopDrag);
    handle.addEventListener('lostpointercapture', stopDrag);
    handle.addEventListener('keydown', event => {
      if (finished) return;
      const delta = { ArrowLeft:[-20,0], ArrowRight:[20,0], ArrowUp:[0,-20], ArrowDown:[0,20] }[event.key];
      if (event.key === 'Home') { event.preventDefault(); movePanel(0,0); }
      else if (delta) { event.preventDefault(); movePanel(x + delta[0], y + delta[1]); }
    });
    window.addEventListener('resize', () => movePanel(x,y));
    let picked = [];
    function render() {
      $('#bouquetCount').textContent = picked.length;
      continueWhen(finished);
      $('#bouquetEmpty').hidden = picked.length > 0;
      $('#bouquetWish').textContent = picked.length ? 'Тағы да қоса беріңіз. Дайын болғанда, гүл шоғыңызды ашыңыз ♡' : 'Ұнаған гүлдеріңізді жинаңыз — саны шектеусіз.';
      $('#resetBouquet').disabled = picked.length === 0;
      $('#finishBouquet').disabled = picked.length === 0;
      window.dispatchEvent(new CustomEvent('bouquet:update', { detail: { kinds: picked } }));
    }
    function setFinished(value) {
      finished = value;
      document.body.classList.toggle('bouquet-finished', value);
      $('#bouquetButterflies').hidden = !value;
      $('#bouquetCanvas').tabIndex = value ? 0 : -1;
      $('#addMoreFlowers').hidden = !value;
      handle.tabIndex = value ? -1 : 0;
      if(value)handle.removeAttribute('aria-label');
      else handle.setAttribute('aria-label','Карточканы сүйреп жылжыту. Пернетақтада бағыттауыштарды басыңыз, ортаға қайтару үшін Home.');
      $('#bouquetHeading').innerHTML = value ? 'Өзіңіз жинаған.<br><em>Сізге арналған.</em>' : 'Өзіңізге гүл жинаңыз.<br><em>Қалағаныңызша.</em>';
      $('.chapter-description').textContent = value ? `${picked.length} гүл, бір ерекше гүл шоғы ♡` : 'Алқаптағы ұнаған гүлдеріңізді басыңыз. Әрқайсысы — сіз үшін.';
      x = 0; y = 0;
      panel.style.setProperty('--bouquet-x','0px');panel.style.setProperty('--bouquet-y','0px');
      continueWhen(value);
      // Resize the live canvas after the gift changes from a miniature to a close-up.
      window.dispatchEvent(new Event('resize'));
      (value ? $('#bouquetCanvas') : $('#finishBouquet')).focus({preventScroll:true});
      panel.scrollIntoView({block:'start',behavior:'instant'});
    }
    function pick(kind) {
      if (finished || !Number.isInteger(kind) || kind < 0 || kind > 7) return;
      picked.push(kind); render();
      const display=$('#bouquetDisplay');display.classList.remove('is-picking');
      void display.offsetWidth;display.classList.add('is-picking');
    }
    window.addEventListener('meadow:flower', event => pick(event.detail.kind));
    $('#finishBouquet').addEventListener('click', () => { if(picked.length)setFinished(true); });
    $('#addMoreFlowers').addEventListener('click', () => setFinished(false));
    document.querySelectorAll('.bouquet-butterfly').forEach(button=>{
      button.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('meadow:butterfly',{detail:{trigger:button}})));
    });
    $('#resetBouquet').addEventListener('click', () => { picked = []; render(); });
    render();
  }
  if (page === 'date') {
    const plans = {
      coffee: ['Кофе мен жылы әңгіме', 'Сүйікті сусынымызды алып, асықпай сөйлесейік.'],
      cinema: ['Бірге киноға барайық', 'Фильмді бірге таңдаймыз. Попкорнды да бөлісеміз.'],
      walk: ['Асықпай серуендейік', 'Таза ауа, жай қадам және айтылмай қалған әңгімелер.'],
      picnic: ['Кішкентай пикник', 'Жеміс-жидек, жұмсақ көрпе және жақсы көңіл күй.'],
    };
    const editions = {
      coffee: { label:'ЖЫЛЫ ӘҢГІМЕЛЕР КЛУБЫ', code:'001', paper:'#fff3e6', ink:'#885c50', accent:'#bd7190', soft:'#efd5c8' },
      cinema: { label:'ЕКЕУМІЗГЕ АРНАЛҒАН СЕАНС', code:'002', paper:'#f8edf8', ink:'#76516f', accent:'#a8619a', soft:'#dfc7e4' },
      walk: { label:'АСЫҚПАЙТЫН КҮНГЕ РҰҚСАТ', code:'003', paper:'#f2f6e8', ink:'#5e7258', accent:'#a46585', soft:'#d2dfbd' },
      picnic: { label:'АШЫҚ АСПАН АСТЫНДА', code:'004', paper:'#fff2ef', ink:'#8f5d66', accent:'#c16c87', soft:'#f0cdd2' },
    };
    const ticket = $('#dateTicket');
    function ticketIllustration(key) {
      const art = document.querySelector(`[data-date="${key}"] .date-art`).cloneNode(true);
      // The ticket has its own gradient IDs so both illustrations can animate independently.
      art.querySelectorAll('[id]').forEach(element => { element.id = `ticket-${element.id}`; });
      art.querySelectorAll('[fill],[stroke]').forEach(element => {
        for (const attribute of ['fill','stroke']) {
          const value = element.getAttribute(attribute);
          if (value?.startsWith('url(#')) element.setAttribute(attribute, value.replace('url(#','url(#ticket-'));
        }
      });
      return art;
    }
    let selected = null;
    function choose(key) {
      if (!Object.hasOwn(plans, key)) return; selected = key;
      continueWhen(true);
      document.querySelectorAll('[data-date]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.date === key)));
      $('#ticketTitle').textContent = plans[key][0]; $('#ticketDetail').textContent = plans[key][1];
      const edition = editions[key];
      ticket.dataset.plan = key;
      $('#ticketEdition').textContent = edition.label;
      $('#ticketSerial').textContent = `NO. ${edition.code}`;
      $('#ticketArt').replaceChildren(ticketIllustration(key));
      ticket.classList.remove('is-issued');
      ticket.hidden = false; $('#downloadTicket').hidden = false;
      void ticket.offsetWidth;
      ticket.classList.add('is-issued');
      $('#dateStatus').textContent = save('date', key) ? 'Таңдауыңыз осы құрылғыда сақталды. Шақыруды жүктеп, өзіңіз бөлісе аласыз.' : 'Таңдауыңыз дайын. Шақыруды жүктеп ала аласыз.';
    }
    document.querySelectorAll('[data-date]').forEach(button => button.addEventListener('click', () => choose(button.dataset.date)));
    const stored = read('date', null); if (typeof stored === 'string' && Object.hasOwn(plans, stored)) choose(stored);
    $('#downloadTicket').addEventListener('click', () => {
      if (!selected) return;
      const theme = editions[selected];
      const art = ticketIllustration(selected);
      art.setAttribute('x','763'); art.setAttribute('y','119'); art.setAttribute('width','190'); art.setAttribute('height','175');
      const escape = value => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));
      const lines = []; let line = '';
      for (const word of plans[selected][1].split(' ')) {
        if ((line+' '+word).trim().length > 44) { lines.push(line); line = word; } else line = (line+' '+word).trim();
      }
      if (line) lines.push(line);
      const bars = Array.from({length:35},(_,i)=>`<rect x="${83+i*4}" y="443" width="${i%3===0?3:1}" height="24"/>`).join('');
      const pattern = selected==='picnic' ? `<pattern id="ticket-pattern" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 0H24V12H0Z M0 12H12V24H0Z" fill="${theme.soft}" opacity=".45"/></pattern>` : `<pattern id="ticket-pattern" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="${theme.accent}" opacity=".15"/></pattern>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="540" viewBox="0 0 1000 540"><defs>${pattern}<linearGradient id="ticket-foil"><stop stop-color="${theme.accent}"/><stop offset=".5" stop-color="#fff4cd"/><stop offset="1" stop-color="${theme.soft}"/></linearGradient><mask id="ticket-cut"><rect x="35" y="35" width="930" height="470" rx="25" fill="white"/><circle cx="745" cy="35" r="14" fill="black"/><circle cx="745" cy="505" r="14" fill="black"/></mask></defs><rect width="1000" height="540" rx="30" fill="#f7e5ed"/><g mask="url(#ticket-cut)"><rect x="35" y="35" width="930" height="470" fill="${theme.paper}"/><rect x="745" y="35" width="220" height="470" fill="${theme.soft}"/><rect x="35" y="35" width="930" height="470" fill="url(#ticket-pattern)"/><rect x="35" y="35" width="930" height="7" fill="url(#ticket-foil)"/><path d="M745 50V490" stroke="${theme.accent}" opacity=".45" stroke-width="2" stroke-dasharray="5 7"/></g><g fill="${theme.ink}" font-family="Georgia,serif"><text x="83" y="92" font-size="15" letter-spacing="2">${theme.label}</text><text x="650" y="92" font-size="12">NO. ${theme.code}</text><text x="83" y="151" font-size="18" font-style="italic">Екі адамға арналған шақыру</text><text x="83" y="213" font-size="37">${escape(plans[selected][0])}</text>${lines.map((text,i)=>`<text x="83" y="${265+i*29}" font-size="21">${escape(text)}</text>`).join('')}<text x="83" y="365" font-size="12" letter-spacing="2">КҮНІ МЕН УАҚЫТЫ</text><text x="83" y="399" font-size="23">Бірге келісеміз ♡</text><g transform="rotate(-12 600 395)" fill="${theme.accent}"><ellipse cx="600" cy="395" rx="77" ry="32" fill="none" stroke="${theme.accent}" stroke-width="2"/><ellipse cx="600" cy="395" rx="71" ry="26" fill="none" stroke="${theme.accent}" opacity=".4"/><text x="548" y="405" font-size="29" font-style="italic">бірге ♡</text></g><g opacity=".5">${bars}</g><text x="855" y="95" text-anchor="middle" font-size="14" letter-spacing="2">СІЗ + МЕН</text><text x="855" y="367" text-anchor="middle" font-size="67">02</text><text x="855" y="400" text-anchor="middle" font-size="18">адамға</text><text x="855" y="455" text-anchor="middle" font-size="24">♡ ♡</text></g>${art.outerHTML}</svg>`;
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `shakyru-${selected}.svg`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
})();
