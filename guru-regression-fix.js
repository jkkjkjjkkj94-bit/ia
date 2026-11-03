const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');

const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const days={domingo:0,segunda:1,'segunda feira':1,terca:2,'terca feira':2,quarta:3,'quarta feira':3,quinta:4,'quinta feira':4,sexta:5,'sexta feira':5,sabado:6};

function normalize(text){
  let n=norm(text);
  n=n.replace(/\bpizaria\b/g,'pizzaria').replace(/\bpizeria\b/g,'pizzaria').replace(/\bpizzarria\b/g,'pizzaria');
  n=n.replace(/\bcomercio\b/g,'loja').replace(/\bcomercios\b/g,'lojas');
  return n;
}
function addUser(text){
  if(!msgs)return;
  const d=document.createElement('div');d.className='msg user';d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
}
function clearSearchSpecific(s){
  s.selectedStore=null;s.selectedProduct=null;s.product=null;s.specialty=null;s.term=null;s.lastResults=[];
}
function applyFilters(n,s){
  let foundDay=null;
  for(const[name,num]of Object.entries(days)){
    const re=new RegExp(`(?:^|\\s)${name.replace(/ /g,'\\s+')}(?:\\s|$)`);
    if(re.test(n)){foundDay=num;break}
  }
  if(foundDay!==null){s.day=foundDay;s.openNow=false}
  if(/\b(aberta|aberto|abertas|abertos) agora\b/.test(n)){s.openNow=true;s.day=null}
  if(/\bcom entrega\b|\bdelivery\b/.test(n))s.delivery=true;
  if(/\bsem entrega\b/.test(n))s.delivery=false;
}
function render(s){
  if(!ctx)return;
  const p=[];
  if(s.category)p.push('Categoria: '+s.category);
  if(s.group)p.push('Grupo: '+s.group);
  if(s.day!==null&&s.day!==undefined)p.push('Dia: '+['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][s.day]);
  if(s.openNow)p.push('abertas agora');
  if(s.delivery===true)p.push('com entrega');
  if(s.delivery===false)p.push('sem entrega');
  ctx.textContent=p.length?'Contexto: '+p.join(' · '):'';
}
async function run(original,{category=null,group=null,allStores=false,openNow=false,delivery=null}={}){
  const engine=window.LocalAIEngine;if(!engine)return false;
  const s=engine.state,n=normalize(original);
  clearSearchSpecific(s);
  if(allStores){s.category=null;s.group=null}
  else {if(category)s.category=category;if(group)s.group=group}
  applyFilters(n,s);
  if(openNow){s.openNow=true;s.day=null}
  if(delivery!==null)s.delivery=delivery;
  addUser(original);input.value='';
  let query='lojas';
  if(group==='Japonesa')query='japonesa';
  if(group==='Pizzaria')query='pizzaria';
  if(s.openNow)query+=' abertas agora';
  else if(s.day!==null&&s.day!==undefined)query+=' '+['domingo','segunda','terca','quarta','quinta','sexta','sabado'][s.day];
  if(s.delivery===true)query+=' com entrega';
  await engine.handle(query);
  if(allStores){s.category=null;s.group=null}
  else {if(category)s.category=category;if(group)s.group=group}
  applyFilters(n,s);render(s);
  return true;
}

form?.addEventListener('submit',async e=>{
  const original=input?.value?.trim();if(!original||!window.LocalAIEngine)return;
  const n=normalize(original);
  let opts=null;

  if(/\b(sushi)\b/.test(n)||/\bcomida japonesa\b/.test(n))opts={category:'Comida',group:'Japonesa'};
  else if(/\bpizzaria\b|\bpizza\b/.test(n))opts={category:'Comida',group:'Pizzaria'};
  else if(/^lojas?\s+abert[oa]s?\s+agora$/.test(n))opts={allStores:true,openNow:true};
  else if(/^lojas?\s+com\s+entrega$/.test(n))opts={allStores:true,delivery:true};

  if(!opts)return;
  e.preventDefault();e.stopImmediatePropagation();
  await run(original,opts);
},true);

window.GuruRegressionFix={normalize,run};
