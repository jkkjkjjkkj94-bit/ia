const msgs=document.getElementById('msgs');

if(!document.getElementById('selected-store-ui-style')){
  const style=document.createElement('style');
  style.id='selected-store-ui-style';
  style.textContent=`
  .selected-store-msg{max-width:100%!important;width:100%;padding:0!important;background:transparent!important}
  .selected-store-card{border:1px solid #e9e9e9;border-radius:16px;padding:16px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.02)}
  .selected-store-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
  .selected-store-kicker{font-size:10px;color:#999;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}
  .selected-store-head h3{margin:0;font-size:18px;line-height:1.2;letter-spacing:-.02em}
  .selected-store-distance{font-size:12px;font-weight:700;background:#f5f5f5;border-radius:999px;padding:6px 9px;white-space:nowrap}
  .selected-store-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
  .selected-store-chips span{font-size:10px;padding:5px 8px;border-radius:999px;background:#f6f6f6;color:#555}
  .selected-store-chips .is-open{background:#eef8f2;color:#16734b}
  .selected-store-chips .is-closed{background:#faf1f1;color:#954848}
  .selected-store-info{display:grid;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid #f0f0f0}
  .selected-info-row{display:grid;grid-template-columns:70px minmax(0,1fr);gap:10px;align-items:start;font-size:12px;line-height:1.45}
  .selected-info-label{color:#999;font-size:10px;text-transform:uppercase;letter-spacing:.04em;padding-top:2px}
  .selected-store-card .chat-actions{margin-top:14px;padding-top:12px;border-top:1px solid #f0f0f0;display:flex;gap:7px;flex-wrap:wrap}
  .selected-store-card .chat-actions button{border-radius:9px;padding:7px 10px;font-size:10px;background:#fff;border:1px solid #e5e5e5}
  .selected-store-card .chat-actions button:hover{background:#f7f7f7}
  @media(max-width:680px){
    .selected-store-card{padding:13px;border-radius:14px}
    .selected-store-head h3{font-size:16px}
    .selected-info-row{grid-template-columns:1fr;gap:3px}
    .selected-info-label{padding-top:0}
  }`;
  document.head.appendChild(style);
}

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function parseSelectedStore(text){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  if(!/Boa escolha|Vamos falar (?:da|do)/i.test(clean)) return null;

  const nameMatch=clean.match(/Vamos falar (?:da|do) (.+?)\.\s/i);
  if(!nameMatch) return null;
  const name=nameMatch[1].trim();

  const afterName=clean.slice((nameMatch.index||0)+nameMatch[0].length);
  const category=(afterName.match(/^([^·.]+?)(?:\s*·|\s+\d+[.,]?\d*\s*km|\s+Hoje funciona|\s+Endereço:)/i)?.[1]||'').trim();
  const distance=clean.match(/(\d+(?:[.,]\d+)?)\s*km de você/i)?.[1]?.replace(',','.')||'';
  const hours=clean.match(/Hoje funciona das\s*([0-9]{1,2}:[0-9]{2})\s*(?:às|as)\s*([0-9]{1,2}:[0-9]{2})/i);
  const isOpen=/está aberta agora/i.test(clean);
  const isClosed=/está fechad[ao] agora/i.test(clean);
  const address=(clean.match(/Endereço:\s*(.+?)(?=\s+Faz entrega|\s+Não faz entrega|$)/i)?.[1]||'').trim().replace(/[.\s]+$/,'');
  const delivery=/Faz entrega/i.test(clean) && !/Não faz entrega/i.test(clean);
  const noFee=/não cobra taxa|sem taxa/i.test(clean);

  return {name,category,distance,hours,isOpen,isClosed,address,delivery,noFee};
}

function enhance(node){
  if(!(node instanceof HTMLElement)||!node.classList.contains('bot')||node.dataset.selectedStoreUi==='1') return;
  const data=parseSelectedStore(node.textContent);
  if(!data) return;
  node.dataset.selectedStoreUi='1';

  const actions=node.querySelector('.chat-actions');
  const actionHTML=actions?actions.outerHTML:'';
  const status=data.isOpen?'Aberta agora':data.isClosed?'Fechada agora':'';

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
        ${status?`<span class="${data.isOpen?'is-open':'is-closed'}">${esc(status)}</span>`:''}
        ${data.delivery?'<span>Entrega</span>':''}
        ${data.delivery&&data.noFee?'<span>Sem taxa</span>':''}
      </div>
      <div class="selected-store-info">
        ${data.hours?`<div class="selected-info-row"><span class="selected-info-label">Horário</span><strong>${esc(data.hours[1])}–${esc(data.hours[2])}</strong></div>`:''}
        ${data.address?`<div class="selected-info-row"><span class="selected-info-label">Endereço</span><span>${esc(data.address)}</span></div>`:''}
      </div>
      ${actionHTML}
    </div>`;
}

function scan(){msgs?.querySelectorAll('.msg.bot').forEach(enhance)}
scan();
if(msgs)new MutationObserver(muts=>{for(const m of muts){m.addedNodes.forEach(n=>{if(n instanceof HTMLElement){if(n.matches?.('.msg.bot'))enhance(n);n.querySelectorAll?.('.msg.bot').forEach(enhance)}})}}).observe(msgs,{childList:true,subtree:true});
