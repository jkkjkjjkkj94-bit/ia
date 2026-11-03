const labels={overview:'Dashboard',stores:'Registros',pendingStores:'Pendentes',merchants:'Consultas',coverage:'Relatórios',ai:'Análises',sources:'Banco de dados',taxonomyDb:'Taxonomia',synonymSuggestions:'Sugestões de sinônimos',reviews:'Avaliações',highlights:'Destaques',aiConfig:'IA & Regras',audit:'Histórico',settings:'Configurações'};
const icons={overview:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',stores:'<path d="M4 7h16M6 7V5h12v2M6 7v12h12V7M9 11h6M9 15h4"/>',pendingStores:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',merchants:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.4 2.3-5 5.5-5s4.9 1.6 5.5 5M16 8h5M18.5 5.5v5"/>',coverage:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',ai:'<circle cx="12" cy="12" r="7"/><path d="M9 12h6M10 15h4M12 3v2"/>',sources:'<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',taxonomyDb:'<path d="M4 5h6v5H4zM14 14h6v5h-6zM14 5h6v5h-6zM7 10v3h10v1"/>',synonymSuggestions:'<path d="M5 8h14M5 12h9M5 16h6"/><path d="M17 14l2 2 3-4"/>',reviews:'<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',highlights:'<path d="m12 3 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 3Z"/>',aiConfig:'<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="11" cy="18" r="2"/>',audit:'<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M4 12h3M17 12h3M12 4v3M12 17v3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M17.7 6.3l-2.1 2.1M8.4 15.6l-2.1 2.1"/>',default:'<circle cx="12" cy="12" r="8"/>'};
const order=['overview','stores','pendingStores','merchants','coverage','ai','sources','taxonomyDb','synonymSuggestions','reviews','highlights','aiConfig','audit','settings'];
function ensureLayoutFix(){if(document.querySelector('link[href*="admin-menu-layout-fix.css"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='admin-menu-layout-fix.css?v=1';document.head.appendChild(l)}
// Controlador único de navegação: não recria botões existentes nem altera handlers.
const escMenu=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let menuObserver=null;
function normalizeMenu(){
 const nav=document.querySelector('.panel-nav');
 if(!nav)return;
 const seen=new Set();
 for(const b of [...nav.querySelectorAll('button[data-view]')]){
  const id=b.dataset.view;
  if(!id){continue}
  if(seen.has(id)){b.remove();continue}
  seen.add(id);
  if(b.dataset.menuFixed==='1'&&b.querySelector('.admin-nav-label'))continue;
  const count=id==='pendingStores'?b.querySelector('#pendingNavCount,.admin-nav-count')?.textContent?.trim():null;
  const safeLabel=escMenu(labels[id]||id);
  b.innerHTML=`<span class="admin-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[id]||icons.default}</svg></span><span class="admin-nav-label">${safeLabel}${id==='pendingStores'?` <small id="pendingNavCount" class="admin-nav-count">${String(count||'0').replace(/\\D/g,'').slice(0,5)||'0'}</small>`:''}</span>`;
  b.title=labels[id]||id;
  b.setAttribute('aria-label',labels[id]||id);
  b.dataset.menuFixed='1';
 }
 const all=[...nav.children];
 const buttons=all.filter(b=>b.matches('button[data-view]'));
 const byId=new Map(buttons.map(b=>[b.dataset.view,b]));
 const desired=[...order.map(id=>byId.get(id)).filter(Boolean),...buttons.filter(b=>!order.includes(b.dataset.view)),...all.filter(b=>!b.matches('button[data-view]'))];
 // appendChild em sequência deslocava itens e a UI antiga os deslocava de volta.
 // Uma única troca ordenada preserva os próprios nós e seus eventos.
 if(desired.length===all.length&&!desired.every((b,i)=>all[i]===b))nav.replaceChildren(...desired);
}
function boot(){ensureLayoutFix()}
function activateMenu(){
 normalizeMenu();
 const nav=document.querySelector('.panel-nav');
 if(nav&&!menuObserver){
  // Acompanha somente novos botões tardios; mudanças internas não acionam reordenação.
  // normalizeMenu é idempotente: a segunda notificação não modifica o DOM.
  menuObserver=new MutationObserver(()=>normalizeMenu());
  menuObserver.observe(nav,{childList:true});
 }
}
window.addEventListener('guru-admin-modules-ready',activateMenu,{once:true});
window.GuruAdminMenu={normalize:normalizeMenu,order:[...order]};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
