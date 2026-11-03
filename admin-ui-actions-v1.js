// Compatibilidade legada: menus e ações foram integrados a admin-ui.js.
if(!window.GuruAdminUI){
  import('./admin-ui.js?v=2').catch(e=>console.error('[Admin UI Actions legado]',e));
}
