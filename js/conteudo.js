/* Conteúdo em dados: perguntas do teste e termos do glossário. */
(function (global) {
  'use strict';

  var DT = global.DT;

  DT.QUIZ = [
    {
      p: 'No estudo da FGV com mini-índice (2013–2015), que parcela de quem persistiu mais de 300 pregões perdeu dinheiro?',
      o: ['Cerca de 50%', 'Cerca de 75%', '97%', '10%'],
      c: 2,
      e: 'Dos 19.646 iniciantes acompanhados, 97% dos que persistiram mais de 300 pregões perderam dinheiro, e só 1,1% ganhou mais que um salário mínimo.'
    },
    {
      p: 'Você tem R$ 20.000 e arrisca 1% por trade. No WIN, o stop é de 200 pontos e custos + derrapagem somam R$ 1,50 por contrato. Quantos contratos?',
      o: ['2', '4', '5', '10'],
      c: 1,
      e: 'Risco de R$ 200. Por contrato: 200 × R$ 0,20 = R$ 40 + R$ 1,50 = R$ 41,50. 200 ÷ 41,50 = 4,8, arredondado para baixo: 4 contratos.'
    },
    {
      p: 'Com ganho/risco de 2 para 1, sem custos, qual a taxa de acerto mínima para empatar?',
      o: ['25%', '33,3%', '50%', '66,7%'],
      c: 1,
      e: 'Acerto mínimo = 1 ÷ (ganho/risco + 1) = 1 ÷ 3 = 33,3%. Com custos, sobe.'
    },
    {
      p: 'Sua conta perdeu 50%. Quanto precisa ganhar para voltar ao valor inicial?',
      o: ['50%', '75%', '100%', '150%'],
      c: 2,
      e: 'De R$ 10.000 para R$ 5.000: para voltar a R$ 10.000 é preciso dobrar, +100%.'
    },
    {
      p: 'Como é tributado o lucro de day trade (regras de out/2026)?',
      o: ['15%, com isenção para vendas até R$ 20 mil', '20%, sem isenção', 'Tabela regressiva de 22,5% a 15%', 'É isento'],
      c: 1,
      e: '20% sobre o lucro líquido mensal, sem a isenção de R$ 20 mil, que vale só para operações comuns com ações.'
    },
    {
      p: 'Qual o código do DARF de renda variável (day trade)?',
      o: ['6015', '0190', '8523', '3208'],
      c: 0,
      e: 'DARF 6015, pago até o último dia útil do mês seguinte ao lucro.'
    },
    {
      p: 'Prejuízo de day trade pode ser compensado com:',
      o: ['Qualquer lucro em bolsa', 'Só lucro de day trade', 'Só lucro do mesmo mês', 'Não pode ser compensado'],
      c: 1,
      e: 'Prejuízo de day trade só abate lucro de day trade, em qualquer mês futuro, desde que você declare.'
    },
    {
      p: 'O que pode acontecer com uma ordem stop-limite num gap forte contra você?',
      o: ['Executa sempre no preço do gatilho', 'Pode não executar, e você continua posicionado', 'Vira ordem a mercado automaticamente', 'A B3 cancela e devolve o prejuízo'],
      c: 1,
      e: 'Se o preço passa direto do limite, a ordem limitada fica no book sem executar. A perda continua aumentando.'
    },
    {
      p: 'A margem de day trade de um WIN é de algumas centenas de reais. Isso significa que:',
      o: ['O máximo que você perde é a margem', 'É um desconto da B3', 'A exposição é de dezenas de milhares de reais e a perda pode passar da margem', 'A corretora cobre o prejuízo'],
      c: 2,
      e: 'Um WIN a 140.000 pontos expõe R$ 28.000. Margem é garantia, não limite de perda.'
    },
    {
      p: 'Sua taxa de acerto está perto de 50%. Quantos trades, aproximadamente, para medi-la com margem de ±5 pontos percentuais (95% de confiança)?',
      o: ['30', '100', 'Cerca de 400', '10'],
      c: 2,
      e: '1,96 × √(0,25 ÷ n) = 0,05 dá n ≈ 384. Com 30 trades, a margem é de quase ±18 pontos.'
    },
    {
      p: 'O efeito disposição é a tendência de:',
      o: ['Vender ganhadores cedo e segurar perdedores', 'Comprar só ações de empresas conhecidas', 'Operar mais às segundas-feiras', 'Seguir a opinião da maioria'],
      c: 0,
      e: 'Documentado por Shefrin e Statman e por Odean (1998). No day trade, aparece como afastar o stop e encurtar o alvo.'
    },
    {
      p: 'Quanto vale 1 ponto de mini-dólar (WDO) por contrato?',
      o: ['R$ 0,20', 'R$ 1,00', 'R$ 10,00', 'R$ 50,00'],
      c: 2,
      e: 'R$ 10 por ponto. A variação mínima de 0,5 ponto vale R$ 5 por contrato.'
    },
    {
      p: 'Você bateu o stop diário às 10h40. O que o plano manda fazer?',
      o: ['Aumentar a mão para recuperar', 'Trocar para outro ativo', 'Encerrar o dia', 'Mudar o tempo gráfico'],
      c: 2,
      e: 'Stop diário existe para o dia ruim não virar mês ruim. As outras opções são formas de revanche.'
    },
    {
      p: 'Um vendedor de curso mostra prints de ganhos. Qual a pergunta mais útil?',
      o: ['Qual corretora você usa?', 'Qual o histórico completo e auditado, com perdas, custos e IR, e quanto da sua renda vem dos alunos?', 'Quantos seguidores você tem?', 'Qual indicador você usa?'],
      c: 1,
      e: 'Print é amostra escolhida. Só o histórico completo mostra a expectativa real.'
    },
    {
      p: 'A VWAP é:',
      o: ['A média simples dos últimos 20 candles', 'O preço médio ponderado pelo volume desde a abertura', 'Um indicador de volatilidade', 'O volume total do dia'],
      c: 1,
      e: 'Σ(preço × volume) ÷ Σ volume, recalculada a cada negócio. Instituições usam como referência de execução.'
    },
    {
      p: 'Com R$ 10.000 e 3 horas por dia na tela, o custo de oportunidade do day trade inclui:',
      o: ['Só as taxas da B3', 'O rendimento que o capital teria no CDI e o valor das suas horas', 'Nada, se a corretagem for zero', 'Só o imposto de renda'],
      c: 1,
      e: 'Com a Selic em 13,75%, o capital renderia cerca de 1,07% ao mês sem risco de mercado, e as horas têm valor em trabalho ou estudo.'
    }
  ];

  DT.GLOSSARIO = [
    ['Agressão', 'Execução que aceita o preço do outro lado do book. Quem compra pagando o melhor preço de venda agride a venda.'],
    ['Ajuste diário', 'Liquidação diária de ganhos e perdas em contratos futuros mantidos de um dia para o outro. Não afeta quem zera no mesmo dia.'],
    ['Alavancagem', 'Exposição maior que o capital próprio. Um WIN de R$ 28 mil com margem de R$ 155 é uma alavancagem de cerca de 180 vezes.'],
    ['Alvo (stop gain)', 'Preço onde você realiza o lucro, definido antes da entrada.'],
    ['Ask (oferta de venda)', 'Menor preço pelo qual alguém aceita vender agora.'],
    ['ATR', 'Average True Range: amplitude média dos candles. Usado para dimensionar stops pela volatilidade.'],
    ['Backtest', 'Teste de uma regra em dados passados. Só vale com regras fixadas antes, custos incluídos e validação fora da amostra.'],
    ['Bid (oferta de compra)', 'Maior preço que alguém aceita pagar agora.'],
    ['Book de ofertas', 'Lista das ordens limitadas de compra e venda aguardando execução, por preço e quantidade.'],
    ['Candle', 'Representação de abertura, máxima, mínima e fechamento de um período.'],
    ['Circuit breaker', 'Interrupção de todo o mercado quando o Ibovespa cai 10%, 15% ou 20% no dia.'],
    ['Corretagem', 'Tarifa cobrada pela corretora por ordem executada. Muitas zeram em minicontratos.'],
    ['Custo de oportunidade', 'O que você deixa de ganhar ao escolher uma alternativa. No day trade: o CDI do capital e o valor das suas horas.'],
    ['DARF 6015', 'Guia de pagamento do imposto de renda sobre ganhos em renda variável, inclusive day trade.'],
    ['Data snooping', 'Testar tantas regras nos mesmos dados que alguma parece funcionar só por acaso.'],
    ['Day trade', 'Compra e venda do mesmo ativo no mesmo dia, pela mesma corretora.'],
    ['Derrapagem (slippage)', 'Diferença entre o preço desejado e o preço executado.'],
    ['Drawdown', 'Queda do capital desde o último pico. O máximo drawdown mede o pior trecho.'],
    ['Efeito disposição', 'Tendência de realizar lucros cedo e segurar prejuízos.'],
    ['Emolumentos', 'Tarifas que a B3 cobra por negociação e registro, em toda operação.'],
    ['Expectativa matemática', 'Resultado médio esperado por trade: acerto × ganho médio − erro × perda média − custos.'],
    ['Fator de lucro', 'Soma dos ganhos dividida pela soma das perdas. Abaixo de 1, a estratégia perde dinheiro.'],
    ['FGC', 'Fundo Garantidor de Créditos: cobre até R$ 250 mil por CPF por instituição em CDB, LCI e LCA. Não cobre bolsa.'],
    ['Gap', 'Salto de preço sem negócios no meio, comum na abertura ou após notícias. Stops podem executar muito pior.'],
    ['HFT', 'High-frequency trading: robôs que operam em microssegundos, geralmente com custo menor que o seu.'],
    ['IFR (RSI)', 'Índice de Força Relativa, de 0 a 100. Acima de 70 é chamado de sobrecompra; abaixo de 30, sobrevenda.'],
    ['IRRF (dedo-duro)', 'Retenção de 1% sobre o resultado positivo de day trade, feita pela corretora e descontada do DARF.'],
    ['Leilão', 'Período em que o pregão contínuo para e as ofertas se acumulam até um preço único. Ocorre na abertura, no fechamento e em oscilações fortes.'],
    ['Liquidez', 'Facilidade de comprar ou vender sem mover o preço. WIN e WDO são os contratos mais líquidos da B3.'],
    ['Margem de garantia', 'Valor que a corretora bloqueia para você manter a posição. Não é o limite da perda.'],
    ['Market maker', 'Formador de mercado: participante que mantém ofertas dos dois lados e ganha com o spread.'],
    ['Média móvel', 'Média dos últimos N preços, recalculada a cada candle. Simples (MMA) ou exponencial (MME).'],
    ['Mini-dólar (WDO)', 'Contrato futuro de US$ 10 mil. 1 ponto vale R$ 10; vence no primeiro dia útil de cada mês.'],
    ['Mini-índice (WIN)', 'Contrato futuro de Ibovespa. 1 ponto vale R$ 0,20; vence nos meses pares, na quarta-feira mais próxima do dia 15.'],
    ['OCO', 'One cancels the other: par de ordens (stop e alvo) em que a execução de uma cancela a outra.'],
    ['Ordem a mercado', 'Executa imediatamente no melhor preço disponível.'],
    ['Ordem limitada', 'Executa só no preço definido ou melhor.'],
    ['Overfitting', 'Ajuste excessivo de uma estratégia aos dados do passado, que faz ela falhar nos dados novos.'],
    ['Overtrading', 'Operar demais. Multiplica custos e decisões ruins.'],
    ['Payoff', 'Ganho médio dividido pela perda média.'],
    ['Pavio (sombra)', 'Parte fina do candle, entre o corpo e a máxima ou a mínima.'],
    ['Pregão', 'Sessão de negociação de um dia na bolsa.'],
    ['R', 'Unidade de risco: o valor em reais que você perde se o stop for atingido.'],
    ['Risco de ruína', 'Probabilidade de a conta cair até um nível em que você não consegue ou não deve continuar.'],
    ['Rompimento', 'Quando o preço passa de um suporte ou resistência. Falso rompimento: passa e volta.'],
    ['Scalping', 'Day trade de duração muito curta, de segundos a poucos minutos, buscando poucos ticks.'],
    ['Setup', 'Conjunto escrito de regras de contexto, entrada, stop, alvo e invalidação.'],
    ['Spoofing', 'Colocar ordens sem intenção de executá-las, para enganar quem lê o book. É proibido.'],
    ['Spread', 'Diferença entre o melhor preço de venda e o melhor de compra.'],
    ['Stop diário', 'Perda máxima aceita num dia. Atingida, o dia acaba.'],
    ['Stop loss', 'Ordem que encerra a posição quando o preço atinge um nível de perda definido.'],
    ['Suporte e resistência', 'Regiões onde o preço parou de cair (suporte) ou de subir (resistência) no passado.'],
    ['Swing trade', 'Operação mantida por dias ou semanas. IR de 15%.'],
    ['Tape reading', 'Leitura do fluxo de negócios (times & trades) e do book para tentar antecipar movimentos.'],
    ['Taxa de acerto', 'Percentual de trades com resultado positivo. Sozinha, não diz se a estratégia ganha dinheiro.'],
    ['Tick', 'Menor variação de preço permitida: 5 pontos no WIN, 0,5 ponto no WDO, R$ 0,01 nas ações.'],
    ['Tilt', 'Estado emocional alterado depois de perdas, que leva a decisões impulsivas.'],
    ['Times & trades', 'Lista dos negócios executados, com hora, preço, quantidade e corretoras.'],
    ['Trailing stop', 'Stop que acompanha o preço a favor a uma distância fixa.'],
    ['Vencimento', 'Data em que o contrato futuro expira. A liquidez migra para o próximo contrato.'],
    ['VWAP', 'Preço médio ponderado pelo volume desde a abertura.'],
    ['Zeragem compulsória', 'Encerramento forçado das posições pela corretora, por falta de margem ou perto do fechamento.']
  ];
})(window);
