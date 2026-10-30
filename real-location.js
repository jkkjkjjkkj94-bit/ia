const $=id=>document.getElementById(id);
const toast=t=>{const el=$('toast');if(!el)return;el.textContent=t;el.classList.add('on');clearTimeout(window.__realLocToast);window.__realLocToast=setTimeout(()=>el.classList.remove('on'),2600)};

function getRealLocation(showMessage=true){
  return new Promise(resolve=>{
    if(!navigator.geolocation){
      if(showMessage)toast('Este navegador não disponibiliza localização.');
      return resolve(null);
    }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const value={
          lat:pos.coords.latitude,
          lng:pos.coords.longitude,
          accuracy:pos.coords.accuracy,
          timestamp:pos.timestamp
        };
        window.LocalAIRealLocation=value;
        if(showMessage)toast('Localização real atualizada.');
        resolve(value);
      },
      err=>{
        if(showMessage){
          const text=err?.code===1?'Permita o acesso à localização no navegador.':'Não consegui obter sua localização real agora.';
          toast(text);
        }
        resolve(null);
      },
      {enableHighAccuracy:true,timeout:10000,maximumAge:0}
    );
  });
}

async function fillStoreLocation(){
  const p=await getRealLocation(false);
  if(!p){toast('Permita a localização para preencher a posição real da loja.');return}
  const lat=$('sLat'),lng=$('sLng');
  if(lat)lat.value=p.lat.toFixed(7);
  if(lng)lng.value=p.lng.toFixed(7);
  toast(`Localização real da loja selecionada${Number.isFinite(p.accuracy)?` · precisão aproximada ${Math.round(p.accuracy)} m`:''}.`);
}

function installMerchantButton(){
  const lat=$('sLat'),lng=$('sLng');
  if(!lat||!lng||$('storeRealLocationBtn'))return;
  const grid=lat.closest('.grid');
  if(!grid)return;
  const wrap=document.createElement('div');
  wrap.style.gridColumn='1 / -1';
  wrap.innerHTML='<button type="button" class="btn" id="storeRealLocationBtn">Usar localização atual da loja</button><div class="meta" style="margin-top:6px">Usa a localização real fornecida pelo navegador/GPS.</div>';
  grid.appendChild(wrap);
  $('storeRealLocationBtn').onclick=fillStoreLocation;
}

async function preloadIfAllowed(){
  if(!navigator.permissions?.query)return;
  try{
    const status=await navigator.permissions.query({name:'geolocation'});
    if(status.state==='granted')await getRealLocation(false);
    status.onchange=()=>{if(status.state==='granted')getRealLocation(false)};
  }catch{}
}

// Mantém uma posição recente enquanto a página está aberta, somente após permissão do usuário.
function startLiveLocation(){
  if(!navigator.geolocation)return;
  navigator.geolocation.watchPosition(
    pos=>{window.LocalAIRealLocation={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,timestamp:pos.timestamp}},
    ()=>{},
    {enableHighAccuracy:true,maximumAge:15000,timeout:10000}
  );
}

window.LocalAIGetRealLocation=getRealLocation;
installMerchantButton();
preloadIfAllowed().then(startLiveLocation);
new MutationObserver(installMerchantButton).observe(document.body,{childList:true,subtree:true});
