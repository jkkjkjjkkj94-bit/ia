// Compatibilidade legada: a interface administrativa ativa está em admin-ui-v3.js.
if(!window.GuruAdminUIV3){
  import('./admin-ui-v3.js?v=1').catch(err=>console.error('[Admin UI V2 Legacy Shim]',err));
}
