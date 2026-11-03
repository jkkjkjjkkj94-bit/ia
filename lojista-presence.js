// Compatibilidade legada: presença e avaliações são geridas por lojista-activity.js.
if(!window.GuruMerchantActivity){
  import('./lojista-activity.js?v=1').catch(e=>console.error('[Presença lojista legada]',e));
}
