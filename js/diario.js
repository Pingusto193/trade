/* Diário de trades: registro, estatísticas, curva de capital, análise por setup e disciplina, CSV. */
(function (global) {
  'use strict';

  var DT = global.DT;
  var f = DT.fmt;
  var esc = DT.escapar;
  var doc = global.document;
  function $(s) { return doc.querySelector(s); }

  /* ---------- Exemplo fictício (não é salvo) ---------- */
  function exemplo() {
    var a = 20260901;
    function rnd() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    var resultados = [];
    for (var i = 0; i < 40; i++) resultados.push(i % 2 === 0);
    resultados.sort(function () { return rnd() - 0.5; });
    var setups = ['pullback VWAP', 'rompimento abertura', 'retorno à VWAP'];
    var hoje = new Date();
    var lista = [];
    var dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 30);
    for (var k = 0; k < 40; k++) {
      if (k % 2 === 0) {
        do { dia.setDate(dia.getDate() + 1); } while (dia.getDay() === 0 || dia.getDay() === 6);
      }
      var ganhou = resultados[k];
      var foraPlano = !ganhou && k % 4 === 1;
      var pts = ganhou ? Math.round((45 + rnd() * 70) / 5) * 5 : -Math.round((45 + rnd() * 50) / 5) * 5;
      if (foraPlano) pts -= 40;
      var lado = rnd() < 0.5 ? 'compra' : 'venda';
      var entrada = Math.round((139000 + rnd() * 3000) / 5) * 5;
      var saida = entrada + (lado === 'compra' ? pts : -pts);
      var h = 9 + Math.floor(rnd() * 3), mi = Math.floor(rnd() * 60);
      lista.push({
        id: 'ex' + k, data: f.hoje(dia), hora: String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'),
        ativo: 'WINV26', tipo: 'win', lado: lado, qtd: 3, entrada: entrada, saida: saida,
        bruto: pts * 0.2 * 3, custos: 4.5, setup: foraPlano ? 'sem setup (FOMO)' : setups[k % 3],
        seguiuPlano: !foraPlano, emocao: foraPlano ? 2 : 4, nota: foraPlano ? 'entrei atrasado' : '', exemplo: true
      });
    }
    lista.forEach(function (t) { t.ts = DT.diario.carimbo(t); });
    return lista;
  }

  /* ---------- Estado e filtros ---------- */
  function dados() {
    var reais = DT.diario.listar();
    return reais.length ? { lista: reais, exemplo: false } : { lista: exemplo(), exemplo: true };
  }
  function filtrar(lista) {
    var filtro = $('#dr-filtro').value;
    var mes = f.hoje().slice(0, 7);
    return lista.filter(function (t) {
      if (filtro === 'reais') return !t.simulado;
      if (filtro === 'simulados') return !!t.simulado;
      if (filtro === 'mes') return (t.data || '').slice(0, 7) === mes;
      return true;
    });
  }

  /* ---------- Render ---------- */
  var ultimaCurva = [];

  function render() {
    var d = dados();
    $('#dr-exemplo').hidden = !d.exemplo;
    var lista = filtrar(d.lista);
    var s = DT.diario.estatisticas(lista);
    ultimaCurva = s.curva;

    var itens = [
      ['Trades', f.num(s.n)],
      ['Acerto', s.n ? f.pct(s.taxaAcerto * 100, 1) : '—'],
      ['Resultado líquido', f.brlSinal(s.liquido), f.classe(s.liquido) + ' grande'],
      ['Custos pagos', f.brl(s.custos)],
      ['Expectativa/trade', s.n ? f.brlSinal(s.expectativa) : '—', f.classe(s.expectativa)],
      ['Payoff', isFinite(s.payoff) ? f.num(s.payoff, 2) : '—'],
      ['Fator de lucro', isFinite(s.fatorLucro) ? f.num(s.fatorLucro, 2) : '—'],
      ['Queda máxima', f.brl(s.maxDD)],
      ['Pior sequência', s.maxSeqPerdas + ' perdas']
    ];
    $('#dr-resumo').innerHTML = itens.map(function (i) { return '<div><span>' + esc(i[0]) + '</span><b class="' + (i[2] || '') + '">' + esc(i[1]) + '</b></div>'; }).join('');

    /* leitura */
    var frases = [];
    if (!s.n) frases.push('Nenhum trade neste filtro.');
    else {
      if (s.n < 100) {
        var marg = 1.96 * Math.sqrt(0.25 / s.n) * 100;
        frases.push('Amostra pequena: com ' + s.n + ' trades, a taxa de acerto real pode estar ' + f.num(marg, 0) + ' pontos acima ou abaixo da medida.');
      }
      if (s.expectativa < 0) {
        frases.push('Cada trade custou, em média, ' + f.brl(-s.expectativa) + '.');
        if (s.bruto > 0) frases.push('Antes dos custos o resultado era ' + f.brlSinal(s.bruto) + ': os custos (' + f.brl(s.custos) + ') decidiram o placar.');
      } else if (s.expectativa > 0) {
        frases.push('Expectativa positiva de ' + f.brl(s.expectativa) + ' por trade' + (s.liquido > 0 ? ', ou ' + f.brl(s.liquido * 0.8) + ' depois do IR de 20%.' : '.'));
      }
      if (s.nSemPlano > 0 && s.nPlano > 0) {
        var a = s.liquidoPlano / s.nPlano, b = s.liquidoSemPlano / s.nSemPlano;
        frases.push('Trades dentro do plano: ' + f.brlSinal(a) + ' por trade. Fora do plano: ' + f.brlSinal(b) + ' por trade' + (b < a ? '. A indisciplina está custando dinheiro.' : '.'));
      }
    }
    $('#dr-leitura').textContent = frases.join(' ');

    /* por setup */
    var setups = Object.keys(s.porSetup).map(function (k) { return [k, s.porSetup[k]]; }).sort(function (x, y) { return y[1].n - x[1].n; });
    $('#dr-setups').innerHTML = setups.length ? setups.map(function (x) {
      return '<tr><td>' + esc(x[0]) + '</td><td class="num">' + x[1].n + '</td><td class="num">' + f.pct(x[1].ganhos / x[1].n * 100, 0) + '</td><td class="num ' + f.classe(x[1].liquido) + '">' + f.brlSinal(x[1].liquido) + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="pequeno">Sem dados.</td></tr>';
    $('#dr-disciplina').innerHTML =
      '<tr><td>Seguiu o plano</td><td class="num">' + s.nPlano + '</td><td class="num ' + f.classe(s.liquidoPlano) + '">' + f.brlSinal(s.liquidoPlano) + '</td><td class="num">' + (s.nPlano ? f.brlSinal(s.liquidoPlano / s.nPlano) : '—') + '</td></tr>' +
      '<tr><td>Fora do plano</td><td class="num">' + s.nSemPlano + '</td><td class="num ' + f.classe(s.liquidoSemPlano) + '">' + f.brlSinal(s.liquidoSemPlano) + '</td><td class="num">' + (s.nSemPlano ? f.brlSinal(s.liquidoSemPlano / s.nSemPlano) : '—') + '</td></tr>';

    /* tabela */
    var ord = lista.slice().sort(function (x, y) { return DT.diario.carimbo(y) - DT.diario.carimbo(x); });
    $('#dr-tabela').innerHTML = ord.length ? ord.slice(0, 500).map(function (t) {
      var liq = DT.diario.liquido(t);
      return '<tr><td>' + esc(f.dataBR(t.data)) + '</td><td>' + esc(t.hora || '') + '</td><td>' + esc(t.ativo || '') + (t.simulado ? ' <span class="selo">sim</span>' : '') + '</td><td>' + (t.lado === 'venda' ? 'Venda' : 'Compra') + '</td>' +
        '<td class="num">' + (t.qtd != null ? f.num(t.qtd) : '') + '</td><td class="num">' + (t.entrada != null ? esc(String(t.entrada).replace('.', ',')) : '') + '</td><td class="num">' + (t.saida != null ? esc(String(t.saida).replace('.', ',')) : '') + '</td>' +
        '<td class="num ' + f.classe(t.bruto) + '">' + f.brlSinal(Number(t.bruto) || 0) + '</td><td class="num">' + f.brl(Number(t.custos) || 0) + '</td><td class="num ' + f.classe(liq) + '">' + f.brlSinal(liq) + '</td>' +
        '<td>' + esc(t.setup || '') + '</td><td>' + (t.seguiuPlano === false ? '<span class="selo nao">não</span>' : '<span class="selo">sim</span>') + '</td><td class="nota">' + esc(t.nota || '') + '</td>' +
        '<td>' + (t.exemplo ? '' : '<button type="button" data-apagar="' + esc(t.id) + '" aria-label="Apagar trade" title="Apagar">×</button>') + '</td></tr>';
    }).join('') : '<tr><td colspan="14" class="pequeno">Nenhum trade neste filtro.</td></tr>';

    desenhar();
  }

  function desenhar() {
    var canvas = $('#dr-canvas');
    var c = DT.prepararCanvas(canvas);
    if (!c) return;
    var ctx = c.ctx, W = c.w, H = c.h;
    var curva = ultimaCurva.length > 1 ? ultimaCurva : [0, 0];
    var m = { e: 70, d: 14, t: 14, b: 24 };
    var pw = W - m.e - m.d, ph = H - m.t - m.b;
    var min = Math.min.apply(null, curva.concat([0])), max = Math.max.apply(null, curva.concat([0]));
    if (max - min < 1) { max += 50; min -= 50; }
    var pad = (max - min) * 0.08; min -= pad; max += pad;
    function X(i) { return m.e + i / (curva.length - 1) * pw; }
    function Y(v) { return m.t + (1 - (v - min) / (max - min)) * ph; }
    var linha = DT.cor('--linha'), tinta3 = DT.cor('--tinta-3'), cob = DT.cor('--cobalto');
    var fim = curva[curva.length - 1];
    var corFim = fim >= 0 ? DT.cor('--alta') : DT.cor('--baixa');

    ctx.font = '11px ' + DT.cor('--f-dado');
    ctx.fillStyle = tinta3; ctx.strokeStyle = linha; ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var passo = DT.passoEixo(max - min, 4);
    for (var v = Math.ceil(min / passo) * passo; v <= max; v += passo) {
      ctx.beginPath(); ctx.moveTo(m.e, Math.round(Y(v)) + 0.5); ctx.lineTo(W - m.d, Math.round(Y(v)) + 0.5); ctx.stroke();
      ctx.fillText(f.brl(v).replace(',00', ''), m.e - 8, Y(v));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('trade 1', X(Math.min(1, curva.length - 1)), H - m.b + 6);
    if (curva.length > 2) ctx.fillText('trade ' + (curva.length - 1), X(curva.length - 1) - 20, H - m.b + 6);

    ctx.strokeStyle = tinta3; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(m.e, Y(0)); ctx.lineTo(W - m.d, Y(0)); ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.14; ctx.fillStyle = cob;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0));
    curva.forEach(function (val, i) { ctx.lineTo(X(i), Y(val)); });
    ctx.lineTo(X(curva.length - 1), Y(0)); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = cob; ctx.lineWidth = 2;
    ctx.beginPath();
    curva.forEach(function (val, i) { if (i === 0) ctx.moveTo(X(i), Y(val)); else ctx.lineTo(X(i), Y(val)); });
    ctx.stroke();
    ctx.fillStyle = corFim;
    ctx.beginPath(); ctx.arc(X(curva.length - 1), Y(fim), 4.5, 0, Math.PI * 2); ctx.fill();
  }

  /* ---------- Formulário ---------- */
  var manual = { bruto: false, custos: false };
  function agoraPadrao() {
    $('#dr-data').value = f.hoje();
    $('#dr-hora').value = f.hora();
  }
  function recalcular() {
    var tipo = $('#dr-tipo').value;
    var a = DT.ATIVOS[tipo];
    var qtd = DT.num($('#dr-qtd').value), e = DT.num($('#dr-entrada').value), s = DT.num($('#dr-saida').value);
    var dir = $('#dr-lado').value === 'venda' ? -1 : 1;
    if (isFinite(qtd) && isFinite(e) && isFinite(s)) {
      if (!manual.bruto) $('#dr-bruto').value = ((s - e) * dir * qtd * a.valorPonto).toFixed(2);
      if (!manual.custos) $('#dr-custos').value = DT.calc.custo(tipo, qtd, e, s, DT.config()).taxa.toFixed(2);
    }
  }
  ['dr-tipo', 'dr-qtd', 'dr-entrada', 'dr-saida', 'dr-lado'].forEach(function (id) {
    $('#' + id).addEventListener('input', recalcular);
    $('#' + id).addEventListener('change', recalcular);
  });
  $('#dr-bruto').addEventListener('input', function () { manual.bruto = this.value !== ''; });
  $('#dr-custos').addEventListener('input', function () { manual.custos = this.value !== ''; });

  $('#dr-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var fb = $('#dr-feedback');
    var bruto = DT.num($('#dr-bruto').value);
    if (!$('#dr-data').value || !isFinite(bruto)) {
      fb.textContent = 'Preencha a data e o resultado (ou entrada, saída e quantidade).';
      fb.className = 'feedback erro';
      return;
    }
    var tipo = $('#dr-tipo').value;
    var num = function (id) { var v = DT.num($('#' + id).value); return isFinite(v) ? v : null; };
    var t = DT.diario.adicionar({
      data: $('#dr-data').value, hora: $('#dr-hora').value || '12:00', ativo: $('#dr-ativo').value.trim() || DT.ATIVOS[tipo].curto,
      tipo: tipo, lado: $('#dr-lado').value, qtd: num('dr-qtd'), entrada: num('dr-entrada'), saida: num('dr-saida'),
      bruto: bruto, custos: num('dr-custos') || 0, setup: $('#dr-setup').value.trim(),
      seguiuPlano: $('#dr-plano').value === 'sim', emocao: num('dr-emocao'), simulado: $('#dr-simulado').value === 'sim',
      nota: $('#dr-nota').value.trim()
    });
    if (!t) {
      fb.textContent = 'O navegador bloqueou o armazenamento local. Saia da aba anônima ou libere os dados do site.';
      fb.className = 'feedback erro';
      return;
    }
    fb.textContent = 'Registrado: ' + f.brlSinal(DT.diario.liquido(t)) + ' líquido.';
    fb.className = 'feedback';
    ['dr-entrada', 'dr-saida', 'dr-bruto', 'dr-custos', 'dr-nota'].forEach(function (id) { $('#' + id).value = ''; });
    manual.bruto = manual.custos = false;
    agoraPadrao();
  });

  $('#dr-tabela').addEventListener('click', function (e) {
    var b = e.target.closest('[data-apagar]');
    if (b) DT.diario.remover(b.dataset.apagar);
  });
  $('#dr-filtro').addEventListener('change', render);

  /* ---------- Backup ---------- */
  var fbBackup = $('#dr-backup-feedback');
  function csvAtual() { return DT.diario.paraCSV(DT.diario.listar()); }
  $('#dr-baixar').addEventListener('click', function () {
    if (!DT.diario.listar().length) { fbBackup.textContent = 'Não há trades seus para exportar (o exemplo não conta).'; fbBackup.className = 'feedback erro'; return; }
    try {
      var blob = new Blob(['﻿' + csvAtual()], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = 'diario-day-trade-' + f.hoje() + '.csv';
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      fbBackup.textContent = 'Arquivo gerado. Se o download não começar, use "Copiar CSV".';
      fbBackup.className = 'feedback';
    } catch (err) {
      fbBackup.textContent = 'Download bloqueado aqui. Use "Copiar CSV".';
      fbBackup.className = 'feedback erro';
    }
  });
  $('#dr-copiar').addEventListener('click', function () {
    if (!DT.diario.listar().length) { fbBackup.textContent = 'Não há trades seus para copiar.'; fbBackup.className = 'feedback erro'; return; }
    DT.copiarTexto(csvAtual(), fbBackup, $('#dr-csv-texto'));
  });
  $('#dr-arquivo').addEventListener('change', function () {
    var arq = this.files && this.files[0];
    if (!arq) return;
    var leitor = new FileReader();
    leitor.onload = function () {
      var novos = DT.diario.deCSV(String(leitor.result).replace(/^﻿/, ''));
      if (!novos.length) {
        fbBackup.textContent = 'Nenhum trade válido no arquivo. Use o mesmo formato exportado por aqui (colunas data e bruto obrigatórias).';
        fbBackup.className = 'feedback erro';
        return;
      }
      DT.diario.salvar(DT.diario.listar().concat(novos));
      fbBackup.textContent = novos.length + ' trades importados.';
      fbBackup.className = 'feedback';
    };
    leitor.readAsText(arq, 'utf-8');
    this.value = '';
  });
  $('#dr-apagar').addEventListener('click', function () {
    if (!DT.diario.listar().length) { fbBackup.textContent = 'Não há trades seus para apagar.'; fbBackup.className = 'feedback erro'; return; }
    $('#dr-confirmar').hidden = false;
    this.hidden = true;
  });
  $('#dr-apagar-nao').addEventListener('click', function () {
    $('#dr-confirmar').hidden = true;
    $('#dr-apagar').hidden = false;
  });
  $('#dr-apagar-sim').addEventListener('click', function () {
    DT.diario.salvar([]);
    $('#dr-confirmar').hidden = true;
    $('#dr-apagar').hidden = false;
    fbBackup.textContent = 'Todos os trades foram apagados.';
    fbBackup.className = 'feedback';
  });

  /* ---------- Sincronização ---------- */
  global.addEventListener('dt:trades', render);
  global.addEventListener('storage', function (e) { if (!e.key || e.key === DT.CHAVES.trades) render(); });
  global.addEventListener('resize', desenhar);
  DT.aoMudarTema(desenhar);
  global.addEventListener('dt:pagina', function (e) { if (e.detail === 'diario') render(); });

  agoraPadrao();
  render();
})(window);
