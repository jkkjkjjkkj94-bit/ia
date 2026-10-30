const style=document.createElement('link');
style.rel='stylesheet';
style.href='./shell-layout.css?v=1';
document.head.appendChild(style);

const body=document.body;
if(!body.dataset.shellReady){
  body.dataset.shellReady='1';
  const sidebar=document.createElement('aside');
  sidebar.className='app-sidebar';
  sidebar.innerHTML=`
    <div class="sidebar-top">
      <div class="sidebar-brand"><span>Local AI</span><button class="sidebar-collapse" type="button" aria-label="Recolher menu">◫</button></div>
      <nav class="sidebar-nav">
        <button type="button" data-shell-action="new"><span class="side-icon">✎</span><span>Nova busca</span></button>
        <button type="button" data-shell-action="location"><span class="side-icon">⌖</span><span>Localização</span></button>
        <button type="button" data-shell-action="merchant"><span class="side-icon">▣</span><span>Área do lojista</span></button>
        <button type="button" data-shell-action="admin"><span class="side-icon">⚙</span><span>Administrador</span></button>
      </nav>
    </div>
    <div class="sidebar-bottom">
      <strong>Encontre locais perto de você</strong>
      <p>Converse com o Local AI para encontrar lojas, produtos e serviços.</p>
      <button type="button" data-shell-action="location" class="sidebar-primary">Usar localização</button>
    </div>`;
  body.insertBefore(sidebar,body.firstChild);

  const footer=document.createElement('div');
  footer.className='app-footer-note';
  footer.textContent='Local AI · resultados baseados nas informações cadastradas pelos estabelecimentos';
  document.querySelector('.main')?.appendChild(footer);

  const reset=()=>document.getElementById('resetBtn')?.click();
  const locate=()=>document.getElementById('locBtn')?.click();
  const merchant=()=>document.getElementById('merchantAccess')?.click();
  const admin=()=>document.getElementById('adminAccess')?.click();
  const actions={new:reset,location:locate,merchant,admin};
  sidebar.addEventListener('click',e=>{
    const btn=e.target.closest('[data-shell-action]');
    if(btn)actions[btn.dataset.shellAction]?.();
  });
  sidebar.querySelector('.sidebar-collapse')?.addEventListener('click',()=>body.classList.toggle('sidebar-collapsed'));

  const msgs=document.getElementById('msgs');
  const syncState=()=>{
    const hasUser=!!msgs?.querySelector('.msg.user');
    body.classList.toggle('chat-started',hasUser);
  };
  syncState();
  if(msgs)new MutationObserver(syncState).observe(msgs,{childList:true,subtree:true});
}
