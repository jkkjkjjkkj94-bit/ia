const form=document.getElementById('storeForm');
const address=document.getElementById('sAddress');
const lat=document.getElementById('sLat');
const lng=document.getElementById('sLng');

if(form&&address&&lat&&lng){
  // Mantem coordenadas apenas para o sistema, fora da interface.
  const latWrap=lat.closest('.field');
  const lngWrap=lng.closest('.field');
  const grid=latWrap?.parentElement;
  lat.type='hidden';
  lng.type='hidden';
  lat.removeAttribute('required');
  lng.removeAttribute('required');
  form.appendChild(lat);
  form.appendChild(lng);
  latWrap?.remove();
  lngWrap?.remove();
  if(grid&&grid.children.length===0)grid.remove();

  const box=document.createElement('div');
  box.id='addressSuggestions';
  box.style.cssText='display:none;border:1px solid #ddd;border-radius:12px;margin-top:6px;overflow:hidden;background:#fff;max-height:220px;overflow-y:auto;position:relative;z-index:20';
  const status=document.createElement('div');
  status.id='addressValidationStatus';
  status.className='meta';
  status.style.marginTop='6px';
  status.textContent='Digite o endereço e selecione uma opção válida da lista.';
  address.insertAdjacentElement('afterend',box);
  box.insertAdjacentElement('afterend',status);

  let timer=null,lastRequest=0,selectedLabel='';
  const norm=s=>(s||'').trim();
  const clearValidation=()=>{
    address.dataset.validated='0';
    lat.value='';
    lng.value='';
    selectedLabel='';
    status.textContent='Digite o endereço e selecione uma opção válida da lista.';
  };

  function choose(item){
    address.value=item.display_name;
    lat.value=item.lat;
    lng.value=item.lon;
    address.dataset.validated='1';
    selectedLabel=item.display_name;
    box.style.display='none';
    status.textContent='✓ Endereço validado no mapa.';
  }

  async function searchAddress(){
    const q=norm(address.value);
    if(q.length<8){box.style.display='none';return}
    const wait=Math.max(0,1000-(Date.now()-lastRequest));
    if(wait)await new Promise(r=>setTimeout(r,wait));
    lastRequest=Date.now();
    status.textContent='Procurando endereço...';
    try{
      const url='https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=br&layer=address&q='+encodeURIComponent(q);
      const res=await fetch(url,{headers:{'Accept':'application/json','Accept-Language':'pt-BR,pt;q=0.9'}});
      if(!res.ok)throw new Error('Falha ao consultar endereço');
      const data=await res.json();
      const rows=(data||[]).filter(x=>{
        const a=x.address||{};
        const locality=a.city||a.town||a.village||a.municipality;
        return a.country_code==='br'&&(a.road||a.pedestrian||a.residential)&&locality&&x.lat&&x.lon;
      });
      if(!rows.length){
        box.style.display='none';
        status.textContent='Não encontrei um endereço válido. Digite rua, número, bairro e cidade.';
        return;
      }
      box.innerHTML='';
      rows.forEach(item=>{
        const b=document.createElement('button');
        b.type='button';
        b.className='btn';
        b.style.cssText='display:block;width:100%;text-align:left;border:0;border-radius:0;padding:10px 12px;background:#fff';
        b.textContent=item.display_name;
        b.onclick=()=>choose(item);
        box.appendChild(b);
      });
      const attr=document.createElement('div');
      attr.className='meta';
      attr.style.cssText='padding:7px 10px;border-top:1px solid #eee';
      attr.textContent='Endereços: © OpenStreetMap contributors';
      box.appendChild(attr);
      box.style.display='block';
      status.textContent='Selecione o endereço correto na lista.';
    }catch(e){
      box.style.display='none';
      status.textContent='Não foi possível validar o endereço agora. Tente novamente.';
    }
  }

  address.addEventListener('input',()=>{
    if(address.value!==selectedLabel)clearValidation();
    clearTimeout(timer);
    timer=setTimeout(searchAddress,850);
  });
  address.addEventListener('focus',()=>{if(box.children.length)box.style.display='block'});
  document.addEventListener('click',e=>{if(e.target!==address&&!box.contains(e.target))box.style.display='none'});

  const original=form.onsubmit;
  form.onsubmit=async function(e){
    if(address.dataset.validated!=='1'||!lat.value||!lng.value){
      e?.preventDefault?.();
      status.textContent='Selecione um endereço válido da lista antes de salvar.';
      address.focus();
      await searchAddress();
      return false;
    }
    return typeof original==='function'?original.call(form,e):undefined;
  };
}
