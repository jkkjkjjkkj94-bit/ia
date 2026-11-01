const CORE_URL='https://ccsypggvelcxsqszepfs.supabase.co';
const CORE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
const AI_URL='https://innziuzgtpfsiywqmies.supabase.co';
const AI_KEY='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
const dayNames=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
let cache=null,lastReply='';

const replies={
  general:[
    'Hmm, desse jeito eu não achei nenhuma opção cadastrada. Se quiser, posso tentar com menos filtros.',
    'Não apareceu nenhuma opção que combine com tudo isso. A gente pode ampliar um pouco a busca.',
    'Dessa vez não encontrei uma opção certinha para todos os critérios. Posso tentar algo parecido.',
    'Parece que essa combinação ficou bem específica. Se você quiser, dá para aliviar um dos filtros e tentar de novo.'
  ],
  group:[
    'Ainda não encontrei nenhuma loja de {group} cadastrada aqui. Posso procurar outras opções de {category} para você.',
    'Pelo que tenho cadastrado, ainda não apareceu nenhuma opção de {group}. Se quiser, posso ampliar para {category}.',
    'Não achei uma loja de {group} por enquanto. Posso te mostrar opções parecidas dentro de {category}.'
  ],
  location:[
    'Eu achei opções de {group}, mas nenhuma nessa região. Se quiser, posso procurar em uma área próxima.',
    'Tem opção de {group} cadastrada, só não encontrei nenhuma no local que você pediu. Quer que eu amplie a região?',
    'O tipo de lugar existe por aqui, mas não encontrei nessa cidade ou bairro. Posso buscar um pouco mais longe.'
  ],
  schedule:[
    'Eu encontrei opções de {group}, mas nenhuma está cadastrada como aberta {when}. Posso mostrar as opções mesmo assim.',
    'Tem lugar de {group}, só que nenhum bate com o horário {when}. Se quiser, eu tiro esse filtro.',
    'Achei opções compatíveis, mas o horário foi o que eliminou todas. Posso procurar sem limitar por {when}.'
  ],
  delivery:[
    'Eu encontrei opções de {group}, mas nenhuma com entrega cadastrada. Posso mostrar as opções para retirada ou consumo no local.',
    'Tem lugar de {group}, só não achei nenhum com entrega disponível. Quer ver as outras opções mesmo assim?',
    'A busca encontrou lugares compatíveis, mas o filtro de entrega deixou tudo de fora. Posso remover esse filtro.'
  ],
  product:[
    'Eu encontrei lojas compatíveis, mas nenhuma tem {product} cadastrado agora. Posso mostrar as lojas mesmo assim.',
    'Tem lugares que combinam com a busca, só não achei {product} entre os produtos ou especialidades cadastradas.',
    'Achei as lojas, mas o item {product} não apareceu no cadastro delas. Posso te mostrar as opções mais próximas do que você pediu.'
  ],
  price:[
    'Eu encontrei opções, mas nenhuma ficou dentro desse valor. Se quiser, posso aumentar um pouco o limite.',
    'Tem resultados compatíveis, só que o preço filtrou todos eles. Posso procurar sem esse limite.',
    'Achei opções, mas nenhuma bateu com a faixa de preço que você pediu. Quer que eu amplie o valor?'
  ],
  distance:[
    'Eu encontrei opções, mas todas ficaram além da distância que você definiu. Posso ampliar o raio da busca.',
    'Tem resultados compatíveis, só que nenhum ficou perto o bastante. Se quiser, posso procurar um pouco mais longe.',
    'Achei opções, mas a distância eliminou todas. Posso aumentar o limite para você.'
  ]
};

function pick(type,vars={}){const list=replies[type]||replies.general;const choices=list.filter(x=>x!==lastReply);let text=choices[Math.floor(Math.random()*choices.length)]||list[0];lastReply=text;for(const[k,v]of Object.entries(vars))text=text.replaceAll(`{${k}}`,v||'');return text.replace(/\s+/g,' ').trim()}
function parseLocation(address=''){return norm(String(address).replace(/·/g,','))}
function storeGroups(s){return[s.group,...(Array.isArray(s.groups)?s.groups:[])].filter(Boolean).map(norm)}
function matchBase(s,state){if(state.category&&norm(s.category)!==norm(state.category))return false;if(state.group&&!storeGroups(s).includes(norm(state.group)))return false;return true}
function matchLocation(s,state){const addr=parseLocation(s.address);if(state.location?.city&&!addr.includes(norm(state.location.city)))return false;if(state.location?.neighborhood&&!addr.includes(norm(state.location.neighborhood)))return false;if(state.location?.uf&&!addr.includes(norm(state.location.uf)))return false;return true}
function minutes(v){if(!v)return null;const s=String(v);return Number(s.slice(0,2))*60+Number(s.slice(3,5))}
function matchSchedule(s,state,hours){if(!state.openNow&&state.day==null&&state.timeStart==null&&state.timeEnd==null)return true;const now=new Date();const day=state.openNow?now.getDay():(state.day??now.getDay());const row=hours.find(h=>h.store_id===s.id&&Number(h.weekday)===Number(day));if(!row||row.closed||!row.opens_at||!row.closes_at)return false;const open=minutes(row.opens_at),close=minutes(row.closes_at);if(state.openNow){const cur=now.getHours()*60+now.getMinutes();return cur>=open&&cur<=close}if(state.timeStart!=null&&state.timeEnd!=null&&state.timeStart===state.timeEnd)return open<=state.timeStart&&close>=state.timeStart;if(state.timeStart!=null&&close<=state.timeStart)return false;if(state.timeEnd!=null&&open>=state.timeEnd)return false;return true}
function explicitProduct(state){const p=norm(state.product||'');if(!p)return'';const generic=new Set(['comida','comer','doce','doceria','pizza','pizzaria','japonesa','hamburgueria','roupa','roupas','mercado','farmacia','beleza','tecnologia','servico','servicos','loja','lugar','local']);if(generic.has(p))return'';if(state.group&&state.lastAnalysis?.group&&norm(state.lastAnalysis.group)===norm(state.group)&&state.lastAnalysis?.matchedType!=='product')return'';return state.product}
function matchProduct(store,product,products){const q=norm(product);if(!q)return true;const specs=norm((Array.isArray(store.specialties)?store.specialties:[]).join(' '));if(q.split(' ').every(w=>specs.includes(w)))return true;return products.some(p=>p.store_id===store.id&&Number(p.stock)>0&&q.split(' ').every(w=>norm([p.name,p.description,p.category,p.brand,p.color].join(' ')).includes(w)))}
async function rest(url,key,path){const r=await fetch(url+'/rest/v1/'+path,{headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
async function loadData(){if(cache)return cache;try{const[stores,products,hours]=await Promise.all([rest(CORE_URL,CORE_KEY,'local_ai_stores?select=*&active=eq.true&status=eq.active'),rest(CORE_URL,CORE_KEY,'local_ai_products?select=*&active=eq.true&show_in_ai=eq.true'),rest(AI_URL,AI_KEY,'local_ai_store_hours?select=*')]);cache={stores,products,hours};setTimeout(()=>cache=null,30000);return cache}catch{return{stores:[],products:[],hours:[]}}}
function whenText(state){if(state.openNow)return'agora';const d=state.day!=null?`no ${dayNames[state.day]}`:'';const p=state.timePeriod==='morning'?'de manhã':state.timePeriod==='afternoon'?'à tarde':state.timePeriod==='night'?'à noite':state.timeStart!=null?'depois do horário pedido':'';return[d,p].filter(Boolean).join(' ')||'nesse horário'}
async function diagnose(state){const data=await loadData(),product=explicitProduct(state),vars={group:state.group||state.category||'desse tipo',category:state.category||'lugares parecidos',product:product||'esse item'};if(!data.stores.length)return pick('general',vars);
 const base=data.stores.filter(s=>matchBase(s,state));if(!base.length)return state.group?pick('group',vars):pick('general',vars);
 const located=base.filter(s=>matchLocation(s,state));if(!located.length&&(state.location?.city||state.location?.neighborhood||state.location?.uf))return pick('location',vars);
 const area=located.length?located:base;
 if(state.delivery===true&&!area.some(s=>s.delivery))return pick('delivery',vars);
 const scheduled=area.filter(s=>matchSchedule(s,state,data.hours));if(!scheduled.length&&(state.openNow||state.day!=null||state.timeStart!=null||state.timeEnd!=null))return pick('schedule',{...vars,when:whenText(state)});
 const timed=scheduled.length?scheduled:area;
 if(product&&!timed.some(s=>matchProduct(s,product,data.products)))return pick('product',vars);
 if(state.maxDistance!=null&&window.LocalAIRealLocation)return pick('distance',vars);
 if(state.maxPrice!=null||state.minPrice!=null)return pick('price',vars);
 return state.group?pick('group',vars):pick('general',vars)}

function isZeroMessage(text=''){const n=norm(text);return n.includes('nao encontrei nenhuma loja cadastrada')||n.includes('nao encontrei uma opcao cadastrada com esses criterios')||n.includes('nao encontrei uma opcao cadastrada')}
async function transform(node){if(!(node instanceof HTMLElement)||!node.classList.contains('msg')||!node.classList.contains('bot')||node.dataset.zeroNatural==='1')return;if(!isZeroMessage(node.textContent))return;node.dataset.zeroNatural='1';const state=window.LocalAIEngine?.state;if(!state)return;node.textContent=await diagnose(state)}
const msgs=document.getElementById('msgs');if(msgs){msgs.querySelectorAll('.msg.bot').forEach(transform);new MutationObserver(records=>{for(const r of records)r.addedNodes.forEach(n=>{if(n.nodeType===1){transform(n);n.querySelectorAll?.('.msg.bot').forEach(transform)}})}).observe(msgs,{childList:true,subtree:true})}
window.LocalAIZeroResults={diagnose};