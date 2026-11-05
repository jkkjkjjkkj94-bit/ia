// GURU v4 - um único responsável por eventos, contexto, busca e resultados.
import {detectNeed,describeNeed,choiceForNeed,isFindStoresForNeed,catalogVerification} from './guru-needs-v1.mjs?v=2';
import {taxonomy as fallbackTaxonomy,categoryAliases as fallbackAliases} from './ai-taxonomy.js?v=6';
import {routeConversation} from './guru-smalltalk.mjs?v=1';
import {contextualIntent,compareStores,comparisonSummary,followupPrompts,storeDataQuality,suggestBroadConversation} from './guru-conversation-v5.mjs?v=1';
import {recordSearch,recordSelection,recordUnansweredKnowledge} from './guru-telemetry-v5.mjs?v=2';
import {preserveMandatoryFilters} from './guru-search-v6.mjs?v=1';
import {guidedSearchAlternatives,rerankSearchResults,noResultGuidance} from './guru-search-v7.mjs?v=1';
import {catalogAwareAlternatives} from './guru-search-v8.mjs?v=1';
import {rankV9,rememberSelection,learningStats} from './guru-ranking-v9.mjs?v=1';
import {sharedAlternatives} from './guru-context-v10.mjs?v=1';
import {semanticNeedAlternatives} from './guru-semantic-v12.mjs?v=1';
import {followupRefinement} from './guru-followup-v13.mjs?v=1';
import {approvedAnswerFor,approvedStoreContextFor} from './guru-knowledge-v11.mjs?v=2';
import {norm,normalizeQuery,buildLexicon,interpret,emptyState,nextState,searchStores,explainEmptySearch,applyStoreHighlight,priceOf,eligibleProduct,ratingsMap,distanceKm,scheduleMatches} from './guru-engine-v4-core.mjs?v=24';

const CORE={url:'https://ccsypggvelcxsqszepfs.supabase.co',key:'sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG'};
const AI={url:'https://innziuzgtpfsiywqmies.supabase.co',key:'sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1'};
const form=document.getElementById('chatForm'),input=document.getElementById('q'),msgs=document.getElementById('msgs'),ctx=document.getElementById('ctx'),toast=document.getElementById('toast');
let state=emptyState(),db=null,loadPromise=null,lastLoad=0,position=null,searchBusy=false;
let locationAttempted=false;
let userCity='';
let pendingCityQuery='';
const userCityKey='guru_city_v1';
try{userCity=String(sessionStorage.getItem(userCityKey)||'').trim().slice(0,90)}catch{}
let replyBuffer=null;
let lastSearchText='';
const minTypingMs=850;
const RESULT_PAGE_SIZE=3;
const isMoreResultsRequest=text=>/^(?:(?:por favor\s*)?(?:quero|queria|pode|poderia|me mostra|me mostre|mostra|mostrar|mostre|ver|tem|me de|exiba|traga|buscar|preciso de|gostaria de)\s+)?(?:mais\s+(?:\d+\s+)?(?:opcoes|opcao|resultados|lojas|estabelecimentos|alternativas|sugestoes)|outras\s+(?:opcoes|lojas|alternativas|sugestoes)|proximas\s+(?:opcoes|lojas|alternativas)|proximos\s+(?:resultados|tres|3)|mais\s+tres|mais\s+3|mostrar\s+mais|ver\s+mais)(?:\s+por favor)?$/.test(norm(text));
let taxonomy=structuredClone(fallbackTaxonomy),aliases=structuredClone(fallbackAliases);
const memoryKey='guru_context_v4',ttl=2*60*60*1000;

// Híbrido sem Cloudflare: cota atômica global e por cliente verificada no Supabase.
const hybridEndpoint=AI.url+'/functions/v1/guru-hybrid-openai';
// Híbrido opcional: apenas acrescenta um resumo textual; ranking e cards seguem locais.
async function hybridResponse(question,rows){
 if(!Array.isArray(rows)||!rows.length)return '';
 const payload={
  question:String(question).slice(0,380),
  results:rows.slice(0,5).map(r=>({
   name:r.store?.name,category:r.store?.category,group:r.store?.group,
   reason:(Array.isArray(r.reason)?r.reason.join(', '):String(r.reason||'')).slice(0,140),
   delivery:r.store?.delivery===true,rankScore:r.rankScore
  }))
 };
 try{
  const r=await fetch(hybridEndpoint,{
   method:'POST',
   headers:{'Content-Type':'application/json',apikey:AI.key},
   body:JSON.stringify(payload),
   signal:AbortSignal.timeout(11000),
  });
  if(!r.ok)return '';
  const result=await r.json();
  return typeof result.answer==='string'?result.answer.trim().slice(0,800):'';
 }catch{return ''}
}

const money=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dayNames=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const add=(text,user=false)=>{
 const m=el('div','msg '+(user?'user':'bot'),text);
 (replyBuffer&&!user?replyBuffer:msgs).appendChild(m);
 if(!replyBuffer){
  // Também anima respostas abertas diretamente pelos cards e pelo botão de reiniciar.
  if(!user)queueMicrotask(()=>{
   if(!m.isConnected)return;
   const fragment=document.createDocumentFragment();
   fragment.appendChild(m);
   void showAssistantReply(fragment);
  });
 }
 return m;
};
function showTypingIndicator(){
 const message=el('div','msg bot guru-typing');
 message.setAttribute('role','status');
 message.setAttribute('aria-label','GURU está digitando');
 const dots=el('span','guru-typing-dots');
 dots.setAttribute('aria-hidden','true');
 for(let i=0;i<3;i++)dots.appendChild(el('span','guru-typing-dot'));
 message.appendChild(dots);
 msgs.appendChild(message);
 return message;
}
// Escreve somente o texto da resposta, sem recriar cards nem elementos interativos.
async function animateAssistantText(node,original){
 // Revela os caracteres progressivamente, com pequenas pausas naturais.
 const letters=Array.from(original);
 if(!letters.length){node.nodeValue=original;return}
 const weights=letters.map(char=>/[.!?]/.test(char)?3.2:/[,;:]/.test(char)?1.8:/\s/.test(char)?0.55:1);
 const totalWeight=weights.reduce((sum,w)=>sum+w,0);
 const duration=Math.min(5600,Math.max(450,totalWeight*30));
 const unitMs=duration/totalWeight;
 let count=0,elapsedUnits=0;
 const started=performance.now();
 await new Promise(resolve=>{
  const tick=()=>{
   if(document.hidden||!node.isConnected){node.nodeValue=original;resolve();return}
   const elapsed=performance.now()-started;
   while(count<letters.length&&elapsedUnits+weights[count]*unitMs<=elapsed){
    elapsedUnits+=weights[count]*unitMs;
    count++;
   }
   if(!count)count=1;
   node.nodeValue=letters.slice(0,count).join('');
   if(count>=letters.length){node.nodeValue=original;resolve();return}
   setTimeout(tick,24);
  };
  tick();
 });
}
async function showAssistantReply(fragment){
 if(!fragment)return;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 for(const message of [...fragment.childNodes]){
  if(message.nodeType!==Node.ELEMENT_NODE){msgs.appendChild(message);continue}
  const intro=message.querySelector('.hashtag-intro');
  const textNode=intro?.firstChild||[...message.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue?.length);
  const target=intro||message;
  const grid=message.querySelector('.store-results-grid');
  const actions=message.querySelector('.chat-actions');
  if(reduced||!textNode||textNode.nodeType!==Node.TEXT_NODE||!textNode.nodeValue?.trim()){
   msgs.appendChild(message);
   continue;
  }
  const original=textNode.nodeValue;
  textNode.nodeValue='';
  if(grid)grid.style.display='none';
  if(actions)actions.style.display='none';
  msgs.appendChild(message);
  target.classList.add('guru-typewriter-caret');
  try{await animateAssistantText(textNode,original)}
  finally{
   textNode.nodeValue=original;
   target.classList.remove('guru-typewriter-caret');
   if(grid)grid.style.display='';
   if(actions)actions.style.display='';
  }
 }
}
const notice=t=>{if(toast){toast.textContent=t;toast.classList.add('on');setTimeout(()=>toast.classList.remove('on'),3200)}};
const msgError=err=>{console.error('[GURU v4]',err);add('Não consegui consultar os dados agora. Confira a conexão e tente novamente.')};
const suggestions=document.getElementById('guruSuggestions');
let visibleSuggestions=[];
function setSuggestions(items=[]){
 visibleSuggestions=items;
 if(!suggestions)return;
 suggestions.replaceChildren();
 suggestions.hidden=!items.length;
 input.setAttribute('aria-expanded',String(!!items.length));
 for(const item of items){
  const button=el('button','guru-suggestion');
  button.type='button';button.setAttribute('role','option');
  const label=el('span','guru-suggestion-label',item.label);
  const type=el('small','guru-suggestion-type',item.type);
  button.append(label,type);
  button.addEventListener('mousedown',e=>e.preventDefault());
  button.addEventListener('click',()=>{input.value='';setSuggestions();submitText(item.query)});
  suggestions.appendChild(button);
 }
}
function updateSuggestions(){
 const query=String(input?.value||'').trim();
 if(!db||query.length<2||searchBusy){setSuggestions();return}
 const key=norm(query),matches=[],used=new Set();
 const addItem=(label,type,queryText,score)=>{
  const uniq=type+'|'+norm(label);
  if(used.has(uniq))return;
  used.add(uniq);matches.push({label,type,query:queryText,score});
 };
 for(const s of db.stores||[]){
  if(s.active!==true||s.status!=='active')continue;
  const name=norm(s.name);
  if(name&&(name.includes(key)||key.includes(name)))addItem(s.name,'Loja','loja '+s.name,name.startsWith(key)?100:85);
 }
 const activeStoreIds=new Set((db.stores||[]).filter(s=>s.active===true&&s.status==='active').map(s=>s.id));
 for(const p of db.products||[]){
  if(!activeStoreIds.has(p.store_id)||!eligibleProduct(p))continue;
  const name=norm(p.name);
  if(name&&(name.includes(key)||key.includes(name)))addItem(p.name,'Produto',p.name,name.startsWith(key)?85:70);
 }
 const groupKeys=new Set();
 for(const store of db.stores||[]){
  if(store.active!==true||store.status!=='active')continue;
  const group=String(store.group||'').trim();
  if(group&&!groupKeys.has(norm(group))){groupKeys.add(norm(group));if(norm(group).includes(key)||key.includes(norm(group)))addItem(group,'Categoria',group,75)}
 }
 matches.sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label,'pt-BR'));
 setSuggestions(matches.slice(0,6));
}
async function refreshFilteredResults(){
 if(searchBusy)return;
 try{
  await loadData();
  if(!userCity){askForCity();return}
  state.location=citySearchState().location;
  const rows=searchStores(db,citySearchState(),position,{limit:60});
  state.lastResults=rows;state.resultOffset=0;save();
  if(rows.length)showNextResultPage();
  else add(explainEmptySearch(db,state,position));
 }catch(err){msgError(err)}
}
function renderContext(){
 if(!ctx)return;
 ctx.replaceChildren();
 const chips=[];
 const chip=(label,clear)=>chips.push({label,clear});
 if(state.selectedStore)chip('Loja: '+state.selectedStore.name,()=>{state.selectedStore=null;state.selectedProduct=null});
 if(state.category)chip('Categoria: '+state.category,()=>{state.category=null;state.group=null;state.nameTerms=[]});
 if(state.group)chip('Grupo: '+state.group,()=>{state.group=null});
 if(state.specialtyTerm)chip('Especialidade: '+state.specialtyTerm,()=>{state.specialtyTerm=null});
 if(userCity)chip('Cidade: '+userCity,()=>{userCity='';try{sessionStorage.removeItem(userCityKey)}catch{};state.location={...(state.location||{}),city:null};state.selectedStore=null;state.lastResults=[];askForCity()});
 const f=state.filters||{};
 if(f.openNow)chip('Abertas agora',()=>{delete f.openNow});
 if(f.day!=null)chip(dayNames[f.day],()=>{delete f.day});
 if(f.days?.length)chip('Dias: '+f.days.map(d=>dayNames[d]).join(', '),()=>{delete f.days});
 if(f.daysAll?.length)chip('Todos os dias selecionados',()=>{delete f.daysAll});
 if(f.start!=null||f.end!=null)chip('Horário',()=>{delete f.start;delete f.end});
 if(f.delivery!==undefined)chip(f.delivery?'Com entrega':'Sem entrega',()=>{delete f.delivery});
 if(f.pickup!==undefined)chip(f.pickup?'Com retirada':'Sem retirada',()=>{delete f.pickup});
 if(f.payment)chip('Pagamento: '+f.payment,()=>{delete f.payment;delete f.paymentsAll});
 if(f.maxPrice!=null)chip('Até '+money(f.maxPrice),()=>{delete f.maxPrice});
 if(f.minPrice!=null)chip('A partir de '+money(f.minPrice),()=>{delete f.minPrice});
 if(f.maxDistance!=null)chip('Até '+f.maxDistance+' km',()=>{delete f.maxDistance});
 if(f.size)chip('Tamanho '+f.size,()=>{delete f.size});
 if(f.color)chip('Cor '+f.color,()=>{delete f.color});
 if(f.promoOnly)chip('Promoções',()=>{delete f.promoOnly});
 if(f.minRating!=null)chip('Nota mínima '+f.minRating,()=>{delete f.minRating});
 if(f.sort)chip('Ordenar: '+({rating:'avaliação',price:'preço',distance:'distância'}[f.sort]||f.sort),()=>{delete f.sort});
 if(state.excludedGroups?.length)chip('Excluídos: '+state.excludedGroups.join(', '),()=>{state.excludedGroups=[]});
 if(!chips.length){ctx.hidden=true;return}
 ctx.hidden=false;
 for(const entry of chips){
  const button=el('button','guru-filter-chip',entry.label+' ×');button.type='button';
  button.setAttribute('aria-label','Remover filtro '+entry.label);
  button.addEventListener('click',()=>{entry.clear();renderContext();save();if(db)refreshFilteredResults()});
  ctx.appendChild(button);
 }
 const clear=el('button','guru-clear-filters','Limpar filtros');
 clear.type='button';clear.addEventListener('click',()=>{
  state.filters={};state.category=null;state.group=null;state.specialtyTerm=null;state.productTerm=null;state.semanticTerms=[];state.featureTerms=[];state.nameTerms=[];
  state.excludedGroups=[];state.excludedCategories=[];state.excludedTerms=[];state.location={};state.query='lojas';
  state.location={...(state.location||{}),city:userCity};renderContext();save();if(db)refreshFilteredResults();
 });
 ctx.appendChild(clear);
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
  const s=x.state||{};const keys=['category','group','specialtyTerm','query','semanticTerms','featureTerms','productTerm','excludedGroups','excludedCategories','excludedTerms','filters','resultOffset','shoppingNeed'];
  for(const k of keys)if(s[k]!=null)state[k]=s[k];
  state._selectedId=s.selectedStore||null;state._lastIds=s.lastResults||[];state._productId=s.selectedProduct||null;
  renderContext();
 }catch{}
}
function rehydrate(){
 if(!db)return;
 // Em toda atualização, referências da conversa precisam refletir apenas dados ativos.
 const currentStore=id=>id?(db.stores||[]).find(s=>s.id===id&&s.active===true&&s.status==='active')||null:null;
 const selectedId=state._selectedId||state.selectedStore?.id;
 state.selectedStore=currentStore(selectedId);
 if(state.selectedStore&&(!userCity||!norm(state.selectedStore.address).includes(norm(userCity))))state.selectedStore=null;
 const productId=state._productId||state.selectedProduct?.id;
 state.selectedProduct=state.selectedStore&&productId?(db.products||[]).find(p=>p.id===productId&&p.store_id===state.selectedStore.id&&eligibleProduct(p))||null:null;
 const ids=Array.isArray(state._lastIds)?state._lastIds:(state.lastResults||[]).map(r=>r.store?.id).filter(Boolean);
 if(ids.length){
  // Reaplica todos os filtros para impedir seleção de loja desativada ou sem requisito obrigatório.
  const restored=state.shoppingNeed&&userCity
   ?findStoresForNeed(db,state.shoppingNeed,userCity,position,searchStores,emptyState,60)
   :(userCity?searchStores(db,citySearchState(),position,{limit:db.stores.length}):[]);
  const valid=new Map(restored.map(row=>[row.store.id,row]));
  state.lastResults=ids.map(id=>valid.get(id)).filter(Boolean);
  state.resultOffset=Math.min(Number(state.resultOffset)||0,state.lastResults.length);
 }else state.lastResults=[];
 delete state._lastIds;delete state._selectedId;delete state._productId;
 renderContext();
}
async function read(project,table,query='',orderField='id'){
 // Pagina resultados com ordenação estável: a API pode limitar respostas a 1.000 registros.
 const limit=200,maxRows=10000,all=[];
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  for(let offset=0;offset<maxRows;offset+=limit){
   const url=project.url+'/rest/v1/'+table+'?select=*'+query+'&order='+orderField+'.asc&limit='+limit+'&offset='+offset;
   const r=await fetch(url,{headers:{apikey:project.key,Authorization:'Bearer '+project.key,Accept:'application/json'},signal:controller.signal});
   if(!r.ok)throw new Error(table+' HTTP '+r.status);
   const rows=await r.json();
   if(!Array.isArray(rows))throw new Error(table+' sem resposta válida');
   all.push(...rows);
   if(rows.length<limit)return all;
  }
  throw new Error(table+' excedeu o limite de leitura ('+maxRows+' registros); ajuste a consulta.');
 }finally{clearTimeout(timer)}
}
function mergeTaxonomy(cats=[],groups=[],terms=[]){
 if(!cats.length||!groups.length)return;
 const activeCats=cats.filter(x=>x.active!==false),activeGroups=groups.filter(x=>x.active!==false),activeTerms=terms.filter(x=>x.active!==false);
 const byCategory=new Map(activeCats.map(x=>[x.id,x])),byGroup=new Map(activeGroups.map(x=>[x.id,x]));
 const map={},catAliases={};
 for(const cat of activeCats){map[cat.name]={};catAliases[cat.name]=[cat.name,...(fallbackAliases[cat.name]||[])]}
 for(const group of activeGroups){
  const cat=byCategory.get(group.category_id);
  if(!cat)continue;
  // Os sinônimos locais complementam os do AIDB; não desaparecem ao carregar a taxonomia.
  const known=fallbackTaxonomy[cat.name]?.[group.name]||[];
  map[cat.name][group.name]=[group.name,...known];
 }
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
   read(AI,'local_ai_taxonomy_terms','&active=eq.true'),
   read(AI,'local_ai_store_highlights','','store_id'),
   read(AI,'guru_approved_aliases','&active=eq.true'),
   read(AI,'local_ai_qa','&active=eq.true')
  ]);
  const get=i=>all[i].status==='fulfilled'?all[i].value:[];
  if(all[0].status==='rejected')throw all[0].reason;
  if(all[1].status==='rejected')throw all[1].reason;
  const failures=all.map((x,i)=>x.status==='rejected'?i:null).filter(x=>x!==null);
  if(failures.length)console.warn('[GURU v4] Dados complementares indisponíveis',failures);
  mergeTaxonomy(get(5),get(6),get(7));
  const highlightsByStore=new Map(get(8).map(h=>[h.store_id,h]));
  const now=Date.now();
  // A flag COREDB `verified` pode refletir apenas aprovação antiga; não é fonte do selo.
  db={stores:get(0).map(s=>applyStoreHighlight(s,highlightsByStore.get(s.id),now)),products:get(1),hours:get(2),reviews:get(3),knowledge:get(4),sharedAliases:get(9),approvedAnswers:get(10),unavailable:{hours:failures.includes(2),reviews:failures.includes(3),knowledge:failures.includes(4),taxonomy:failures.includes(5)||failures.includes(6)||failures.includes(7),highlights:failures.includes(8)}};
  lastLoad=Date.now();rehydrate();if(input?.value)updateSuggestions();return db;
 })().finally(()=>{loadPromise=null});
 return loadPromise;
}
function getCityFromAddress(address=''){
 const match=String(address).match(/^(.*?)\s+-\s+([A-Z]{2})\s*$/i);
 return match?match[1].split(/,|\s+-\s+/).pop().trim():null;
}
function applyLocation(raw,target=state){
 if(!db)return;
 const n=norm(raw);
 if(/\b(qualquer cidade|todas as cidades|sem cidade)\b/.test(n)){target.location={city:null,uf:null,neighborhood:null};return}
 for(const city of [...new Set(db.stores.map(s=>getCityFromAddress(s.address)).filter(Boolean))].sort((a,b)=>b.length-a.length)){
  if(n.includes('em '+norm(city))||n.includes('na cidade de '+norm(city))||n.includes('de '+norm(city))){target.location={city,uf:null,neighborhood:null};return}
 }
}
function setUserCity(city){
 const value=String(city||'').trim().replace(/\s+/g,' ').slice(0,90);
 if(value.length<2)return false;
 userCity=value;
 try{sessionStorage.setItem(userCityKey,value)}catch{}
 state.location={...(state.location||{}),city:value,uf:null,neighborhood:null};
 state.selectedStore=null;state.selectedProduct=null;state.lastResults=[];state.resultOffset=0;
 renderContext();save();return true;
}
async function findUserCity(coords){
 const params=new URLSearchParams({format:'jsonv2',lat:String(coords.lat.toFixed(3)),lon:String(coords.lng.toFixed(3)),zoom:'10',addressdetails:'1','accept-language':'pt-BR'});
 const response=await fetch('https://nominatim.openstreetmap.org/reverse?'+params,{headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Não consegui identificar a cidade automaticamente.');
 const addr=(await response.json()).address||{};
 const city=addr.city||addr.town||addr.municipality||addr.village;
 if(!city||String(city).trim().length<2)throw Error('Cidade não identificada. Digite manualmente.');
 return String(city).trim();
}
async function runPendingCityQuery(){
 const query=pendingCityQuery.trim();
 pendingCityQuery='';
 if(query){await run(query);return}
 // Escolher a cidade não é uma busca; aguardar o pedido explícito do usuário.
 state.lastResults=[];state.resultOffset=0;
 state.query='';
 renderContext();
 save();
 add('Cidade definida: '+userCity+'. O que você deseja encontrar?');
 input.placeholder='O que você procura em '+userCity+'?';
 input.focus();
}
function askForCity(query=''){
 document.body.classList.add('chat-started');
 if(query)pendingCityQuery=query;
 const m=add('',false);m.classList.add('guru-city-choice');
 m.appendChild(el('div','guru-city-choice-title','Qual é sua cidade?'));
 m.appendChild(el('div','guru-city-distance-note','A GURU pesquisará apenas lojas dessa cidade. Digite o município ou autorize a localização.'));
 const controls=el('div','guru-city-choice-controls');
 const inputCity=el('input','');inputCity.type='text';inputCity.placeholder='Ex.: Salto de Pirapora';
 inputCity.maxLength=90;inputCity.autocomplete='address-level2';inputCity.setAttribute('aria-label','Cidade onde você está');
 const saveButton=el('button','guru-next-button','Definir cidade');saveButton.type='button';
 async function chooseManual(){
  if(!setUserCity(inputCity.value)){notice('Informe o nome da sua cidade.');return}
  controls.remove();m.appendChild(el('div','guru-city-distance-note','Cidade selecionada: '+userCity+'.'));
  await runPendingCityQuery();
 }
 saveButton.onclick=chooseManual;
 inputCity.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();void chooseManual()}});
 const gps=el('button','guru-next-button','Usar minha localização');gps.type='button';
 gps.onclick=async()=>{
  gps.disabled=true;
  try{
   const coords=await locate(true);
   if(!coords)return;
   const city=await findUserCity(coords);
   if(!setUserCity(city))throw Error('Cidade não encontrada.');
   controls.remove();m.appendChild(el('div','guru-city-distance-note','Cidade detectada: '+userCity+' (OpenStreetMap).'));
   await runPendingCityQuery();
  }catch(error){notice(error.message||'Informe a cidade manualmente.')}
  finally{gps.disabled=false}
 };
 controls.append(inputCity,saveButton,gps);m.appendChild(controls);
 return m;
}
function isLocationSearch(raw,plan){
 const n=norm(raw);
 return /perto de mim|proxim[oa] de mim|mais perto|ate \d+(?:[.,]\d+)? km/.test(n)||plan.filters?.sort==='distance'||plan.filters?.maxDistance!=null;
}
async function locate(show=true){
 locationAttempted=true;
 if(!navigator.geolocation){if(show)notice('Seu navegador não permite obter a localização.');return null}
 return new Promise(resolve=>navigator.geolocation.getCurrentPosition(pos=>{
  position={lat:pos.coords.latitude,lng:pos.coords.longitude};if(show)notice('Localização disponível para calcular as distâncias.');resolve(position)
 },()=>{
  if(show)notice('Localização não autorizada ou indisponível.');
  resolve(null);
 },{enableHighAccuracy:false,timeout:8500,maximumAge:60000}));
}
function productMatchesTerm(p,t){return norm([p.name,p.description,p.category,p.brand].join(' ')).includes(norm(t))}
// Ícones vetoriais usados no cartão de estabelecimento selecionado.
function storeDetailIcon(kind){
 const paths={
  pin:['M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0','M12 10h.01'],
  truck:['M3 6h11v11H3z','M14 10h4l3 4v3h-7','M7.5 17h.01','M17.5 17h.01'],
  star:['m12 2 3 6.3 7 .9-5 4.9 1.3 7-6.3-3.5-6.3 3.5 1.3-7-5-4.9 7-.9z'],
  clock:['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20','M12 6v6l4 2'],
  bag:['M4 8h16l-1 13H5L4 8z','M9 9V6a3 3 0 0 1 6 0v3'],
  card:['M3 5h18v14H3z','M3 10h18'],
  phone:['M5 3h4l1.5 4-2.2 1.8a15 15 0 0 0 6.9 6.9L17 13.5l4 1.5v4c0 1.1-.9 2-2 2A16 16 0 0 1 3 5c0-1.1.9-2 2-2'],
  shop:['M3 10h18l-1.5-6h-15L3 10z','M5 10v10h14V10','M9 20v-6h6v6']
 };
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 24 24');
 svg.setAttribute('width','16');svg.setAttribute('height','16');
 svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
 svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
 svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 (paths[kind]||paths.shop).forEach(d=>{
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',d);svg.appendChild(path);
 });
 return svg;
}
function chooseStore(row){
 recordSelection(row.store?.id);
 rememberSelection(lastSearchText||state.query,row.store?.id);
 state.selectedStore=row.store;
 state.selectedProduct=(state.productTerm&&row.products?.length===1)?row.products[0]:null;
 renderContext();save();
 const s=row.store;
 const box=add('',false);
 box.classList.add('selected-store-card');
 const shell=el('div','selected-store-shell');
 const header=el('div','selected-store-header');
 const media=el('div','selected-store-media');
 const fallback=el('div','selected-store-logo-fallback');
 fallback.appendChild(storeDetailIcon('shop'));
 if(/^https:\/\//.test(String(s.logo_url||''))){
  const img=el('img','selected-store-logo');
  img.src=s.logo_url;img.alt='Logo de '+(s.name||'estabelecimento');img.loading='lazy';
  img.onerror=()=>img.replaceWith(fallback);
  media.appendChild(img);
 }else media.appendChild(fallback);
 if(s.verified){
  const badge=el('span','selected-store-badge');
  badge.setAttribute('role','img');badge.setAttribute('aria-label','Estabelecimento verificado');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
  circle.setAttribute('cx','12');circle.setAttribute('cy','12');circle.setAttribute('r','12');circle.setAttribute('fill','#1d9bf0');
  const check=document.createElementNS('http://www.w3.org/2000/svg','path');
  check.setAttribute('d','m7.7 12.2 3 3 5.8-6.3');
  check.setAttribute('fill','none');check.setAttribute('stroke','#fff');check.setAttribute('stroke-width','2.4');
  check.setAttribute('stroke-linecap','round');check.setAttribute('stroke-linejoin','round');
  svg.append(circle,check);badge.appendChild(svg);media.appendChild(badge);
 }
 header.appendChild(media);
 const identity=el('div','selected-store-identity');
 identity.appendChild(el('div','selected-store-eyebrow','LOJA SELECIONADA'));
 identity.appendChild(el('h3','selected-store-title',s.name||'Estabelecimento'));
 const tags=el('div','selected-store-tags');
 for(const label of [s.category,s.group].filter(Boolean))tags.appendChild(el('span','selected-store-tag',label));
 const selectedDistance=position&&Number.isFinite(row.distance)&&row.distance>=0;
 const distanceChip=el('span','selected-store-tag store-chip-distance',selectedDistance?'A '+row.distance.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' km de você':!position?'Distância: ativar localização':'Distância não disponível');
 distanceChip.title=selectedDistance?'Distância aproximada em linha reta.':!position?'Use a localização para consultar a distância.':'Loja sem coordenadas disponíveis.';
 tags.appendChild(distanceChip);
 if(row.reviewCount>0){
  const score=el('span','selected-store-tag selected-store-tag-rating','★ '+Number(row.rating||0).toFixed(1)+' ('+row.reviewCount+')');
  tags.appendChild(score);
 }
 if(s.delivery)tags.appendChild(el('span','selected-store-tag','Entrega'));
 if(s.pickup)tags.appendChild(el('span','selected-store-tag','Retirada'));
 if(s.sponsored)tags.appendChild(el('span','selected-store-tag','Patrocinada'));
 identity.appendChild(tags);header.appendChild(identity);shell.appendChild(header);
 const details=el('div','selected-store-details');
 const appendDetail=(iconKey,label,value)=>{
  const line=el('div','selected-store-detail-row');
  const icon=el('span','selected-store-detail-icon');icon.appendChild(storeDetailIcon(iconKey));
  const body=el('div','selected-store-detail-text');
  body.append(el('div','selected-store-detail-label',label),el('div','selected-store-detail-value',value));
  line.append(icon,body);details.appendChild(line);
 };
 if(s.address)appendDetail('pin','Endereço',s.address);
 if(s.delivery)appendDetail('truck','Entrega',s.delivery_fee==null?'Taxa não informada':money(s.delivery_fee));
 if(row.reviewCount>0){
  const count=Number(row.reviewCount);
  appendDetail('star','Avaliação',Number(row.rating||0).toFixed(1)+'/5 · '+count+(count===1?' avaliação':' avaliações'));
 }
 if(details.childNodes.length)shell.appendChild(details);
 const actions=el('div','chat-actions selected-store-actions');
 for(const [iconKey,label,q] of [
  ['clock','Horário','Qual o horário?'],
  ['truck','Entrega','Ela entrega?'],
  ['bag','Produtos','Quais produtos tem?'],
  ['card','Pagamento','Aceita Pix?'],
  ['phone','Contato','Qual o WhatsApp?']
 ]){
  const b=el('button','selected-store-action');
  b.type='button';b.append(storeDetailIcon(iconKey),document.createTextNode(label));
  b.onclick=()=>submitText(q);actions.appendChild(b);
 }
 shell.appendChild(actions);box.appendChild(shell);return box;
}
function makeCard(row,index){
 const s=row.store,card=el('article','store-result-card smart-card');
 const top=el('div','store-card-top'),identity=el('div','');
 if(/^https:\/\//.test(String(s.logo_url||''))){
  const media=el('div','store-media');
  const img=el('img','smart-store-logo');
  img.src=s.logo_url;img.alt='Foto de '+s.name;img.loading='lazy';
  img.onerror=()=>media.remove();
  media.appendChild(img);
  if(s.verified){
   const badge=el('span','store-image-verified');
   badge.setAttribute('aria-label','Loja verificada');
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');
   svg.setAttribute('aria-hidden','true');
   const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
   circle.setAttribute('cx','12');circle.setAttribute('cy','12');circle.setAttribute('r','12');circle.setAttribute('fill','#1d9bf0');
   const check=document.createElementNS('http://www.w3.org/2000/svg','path');
   check.setAttribute('d','m7.7 12.2 3 3 5.8-6.3');check.setAttribute('fill','none');
   check.setAttribute('stroke','#fff');check.setAttribute('stroke-width','2.3');
   check.setAttribute('stroke-linecap','round');check.setAttribute('stroke-linejoin','round');
   svg.append(circle,check);badge.appendChild(svg);media.appendChild(badge);
  }
  top.appendChild(media);
 }
 const title=el('h3','',s.name||'Estabelecimento');identity.appendChild(title);
 if(s.address){const city=getCityFromAddress(s.address);if(city)identity.appendChild(el('div','smart-location',city))}
 const tags=el('div','store-card-meta');
 for(const label of [s.category,s.group].filter(Boolean))tags.appendChild(el('span','store-chip',label));
 const validDistance=position&&Number.isFinite(row.distance)&&row.distance>=0;
 const distanceText=validDistance
  ?'A '+row.distance.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' km de você'
  :!position?'Distância: ativar localização':'Distância não disponível';
 const distanceBadge=el('span','store-chip store-chip-distance',distanceText);
 distanceBadge.title=validDistance?'Distância aproximada em linha reta, não trajeto de carro.':!position?'Permita a localização no navegador para calcular a distância.':'Esta loja não possui coordenadas suficientes para calcular a distância.';
 distanceBadge.setAttribute('aria-label',distanceBadge.title+' '+distanceText);
 tags.appendChild(distanceBadge);
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
 if(row.needScore>0&&state.shoppingNeed){
  const proof=catalogVerification(s,db||{},state.shoppingNeed,eligibleProduct);
  const audit=el('div','guru-need-verification');
  audit.appendChild(el('span','guru-need-proof-title','Informações do cadastro'));
  audit.appendChild(el('span','guru-need-proof-status','Loja ativa · Estoque específico não confirmado'));
  if(proof.matchingNames.length){
   audit.appendChild(el('span','guru-need-proof-products','Produtos anunciados no catálogo: '+proof.matchingNames.join(', ')+'. Confirme preços e disponibilidade com a loja.'));
  }else if(proof.catalogCount){
   audit.appendChild(el('span','guru-need-proof-muted','Há produtos cadastrados, mas os itens desta lista não foram confirmados.'));
  }else{
   audit.appendChild(el('span','guru-need-proof-muted','Sem catálogo de produtos disponível na GURU.'));
  }
  card.appendChild(audit);
 }
 const score=el('div','guru-score-line', 'Pontuação GURU: '+Number(row.rankScore||0).toFixed(0)+' pontos');
 score.title='Classificação interna da GURU, diferente da avaliação dos clientes';
 card.appendChild(score);
 const quality=storeDataQuality(s,db||{});
 if(quality.stale)card.appendChild(el('div','guru-data-alert','Informações da loja podem estar desatualizadas ('+quality.daysSinceUpdate+' dias).'));
 const why=el('button','smart-why-btn','Por que apareceu?');why.type='button';
 const panel=el('div','smart-why-panel');
 panel.appendChild(el('div','','Pontuação interna: '+Number(row.rankScore||0).toFixed(0)+' pontos. Avaliações de clientes são exibidas separadamente.'));
 if(Number(row.contextScore)>0)panel.appendChild(el('div','','Relevância contextual: '+row.contextScore+' pontos.'));
 row.reason.forEach(t=>panel.appendChild(el('div','',t)));
 const qualityInfo=storeDataQuality(s,db||{});
 panel.appendChild(el('div','','Cadastro: '+qualityInfo.completed+' de '+qualityInfo.total+' informações essenciais preenchidas.'));
 if(qualityInfo.updatedAt)panel.appendChild(el('div','','Atualizado em '+new Date(qualityInfo.updatedAt).toLocaleDateString('pt-BR')+'.'));
 why.onclick=()=>panel.classList.toggle('on');card.appendChild(why);card.appendChild(panel);
 const actions=el('div','store-card-actions');
 const view=el('button','store-action primary','Ver loja');view.type='button';view.onclick=()=>chooseStore(row);actions.appendChild(view);
 const products=el('button','store-action','Produtos');products.type='button';products.onclick=()=>{state.selectedStore=s;state.selectedProduct=null;replyAboutStore('quais produtos tem?','products');renderContext();save()};actions.appendChild(products);
 const phone=String(s.whatsapp||'').replace(/\D/g,'');
 if(phone.length>=10&&phone.length<=15){const a=el('a','store-action link','WhatsApp');a.href='https://wa.me/'+phone;a.target='_blank';a.rel='noopener noreferrer';actions.appendChild(a)}
 card.appendChild(actions);return card;
}
function renderNextQuestions(host,rows,offset=0){
 const questions=followupPrompts(rows,state);
 const total=(state.lastResults||[]).length;
 const remaining=Math.max(0,total-offset-rows.length);
 if(!questions.length&&!remaining)return;
 const panel=el('div','guru-next-questions');
 panel.appendChild(el('div','guru-next-label','Você também pode perguntar:'));
 const buttons=el('div','guru-next-buttons');
 if(remaining){
  const more=el('button','guru-next-button guru-more-question','Mostrar mais '+Math.min(RESULT_PAGE_SIZE,remaining)+' opções');
  more.type='button';more.onclick=()=>submitText('mais opções');
  buttons.appendChild(more);
 }
 for(const question of questions){
  const b=el('button','guru-next-button',question);b.type='button';
  b.addEventListener('click',()=>submitText(question));buttons.appendChild(b);
 }
 panel.appendChild(buttons);host.appendChild(panel);
}
function renderComparison(indices,question){
 const all=state.lastResults||[];
 const offset=Math.max(0,(Number(state.resultOffset)||RESULT_PAGE_SIZE)-RESULT_PAGE_SIZE);
 const rows=[...new Set(indices)].map(index=>all[offset+index]).filter(Boolean);
 if(rows.length<2){add('Preciso de pelo menos duas opções deste grupo para comparar.');return}
 const items=compareStores(rows,db||{});
 const section=add('',false);section.classList.add('guru-comparison-message');
 const wrap=el('section','guru-compare-experience');
 wrap.appendChild(el('div','guru-compare-kicker','COMPARAR LOJAS'));
 wrap.appendChild(el('h3','guru-compare-title','Comparação entre estabelecimentos'));
 wrap.appendChild(el('p','guru-compare-intro','Informações disponíveis nos cadastros da GURU.'));
 const available=value=>typeof value==='number'&&Number.isFinite(value);
 const metrics=[
  {label:'Pontuação GURU',detail:'Relevância interna',format:x=>available(x.score)?Math.round(x.score)+' pontos':'Não informada',measure:x=>available(x.score)?x.score:null,better:'max',badge:'Maior pontuação'},
  {label:'Entrega',detail:'Serviço cadastrado',format:x=>x.delivery?'Disponível':'Não cadastrada',measure:x=>x.delivery?1:null,better:'max',badge:'Entrega disponível'},
  {label:'Taxa de entrega',detail:'Valor cadastrado',format:x=>x.delivery&&available(x.deliveryFee)?money(x.deliveryFee):'Não informada',measure:x=>x.delivery&&available(x.deliveryFee)?x.deliveryFee:null,better:'min',badge:'Menor taxa'},
  {label:'Preço cadastrado',detail:'Produtos podem ser diferentes',format:x=>available(x.price)?money(x.price):'Sem preço',measure:x=>null,better:null},
  {label:'Distância',detail:'Aproximada, em linha reta',format:x=>available(x.distance)?x.distance.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' km':'Não disponível',measure:x=>available(x.distance)?x.distance:null,better:'min',badge:'Mais próxima'},
  {label:'Avaliações',detail:'Média dos clientes',format:x=>available(x.rating)?x.rating.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'/5 · '+x.ratingCount+' avaliações':'Sem avaliações',measure:x=>available(x.rating)?x.rating:null,better:'max',badge:'Mais bem avaliada'},
  {label:'Produtos cadastrados',detail:'Catálogo disponível',format:x=>x.productCount?x.productCount+' '+(x.productCount===1?'produto':'produtos'):'Nenhum cadastrado',measure:x=>null,better:null}
 ];
 const bestByMetric=metrics.map(metric=>{
  if(!metric.better)return null;
  const values=items.map(metric.measure);
  if(values.some(v=>!available(v))||new Set(values).size<2)return null;
  return metric.better==='min'?Math.min(...values):Math.max(...values);
 });
 const cards=el('div','guru-compare-cards');
 cards.style.setProperty('--guru-compare-count',String(items.length));
 items.forEach((item,index)=>{
  const card=el('article','guru-compare-card');
  const head=el('div','guru-compare-card-head');
  head.appendChild(el('span','guru-compare-number','OPÇÃO '+(index+1)));
  head.appendChild(el('h4','guru-compare-card-name',item.name));
  const city=item.location?getCityFromAddress(item.location):'';
  if(city)head.appendChild(el('span','guru-compare-card-city',city));
  card.appendChild(head);
  const list=el('div','guru-compare-card-metrics');
  metrics.forEach((metric,idx)=>{
   const row=el('div','guru-compare-card-metric');
   const left=el('div','guru-compare-card-label');
   left.appendChild(el('span','',metric.label));
   const right=el('div','guru-compare-card-data');
   const text=el('strong','',metric.format(item));
   const val=metric.measure(item);
   if(bestByMetric[idx]!==null&&val===bestByMetric[idx]){
    row.classList.add('guru-compare-card-best');
    right.appendChild(el('span','guru-compare-best-tag',metric.badge));
   }
   right.prepend(text);
   row.append(left,right);
   list.appendChild(row);
  });
  card.appendChild(list);
  const button=el('button','guru-compare-card-open','Ver loja');
  button.type='button';
  button.onclick=()=>chooseStore(rows[index]);
  card.appendChild(button);
  cards.appendChild(card);
 });
 wrap.appendChild(cards);
 wrap.appendChild(el('p','guru-compare-disclaimer','Destaques aparecem somente quando há dados comparáveis. Pontuação GURU não é avaliação de clientes; preços de produtos diferentes não indicam a loja mais barata.'));
 section.appendChild(wrap);
}
function citySearchState(source=state){
 return {...source,location:{...(source.location||{}),city:userCity,uf:null,neighborhood:null}};
}
function displayResults(rows,offset=0){
 const m=add('',false);m.classList.add('hashtag-result-msg');
 const end=offset+rows.length,total=(state.lastResults||[]).length;
 const intro=offset===0?'Encontrei estas opções em '+userCity+':':'Outras opções em '+userCity+':';
 m.appendChild(el('div','hashtag-intro',intro));
 if(position){
  m.appendChild(el('div','guru-city-distance-note','Distâncias aproximadas em linha reta. A classificação continua sendo por relevância, não por proximidade.'));
 }else{
  const button=el('button','guru-next-button','Mostrar distância em km');
  button.type='button';
  button.onclick=async()=>{if(await locate(true)){
   const activeResults=(state.lastResults||[]).map(r=>({...r,distance:distanceKm(position,r.store)}));
   state.lastResults=activeResults;save();
   const fresh=displayResults(activeResults.slice(offset,offset+rows.length),offset);
   m.replaceWith(fresh);
  }};
  m.appendChild(button);
 }
 const grid=el('div','store-results-grid');rows.forEach((r,i)=>grid.appendChild(makeCard(r,offset+i)));m.appendChild(grid);
 renderNextQuestions(m,rows,offset);return m;
}
function showNextResultPage(){
 const all=state.lastResults||[];
 const offset=Math.min(Math.max(0,Number(state.resultOffset)||0),all.length);
 if(offset>=all.length){add('Não há mais opções nesta pesquisa. Você pode procurar outra categoria ou produto.');return false}
 const page=all.slice(offset,offset+RESULT_PAGE_SIZE);
 state.resultOffset=offset+page.length;
 save();displayResults(page,offset);
 return true;
}
function renderNeedQuestion(need){
 const info=describeNeed(need);if(!info)return;
 const host=add('',false);host.classList.add('guru-need-message');
 const card=el('section','guru-need-card');
 card.appendChild(el('div','guru-need-eyebrow','GURU · ASSISTENTE DE COMPRAS'));
 card.appendChild(el('h3','guru-need-heading',info.title));
 card.appendChild(el('p','guru-need-description','Posso montar uma lista inicial de materiais e procurar lojas cadastradas na sua cidade, sem presumir que têm tudo em estoque.'));
 card.appendChild(el('p','guru-need-question',info.question));
 const options=el('div','guru-need-options');
 for(const choice of info.choices){
  const button=el('button','guru-next-button guru-need-choice',choice);
  button.type='button';button.onclick=()=>submitText(choice);options.appendChild(button);
 }
 card.appendChild(options);host.appendChild(card);
}
function renderNeedPlan(need){
 const info=describeNeed(need);if(!info)return;
 const host=add('',false);host.classList.add('guru-need-message');
 const card=el('section','guru-need-card');
 card.appendChild(el('div','guru-need-eyebrow','SUGESTÃO DE COMPRA'));
 card.appendChild(el('h3','guru-need-heading',info.title+(need.variant?' · '+need.variant:'')));
 card.appendChild(el('p','guru-need-description','Materiais para considerar, não uma confirmação de produtos disponíveis. Verifique itens, quantidades e especificações antes de comprar.'));
 const list=el('div','guru-need-item-list');
 info.items.forEach(item=>list.appendChild(el('span','guru-need-item',item)));
 card.appendChild(list);host.appendChild(card);
}
function showNeedStores(need){
 if(!userCity){askForCity();return}
 const rows=findStoresForNeed(db,need,userCity,position,searchStores,emptyState,60);
 state=emptyState();
 state.location={city:userCity,uf:null,neighborhood:null};
 state.shoppingNeed={...need};
 state.query=describeNeed(need)?.title||'Busca por necessidade';
 state.lastResults=rows;
 state.resultOffset=0;
 lastSearchText=state.query;
 renderContext();save();
 if(!rows.length){
  add('Não encontrei lojas ativas relacionadas a essa necessidade em '+userCity+'. Não vou indicar lojas de outras cidades nem afirmar disponibilidade sem confirmação.');
  return;
 }
 add('Encontrei estabelecimentos relacionados à sua necessidade em '+userCity+'. A correspondência vem da categoria e das especialidades; confirme produtos, preços e disponibilidade com cada loja.');
 showNextResultPage();
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
 // Respostas livres não podem contradizer campos estruturados, como entrega e horários.
 const structuredAsk=['hours','total','delivery','payment','address','contact','rating'].includes(ask);
 const explicitCatalog=ask==='products'&&/\b(produtos|produto|cardapio|estoque|vende|vender|comprar|tamanho)\b/.test(n);
 if(record?.answer&&!structuredAsk&&!explicitCatalog){add(String(record.answer));return}
 if(ask==='knowledge'){if(db.unavailable.knowledge){add('Não consegui consultar as respostas cadastradas desta loja agora. Tente novamente.');return}recordUnansweredKnowledge(text,s.category);add('Não encontrei uma resposta específica cadastrada. Dados da loja: '+[s.name,s.category,s.group,s.address].filter(Boolean).join(' · ')+'.');return}
 if(ask==='hours'){
  if(db.unavailable.hours){add('Não consegui consultar os horários dessa loja agora. Tente novamente.');return}
  const entries=(db.hours||[]).filter(x=>x.store_id===s.id&&Number(x.weekday)===day);
  const open=entries.filter(h=>!h.closed&&h.opens_at&&h.closes_at);
  if(open.length){
   const ranges=open.map(h=>'das '+String(h.opens_at).slice(0,5)+' às '+String(h.closes_at).slice(0,5));
   add(s.name+' funciona no '+dayNames[day]+' '+ranges.join(' e ')+'.');
  }else if(entries.length&&entries.every(x=>x.closed))add('Essa loja está cadastrada como fechada no '+dayNames[day]+'.');
  else add('Essa loja ainda não informou o horário de '+dayNames[day]+'.');
  return;
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
 if(ask==='rating'){if(db.unavailable.reviews){add('Não consegui consultar as avaliações dessa loja agora. Tente novamente.');return}const rv=ratingsMap(db.reviews).get(s.id);add(rv?'Avaliação real: '+(rv.sum/rv.count).toFixed(1)+'/5 em '+rv.count+' avaliação(ões).':'Essa loja ainda não possui avaliações cadastradas.');return}
 const ps=productListFor(s,text);
 if(!ps.length){add('Não encontrei produto ativo e disponível em estoque que corresponda a essa pergunta.');return}
 if(ps.length===1)state.selectedProduct=ps[0];
 add('Na '+s.name+', encontrei:\n'+ps.slice(0,8).map(p=>'• '+p.name+' — '+money(priceOf(p))+' · estoque '+p.stock).join('\n'));save();
}
function specialtyMentionInQuery(text){
 const request=norm(text);
 const found=new Map();
 for(const store of db?.stores||[]){
  if(store.active!==true||store.status!=='active')continue;
  for(const name of Array.isArray(store.specialties)?store.specialties:[]){
   const key=norm(name);
   if(key.length<4||found.has(key))continue;
   if((' '+request+' ').includes(' '+key+' '))found.set(key,name);
  }
 }
 return [...found.entries()].sort((a,b)=>b[0].length-a[0].length)[0]?.[1]||null;
}
function isBareCategoryOrGroupQuery(text,plan){
 if(!plan?.taxon)return false;
 const raw=norm(text);
 const terms=[plan.taxon.term,plan.taxon.group,plan.taxon.category].filter(Boolean).map(norm);
 return terms.includes(raw);
}
function isNewSpecialtyRequest(text,specialty){
 return Boolean(specialty)&&/\b(?:busca|buscar|busque|encontra|encontrar|encontre|procuro|procurar|procure|pesquisa|pesquisar|pesquise|recomenda|recomendar|recomende|indica|indicar|indique|especialidade|especializada|especializado|quero|preciso)\b/.test(norm(text));
}
async function run(text){
 if(isMoreResultsRequest(text)){
  if(!(state.lastResults||[]).length){add('Ainda não tenho resultados para continuar. Faça uma pesquisa primeiro.');return}
  showNextResultPage();return;
 }
 const routed=routeConversation(text);
 if(routed.kind==='social'){add(routed.answer);return}
 text=routed.query;
 const pendingNeed=state.shoppingNeed;
 const chosenNeed=pendingNeed?choiceForNeed(pendingNeed,text):null;
 if(chosenNeed){
  if(!userCity){askForCity(text);return}
  await loadData();
  const need={...pendingNeed,variant:chosenNeed};
  renderNeedPlan(need);showNeedStores(need);return;
 }
 if(pendingNeed&&isFindStoresForNeed(text)){
  if(!userCity){askForCity(text);return}
  await loadData();
  renderNeedPlan(pendingNeed);showNeedStores(pendingNeed);return;
 }
 const newlyDetectedNeed=detectNeed(text);
 if(newlyDetectedNeed){
  if(!userCity){askForCity(text);return}
  state.shoppingNeed=newlyDetectedNeed;save();
  // Se a pessoa já especificou o ambiente ou etapa, evite perguntar novamente.
  if(newlyDetectedNeed.variant){
   await loadData();
   renderNeedPlan(newlyDetectedNeed);showNeedStores(newlyDetectedNeed);
  }else renderNeedQuestion(newlyDetectedNeed);
  return;
 }
 if(pendingNeed){state.shoppingNeed=null;save()}
 const broad=suggestBroadConversation(text);
 if(broad){
  const m=add(broad.text),panel=el('div','guru-next-buttons');
  broad.options.forEach(q=>{const button=el('button','guru-next-button',q);button.type='button';button.onclick=()=>submitText(q);panel.appendChild(button)});
  m.appendChild(panel);return;
 }
 const prelim=interpret(text,taxonomy,aliases,state);
 if(prelim.kind==='reset'){state=emptyState();try{sessionStorage.removeItem(memoryKey)}catch{};renderContext();add('Contexto limpo. O que você quer encontrar?');return}
 // Carregue o catálogo antes de compreender o produto solicitado.
 await loadData();
 // Respostas gerais aprovadas são usadas apenas em correspondência exata de pergunta.
 // Nunca substituem filtros, disponibilidade ou dados estruturados de uma loja selecionada.
 if(userCity&&!state.selectedStore&&!(state.lastResults||[]).length){
  const verified=approvedAnswerFor(text,db.approvedAnswers||[]);
  if(verified){add(verified.answer);return}
 }
 const refinement=followupRefinement(text,state);
 const follow=refinement?null:contextualIntent(text,state);
 if(follow){
  const current=state.lastResults||[];
  if(follow.kind==='compare'){renderComparison(follow.indices,text);return}
  let matching=[];
  if(follow.kind==='filterPrevious'){
   if(follow.attribute==='delivery')matching=current.filter(r=>r.store?.delivery===true);
   else if(follow.attribute==='noDelivery')matching=current.filter(r=>r.store?.delivery!==true);
   else if(follow.attribute==='stock')matching=current.filter(r=>(r.products||[]).length>0);
  }else if(follow.kind==='sortPrevious'){
   const usable=current.filter(r=>follow.attribute==='price'?r.minPrice!=null:follow.attribute==='distance'?r.distance!=null:r.reviewCount>0);
   matching=[...usable].sort((a,b)=>follow.attribute==='price'?a.minPrice-b.minPrice:follow.attribute==='distance'?a.distance-b.distance:b.rating-a.rating);
  }
  if(!matching.length){
   const reason=follow.attribute==='price'?'preços dos produtos':follow.attribute==='distance'?'distâncias confirmadas':follow.attribute==='rating'?'avaliações verificadas':follow.attribute==='delivery'?'opções com entrega':follow.attribute==='noDelivery'?'opções sem entrega':'produtos em estoque';
   add('Ainda não tenho '+reason+' suficientes nessas opções. Posso fazer uma nova busca se você quiser.');return;
  }
  state.lastResults=matching;state.resultOffset=0;save();
  add(follow.kind==='sortPrevious'?'Organizei as opções com base nas informações cadastradas.':'Separei as opções da lista que atendem ao que você pediu.');
  showNextResultPage();return;
 }
 // O tipo de contexto revisado pelo administrador direciona perguntas exatas
 // para respostas estruturadas e específicas da loja selecionada.
 // Não usamos o texto genérico aprovado para afirmar estoque, entrega ou horário.
 if(state.selectedStore){
  const contextual=approvedStoreContextFor(text,db.approvedAnswers||[]);
  if(contextual){
   replyAboutStore(text,contextual.ask);
   renderContext();save();return;
  }
 }
 const specialtyMention=specialtyMentionInQuery(text);
 const newSpecialty=isNewSpecialtyRequest(text,specialtyMention);
 // Consulta direta de categoria/grupo não pode virar pergunta sobre a loja
 // anterior nem herdar filtros antigos.
 const rawPlan=interpret(text,taxonomy,aliases,{...state,selectedStore:null},{products:db?.products||[]});
 const bareTaxonomy=isBareCategoryOrGroupQuery(text,rawPlan);
 const intentState=newSpecialty||bareTaxonomy||refinement?{...state,selectedStore:null}:state;
 const plan=bareTaxonomy?rawPlan:interpret(refinement?.query||text,taxonomy,aliases,intentState,{products:db?.products||[]});
 if(plan.kind==='search'&&newSpecialty&&!bareTaxonomy)plan.specialtyTerm=specialtyMention;
 if(plan.kind==='blocked'){add('“Loja” e “comércio” são tratados como varejo e não entram na categoria Comida. Pesquise por restaurante, pizzaria ou pelo tipo de comida.');return}
 if(plan.kind==='clarify'){
  add(plan.reason==='product'?'Qual produto você está procurando? Informe o nome ou uma característica do item para eu consultar o catálogo.':'Qual estabelecimento da lista você quer consultar? Pode dizer, por exemplo, “a segunda”.');
  return;
 }
 if(plan.kind==='select'){
  if(!userCity){askForCity(text);return}
  const visibleOffset=Math.max(0,(Number(state.resultOffset)||RESULT_PAGE_SIZE)-RESULT_PAGE_SIZE);
  const index=plan.index<0?state.lastResults.length-1:visibleOffset+plan.index,row=state.lastResults[index];
  if(!row){add('Essa opção não existe na lista atual.');return}
  recordSelection(row.store?.id);
  if(plan.ask)rememberSelection(lastSearchText||state.query,row.store?.id);
  state.selectedStore=row.store;state.selectedProduct=(state.productTerm&&row.products?.length===1)?row.products[0]:null;
  if(plan.ask){replyAboutStore(text,plan.ask,plan.filters);renderContext();save()}else chooseStore(row);
  return;
 }
 if(plan.kind==='ask'){if(!userCity){askForCity(text);return}replyAboutStore(text,plan.ask,plan.filters);renderContext();save();return}
 if(plan.kind!=='search')return;
 if(!userCity){askForCity(text);return}
 if(plan.filters?.maxDistance!=null&&!position){
  const message=add('Para filtrar por quilômetros, autorize sua localização. A busca continuará limitada a '+userCity+'.',false);
  const b=el('button','guru-next-button','Usar localização e calcular km');
  b.type='button';
  b.onclick=async()=>{if(await locate(true))await run(text)};
  message.appendChild(b);
  return;
 }
 // Sem solicitação de GPS obrigatória: apenas distância opcional nos resultados.
 // Valide dados obrigatórios antes de trocar o contexto. Uma falha não deve apagar a loja selecionada.
 const draft=nextState(bareTaxonomy?emptyState():state,plan);
 // Uma categoria ou grupo digitado isoladamente representa nova pesquisa.
 // Não exigir produto, entrega ou outra especialidade da conversa anterior.
 if(bareTaxonomy){draft.productTerm=null;draft.specialtyTerm=null}
 draft.location={...(draft.location||{}),city:userCity,uf:null,neighborhood:null};
 if(db.unavailable.hours&&(draft.filters.openNow||draft.filters.day!=null||(Array.isArray(draft.filters.days)&&draft.filters.days.length)||draft.filters.start!=null||draft.filters.end!=null)){add('Não consegui consultar os horários agora, então não vou afirmar que alguma loja está aberta. Tente novamente.');return}
 if(db.unavailable.reviews&&(draft.filters.minRating!=null||draft.filters.sort==='rating')){add('Não consegui consultar as avaliações agora. Tente novamente antes de aplicar esse filtro.');return}
 // Busca híbrida: resultados literais primeiro; sinônimos e erros de escrita
 // só entram quando a consulta original não encontrou nenhum resultado.
 let finalState=draft,rows=searchStores(db,draft,position,{limit:60}),recovery=null;
 // Segurança para grupos com estabelecimentos cadastrados: não informar
 // falsamente "nenhum atende" quando somente filtros herdados bloquearam.
 if(!rows.length&&plan.taxon?.group&&!plan.productTerm&&Object.keys(plan.filters||{}).length===0){
  const fresh=nextState(emptyState(),{...plan,specialtyTerm:null});
  fresh.productTerm=null;fresh.specialtyTerm=null;
  fresh.location={city:userCity,uf:null,neighborhood:null};
  const found=searchStores(db,fresh,position,{limit:60});
  if(found.length){rows=found;finalState=fresh}
 }
 if(!rows.length){
  for(const alt of [...guidedSearchAlternatives(text,db,taxonomy,aliases),...catalogAwareAlternatives(text,db,taxonomy,aliases),...sharedAlternatives(text,db.sharedAliases,db),...semanticNeedAlternatives(text,db)]){
   const alternatePlan=interpret(alt.query,taxonomy,aliases,state,{products:db?.products||[]});
   if(alternatePlan.kind!=='search')continue;
   const alternateState=preserveMandatoryFilters(draft,nextState(state,alternatePlan));
   if(draft.specialtyTerm)alternateState.specialtyTerm=draft.specialtyTerm;
   alternateState.location={...(alternateState.location||{}),city:userCity,uf:null,neighborhood:null};
   const found=searchStores(db,alternateState,position,{limit:60});
   if(found.length){rows=found;finalState=alternateState;recovery=alt;break}
  }
 }
 state=finalState;
 renderContext();save();
 rows=rankV9(rerankSearchResults(rows,text,db,state.filters?.sort),text,state.filters?.sort).slice(0,60);
 lastSearchText=text;
 state.lastResults=rows;state.resultOffset=0;
 recordSearch(text,plan,rows);
 if(!rows.length){
  const guidance=noResultGuidance(text,db,taxonomy,aliases);
  const m=add(explainEmptySearch(db,state,position),false),candidates=guidance.suggestions||[];
  if(candidates.length)m.appendChild(el('div','guru-next-label','Outras pesquisas que você pode tentar:'));
  if(candidates.length){
   const panel=el('div','guru-next-buttons');
   for(const candidate of candidates){
    const button=el('button','guru-next-button','Pesquisar: '+candidate);
    button.type='button';button.addEventListener('click',()=>submitText(candidate));panel.appendChild(button);
   }
   m.appendChild(panel);
  }
  save();return;
 }
 if(recovery){
  const hint=recovery.mode==='correction'?'Identifiquei uma possível correção de escrita.':recovery.mode==='concept'||recovery.mode==='semantic-need'?'Entendi a necessidade descrita e procurei uma categoria cadastrada.':'Encontrei uma expressão relacionada no catálogo.';
  add(hint+' Pesquisei por “'+recovery.query+'”.');
 }
 const natural=await hybridResponse(text,rows.slice(0,RESULT_PAGE_SIZE));
 if(natural)add(natural);
 showNextResultPage();
 save();
}
async function submitText(raw){
 const t=String(raw||'').trim();if(!t)return;
 setSuggestions();
 if(searchBusy){notice('Aguarde a conclusão da busca atual.');return}
 searchBusy=true;input.disabled=true;
 document.body.classList.add('chat-started');
 add(t,true);
 const typing=showTypingIndicator();
 const start=performance.now();
 replyBuffer=document.createDocumentFragment();
 try{await run(t)}catch(err){msgError(err)}finally{
  const remaining=Math.max(0,minTypingMs-(performance.now()-start));
  if(remaining)await new Promise(resolve=>setTimeout(resolve,remaining));
  const completed=replyBuffer;
  replyBuffer=null;
  typing.remove();
  try{await showAssistantReply(completed)}
  finally{
   input.disabled=false;input.focus();searchBusy=false;
  }
 }
}
function resetConversation(){
 state=emptyState();try{sessionStorage.removeItem(memoryKey)}catch{};
 msgs.replaceChildren(el('div','msg bot','Olá! Diga o que você procura.'));
 document.body.classList.remove('chat-started');
 input.value='';setSuggestions();renderContext();
 input.focus({preventScroll:true});
}
function initMobileKeyboardLayout(){
 const viewport=window.visualViewport;
 if(!viewport)return;
 let frame=0;
 const sync=()=>{
  cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{
   const smallScreen=window.matchMedia('(max-width: 680px)').matches;
   const focused=smallScreen&&document.activeElement===input;
   // VisualViewport mostra a área realmente visível quando o teclado virtual aparece.
   // Em navegadores que já redimensionam o layout, o inset resultará em zero.
   const covered=Math.max(0,window.innerHeight-(viewport.height+viewport.offsetTop));
   const inset=focused&&covered>80?Math.round(covered):0;
   document.documentElement.style.setProperty('--guru-keyboard-inset',inset+'px');
   document.body.classList.toggle('guru-keyboard-open',Boolean(inset));
  });
 };
 viewport.addEventListener('resize',sync,{passive:true});
 viewport.addEventListener('scroll',sync,{passive:true});
 window.addEventListener('resize',sync,{passive:true});
 window.addEventListener('orientationchange',sync,{passive:true});
 input.addEventListener('focus',sync);
 input.addEventListener('blur',sync);
 sync();
}
function initShell(){
 const body=document.body,side=document.querySelector('.app-sidebar');
 const hero=document.querySelector('.hero h1');
 const subtitle=document.querySelector('.hero p');
 const welcomeSlides=[
  ['O que você quer encontrar?','Encontre lojas, produtos e serviços conversando com a GURU.'],
  ['Procurando uma loja?','Descubra estabelecimentos cadastrados na sua cidade.'],
  ['Precisa encontrar um produto?','Descreva o que procura e veja as opções disponíveis.'],
  ['Quer comparar estabelecimentos?','Conheça as diferenças entre as opções cadastradas.']
 ];
 const welcomeKey='guru_welcome_slide_v2';
 let welcomeIndex=0;
 try{
  const previous=Number(sessionStorage.getItem(welcomeKey));
  welcomeIndex=Number.isInteger(previous)&&previous>=0?(previous+1)%welcomeSlides.length:0;
  sessionStorage.setItem(welcomeKey,String(welcomeIndex));
 }catch{}
 const setWelcome=index=>{
  if(!hero||body.classList.contains('chat-started'))return;
  welcomeIndex=index%welcomeSlides.length;
  hero.textContent=welcomeSlides[welcomeIndex][0];
  if(subtitle)subtitle.textContent=welcomeSlides[welcomeIndex][1];
 };
 const updateChatLayout=()=>{
  const hasConversation=[...msgs.children].some(node=>node.classList?.contains('guru-city-choice')||node.classList?.contains('user')||node.classList?.contains('hashtag-result-msg'));
  body.classList.toggle('chat-started',hasConversation);
  // Não alterar a frase quando a conversa for aberta ou reiniciada.
 };
 if(msgs){
  new MutationObserver(updateChatLayout).observe(msgs,{childList:true});
  updateChatLayout();
 }
 setWelcome(welcomeIndex);
 side?.querySelector('.sidebar-collapse')?.addEventListener('click',()=>body.classList.toggle('sidebar-collapsed'));
 side?.addEventListener('click',e=>{const b=e.target.closest('[data-shell-action]');if(!b)return;if(b.dataset.shellAction==='new')resetConversation();if(b.dataset.shellAction==='location'){userCity='';try{sessionStorage.removeItem(userCityKey)}catch{};askForCity()}});
 document.getElementById('resetBtn')?.addEventListener('click',resetConversation);
 document.getElementById('locBtn')?.addEventListener('click',()=>{userCity='';try{sessionStorage.removeItem(userCityKey)}catch{};askForCity()});
 document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>submitText(b.dataset.q||'')));
}
if(form&&input&&msgs){
 form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(q){input.value='';setSuggestions();submitText(q)}});
 input.addEventListener('input',updateSuggestions);
 input.addEventListener('keydown',e=>{if(e.key==='Escape')setSuggestions();if(e.key==='ArrowDown'&&visibleSuggestions.length){e.preventDefault();suggestions?.querySelector('button')?.focus()}});
 input.addEventListener('blur',()=>setTimeout(()=>{if(!suggestions?.contains(document.activeElement))setSuggestions()},100));
 restore();initShell();initMobileKeyboardLayout();renderContext();
 // Mostre as frases variáveis na abertura; solicite a cidade somente quando
 // a pessoa iniciar uma pesquisa ou tocar em "Usar localização".
 if(userCity){
  state.location={...(state.location||{}),city:userCity};
  renderContext();
 }
 loadData().catch(err=>{
  console.warn('[GURU v4] Carregamento inicial não concluído:',err);
  add('Não consegui carregar o catálogo agora. Você ainda pode escrever sua pergunta e tentar novamente.');
 });
 window.GuruEngineV4={interpret:q=>interpret(q,taxonomy,aliases,state,{products:db?.products||[]}),submitText,reset:resetConversation,refresh:()=>loadData(true),getState:()=>state,learningStats};
}else console.error('[GURU v4] Formulário ausente.');
