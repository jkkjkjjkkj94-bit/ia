const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');
if(!form||!input||!msgs)throw new Error('Chat não encontrado');

const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const intents={Comida:['comida','pizzaria','pizza','restaurante','lanchonete','hamburgueria','hamburguer','lanche','sushi','pastel','padaria','cafeteria','cafe','acai','jantar','almoco'],Roupas:['roupa','roupas','vestuario','camiseta','camisa','calca','vestido','moda','boutique','vestir'],Mercado:['mercado','supermercado','mercearia','hortifruti'],Farmácia:['farmacia','remedio','medicamento','drogaria'],Beleza:['beleza','salao','cabeleireiro','barbearia','manicure','estetica'],Tecnologia:['tecnologia','informatica','celular','computador','eletronico'],Serviços:['servico','servicos','assistencia','conserto','manutencao'],Automóveis:['carro','automovel','autopecas','oficina','pneu'],Construção:['construcao','ferragem','tinta'],'Pet shop':['pet','petshop','pet shop','racao','veterinario']};
const intentCategory=t=>{const n=norm(t);for(const[c,terms]of Object.entries(intents))if(terms.some(w=>n.includes(norm(w))))return c;return null};
let stores=[];
let lastCategory=null;

function addMsg(html,cls='bot'){
  const d=document.createElement('div');
  d.className='msg '+cls;
  if(cls==='bot')d.innerHTML=html;else d.textContent=html;
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
  return d;
}

function extractCity(address=''){
  const raw=String(address).replace(/·/g,',');
  const dash=[...raw.matchAll(/(?:^|,)\s*([^,]+?)\s*-\s*([A-Z]{2})(?=\s*(?:,|$))/g)].pop();
  if(dash)return{city:dash[1].trim(),uf:dash[2].trim().toUpperCase()};
  const parts=raw.split(',').map(x=>x.trim()).filter(Boolean);
  for(let i=1;i<parts.length;i++)if(/^[A-Z]{2}$/i.test(parts[i]))return{city:parts[i-1],uf:parts[i].toUpperCase()};
  return null;
}

function cityFromText(text){
  const n=norm(text);
  if(n.length<3)return null;
  let best=null;
  for(const s of stores){
    const c=extractCity(s.address);
    if(!c)continue;
    const city=norm(c.city),full=norm(`${c.city} ${c.uf}`);
    if(n.includes(city)||n===full||full.includes(n)){
      if(!best||city.length>norm(best.city).length)best=c;
    }
  }
  return best;
}

async function loadStores(){
  try{
    const src=await fetch('./app.js',{cache:'no-store'}).then(r=>r.text());
    const url=src.match(/createClient\(['"]([^'"]+)['"]/i)?.[1];
    const prefix=src.match(/'sb_publishable_'\s*\+\s*'([^']+)'/i)?.[1];
    if(!url||!prefix)return;
    const key='sb_publishable_'+prefix;
    const endpoint=`${url}/rest/v1/local_ai_stores?select=*&active=eq.true&status=eq.active`;
    stores=await fetch(endpoint,{headers:{apikey:key,Authorization:`Bearer ${key}`}}).then(r=>r.ok?r.json():[]);
  }catch{stores=[]}
}
await loadStores();

function render(list,city,category){
  const title=category?`${category} em ${city.city} - ${city.uf}`:`Lojas em ${city.city} - ${city.uf}`;
  if(!list.length){
    addMsg(`<div class="city-context-result"><strong>${esc(title)}</strong><p>Não encontrei lojas cadastradas com esse contexto. Tente outra categoria ou outra cidade.</p></div>`);
    return;
  }
  const cards=list.slice(0,6).map((s,i)=>`<div class="normal-result-card city-result-card"><div class="store-card-top"><h3>${esc(s.name)}</h3><span class="store-rank">#${i+1}</span></div><div class="normal-result-meta"><span class="store-chip category">${esc(s.category||'Loja')}</span><span class="store-chip">${esc(city.city)} - ${esc(city.uf)}</span>${s.delivery?'<span class="store-chip">Entrega</span>':''}</div><div class="store-address">${esc(s.address||'Endereço não informado')}</div><div class="normal-result-actions"><button type="button" data-city-open="${esc(s.name)}">Ver loja</button></div></div>`).join('');
  const d=addMsg(`<div class="normal-result-msg city-context-result"><div class="normal-result-intro">${esc(title)}</div><div class="store-results-grid">${cards}</div></div>`);
  d.querySelectorAll('[data-city-open]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.cityOpen;form.requestSubmit()}));
}

form.addEventListener('submit',e=>{
  const text=input.value.trim();
  if(!text)return;
  const category=intentCategory(text);
  if(category)lastCategory=category;
  const city=cityFromText(text);
  if(!city)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  addMsg(text,'user');
  input.value='';
  const effectiveCategory=category||lastCategory;
  const cNorm=norm(city.city),ufNorm=norm(city.uf);
  const list=stores.filter(s=>norm(s.address).includes(cNorm)&&norm(s.address).includes(ufNorm)&&(!effectiveCategory||norm(s.category)===norm(effectiveCategory)));
  if(ctx)ctx.textContent=`Contexto: ${effectiveCategory?effectiveCategory+' · ':''}${city.city} - ${city.uf}`;
  render(list,city,effectiveCategory);
},true);

new MutationObserver(()=>{
  const last=[...msgs.querySelectorAll('.msg.user')].at(-1)?.textContent||'';
  const cat=intentCategory(last);
  if(cat)lastCategory=cat;
}).observe(msgs,{childList:true,subtree:true});
