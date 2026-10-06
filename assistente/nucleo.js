/* Núcleo compartilhado pelo site e pelo assistente:
   armazenamento local, formatação em pt-BR, especificações de ativos,
   cálculos de risco/custos/IR e o diário de trades. Sem dependências. */
(function (global) {
  'use strict';

  var DT = global.DT = global.DT || {};

  DT.CHAVES = {
    trades: 'dt.trades.v1',
    config: 'dt.config.v1',
    sessao: 'dt.sessao.v1',
    progresso: 'dt.progresso.v1',
    quiz: 'dt.quiz.v1'
  };

  /* ---------- Armazenamento (localStorage pode falhar: aba anônima, bloqueio) ---------- */
  DT.store = {
    ler: function (chave, padrao) {
      try {
        var v = global.localStorage.getItem(chave);
        return v == null ? padrao : JSON.parse(v);
      } catch (e) {
        return padrao;
      }
    },
    gravar: function (chave, valor) {
      try {
        global.localStorage.setItem(chave, JSON.stringify(valor));
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  DT.emitir = function (nome) {
    try { global.dispatchEvent(new CustomEvent('dt:' + nome)); } catch (e) { /* navegador antigo */ }
  };

  /* ---------- Formatação ---------- */
  function nf(d) {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function dois(n) { return String(n).padStart(2, '0'); }

  DT.fmt = {
    brl: function (n) {
      if (!isFinite(n)) return '—';
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },
    brlSinal: function (n) {
      if (!isFinite(n)) return '—';
      var s = n > 0.004 ? '+' : n < -0.004 ? '−' : '';
      return s + DT.fmt.brl(Math.abs(n));
    },
    num: function (n, d) { return isFinite(n) ? nf(d || 0).format(n) : '—'; },
    pct: function (n, d) { return isFinite(n) ? nf(d == null ? 1 : d).format(n) + '%' : '—'; },
    hoje: function (data) {
      var d = data || new Date();
      return d.getFullYear() + '-' + dois(d.getMonth() + 1) + '-' + dois(d.getDate());
    },
    hora: function (data) {
      var d = data || new Date();
      return dois(d.getHours()) + ':' + dois(d.getMinutes());
    },
    dataBR: function (iso) {
      if (!iso) return '';
      var p = iso.split('-');
      return p[2] + '/' + p[1] + '/' + p[0];
    },
    mmss: function (ms) {
      var s = Math.max(0, Math.ceil(ms / 1000));
      return dois(Math.floor(s / 60)) + ':' + dois(s % 60);
    },
    classe: function (n) { return n > 0.004 ? 'positivo' : n < -0.004 ? 'negativo' : ''; }
  };

  DT.num = function (v) {
    if (typeof v === 'number') return v;
    if (v == null) return NaN;
    var s = String(v).trim().replace(/\s|R\$/g, '');
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    return parseFloat(s);
  };

  DT.escapar = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- Especificações dos ativos mais operados por pessoa física na B3 ----------
     WIN: 1 ponto = R$ 0,20 por contrato; variação mínima 5 pontos (R$ 1,00).
     WDO: 1 ponto = R$ 10,00 por contrato; variação mínima 0,5 ponto (R$ 5,00).
     Ação: preço em R$; tick de R$ 0,01.
     Custos padrão são estimativas (out/2026) e devem ser conferidos na nota de corretagem. */
  DT.ATIVOS = {
    win: { nome: 'Mini-índice (WIN)', curto: 'WIN', valorPonto: 0.20, tick: 5, unidade: 'contrato', unidades: 'contratos', custoTipo: 'unidade' },
    wdo: { nome: 'Mini-dólar (WDO)', curto: 'WDO', valorPonto: 10, tick: 0.5, unidade: 'contrato', unidades: 'contratos', custoTipo: 'unidade' },
    acao: { nome: 'Ação (à vista)', curto: 'Ação', valorPonto: 1, tick: 0.01, unidade: 'ação', unidades: 'ações', custoTipo: 'volume' },
    outro: { nome: 'Outro (informe o valor do ponto)', curto: 'Outro', valorPonto: 1, tick: 0.01, unidade: 'unidade', unidades: 'unidades', custoTipo: 'unidade' }
  };

  DT.CONFIG_PADRAO = {
    capital: 10000,
    riscoPct: 1,
    stopDiarioPct: 3,
    metaDiariaPct: 0,
    maxTrades: 4,
    maxPerdasSeguidas: 2,
    pausaMin: 20,
    horaLimite: '',
    lembretePausaMin: 45,
    som: true,
    /* custo por unidade ida+volta (WIN/WDO/outro, em R$) ou % do volume (ação) */
    custos: { win: 0.50, wdo: 2.40, acao: 0.03, outro: 0 },
    /* derrapagem estimada no total ida+volta, em ticks */
    slippage: { win: 1, wdo: 1, acao: 1, outro: 0 }
  };

  DT.config = function () {
    var salvo = DT.store.ler(DT.CHAVES.config, {}) || {};
    var p = DT.CONFIG_PADRAO;
    var c = {};
    Object.keys(p).forEach(function (k) { c[k] = salvo[k] != null ? salvo[k] : p[k]; });
    c.custos = Object.assign({}, p.custos, salvo.custos || {});
    c.slippage = Object.assign({}, p.slippage, salvo.slippage || {});
    return c;
  };

  DT.salvarConfig = function (c) {
    var ok = DT.store.gravar(DT.CHAVES.config, c);
    DT.emitir('config');
    return ok;
  };

  /* ---------- Cálculos ---------- */
  DT.calc = {
    /* custo total ida+volta (corretagem/emolumentos + derrapagem) para uma operação */
    custo: function (tipo, qtd, entrada, saida, cfg, valorPonto) {
      cfg = cfg || DT.config();
      var a = DT.ATIVOS[tipo] || DT.ATIVOS.outro;
      var vp = tipo === 'outro' && valorPonto ? valorPonto : a.valorPonto;
      var taxa;
      if (a.custoTipo === 'volume') {
        taxa = (Math.abs(entrada) + Math.abs(saida || entrada)) * qtd * (cfg.custos[tipo] || 0) / 100;
      } else {
        taxa = qtd * (cfg.custos[tipo] || 0);
      }
      var derrapagem = (cfg.slippage[tipo] || 0) * a.tick * vp * qtd;
      return { taxa: taxa, derrapagem: derrapagem, total: taxa + derrapagem };
    },

    /* tamanho de posição pelo risco: quantas unidades cabem no risco máximo em R$ */
    posicao: function (o) {
      var cfg = o.cfg || DT.config();
      var a = DT.ATIVOS[o.tipo] || DT.ATIVOS.outro;
      var vp = o.tipo === 'outro' ? (o.valorPonto || 1) : a.valorPonto;
      var entrada = o.entrada, stop = o.stop, alvo = o.alvo;
      var r = { ok: false, avisos: [] };
      if (!isFinite(entrada) || !isFinite(stop) || entrada <= 0) return r;
      var dist = Math.abs(entrada - stop);
      if (dist === 0) { r.avisos.push({ grave: true, txt: 'Stop igual à entrada: não há como medir o risco.' }); return r; }
      var lado = stop < entrada ? 'compra' : 'venda';
      var custo1 = DT.calc.custo(o.tipo, 1, entrada, entrada, cfg, vp).total;
      var riscoUn = dist * vp + custo1;
      var qtd = Math.floor(o.riscoMax / riscoUn);
      if (!isFinite(qtd) || qtd < 0) qtd = 0;
      var alvoValido = isFinite(alvo) && alvo > 0 && (lado === 'compra' ? alvo > entrada : alvo < entrada);
      var ptsAlvo = alvoValido ? Math.abs(alvo - entrada) : NaN;
      var ganhoUn = alvoValido ? ptsAlvo * vp - custo1 : NaN;
      var rrBruto = alvoValido ? ptsAlvo / dist : NaN;
      var rrLiq = alvoValido ? ganhoUn / riscoUn : NaN;
      var acertoMin = alvoValido && ganhoUn > 0 ? riscoUn / (riscoUn + ganhoUn) : NaN;
      var exposicao = qtd * entrada * vp;

      r.ok = true;
      r.lado = lado;
      r.distancia = dist;
      r.ticks = dist / a.tick;
      r.riscoUnidade = riscoUn;
      r.custoUnidade = custo1;
      r.qtd = qtd;
      r.riscoTotal = qtd * riscoUn;
      r.ganhoTotal = alvoValido ? qtd * ganhoUn : NaN;
      r.rrBruto = rrBruto;
      r.rrLiquido = rrLiq;
      r.acertoMinimo = acertoMin;
      r.exposicao = exposicao;
      r.alavancagem = o.capital > 0 ? exposicao / o.capital : NaN;
      r.custoTotal = qtd * custo1;
      r.alvoValido = alvoValido;

      if (qtd === 0) r.avisos.push({ grave: true, txt: 'Com esse stop, nem 1 ' + a.unidade + ' cabe no seu risco. O stop está largo demais para o seu capital: pule este trade.' });
      if (isFinite(alvo) && alvo > 0 && !alvoValido) r.avisos.push({ grave: true, txt: 'O alvo está do lado errado da entrada para uma ' + lado + '.' });
      if (alvoValido && ganhoUn <= 0) r.avisos.push({ grave: true, txt: 'Depois dos custos, acertar o alvo não paga nada. Trade sem sentido.' });
      else if (alvoValido && rrLiq < 1) r.avisos.push({ txt: 'Ganho/risco líquido abaixo de 1: você precisa acertar mais de ' + DT.fmt.pct(acertoMin * 100, 0) + ' das vezes só para empatar.' });
      if (r.ticks < 3 && o.tipo !== 'acao') r.avisos.push({ txt: 'Stop de menos de 3 ticks: a derrapagem e o ruído do book podem acioná-lo sozinhos.' });
      if (r.custoUnidade > 0.25 * dist * vp) r.avisos.push({ txt: 'Os custos somam mais de 25% do risco por ' + a.unidade + '. Operações curtas demais costumam morrer nos custos.' });
      if (r.alavancagem > 5) r.avisos.push({ txt: 'Exposição de ' + DT.fmt.num(r.alavancagem, 1) + '× o seu capital. Uma oscilação de ' + DT.fmt.pct(100 / r.alavancagem, 1) + ' contra você equivale a perder 100% do capital se o stop falhar (gap, leilão, falha de conexão).' });
      return r;
    },

    /* taxa de acerto que zera a expectativa para um dado ganho/risco (em R) e custo (em R) */
    acertoEquilibrio: function (rr, custoR) {
      custoR = custoR || 0;
      return (1 + custoR) / (rr + 1);
    },

    expectativa: function (p, ganho, perda, custo) {
      return p * ganho - (1 - p) * perda - (custo || 0);
    },

    /* IR mensal de day trade (regras vigentes em out/2026):
       alíquota 20% sobre o lucro líquido do mês; prejuízo de day trade só compensa lucro de day trade;
       IRRF de 1% retido pela corretora é deduzido; DARF código 6015; DARF abaixo de R$ 10 acumula. */
    irDayTrade: function (o) {
      var resultado = o.resultado || 0;
      var prejuizoAnterior = Math.max(0, o.prejuizoAnterior || 0);
      var irrf = Math.max(0, o.irrf || 0);
      var irrfAnterior = Math.max(0, o.irrfAnterior || 0);
      var darfAcumulado = Math.max(0, o.darfAcumulado || 0);
      var r = { base: 0, imposto: 0, darf: 0, pagarAgora: false, novoPrejuizo: prejuizoAnterior, irrfSobra: 0, compensado: 0 };
      if (resultado <= 0) {
        r.novoPrejuizo = prejuizoAnterior + Math.abs(resultado);
        r.irrfSobra = irrf + irrfAnterior;
        r.darf = darfAcumulado;
        r.pagarAgora = darfAcumulado >= 10;
        return r;
      }
      r.compensado = Math.min(resultado, prejuizoAnterior);
      r.base = resultado - r.compensado;
      r.novoPrejuizo = prejuizoAnterior - r.compensado;
      r.imposto = r.base * 0.20;
      var deducao = irrf + irrfAnterior;
      var devido = r.imposto - deducao;
      if (devido < 0) { r.irrfSobra = -devido; devido = 0; }
      r.darf = devido + darfAcumulado;
      r.pagarAgora = r.darf >= 10;
      return r;
    }
  };

  /* ---------- Diário de trades ---------- */
  function idNovo() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function carimbo(t) {
    if (t.ts) return t.ts;
    var d = new Date((t.data || DT.fmt.hoje()) + 'T' + (t.hora || '12:00') + ':00');
    return d.getTime();
  }

  DT.diario = {
    listar: function () {
      var l = DT.store.ler(DT.CHAVES.trades, []);
      return Array.isArray(l) ? l : [];
    },
    salvar: function (lista) {
      var ok = DT.store.gravar(DT.CHAVES.trades, lista);
      DT.emitir('trades');
      return ok;
    },
    adicionar: function (t) {
      var lista = DT.diario.listar();
      t.id = t.id || idNovo();
      t.ts = t.ts || carimbo(t);
      lista.push(t);
      var ok = DT.diario.salvar(lista);
      return ok ? t : null;
    },
    remover: function (id) {
      DT.diario.salvar(DT.diario.listar().filter(function (t) { return t.id !== id; }));
    },
    doDia: function (iso) {
      iso = iso || DT.fmt.hoje();
      return DT.diario.listar().filter(function (t) { return t.data === iso && !t.simulado; })
        .sort(function (a, b) { return carimbo(a) - carimbo(b); });
    },
    liquido: function (t) { return (Number(t.bruto) || 0) - (Number(t.custos) || 0); },
    carimbo: carimbo,

    estatisticas: function (lista) {
      var ord = lista.slice().sort(function (a, b) { return carimbo(a) - carimbo(b); });
      var s = {
        n: ord.length, ganhos: 0, perdas: 0, empates: 0, somaGanhos: 0, somaPerdas: 0,
        bruto: 0, custos: 0, liquido: 0, maxDD: 0, maxSeqPerdas: 0, curva: [0],
        quebras: 0, liquidoPlano: 0, liquidoSemPlano: 0, nPlano: 0, nSemPlano: 0, porSetup: {}
      };
      var soma = 0, pico = 0, seq = 0;
      ord.forEach(function (t) {
        var liq = DT.diario.liquido(t);
        s.bruto += Number(t.bruto) || 0;
        s.custos += Number(t.custos) || 0;
        soma += liq;
        s.curva.push(soma);
        if (soma > pico) pico = soma;
        if (pico - soma > s.maxDD) s.maxDD = pico - soma;
        if (liq > 0) { s.ganhos++; s.somaGanhos += liq; seq = 0; }
        else if (liq < 0) { s.perdas++; s.somaPerdas += -liq; seq++; if (seq > s.maxSeqPerdas) s.maxSeqPerdas = seq; }
        else { s.empates++; }
        if (t.seguiuPlano === false) { s.quebras++; s.liquidoSemPlano += liq; s.nSemPlano++; }
        else { s.liquidoPlano += liq; s.nPlano++; }
        var k = (t.setup || 'sem setup').trim() || 'sem setup';
        var g = s.porSetup[k] = s.porSetup[k] || { n: 0, liquido: 0, ganhos: 0 };
        g.n++; g.liquido += liq; if (liq > 0) g.ganhos++;
      });
      s.liquido = soma;
      s.taxaAcerto = s.n ? s.ganhos / s.n : NaN;
      s.ganhoMedio = s.ganhos ? s.somaGanhos / s.ganhos : NaN;
      s.perdaMedia = s.perdas ? s.somaPerdas / s.perdas : NaN;
      s.payoff = s.ganhos && s.perdas ? s.ganhoMedio / s.perdaMedia : NaN;
      s.expectativa = s.n ? soma / s.n : NaN;
      s.fatorLucro = s.somaPerdas > 0 ? s.somaGanhos / s.somaPerdas : NaN;
      return s;
    }
  };

  DT.CSV_COLUNAS = ['data', 'hora', 'ativo', 'tipo', 'lado', 'qtd', 'entrada', 'saida', 'bruto', 'custos', 'setup', 'seguiuPlano', 'emocao', 'nota', 'simulado'];

  DT.diario.paraCSV = function (lista) {
    function cel(v) {
      if (v == null) return '';
      var s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    var linhas = [DT.CSV_COLUNAS.join(';')];
    lista.forEach(function (t) {
      linhas.push(DT.CSV_COLUNAS.map(function (c) {
        var v = t[c];
        if (typeof v === 'boolean') v = v ? 'sim' : 'nao';
        return cel(v);
      }).join(';'));
    });
    return linhas.join('\n');
  };

  DT.diario.deCSV = function (texto) {
    var linhas = texto.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
    if (!linhas.length) return [];
    var sep = linhas[0].indexOf(';') >= 0 ? ';' : ',';
    function dividir(l) {
      var out = [], atual = '', aspas = false;
      for (var i = 0; i < l.length; i++) {
        var ch = l[i];
        if (aspas) {
          if (ch === '"' && l[i + 1] === '"') { atual += '"'; i++; }
          else if (ch === '"') aspas = false;
          else atual += ch;
        } else if (ch === '"') aspas = true;
        else if (ch === sep) { out.push(atual); atual = ''; }
        else atual += ch;
      }
      out.push(atual);
      return out;
    }
    var cab = dividir(linhas[0]).map(function (h) { return h.trim(); });
    var numericas = { qtd: 1, entrada: 1, saida: 1, bruto: 1, custos: 1, emocao: 1 };
    return linhas.slice(1).map(function (l) {
      var cols = dividir(l), t = {};
      cab.forEach(function (h, i) {
        var v = cols[i] == null ? '' : cols[i].trim();
        if (h === 'seguiuPlano' || h === 'simulado') t[h] = /^(sim|true|1)$/i.test(v);
        else if (numericas[h]) t[h] = v === '' ? null : DT.num(v);
        else t[h] = v;
      });
      t.id = idNovo();
      t.ts = carimbo(t);
      return t;
    }).filter(function (t) { return t.data && isFinite(t.bruto); });
  };

  /* ---------- Som curto (só toca depois de um clique do usuário) ---------- */
  var audio = null;
  DT.bip = function (grave) {
    try {
      var C = global.AudioContext || global.webkitAudioContext;
      if (!C) return;
      audio = audio || new C();
      var o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = grave ? 330 : 660;
      g.gain.setValueAtTime(0.0001, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, audio.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.45);
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + 0.5);
    } catch (e) { /* sem áudio */ }
  };
})(window);
