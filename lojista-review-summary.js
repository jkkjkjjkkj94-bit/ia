// Compatibilidade legada: módulo incorporado a lojista-activity.js.
if(!window.GuruMerchantActivity){
  import('./lojista-activity.js?v=1').catch(e=>console.error('[Resumo de avaliações legado]',e));
}
