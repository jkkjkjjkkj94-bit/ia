// GOOY v4 - um único responsável por eventos, contexto, busca e resultados.
import {semanticAlternatives,contextualRank,explainMatch,clarifyShoppingQuery,diagnosisForNoResults} from './guru-intelligence-v14.mjs?v=3';
import {detectNeed,describeNeed,choiceForNeed,isFindStoresForNeed,findStoresForNeed,catalogVerification} from './guru-needs-v1.mjs?v=3';
import {taxonomy as fallbackTaxonomy,categoryAliases as fallbackAliases} from './ai-taxonomy.js?v=7';
import {routeConversation} from './guru-smalltalk.mjs?v=2';
import {detectOuting,outingRankRows,outingRankPlaces,outingUpcomingEvents,buildOutingItinerary,editOutingStops,outingStraightKm} from './gooy-outings-v1.mjs?v=15';

import {contextualIntent,compareStores,comparisonSummary,followupPrompts,storeDataQuality,suggestBroadConversation} from './guru-conversation-v5.mjs?v=4';
import {recordSearch,recordSelection,recordUnansweredKnowledge} from './guru-telemetry-v5.mjs?v=3';
import {preserveMandatoryFilters} from './guru-search-v6.mjs?v=1';
import {guidedSearchAlternatives,rerankSearchResults,noResultGuidance} from './guru-search-v7.mjs?v=2';
import {catalogAwareAlternatives} from './guru-search-v8.mjs?v=1';
import {rankV9,rememberSelection,learningStats} from './guru-ranking-v9.mjs?v=2';
import {sharedAlternatives} from './guru-context-v10.mjs?v=1';
import {semanticNeedAlternatives} from './guru-semantic-v12.mjs?v=2';
import {followupRefinement} from './guru-followup-v13.mjs?v=1';
import {evidenceForStore,evidenceForField} from './guru-evidence-v1.mjs?v=2';
import {approvedAnswerFor,approvedStoreContextFor} from './guru-knowledge-v11.mjs?v=2';
import {norm,normalizeQuery,buildLexicon,interpret,emptyState,nextState,searchStores,explainEmptySearch,applyStoreHighlight,priceOf,eligibleProduct,ratingsMap,distanceKm,scheduleMatches} from './guru-engine-v4-core.mjs?v=29';

const CORE={url:'https://ccsypggvelcxsqszepfs.supabase.co',key:'sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG'};
const AI={url:'https://innziuzgtpfsiywqmies.supabase.co',key:'sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1'};
const form=document.getElementById('chatForm'),input=document.getElementById('q'),msgs=document.getElementById('msgs'),ctx=document.getElementById('ctx'),toast=document.getElementById('toast');
let state=emptyState(),db=null,loadPromise=null,lastLoad=0,position=null,searchBusy=false;
let locationAttempted=false;
let lastOuting=null;
let lastDiscovery=null;
let userCity='';
let pendingCityQuery='';
const userCityKey='guru_city_v1';
try{userCity=String(sessionStorage.getItem(userCityKey)||'').trim().slice(0,90)}catch{}
let replyBuffer=null;
let lastSearchText='';
const minTypingMs=850;
const RESULT_PAGE_SIZE=3;

/* Busca regional sob consentimento: somente cidades reconhecidas na região,
   sem GPS obrigatório, sem consulta externa e sem alterar a cidade preferida. */
let regionalSearchInfo=null;
let regionalConsentVersion=0;
const GURU_NEARBY_CITIES={
 'salto de pirapora':['Votorantim','Sorocaba','Araçoiaba da Serra','Pilar do Sul','Piedade','Sarapuí'],
 'sorocaba':['Votorantim','Araçoiaba da Serra','Salto de Pirapora','Iperó','Porto Feliz','Alumínio','Boituva'],
 'votorantim':['Sorocaba','Salto de Pirapora','Piedade','Araçoiaba da Serra','Alumínio'],
 'aracoiaba da serra':['Sorocaba','Salto de Pirapora','Votorantim','Iperó','Capela do Alto'],
 'pilar do sul':['Salto de Pirapora','Piedade','Sarapuí','São Miguel Arcanjo'],
 'piedade':['Votorantim','Salto de Pirapora','Pilar do Sul','Ibiúna','São Roque'],
 'sarapui':['Salto de Pirapora','Pilar do Sul','Itapetininga','Alambari'],
 'ipero':['Sorocaba','Araçoiaba da Serra','Porto Feliz','Boituva','Capela do Alto'],
 'porto feliz':['Sorocaba','Iperó','Boituva','Itu','Salto'],
 'boituva':['Iperó','Porto Feliz','Tatuí','Cerquilho','Sorocaba'],
 'itu':['Salto','Porto Feliz','Sorocaba','Cabreúva','Mairinque'],
 'salto':['Itu','Porto Feliz','Cabreúva','Boituva'],
 'tatui':['Boituva','Cerquilho','Cesário Lange','Itapetininga','Capela do Alto'],
 'cerquilho':['Tatuí','Boituva','Cesário Lange','Tietê'],
 'cesario lange':['Tatuí','Cerquilho','Boituva','Itapetininga'],
 'itapetininga':['Alambari','Sarapuí','Tatuí','São Miguel Arcanjo'],
 'alambari':['Itapetininga','Sarapuí','Tatuí'],
 'sao miguel arcanjo':['Itapetininga','Pilar do Sul','Sarapuí'],
 'sao roque':['Mairinque','Araçariguama','Alumínio','Ibiúna'],
 'mairinque':['São Roque','Alumínio','Araçariguama','Itu'],
 'aluminio':['Mairinque','São Roque','Sorocaba','Votorantim'],
 'aracariguama':['São Roque','Mairinque','Cabreúva'],
 'cabreuva':['Itu','Salto','Araçariguama'],
 'ibiuna':['Piedade','São Roque','Votorantim'],
 'capela do alto':['Araçoiaba da Serra','Iperó','Tatuí','Sorocaba'],
 'tiete':['Cerquilho','Boituva','Tatuí']
};
function availableNearbyCities(city){
 if(!db?.stores?.length||!city)return [];
 const known=new Map();
 for(const store of db.stores){
  if(store.active!==true||store.status!=='active')continue;
  const found=getCityFromAddress(store.address);
  if(found&&!known.has(norm(found)))known.set(norm(found),found);
 }
 return (GURU_NEARBY_CITIES[norm(city)]||[])
  .filter(c=>norm(c)!==norm(city)&&known.has(norm(c)))
  .map(c=>known.get(norm(c))).slice(0,7);
}
function askRegionalSearchPermission(query,searchState,findRowsForCity=null){
 const origin=userCity;
 const cities=availableNearbyCities(origin);
 if(!cities.length)return;
 const version=++regionalConsentVersion;
 const prompt=add('Não encontrei opções que atendam à sua busca em '+origin+'. Posso procurar em cidades próximas, como '+cities.slice(0,3).join(', ')+'? Só ampliarei a busca com sua autorização.');
 const actions=el('div','guru-next-buttons');
 const yes=el('button','guru-next-button','Sim, buscar na região');
 const no=el('button','guru-next-button','Não, somente '+origin);
 yes.type='button';no.type='button';
 const status=el('div','guru-regional-consent-status');
 const close=()=>{yes.disabled=true;no.disabled=true;actions.hidden=true};
 yes.addEventListener('click',()=>{
  if(version!==regionalConsentVersion||userCity!==origin||searchBusy)return;
  close();
  status.textContent='Buscando somente nos estabelecimentos cadastrados das cidades próximas...';
  const found=[];
  const seen=new Set();
  for(const city of cities){
   const regionalState={...searchState,location:{...(searchState.location||{}),city,uf:'SP',neighborhood:null}};
   for(const row of (findRowsForCity?findRowsForCity(city):searchStores(db,regionalState,position,{limit:25}))){
    if(seen.has(row.store.id))continue;
    seen.add(row.store.id);
    found.push({...row,regionalCity:city});
   }
  }
  if(!found.length){
   status.textContent='Não encontrei opções correspondentes nas cidades próximas consultadas: '+cities.join(', ')+'. Mantive '+origin+' como sua cidade preferida.';
   return;
  }
  const ranked=contextualRank(rankV9(rerankSearchResults(found,query,db,searchState.filters?.sort),query,searchState.filters?.sort),query,searchState.filters?.sort).slice(0,60);
  regionalSearchInfo={origin,cities};
  state.lastResults=ranked;
  state.resultOffset=0;
  lastSearchText=query;
  save();
  status.textContent='Busca regional autorizada. Sua cidade preferida continua sendo '+origin+'.';
  showNextResultPage();
 });
 no.addEventListener('click',()=>{
  if(version!==regionalConsentVersion)return;
  close();status.textContent='Certo. Vou manter a busca somente em '+origin+'.';
 });
 actions.append(yes,no);prompt.append(actions,status);
}

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
 message.setAttribute('aria-label','GOOY está digitando');
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
const msgError=err=>{
 console.error('[GOOY v4]',err);
 const message=String(err?.message||'');
 if(/fetch|network|failed to fetch|abort|timeout|HTTP (?:429|5\\d\\d)/i.test(message)){
  add('Não foi possível acessar o catálogo agora. Verifique a conexão e tente novamente.');
 }else if(/HTTP 401|HTTP 403/i.test(message)){
  add('A consulta ao catálogo foi bloqueada por uma configuração de acesso. O administrador precisa verificar as permissões.');
 }else{
  add('Ocorreu um erro ao processar a pesquisa. Tente novamente ou inicie uma nova busca.');
 }
};
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
  regionalSearchInfo=null;
  regionalConsentVersion++;
  const current=citySearchState();
  let rows=searchStores(db,current,position,{limit:60}),unconfirmed=false;
  const f=current.filters||{};
  const requestedDay=f.day!=null||(Array.isArray(f.days)&&f.days.length)||(Array.isArray(f.daysAll)&&f.daysAll.length)||f.start!=null||f.end!=null;
  if(!rows.length&&requestedDay&&!f.openNow){
   rows=searchStores(db,current,position,{limit:60,includeUnknownHours:true});unconfirmed=rows.length>0;
  }
  state.lastResults=rows;state.resultOffset=0;save();
  if(unconfirmed)add('Não há horários confirmados para esse dia entre as opções encontradas. Essas lojas podem ser relevantes, mas confirme o funcionamento diretamente antes de ir.');
  if(rows.length)showNextResultPage();
  else{
   add(explainEmptySearch(db,state,position));
   askRegionalSearchPermission(state.query||'lojas',current);
  }
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
 const isDay=label=>/^(sábado|domingo|segunda|terça|quarta|quinta|sexta|Abertas agora|Dias:)/i.test(label);
 const priority=[...chips.filter(x=>x.label.startsWith('Cidade:')),...chips.filter(x=>x.label.startsWith('Categoria:')),...chips.filter(x=>isDay(x.label))];
 const extras=chips.filter(x=>!priority.includes(x));
 const ordered=[...priority,...extras];
 const visible=new Set(priority.slice(0,3));
 const collapsed=!ctx.dataset.expanded;
 ctx.classList.toggle('guru-context-expanded',!collapsed);
 ordered.forEach(entry=>{
  const button=el('button','guru-filter-chip',entry.label.replace(/^Categoria: /,'').replace(/^Cidade: /,''));
  button.type='button';
  if(collapsed&&!visible.has(entry))button.hidden=true;
  const remove=el('span','guru-filter-remove','×');remove.setAttribute('aria-hidden','true');button.appendChild(remove);
  button.setAttribute('aria-label','Remover filtro '+entry.label);
  button.addEventListener('click',()=>{entry.clear();renderContext();save();if(db)refreshFilteredResults()});
  ctx.appendChild(button);
 });
 const hiddenCount=ordered.length-visible.size;
 if(hiddenCount>0){
  const more=el('button','guru-filter-more',collapsed?'Filtros ('+hiddenCount+')':'Mostrar menos');more.type='button';
  more.setAttribute('aria-expanded',String(!collapsed));
  more.addEventListener('click',()=>{if(collapsed)ctx.dataset.expanded='true';else delete ctx.dataset.expanded;renderContext()});
  ctx.appendChild(more);
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
// Mantém a taxonomia já treinada e acrescenta a navegação unificada, sem apagar sinônimos.
// Catálogo navegável: só exibe grupos e especialidades que realmente têm lojas.
function renderCategoryBrowser(stores=[]){
 const host=document.getElementById('guruCategoryList');if(!host)return;
 const groups=new Map();
 for(const s of stores){
  if(s.active!==true||s.status!=='active'||!s.category)continue;
  const main=s.category,sub=s.group||'Outros estabelecimentos';
  if(!groups.has(main))groups.set(main,{count:0,children:new Map()});
  const bucket=groups.get(main);bucket.count++;
  bucket.children.set(sub,(bucket.children.get(sub)||0)+1);
 }
 host.replaceChildren();
 for(const [main,item] of [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'))){
  const row=el('details','guru-category-item'),heading=el('summary','',main+' ('+item.count+')');
  const actions=el('div','guru-category-actions');
  const addButton=(label,query)=>{const button=el('button','guru-category-option',label);button.type='button';button.addEventListener('click',()=>submitText(query));actions.appendChild(button)};
  addButton('Todas as lojas',main);
  for(const [sub,count] of [...item.children.entries()].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'))){
   addButton(sub+' ('+count+')',sub);
  }
  row.append(heading,actions);host.appendChild(row);
 }
}
function extendCanonicalTaxonomy(stores=[]){
 // Usa somente a taxonomia vigente; não recria categorias legadas.
 for(const store of stores){
  if(store.active!==true||store.status!=='active')continue;
  const category=String(store.category||'').trim();
  const group=String(store.group||'').trim();
  if(!category||!group||!taxonomy[category])continue;
  if(!taxonomy[category][group])taxonomy[category][group]=[group];
 }
}
// Converte os horários publicados no COREDB para o formato semanal usado pelo filtro.
function coreStoreHours(stores){
 const days=['domingo','segunda','terca','quarta','quinta','sexta','sabado'],result=[];
 for(const store of stores){
  const segments=String(store.operating_days||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(';');
  for(const segment of segments){
   const range=segment.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
   const all=/(segunda\s+a\s+domingo|todos\s+os\s+dias)/.test(segment);
   const matched=[];
   if(all)matched.push(0,1,2,3,4,5,6);
   else{
    const span=segment.match(/(domingo|segunda|terca|quarta|quinta|sexta|sabado)\s+a\s+(domingo|segunda|terca|quarta|quinta|sexta|sabado)/);
    if(span){let i=days.indexOf(span[1]);const last=days.indexOf(span[2]);for(let n=0;n<7;n++){matched.push(i);if(i===last)break;i=(i+1)%7}}
    else for(let i=0;i<7;i++)if(new RegExp('\\b'+days[i]+'\\b').test(segment))matched.push(i);
   }
   const opens=range?.[1]||(all?String(store.opening_time||'').slice(0,5):'');
   const closes=range?.[2]||(all?String(store.closing_time||'').slice(0,5):'');
   for(const weekday of matched)result.push({store_id:store.id,weekday,opens_at:opens||null,closes_at:closes||null,closed:segment.includes('fechado')||!opens||!closes});
  }
 }
 return result;
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
   read(AI,'local_ai_qa','&active=eq.true'),read(CORE,'places'),read(CORE,'local_ai_events','&active=eq.true'),read(AI,'local_ai_store_trophies','&active=eq.true')
  ]);
  const get=i=>all[i].status==='fulfilled'?all[i].value:[];
  if(all[0].status==='rejected')throw all[0].reason;
  if(all[1].status==='rejected')throw all[1].reason;
  const failures=all.map((x,i)=>x.status==='rejected'?i:null).filter(x=>x!==null);
  if(failures.length)console.warn('[GOOY v4] Dados complementares indisponíveis',failures);
  mergeTaxonomy(get(5),get(6),get(7));
  extendCanonicalTaxonomy(get(0));
  const highlightsByStore=new Map(get(8).map(h=>[h.store_id,h]));
  const now=Date.now();
  // A flag COREDB `verified` pode refletir apenas aprovação antiga; não é fonte do selo.
  db={stores:get(0).map(s=>applyStoreHighlight(s,highlightsByStore.get(s.id),now)),products:get(1),hours:[...get(2),...coreStoreHours(get(0)).filter(h=>!get(2).some(a=>a.store_id===h.store_id&&Number(a.weekday)===h.weekday))],reviews:get(3),knowledge:get(4),sharedAliases:get(9),approvedAnswers:get(10),places:get(11),events:get(12),trophies:get(13),unavailable:{hours:failures.includes(2),reviews:failures.includes(3),knowledge:failures.includes(4),taxonomy:failures.includes(5)||failures.includes(6)||failures.includes(7),highlights:failures.includes(8),trophies:failures.includes(13)}};
  renderCategoryBrowser(db.stores);lastLoad=Date.now();rehydrate();if(input?.value)updateSuggestions();return db;
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
 regionalSearchInfo=null;regionalConsentVersion++;
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
 m.appendChild(el('div','guru-city-distance-note','A GOOY pesquisará apenas lojas dessa cidade. Digite o município ou autorize a localização.'));
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
 for(const label of [...new Set([s.category,s.group].filter(Boolean))])tags.appendChild(el('span','selected-store-tag',label));
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
 // Cada atalho só é mostrado quando há informação verificável para esta loja.
 const hasHours=!db?.unavailable?.hours&&(db?.hours||[]).some(h=>h.store_id===s.id&&h.closed!==true&&h.opens_at&&h.closes_at);
 const hasDelivery=s.delivery===true;
 const hasProducts=(db?.products||[]).some(p=>p.store_id===s.id&&eligibleProduct(p));
 const hasPayment=Array.isArray(s.payment_methods)?s.payment_methods.some(v=>String(v||'').trim()):Boolean(String(s.payment_methods||'').trim());
 const hasContact=[s.whatsapp,s.phone].some(value=>Boolean(String(value||'').trim()));
 const availableActions=[
  [hasHours,'clock','Horário','Qual o horário?'],
  [hasDelivery,'truck','Entrega','Ela entrega?'],
  [hasProducts,'bag','Produtos','Quais produtos tem?'],
  [hasPayment,'card','Pagamento','Quais formas de pagamento aceita?'],
  [hasContact,'phone','Contato','Qual o contato?']
 ].filter(([available])=>available);
 for(const [available,iconKey,label,q] of availableActions){
  const b=el('button','selected-store-action');
  b.type='button';b.append(storeDetailIcon(iconKey),document.createTextNode(label));
  b.onclick=()=>{
   if(searchBusy){notice('Aguarde a resposta atual.');return}
   actions.querySelectorAll('.selected-store-action').forEach(button=>button.classList.remove('active'));
   b.classList.add('active');
   state.selectedStore=s;state.selectedProduct=null;
   renderContext();save();
   submitSelectedStoreAction(s,label,q);
  };
  if(!actions.childElementCount)b.classList.add('active');
  actions.appendChild(b);
 }
 if(availableActions.length)shell.appendChild(actions);
 else shell.appendChild(el('div','selected-store-no-actions','Informações complementares ainda não cadastradas.'));
 box.appendChild(shell);return box;
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
 for(const label of [...new Set([s.category,s.group].filter(Boolean))])tags.appendChild(el('span','store-chip',label));
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
 if(row.hoursUnknown)card.appendChild(el('div','guru-hours-unconfirmed','Horário neste dia não confirmado — consulte a loja'));
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
   audit.appendChild(el('span','guru-need-proof-muted','Sem catálogo de produtos disponível na GOOY.'));
  }
  card.appendChild(audit);
 }
 const score=el('div','guru-score-line','Qualidade do cadastro: '+Number(row.rankScore||0).toFixed(0)+'/100'+(row.searchMatch?' · Relevância: '+row.searchMatch.score+'/100':''));
 score.title='Qualidade cadastral e relevância da busca são diferentes da avaliação dos clientes';
 card.appendChild(score);
 const quality=storeDataQuality(s,db||{});
 if(quality.stale)card.appendChild(el('div','guru-data-alert','Informações da loja podem estar desatualizadas ('+quality.daysSinceUpdate+' dias).'));
 const actions=el('div','store-card-actions');
 const outingResult=!!lastOuting&&(state.lastResults||[]).some(x=>x.store?.id===s.id);
 const view=el('button','store-action primary',outingResult?'Ver local':'Ver loja');view.type='button';view.onclick=()=>chooseStore(row);actions.appendChild(view);
 if(!outingResult){
  const products=el('button','store-action','Produtos');products.type='button';products.onclick=()=>{state.selectedStore=s;state.selectedProduct=null;replyAboutStore('quais produtos tem?','products');renderContext();save()};actions.appendChild(products);
 }
 const phone=String(s.whatsapp||'').replace(/\D/g,'');
 if(phone.length>=10&&phone.length<=15){const a=el('a','store-action link','WhatsApp');a.href='https://wa.me/'+phone;a.target='_blank';a.rel='noopener noreferrer';actions.appendChild(a)}
 card.appendChild(actions);return card;
}
function renderNextQuestions(host,rows,offset=0){
 // Pesquisas de passeio ficam sem botões extras sob os cards; refinamento via chat.
 if(lastOuting)return;
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
 wrap.appendChild(el('p','guru-compare-intro','Informações disponíveis nos cadastros da GOOY.'));
 const available=value=>typeof value==='number'&&Number.isFinite(value);
 const metrics=[
  {label:'Pontuação GOOY',detail:'Relevância interna',format:x=>available(x.score)?Math.round(x.score)+' pontos':'Não informada',measure:x=>available(x.score)?x.score:null,better:'max',badge:'Maior pontuação'},
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
 wrap.appendChild(el('p','guru-compare-disclaimer','Destaques aparecem somente quando há dados comparáveis. Pontuação GOOY não é avaliação de clientes; preços de produtos diferentes não indicam a loja mais barata.'));
 section.appendChild(wrap);
}
function citySearchState(source=state){
 return {...source,location:{...(source.location||{}),city:userCity,uf:null,neighborhood:null}};
}
function displayResults(rows,offset=0){
 const m=add('',false);m.classList.add('hashtag-result-msg');
 const end=offset+rows.length,total=(state.lastResults||[]).length;
 const intro=regionalSearchInfo?(offset===0?'Encontrei opções em outras cidades da região de '+regionalSearchInfo.origin+':':'Mais opções em cidades próximas de '+regionalSearchInfo.origin+':'):(offset===0?'Encontrei estas opções em '+userCity+':':'Outras opções em '+userCity+':');
 if(!lastOuting)m.appendChild(el('div','hashtag-intro',intro));
 if(position){
  if(!lastOuting)m.appendChild(el('div','guru-city-distance-note','Distâncias aproximadas em linha reta. A classificação continua sendo por relevância, não por proximidade.'));
 }else if(!lastOuting){
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
 // A explicação textual fica sempre acima dos cards, dentro do mesmo resultado.
 if(!lastOuting&&offset===0 && rows.length){
  const summary=el('div','guru-result-summary',
   regionalSearchInfo?'Resultados de outras cidades, exibidos com sua autorização. Confira a cidade e o endereço de cada estabelecimento antes de ir.':(rows.length===1
    ? 'Encontrei '+rows[0].store.name+', que combina com o que você procura. A opção está logo abaixo.'
    : 'Encontrei '+rows.length+' opções para sua busca. Confira os estabelecimentos logo abaixo.'));
  m.appendChild(summary);
 }
 const grid=el('div','store-results-grid');rows.forEach((r,i)=>grid.appendChild(makeCard(r,offset+i)));m.appendChild(grid);
 renderNextQuestions(m,rows,offset);return m;
}
function showNextResultPage(){
 const all=state.lastResults||[];
 const offset=Math.min(Math.max(0,Number(state.resultOffset)||0),all.length);
 if(offset>=all.length){add(lastOuting?'Essas são todas as opções cadastradas que encontrei para este passeio.':'Não há mais opções nesta pesquisa. Você pode procurar outra categoria ou produto.');return false}
 const page=all.slice(offset,offset+RESULT_PAGE_SIZE);
 state.resultOffset=offset+page.length;
 save();const message=displayResults(page,offset);
 return message;
}
function renderNeedQuestion(need){
 const info=describeNeed(need);if(!info)return;
 const host=add('',false);host.classList.add('guru-need-message');
 const card=el('section','guru-need-card');
 card.appendChild(el('div','guru-need-eyebrow','GOOY · ASSISTENTE DE COMPRAS'));
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
 regionalSearchInfo=null;regionalConsentVersion++;
 const rows=contextualRank(findStoresForNeed(db,need,userCity,position,searchStores,emptyState,60),describeNeed(need)?.title||'',null);
 state=emptyState();
 state.location={city:userCity,uf:null,neighborhood:null};
 state.shoppingNeed={...need};
 state.query=describeNeed(need)?.title||'Busca por necessidade';
 state.lastResults=rows;
 state.resultOffset=0;
 lastSearchText=state.query;
 renderContext();save();
 if(!rows.length){
  add('Não encontrei lojas cadastradas que atendam a essa necessidade em '+userCity+'. Não vou afirmar disponibilidade sem confirmação.');
  askRegionalSearchPermission(state.query,state,city=>findStoresForNeed(db,need,city,position,searchStores,emptyState,25));
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
  if(db.unavailable.hours&&!(db.hours||[]).some(x=>x.store_id===s.id)){add('Não consegui consultar os horários dessa loja agora. Tente novamente.');return}
  const entries=(db.hours||[]).filter(x=>x.store_id===s.id&&Number(x.weekday)===day);
  const open=[...new Map(entries.filter(h=>!h.closed&&h.opens_at&&h.closes_at).map(h=>[String(h.opens_at).slice(0,5)+'-'+String(h.closes_at).slice(0,5),h])).values()];
  if(open.length){
   const ranges=open.map(h=>'das '+String(h.opens_at).slice(0,5)+' às '+String(h.closes_at).slice(0,5));
   const unique=[...new Set(ranges)];
   add(s.name+' funciona no '+dayNames[day]+' '+unique.join(' e ')+'.');
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
 if(ask==='delivery'){add(evidenceForField('delivery',s)+(s.delivery&&s.delivery_fee!=null?' Taxa informada: '+money(s.delivery_fee)+'.':''));return}
 if(ask==='payment'){add(evidenceForField('payment',s));return}
 if(ask==='address'){add(s.address||'Essa loja ainda não informou o endereço.');return}
 if(ask==='contact'){add(s.whatsapp?'WhatsApp: '+s.whatsapp:s.phone?'Telefone: '+s.phone:'Essa loja ainda não informou um contato.');return}
 if(ask==='rating'){if(db.unavailable.reviews){add('Não consegui consultar as avaliações dessa loja agora. Tente novamente.');return}const rv=ratingsMap(db.reviews).get(s.id);add(rv?'Média das avaliações cadastradas na GOOY: '+(rv.sum/rv.count).toFixed(1)+'/5 em '+rv.count+' avaliação(ões).':'Essa loja ainda não possui avaliações cadastradas.');return}
 const ps=productListFor(s,text);
 if(!ps.length){add('Não encontrei produto ativo e disponível em estoque que corresponda a essa pergunta.');return}
 if(ps.length===1)state.selectedProduct=ps[0];
 add('No catálogo cadastrado de '+s.name+', encontrei:\n'+ps.slice(0,8).map(p=>'• '+p.name+' — '+money(priceOf(p))+' · estoque informado: '+p.stock).join('\n')+'\nConfirme os valores e a disponibilidade com a loja antes de comprar.');save();
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
// Busca de recuperação para categorias específicas sem resultados exatos.
// Não inventa produtos/estoque e mantém cidade e filtros solicitados.
function relatedPaintStoreFallback(data,draft,query){
 if(norm(draft.group)!=='tintas' || !/\b(?:tinta|tintas)\b/.test(norm(query)))return null;
 if(draft.productTerm || draft.specialtyTerm || (draft.nameTerms||[]).length)return null;
 const broad={
  ...draft,
  category:null,
  group:null,
  nameTerms:[],
  semanticTerms:[],
  featureTerms:[],
  // Os filtros explícitos (entrega, aberto, pagamentos e localização) continuam.
 };
 const found=searchStores(data,broad,position,{limit:120});
 const relevant=found.filter(({store})=>{
  const n=norm([store.name,store.group,(store.groups||[]).join(' '),(store.specialties||[]).join(' '),store.description].join(' '));
  const hasPaintSignal=/\b(?:tinta|tintas|pintura|pinturas|colorimetria|tintometrica)\b/.test(n);
  const productSignal=(data.products||[]).some(p=>p.store_id===store.id&&eligibleProduct(p)&&/\b(?:tinta|tintas|pintura|pinturas)\b/.test(norm([p.name,p.description,p.category].join(' '))));
  const constructionStore=norm(store.category)==='construcao'&&/\b(?:material|materiais|construcao|ferragens|acabamento|acabamentos)\b/.test(n);
  return hasPaintSignal||productSignal||constructionStore;
 });
 if(!relevant.length)return null;
 const explicit=relevant.filter(({store})=>{
  const n=norm([store.name,store.group,(store.groups||[]).join(' '),(store.specialties||[]).join(' '),store.description].join(' '));
  return /\b(?:tinta|tintas|pintura|pinturas|tintometrica)\b/.test(n)||
   (data.products||[]).some(p=>p.store_id===store.id&&eligibleProduct(p)&&/\b(?:tinta|tintas|pintura|pinturas)\b/.test(norm([p.name,p.description,p.category].join(' '))));
 });
 return {rows:(explicit.length?explicit:relevant).slice(0,60),specific:explicit.length>0};
}


function showOutingExtras(places,events){
 const group=(title,list,render)=>{
  if(!list.length)return;
  const msg=add('',false);msg.classList.add('gooy-outing-list');msg.appendChild(el('h3','gooy-outing-heading',title));
  list.forEach(item=>{const card=el('article','gooy-outing-place');card.appendChild(el('strong','',item.name));render(card,item);msg.appendChild(card)});
 };
 group('Lugares para conhecer',places,(card,p)=>{
  card.appendChild(el('p','gooy-outing-detail',[p.category,p.address].filter(Boolean).join(' · ')));
  if(p.hours)card.appendChild(el('p','gooy-outing-detail','Horário informado: '+p.hours+' (confirme)'));
  const a=el('a','gooy-outing-link','Ver no mapa');
  a.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name+', '+p.address+', '+p.city);
  a.target='_blank';a.rel='noopener noreferrer';card.appendChild(a);
 });
 group('Eventos cadastrados',events,(card,e)=>{
  card.appendChild(el('p','gooy-outing-detail',new Date(e.starts_at).toLocaleString('pt-BR',{dateStyle:'medium',timeStyle:'short'})+' · '+e.address));
  card.appendChild(el('p','gooy-outing-detail',e.free_entry===true?'Entrada gratuita informada':e.price_brl!=null?'Valor informado: '+money(e.price_brl):'Valor não informado'));
  if(e.official_url)try{const u=new URL(e.official_url);if(['https:','http:'].includes(u.protocol)){const a=el('a','gooy-outing-link','Página do evento');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';card.appendChild(a)}}catch{}
 });
}
function outingDayIndex(outing){
 const today=new Date().getDay();
 if(outing.date==='hoje')return today;
 if(outing.date==='amanha')return (today+1)%7;
 if(outing.date==='sabado')return 6;
 if(outing.date==='domingo')return 0;
 return null;
}
function verifiedOutingHours(store,outing){
 const day=outingDayIndex(outing);
 if(day==null)return {label:'',known:false,closed:false};
 const entries=(db?.hours||[]).filter(h=>h.store_id===store.id&&Number(h.weekday)===day);
 if(!entries.length)return {label:'',known:false,closed:false};
 const active=entries.filter(h=>h.closed!==true&&h.opens_at&&h.closes_at);
 if(!active.length)return {label:'',known:entries.every(h=>h.closed===true),closed:entries.every(h=>h.closed===true)};
 const ranges=active.map(h=>String(h.opens_at).slice(0,5)+'–'+String(h.closes_at).slice(0,5));
 return {label:ranges.join(', '),known:true,closed:false};
}
function renderDiscoveryItinerary(stops,outing,updated=false){
 if(!stops.length){add('O roteiro ficou sem paradas. Faça uma nova busca para encontrar outros lugares.');lastDiscovery=null;return null}
 const message=add('',false);message.classList.add('gooy-discoveries');
 message.appendChild(el('h3','gooy-discoveries-title',updated?'GOOY Descobertas · roteiro atualizado':'GOOY Descobertas · roteiro sugerido'));
 message.appendChild(el('p','gooy-discoveries-subtitle',stops.length+' '+(stops.length===1?'parada':'paradas')+' para o passeio. Você pode adicionar, remover ou escolher um estabelecimento específico para uma parada.'));
 const steps=el('ol','gooy-discoveries-steps');
 let unknownHours=false;
 for(const row of stops){
  const item=el('li','gooy-discoveries-stop');
  item.appendChild(el('strong','',row.store.name));
  item.appendChild(el('span','',[row.store.address].filter(Boolean).join('')));
  const hours=verifiedOutingHours(row.store,outing);
  if(row.manualOnly)item.appendChild(el('small','gooy-discoveries-hours','Local incluído a seu pedido; características de passeio não confirmadas.'));
  if(hours.known&&hours.label)item.appendChild(el('small','gooy-discoveries-hours','Horário cadastrado: '+hours.label));
  else if(!hours.known)unknownHours=true;
  steps.appendChild(item);
 }
 message.appendChild(steps);
 const validCoordinates=stops.every(r=>r.store.latitude!=null&&r.store.longitude!=null&&Number.isFinite(Number(r.store.latitude))&&Number.isFinite(Number(r.store.longitude)));
 if(validCoordinates&&stops.length>1){
  const kms=stops.slice(1).map((r,i)=>outingStraightKm(stops[i].store,r.store));
  if(kms.every(Number.isFinite)){
   const total=kms.reduce((a,b)=>a+b,0);
   message.appendChild(el('p','gooy-discoveries-subtitle','Distância aproximada em linha reta entre as paradas: '+total.toFixed(1).replace('.',',')+' km. Não representa o trajeto por ruas.'));
  }
 }
 if(stops.length>1){
  const locations=stops.map(r=>[r.store.name,r.store.address].filter(Boolean).join(', '));
  const params=new URLSearchParams({api:'1',origin:locations[0],destination:locations[locations.length-1],travelmode:'driving'});
  if(locations.length>2)params.set('waypoints',locations.slice(1,-1).join('|'));
  const a=el('a','gooy-discoveries-map','Abrir roteiro no mapa');
  a.href='https://www.google.com/maps/dir/?'+params.toString();
  a.target='_blank';a.rel='noopener noreferrer';message.appendChild(a);
 }
 message.appendChild(el('p','gooy-discoveries-note',unknownHours?'Alguns locais não têm horários confirmados para o dia pedido. Confirme antes de sair.':'Verifique horários, deslocamento e disponibilidade antes de sair.'));
 return message;
}
function showDiscoveryItinerary(rows,outing){
 const stops=buildOutingItinerary(rows,outing);
 if(stops.length<2){lastDiscovery=null;return}
 // Lugares explicitamente citados pelo nome podem ser acrescentados mesmo
 // sem troféus, desde que sejam estabelecimentos ativos da cidade escolhida.
 const ids=new Set(rows.map(r=>String(r.store?.id)));
 const additional=(db?.stores||[]).filter(store=>
  store.id&&store.name&&store.address&&store.active!==false&&
  norm(getCityFromAddress(store.address))===norm(userCity)&&
  !ids.has(String(store.id))
 ).map(store=>({store,outingScore:0,manualOnly:true}));
 lastDiscovery={stops,pool:[...rows,...additional],outing};
 renderDiscoveryItinerary(stops,outing);
}
function refineDiscovery(text){
 if(!lastDiscovery||!lastOuting)return false;
 const edit=editOutingStops(text,lastDiscovery.stops,lastDiscovery.pool);
 if(!edit)return false;
 if(edit.kind==='clarify'){add('Qual parada você quer remover? Por exemplo: “remova a segunda parada” ou “tire a pizzaria”.');return true}
 if(edit.kind==='unavailable_replace'){add('Não localizei esse estabelecimento nos cadastros da cidade selecionada. Informe o nome completo ou peça para adicionar outro lugar.');return true}
 if(edit.kind==='unavailable_add'){add('Não encontrei outra parada cadastrada que combine com esse pedido. Mantive o roteiro atual.');return true}
 if(edit.kind==='limit'){add('Este roteiro já tem oito paradas. Remova alguma para adicionar outra.');return true}
 if(edit.kind==='choose_action'){add('Você pode adicionar uma parada nova ou remover uma das existentes. Por exemplo: “adicione uma cafeteria” ou “remova a segunda parada”.');return true}
 if(edit.kind==='empty'){add('Não há paradas para alterar. Faça outra busca de passeio.');return true}
 if(edit.kind==='reorder'&&edit.needsCoordinates){add('Alguns locais não têm coordenadas cadastradas para comparar a proximidade. Mantive a ordem sugerida e você pode conferir o trajeto no mapa.');return true}
 const old=document.querySelectorAll('.gooy-discoveries');
 old.forEach(node=>node.remove());
 lastDiscovery.stops=edit.stops;
 if(edit.kind==='remove')add('Retirei a parada solicitada e mantive as demais.');
 else if(edit.kind==='add')add('Adicionei '+edit.added.store.name+' ao seu roteiro, mantendo as demais paradas.');
 else if(edit.kind==='replace'||edit.kind==='replace_legacy')add('Removi a parada anterior e incluí '+edit.added.store.name+' no roteiro, conforme seu pedido.');
 else add('Reorganizei as paradas usando as coordenadas cadastradas. Confira o trajeto no mapa.');
 renderDiscoveryItinerary(lastDiscovery.stops,lastDiscovery.outing,true);
 return true;
}
async function searchOuting(outing){
 lastDiscovery=null;
 if(!userCity){askForCity(outing.original);return}
 await loadData();
 if(db.unavailable?.trophies){add('Não consegui consultar os Troféus GOOY agora. Tente novamente; não vou sugerir passeios sem confirmar as características cadastradas.');return}
 regionalSearchInfo=null;regionalConsentVersion++;
 const draft=emptyState();draft.location={city:userCity,uf:null,neighborhood:null};draft.query='lugares';
 let rows=outing.eventsOnly?[]:outingRankRows(searchStores(db,draft,position,{limit:db.stores.length}),outing,db.trophies||[]);
 // Ao pedir dia específico, locais explicitamente fechados não são apresentados como disponíveis.
 const askedDay=outingDayIndex(outing);
 if(askedDay!=null)rows=rows.filter(r=>!verifiedOutingHours(r.store,outing).closed);
 const places=[]; // Lugares sem troféu de estabelecimento não entram como sugestão de rolê.
 const events=outingUpcomingEvents(db.events||[],outing,userCity);
 state=draft;state.lastResults=rows;state.resultOffset=0;lastOuting=outing;lastSearchText=outing.original;renderContext();save();
 const label=outing.pet
  ?(outing.companion==='casal'?'um rolê a dois com seu pet':outing.companion==='familia'?'um passeio em família com seu pet':'um passeio com seu pet')
  :({casal:'um rolê a dois',amigos:'um rolê com amigos',familia:'um passeio em família',geral:'seu próximo passeio'}[outing.companion]||'seu próximo passeio');
 const count=rows.length+places.length+events.length;
 const intro=add(count
  ?'Encontrei '+(outing.eventsOnly?(count===1?'um evento':'eventos'):(count===1?'um lugar':'lugares'))+' para '+label+' em '+userCity+'. Confira as opções e confirme horários e demais detalhes antes de ir.'
  :'Busquei lugares para '+label+' em '+userCity+', mas ainda não encontrei opções compatíveis nos cadastros.');
 if(outing.budget==='economico')add('Não há preços de passeio confirmados para classificar quais locais são mais baratos.');
 if(!rows.length&&!places.length&&!events.length){
  add(outing.eventsOnly?'Não há eventos futuros ativos cadastrados nesta cidade.':outing.budget==='gratis'?'Não encontrei passeios explicitamente cadastrados como gratuitos.':'Ainda não há lugares com as características cadastradas para esse tipo de passeio nesta cidade.');
  if(!outing.eventsOnly)askRegionalSearchPermission(outing.original,draft,city=>outingRankRows(searchStores(db,{...draft,location:{city,uf:null,neighborhood:null}},position,{limit:db.stores.length}),outing,db.trophies||[]));
 }else{
  showOutingExtras(places,events);
  if(rows.length){showNextResultPage();showDiscoveryItinerary(rows,outing)}
 }

}

async function run(text){
 if(refineDiscovery(text))return;
 if(isMoreResultsRequest(text)){
  if(!(state.lastResults||[]).length){add('Ainda não tenho resultados para continuar. Faça uma pesquisa primeiro.');return}
  showNextResultPage();return;
 }
 const routed=routeConversation(text);
 if(routed.kind==='social'){add(routed.answer);return}
 text=routed.query;
 const outing=detectOuting(text,lastOuting);
 if(outing){await searchOuting(outing);return}
 lastOuting=null;lastDiscovery=null;
 // Pergunta curta sobre horário nunca deve iniciar uma busca de estabelecimentos.
 // Sem loja selecionada, solicitar escolha explícita para evitar horários de terceiros.
 if(/^(?:qual(?: e| eh)? o horario\??|que horas (?:abre|fecha)\??|horario\??)$/i.test(norm(text).trim())){
  if(!state.selectedStore){add('Selecione uma loja pelo botão “Ver loja” para consultar o horário dela.');return}
  await loadData();
  replyAboutStore(text,'hours',{});renderContext();save();return;
 }
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
 // Consulta direta sobre o horário da loja selecionada deve produzir UMA resposta,
 // sem acionar comparações, pesquisa geral ou outra loja do histórico.
 if(state.selectedStore && /\b(?:horario|horarios|que horas|abre|fecha|funciona|funcionamento)\b/.test(norm(text))
    && !/\b(?:quais|lojas|estabelecimentos|mercados|farmacias|padarias|academias|outras|outros|compare|comparar)\b/.test(norm(text))){
  const parsed=interpret(text,taxonomy,aliases,state,{products:db?.products||[]});
  replyAboutStore(text,'hours',parsed.filters||{});renderContext();save();return;
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
   const reason=follow.attribute==='price'?'preços dos produtos':follow.attribute==='distance'?'distâncias calculadas':follow.attribute==='rating'?'avaliações cadastradas':follow.attribute==='delivery'?'opções com entrega':follow.attribute==='noDelivery'?'opções sem entrega':'produtos em estoque';
   add('Ainda não tenho '+reason+' suficientes nessas opções. Posso fazer uma nova busca se você quiser.');return;
  }
  // O conjunto exibido mudou: uma referência pronominal não deve apontar para uma
  // loja selecionada antes do refinamento. A próxima escolha deve ser explícita.
  state.selectedStore=null;state.selectedProduct=null;
  state.lastResults=matching;state.resultOffset=0;renderContext();save();
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
 // Rótulos amplos, como "comida", não são uma especialidade obrigatória.
 const broadCategoryNames=new Set(['comida','roupas','roupa','mercado','farmacia','beleza','tecnologia','servicos','automoveis','construcao','varejo','pet shop','agropecuaria']);
 const newSpecialty=!!specialtyMention&&!broadCategoryNames.has(norm(specialtyMention))&&isNewSpecialtyRequest(text,specialtyMention);
 // Consulta direta de categoria/grupo não pode virar pergunta sobre a loja
 // anterior nem herdar filtros antigos.
 const rawPlan=interpret(text,taxonomy,aliases,{...state,selectedStore:null},{products:db?.products||[]});
 const bareTaxonomy=isBareCategoryOrGroupQuery(text,rawPlan);
 const intentState=newSpecialty||bareTaxonomy||refinement?{...state,selectedStore:null}:state;
 const plan=bareTaxonomy?rawPlan:interpret(refinement?.query||text,taxonomy,aliases,intentState,{products:db?.products||[]});
 if(plan.kind==='search'&&!state.selectedStore&&!(state.lastResults||[]).length){
  const question=clarifyShoppingQuery(text,db);
  if(question){
   const message=add(question.question),choices=el('div','guru-next-buttons');
   for(const suggestion of question.options){
    const b=el('button','guru-next-button',suggestion);
    b.type='button';b.onclick=()=>submitText(suggestion);choices.appendChild(b);
   }
   message.appendChild(choices);return;
  }
 }
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
 // O agrupador antigo "Comida" não deve ser reaplicado como grupo/especialidade.
 if(plan.taxon?.group&&broadCategoryNames.has(norm(plan.taxon.group))&&norm(plan.taxon.term)===norm(plan.taxon.group)){
  draft.category=plan.taxon.group;draft.group=null;draft.specialtyTerm=null;
 }
 if(draft.specialtyTerm&&broadCategoryNames.has(norm(draft.specialtyTerm)))draft.specialtyTerm=null;
 if(draft.group&&broadCategoryNames.has(norm(draft.group))&&norm(draft.group)===norm(draft.category))draft.group=null;
 draft.location={...(draft.location||{}),city:userCity,uf:null,neighborhood:null};
 if(db.unavailable.hours&&(draft.filters.openNow||draft.filters.day!=null||(Array.isArray(draft.filters.days)&&draft.filters.days.length)||(Array.isArray(draft.filters.daysAll)&&draft.filters.daysAll.length)||draft.filters.start!=null||draft.filters.end!=null)){add('Não consegui consultar os horários agora, então não vou afirmar que alguma loja está aberta. Tente novamente.');return}
 if(db.unavailable.reviews&&(draft.filters.minRating!=null||draft.filters.sort==='rating')){add('Não consegui consultar as avaliações agora. Tente novamente antes de aplicar esse filtro.');return}
 regionalSearchInfo=null;
 regionalConsentVersion++;
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
  for(const alt of [...guidedSearchAlternatives(text,db,taxonomy,aliases),...catalogAwareAlternatives(text,db,taxonomy,aliases),...sharedAlternatives(text,db.sharedAliases,db),...semanticNeedAlternatives(text,db),...semanticAlternatives(text,db)]){
   const alternatePlan=interpret(alt.query,taxonomy,aliases,state,{products:db?.products||[]});
   if(alternatePlan.kind!=='search')continue;
   const alternateState=preserveMandatoryFilters(draft,nextState(state,alternatePlan));
   if(draft.specialtyTerm)alternateState.specialtyTerm=draft.specialtyTerm;
   alternateState.location={...(alternateState.location||{}),city:userCity,uf:null,neighborhood:null};
   const found=searchStores(db,alternateState,position,{limit:60});
   if(found.length){rows=found;finalState=alternateState;recovery=alt;break}
  }
 }
 // Se "Tintas" não tiver lojas diretas, tentar estabelecimentos realmente relacionados
 // antes de encerrar a conversa. O grupo original não é anunciado como correspondência.
 let paintFallback=null;
 if(!rows.length){
  paintFallback=relatedPaintStoreFallback(db,draft,text);
  if(paintFallback){
   rows=paintFallback.rows;
   finalState={...draft,category:null,group:null,nameTerms:[],semanticTerms:[],featureTerms:[]};
   recovery=null;
  }
 }
 // A falta de horários cadastrados não deve ser apresentada como "nenhum comércio existe".
 // Busca de alternativas é separada e sempre informa que o dia NÃO está confirmado.
 let unconfirmedDayResults=false;
 const fDay=draft.filters||{};
 const dayRequested=fDay.day!=null||(Array.isArray(fDay.days)&&fDay.days.length>0)||(Array.isArray(fDay.daysAll)&&fDay.daysAll.length>0)||fDay.start!=null||fDay.end!=null;
 if(!rows.length&&dayRequested&&!fDay.openNow){
  const candidates=searchStores(db,draft,position,{limit:60,includeUnknownHours:true});
  if(candidates.length){rows=candidates;finalState=draft;recovery=null;unconfirmedDayResults=true}
 }
 state=finalState;
 renderContext();save();
 rows=contextualRank(rankV9(rerankSearchResults(rows,text,db,state.filters?.sort),text,state.filters?.sort),text,state.filters?.sort).slice(0,60);
 lastSearchText=text;
 state.lastResults=rows;state.resultOffset=0;
 if(unconfirmedDayResults){
  const dayText=fDay.day!=null?dayNames[fDay.day]:Array.isArray(fDay.days)&&fDay.days.length||Array.isArray(fDay.daysAll)&&fDay.daysAll.length?'nos dias selecionados':'no horário solicitado';
  add('Ainda não tenho horário de funcionamento confirmado para '+dayText+' nesses estabelecimentos. Veja algumas opções relacionadas em '+userCity+', mas confirme diretamente com cada loja antes de ir.');
 }
 recordSearch(text,plan,rows,'search',rows.length?'':diagnosisForNoResults(text,db,plan).reason);
 if(!rows.length){
  if(diagnosisForNoResults(text,db,plan).reason==='catalogo_sem_produtos'){
   add('O catálogo ainda não tem produtos cadastrados. Posso buscar lojas relacionadas, mas não consigo confirmar preços e estoque dos itens.');
  }
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
  askRegionalSearchPermission(text,draft);
  save();return;
 }
 if(paintFallback){
  add(paintFallback.specific
   ? 'Não encontrei lojas classificadas especificamente como Tintas nesta busca. Encontrei estabelecimentos com referências a tintas ou pintura no cadastro. Confirme disponibilidade, preços e estoque diretamente com cada loja.'
   : 'Não encontrei lojas classificadas como Tintas nesta busca. Estas lojas de materiais de construção são alternativas relacionadas, mas não há confirmação de que vendam tintas. Consulte cada loja antes de ir.');
 }
 if(recovery){
  const hint=recovery.mode==='correction'?'Identifiquei uma possível correção de escrita.':recovery.mode==='concept'||recovery.mode==='semantic-need'?'Entendi a necessidade descrita e procurei uma categoria cadastrada.':'Encontrei uma expressão relacionada no catálogo.';
  add(hint+' Pesquisei por “'+recovery.query+'”.');
 }
 // Resultados locais devem aparecer sem aguardar serviço externo de IA.
 const resultMessage=showNextResultPage();
 hybridResponse(text,rows.slice(0,RESULT_PAGE_SIZE)).then(natural=>{
  if(!natural || !resultMessage || typeof resultMessage.querySelector!=='function')return;
  // Atualiza somente o resumo deste resultado; não cria mensagem abaixo dos cards.
  const summary=resultMessage.querySelector('.guru-result-summary');
  if(summary)summary.textContent=natural;
 }).catch(()=>{});
 save();
}
// Atalhos do card usam a loja selecionada, sem passar por interpretação de busca.
async function submitSelectedStoreAction(store,label,question){
 if(!store||searchBusy)return;
 const actionByLabel={ 'Horário':'hours','Entrega':'delivery','Produtos':'products','Pagamento':'payment','Contato':'contact' };
 const ask=actionByLabel[label];if(!ask)return;
 searchBusy=true;input.disabled=true;
 add(question,true);
 const typing=showTypingIndicator();
 replyBuffer=document.createDocumentFragment();
 try{
  await loadData();
  const current=(db?.stores||[]).find(s=>s.id===store.id&&s.active===true&&s.status==='active');
  if(!current){add('Este estabelecimento não está disponível no cadastro atual.');return}
  state.selectedStore=current;
  state.selectedProduct=null;
  if(ask==='products'){
   const products=(db?.products||[]).filter(p=>p.store_id===current.id&&eligibleProduct(p));
   if(!products.length)add('Esta loja não possui produtos ativos e disponíveis cadastrados.');
   else add('Produtos cadastrados de '+current.name+':\n'+products.slice(0,8).map(p=>'• '+p.name+' — '+money(priceOf(p))+' · estoque informado: '+p.stock).join('\n')+'\nConfirme preços e estoque com a loja.');
  }else{
   replyAboutStore(question,ask,{});
  }
  renderContext();save();
 }catch(err){msgError(err)}finally{
  const fragment=replyBuffer;replyBuffer=null;typing.remove();
  try{await showAssistantReply(fragment)}finally{input.disabled=false;searchBusy=false}
 }
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
 try{await Promise.race([run(t),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo limite da pesquisa')),15000))])}catch(err){console.error('[GOOY] Falha na pesquisa',err);try{msgError(err)}catch{add('Não foi possível concluir esta pesquisa. Tente novamente em instantes.')}}finally{
  const remaining=Math.max(0,minTypingMs-(performance.now()-start));
  if(remaining)await new Promise(resolve=>setTimeout(resolve,remaining));
  const completed=replyBuffer;
  replyBuffer=null;
  typing.remove();
  try{await showAssistantReply(completed)}catch(err){console.error('[GOOY] Falha ao mostrar resposta',err);add('Não consegui exibir o resultado. Tente outra pesquisa.');}
  finally{
   input.disabled=false;input.focus();searchBusy=false;
  }
 }
}
function resetConversation(){
 lastOuting=null;lastDiscovery=null;
 regionalSearchInfo=null;regionalConsentVersion++;
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
  ['O que você quer encontrar?','Encontre lojas, produtos e serviços conversando com a GOOY.'],
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
  console.warn('[GOOY v4] Carregamento inicial não concluído:',err);
  add('Não consegui carregar o catálogo agora. Você ainda pode escrever sua pergunta e tentar novamente.');
 });
 window.GuruEngineV4={interpret:q=>interpret(q,taxonomy,aliases,state,{products:db?.products||[]}),submitText,reset:resetConversation,refresh:()=>loadData(true),getState:()=>state,learningStats};
}else console.error('[GOOY v4] Formulário ausente.');
