// Compatibilidade legada: o controlador central do menu está em admin-ui.js.
if(!window.GuruAdminUI){
  import('./admin-ui.js?v=2').catch(e=>console.error('[Admin Menu legado]',e));
}
