// GURU v4 - um único responsável por eventos, contexto, busca e resultados.
import {taxonomy as fallbackTaxonomy,categoryAliases as fallbackAliases} from './ai-taxonomy.js?v=6';
import {norm,normalizeQuery,buildLexicon,interpret,emptyState,nextState,searchStores,priceOf,eligibleProduct,ratingsMap,distanceKm,scheduleMatches} from './guru-engine-v4-core.mjs?v=2';

const CORE={url:'https://ccsypggvelcxsqszepfs.supabase.co',key:'sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG'};
const AI={url:'https://innziuzgtpfsiywqmies.supabase.co',key:'sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1'};
const form=document.getElementById('chatForm'),input=document.getElementById('q'),msgs=document.getElementById('msgs'),ctx=document.getElementById('ctx'),toast=document.getElementById('toast');
let state=emptyState(),db=null,loadPromise=null,lastLoad=0,position=null,searchBusy=false;
let taxonomy=structuredClone(fallbackTaxonomy),aliases=structuredClone(fallbackAliases);
const memoryKey='guru_context_v4',ttl=2*60*60*1000;
const money=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dayNames=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const add=(text,user=false)=>{const m=el('div','msg '+(user?'user':'bot'),text);msgs.appendChild(m);msgs.scrollTop=msgs.scrollHeight;return m};
const notice=t=>{if(toast){toast.textContent=t;toast.classList.add('on');setTimeout(()=>toast.classList.remove('on'),3200)}};
const msgError=err=>{console.error('[GURU v4]',err);add('Não consegui consultar os dados agora. Confira a conexão e tente novamente.')};
function renderContext(){
 const parts=[];if(state.selectedStore)parts.push('Loja: '+state.selectedStore.name);
 if(state.category)parts.push('Categoria: '+state.category);if(state.group)parts.push('Grupo: '+state.group);
 if(state.location?.city)parts.push('Cidade: '+state.location.city);
 if(state.filters?.day!=null)parts.push('Dia: '+dayNames[state.filters.day]);
 if(state.filters?.openNow)parts.push('abertas agora');
 if(state.filters?.delivery===true)parts.push('com entrega');else if(state.filters?.delivery===false)parts.push('sem entrega');
 if(state.filters?.pickup===true)parts.push('com retirada');
 if(state.filters?.maxPrice!=null)parts.push('até '+money(state.filters.maxPrice));
 if(state.filters?.maxDistance!=null)parts.push('até '+state.filters.maxDistance+' km');
 if(state.filters?.size)parts.push('tamanho '+state.filters.size);
 if(state.filters?.promoOnly)parts.push('em promoção');
 if(state.excludedGroups?.length)parts.push('Excluir: '+state.excludedGroups.join(', '));
 if(ctx)ctx.textContent=parts.length?'Contexto: '+parts.join(' · '):'';
}
function save(){
 try{
  const copy={...state,lastResults:(state.lastResults||[]).map(r=>r.store.id),selectedStore:state.selectedStore?.id||null,selectedProduct:state.selectedProduct?.id||null};
  sessionStorage.setItem(memoryKey,JSON.stringify({updatedAt:Date.now(),state:copy}));
 }catch{}
}
function restore(){
 try{
  const x=JSON.parse(sessionStorage.getItem(memoryKey)||'null');
  if(!x||Date.now()-x.updatedAt>ttl)return;
  const s=x.state||{};const keys=['category','group','query','semanticTerms','featureTerms','productTerm','excludedGroups','excludedCategories','excludedTerms','filters','location'];
  for(const k of keys)if(s[k]!=null)state[k]=s[k];
  state._selectedId=s.selectedStore||null;state._lastIds=s.lastResults||[];state._productId=s.selectedProduct||null;
  renderContext();
 }catch{}
}
function rehydrate(){
 if(!db)return;
 if(state._selectedId)state.selectedStore=db.stores.find(s=>s.id===state._selectedId)||null;
 if(state._productId)state.selectedProduct=db.products.find(p=>p.id===state._productId)||null;
 if(state._lastIds?.length)state.lastResults=state._lastIds.map(id=>{const st=db.stores.find(s=>s.id===id);return st?{store:st,products:db.products.filter(p=>p.store_id===id&&eligibleProduct(p)),reason:[],rating:0,distance:distanceKm(position,st)}:null}).filter(Boolean);
 delete state._lastIds;delete state._selectedId;delete state._productId;
}
async function read(project,table,query=''){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetch(project.url+'/rest/v1/'+table+'?select=*'+query,{headers:{apikey:project.key,Authorization:'Bearer '+project.key,Accept:'application/json'},signal:controller.signal});
  if(!r.ok)throw new Error(table+' HTTP '+r.status);
  const rows=await r.json();if(!Array.isArray(rows))throw new Error(table+' sem resposta válida');
  return rows;
 }finally{clearTimeout(timer)}
}
function mergeTaxonomy(cats=[],groups=[],terms=[]){
 if(!cats.length||!groups.length)return;
 const activeCats=cats.filter(x=>x.active!==false),activeGroups=groups.filter(x=>x.active!==false),activeTerms=terms.filter(x=>x.active!==false);
 const byCategory=new Map(activeCats.map(x=>[x.id,x])),byGroup=new Map(activeGroups.map(x=>[x.id,x]));
 const map={},catAliases={};
 for(const cat of activeCats){map[cat.name]={};catAliases[cat.name]=[cat.name,...(fallbackAliases[cat.name]||[])]}
 for(const group of activeGroups){const cat=byCategory.get(group.category_id);if(cat)map[cat.name][group.name]=[group.name]}
 for(const term of activeTerms){
  const cat=byCategory.get(term.category_id);if(!cat)continue;
  const group=byGroup.get(term.group_id);
  if(group&&map[cat.name]?.[group.name])map[cat.name][group.name].push(term.term);
  else if(!term.group_id)catAliases[cat.name].push(term.term);
 }
 for(const groupsObj of Object.values(map))for(const k of Object.keys(groupsObj))groupsObj[k]=[...new Set(groupsObj[k])];
 taxonomy=map;aliases=catAliases;
}
async function loadData(force=false){
 if(db&&!force&&Date.now()-lastLoad<90000)return db;
 if(loadPromise)return loadPromise;
 loadPromise=(async()=>{
  const all=await Promise.allSettled([
   read(CORE,'local_ai_stores','&active=eq.true&status=eq.active'),
   read(CORE,'local_ai_products','&active=eq.true&show_in_ai=eq.true'),
   read(AI,'local_ai_store_hours'),read(AI,'local_ai_reviews'),
   read(AI,'local_ai_store_knowledge','&active=eq.true'),
   read(AI,'local_ai_taxonomy_categories','&active=eq.true'),
   read(AI,'local_ai_taxonomy_groups','&active=eq.true'),
   read(AI,'local_ai_taxonomy_terms','&active=eq.true')
  ]);
  const get=i=>all[i].status==='fulfilled'?all[i].value:[];
  if(all[0].status==='rejected')throw all[0].reason;
  if(all[1].status==='rejected')throw all[1].reason;
  const failures=all.map((x,i)=>x.status==='rejected'?i:null).filter(x=>x!==null);
  if(failures.length)console.warn('[GURU v4] Dados complementares indisponíveis',failures);
  mergeTaxonomy(get(5),get(6),get(7));
  db={stores:get(0),products:get(1),hours:get(2),reviews:get(3),knowledge:get(4),unavailable:{hours:failures.includes(2),reviews:failures.includes(3),taxonomy:failures.includes(5)||failures.includes(6)||failures.includes(7)}};
  lastLoad=Date.now();rehydrate();return db;
 })().finally(()=>{loadPromise=null});
 return loadPromise;
}
function getCityFromAddress(address=''){
 const s=String(address);
 const m=s.match(/(?:^|,|·)\s*([^,·-]{2,55})\s*-\s*([A-Z]{2})(?:\b|$)/i);
 return m?m[1].trim():null;
}
function applyLocation(raw){
 if(!db)return;
 const n=norm(raw);
 if(/\b(qualquer cidade|todas as cidades|sem cidade)\b/.test(n)){state.location={city:null,uf:null,neighborhood:null};return}
 for(const city of [...new Set(db.stores.map(s=>getCityFromAddress(s.address)).filter(Boolean))].sort((a,b)=>b.length-a.length)){
  if(n.includes('em '+norm(city))||n.includes('na cidade de '+norm(city))||n.includes('de '+norm(city))){state.location={city,uf:null,neighborhood:null};return}
 }
}
function isLocationSearch(raw,plan){
 const n=norm(raw);
 return /perto de mim|proxim[oa] de mim|mais perto|ate \d+(?:[.,]\d+)? km/.test(n)||plan.filters?.sort==='distance'||plan.filters?.maxDistance!=null;
}
async function locate(show=true){
 if(!navigator.geolocation){if(show)notice('Seu navegador não permite obter a localização.');return null}
 return new Promise(resolve=>navigator.geolocation.getCurrentPosition(pos=>{
  position={lat:pos.coords.latitude,lng:pos.coords.longitude};if(show)notice('Localização disponível para calcular as distâncias.');resolve(position)
 },()=>{
  if(show)notice('Localização não autorizada ou indisponível.');
  resolve(null);
 },{enableHighAccuracy:false,timeout:8500,maximumAge:60000}));
}
function productMatchesTerm(p,t){return norm([p.name,p.description,p.category,p.brand].join(' ')).includes(norm(t))}
function chooseStore(row){
 state.selectedStore=row.store;state.selectedProduct=(state.productTerm&&row.products?.length===1)?row.products[0]:null;renderContext();save();
 const s=row.store,parts=[s.name];
 if(s.category)parts.push(s.category+(s.group?' · '+s.group:''));
 if(s.address)parts.push('Endereço: '+s.address);
 if(s.delivery)parts.push('Entrega: '+(s.delivery_fee==null?'taxa não informada':money(s.delivery_fee)));
 if(row.reviewCount>0)parts.push('Avaliação: '+row.rating.toFixed(1)+'/5 ('+row.reviewCount+' avaliações)');
 const box=add(parts.join('\n\n'));
 const actions=el('div','chat-actions');
 for(const [label,q] of [['Horário','Qual o horário?'],['Entrega','Ela entrega?'],['Produtos','Quais produtos tem?'],['Pagamento','Aceita Pix?'],['Contato','Qual o WhatsApp?']]){
  const b=el('button','',label);b.type='button';b.onclick=()=>submitText(q);actions.appendChild(b);
 }
 box.appendChild(actions);return box;
}
function makeCard(row,index){
 const s=row.store,card=el('article','store-result-card smart-card');
 const top=el('div','store-card-top'),identity=el('div','');
 if(/^https:\/\//.test(String(s.logo_url||''))){const img=el('img','smart-store-logo');img.src=s.logo_url;img.alt='Foto de '+s.name;img.loading='lazy';img.onerror=()=>img.remove();top.appendChild(img)}
 const title=el('h3','',s.name||'Estabelecimento');identity.appendChild(title);
 if(s.address){const city=getCityFromAddress(s.address);if(city)identity.appendChild(el('div','smart-location',city))}
 const tags=el('div','store-card-meta');
 for(const label of [s.category,s.group].filter(Boolean))tags.appendChild(el('span','store-chip',label));
 if(row.distance!=null)tags.appendChild(el('span','store-chip',row.distance.toFixed(1).replace('.',',')+' km'));
 if(row.reviewCount)tags.appendChild(el('span','store-chip','★ '+row.rating.toFixed(1)+' ('+row.reviewCount+')'));
 if(s.delivery)tags.appendChild(el('span','store-chip','Entrega'));
 if(s.pickup)tags.appendChild(el('span','store-chip','Retirada'));
 if(s.verified)tags.appendChild(el('span','store-chip','Verificada'));
 if(s.sponsored)tags.appendChild(el('span','store-chip','Patrocinada'));
 identity.appendChild(tags);top.appendChild(identity);card.appendChild(top);
 if(s.address)card.appendChild(el('div','store-address',s.address));
 if(Array.isArray(s.specialties)&&s.specialties.length){
  const info=el('div','smart-specialties');
  info.appendChild(el('b','','Especialidades'));
  const list=el('div','smart-specialties-list');
  s.specialties.slice(0,5).forEach(t=>list.appendChild(el('span','smart-specialty',t)));
  info.appendChild(list);card.appendChild(info);
 }
 if(row.products.length&&state.productTerm){
  card.appendChild(el('div','smart-summary',row.products.slice(0,2).map(p=>p.name+' — '+money(priceOf(p))).join(' · ')));
 }
 const why=el('button','smart-why-btn','Por que apareceu?');why.type='button';
 const panel=el('div','smart-why-panel');row.reason.forEach(t=>panel.appendChild(el('div','',t)));
 why.onclick=()=>panel.classList.toggle('on');card.appendChild(why);card.appendChild(panel);
 const actions=el('div','store-card-actions');
 const view=el('button','store-action primary','Ver loja');view.type='button';view.onclick=()=>chooseStore(row);actions.appendChild(view);
 const products=el('button','store-action','Produtos');products.type='button';products.onclick=()=>{state.selectedStore=s;state.selectedProduct=null;replyAboutStore('quais produtos tem?','products');renderContext();save()};actions.appendChild(products);
 const phone=String(s.whatsapp||'').replace(/\D/g,'');
 if(phone.length>=10&&phone.length<=15){const a=el('a','store-action link','WhatsApp');a.href='https://wa.me/'+phone;a.target='_blank';a.rel='noopener noreferrer';actions.appendChild(a)}
 card.appendChild(actions);return card;
}
function displayResults(rows){
 const m=add('',false);m.classList.add('hashtag-result-msg');
 m.appendChild(el('div','hashtag-intro',rows.length===1?'Encontrei 1 opção cadastrada:':'Encontrei '+rows.length+' opções cadastradas:'));
 const grid=el('div','store-results-grid');rows.forEach((r,i)=>grid.appendChild(makeCard(r,i)));m.appendChild(grid);
 return m;
}
function productListFor(store,query=''){
 const list=(db.products||[]).filter(p=>p.store_id===store.id&&eligibleProduct(p));
 const n=norm(query);
 const size=n.match(/\b(?:tamanho|tam)\s*(pp|p|m|g|gg|xg)\b/);
 const upper=String(query).match(/\b(PP|P|M|G|GG|XG)\b/);
 const sz=(size||upper)?.[1]?.toUpperCase();
 let productTerm=n.match(/(?:tem|vende|procurando|preciso de|quero)\s+(?:alguma?|[oa]|um|uma)?\s*([a-z0-9 ]{3,50})/);
 const term=productTerm?.[1]?.replace(/\b(?:tamanho|tam)\s*(?:pp|p|m|g|gg|xg)\b/g,'').replace(/\s+(?:pp|p|m|g|gg|xg)$/,'').trim();
 return list.filter(p=>(!sz||Array.isArray(p.sizes)&&p.sizes.some(v=>norm(v)===norm(sz)))&&(!term||productMatchesTerm(p,term)));
}
function replyAboutStore(text,ask,filter={}){
 const s=state.selectedStore;if(!s){add('Escolha uma das opções encontradas antes de perguntar sobre ela.');return}
 const n=norm(text),day=filter.day??state.filters.day??new Date().getDay();
 const record=(db?.knowledge||[]).find(k=>k.store_id===s.id&&k.active!==false&&[k.question,...(Array.isArray(k.variations)?k.variations:[])].some(q=>norm(q).length>=4&&(norm(text).includes(norm(q))||norm(q).includes(norm(text)))));
 if(record?.answer&&ask!=='total'){add(String(record.answer));return}
 if(ask==='knowledge'){add('Não encontrei uma resposta específica cadastrada. Dados da loja: '+[s.name,s.category,s.group,s.address].filter(Boolean).join(' · ')+'.');return}
 if(ask==='hours'){
  const h=db.hours.find(x=>x.store_id===s.id&&Number(x.weekday)===day);
  add(!h?'Essa loja ainda não informou o horário de '+dayNames[day]+'.':h.closed?'Essa loja está cadastrada como fechada no '+dayNames[day]+'.':s.name+' funciona no '+dayNames[day]+' das '+String(h.opens_at).slice(0,5)+' às '+String(h.closes_at).slice(0,5)+'.');return;
 }
 if(ask==='total'){
  if(!s.delivery){add('Essa loja não possui entrega cadastrada.');return}
  const p=state.selectedProduct;
  if(!p){add('Qual produto você deseja? Selecione um produto primeiro para calcular o total com entrega.');return}
  if(s.delivery_fee==null){add('O preço do produto é '+money(priceOf(p))+', mas a taxa de entrega ainda não foi informada.');return}
  add(p.name+': '+money(priceOf(p))+' + entrega '+money(s.delivery_fee)+' = '+money(priceOf(p)+Number(s.delivery_fee))+'.');return;
 }
 if(ask==='delivery'){add(s.delivery?('Sim, '+s.name+' oferece entrega'+(s.delivery_fee!=null?' com taxa de '+money(s.delivery_fee):' (taxa não informada)')+'.'):'Não há entrega disponível cadastrada nessa loja.');return}
 if(ask==='payment'){const methods=s.payment_methods||[];add(methods.length?s.name+' aceita '+methods.join(', ')+'.':'Essa loja ainda não informou formas de pagamento.');return}
 if(ask==='address'){add(s.address||'Essa loja ainda não informou o endereço.');return}
 if(ask==='contact'){add(s.whatsapp?'WhatsApp: '+s.whatsapp:s.phone?'Telefone: '+s.phone:'Essa loja ainda não informou um contato.');return}
 if(ask==='rating'){const rv=ratingsMap(db.reviews).get(s.id);add(rv?'Avaliação real: '+(rv.sum/rv.count).toFixed(1)+'/5 em '+rv.count+' avaliação(ões).':'Essa loja ainda não possui avaliações cadastradas.');return}
 const ps=productListFor(s,text);
 if(!ps.length){add('Não encontrei produto ativo e disponível em estoque que corresponda a essa pergunta.');return}
 if(ps.length===1)state.selectedProduct=ps[0];
 add('Na '+s.name+', encontrei:\n'+ps.slice(0,8).map(p=>'• '+p.name+' — '+money(priceOf(p))+' · estoque '+p.stock).join('\n'));save();
}
async function run(text){
 const plan=interpret(text,taxonomy,aliases,state);
 if(plan.kind==='reset'){state=emptyState();try{sessionStorage.removeItem(memoryKey)}catch{};renderContext();add('Contexto limpo. O que você quer encontrar?');return}
 if(plan.kind==='blocked'){add('“Loja” e “comércio” são tratados como varejo e não entram na categoria Comida. Pesquise por restaurante, pizzaria ou pelo tipo de comida.');return}
 if(plan.kind==='clarify'){add('Qual estabelecimento da lista você quer consultar? Pode dizer, por exemplo, “a segunda”.');return}
 await loadData();
 if(plan.kind==='select'){
  const index=plan.index<0?state.lastResults.length-1:plan.index,row=state.lastResults[index];
  if(!row){add('Essa opção não existe na lista atual.');return}
  state.selectedStore=row.store;state.selectedProduct=(state.productTerm&&row.products?.length===1)?row.products[0]:null;
  if(plan.ask){if(plan.filters?.day!=null)state.filters.day=plan.filters.day;replyAboutStore(text,plan.ask,plan.filters);renderContext();save()}else chooseStore(row);
  return;
 }
 if(plan.kind==='ask'){if(plan.filters?.day!=null)state.filters.day=plan.filters.day;replyAboutStore(text,plan.ask,plan.filters);renderContext();save();return}
 if(plan.kind!=='search')return;
 if(isLocationSearch(text,plan)&&!position&&(!state.location?.city)){
  await locate(false);
  if(!position){add('Para aplicar distância ou proximidade real, permita o acesso à localização no navegador. Não vou apresentar opções como próximas sem confirmar isso.');return}
 }
 state=nextState(state,plan);
 applyLocation(text);
 if(db.unavailable.hours&&(state.filters.openNow||state.filters.day!=null||state.filters.start!=null)){add('Não consegui consultar os horários agora, então não vou afirmar que alguma loja está aberta. Tente novamente.');return}
 if(db.unavailable.reviews&&state.filters.minRating!=null){add('Não consegui consultar as avaliações agora. Tente novamente antes de aplicar esse filtro.');return}
 renderContext();save();
 const rows=searchStores(db,state,position,{limit:6});
 state.lastResults=rows;
 if(!rows.length){add('Não encontrei estabelecimentos cadastrados que atendam a todos esses critérios. Você pode ampliar a região, retirar algum filtro ou tentar outro termo.');save();return}
 displayResults(rows);save();
}
async function submitText(raw){
 const t=String(raw||'').trim();if(!t)return;
 if(searchBusy){notice('Aguarde a conclusão da busca atual.');return}
 searchBusy=true;input.disabled=true;
 add(t,true);
 const waiting=add('Buscando opções cadastradas...');
 try{await run(t)}catch(err){msgError(err)}finally{waiting.remove();input.disabled=false;input.focus();searchBusy=false;msgs.scrollTop=msgs.scrollHeight}
}
function resetConversation(){
 state=emptyState();try{sessionStorage.removeItem(memoryKey)}catch{};renderContext();
 add('Pronto. Limpei o contexto da busca. O que você procura agora?');
}
function initShell(){
 const body=document.body,side=document.querySelector('.app-sidebar');
 const hero=document.querySelector('.hero h1');
 const phrases=['O que você procura?','O que você quer encontrar?','Onde você quer ir?','Que tipo de lugar você procura?'];
 if(hero)hero.textContent=phrases[Math.floor(Math.random()*phrases.length)];
 if(msgs)new MutationObserver(()=>body.classList.toggle('chat-started',!!msgs.querySelector('.msg.user'))).observe(msgs,{childList:true});
 side?.querySelector('.sidebar-collapse')?.addEventListener('click',()=>body.classList.toggle('sidebar-collapsed'));
 side?.addEventListener('click',e=>{const b=e.target.closest('[data-shell-action]');if(!b)return;if(b.dataset.shellAction==='new')resetConversation();if(b.dataset.shellAction==='location')locate()});
 document.getElementById('resetBtn')?.addEventListener('click',resetConversation);
 document.getElementById('locBtn')?.addEventListener('click',()=>locate());
 document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>submitText(b.dataset.q||'')));
}
if(form&&input&&msgs){
 form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(q){input.value='';submitText(q)}});
 restore();initShell();renderContext();
 loadData().catch(err=>console.warn('[GURU v4] Carregamento inicial não concluído:',err));
 window.GuruEngineV4={interpret:q=>interpret(q,taxonomy,aliases,state),submitText,reset:resetConversation,refresh:()=>loadData(true),getState:()=>state};
}else console.error('[GURU v4] Formulário ausente.');
