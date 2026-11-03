// Compatibilidade legada: a implementação ativa está em admin-pending-core.js.
if(!window.GuruAdminPendingCore){
  import('./admin-pending-core.js?v=1').catch(err=>console.error('[Pending Stores Legacy Shim]',err));
}
