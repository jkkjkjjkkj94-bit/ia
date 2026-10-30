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

  const API='https://innziuzgtpfsiywqmies.supabase.co/functions/v1/address-search';
  address.autocomplete='off';
  address.placeholder='Digite sua cidade';

  const selected=document.createElement('div');
  selected.className='meta';
  selected.style.cssText='display:none;margin:0 0 6px 0;padding:8px 10px;border:1px solid #e5e5e5;border-radius:10px;background:#fafafa';

  const box=document.createElement('div');
  box.id='addressSuggestions';
  box.style.cssText='display:none;border:1px solid #ddd;border-radius:12px;margin-top:6px;overflow:hidden;background:#fff;max-height:280px;overflow-y:auto;position:relative;z-index:50;box-shadow:0 10px 28px rgba(0,0,0,.08)';

  const status=document.createElement('div');
  status.id='addressValidationStatus';
  status.className='meta';
  status.style.marginTop='6px';
  status.textContent='Digite o nome da cidade e selecione uma opção.';

  address.parentElement?.insertBefore(selected,address);
  address.insertAdjacentElement('afterend',box);
  box.insertAdjacentElement('afterend',status);

  let timer=null,controller=null,requestSeq=0;
  let selectedCity=null;
  let selectedStreet=null;
  let finalLabel='';

  const clean=s=>(s||'').trim();

  function clearFinal(){
    address.dataset.validated='0';
    lat.value='';
    lng.value='';
    finalLabel='';
  }

  function resetCity(){
    selectedCity=null;
    selectedStreet=null;
    clearFinal();
    selected.style.display='none';
    selected.textContent='';
    address.value='';
    address.placeholder='Digite sua cidade';
    status.textContent='Digite o nome da cidade e selecione uma opção.';
  }

  function showCity(city){
    selectedCity=city;
    selectedStreet=null;
    clearFinal();
    selected.style.display='block';
    selected.innerHTML='Cidade selecionada: <b></b> · <button type="button" style="border:0;background:transparent;text-decoration:underline;cursor:pointer">trocar</button>';
    selected.querySelector('b').textContent=`${city.city} - ${city.uf}`;
    selected.querySelector('button').onclick=resetCity;
    address.value='';
    address.placeholder='Agora digite a rua ou avenida';
    box.style.display='none';
    status.textContent='Cidade selecionada. Agora digite pelo menos 3 letras da rua.';
    address.focus();
  }

  async function resolveCoordinates(item){
    const query=[item.street,item.district,item.city,item.uf,'Brasil'].filter(Boolean).join(', ');
    try{
      const res=await fetch(`${API}?resolve=1&q=${encodeURIComponent(query)}`,{headers:{'Accept':'application/json'}});
      if(!res.ok)return null;
      const data=await res.json();
      return data?.resolved||null;
    }catch{return null}
  }

  async function showStreet(item){
    selectedStreet=item;
    clearFinal();
    box.style.display='none';
    address.value=item.label||[item.street,item.district,`${item.city} - ${item.uf}`,item.cep].filter(Boolean).join(' · ');
    status.textContent='Validando localização da rua...';
    const resolved=await resolveCoordinates(item);
    if(!resolved?.lat||!resolved?.lng){
      status.textContent='Rua encontrada, mas não consegui obter as coordenadas. Escolha outra sugestão ou tente novamente.';
      return;
    }
    lat.value=String(resolved.lat);
    lng.value=String(resolved.lng);
    address.dataset.validated='1';
    finalLabel=address.value;
    status.textContent='✓ Endereço postal validado. Você pode salvar a loja.';
  }

  function makeButton(title,meta,onClick){
    const b=document.createElement('button');
    b.type='button';
    b.style.cssText='display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #eee;padding:11px 12px;background:#fff;cursor:pointer;font:inherit';
    b.onmouseenter=()=>b.style.background='#f7f7f7';
    b.onmouseleave=()=>b.style.background='#fff';
    const strong=document.createElement('b');
    strong.style.display='block';
    strong.textContent=title;
    const small=document.createElement('span');
    small.className='meta';
    small.textContent=meta;
    b.append(strong,small);
    b.onclick=onClick;
    return b;
  }

  function renderCities(items){
    box.innerHTML='';
    if(!items.length){
      box.style.display='none';
      status.textContent='Nenhuma cidade encontrada. Continue digitando o nome do município.';
      return;
    }
    items.slice(0,10).forEach(item=>box.appendChild(makeButton(`${item.city} - ${item.uf}`,`${item.state||'Brasil'} · Município IBGE`,()=>showCity(item))));
    const foot=document.createElement('div');
    foot.className='meta';
    foot.style.cssText='padding:7px 10px';
    foot.textContent='Municípios: IBGE';
    box.appendChild(foot);
    box.style.display='block';
    status.textContent='Selecione a cidade correta.';
  }

  function renderStreets(items){
    box.innerHTML='';
    if(!items.length){
      box.style.display='none';
      status.textContent='Nenhuma rua encontrada nessa cidade. Tente outra parte do nome.';
      return;
    }
    items.slice(0,12).forEach(item=>{
      const title=item.street||item.label||'Endereço';
      const meta=[item.district,`${item.city} - ${item.uf}`,item.cep].filter(Boolean).join(' · ');
      box.appendChild(makeButton(title,meta,()=>showStreet(item)));
    });
    const foot=document.createElement('div');
    foot.className='meta';
    foot.style.cssText='padding:7px 10px';
    foot.textContent='Ruas e CEPs: ViaCEP';
    box.appendChild(foot);
    box.style.display='block';
    status.textContent='Selecione a rua/endereço correto.';
  }

  async function searchAddress(){
    const q=clean(address.value);
    const seq=++requestSeq;
    if(q.length<3){
      box.style.display='none';
      status.textContent=selectedCity?'Digite pelo menos 3 letras da rua.':'Digite pelo menos 3 letras da cidade.';
      return;
    }

    controller?.abort();
    controller=new AbortController();
    status.textContent=selectedCity?'Buscando ruas e CEPs...':'Buscando municípios do Brasil...';

    try{
      const params=new URLSearchParams({q});
      if(selectedCity){
        params.set('city',selectedCity.city);
        params.set('uf',selectedCity.uf);
      }
      const res=await fetch(`${API}?${params.toString()}`,{signal:controller.signal,headers:{'Accept':'application/json'}});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      if(seq!==requestSeq)return;
      const items=Array.isArray(data?.items)?data.items:[];
      if(selectedCity)renderStreets(items);else renderCities(items);
    }catch(e){
      if(e?.name==='AbortError')return;
      console.error('[Local AI] address-search:',e);
      box.style.display='none';
      status.textContent='Não foi possível buscar endereços agora. Tente novamente.';
    }
  }

  address.addEventListener('input',()=>{
    if(finalLabel&&address.value!==finalLabel)clearFinal();
    clearTimeout(timer);
    timer=setTimeout(searchAddress,350);
  });

  address.addEventListener('focus',()=>{
    if(box.children.length&&address.value.length>=3)box.style.display='block';
  });

  document.addEventListener('click',e=>{
    if(e.target!==address&&!box.contains(e.target)&&!selected.contains(e.target))box.style.display='none';
  });

  const original=form.onsubmit;
  form.onsubmit=async function(e){
    if(address.dataset.validated!=='1'||!lat.value||!lng.value){
      e?.preventDefault?.();
      status.textContent=selectedCity?'Selecione uma rua real da lista antes de salvar.':'Primeiro selecione a cidade e depois uma rua real.';
      address.focus();
      return false;
    }
    return typeof original==='function'?original.call(form,e):undefined;
  };
}
