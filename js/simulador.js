/* Simulador de tela: gráfico de 1 minuto gerado por passeio aleatório (sem padrão real),
   com execução, stop, alvo, custos e derrapagem no padrão do mini-índice. */
(function (global) {
  'use strict';

  var DT = global.DT;
  var f = DT.fmt;
  var esc = DT.escapar;
  var doc = global.document;
  function $(s) { return doc.querySelector(s); }

  var TICK = 5, VALOR_PONTO = 0.20, CUSTO_CONTRATO = 0.50, PASSOS_POR_CANDLE = 15, INTERVALO_MS = 380, VISIVEIS = 70;

  var estado = null;
  var timer = null;
  var rodando = false;

  function normal() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function novoPregao() {
    estado = {
      preco: Math.round((138000 + Math.random() * 6000) / TICK) * TICK,
      logVol: 0,
      candles: [],
      atual: null,
      passo: 0,
      posicao: null,
      trades: [],
      resultado: 0,
      custos: 0
    };
    abrirCandle();
    for (var i = 0; i < 60 * PASSOS_POR_CANDLE; i++) avancar(true);
    $('#sim-revelacao').classList.remove('ativa');
    renderTrades();
    renderPainel();
    desenhar();
  }

  function abrirCandle() {
    estado.atual = { o: estado.preco, h: estado.preco, l: estado.preco, c: estado.preco };
    estado.passo = 0;
  }

  /* passeio aleatório com volatilidade que se agrupa, mas sem tendência: média do incremento = 0 */
  function avancar(silencioso) {
    estado.logVol = 0.97 * estado.logVol + 0.17 * normal();
    var sd = 13 * Math.exp(estado.logVol);
    var delta = Math.round(normal() * sd / TICK) * TICK;
    estado.preco += delta;
    var a = estado.atual;
    a.c = estado.preco;
    if (estado.preco > a.h) a.h = estado.preco;
    if (estado.preco < a.l) a.l = estado.preco;
    if (!silencioso) verificarOrdens();
    estado.passo++;
    if (estado.passo >= PASSOS_POR_CANDLE) {
      estado.candles.push(a);
      if (estado.candles.length > 400) estado.candles.shift();
      abrirCandle();
    }
  }

  function verificarOrdens() {
    var p = estado.posicao;
    if (!p) return;
    var px = estado.preco;
    if (p.lado === 1) {
      if (p.stop != null && px <= p.stop) fechar(Math.min(px, p.stop) - TICK, 'stop');
      else if (p.alvo != null && px >= p.alvo) fechar(p.alvo, 'alvo');
    } else {
      if (p.stop != null && px >= p.stop) fechar(Math.max(px, p.stop) + TICK, 'stop');
      else if (p.alvo != null && px <= p.alvo) fechar(p.alvo, 'alvo');
    }
  }

  function abrir(lado) {
    var qtd = Math.max(1, Math.min(50, Math.round(DT.num($('#sim-qtd').value) || 1)));
    var stopPts = DT.num($('#sim-stop').value);
    var alvoPts = DT.num($('#sim-alvo').value);
    var entrada = estado.preco + lado * TICK;
    estado.posicao = {
      lado: lado, qtd: qtd, entrada: entrada,
      stop: stopPts > 0 ? entrada - lado * Math.round(stopPts / TICK) * TICK : null,
      alvo: alvoPts > 0 ? entrada + lado * Math.round(alvoPts / TICK) * TICK : null
    };
  }

  function fechar(preco, motivo) {
    var p = estado.posicao;
    if (!p) return;
    var pts = (preco - p.entrada) * p.lado;
    var bruto = pts * VALOR_PONTO * p.qtd;
    var custo = CUSTO_CONTRATO * p.qtd;
    var liq = bruto - custo;
    estado.resultado += liq;
    estado.custos += custo + TICK * VALOR_PONTO * p.qtd * (motivo === 'alvo' ? 1 : 2);
    var t = { lado: p.lado, qtd: p.qtd, entrada: p.entrada, saida: preco, pts: pts, liq: liq, motivo: motivo };
    estado.trades.push(t);
    estado.posicao = null;
    if ($('#sim-diario').checked) {
      var agora = new Date();
      DT.diario.adicionar({
        data: f.hoje(agora), hora: f.hora(agora), ts: agora.getTime(), ativo: 'WIN simulado', tipo: 'win',
        lado: p.lado === 1 ? 'compra' : 'venda', qtd: p.qtd, entrada: p.entrada, saida: preco,
        bruto: Math.round(bruto * 100) / 100, custos: custo, setup: 'simulador', seguiuPlano: true, simulado: true, nota: 'saída por ' + motivo
      });
    }
    renderTrades();
    if (estado.trades.length >= 5) revelar();
  }

  function comprar() {
    if (!estado.posicao) abrir(1);
    else if (estado.posicao.lado === -1) fechar(estado.preco + TICK, 'manual');
    renderPainel(); desenhar();
  }
  function vender() {
    if (!estado.posicao) abrir(-1);
    else if (estado.posicao.lado === 1) fechar(estado.preco - TICK, 'manual');
    renderPainel(); desenhar();
  }
  function zerar() {
    if (estado.posicao) fechar(estado.preco - estado.posicao.lado * TICK, 'manual');
    renderPainel(); desenhar();
  }

  function revelar() {
    var ts = estado.trades;
    var ganhos = ts.filter(function (t) { return t.liq > 0; }).length;
    $('#sim-revelacao-texto').textContent =
      'Este gráfico é um passeio aleatório. Cada movimento foi sorteado com a mesma chance de subir ou cair, sem tendência, sem suporte e sem resistência de verdade. ' +
      'Você fez ' + ts.length + ' trades, acertou ' + f.pct(ganhos / ts.length * 100, 0) + ' e terminou com ' + f.brlSinal(estado.resultado) + ' líquido, depois de pagar cerca de ' + f.brl(estado.custos) + ' em taxas e derrapagem. ' +
      (estado.resultado > 0 ? 'O lucro aqui foi sorte: não havia nada para prever. ' : 'Sem vantagem, o resultado esperado é perder exatamente os custos. ') +
      'Os padrões que você viu foram ruído. O mercado real tem algum padrão, mas o ruído de curto prazo tem esta cara.';
    $('#sim-revelacao').classList.add('ativa');
  }

  /* ---------- Render ---------- */
  function renderPainel() {
    $('#sim-preco').textContent = f.num(estado.preco);
    var p = estado.posicao;
    var aberto = p ? (estado.preco - p.entrada) * p.lado * VALOR_PONTO * p.qtd : 0;
    var ganhos = estado.trades.filter(function (t) { return t.liq > 0; }).length;
    var saidaEl = $('#sim-saida');
    var itens = [
      ['Posição', p ? (p.lado === 1 ? 'Comprado ' : 'Vendido ') + p.qtd + ' @ ' + f.num(p.entrada) : 'Zerado', ''],
      ['Em aberto', p ? f.brlSinal(aberto) : '—', f.classe(aberto)],
      ['Resultado líquido', f.brlSinal(estado.resultado), f.classe(estado.resultado)],
      ['Trades · acerto', estado.trades.length + ' · ' + (estado.trades.length ? f.pct(ganhos / estado.trades.length * 100, 0) : '—'), '']
    ];
    saidaEl.innerHTML = itens.map(function (i) { return '<div><span>' + esc(i[0]) + '</span><b class="' + i[2] + '">' + esc(i[1]) + '</b></div>'; }).join('');
    $('#sim-comprar').textContent = p && p.lado === -1 ? 'Comprar (zerar)' : 'Comprar';
    $('#sim-vender').textContent = p && p.lado === 1 ? 'Vender (zerar)' : 'Vender';
    $('#sim-zerar').disabled = !p;
  }

  function renderTrades() {
    var tb = $('#sim-trades');
    if (!estado.trades.length) {
      tb.innerHTML = '<tr><td colspan="8" class="pequeno">Nenhum trade ainda. Clique em Comprar ou Vender.</td></tr>';
      return;
    }
    tb.innerHTML = estado.trades.slice().reverse().map(function (t, i) {
      return '<tr><td class="num">' + (estado.trades.length - i) + '</td><td>' + (t.lado === 1 ? 'Compra' : 'Venda') + '</td><td class="num">' + t.qtd + '</td>' +
        '<td class="num">' + f.num(t.entrada) + '</td><td class="num">' + f.num(t.saida) + '</td><td class="num ' + f.classe(t.pts) + '">' + (t.pts > 0 ? '+' : '') + f.num(t.pts) + '</td>' +
        '<td class="num ' + f.classe(t.liq) + '">' + f.brlSinal(t.liq) + '</td><td>' + esc(t.motivo) + '</td></tr>';
    }).join('');
  }

  function desenhar() {
    var c = DT.prepararCanvas($('#sim-canvas'));
    if (!c) return;
    var ctx = c.ctx, W = c.w, H = c.h;
    var m = { e: 8, d: 70, t: 12, b: 12 };
    var pw = W - m.e - m.d, ph = H - m.t - m.b;
    var visiveis = Math.max(20, Math.min(VISIVEIS, Math.floor(pw / 7)));
    var lista = estado.candles.slice(-(visiveis - 1)).concat([estado.atual]);
    var min = Infinity, max = -Infinity;
    lista.forEach(function (k) { if (k.l < min) min = k.l; if (k.h > max) max = k.h; });
    var p = estado.posicao;
    if (p) [p.entrada, p.stop, p.alvo].forEach(function (v) { if (v != null) { if (v < min) min = v; if (v > max) max = v; } });
    var pad = Math.max(20, (max - min) * 0.08);
    min -= pad; max += pad;
    function Y(v) { return m.t + (1 - (v - min) / (max - min)) * ph; }
    var larg = pw / visiveis;
    var alta = DT.cor('--alta'), baixa = DT.cor('--baixa'), linha = DT.cor('--linha'), tinta3 = DT.cor('--tinta-3'), cob = DT.cor('--cobalto'), folha = DT.cor('--folha');

    ctx.font = '11px ' + DT.cor('--f-dado');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = linha; ctx.fillStyle = tinta3; ctx.lineWidth = 1;
    var passo = DT.passoEixo(max - min, 6);
    for (var v = Math.ceil(min / passo) * passo; v <= max; v += passo) {
      ctx.beginPath(); ctx.moveTo(m.e, Math.round(Y(v)) + 0.5); ctx.lineTo(W - m.d, Math.round(Y(v)) + 0.5); ctx.stroke();
      ctx.fillText(f.num(v), W - m.d + 6, Y(v));
    }

    lista.forEach(function (k, i) {
      var x = m.e + i * larg + larg / 2;
      var cor = k.c >= k.o ? alta : baixa;
      ctx.strokeStyle = cor; ctx.fillStyle = cor;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, Y(k.h)); ctx.lineTo(Math.round(x) + 0.5, Y(k.l)); ctx.stroke();
      var y1 = Y(Math.max(k.o, k.c)), y2 = Y(Math.min(k.o, k.c));
      ctx.fillRect(x - larg * 0.35, y1, larg * 0.7, Math.max(1, y2 - y1));
    });

    function nivel(valor, cor, rotulo, tracejado) {
      if (valor == null) return;
      var y = Math.round(Y(valor)) + 0.5;
      ctx.strokeStyle = cor; ctx.lineWidth = 1.2;
      ctx.setLineDash(tracejado ? [5, 4] : []);
      ctx.beginPath(); ctx.moveTo(m.e, y); ctx.lineTo(W - m.d, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cor;
      ctx.fillRect(W - m.d + 2, y - 9, m.d - 4, 18);
      ctx.fillStyle = folha;
      ctx.fillText(rotulo || f.num(valor), W - m.d + 6, y);
    }
    if (p) {
      nivel(p.stop, baixa, 'stop', true);
      nivel(p.alvo, alta, 'alvo', true);
      nivel(p.entrada, cob, 'entrada', false);
    }
    nivel(estado.preco, DT.cor('--tinta'), f.num(estado.preco), false);
  }

  /* ---------- Laço ---------- */
  function tique() {
    var vel = Number($('#sim-vel').value) || 1;
    for (var i = 0; i < vel; i++) avancar(false);
    renderPainel();
    desenhar();
  }
  function iniciar() {
    if (rodando) return;
    rodando = true;
    timer = setInterval(tique, INTERVALO_MS);
    $('#sim-pausar').textContent = 'Pausar';
  }
  function parar() {
    rodando = false;
    clearInterval(timer);
    $('#sim-pausar').textContent = 'Continuar';
  }

  /* opção de registrar no diário */
  var opcao = doc.createElement('label');
  opcao.className = 'campo';
  opcao.style.flexDirection = 'row';
  opcao.style.alignItems = 'center';
  opcao.style.gap = '8px';
  opcao.innerHTML = '<input type="checkbox" id="sim-diario" style="width:18px;height:18px"><span>Registrar trades no diário como simulados</span>';
  $('#sim-saida').parentNode.insertBefore(opcao, $('#sim-saida'));

  $('#sim-comprar').addEventListener('click', comprar);
  $('#sim-vender').addEventListener('click', vender);
  $('#sim-zerar').addEventListener('click', zerar);
  $('#sim-pausar').addEventListener('click', function () { if (rodando) parar(); else iniciar(); });
  $('#sim-novo').addEventListener('click', function () { if (estado.posicao) zerar(); novoPregao(); iniciar(); });
  global.addEventListener('resize', function () { if (estado) desenhar(); });
  DT.aoMudarTema(function () { if (estado) desenhar(); });

  function aoEntrar(nome) {
    if (nome === 'simulador') {
      if (!estado) novoPregao();
      iniciar();
      desenhar();
    } else if (rodando) {
      parar();
    }
  }
  global.addEventListener('dt:pagina', function (e) { aoEntrar(e.detail); });
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden && rodando) parar();
  });
  if (DT.paginaAtual && DT.paginaAtual() === 'simulador') aoEntrar('simulador');
})(window);
