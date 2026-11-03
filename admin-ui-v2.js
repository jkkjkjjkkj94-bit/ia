// Compatibilidade legada: a interface única do Admin é admin-ui.js.
if(!window.GuruAdminUI){
  import('./admin-ui.js?v=2').catch(err=>console.error('[Legacy Admin UI entrypoint]',err));
}
