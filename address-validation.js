const form=document.getElementById('storeForm');
const address=document.getElementById('sAddress');
const lat=document.getElementById('sLat');
const lng=document.getElementById('sLng');

if(form&&address&&lat&&lng){
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
  address.placeholder='Digite cidade, bairro, rua e número';

  const box=document.createElement('div');
  box.id='addressSuggestions';
  box.style.cssText='display:none;border:1px solid #ddd;border-radius:12px;margin-top:6px;overflow:hidden;background:#fff;max-height:280px;overflow-y:auto;position:relative;z-index:50;box-shadow:0 10px 28px rgba(0,0,0,.08)';
  const status=document.createElement('div');
  status.id='addressValidationStatus';
  status.className='meta';
  status.style.marginTop='6px';
  status.textContent='Comece digitando cidade, bairro ou rua.';
  address.insertAdjacentElement('afterend',box);
  box.insertAdjacentElement('afterend',status);

  let timer=null,controller=null,selectedLabel='',requestSeq=0;
  const clean=s=>(s||'').trim();

  const clearValidation=()=>{
    address.dataset.validated='0';
    lat.value='';
    lng.value='';
    selectedLabel='';
  };

  const props=f=>f?.properties||{};
  const coords=f=>f?.geometry?.coordinates||[];

  const isBrazil=f=>{
    const p=props(f);
    return String(p.countrycode||'').toUpperCase()==='BR'||/brasil|brazil/i.test(p.country||'');
  };

  const isFinalAddress=f=>{
    const p=props(f);
    const c=coords(f);
    return isBrazil(f)&&c.length>=2&&!!(p.street||p.housenumber||p.osm_value==='house'||p.type==='house');
  };

  const formatAddress=f=>{
    const p=props(f);
    const parts=[];
    const street=p.street||((p.osm_value==='house'||p.type==='house')?p.name:null);
    if(street)parts.push(street+(p.housenumber?`, ${p.housenumber}`:''));
    else if(p.name)parts.push(p.name);
    if(p.district)parts.push(p.district);
    if(p.city||p.town||p.village)parts.push(p.city||p.town||p.village);
    if(p.state)parts.push(p.state);
    if(p.postcode)parts.push(p.postcode);
    return [...new Set(parts.filter(Boolean))].join(' - ');
  };

  function choose(feature){
    const label=formatAddress(feature);
    if(!label)return;

    if(!isFinalAddress(feature)){
      address.value=label;
      clearValidation();
      box.style.display='none';
      status.textContent='Local selecionado. Agora continue digitando a rua e o número.';
      address.focus();
      address.setSelectionRange(address.value.length,address.value.length);
      return;
    }

    const c=coords(feature);
    address.value=label;
    lat.value=String(c[1]);
    lng.value=String(c[0]);
    address.dataset.validated='1';
    selectedLabel=label;
    box.style.display='none';
    status.textContent='✓ Endereço real selecionado e validado.';
  }

  function typeLabel(f){
    const p=props(f);
    if(isFinalAddress(f))return 'Endereço';
    if(p.osm_value==='city'||p.type==='city'||p.city===p.name)return 'Cidade';
    if(p.osm_value==='suburb'||p.osm_value==='neighbourhood'||p.district===p.name)return 'Bairro';
    return 'Local';
  }

  function renderRows(features){
    box.innerHTML='';
    if(!features.length){
      box.style.display='none';
      status.textContent='Nenhuma sugestão encontrada. Tente digitar cidade, bairro, rua e número.';
      return;
    }

    features.slice(0,8).forEach(feature=>{
      const label=formatAddress(feature);
      if(!label)return;
      const b=document.createElement('button');
      b.type='button';
      b.style.cssText='display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #eee;padding:11px 12px;background:#fff;cursor:pointer;font:inherit';
      b.onmouseenter=()=>b.style.background='#f7f7f7';
      b.onmouseleave=()=>b.style.background='#fff';
      b.innerHTML=`<b style="display:block">${label}</b><span class="meta">${typeLabel(feature)} · ${props(feature).country||'Brasil'}</span>`;
      b.onclick=()=>choose(feature);
      box.appendChild(b);
    });

    const attr=document.createElement('div');
    attr.className='meta';
    attr.style.cssText='padding:7px 10px';
    attr.textContent='Dados de localização: OpenStreetMap via Photon';
    box.appendChild(attr);
    box.style.display='block';
    status.textContent='Escolha uma sugestão ou continue digitando para refinar.';
  }

  async function searchAddress(){
    const q=clean(address.value);
    const seq=++requestSeq;
    if(q.length<3){
      box.style.display='none';
      status.textContent='Digite pelo menos 3 caracteres para ver sugestões.';
      return;
    }

    controller?.abort();
    controller=new AbortController();
    status.textContent='Buscando locais e endereços...';

    try{
      const params=new URLSearchParams({q,limit:'12',lang:'pt',bbox:'-73.99,-33.75,-34.79,5.27'});
      const res=await fetch('https://photon.komoot.io/api/?'+params.toString(),{
        signal:controller.signal,
        headers:{'Accept':'application/json'}
      });
      if(!res.ok)throw new Error('Falha ao consultar endereços');
      const data=await res.json();
      if(seq!==requestSeq)return;
      const rows=(data.features||[]).filter(f=>isBrazil(f)&&coords(f).length>=2);
      renderRows(rows);
    }catch(e){
      if(e?.name==='AbortError')return;
      box.style.display='none';
      status.textContent='Não foi possível buscar sugestões agora. Tente novamente.';
    }
  }

  address.addEventListener('input',()=>{
    if(address.value!==selectedLabel)clearValidation();
    clearTimeout(timer);
    timer=setTimeout(searchAddress,250);
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
      status.textContent='Escolha uma rua/endereço real da lista antes de salvar.';
      address.focus();
      await searchAddress();
      return false;
    }
    return typeof original==='function'?original.call(form,e):undefined;
  };
}
