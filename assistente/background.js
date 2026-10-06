/* Abre o painel lateral ao clicar no ícone da extensão. */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(function (erro) { console.error(erro); });
