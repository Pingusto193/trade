/* Copiloto de risco: painel compacto para usar ao lado da plataforma da corretora.
   Não dá sinais de compra ou venda. Faz quatro coisas: mede o risco antes do trade,
   confere o checklist, registra o resultado e trava quando o plano diz "pare". */
(function (global) {
  'use strict';

  var DT = global.DT;
  var f = DT.fmt;
  var esc = DT.escapar;

  var CHECKLIST = [
    'O setup apareceu exatamente como está escrito no meu plano.',
    'Stop e alvo estão definidos antes da entrada, e não vou afastar o stop.',
    'A quantidade veio da calculadora e cabe no meu risco por trade.',
    'O ganho/risco líquido é de pelo menos 1,5 (ou meu histórico de 100+ trades justifica outro número).',
    'Conferi a agenda econômica: nenhuma divulgação de alto impacto nos próximos 10 minutos.',
    'Não estou entrando para recuperar uma perda anterior.'
  ];
  var EMOCOES = [[1, 'Tenso'], [2, 'Ansioso'], [3, 'Neutro'], [4, 'Calmo'], [5, 'Focado']];
  var FRASE = 'QUEBRAR MEU PLANO';

  /* ---------- Sessão do dia ---------- */
  function sessao() {
    var hoje = f.hoje();
    var s = DT.store.ler(DT.CHAVES.sessao, null);
    if (!s || s.data !== hoje) {
      s = { data: hoje, inicio: Date.now(), ultimaPausa: Date.now(), overrideAte: 0, overrides: 0, checklist: [], emocao: 0 };
      DT.store.gravar(DT.CHAVES.sessao, s);
    }
    return s;
  }
  function salvarSessao(s) { DT.store.gravar(DT.CHAVES.sessao, s); }

  function status(cfg, agora) {
    cfg = cfg || DT.config();
    agora = agora || Date.now();
    var s = sessao();
    var trades = DT.diario.doDia();
    var pnl = trades.reduce(function (a, t) { return a + DT.diario.liquido(t); }, 0);
    var limite = cfg.capital * cfg.stopDiarioPct / 100;
    var meta = cfg.metaDiariaPct > 0 ? cfg.capital * cfg.metaDiariaPct / 100 : 0;
    var restante = Math.max(0, limite + pnl);
    var riscoTrade = cfg.capital * cfg.riscoPct / 100;
    var seq = 0, ultimaPerda = 0;
    for (var i = trades.length - 1; i >= 0; i--) {
      if (DT.diario.liquido(trades[i]) < 0) {
        seq++;
        if (!ultimaPerda) ultimaPerda = DT.diario.carimbo(trades[i]);
      } else break;
    }
    var r = {
      pnl: pnl, limite: limite, restante: restante, riscoTrade: riscoTrade,
      riscoMax: Math.max(0, Math.min(riscoTrade, restante)),
      n: trades.length, seq: seq, trades: trades, meta: meta, sessao: s,
      estado: 'ok', titulo: 'LIBERADO', motivo: 'Dentro do plano. Só entre no seu setup.', bloqueia: false, fimPausa: 0
    };
    var hm = f.hora(new Date(agora));
    function set(estado, titulo, motivo, bloqueia) { r.estado = estado; r.titulo = titulo; r.motivo = motivo; r.bloqueia = bloqueia; }

    if (limite > 0 && pnl <= -limite + 0.005) {
      set('pare', 'PARE', 'Stop diário atingido (' + f.brlSinal(pnl) + '). O dia acabou.', true);
    } else if (cfg.maxTrades > 0 && trades.length >= cfg.maxTrades) {
      set('pare', 'PARE', 'Limite de ' + cfg.maxTrades + ' trades no dia atingido.', true);
    } else if (cfg.horaLimite && hm >= cfg.horaLimite) {
      set('pare', 'PARE', 'Passou do seu horário limite (' + cfg.horaLimite + ').', true);
    } else if (cfg.maxPerdasSeguidas > 0 && seq >= cfg.maxPerdasSeguidas && agora < ultimaPerda + cfg.pausaMin * 60000) {
      set('pausa', 'PAUSA', seq + ' perdas seguidas. Pausa obrigatória antes do próximo trade.', true);
      r.fimPausa = ultimaPerda + cfg.pausaMin * 60000;
    } else if (meta > 0 && pnl >= meta) {
      set('atencao', 'META ATINGIDA', 'Seu plano manda encerrar o dia com ' + f.brlSinal(pnl) + '.', false);
    } else if (limite > 0 && pnl <= -limite / 2) {
      set('atencao', 'ATENÇÃO', 'Metade do stop diário já foi. Reduza a mão ou encerre.', false);
    } else if (cfg.maxPerdasSeguidas > 1 && seq > 0 && seq === cfg.maxPerdasSeguidas - 1) {
      set('atencao', 'ATENÇÃO', 'Mais uma perda e você entra em pausa obrigatória.', false);
    }
    if (r.bloqueia && s.overrideAte > agora) {
      r.motivoOriginal = r.motivo;
      set('quebrado', 'FORA DO PLANO', 'Desbloqueio manual até ' + f.hora(new Date(s.overrideAte)) + '. ' + r.motivo, false);
    }
    if (r.bloqueia) r.riscoMax = 0;
    return r;
  }

  /* ---------- Componente ---------- */
  function opcoesAtivo(sel) {
    return Object.keys(DT.ATIVOS).map(function (k) {
      return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(DT.ATIVOS[k].nome) + '</option>';
    }).join('');
  }

  function template(p) {
    var checks = CHECKLIST.map(function (txt, i) {
      return '<li><label><input type="checkbox" id="' + p + '-ck' + i + '" data-ck="' + i + '"><span>' + esc(txt) + '</span></label></li>';
    }).join('');
    var emo = EMOCOES.map(function (e) {
      return '<label><input type="radio" name="' + p + '-emo" id="' + p + '-emo' + e[0] + '" value="' + e[0] + '"><b>' + e[0] + '</b>' + e[1] + '</label>';
    }).join('');
    return '' +
      '<div class="dta-status" data-estado="ok" role="status" aria-live="polite">' +
      '  <span class="dta-luz" aria-hidden="true"></span><strong class="dta-status-titulo">LIBERADO</strong>' +
      '  <span class="dta-status-motivo"></span>' +
      '</div>' +
      '<div class="dta-placar">' +
      '  <div><span class="dta-rotulo">Resultado hoje</span><b data-v="pnl">R$ 0,00</b></div>' +
      '  <div><span class="dta-rotulo">Trades</span><b data-v="n">0</b></div>' +
      '  <div><span class="dta-rotulo">Até o stop</span><b data-v="restante">—</b></div>' +
      '</div>' +
      '<div class="dta-medidor" aria-hidden="true"><span></span></div>' +
      '<p class="dta-medidor-legenda" data-v="legenda"></p>' +
      '<div class="dta-lembrete" data-v="lembrete" hidden><span>Você está há muito tempo na tela. Levante, beba água, 3 minutos longe do gráfico.</span><button type="button" data-acao="pausa-feita">Fiz a pausa</button></div>' +

      '<div class="dta-abas" role="tablist">' +
      '  <button type="button" role="tab" data-aba="posicao" aria-selected="true">Posição</button>' +
      '  <button type="button" role="tab" data-aba="checklist" aria-selected="false">Checklist</button>' +
      '  <button type="button" role="tab" data-aba="registrar" aria-selected="false">Registrar</button>' +
      '  <button type="button" role="tab" data-aba="plano" aria-selected="false">Meu plano</button>' +
      '</div>' +

      /* Posição */
      '<section class="dta-painel" data-painel="posicao" role="tabpanel">' +
      '  <div class="dta-grade">' +
      '    <label class="dta-campo dta-campo-largo"><span>Ativo</span><select id="' + p + '-tipo" data-c="tipo">' + opcoesAtivo('win') + '</select></label>' +
      '    <label class="dta-campo dta-campo-largo" data-so-outro hidden><span>Valor de 1 ponto por unidade (R$)</span><input id="' + p + '-vp" data-c="vp" type="number" step="any" inputmode="decimal" value="1"></label>' +
      '    <label class="dta-campo"><span>Entrada</span><input id="' + p + '-entrada" data-c="entrada" type="number" step="any" inputmode="decimal" value="140000"></label>' +
      '    <label class="dta-campo"><span>Stop</span><input id="' + p + '-stop" data-c="stop" type="number" step="any" inputmode="decimal" value="139850"></label>' +
      '    <label class="dta-campo"><span>Alvo</span><input id="' + p + '-alvo" data-c="alvo" type="number" step="any" inputmode="decimal" value="140300"></label>' +
      '    <label class="dta-campo"><span>Risco máx. (R$)</span><input id="' + p + '-risco" data-c="risco" type="number" step="any" inputmode="decimal" placeholder="do plano"></label>' +
      '  </div>' +
      '  <p class="dta-nota" data-v="exemplo">Valores de exemplo. Troque pelos preços da sua tela.</p>' +
      '  <dl class="dta-resultado" data-v="pos-res"></dl>' +
      '  <ul class="dta-avisos" data-v="pos-avisos"></ul>' +
      '  <button type="button" class="dta-botao dta-botao-sec" data-acao="levar">Levar para o registro</button>' +
      '</section>' +

      /* Checklist */
      '<section class="dta-painel" data-painel="checklist" role="tabpanel" hidden>' +
      '  <ul class="dta-check">' + checks + '</ul>' +
      '  <p class="dta-titulo-sec">Como você está agora?</p>' +
      '  <div class="dta-emocao" role="radiogroup" aria-label="Estado emocional">' + emo + '</div>' +
      '  <div class="dta-veredito" data-v="veredito" data-ok="nao">Não entre.</div>' +
      '  <button type="button" class="dta-botao dta-botao-sec" data-acao="limpar-check">Limpar checklist</button>' +
      '</section>' +

      /* Registrar */
      '<section class="dta-painel" data-painel="registrar" role="tabpanel" hidden>' +
      '  <form class="dta-grade" data-v="form-reg" novalidate>' +
      '    <label class="dta-campo"><span>Ativo</span><select id="' + p + '-r-tipo" data-r="tipo">' + opcoesAtivo('win') + '</select></label>' +
      '    <label class="dta-campo"><span>Código</span><input id="' + p + '-r-ativo" data-r="ativo" type="text" placeholder="ex.: WINZ26" autocomplete="off"></label>' +
      '    <label class="dta-campo dta-campo-largo" data-so-outro-r hidden><span>Valor de 1 ponto por unidade (R$)</span><input id="' + p + '-r-vp" data-r="vp" type="number" step="any" value="1"></label>' +
      '    <div class="dta-campo dta-campo-largo"><span>Lado</span><div class="dta-segmento">' +
      '      <label>Compra<input type="radio" name="' + p + '-r-lado" id="' + p + '-r-compra" value="compra" checked></label>' +
      '      <label class="venda">Venda<input type="radio" name="' + p + '-r-lado" id="' + p + '-r-venda" value="venda"></label>' +
      '    </div></div>' +
      '    <label class="dta-campo"><span>Quantidade</span><input id="' + p + '-r-qtd" data-r="qtd" type="number" min="0" step="1" value="1"></label>' +
      '    <label class="dta-campo"><span>Entrada</span><input id="' + p + '-r-entrada" data-r="entrada" type="number" step="any" inputmode="decimal"></label>' +
      '    <label class="dta-campo"><span>Saída</span><input id="' + p + '-r-saida" data-r="saida" type="number" step="any" inputmode="decimal"></label>' +
      '    <label class="dta-campo"><span>Resultado bruto (R$)</span><input id="' + p + '-r-bruto" data-r="bruto" type="number" step="any" inputmode="decimal"></label>' +
      '    <label class="dta-campo"><span>Custos (R$)</span><input id="' + p + '-r-custos" data-r="custos" type="number" step="any" inputmode="decimal"></label>' +
      '    <label class="dta-campo"><span>Setup</span><input id="' + p + '-r-setup" data-r="setup" type="text" list="' + p + '-setups" placeholder="ex.: pullback na VWAP" autocomplete="off"></label>' +
      '    <datalist id="' + p + '-setups"></datalist>' +
      '    <div class="dta-campo dta-campo-largo"><span>Seguiu o plano?</span><div class="dta-segmento">' +
      '      <label>Sim<input type="radio" name="' + p + '-r-plano" id="' + p + '-r-plano-sim" value="sim" checked></label>' +
      '      <label class="venda">Não<input type="radio" name="' + p + '-r-plano" id="' + p + '-r-plano-nao" value="nao"></label>' +
      '    </div></div>' +
      '    <label class="dta-campo dta-campo-largo"><span>Nota (o que você viu, o que sentiu)</span><textarea id="' + p + '-r-nota" data-r="nota" rows="2"></textarea></label>' +
      '    <p class="dta-nota dta-campo-largo">Bruto e custos são calculados pelos preços. Se preferir, digite o resultado da nota de corretagem.</p>' +
      '    <button type="submit" class="dta-botao dta-campo-largo">Registrar trade</button>' +
      '  </form>' +
      '  <p class="dta-feedback" data-v="reg-feedback" aria-live="polite"></p>' +
      '  <p class="dta-titulo-sec">Trades de hoje</p>' +
      '  <ul class="dta-lista" data-v="lista-hoje"></ul>' +
      '</section>' +

      /* Plano */
      '<section class="dta-painel" data-painel="plano" role="tabpanel" hidden>' +
      '  <form class="dta-grade" data-v="form-plano" novalidate>' +
      '    <label class="dta-campo dta-campo-largo"><span>Capital da conta de trade (R$)</span><input id="' + p + '-capital" data-p="capital" type="number" min="0" step="any"></label>' +
      '    <label class="dta-campo"><span>Risco por trade (%)</span><input id="' + p + '-riscoPct" data-p="riscoPct" type="number" min="0" max="5" step="0.1"></label>' +
      '    <label class="dta-campo"><span>Stop diário (%)</span><input id="' + p + '-stopDiarioPct" data-p="stopDiarioPct" type="number" min="0" max="20" step="0.1"></label>' +
      '    <label class="dta-campo"><span>Meta diária (%, 0 = sem)</span><input id="' + p + '-metaDiariaPct" data-p="metaDiariaPct" type="number" min="0" step="0.1"></label>' +
      '    <label class="dta-campo"><span>Máx. de trades/dia</span><input id="' + p + '-maxTrades" data-p="maxTrades" type="number" min="0" step="1"></label>' +
      '    <label class="dta-campo"><span>Perdas seguidas p/ pausa</span><input id="' + p + '-maxPerdasSeguidas" data-p="maxPerdasSeguidas" type="number" min="0" step="1"></label>' +
      '    <label class="dta-campo"><span>Duração da pausa (min)</span><input id="' + p + '-pausaMin" data-p="pausaMin" type="number" min="0" step="1"></label>' +
      '    <label class="dta-campo"><span>Horário limite</span><input id="' + p + '-horaLimite" data-p="horaLimite" type="time"></label>' +
      '    <label class="dta-campo"><span>Lembrete de pausa (min)</span><input id="' + p + '-lembretePausaMin" data-p="lembretePausaMin" type="number" min="0" step="5"></label>' +
      '    <p class="dta-titulo-sec dta-campo-largo">Custos ida+volta (confira na sua nota)</p>' +
      '    <label class="dta-campo"><span>WIN (R$/contrato)</span><input id="' + p + '-c-win" data-custo="win" type="number" min="0" step="0.01"></label>' +
      '    <label class="dta-campo"><span>WDO (R$/contrato)</span><input id="' + p + '-c-wdo" data-custo="wdo" type="number" min="0" step="0.01"></label>' +
      '    <label class="dta-campo"><span>Ação (% do volume)</span><input id="' + p + '-c-acao" data-custo="acao" type="number" min="0" step="0.001"></label>' +
      '    <label class="dta-campo"><span>Derrapagem (ticks)</span><input id="' + p + '-slip" data-slip="1" type="number" min="0" step="1"></label>' +
      '    <label class="dta-campo dta-campo-largo" style="flex-direction:row;align-items:center;gap:8px"><input id="' + p + '-som" data-p="som" type="checkbox" style="width:18px;height:18px"><span>Som ao travar</span></label>' +
      '    <button type="submit" class="dta-botao dta-campo-largo">Salvar plano</button>' +
      '  </form>' +
      '  <p class="dta-feedback" data-v="plano-feedback" aria-live="polite"></p>' +
      '  <p class="dta-nota">Sugestão de partida: risco de 0,5% a 1% por trade e stop diário de 2% a 3%. Com 1% de risco, 10 perdas seguidas custam cerca de 9,6% da conta.</p>' +
      '</section>' +

      /* Bloqueio */
      '<div class="dta-bloqueio" data-v="bloqueio" hidden role="alertdialog" aria-labelledby="' + p + '-bl-t">' +
      '  <h2 id="' + p + '-bl-t" data-v="bl-titulo">PARE.</h2>' +
      '  <p class="motivo" data-v="bl-motivo"></p>' +
      '  <p class="dta-contagem" data-v="bl-contagem" hidden></p>' +
      '  <div class="dta-respira"><span aria-hidden="true"></span>Inspire enquanto o círculo cresce, solte enquanto diminui. Seis ciclos.</div>' +
      '  <ul data-v="bl-lista"></ul>' +
      '  <details><summary>Quero desbloquear mesmo assim</summary><div>' +
      '    <p>Digite <b>' + FRASE + '</b> para liberar por 10 minutos. O desbloqueio fica registrado e aparece no seu diário.</p>' +
      '    <input id="' + p + '-frase" data-v="bl-frase" type="text" autocomplete="off" aria-label="Frase de desbloqueio">' +
      '    <button type="button" class="dta-botao dta-botao-perigo" data-acao="desbloquear" disabled>Desbloquear por 10 min</button>' +
      '  </div></details>' +
      '</div>' +

      '<footer class="dta-rodape"><span>Ferramenta de disciplina. Não dá sinais.</span><span data-v="links"></span></footer>';
  }

  function montar(raiz, opcoes) {
    opcoes = opcoes || {};
    var p = opcoes.prefixo || 'dta';
    raiz.classList.add('dta');
    raiz.innerHTML = template(p);

    function $(s) { return raiz.querySelector(s); }
    function $$(s) { return Array.prototype.slice.call(raiz.querySelectorAll(s)); }
    function v(nome) { return $('[data-v="' + nome + '"]'); }

    if (opcoes.linkDiario) {
      v('links').innerHTML = '<a href="' + esc(opcoes.linkDiario) + '" target="_blank" rel="noopener">Diário completo</a>';
    }

    var ultimoEstado = null;
    var lembreteTocado = false;

    /* ----- Abas ----- */
    function abrirAba(nome) {
      $$('[data-aba]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.aba === nome ? 'true' : 'false'); });
      $$('[data-painel]').forEach(function (s) { s.hidden = s.dataset.painel !== nome; });
      if (nome === 'plano') preencherPlano();
      if (nome === 'registrar') listarHoje();
    }
    $$('[data-aba]').forEach(function (b) { b.addEventListener('click', function () { abrirAba(b.dataset.aba); }); });

    /* ----- Status / cabeçalho ----- */
    function render() {
      var cfg = DT.config();
      var st = status(cfg);
      var box = $('.dta-status');
      box.dataset.estado = st.estado;
      $('.dta-status-titulo').textContent = st.titulo;
      $('.dta-status-motivo').textContent = st.motivo;
      var pnl = v('pnl');
      pnl.textContent = f.brlSinal(st.pnl);
      pnl.className = f.classe(st.pnl);
      v('n').textContent = st.n + (cfg.maxTrades > 0 ? '/' + cfg.maxTrades : '');
      v('restante').textContent = f.brl(st.restante);
      var usado = st.limite > 0 ? Math.min(1, Math.max(0, -st.pnl / st.limite)) : 0;
      var med = $('.dta-medidor');
      med.querySelector('span').style.width = (usado * 100).toFixed(1) + '%';
      med.dataset.cheio = usado >= 1 ? 'sim' : 'nao';
      v('legenda').textContent = 'Stop diário de ' + f.brl(st.limite) + ' · ' + f.pct(usado * 100, 0) + ' consumido · risco máx. no próximo trade ' + f.brl(st.riscoMax);

      /* lembrete de pausa */
      var s = st.sessao;
      var mostrarLembrete = cfg.lembretePausaMin > 0 && Date.now() - (s.ultimaPausa || s.inicio) >= cfg.lembretePausaMin * 60000 && !st.bloqueia;
      v('lembrete').hidden = !mostrarLembrete;
      if (mostrarLembrete && !lembreteTocado && cfg.som) { DT.bip(false); }
      lembreteTocado = mostrarLembrete;

      /* bloqueio */
      var bl = v('bloqueio');
      bl.hidden = !st.bloqueia;
      if (st.bloqueia) {
        v('bl-titulo').textContent = st.estado === 'pausa' ? 'PAUSA.' : 'PARE.';
        v('bl-motivo').textContent = st.motivo;
        var cont = v('bl-contagem');
        cont.hidden = st.estado !== 'pausa';
        if (st.estado === 'pausa') cont.textContent = f.mmss(st.fimPausa - Date.now());
        var itens = st.estado === 'pausa'
          ? ['Tire a mão do mouse e levante da cadeira.', 'Escreva no diário o que aconteceu nas últimas perdas.', 'Volte só se o próximo trade passar no checklist inteiro.']
          : ['Feche a plataforma da corretora. Minimizar não conta.', 'Anote no diário o que funcionou e o que não funcionou.', 'O mercado abre de novo amanhã. Seu capital precisa estar lá.'];
        var lista = v('bl-lista');
        var html = itens.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
        if (lista.innerHTML !== html) lista.innerHTML = html;
      }
      if (st.estado !== ultimoEstado) {
        if (ultimoEstado && (st.estado === 'pare' || st.estado === 'pausa') && cfg.som) DT.bip(true);
        ultimoEstado = st.estado;
        calcularPosicao();
        avaliarChecklist();
      }
      return st;
    }

    v('lembrete').querySelector('button').addEventListener('click', function () {
      var s = sessao();
      s.ultimaPausa = Date.now();
      salvarSessao(s);
      render();
    });

    var frase = v('bl-frase');
    var btnDesb = $('[data-acao="desbloquear"]');
    frase.addEventListener('input', function () {
      btnDesb.disabled = frase.value.trim().toUpperCase() !== FRASE;
    });
    btnDesb.addEventListener('click', function () {
      if (frase.value.trim().toUpperCase() !== FRASE) return;
      var s = sessao();
      s.overrideAte = Date.now() + 10 * 60000;
      s.overrides = (s.overrides || 0) + 1;
      salvarSessao(s);
      frase.value = '';
      btnDesb.disabled = true;
      render();
    });

    /* ----- Posição ----- */
    function lerPos() {
      var o = {};
      $$('[data-c]').forEach(function (el) { o[el.dataset.c] = el.dataset.c === 'tipo' ? el.value : DT.num(el.value); });
      return o;
    }
    function calcularPosicao() {
      var cfg = DT.config();
      var st = status(cfg);
      var o = lerPos();
      $('[data-so-outro]').hidden = o.tipo !== 'outro';
      var riscoMax = isFinite(o.risco) && o.risco > 0 ? o.risco : st.riscoMax;
      var r = DT.calc.posicao({ tipo: o.tipo, valorPonto: o.vp, entrada: o.entrada, stop: o.stop, alvo: o.alvo, riscoMax: riscoMax, capital: cfg.capital, cfg: cfg });
      var a = DT.ATIVOS[o.tipo];
      var dl = v('pos-res');
      var avisos = r.avisos.slice();
      if (st.bloqueia) avisos.unshift({ grave: true, txt: 'Seu plano está travado agora. Nenhum trade é permitido.' });
      if (isFinite(o.risco) && o.risco > st.riscoMax + 0.005 && !st.bloqueia) avisos.unshift({ grave: true, txt: 'Você digitou um risco acima do que o plano permite agora (' + f.brl(st.riscoMax) + ').' });
      if (!r.ok) {
        dl.innerHTML = '<dt>Preencha entrada e stop</dt><dd>—</dd>';
      } else {
        dl.innerHTML =
          '<dt>Operação</dt><dd>' + (r.lado === 'compra' ? 'Compra' : 'Venda') + ' · stop de ' + f.num(r.distancia, a.tick < 1 ? 2 : 0) + ' pts</dd>' +
          '<dt>Quantidade máxima</dt><dd class="destaque">' + f.num(r.qtd) + ' ' + (r.qtd === 1 ? a.unidade : a.unidades) + '</dd>' +
          '<dt>Risco total (com custos)</dt><dd class="negativo">' + f.brl(r.riscoTotal) + '</dd>' +
          '<dt>Ganho no alvo (líquido)</dt><dd class="' + (r.ganhoTotal > 0 ? 'positivo' : '') + '">' + (r.alvoValido ? f.brl(r.ganhoTotal) : '—') + '</dd>' +
          '<dt>Ganho/risco líquido</dt><dd>' + (isFinite(r.rrLiquido) ? f.num(r.rrLiquido, 2) + ' : 1' : '—') + '</dd>' +
          '<dt>Acerto mínimo p/ empatar</dt><dd>' + (isFinite(r.acertoMinimo) ? f.pct(r.acertoMinimo * 100, 0) : '—') + '</dd>' +
          '<dt>Custos estimados</dt><dd>' + f.brl(r.custoTotal) + '</dd>' +
          '<dt>Exposição</dt><dd>' + f.brl(r.exposicao) + (isFinite(r.alavancagem) ? ' (' + f.num(r.alavancagem, 1) + '×)' : '') + '</dd>';
      }
      v('pos-avisos').innerHTML = avisos.map(function (x) { return '<li class="' + (x.grave ? 'grave' : '') + '">' + esc(x.txt) + '</li>'; }).join('');
      $('[data-c="risco"]').placeholder = 'plano: ' + f.num(st.riscoMax, 0);
      return { r: r, o: o };
    }
    $$('[data-c]').forEach(function (el) {
      el.addEventListener('input', function () { v('exemplo').hidden = true; calcularPosicao(); });
      el.addEventListener('change', function () {
        if (el.dataset.c === 'tipo') {
          var ex = { win: [140000, 139850, 140300], wdo: [5400, 5392, 5416], acao: [32.5, 32.2, 33.1], outro: [100, 99, 102] }[el.value];
          $('[data-c="entrada"]').value = ex[0];
          $('[data-c="stop"]').value = ex[1];
          $('[data-c="alvo"]').value = ex[2];
          v('exemplo').hidden = false;
        }
        calcularPosicao();
      });
    });
    $('[data-acao="levar"]').addEventListener('click', function () {
      var res = calcularPosicao();
      if (!res.r.ok) return;
      $('[data-r="tipo"]').value = res.o.tipo;
      $('[data-r="vp"]').value = res.o.vp || 1;
      $('[data-r="qtd"]').value = res.r.qtd;
      $('[data-r="entrada"]').value = res.o.entrada;
      $('[data-r="saida"]').value = '';
      raiz.querySelector('#' + p + (res.r.lado === 'compra' ? '-r-compra' : '-r-venda')).checked = true;
      manualBruto = false;
      recalcularRegistro();
      abrirAba('registrar');
    });

    /* ----- Checklist ----- */
    function avaliarChecklist() {
      var s = sessao();
      var st = status();
      var marcados = $$('[data-ck]').filter(function (c) { return c.checked; }).length;
      var emo = s.emocao || 0;
      var faltam = CHECKLIST.length - marcados;
      var box = v('veredito');
      var ok = false, txt;
      if (st.bloqueia) txt = 'Não entre. O plano está travado.';
      else if (faltam > 0) txt = 'Não entre: ' + faltam + (faltam === 1 ? ' item pendente.' : ' itens pendentes.');
      else if (!emo) txt = 'Marque como você está antes de decidir.';
      else if (emo <= 2) txt = 'Não entre. Tenso ou ansioso, você vai sair do plano. Pausa de 5 minutos.';
      else { ok = true; txt = 'Pode executar, se o preço chegar no seu ponto. Sem perseguir.'; }
      box.textContent = txt;
      box.dataset.ok = ok ? 'sim' : 'nao';
    }
    function restaurarChecklist() {
      var s = sessao();
      $$('[data-ck]').forEach(function (c) { c.checked = !!(s.checklist && s.checklist[c.dataset.ck]); });
      $$('input[name="' + p + '-emo"]').forEach(function (r) { r.checked = Number(r.value) === s.emocao; });
      avaliarChecklist();
    }
    $$('[data-ck]').forEach(function (c) {
      c.addEventListener('change', function () {
        var s = sessao();
        s.checklist = $$('[data-ck]').map(function (x) { return x.checked; });
        salvarSessao(s);
        avaliarChecklist();
      });
    });
    $$('input[name="' + p + '-emo"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var s = sessao();
        s.emocao = Number(r.value);
        salvarSessao(s);
        avaliarChecklist();
      });
    });
    function limparChecklist() {
      var s = sessao();
      s.checklist = [];
      salvarSessao(s);
      restaurarChecklist();
    }
    $('[data-acao="limpar-check"]').addEventListener('click', limparChecklist);

    /* ----- Registrar ----- */
    var manualBruto = false, manualCustos = false;
    function lerReg() {
      var o = {};
      $$('[data-r]').forEach(function (el) {
        var k = el.dataset.r;
        o[k] = (k === 'tipo' || k === 'ativo' || k === 'setup' || k === 'nota') ? el.value : DT.num(el.value);
      });
      var lado = raiz.querySelector('input[name="' + p + '-r-lado"]:checked');
      o.lado = lado ? lado.value : 'compra';
      var plano = raiz.querySelector('input[name="' + p + '-r-plano"]:checked');
      o.seguiuPlano = !plano || plano.value === 'sim';
      return o;
    }
    function recalcularRegistro() {
      var o = lerReg();
      $('[data-so-outro-r]').hidden = o.tipo !== 'outro';
      var a = DT.ATIVOS[o.tipo];
      var vp = o.tipo === 'outro' ? (o.vp || 1) : a.valorPonto;
      if (isFinite(o.entrada) && isFinite(o.saida) && o.qtd > 0) {
        var dir = o.lado === 'compra' ? 1 : -1;
        if (!manualBruto) $('[data-r="bruto"]').value = ((o.saida - o.entrada) * dir * o.qtd * vp).toFixed(2);
        if (!manualCustos) $('[data-r="custos"]').value = DT.calc.custo(o.tipo, o.qtd, o.entrada, o.saida, DT.config(), vp).taxa.toFixed(2);
      } else if (o.qtd > 0 && !manualCustos && isFinite(o.entrada)) {
        $('[data-r="custos"]').value = DT.calc.custo(o.tipo, o.qtd, o.entrada, o.entrada, DT.config(), vp).taxa.toFixed(2);
      }
    }
    $$('[data-r]').forEach(function (el) {
      el.addEventListener('input', function () {
        if (el.dataset.r === 'bruto') manualBruto = el.value !== '';
        else if (el.dataset.r === 'custos') manualCustos = el.value !== '';
        else recalcularRegistro();
      });
    });
    $$('input[name="' + p + '-r-lado"]').forEach(function (r) { r.addEventListener('change', recalcularRegistro); });

    function atualizarSetups() {
      var nomes = {};
      DT.diario.listar().forEach(function (t) { if (t.setup) nomes[t.setup] = 1; });
      v('form-reg').parentNode.querySelector('datalist').innerHTML = Object.keys(nomes).slice(0, 30).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
    }

    v('form-reg').addEventListener('submit', function (e) {
      e.preventDefault();
      var o = lerReg();
      var fb = v('reg-feedback');
      if (!isFinite(o.bruto)) {
        fb.textContent = 'Informe entrada e saída, ou digite o resultado bruto em R$.';
        fb.className = 'dta-feedback erro';
        return;
      }
      var agora = new Date();
      var s = sessao();
      var t = DT.diario.adicionar({
        data: f.hoje(agora), hora: f.hora(agora), ts: agora.getTime(),
        ativo: o.ativo || DT.ATIVOS[o.tipo].curto, tipo: o.tipo, lado: o.lado,
        qtd: isFinite(o.qtd) ? o.qtd : null, entrada: isFinite(o.entrada) ? o.entrada : null, saida: isFinite(o.saida) ? o.saida : null,
        bruto: o.bruto, custos: isFinite(o.custos) ? o.custos : 0,
        setup: (o.setup || '').trim(), seguiuPlano: o.seguiuPlano, emocao: s.emocao || null,
        nota: (o.nota || '').trim(), desbloqueado: s.overrideAte > Date.now()
      });
      if (!t) {
        fb.textContent = 'Não consegui salvar: o navegador bloqueou o armazenamento local (aba anônima?).';
        fb.className = 'dta-feedback erro';
        return;
      }
      var liq = DT.diario.liquido(t);
      fb.textContent = 'Registrado: ' + f.brlSinal(liq) + ' líquido. Checklist zerado para o próximo trade.';
      fb.className = 'dta-feedback';
      ['saida', 'bruto', 'custos', 'nota', 'entrada'].forEach(function (k) { $('[data-r="' + k + '"]').value = ''; });
      manualBruto = manualCustos = false;
      limparChecklist();
      render();
      listarHoje();
    });

    function listarHoje() {
      var trades = DT.diario.doDia();
      var ul = v('lista-hoje');
      if (!trades.length) {
        ul.innerHTML = '<li><span class="dta-vazio" style="grid-column:1/-1">Nenhum trade registrado hoje.</span></li>';
      } else {
        ul.innerHTML = trades.map(function (t) {
          var liq = DT.diario.liquido(t);
          return '<li><span class="hora">' + esc(t.hora || '') + '</span><span class="desc">' + esc((t.lado === 'venda' ? 'V ' : 'C ') + (t.ativo || '') + (t.setup ? ' · ' + t.setup : '')) + '</span>' +
            '<b class="' + f.classe(liq) + '">' + f.brlSinal(liq) + '</b>' +
            '<button type="button" data-remover="' + esc(t.id) + '" aria-label="Apagar trade das ' + esc(t.hora || '') + '" title="Apagar">×</button></li>';
        }).join('');
      }
      atualizarSetups();
    }
    v('lista-hoje').addEventListener('click', function (e) {
      var b = e.target.closest('[data-remover]');
      if (!b) return;
      DT.diario.remover(b.dataset.remover);
    });

    /* ----- Plano ----- */
    function preencherPlano() {
      var c = DT.config();
      $$('[data-p]').forEach(function (el) {
        if (el.type === 'checkbox') el.checked = !!c[el.dataset.p];
        else el.value = c[el.dataset.p];
      });
      $$('[data-custo]').forEach(function (el) { el.value = c.custos[el.dataset.custo]; });
      $('[data-slip]').value = c.slippage.win;
    }
    v('form-plano').addEventListener('submit', function (e) {
      e.preventDefault();
      var c = DT.config();
      $$('[data-p]').forEach(function (el) {
        var k = el.dataset.p;
        if (el.type === 'checkbox') c[k] = el.checked;
        else if (k === 'horaLimite') c[k] = el.value;
        else { var n = DT.num(el.value); if (isFinite(n) && n >= 0) c[k] = n; }
      });
      $$('[data-custo]').forEach(function (el) { var n = DT.num(el.value); if (isFinite(n) && n >= 0) c.custos[el.dataset.custo] = n; });
      var sl = DT.num($('[data-slip]').value);
      if (isFinite(sl) && sl >= 0) c.slippage = { win: sl, wdo: sl, acao: sl, outro: 0 };
      var fb = v('plano-feedback');
      var avisos = [];
      if (c.riscoPct > 2) avisos.push('risco por trade acima de 2% esvazia a conta rápido em sequências de perda');
      if (c.stopDiarioPct > 6) avisos.push('stop diário acima de 6% permite perder um mês de CDI em uma manhã');
      if (DT.salvarConfig(c)) {
        fb.textContent = 'Plano salvo.' + (avisos.length ? ' Atenção: ' + avisos.join('; ') + '.' : '');
        fb.className = avisos.length ? 'dta-feedback erro' : 'dta-feedback';
      } else {
        fb.textContent = 'Não consegui salvar: armazenamento local bloqueado.';
        fb.className = 'dta-feedback erro';
      }
      render();
      calcularPosicao();
    });

    /* ----- Sincronização ----- */
    function tudo() { render(); calcularPosicao(); listarHoje(); }
    global.addEventListener('dt:trades', tudo);
    global.addEventListener('dt:config', function () { render(); calcularPosicao(); });
    global.addEventListener('storage', function (e) {
      if (!e.key || e.key.indexOf('dt.') === 0) { tudo(); restaurarChecklist(); }
    });

    restaurarChecklist();
    tudo();
    setInterval(render, 1000);

    return { raiz: raiz, render: render, abrirAba: abrirAba };
  }

  DT.assistente = { montar: montar, status: status, sessao: sessao };
})(window);
