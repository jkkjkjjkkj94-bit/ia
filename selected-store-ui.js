const msgs=document.getElementById('msgs');

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
