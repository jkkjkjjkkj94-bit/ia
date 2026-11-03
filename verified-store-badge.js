const msgs=document.getElementById('msgs');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

function isVerified(store){
  return store?.verified===true
    || store?.is_verified===true
    || norm(store?.verification_status)==='verified'
    || norm(store?.highlight_type)==='verified';
}

function currentStores(){
  const rows=window.LocalAIEngine?.state?.lastResults||[];
  return rows.map(x=>x?.store||x).filter(Boolean);
}

function byName(name){
  const n=norm(name),stores=currentStores();
  return stores.find(s=>norm(s.name)===n)
    || stores.find(s=>norm(s.name).includes(n)||n.includes(norm(s.name)))
    || null;
}

function ensureStyles(){
  if(document.getElementById('verifiedStoreBadgeStyles'))return;
  const style=document.createElement('style');
  style.id='verifiedStoreBadgeStyles';
  style.textContent=`
.smart-store-logo-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}
.smart-store-logo-wrap>.smart-store-logo{display:block}
.store-verified-badge{position:absolute;right:-3px;bottom:-3px;width:18px;height:18px;border-radius:999px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 7px rgba(0,0,0,.18);z-index:3;pointer-events:none}
.store-verified-badge svg{width:10px;height:10px;display:block;fill:currentColor}
@media(max-width:680px){.store-verified-badge{width:16px;height:16px;right:-2px;bottom:-2px}.store-verified-badge svg{width:9px;height:9px}}
`;
  document.head.appendChild(style);
}

function applyToCard(card){
  const img=card?.querySelector?.('.smart-store-logo');
  const title=card?.querySelector?.('h3')?.textContent?.trim();
  if(!img||!title)return;
  const store=byName(title);
  if(!store||!isVerified(store))return;

  let wrap=img.closest('.smart-store-logo-wrap');
  if(!wrap){
    wrap=document.createElement('span');
    wrap.className='smart-store-logo-wrap';
    img.parentNode?.insertBefore(wrap,img);
    wrap.appendChild(img);
  }
  if(wrap.querySelector('.store-verified-badge'))return;

  const badge=document.createElement('span');
  badge.className='store-verified-badge';
  badge.title='Loja verificada';
  badge.setAttribute('aria-label','Loja verificada');
  badge.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 16.2 5.7 12.7l-1.4 1.4 4.9 4.9L20 8.2l-1.4-1.4z"></path></svg>';
  wrap.appendChild(badge);
}

function scan(root=document){
  if(root.matches?.('.store-result-card,.normal-result-card'))applyToCard(root);
  root.querySelectorAll?.('.store-result-card,.normal-result-card').forEach(applyToCard);
}

ensureStyles();
setTimeout(()=>scan(document),250);
if(msgs)new MutationObserver(()=>setTimeout(()=>scan(document),120)).observe(msgs,{childList:true,subtree:true});
window.GuruVerifiedBadge={refresh:()=>scan(document)};
