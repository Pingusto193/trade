/* Monta o assistente na página própria (janela pop-up ou painel lateral do Chrome). */
(function () {
  'use strict';
  var naExtensao = location.protocol === 'chrome-extension:';
  window.DT.assistente.montar(document.getElementById('assistente'), {
    prefixo: 'cop',
    linkDiario: naExtensao ? null : '../index.html#diario'
  });
})();
