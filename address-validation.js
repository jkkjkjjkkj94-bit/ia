const form=document.getElementById('storeForm');
const address=document.getElementById('sAddress');
const lat=document.getElementById('sLat');
const lng=document.getElementById('sLng');

if(form&&address&&lat&&lng){
  // Coordenadas ficam somente para o sistema, fora da interface.
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

  address.autocomplete='off';
  address.placeholder='Comece a digitar rua, número, bairro e cidade';

  const box=document.createElement('div');
  box.id='addressSuggestions';
  box.style.cssText='display:none;border:1px solid #ddd;border-radius:12px;margin-top:6px;overflow:hidden;background:#fff;max-height:260px;overflow-y:auto;position:relative;z-index:50;box-shadow:0 10px 28px rgba(0,0,0,.08)';
  const status=document.createElement('div');
  status.id='addressValidationStatus';
  status.className='meta';
  status.style.marginTop='6px';
  status.textContent='Comece a digitar e escolha um endereço real da lista.';
  address.insertAdjacentElement('afterend',box);
  box.insertAdjacentElement('afterend',status);

  let timer=null,controller=null,selectedLabel='',requestSeq=0;
  const norm=s=>(s||'').trim();

  const clearValidation=()=>{
    address.dataset.validated='0';
    lat.value='';
    lng.value='';
    selectedLabel='';
  };

  const formatAddress=feature=>{
    const p=feature.properties||{};
    const parts=[];
    const street=p.street||((p.osm_value==='house'||p.type==='house')?p.name:null)||p.name;
    if(street)parts.push(street+(p.housenumber?`, ${p.housenumber}`:''));
    if(p.district)parts.push(p.district);
    if(p.city||p.town||p.village)parts.push(p.city||p.town||p.village);
    if(p.state)parts.push(p.state);
    if(p.postcode)parts.push(p.postcode);
    return [...new Set(parts.filter(Boolean))].join(' - ');
  };

  const hasRealAddress=feature=>{
    const p=feature.properties||{};
    const coords=feature.geometry?.coordinates;
    const inBrazil=(String(p.countrycode||'').toUpperCase()==='BR'||/brasil|brazil/i.test(p.country||''));
    return inBrazil&&Array.isArray(coords)&&coords.length>=2&&(p.street||p.name);
  };

  function choose(feature){
    const p=feature.properties||{};
    const coords=feature.geometry.coordinates;
    const label=formatAddress(feature);
    address.value=label;
    lat.value=String(coords[1]);
    lng.value=String(coords[0]);
    address.dataset.validated='1';
    selectedLabel=label;
    box.style.display='none';
    status.textContent=p.housenumber?'✓ Endereço selecionado e validado.':'✓ Local selecionado. Se houver número, confirme se ele aparece no endereço.';
  }

  function renderRows(features){
    box.innerHTML='';
    if(!features.length){
      box.style.display='none';
      status.textContent='Nenhum endereço encontrado. Continue digitando rua, número, bairro e cidade.';
      return;
    }
    features.slice(0,6).forEach(feature=>{
      const label=formatAddress(feature);
      if(!label)return;
      const b=document.createElement('button');
      b.type='button';
      b.style.cssText='display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #eee;padding:11px 12px;background:#fff;cursor:pointer;font:inherit';
      b.onmouseenter=()=>b.style.background='#f7f7f7';
      b.onmouseleave=()=>b.style.background='#fff';
      b.innerHTML=`<b style="display:block">${label}</b><span class="meta">${feature.properties?.country||'Brasil'}</span>`;
      b.onclick=()=>choose(feature);
      box.appendChild(b);
    });
    const attr=document.createElement('div');
    attr.className='meta';
    attr.style.cssText='padding:7px 10px';
    attr.textContent='Dados de endereço: OpenStreetMap via Photon';
    box.appendChild(attr);
    box.style.display='block';
    status.textContent='Selecione o endereço correto na lista.';
  }

  async function searchAddress(){
    const q=norm(address.value);
    const seq=++requestSeq;
    if(q.length<3){
      box.style.display='none';
      status.textContent='Digite pelo menos 3 caracteres para ver endereços.';
      return;
    }
    controller?.abort();
    controller=new AbortController();
    status.textContent='Buscando endereços...';
    try{
      // Photon foi projetado para search-as-you-type. BBox limita os resultados ao Brasil.
      const params=new URLSearchParams({q,limit:'8',lang:'pt',bbox:'-73.99,-33.75,-34.79,5.27'});
      const res=await fetch('https://photon.komoot.io/api/?'+params.toString(),{signal:controller.signal,headers:{'Accept':'application/json'}});
      if(!res.ok)throw new Error('Falha ao consultar endereços');
      const data=await res.json();
      if(seq!==requestSeq)return;
      const rows=(data.features||[]).filter(hasRealAddress);
      renderRows(rows);
    }catch(e){
      if(e?.name==='AbortError')return;
      box.style.display='none';
      status.textContent='Não foi possível buscar endereços agora. Tente novamente.';
    }
  }

  address.addEventListener('input',()=>{
    if(address.value!==selectedLabel)clearValidation();
    clearTimeout(timer);
    timer=setTimeout(searchAddress,320);
  });
  address.addEventListener('focus',()=>{
    if(box.children.length&&address.value.length>=3)box.style.display='block';
  });
  document.addEventListener('click',e=>{
    if(e.target!==address&&!box.contains(e.target))box.style.display='none';
  });

  const original=form.onsubmit;
  form.onsubmit=async function(e){
    if(address.dataset.validated!=='1'||!lat.value||!lng.value){
      e?.preventDefault?.();
      status.textContent='Escolha um endereço real da lista antes de salvar.';
      address.focus();
      await searchAddress();
      return false;
    }
    return typeof original==='function'?original.call(form,e):undefined;
  };
}
