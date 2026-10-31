const form=document.getElementById('storeForm');
const address=document.getElementById('sAddress');
const lat=document.getElementById('sLat');
const lng=document.getElementById('sLng');

if(form&&address&&lat&&lng){
  const API='https://innziuzgtpfsiywqmies.supabase.co/functions/v1/address-search';
  const clean=s=>String(s||'').trim();
  const norm=s=>clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // Os dados técnicos continuam no formulário, mas nunca aparecem para o lojista.
  address.type='hidden';
  lat.type='hidden';
  lng.type='hidden';
  lat.removeAttribute('required');
  lng.removeAttribute('required');
  address.removeAttribute('required');

  const addressWrap=address.closest('.field');
  const latWrap=lat.closest('.field');
  const lngWrap=lng.closest('.field');
  const coordGrid=latWrap?.parentElement;
  form.append(address,lat,lng);
  addressWrap?.remove();
  latWrap?.remove();
  lngWrap?.remove();
  if(coordGrid&&coordGrid.children.length===0)coordGrid.remove();

  const anchor=document.getElementById('sWhatsapp')?.closest('.field')||form.querySelector('.card');
  const block=document.createElement('div');
  block.id='guidedAddress';
  block.innerHTML=`
    <div class="field"><label>Endereço</label><div id="savedAddress" class="meta" style="display:none;padding:10px 12px;border:1px solid #e5e5e5;border-radius:10px;background:#fafafa;margin-bottom:8px"></div></div>
    <div class="field"><label>Cidade</label><input id="addrCity" autocomplete="off" placeholder="Digite a cidade"><div id="citySuggestions"></div></div>
    <div class="field"><label>Bairro</label><input id="addrDistrict" autocomplete="off" placeholder="Digite o bairro" disabled></div>
    <div class="field"><label>Rua / Avenida</label><input id="addrStreet" autocomplete="off" placeholder="Digite a rua ou avenida" disabled><div id="streetSuggestions"></div></div>
    <div class="grid"><div class="field"><label>Número</label><input id="addrNumber" inputmode="numeric" placeholder="Ex.: 119" disabled></div><div class="field"><label>Complemento</label><input id="addrComplement" placeholder="Ex.: Sala 2, Fundos" disabled></div></div>
    <div id="addressValidationStatus" class="meta" style="margin-top:6px">Digite a cidade e escolha uma opção da lista.</div>`;
  anchor?.insertAdjacentElement('afterend',block);

  const city=document.getElementById('addrCity');
  const district=document.getElementById('addrDistrict');
  const street=document.getElementById('addrStreet');
  const number=document.getElementById('addrNumber');
  const complement=document.getElementById('addrComplement');
  const cityBox=document.getElementById('citySuggestions');
  const streetBox=document.getElementById('streetSuggestions');
  const saved=document.getElementById('savedAddress');
  const status=document.getElementById('addressValidationStatus');

  const styleBox=box=>box.style.cssText='display:none;border:1px solid #ddd;border-radius:12px;margin-top:6px;overflow:hidden;background:#fff;max-height:260px;overflow-y:auto;position:relative;z-index:50;box-shadow:0 10px 28px rgba(0,0,0,.08)';
  styleBox(cityBox);styleBox(streetBox);

  let selectedCity=null,selectedStreet=null,timer=null,controller=null,seq=0;
  let existingLoaded=false;

  function button(title,meta,fn){const b=document.createElement('button');b.type='button';b.style.cssText='display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #eee;padding:11px 12px;background:#fff;cursor:pointer;font:inherit';b.innerHTML=`<b style="display:block">${esc(title)}</b><span class="meta">${esc(meta)}</span>`;b.onmouseenter=()=>b.style.background='#f7f7f7';b.onmouseleave=()=>b.style.background='#fff';b.onclick=fn;return b}
  function clearCoords(){lat.value='';lng.value='';address.dataset.validated='0'}
  function clearFromCity(){selectedCity=null;selectedStreet=null;clearCoords();district.value='';street.value='';number.value='';complement.value='';district.disabled=true;street.disabled=true;number.disabled=true;complement.disabled=true;streetBox.style.display='none';status.textContent='Digite a cidade e escolha uma opção da lista.'}
  function clearFromDistrict(){selectedStreet=null;clearCoords();street.value='';number.value='';complement.value='';street.disabled=false;number.disabled=true;complement.disabled=true;streetBox.style.display='none';status.textContent='Agora digite a rua ou avenida.'}
  function clearFromStreet(){selectedStreet=null;clearCoords();number.value='';complement.value='';number.disabled=true;complement.disabled=true;status.textContent='Escolha uma rua da lista.'}

  async function fetchItems(params){controller?.abort();controller=new AbortController();const my=++seq;const r=await fetch(`${API}?${new URLSearchParams(params)}`,{signal:controller.signal,headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const data=await r.json();if(my!==seq)return[];return Array.isArray(data?.items)?data.items:[]}

  async function searchCities(){const q=clean(city.value);if(q.length<3){cityBox.style.display='none';return}status.textContent='Buscando cidades...';try{const items=await fetchItems({q});cityBox.innerHTML='';items.slice(0,10).forEach(item=>cityBox.appendChild(button(`${item.city} - ${item.uf}`,item.state||'Brasil',()=>selectCity(item))));cityBox.style.display=items.length?'block':'none';status.textContent=items.length?'Escolha a cidade correta.':'Nenhuma cidade encontrada.'}catch(e){if(e?.name!=='AbortError')status.textContent='Não foi possível buscar cidades agora.'}}
  function selectCity(item){selectedCity=item;city.value=`${item.city} - ${item.uf}`;city.readOnly=true;cityBox.style.display='none';district.disabled=false;street.disabled=true;number.disabled=true;complement.disabled=true;status.textContent='Cidade selecionada. Digite o bairro.';district.focus()}

  async function searchStreets(){if(!selectedCity)return;const q=clean(street.value);if(q.length<3){streetBox.style.display='none';return}status.textContent='Buscando ruas...';try{let items=await fetchItems({q,city:selectedCity.city,uf:selectedCity.uf});const d=norm(district.value);if(d)items=items.filter(x=>!x.district||norm(x.district).includes(d)||d.includes(norm(x.district)));streetBox.innerHTML='';items.slice(0,12).forEach(item=>streetBox.appendChild(button(item.street||item.label,[item.district,`${item.city} - ${item.uf}`,item.cep].filter(Boolean).join(' · '),()=>selectStreet(item))));streetBox.style.display=items.length?'block':'none';status.textContent=items.length?'Escolha a rua correta.':'Nenhuma rua encontrada nesse bairro. Confira o bairro ou tente outro trecho da rua.'}catch(e){if(e?.name!=='AbortError')status.textContent='Não foi possível buscar ruas agora.'}}
  function selectStreet(item){selectedStreet=item;street.value=item.street||item.label;street.readOnly=true;streetBox.style.display='none';if(!district.value&&item.district)district.value=item.district;number.disabled=false;complement.disabled=false;status.textContent='Rua selecionada. Informe o número do imóvel.';number.focus()}

  async function validateNumber(){if(!selectedStreet)return;const n=clean(number.value);if(!n){clearCoords();status.textContent='Informe o número do imóvel.';return}clearCoords();status.textContent='Validando endereço e localização...';const query=[`${selectedStreet.street}, ${n}`,clean(district.value)||selectedStreet.district,selectedStreet.city,selectedStreet.uf,selectedStreet.cep,'Brasil'].filter(Boolean).join(', ');try{const params={resolve:'1',q:query,number:n};if(selectedStreet.cep)params.cep=selectedStreet.cep;const r=await fetch(`${API}?${new URLSearchParams(params)}`,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error();const data=await r.json(),resolved=data?.resolved;if(!resolved?.lat||!resolved?.lng){status.textContent='Não consegui localizar esse número. Confira os dados.';return}lat.value=String(resolved.lat);lng.value=String(resolved.lng);const final=[`${selectedStreet.street}, ${n}`,clean(complement.value),clean(district.value)||selectedStreet.district,`${selectedStreet.city} - ${selectedStreet.uf}`,selectedStreet.cep].filter(Boolean).join(' · ');address.value=final;address.dataset.validated='1';saved.style.display='block';saved.textContent=final;status.textContent=resolved.accuracy==='exact'?'✓ Endereço validado com localização exata.':'✓ Endereço validado. A localização foi salva automaticamente.'}catch{status.textContent='Não foi possível validar o endereço agora.'}}

  city.addEventListener('input',()=>{if(city.readOnly)return;clearFromCity();city.disabled=false;clearTimeout(timer);timer=setTimeout(searchCities,300)});
  city.addEventListener('dblclick',()=>{city.readOnly=false;city.value='';clearFromCity();city.focus()});
  district.addEventListener('input',()=>{clearFromDistrict();street.disabled=false});
  street.addEventListener('input',()=>{if(street.readOnly)return;clearFromStreet();clearTimeout(timer);timer=setTimeout(searchStreets,300)});
  street.addEventListener('dblclick',()=>{street.readOnly=false;street.value='';clearFromStreet();street.focus()});
  number.addEventListener('input',()=>{clearCoords();clearTimeout(timer);timer=setTimeout(validateNumber,650)});
  complement.addEventListener('input',()=>{if(address.dataset.validated==='1')validateNumber()});

  const original=form.onsubmit;
  form.onsubmit=async function(e){
    if(!address.value||!lat.value||!lng.value||address.dataset.validated!=='1'){
      e?.preventDefault?.();status.textContent='Escolha cidade, bairro e rua, informe o número e aguarde a validação antes de salvar.';return false
    }
    return typeof original==='function'?original.call(form,e):undefined
  };

  // Reconhece loja já cadastrada sem expor coordenadas.
  const watcher=setInterval(()=>{
    if(existingLoaded)return;
    if(clean(address.value)&&clean(lat.value)&&clean(lng.value)){
      existingLoaded=true;address.dataset.validated='1';saved.style.display='block';saved.innerHTML=`<b>Endereço salvo</b><br>${esc(address.value)}<br><button id="changeSavedAddress" type="button" class="btn sm" style="margin-top:8px">Alterar endereço</button>`;city.disabled=true;district.disabled=true;street.disabled=true;number.disabled=true;complement.disabled=true;status.textContent='✓ Endereço salvo. Latitude e longitude ficam ocultas e são usadas automaticamente.';saved.querySelector('#changeSavedAddress').onclick=()=>{address.value='';clearCoords();saved.style.display='none';city.disabled=false;city.readOnly=false;city.value='';clearFromCity();city.focus()};clearInterval(watcher)
    }
  },250);
  setTimeout(()=>clearInterval(watcher),10000);
}
