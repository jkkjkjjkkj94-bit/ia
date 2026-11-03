// Compatibilidade legada: a UI ativa do GURU Admin está em admin-ui.js.
if(!window.GuruAdminUI){
  import('./admin-ui.js?v=2').catch(e=>console.error('[Admin UI V3 legado]',e));
}
