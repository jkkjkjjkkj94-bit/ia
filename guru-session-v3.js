const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');
const MEMORY_KEY='guru_context_v3';
const MEMORY_TTL=2*60*60*1000;
const days=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
let writingContext=false;
let timer=null;
function state(){return window.LocalAIEngine?.state}
function snapshot(s=state()){
  if(!s)return null;
  return{updatedAt:Date.now(),category:s.category||null,group:s.group||null,product:s.product||null,specialty:s.specialty||null,day:s.day??null,openNow:!!s.openNow,delivery:s.delivery??null,sortBy:s.sortBy||null,timePeriod:s.timePeriod||null,location:{city:s.location?.city||null,uf:s.location?.uf||null}};
}
function save(){const p=snapshot();if(!p)return;try{sessionStorage.setItem(MEMORY_KEY,JSON.stringify(p))}catch{}}
function restore(){
  const s=state();if(!s)return false;
  try{
    const p=JSON.parse(sessionStorage.getItem(MEMORY_KEY)||'null');
    if(!p?.updatedAt||Date.now()-p.updatedAt>MEMORY_TTL)return false;
    for(const k of ['category','group','product','specialty','day','openNow','delivery','sortBy','timePeriod'])if(p[k]!==null&&p[k]!==undefined)s[k]=p[k];
    if(p.location?.city)s.location.city=p.location.city;if(p.location?.uf)s.location.uf=p.location.uf;
    return true;
  }catch{return false}
}
function clear(){try{sessionStorage.removeItem(MEMORY_KEY)}catch{}}
function trail(s=state()){
  if(!s)return[];const a=[];
  if(s.category)a.push(s.category);if(s.group)a.push(s.group);if(s.product)a.push(s.product);else if(s.specialty)a.push(s.specialty);
  if(s.day!=null)a.push(days[s.day]||String(s.day));if(s.openNow)a.push('abertas agora');if(s.delivery===true)a.push('com entrega');if(s.delivery===false)a.push('sem entrega');
  if(s.sortBy==='distancia')a.push('mais perto');if(s.sortBy==='preco')a.push('mais barato');if(s.sortBy==='avaliacao')a.push('melhor avaliadas');
  return a;
}
function renderTrail(){if(!ctx||writingContext)return;const a=trail();if(!a.length)return;const text='Contexto: '+a.join(' → ');if(ctx.textContent!==text){writingContext=true;ctx.textContent=text;queueMicrotask(()=>writingContext=false)}}
function quality(store){
  if(!store)return 0;let q=0;
  if(store.address)q+=14;if(store.latitude!=null&&store.longitude!=null)q+=14;if(store.logo_url)q+=10;if(store.whatsapp||store.phone)q+=10;
  if(store.description&&String(store.description).trim().length>=20)q+=12;if(store.category)q+=8;if(store.group||(Array.isArray(store.groups)&&store.groups.length))q+=8;
  if(Array.isArray(store.specialties)&&store.specialties.length)q+=8;if(store.delivery!==null&&store.delivery!==undefined)q+=6;if(store.verified)q+=10;
  return Math.min(100,q);
}
function rerank(){
  const s=state();if(!msgs||!Array.isArray(s?.lastResults)||!s.lastResults.length)return;
  const byName=new Map(s.lastResults.map((r,i)=>[norm(r.store?.name),{r,i,q:quality(r.store)}]));
  msgs.querySelectorAll('.store-results-grid').forEach(grid=>{
    const cards=[...grid.querySelectorAll(':scope > .store-result-card')];if(cards.length<2)return;
    cards.map((card,index)=>{const x=byName.get(norm(card.querySelector('h3')?.textContent||''));const q=x?.q||0;card.dataset.qualityScore=String(q);return{card,index,rank:index-q/90}})
      .sort((a,b)=>a.rank-b.rank).forEach(x=>grid.appendChild(x.card));
  });
}
function refresh(){clearTimeout(timer);timer=setTimeout(()=>{save();renderTrail();rerank()},300)}
setTimeout(()=>{restore();renderTrail()},180);
form?.addEventListener('submit',refresh,true);
ctx&&new MutationObserver(()=>{if(!writingContext)refresh()}).observe(ctx,{childList:true,characterData:true,subtree:true});
msgs&&new MutationObserver(refresh).observe(msgs,{childList:true,subtree:true});
window.GuruSessionV3={save,restore,clear,trail,quality,rerank};
