# Day Trade às Claras

Curso aberto de day trade na B3, com dados reais sobre quem ganha e quem perde, ferramentas de risco e um **copiloto** para usar ao lado da plataforma da corretora.

O site não dá sinais de compra ou venda, não recomenda corretora e não coleta dados: diário, plano e progresso ficam só no navegador (`localStorage`).

## Como abrir

- **No computador:** dê dois cliques em `index.html`. Não precisa de servidor nem de instalação.
- **Publicado na web:** ative o GitHub Pages do repositório (Settings → Pages → branch desejada, pasta raiz). O site é estático.

## O que tem

| Parte | Onde | O que faz |
|---|---|---|
| Trilha de 10 módulos | `index.html` | Realidade em números, mercado, book e ordens, gráfico, setups e testes, gestão de risco, psicologia, custos e IR, plano, alternativas (CDI etc.) |
| Copiloto de risco | `assistente/` | Calcula o tamanho da posição, confere checklist, registra trades e **trava** com stop diário, limite de trades, perdas seguidas ou horário limite |
| Calculadoras | `#calculadoras` | Posição, expectativa, IR/DARF 6015, custo mensal, recuperação de perda, intervalo de confiança da taxa de acerto |
| Monte Carlo | `#montecarlo` | 1.000 contas simuladas com a sua taxa de acerto, ganho/risco, custo e risco por trade |
| Simulador de tela | `#simulador` | Gráfico de 1 minuto gerado por passeio aleatório, com custos e derrapagem, e a revelação no final |
| Diário | `#diario` | Estatísticas, curva de capital, análise por setup e por disciplina, CSV de entrada e saída |

## Copiloto ao lado de outros sites

Três formas, do mais simples ao mais integrado:

1. **Janela flutuante** (Chrome/Edge 116+ no computador): botão *Copiloto* no topo. Abre uma janelinha que fica por cima de todas as outras, inclusive da plataforma da corretora. A aba do site precisa continuar aberta.
2. **Janela separada:** `assistente/index.html` numa janela própria, posicionada ao lado da corretora.
3. **Extensão do Chrome (painel lateral):**
   1. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
   2. Clique em **Carregar sem compactação** e escolha a pasta `assistente/`.
   3. Fixe o ícone e clique nele: o painel lateral acompanha qualquer site.

A extensão só pede a permissão `sidePanel`. Ela não lê nem altera as páginas que você visita.

## Estrutura

```
index.html            conteúdo e estrutura do site
css/site.css          estilos do site
js/conteudo.js        perguntas do teste e glossário
js/app.js             navegação, progresso, copiloto flutuante, teste, glossário, plano
js/ferramentas.js     calculadoras e Monte Carlo
js/simulador.js       simulador de tela
js/diario.js          diário de trades
assistente/           copiloto (também é a extensão do Chrome)
  base.css            cores, fontes e estilos do copiloto (compartilhados com o site)
  nucleo.js           armazenamento, formatação, cálculos de risco/custo/IR e diário
  assistente.js       componente do copiloto
  index.html          página própria do copiloto (janela e painel lateral)
  manifest.json       manifesto da extensão (Manifest V3)
```

## Dados e quando atualizar

Os números foram conferidos em **6 de outubro de 2026**:

- Selic de 13,75% a.a. (Copom de 16/09/2026); CDI aproximado de 13,65% a.a.
- IR de day trade: 20% sobre o lucro mensal, IRRF de 1%, DARF 6015, sem isenção.
- Custos B3 aproximados: WIN ≈ R$ 0,50 e WDO ≈ R$ 2,40 por contrato ida+volta; ações ≈ 0,03% do volume.

Quando a Selic mudar, atualize a fita do topo e o módulo 9 em `index.html`, o valor inicial de `op-cdi` e a constante `CDI_PADRAO` em `js/ferramentas.js`. Os custos padrão ficam em `DT.CONFIG_PADRAO` (`assistente/nucleo.js`) e cada pessoa pode ajustá-los na aba *Meu plano* do copiloto.

As fontes dos estudos estão na página **Fontes e aviso legal** do site.

## Aviso

Conteúdo educacional, sem recomendação de investimento. Operações alavancadas podem gerar perdas maiores que o capital investido. Taxas, margens, horários e regras tributárias mudam: confira as fontes oficiais.
