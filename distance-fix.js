import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const form=document.getElementById('chatForm'),input=document.getElementById('q'),ctx=document.getElementById('ctx'),msgs=document.getElementById('msgs');
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function add(text,user=false){const d=document.createElement('div');d.className='msg '+(user?'user':'bot');d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d}
function km(a,b,c,d){const R=6371,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b),q=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))}
function getStoreName(){const m=(ctx?.textContent||'').match(/Loja:\s*([^·]+)/i);return m?m[1].trim():null}
function locate(){return new Promise(resolve=>{if(!navigator.geolocation)return resolve(null);navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>resolve(null),{enableHighAccuracy:true,timeout:8000,maximumAge:60000})})}
form?.addEventListener('submit',async e=>{
  const text=input.value.trim(),n=norm(text),storeName=getStoreName();
  if(!storeName||!/endereco|onde fica|distancia|quanto.*km|longe|perto/.test(n))return;
  e.preventDefault();e.stopImmediatePropagation();
  add(text,true);input.value='';
  const{data:store}=await sb.from('local_ai_stores').select('name,address,latitude,longitude').eq('name',storeName).maybeSingle();
  if(!store){add('Não consegui carregar os dados dessa loja agora.');return}
  const pos=await locate();
  if(!pos){add(`${store.name}: ${store.address||'endereço não informado'}. Para calcular a distância até você, preciso que permita o acesso à localização no navegador.`);return}
  if(store.latitude==null||store.longitude==null){add(`${store.name}: ${store.address||'endereço não informado'}. A loja ainda não possui coordenadas cadastradas, então não consigo calcular a distância.`);return}
  const d=km(pos.lat,pos.lng,Number(store.latitude),Number(store.longitude));
  add(`${store.name}: ${store.address||'endereço não informado'} · aproximadamente ${d.toFixed(1).replace('.',',')} km de você.`);
},true);
