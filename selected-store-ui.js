const msgs=document.getElementById('msgs');

if(!document.getElementById('selected-store-ui-style')){
  const style=document.createElement('style');
  style.id='selected-store-ui-style';
  style.textContent=`
  .selected-store-msg{max-width:100%!important;width:100%;padding:0!important;background:transparent!important}
  .selected-store-card{border:1px solid #e8e8e8;border-radius:18px;padding:18px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.025)}
  .selected-store-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
  .selected-store-kicker{font-size:10px;color:#9a9a9a;margin-bottom:5px;text-transform:uppercase;letter-spacing:.07em;font-weight:650}
  .selected-store-head h3{margin:0;font-size:19px;line-height:1.2;letter-spacing:-.025em}
  .selected-store-distance{font-size:12px;font-weight:700;background:#f5f5f5;border-radius:999px;padding:6px 10px;white-space:nowrap}
  .selected-store-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
  .selected-store-chips span{font-size:10px;padding:5px 8px;border-radius:999px;background:#f6f6f6;color:#555}
  .selected-store-chips .is-open{background:#eef8f2;color:#16734b}
  .selected-store-chips .is-closed{background:#faf1f1;color:#954848}
  .selected-store-info{display:grid;gap:10px;margin-top:15px;padding-top:15px;border-top:1px solid #f0f0f0}
  .selected-info-row{display:grid;grid-template-columns:78px minmax(0,1fr);gap:12px;align-items:start;font-size:12px;line-height:1.5}
  .selected-info-label{color:#999;font-size:10px;text-transform:uppercase;letter-spacing:.05em;padding-top:2px;font-weight:650}
  .selected-products{margin-top:15px;padding-top:15px;border-top:1px solid #f0f0f0}
  .selected-products-title{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.05em;font-weight:650;margin-bottom:8px}
  .selected-product-list{display:grid;gap:6px}
  .selected-product-item{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fafafa;border-radius:10px;padding:8px 10px;font-size:11px}
  .selected-product-item strong{font-size:11px;white-space:nowrap}
  .selected-store-card .chat-actions{margin-top:15px;padding-top:13px;border-top:1px solid #f0f0f0;display:flex;gap:6px;flex-wrap:wrap}
  .selected-store-card .chat-actions button{border-radius:999px;padding:7px 10px;font-size:10px;background:#f7f7f7;border:0;color:#333}
  .selected-store-card .chat-actions button:hover{background:#eeeeee}
  @media(max-width:680px){
    .selected-store-card{padding:14px;border-radius:15px}
    .selected-store-head h3{font-size:17px}
    .selected-info-row{grid-template-columns:1fr;gap:3px}
    .selected-info-label{padding-top:0}
  }`;
  document.head.appendChild(style);
}

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function parseProducts(clean){
  const part=clean.match(/Alguns produtos em estoque:\s*(.+)$/i)?.[1]||'';
  if(!part)return [];
  return part.split(/\s*[•·]\s*/).map(x=>x.trim()).filter(Boolean).map(item=>{
    const m=item.match(/^(.+?)\s*[—-]\s*R\$\s*([\d.,]+)/);
    return m?{name:m[1].trim(),price:`R$ ${m[2].trim()}`}:{name:item,price:''};
  }).slice(0,4);
}

function parseSelectedStore(text){
  const clean=String(text||'').replace(/\s+/g,' ').trim();

  let name='';
  let category='';

  const classic=clean.match(/Vamos falar (?:da|do) (.+?)\.\s/i);
  const looking=clean.match(/Certo, olhando agora (?:a|o) (.+?)\.\s*([^·.]+)?\s*·?/i);

  if(classic){
    name=classic[1].trim();
    const afterName=clean.slice((classic.index||0)+classic[0].length);
    category=(afterName.match(/^([^·.]+?)(?:\s*·|\s+\d+[.,]?\d*\s*km|\s+Hoje funciona|\s+Endereço:)/i)?.[1]||'').trim();
  }else if(looking){
    name=looking[1].trim();
    category=(looking[2]||'').trim();
  }else{
    return null;
  }

  const distance=clean.match(/(\d+(?:[.,]\d+)?)\s*km de você/i)?.[1]?.replace(',','.')||'';
  const rating=clean.match(/★\s*([0-9]+(?:[.,][0-9]+)?)/)?.[1]?.replace(',','.')||'';
  const hours=clean.match(/Hoje funciona das\s*([0-9]{1,2}:[0-9]{2})\s*(?:às|as)\s*([0-9]{1,2}:[0-9]{2})/i);
  const isOpen=/está aberta agora/i.test(clean);
  const isClosed=/está fechad[ao] agora/i.test(clean);
  const address=(clean.match(/Endereço:\s*(.+?)(?=\s+Faz entrega|\s+Não faz entrega|\s+Alguns produtos|$)/i)?.[1]||'').trim().replace(/[.\s]+$/,'');
  const delivery=/Faz entrega/i.test(clean) && !/Não faz entrega/i.test(clean);
  const noFee=/não cobra taxa|sem taxa informada|sem taxa/i.test(clean);
  const products=parseProducts(clean);

  return {name,category,distance,rating,hours,isOpen,isClosed,address,delivery,noFee,products};
}

function enhance(node){
  if(!(node instanceof HTMLElement)||!node.classList.contains('bot')||node.dataset.selectedStoreUi==='1') return;
  const data=parseSelectedStore(node.textContent);
  if(!data) return;
  node.dataset.selectedStoreUi='1';

  const actions=node.querySelector('.chat-actions');
  const actionHTML=actions?actions.outerHTML:'';
  const status=data.isOpen?'Aberta agora':data.isClosed?'Fechada agora':'';
  const productsHTML=data.products.length?`<div class="selected-products"><div class="selected-products-title">Produtos em estoque</div><div class="selected-product-list">${data.products.map(p=>`<div class="selected-product-item"><span>${esc(p.name)}</span>${p.price?`<strong>${esc(p.price)}</strong>`:''}</div>`).join('')}</div></div>`:'';

  node.classList.add('selected-store-msg');
  node.innerHTML=`
    <div class="selected-store-card">
      <div class="selected-store-head">
        <div>
          <div class="selected-store-kicker">Local selecionado</div>
          <h3>${esc(data.name)}</h3>
        </div>
        ${data.distance?`<div class="selected-store-distance">${esc(data.distance)} km</div>`:''}
      </div>
      <div class="selected-store-chips">
        ${data.category?`<span>${esc(data.category)}</span>`:''}
        ${data.rating?`<span>★ ${esc(data.rating)}</span>`:''}
        ${status?`<span class="${data.isOpen?'is-open':'is-closed'}">${esc(status)}</span>`:''}
        ${data.delivery?'<span>Entrega</span>':''}
        ${data.delivery&&data.noFee?'<span>Sem taxa</span>':''}
      </div>
      <div class="selected-store-info">
        ${data.hours?`<div class="selected-info-row"><span class="selected-info-label">Horário</span><strong>${esc(data.hours[1])}–${esc(data.hours[2])}</strong></div>`:''}
        ${data.address?`<div class="selected-info-row"><span class="selected-info-label">Endereço</span><span>${esc(data.address)}</span></div>`:''}
      </div>
      ${productsHTML}
      ${actionHTML}
    </div>`;
}

function scan(){msgs?.querySelectorAll('.msg.bot').forEach(enhance)}
scan();
if(msgs)new MutationObserver(muts=>{for(const m of muts){m.addedNodes.forEach(n=>{if(n instanceof HTMLElement){if(n.matches?.('.msg.bot'))enhance(n);n.querySelectorAll?.('.msg.bot').forEach(enhance)}})}}).observe(msgs,{childList:true,subtree:true});
