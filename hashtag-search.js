import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';

const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');

const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const tagsFrom=s=>[...(s||'').matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(m=>m[1]).filter(t=>t.length<=25).slice(0,5);
const shortTag=t=>t.length>20?t.slice(0,17)+'…':t;

function requestedTags(text){return tagsFrom(text).map(norm).filter(Boolean)}
function matchingTags(store,wanted){
  const tags=tagsFrom(store.description||'');
  return tags.map(t=>({raw:t,n:norm(t)})).filter(t=>wanted.some(w=>t.n===w||t.n.includes(w)||w.includes(t.n))).map(t=>'#'+t.raw);
}
function allTags(store){return tagsFrom(store.description||'').map(t=>'#'+t)}
function haversine(a,b){
  if(!a||!b||b.latitude==null||b.longitude==null)return null;
  const R=6371,rad=x=>x*Math.PI/180,dLat=rad(Number(b.latitude)-a.lat),dLon=rad(Number(b.longitude)-a.lng);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(Number(b.latitude)))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
async function getLocation(){
  if(!navigator.geolocation)return null;
  return await new Promise(resolve=>navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>resolve(null),{enableHighAccuracy:true,timeout:5000,maximumAge:60000}));
}
function isOpen(store,hours){
  const d=new Date(),row=hours.find(h=>h.store_id===store.id&&Number(h.weekday)===d.getDay());
  if(!row||row.closed||!row.opens_at||!row.closes_at)return false;
  const now=d.getHours()*60+d.getMinutes();
  const a=Number(String(row.opens_at).slice(0,2))*60+Number(String(row.opens_at).slice(3,5));
  const b=Number(String(row.closes_at).slice(0,2))*60+Number(String(row.closes_at).slice(3,5));
  return now>=a&&now<=b;
}
function messageShell(text){
  const d=document.createElement('div');d.className='msg bot hashtag-result-msg';
  const p=document.createElement('div');p.className='hashtag-intro';p.textContent=text;d.appendChild(p);
  msgs?.appendChild(d);if(msgs)msgs.scrollTop=msgs.scrollHeight;return d;
}
function addUser(text){const d=document.createElement('div');d.className='msg user';d.textContent=text;msgs?.appendChild(d)}
function chip(text,kind=''){const s=document.createElement('span');s.className='store-chip '+kind;s.textContent=text;return s}
function submitText(text){if(!input||!form)return;input.value=text;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))}
function cardFor(x,index,hours,userPos){
  const s=x.store,d=haversine(userPos,s),open=isOpen(s,hours),tags=allTags(s);
  const card=document.createElement('article');card.className='store-result-card';

  const header=document.createElement('div');header.className='store-card-top';
  const left=document.createElement('div');
  const title=document.createElement('h3');title.textContent=s.name||'Loja';
  const meta=document.createElement('div');meta.className='store-card-meta';
  if(s.category)meta.appendChild(chip(s.category,'category'));
  meta.appendChild(chip(open?'Aberto agora':'Fechado',open?'open':'closed'));
  if(d!=null)meta.appendChild(chip(`${d.toFixed(1)} km`,'distance'));
  left.append(title,meta);
  const rank=document.createElement('span');rank.className='store-rank';rank.textContent=String(index+1).padStart(2,'0');
  header.append(left,rank);card.appendChild(header);

  if(s.address){
    const addr=document.createElement('div');addr.className='store-address';addr.textContent=s.address;card.appendChild(addr)
  }

  if(tags.length){
    const tagBox=document.createElement('div');tagBox.className='store-tags';
    tags.forEach(t=>tagBox.appendChild(chip(shortTag(t),'tag')));
    card.appendChild(tagBox)
  }

  const compact=[];
  if(Number(s.rating||0)>0)compact.push(`★ ${Number(s.rating).toFixed(1)}`);
  if(s.delivery)compact.push('Entrega');
  if(s.pickup)compact.push('Retirada');
  if(Number(s.delivery_fee||0)===0&&s.delivery)compact.push('Sem taxa');
  if(compact.length){const facts=document.createElement('div');facts.className='store-facts-text';facts.textContent=compact.join(' · ');card.appendChild(facts)}

  const why=document.createElement('div');why.className='store-why';
  const reasons=[];
  if(x.tags.length)reasons.push('combina com sua busca');
  if(d!=null)reasons.push(`fica a ${d.toFixed(1)} km`);
  if(open)reasons.push('está aberta');
  if(s.delivery)reasons.push('faz entrega');
  why.textContent=`${index===0?'Boa opção para você':'Outra opção'}${reasons.length?': '+reasons.join(', '):''}.`;
  card.appendChild(why);

  const actions=document.createElement('div');actions.className='store-card-actions';
  const details=document.createElement('button');details.type='button';details.className='store-action primary';details.textContent='Ver loja';details.onclick=()=>submitText(s.name);
  const products=document.createElement('button');products.type='button';products.className='store-action';products.textContent='Produtos';products.onclick=()=>submitText(`${s.name} produtos`);
  const route=document.createElement('button');route.type='button';route.className='store-action';route.textContent='Rota';route.onclick=()=>window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address||s.name)}`,'_blank','noopener');
  actions.append(details,products,route);card.appendChild(actions);
  return card;
}

form?.addEventListener('submit',async e=>{
  const text=input?.value.trim()||'';const wanted=requestedTags(text);if(!wanted.length)return;
  e.preventDefault();e.stopImmediatePropagation();addUser(text);if(input)input.value='';if(ctx)ctx.textContent='Contexto: hashtags · '+wanted.map(x=>'#'+x).join(' ');
  const[{data,error},{data:hoursData},userPos]=await Promise.all([
    sb.from('local_ai_stores').select('id,name,category,address,description,rating,delivery,delivery_fee,pickup,latitude,longitude,active,status').eq('active',true).eq('status','active'),
    sb.from('local_ai_store_hours').select('store_id,weekday,opens_at,closes_at,closed'),
    getLocation()
  ]);
  if(error){messageShell('Não consegui pesquisar as hashtags agora. Tente novamente.');return}
  const rows=(data||[]).map(store=>({store,tags:matchingTags(store,wanted)})).filter(x=>x.tags.length);
  if(!rows.length){messageShell(`Não encontrei lojas cadastradas com ${wanted.map(x=>'#'+x).join(' ')}.`);return}
  rows.sort((a,b)=>{const da=haversine(userPos,a.store),db=haversine(userPos,b.store);if(da!=null&&db!=null)return da-db;return Number(b.store.rating||0)-Number(a.store.rating||0)});
  const shell=messageShell(`${rows.length===1?'1 opção encontrada':rows.length+' opções encontradas'} para ${wanted.map(x=>'#'+shortTag(x)).join(' ')}.`);
  const grid=document.createElement('div');grid.className='store-results-grid';rows.slice(0,6).forEach((x,i)=>grid.appendChild(cardFor(x,i,hoursData||[],userPos)));shell.appendChild(grid);
  if(msgs)msgs.scrollTop=msgs.scrollHeight;
},true);
