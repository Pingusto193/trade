/* Calculadoras, custo de oportunidade, intervalo de confiança e simulação Monte Carlo. */
(function (global) {
  'use strict';

  var DT = global.DT;
  var f = DT.fmt;
  var esc = DT.escapar;
  var doc = global.document;

  function $(s) { return doc.querySelector(s); }
  function n(id) { return DT.num($('#' + id).value); }
  function saida(el, itens) {
    el.innerHTML = itens.map(function (i) {
      return '<div><span>' + esc(i[0]) + '</span><b class="' + (i[2] || '') + '">' + esc(i[1]) + '</b></div>';
    }).join('');
  }
  function ligar(ids, fn) {
    ids.forEach(function (id) {
      var el = $('#' + id);
      el.addEventListener('input', fn);
      el.addEventListener('change', fn);
    });
    fn();
  }

  /* ---------- Canvas: utilidades compartilhadas ---------- */
  DT.cor = function (token) {
    return getComputedStyle(doc.documentElement).getPropertyValue(token).trim() || '#888';
  };
  DT.prepararCanvas = function (canvas) {
    var dpr = global.devicePixelRatio || 1;
    var w = canvas.clientWidth || canvas.parentNode.clientWidth;
    var h = canvas.clientHeight || canvas.parentNode.clientHeight;
    if (!w || !h) return null;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  };
  DT.passoEixo = function (amplitude, alvoLinhas) {
    var bruto = amplitude / Math.max(1, alvoLinhas);
    var mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    var norm = bruto / mag;
    var passo = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return passo * mag;
  };
  /* redesenhar quando o tema do sistema mudar */
  DT.aoMudarTema = function (fn) {
    try { global.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn); } catch (e) { /* antigo */ }
    try {
      new MutationObserver(fn).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    } catch (e) { /* antigo */ }
  };

  /* ---------- Tamanho da posição ---------- */
  function calcPosicao() {
    var tipo = $('#cp-tipo').value;
    $('#cp-vp-campo').hidden = tipo !== 'outro';
    var capital = n('cp-capital');
    var risco = capital * n('cp-risco') / 100;
    var r = DT.calc.posicao({ tipo: tipo, valorPonto: n('cp-vp'), entrada: n('cp-entrada'), stop: n('cp-stop'), alvo: n('cp-alvo'), riscoMax: risco, capital: capital, cfg: DT.config() });
    var a = DT.ATIVOS[tipo];
    if (!r.ok) {
      saida($('#cp-saida'), [['Quantidade', '—']]);
    } else {
      saida($('#cp-saida'), [
        ['Quantidade', f.num(r.qtd) + ' ' + (r.qtd === 1 ? a.unidade : a.unidades), 'grande'],
        ['Risco total', f.brl(r.riscoTotal), 'negativo'],
        ['Ganho no alvo', r.alvoValido ? f.brl(r.ganhoTotal) : '—', r.ganhoTotal > 0 ? 'positivo' : ''],
        ['Ganho/risco líquido', isFinite(r.rrLiquido) ? f.num(r.rrLiquido, 2) + ' : 1' : '—'],
        ['Acerto mínimo', isFinite(r.acertoMinimo) ? f.pct(r.acertoMinimo * 100, 1) : '—'],
        ['Exposição', f.brl(r.exposicao) + (isFinite(r.alavancagem) ? ' · ' + f.num(r.alavancagem, 1) + '×' : '')]
      ]);
    }
    $('#cp-avisos').innerHTML = r.avisos.map(function (x) { return '<li class="' + (x.grave ? 'grave' : '') + '">' + esc(x.txt) + '</li>'; }).join('');
  }
  $('#cp-tipo').addEventListener('change', function () {
    var ex = { win: [140000, 139850, 140300], wdo: [5400, 5392, 5416], acao: [32.5, 32.2, 33.1], outro: [100, 99, 102] }[this.value];
    $('#cp-entrada').value = ex[0]; $('#cp-stop').value = ex[1]; $('#cp-alvo').value = ex[2];
  });
  ligar(['cp-tipo', 'cp-vp', 'cp-capital', 'cp-risco', 'cp-entrada', 'cp-stop', 'cp-alvo'], calcPosicao);
  global.addEventListener('dt:config', calcPosicao);

  /* ---------- Expectativa ---------- */
  ligar(['ex-acerto', 'ex-ganho', 'ex-perda', 'ex-custo', 'ex-n'], function () {
    var p = n('ex-acerto') / 100, g = n('ex-ganho'), l = n('ex-perda'), c = n('ex-custo') || 0, qt = n('ex-n') || 0;
    if (![p, g, l].every(isFinite)) return;
    var e = DT.calc.expectativa(p, g, l, c);
    var mes = e * qt;
    var mesLiq = mes > 0 ? mes * 0.8 : mes;
    var minimo = (l + c) / (g + l);
    var bruto = DT.calc.expectativa(p, g, l, 0);
    saida($('#ex-saida'), [
      ['Por trade', f.brlSinal(e), f.classe(e) + ' grande'],
      ['Por mês, antes do IR', f.brlSinal(mes), f.classe(mes)],
      ['Por mês, depois do IR', f.brlSinal(mesLiq), f.classe(mesLiq)],
      ['Payoff', l > 0 ? f.num(g / l, 2) : '—'],
      ['Acerto mínimo', f.pct(minimo * 100, 1)],
      ['Custos no mês', f.brl(c * qt)]
    ]);
    var txt;
    if (e < 0 && bruto > 0) txt = 'Antes dos custos a estratégia ganharia ' + f.brl(bruto) + ' por trade. Os custos de ' + f.brl(c) + ' transformam isso em perda. Menos trades, alvos maiores ou custo menor mudam o resultado; insistir não muda.';
    else if (e < 0) txt = 'Expectativa negativa mesmo antes dos custos. Com esses números, cada trade a mais aumenta a perda esperada.';
    else txt = 'Expectativa positiva de ' + f.brl(e) + ' por trade. Só confie nesse número se ele vier de pelo menos algumas centenas de trades reais, com custos de verdade. Com a taxa de acerto ' + f.pct(p * 100, 0) + ', uma queda de ' + f.num((p - minimo) * 100, 1) + ' ponto(s) percentual(is) já zera a vantagem.';
    $('#ex-texto').textContent = txt;
  });

  /* ---------- IR do mês ---------- */
  ligar(['ir-res', 'ir-prej', 'ir-irrf', 'ir-acum'], function () {
    var r = DT.calc.irDayTrade({ resultado: n('ir-res') || 0, prejuizoAnterior: n('ir-prej') || 0, irrf: n('ir-irrf') || 0, darfAcumulado: n('ir-acum') || 0 });
    saida($('#ir-saida'), [
      ['DARF 6015', r.pagarAgora ? f.brl(r.darf) : 'Não pagar agora', 'grande'],
      ['Base de cálculo', f.brl(r.base)],
      ['Imposto (20%)', f.brl(r.imposto)],
      ['Prejuízo compensado', f.brl(r.compensado)],
      ['Prejuízo a levar', f.brl(r.novoPrejuizo)],
      ['IRRF a compensar depois', f.brl(r.irrfSobra)]
    ]);
    var t;
    if ((n('ir-res') || 0) <= 0) t = 'Mês sem lucro: não há imposto. Declare o prejuízo de ' + f.brl(r.novoPrejuizo) + ' para abater de lucros futuros de day trade.';
    else if (r.pagarAgora) t = 'Pague o DARF 6015 de ' + f.brl(r.darf) + ' até o último dia útil do mês seguinte. Atraso: multa de 0,33% ao dia (até 20%) mais Selic.';
    else if (r.darf > 0) t = 'O DARF de ' + f.brl(r.darf) + ' é menor que R$ 10. Não pague agora: some ao imposto do próximo mês.';
    else t = 'Nada a pagar: o prejuízo acumulado ou o IRRF cobriram o imposto.';
    $('#ir-texto').textContent = t;
  });

  /* ---------- Custo mensal ---------- */
  var CDI_PADRAO = 13.65;
  ligar(['cm-tipo', 'cm-trades', 'cm-contratos', 'cm-dias', 'cm-capital'], function () {
    var tipo = $('#cm-tipo').value;
    var cfg = DT.config();
    var a = DT.ATIVOS[tipo];
    var c = DT.calc.custo(tipo, n('cm-contratos') || 0, 0, 0, cfg);
    var porTrade = c.total;
    var dia = porTrade * (n('cm-trades') || 0);
    var mes = dia * (n('cm-dias') || 0);
    var capital = n('cm-capital');
    var cdiMes = Math.pow(1 + CDI_PADRAO / 100, 1 / 12) - 1;
    saida($('#cm-saida'), [
      ['Por mês', f.brl(mes), 'grande negativo'],
      ['Por dia', f.brl(dia)],
      ['Por trade', f.brl(porTrade)],
      ['% do capital ao mês', capital > 0 ? f.pct(mes / capital * 100, 2) : '—'],
      ['Em meses de CDI', capital > 0 ? f.num(mes / (capital * cdiMes), 1) : '—'],
      ['Taxas vs. derrapagem', f.brl(c.taxa) + ' + ' + f.brl(c.derrapagem)]
    ]);
    void a;
  });
  global.addEventListener('dt:config', function () { $('#cm-tipo').dispatchEvent(new Event('change')); });

  /* ---------- Recuperação de perda ---------- */
  ligar(['dd-perda', 'dd-mes'], function () {
    var d = Math.min(99.9, Math.max(0, n('dd-perda') || 0)) / 100;
    var m = (n('dd-mes') || 0) / 100;
    var precisa = 1 / (1 - d) - 1;
    var meses = m > 0 ? Math.log(1 / (1 - d)) / Math.log(1 + m) : Infinity;
    saida($('#dd-saida'), [
      ['Ganho necessário', f.pct(precisa * 100, 1), 'grande'],
      ['Meses para voltar', isFinite(meses) ? f.num(meses, 1) : 'nunca'],
      ['Capital restante de R$ 10 mil', f.brl(10000 * (1 - d))]
    ]);
  });

  /* ---------- Intervalo de confiança (Wilson) ---------- */
  function wilson(g, total) {
    var z = 1.96, p = g / total, z2 = z * z;
    var centro = (p + z2 / (2 * total)) / (1 + z2 / total);
    var margem = z * Math.sqrt(p * (1 - p) / total + z2 / (4 * total * total)) / (1 + z2 / total);
    return [Math.max(0, centro - margem), Math.min(1, centro + margem)];
  }
  ligar(['am-g', 'am-n', 'am-min'], function () {
    var g = n('am-g'), total = n('am-n'), min = n('am-min') / 100;
    if (!(total > 0) || !(g >= 0) || g > total) {
      saida($('#am-saida'), [['Taxa medida', '—']]);
      $('#am-texto').textContent = 'Os vencedores precisam estar entre 0 e o total de trades.';
      return;
    }
    var iv = wilson(g, total);
    var pNec = Math.ceil(1.96 * 1.96 * 0.25 / 0.0025);
    saida($('#am-saida'), [
      ['Taxa medida', f.pct(g / total * 100, 1), 'grande'],
      ['Faixa provável (95%)', f.pct(iv[0] * 100, 0) + ' a ' + f.pct(iv[1] * 100, 0)],
      ['Trades para ±5 p.p.', '≈ ' + f.num(pNec)]
    ]);
    var t;
    if (iv[0] > min) t = 'Mesmo no pior caso provável (' + f.pct(iv[0] * 100, 0) + '), sua taxa fica acima dos ' + f.pct(min * 100, 0) + ' que você precisa. Há evidência estatística, desde que os trades tenham seguido a mesma regra.';
    else if (iv[1] < min) t = 'Mesmo no melhor caso provável (' + f.pct(iv[1] * 100, 0) + '), sua taxa fica abaixo dos ' + f.pct(min * 100, 0) + ' necessários. Os dados indicam que a estratégia não paga.';
    else t = 'Inconclusivo: a taxa real pode estar entre ' + f.pct(iv[0] * 100, 0) + ' e ' + f.pct(iv[1] * 100, 0) + ', e ' + f.pct(min * 100, 0) + ' está dentro dessa faixa. Com ' + total + ' trades você ainda não sabe se tem vantagem.';
    $('#am-texto').textContent = t;
  });

  /* ---------- Módulo 4: amostra rápida ---------- */
  ligar(['amostra-p', 'amostra-n'], function () {
    var p = n('amostra-p') / 100, total = n('amostra-n');
    if (!(p > 0 && p < 1) || !(total > 0)) { $('#amostra-res').textContent = 'Informe uma taxa entre 1% e 99% e o número de trades.'; return; }
    var iv = wilson(Math.round(p * total), total);
    $('#amostra-res').textContent = 'Com ' + f.num(total) + ' trades e ' + f.pct(p * 100, 1) + ' de acerto, a taxa real provavelmente está entre ' + f.pct(iv[0] * 100, 0) + ' e ' + f.pct(iv[1] * 100, 0) + '. ' + (iv[1] - iv[0] > 0.15 ? 'É uma faixa larga demais para decidir qualquer coisa.' : 'Já é uma estimativa útil, se as regras não mudaram no meio.');
  });

  /* ---------- Módulo 9: custo de oportunidade ---------- */
  ligar(['op-capital', 'op-cdi', 'op-ir', 'op-horas', 'op-dias', 'op-hora'], function () {
    var capital = n('op-capital') || 0, cdi = (n('op-cdi') || 0) / 100, ir = (n('op-ir') || 0) / 100;
    var horas = (n('op-horas') || 0) * (n('op-dias') || 0), valorHora = n('op-hora') || 0;
    var cdiMes = Math.pow(1 + cdi, 1 / 12) - 1;
    var cdiLiq = capital * cdiMes * (1 - ir);
    var tempo = horas * valorHora;
    var precisaLiq = cdiLiq + tempo;
    var precisaBruto = precisaLiq / 0.8;
    var pctMes = capital > 0 ? precisaBruto / capital : NaN;
    var pctAno = isFinite(pctMes) ? Math.pow(1 + pctMes, 12) - 1 : NaN;
    saida($('#op-saida'), [
      ['DT precisa render por mês', f.brl(precisaBruto), 'grande'],
      ['Em % do capital ao mês', f.pct(pctMes * 100, 2)],
      ['Equivale a, por ano', isFinite(pctAno) ? f.pct(pctAno * 100, 0) : '—'],
      ['CDI líquido no mês', f.brl(cdiLiq)],
      ['Valor das suas horas', f.brl(tempo)],
      ['Horas por mês', f.num(horas)]
    ]);
    $('#op-texto').textContent = 'Para valer a pena, o day trade precisa gerar ' + f.brl(precisaBruto) + ' por mês antes do IR de 20% (' + f.pct(pctMes * 100, 1) + ' do capital, todo mês). Isso equivale a ' + (isFinite(pctAno) ? f.pct(pctAno * 100, 0) : '—') + ' ao ano com juros compostos. No estudo da FGV, 97% de quem persistiu não chegou nem a zero.';
  });

  /* ---------- Monte Carlo ---------- */
  var mcUltimo = null;
  function aleatorio(semente) {
    var a = semente >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function percentil(ordenado, q) {
    var i = (ordenado.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
    return ordenado[lo] + (ordenado[hi] - ordenado[lo]) * (i - lo);
  }

  function rodarMonteCarlo() {
    var p = Math.min(0.99, Math.max(0.01, n('mc-acerto') / 100));
    var rr = Math.max(0.01, n('mc-rr'));
    var c = Math.max(0, n('mc-custo') || 0);
    var r = Math.min(0.5, Math.max(0.001, n('mc-risco') / 100));
    var porDia = Math.max(1, Math.round(n('mc-dia') || 1));
    var dias = Math.min(1000, Math.max(1, Math.round(n('mc-dias') || 1)));
    var capital = Math.max(1, n('mc-capital') || 10000);
    var ruinaNivel = capital * (1 - Math.min(99, Math.max(1, n('mc-ruina') || 50)) / 100);
    var SIMS = 1000;
    var rnd = aleatorio(Date.now());
    var porDiaCap = [];
    for (var d = 0; d <= dias; d++) porDiaCap.push(new Float64Array(SIMS));
    var finais = [], ruinas = 0, prejuizo = 0, ddMax = [], amostras = [];
    var ganho = r * (rr - c), perda = r * (1 + c);
    for (var s = 0; s < SIMS; s++) {
      var k = capital, pico = capital, dd = 0, arruinado = false;
      porDiaCap[0][s] = k;
      var guardar = s < 14 ? [k] : null;
      for (var dia = 1; dia <= dias; dia++) {
        if (!arruinado) {
          for (var t = 0; t < porDia; t++) {
            k = rnd() < p ? k * (1 + ganho) : k * (1 - perda);
            if (k > pico) pico = k;
            if ((pico - k) / pico > dd) dd = (pico - k) / pico;
            if (k <= ruinaNivel) { arruinado = true; break; }
          }
        }
        porDiaCap[dia][s] = k;
        if (guardar) guardar.push(k);
      }
      if (arruinado) ruinas++;
      if (k < capital) prejuizo++;
      finais.push(k);
      ddMax.push(dd);
      if (guardar) amostras.push(guardar);
    }
    var bandas = porDiaCap.map(function (arr) {
      var o = Array.prototype.slice.call(arr).sort(function (a, b) { return a - b; });
      return [percentil(o, 0.05), percentil(o, 0.25), percentil(o, 0.5), percentil(o, 0.75), percentil(o, 0.95)];
    });
    finais.sort(function (a, b) { return a - b; });
    ddMax.sort(function (a, b) { return a - b; });
    var exp = p * (rr - c) - (1 - p) * (1 + c);
    var mediana = percentil(finais, 0.5);
    var ganhoMed = mediana - capital;
    mcUltimo = { bandas: bandas, amostras: amostras, capital: capital, dias: dias };
    saida($('#mc-saida'), [
      ['Expectativa por trade', f.num(exp, 3) + ' R', exp > 0 ? 'positivo' : 'negativo'],
      ['Capital mediano no fim', f.brl(mediana), 'grande'],
      ['Mediano depois do IR (aprox.)', f.brl(ganhoMed > 0 ? capital + ganhoMed * 0.8 : mediana)],
      ['Contas no prejuízo', f.pct(prejuizo / SIMS * 100, 1), prejuizo / SIMS > 0.5 ? 'negativo' : ''],
      ['Contas arruinadas', f.pct(ruinas / SIMS * 100, 1), ruinas > 0 ? 'negativo' : ''],
      ['Pior 5% termina com', f.brl(percentil(finais, 0.05))],
      ['Melhor 5% termina com', f.brl(percentil(finais, 0.95))],
      ['Queda máxima mediana', f.pct(percentil(ddMax, 0.5) * 100, 1)]
    ]);
    $('#mc-info').textContent = f.num(SIMS) + ' contas × ' + f.num(porDia * dias) + ' trades cada';
    var txt;
    if (exp <= 0) {
      txt = 'Com expectativa negativa, o tempo trabalha contra: ' + f.pct(prejuizo / SIMS * 100, 0) + ' das contas terminam no prejuízo. Algumas terminam no lucro só por sorte, e são elas que postam o print.';
    } else {
      txt = 'Mesmo com expectativa positiva de ' + f.num(exp, 3) + ' R por trade, ' + f.pct(prejuizo / SIMS * 100, 1) + ' das contas terminam no prejuízo e a queda máxima mediana no caminho é de ' + f.pct(percentil(ddMax, 0.5) * 100, 0) + '. Lembre que aqui a vantagem é garantida por construção; na vida real, você não sabe se ela existe.';
    }
    $('#mc-texto').textContent = txt;
    desenharMonteCarlo();
  }

  function desenharMonteCarlo() {
    if (!mcUltimo) return;
    var c = DT.prepararCanvas($('#mc-canvas'));
    if (!c) return;
    var ctx = c.ctx, W = c.w, H = c.h;
    var m = { e: 72, d: 12, t: 12, b: 28 };
    var pw = W - m.e - m.d, ph = H - m.t - m.b;
    var b = mcUltimo.bandas, dias = mcUltimo.dias;
    var min = Infinity, max = -Infinity;
    b.forEach(function (x) { if (x[0] < min) min = x[0]; if (x[4] > max) max = x[4]; });
    mcUltimo.amostras.forEach(function (a) { a.forEach(function (v) { if (v < min) min = v; if (v > max) max = v; }); });
    min = Math.min(min, mcUltimo.capital); max = Math.max(max, mcUltimo.capital);
    var pad = (max - min) * 0.05 || 1;
    min -= pad; max += pad;
    function X(d) { return m.e + d / dias * pw; }
    function Y(v) { return m.t + (1 - (v - min) / (max - min)) * ph; }
    var tinta3 = DT.cor('--tinta-3'), linha = DT.cor('--linha'), cob = DT.cor('--cobalto'), baixa = DT.cor('--baixa');

    ctx.font = '11px ' + DT.cor('--f-dado');
    ctx.fillStyle = tinta3;
    ctx.strokeStyle = linha;
    ctx.lineWidth = 1;
    var passo = DT.passoEixo(max - min, 5);
    for (var v = Math.ceil(min / passo) * passo; v <= max; v += passo) {
      ctx.beginPath(); ctx.moveTo(m.e, Y(v) + 0.5); ctx.lineTo(W - m.d, Y(v) + 0.5); ctx.stroke();
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('R$ ' + f.num(v / 1000, v >= 10000 || passo >= 1000 ? 0 : 1) + ' mil', m.e - 8, Y(v));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var pX = DT.passoEixo(dias, 5);
    for (var d = 0; d <= dias; d += pX) {
      var rot = d === 0 ? 'início' : d + ' preg.';
      var meia = ctx.measureText(rot).width / 2;
      ctx.textAlign = X(d) + meia > W - 2 ? 'right' : 'center';
      ctx.fillText(rot, ctx.textAlign === 'right' ? W - 2 : X(d), H - m.b + 8);
    }

    function faixa(i0, i1, alfa) {
      ctx.globalAlpha = alfa;
      ctx.fillStyle = cob;
      ctx.beginPath();
      b.forEach(function (x, d) { if (d === 0) ctx.moveTo(X(d), Y(x[i1])); else ctx.lineTo(X(d), Y(x[i1])); });
      for (var d2 = b.length - 1; d2 >= 0; d2--) ctx.lineTo(X(d2), Y(b[d2][i0]));
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    faixa(0, 4, 0.13);
    faixa(1, 3, 0.28);

    ctx.strokeStyle = tinta3; ctx.lineWidth = 1; ctx.globalAlpha = 0.45;
    mcUltimo.amostras.forEach(function (a) {
      ctx.beginPath();
      a.forEach(function (v, d) { if (d === 0) ctx.moveTo(X(d), Y(v)); else ctx.lineTo(X(d), Y(v)); });
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    ctx.setLineDash([5, 4]); ctx.strokeStyle = baixa; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(m.e, Y(mcUltimo.capital)); ctx.lineTo(W - m.d, Y(mcUltimo.capital)); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = cob; ctx.lineWidth = 2.5;
    ctx.beginPath();
    b.forEach(function (x, d) { if (d === 0) ctx.moveTo(X(d), Y(x[2])); else ctx.lineTo(X(d), Y(x[2])); });
    ctx.stroke();
    var fim = b[b.length - 1][2];
    ctx.fillStyle = cob;
    ctx.beginPath(); ctx.arc(X(dias), Y(fim), 4, 0, Math.PI * 2); ctx.fill();
  }

  $('#mc-rodar').addEventListener('click', rodarMonteCarlo);
  global.addEventListener('resize', desenharMonteCarlo);
  DT.aoMudarTema(desenharMonteCarlo);
  global.addEventListener('dt:pagina', function (e) {
    if (e.detail === 'montecarlo') { if (!mcUltimo) rodarMonteCarlo(); else desenharMonteCarlo(); }
  });
  if (DT.paginaAtual && DT.paginaAtual() === 'montecarlo') rodarMonteCarlo();
})(window);
