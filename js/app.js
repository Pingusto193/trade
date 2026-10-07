/* Navegação, progresso da trilha, copiloto (com janela flutuante), teste, glossário e plano escrito. */
(function (global) {
  'use strict';

  var DT = global.DT;
  var f = DT.fmt;
  var esc = DT.escapar;
  var doc = global.document;

  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }

  /* ---------- Navegação por âncora ---------- */
  var secoes = $$('[data-pagina]');
  var nomes = secoes.map(function (s) { return s.dataset.pagina; });
  var trilha = $('#trilha');
  var botaoMenu = $('#botao-menu');
  var veu = null;
  var TITULO = 'Day Trade às Claras';

  function fecharMenu() {
    trilha.classList.remove('aberta');
    botaoMenu.setAttribute('aria-expanded', 'false');
    if (veu) { veu.remove(); veu = null; }
  }
  function abrirMenu() {
    trilha.classList.add('aberta');
    botaoMenu.setAttribute('aria-expanded', 'true');
    veu = doc.createElement('div');
    veu.className = 'veu';
    veu.addEventListener('click', fecharMenu);
    doc.body.appendChild(veu);
  }
  botaoMenu.addEventListener('click', function () {
    if (trilha.classList.contains('aberta')) fecharMenu(); else abrirMenu();
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharMenu(); });

  function paginaAtual() {
    var h = (global.location.hash || '').replace('#', '');
    return nomes.indexOf(h) >= 0 ? h : 'inicio';
  }

  function mostrar(focar) {
    var atual = paginaAtual();
    secoes.forEach(function (s) { s.hidden = s.dataset.pagina !== atual; });
    $$('a', trilha).forEach(function (a) {
      if (a.getAttribute('href') === '#' + atual) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    fecharMenu();
    var h1 = $('[data-pagina="' + atual + '"] h1');
    doc.title = atual === 'inicio' || !h1 ? TITULO : h1.textContent + ' · ' + TITULO;
    global.scrollTo(0, 0);
    if (focar) $('#conteudo').focus({ preventScroll: true });
    try { global.dispatchEvent(new CustomEvent('dt:pagina', { detail: atual })); } catch (e) { /* ignora */ }
  }
  global.addEventListener('hashchange', function () { mostrar(true); });
  DT.paginaAtual = paginaAtual;

  /* ---------- Progresso da trilha ---------- */
  var MODULOS = ['realidade', 'fundamentos', 'ordens', 'grafico', 'setups', 'risco', 'mente', 'custos', 'plano', 'alternativas'];

  function progresso() { return DT.store.ler(DT.CHAVES.progresso, {}) || {}; }
  function renderProgresso() {
    var p = progresso();
    var feitos = MODULOS.filter(function (m) { return p[m]; }).length;
    $('#progresso-texto').textContent = feitos + ' de ' + MODULOS.length + ' módulos concluídos';
    $('#progresso-barra').style.width = (feitos / MODULOS.length * 100) + '%';
    $$('[data-ok]').forEach(function (el) { el.textContent = p[el.dataset.ok] ? '✓' : ''; });
    $$('[data-concluir]').forEach(function (b) {
      var feito = !!p[b.dataset.concluir];
      b.textContent = feito ? 'Concluído ✓' : 'Marcar como concluído';
      b.setAttribute('aria-pressed', feito ? 'true' : 'false');
      b.classList.toggle('botao-sec', feito);
    });
  }
  $$('[data-concluir]').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = progresso();
      p[b.dataset.concluir] = !p[b.dataset.concluir];
      DT.store.gravar(DT.CHAVES.progresso, p);
      renderProgresso();
    });
  });

  /* ---------- Copiloto e janela flutuante ---------- */
  var raiz = $('#copiloto-raiz');
  var slot = $('#copiloto-slot');
  var ausente = $('#copiloto-ausente');
  DT.assistente.montar(raiz, { prefixo: 'cop-site' });
  var pipJanela = null;

  function copiarEstilos(destino) {
    Array.prototype.forEach.call(doc.styleSheets, function (ss) {
      try {
        var css = Array.prototype.map.call(ss.cssRules, function (r) { return r.cssText; }).join('\n');
        var st = destino.document.createElement('style');
        st.textContent = css;
        destino.document.head.appendChild(st);
      } catch (e) {
        if (ss.href) {
          var l = destino.document.createElement('link');
          l.rel = 'stylesheet';
          l.href = ss.href;
          destino.document.head.appendChild(l);
        }
      }
    });
  }

  function avisoFlutuante(txt) {
    var fb = $('#flutuante-feedback');
    fb.textContent = txt;
    fb.className = 'feedback erro';
  }

  function abrirFlutuante() {
    if (pipJanela) { try { pipJanela.focus(); } catch (e) { /* ignora */ } return; }
    var api = global.documentPictureInPicture;
    if (!api || typeof api.requestWindow !== 'function') {
      global.location.hash = '#copiloto';
      avisoFlutuante('Este navegador não abre janela flutuante. Use "Abrir em janela" ou a extensão do Chrome.');
      return;
    }
    api.requestWindow({ width: 400, height: 740 }).then(function (pip) {
      copiarEstilos(pip);
      pip.document.title = 'Copiloto de Risco';
      pip.document.documentElement.lang = 'pt-BR';
      var tema = doc.documentElement.getAttribute('data-theme');
      if (tema) pip.document.documentElement.setAttribute('data-theme', tema);
      pip.document.body.className = 'pip-corpo';
      pip.document.body.appendChild(raiz);
      ausente.hidden = false;
      pipJanela = pip;
      pip.addEventListener('pagehide', function () {
        slot.insertBefore(raiz, ausente);
        ausente.hidden = true;
        pipJanela = null;
      });
    }).catch(function () {
      global.location.hash = '#copiloto';
      avisoFlutuante('O navegador não permitiu a janela flutuante nesta página. Use "Abrir em janela" ou a extensão.');
    });
  }
  $('#abrir-flutuante').addEventListener('click', abrirFlutuante);
  $('#botao-copiloto').addEventListener('click', abrirFlutuante);
  $('#abrir-janela').addEventListener('click', function (e) {
    var w = null;
    try { w = global.open('assistente/index.html', 'dt-copiloto', 'popup,width=420,height=780'); } catch (err) { w = null; }
    if (w) e.preventDefault();
  });

  /* ---------- Teste de conhecimento ---------- */
  var quizForm = $('#quiz');
  function respostas() { return DT.store.ler(DT.CHAVES.quiz, {}) || {}; }
  function renderQuiz() {
    var r = respostas();
    quizForm.innerHTML = DT.QUIZ.map(function (q, i) {
      var feita = r[i] != null;
      var ops = q.o.map(function (o, j) {
        var cls = feita ? (j === q.c ? 'certa' : (j === r[i] ? 'errada' : '')) : '';
        return '<label class="' + cls + '"><input type="radio" id="q' + i + '-' + j + '" name="q' + i + '" value="' + j + '"' + (feita && r[i] === j ? ' checked' : '') + (feita ? ' disabled' : '') + '><span>' + esc(o) + '</span></label>';
      }).join('');
      return '<div class="pergunta"><fieldset><legend>' + (i + 1) + '. ' + esc(q.p) + '</legend>' + ops + '</fieldset>' +
        (feita ? '<p class="explicacao"><strong>' + (r[i] === q.c ? 'Certo.' : 'Errado.') + '</strong> ' + esc(q.e) + '</p>' : '') + '</div>';
    }).join('');
    var feitas = Object.keys(r).length;
    var certas = Object.keys(r).filter(function (k) { return DT.QUIZ[k] && r[k] === DT.QUIZ[k].c; }).length;
    $('#quiz-placar').textContent = feitas
      ? 'Você respondeu ' + feitas + ' de ' + DT.QUIZ.length + ' e acertou ' + certas + '.' + (feitas === DT.QUIZ.length ? (certas >= 13 ? ' Bom domínio dos fundamentos.' : ' Revise os módulos de risco e custos antes de operar.') : '')
      : 'Nenhuma resposta ainda.';
  }
  quizForm.addEventListener('change', function (e) {
    var m = /^q(\d+)$/.exec(e.target.name || '');
    if (!m) return;
    var r = respostas();
    r[m[1]] = Number(e.target.value);
    DT.store.gravar(DT.CHAVES.quiz, r);
    var y = global.scrollY;
    renderQuiz();
    global.scrollTo(0, y);
  });
  $('#quiz-reiniciar').addEventListener('click', function () {
    DT.store.gravar(DT.CHAVES.quiz, {});
    renderQuiz();
  });

  /* ---------- Glossário ---------- */
  function normalizar(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var glossLista = $('#glossario-lista');
  glossLista.innerHTML = DT.GLOSSARIO.slice().sort(function (a, b) { return a[0].localeCompare(b[0], 'pt-BR'); }).map(function (t) {
    return '<div data-busca="' + esc(normalizar(t[0] + ' ' + t[1])) + '"><dt>' + esc(t[0]) + '</dt><dd>' + esc(t[1]) + '</dd></div>';
  }).join('');
  $('#glossario-busca').addEventListener('input', function (e) {
    var q = normalizar(e.target.value.trim());
    var n = 0;
    $$('[data-busca]', glossLista).forEach(function (d) {
      var ok = !q || d.dataset.busca.indexOf(q) >= 0;
      d.hidden = !ok;
      if (ok) n++;
    });
    $('#glossario-vazio').hidden = n > 0;
  });

  /* ---------- Plano escrito ---------- */
  var CHAVE_PLANO = 'dt.planoescrito.v1';
  var camposPlano = [
    ['pl-porque', 'Por que e o que é sucesso'], ['pl-capital', 'Capital de risco'], ['pl-mercado', 'Mercado e horário'],
    ['pl-setups', 'Setups'], ['pl-risco', 'Limites de risco'], ['pl-rotina', 'Rotina'], ['pl-parar', 'Critérios para parar']
  ];
  var plano = DT.store.ler(CHAVE_PLANO, {}) || {};
  camposPlano.forEach(function (c) {
    var el = $('#' + c[0]);
    el.value = plano[c[0]] || '';
    el.addEventListener('input', function () {
      plano[c[0]] = el.value;
      DT.store.gravar(CHAVE_PLANO, plano);
    });
  });

  DT.copiarTexto = function (texto, feedbackEl, reserva) {
    function ok() { if (feedbackEl) { feedbackEl.textContent = 'Copiado.'; feedbackEl.className = feedbackEl.className.replace(' erro', ''); } }
    function falha() {
      if (reserva) {
        reserva.hidden = false;
        reserva.value = texto;
        reserva.focus();
        reserva.select();
      }
      if (feedbackEl) {
        feedbackEl.textContent = reserva ? 'Não consegui copiar sozinho. O texto está selecionado: use Ctrl+C.' : 'Não consegui copiar.';
        if (feedbackEl.className.indexOf('erro') < 0) feedbackEl.className += ' erro';
      }
    }
    try {
      if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
        global.navigator.clipboard.writeText(texto).then(ok, falha);
        return;
      }
    } catch (e) { /* cai na reserva */ }
    falha();
  };

  var reservaPlano = doc.createElement('textarea');
  reservaPlano.hidden = true;
  reservaPlano.rows = 6;
  reservaPlano.setAttribute('aria-label', 'Plano em texto para copiar');
  reservaPlano.style.width = '100%';
  $('#form-plano-escrito').appendChild(reservaPlano);

  $('#pl-copiar').addEventListener('click', function () {
    var txt = 'MEU PLANO DE TRADING (' + f.dataBR(f.hoje()) + ')\n\n' + camposPlano.map(function (c) {
      return c[1].toUpperCase() + '\n' + ($('#' + c[0]).value.trim() || '(em branco)');
    }).join('\n\n');
    DT.copiarTexto(txt, $('#pl-feedback'), reservaPlano);
  });
  var limparPendente = false;
  $('#pl-limpar').addEventListener('click', function () {
    var fb = $('#pl-feedback');
    if (!limparPendente) {
      limparPendente = true;
      this.textContent = 'Clique de novo para apagar';
      fb.textContent = '';
      return;
    }
    limparPendente = false;
    this.textContent = 'Limpar formulário';
    camposPlano.forEach(function (c) { $('#' + c[0]).value = ''; });
    plano = {};
    DT.store.gravar(CHAVE_PLANO, plano);
    fb.textContent = 'Formulário limpo.';
  });

  /* ---------- Treino de gráfico ---------- */
  var CHAVE_TREINO = 'dt.treino.v1';
  function respostasTreino() { return DT.store.ler(CHAVE_TREINO, {}) || {}; }
  function renderTreino() {
    var r = respostasTreino();
    var exercicios = $$('.exercicio');
    var feitos = 0, certos = 0;
    exercicios.forEach(function (ex) {
      var id = ex.dataset.exercicio, certa = ex.dataset.certa, escolha = r[id];
      $$('.ex-opcao', ex).forEach(function (b) {
        b.classList.remove('certa', 'errada');
        b.disabled = !!escolha;
        if (escolha && b.dataset.op === certa) b.classList.add('certa');
        else if (escolha && b.dataset.op === escolha) b.classList.add('errada');
      });
      var explica = $('.ex-explica', ex);
      if (!explica) return;
      var veredito = $('.ex-veredito', explica);
      if (!veredito) {
        veredito = doc.createElement('span');
        veredito.className = 'ex-veredito';
        explica.insertBefore(veredito, explica.firstChild);
      }
      explica.hidden = !escolha;
      if (escolha) {
        feitos++;
        if (escolha === certa) certos++;
        veredito.textContent = escolha === certa ? 'Acertou.' : 'Não foi dessa vez.';
        veredito.className = 'ex-veredito ' + (escolha === certa ? 'acertou' : 'errou');
      }
    });
    var placar = $('#treino-placar');
    if (placar) {
      placar.textContent = feitos
        ? 'Você fez ' + feitos + ' de ' + exercicios.length + ' e acertou ' + certos + '.' + (feitos === exercicios.length ? (certos >= 8 ? ' Ótimo olho. Agora treine no simulador.' : ' Releia o guia direto e tente de novo amanhã.') : '')
        : 'Nenhum exercício feito ainda.';
    }
    var ok = $('[data-ok-treino]');
    if (ok) ok.textContent = feitos === exercicios.length && exercicios.length ? '✓' : '';
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('.ex-opcao');
    if (!b || b.disabled) return;
    var ex = b.closest('.exercicio');
    var r = respostasTreino();
    r[ex.dataset.exercicio] = b.dataset.op;
    DT.store.gravar(CHAVE_TREINO, r);
    renderTreino();
  });
  var reiniciarTreino = $('#treino-reiniciar');
  if (reiniciarTreino) reiniciarTreino.addEventListener('click', function () {
    DT.store.gravar(CHAVE_TREINO, {});
    renderTreino();
    global.scrollTo(0, 0);
  });

  /* ---------- Figuras no celular: ampliar e mostrar o fim do gráfico ---------- */
  var celular = global.matchMedia ? global.matchMedia('(max-width: 580px)') : { matches: false };

  function ampliar(diagrama) {
    var svg = diagrama.querySelector('svg');
    if (!svg) return;
    var origem = doc.activeElement;
    var ov = doc.createElement('div');
    ov.className = 'ampliado';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', svg.getAttribute('aria-label') || 'Figura ampliada');
    var giro = doc.createElement('div');
    giro.className = 'giro';
    var copia = svg.cloneNode(true);
    /* sem ids repetidos: as setas continuam usando os marcadores da figura original */
    Array.prototype.forEach.call(copia.querySelectorAll('[id]'), function (el) { el.removeAttribute('id'); });
    giro.appendChild(copia);
    var fechar = doc.createElement('button');
    fechar.type = 'button';
    fechar.className = 'botao fechar-ampliado';
    fechar.textContent = 'Fechar';
    var dica = doc.createElement('p');
    dica.className = 'dica-giro';
    dica.textContent = 'Gire o celular para ler';
    ov.appendChild(giro);
    ov.appendChild(dica);
    ov.appendChild(fechar);
    doc.body.appendChild(ov);
    doc.body.style.overflow = 'hidden';
    function sair() {
      ov.remove();
      doc.body.style.overflow = '';
      doc.removeEventListener('keydown', teclado);
      if (origem && origem.focus) origem.focus({ preventScroll: true });
    }
    function teclado(e) { if (e.key === 'Escape') sair(); }
    fechar.addEventListener('click', sair);
    ov.addEventListener('click', function (e) { if (e.target !== fechar) sair(); });
    doc.addEventListener('keydown', teclado);
    fechar.focus();
  }
  doc.addEventListener('click', function (e) {
    if (!celular.matches || e.target.closest('.ampliado')) return;
    var d = e.target.closest('.diagrama');
    if (d) ampliar(d);
  });

  /* nos exercícios, o que decide a resposta está nos candles mais recentes, à direita */
  function mostrarFimDosGraficos() {
    if (!celular.matches) return;
    global.requestAnimationFrame(function () {
      $$('[data-pagina="treino"] .exercicio .diagrama').forEach(function (d) { d.scrollLeft = d.scrollWidth; });
    });
  }
  global.addEventListener('dt:pagina', function (e) { if (e.detail === 'treino') mostrarFimDosGraficos(); });

  /* ---------- Início ---------- */
  renderTreino();
  renderProgresso();
  renderQuiz();
  mostrar(false);
})(window);
