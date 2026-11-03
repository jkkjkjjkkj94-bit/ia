const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');

const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

const wordCorrections=new Map(Object.entries({
  pizaria:'pizzaria',pizzarria:'pizzaria',pizeria:'pizzaria',pizzariaa:'pizzaria',
  japoneza:'japonesa',japonezaa:'japonesa',japoneis:'japones',japonez:'japones',
  hambuguer:'hamburguer',hambuger:'hamburguer',hamburgueriaa:'hamburgueria',
  farmaciaa:'farmacia',farmacia:'farmacia',
  sorveteriaa:'sorveteria',doceriaa:'doceria',
  comerçio:'comercio',comercío:'comercio',comecio:'comercio',
  estabelicimento:'estabelecimento',estabelecimeto:'estabelecimento',
  restarante:'restaurante',restaurente:'restaurante',
  entregaa:'entrega',delivary:'delivery'
}));

const businessAliases=new Map([
  ['comercio','loja'],['comercios','lojas'],['negocio','loja'],['negocios','lojas'],
  ['empresa','loja'],['empresas','lojas'],['ponto','loja'],['pontos','lojas'],
  ['estabelecimento','loja'],['estabelecimentos','lojas'],['local','loja'],['locais','lojas'],
  ['lugar','loja'],['lugares','lojas']
]);

function correctTypos(text){
  return String(text||'').split(/(\s+)/).map(part=>{
    if(/^\s+$/.test(part))return part;
    const clean=norm(part);
    return wordCorrections.get(clean)||part;
  }).join('');
}

function normalizeBusinessTerms(text){
  let out=correctTypos(text);
  const normalized=norm(out).split(' ');
  const words=out.split(/\s+/);
  for(let i=0;i<normalized.length;i++)if(businessAliases.has(normalized[i]))words[i]=businessAliases.get(normalized[i]);
  return words.join(' ');
}

function normalizeNegations(text){
  let s=String(text||'');
  s=s.replace(/\b(menos|exceto|tirando)\s+(pizza|pizzaria)\b/gi,'sem pizzaria');
  s=s.replace(/\b(menos|exceto|tirando)\s+(hamburguer|hamburgueria|lanche)\b/gi,'sem hamburgueria');
  s=s.replace(/\b(menos|exceto|tirando)\s+(japonesa|japones|sushi)\b/gi,'sem japonesa');
  s=s.replace(/\b(menos|exceto|tirando)\s+(doceria|doces?)\b/gi,'sem doceria');
  s=s.replace(/\bmas\s+nao\s+(pizza|pizzaria)\b/gi,'sem pizzaria');
  s=s.replace(/\bmas\s+nao\s+(hamburguer|hamburgueria|lanche)\b/gi,'sem hamburgueria');
  s=s.replace(/\bmas\s+nao\s+(japonesa|japones|sushi)\b/gi,'sem japonesa');
  return s;
}

function normalizeNaturalLanguage(text){
  let s=normalizeNegations(normalizeBusinessTerms(text));
  s=s.replace(/\bestou com vontade de\s+/gi,'quero ')
     .replace(/\bto com vontade de\s+/gi,'quero ')
     .replace(/\bonde posso comer\s+/gi,'quero ')
     .replace(/\bonde tem\s+/gi,'quero loja de ')
     .replace(/\btem alguma coisa boa para comer\b/gi,'quero comida')
     .replace(/\bquero almocar\b/gi,'quero comida')
     .replace(/\bquero almoçar\b/gi,'quero comida');
  return s;
}

const semanticRules=[
  {re:/\b(loja|restaurante)?\s*(de )?comida japonesa\b|\bcomida japonesa\b|\b(japonesa|japones|oriental)\b/,canonical:'japonesa'},
  {re:/\b(loja|restaurante) de sushi\b|\bonde posso comer sushi\b/,canonical:'japonesa'},
  {re:/\b(algo|coisa) doce\b|\bcomer (um |uma )?doce\b|\bvontade de doce\b|\bquero comer.*doce\b|\bloja de doce(s)?\b/,canonical:'doceria'},
  {re:/\b(loja|restaurante) de pizza(s)?\b|\bvontade de pizza\b/,canonical:'pizzaria'},
  {re:/\b(loja|restaurante) de hamburguer(es)?\b|\bvontade de (hamburguer|lanche)\b/,canonical:'hamburgueria'},
  {re:/\b(loja|restaurante) de sorvete(s)?\b|\balgo gelado\b/,canonical:'sorveteria'},
  {re:/\b(loja|restaurante) de acai\b|\bvontade de acai\b/,canonical:'acai'},
  {re:/\bcomida caseira\b|\bprato feito\b|\bcomida pronta\b|\balmoco rapido\b/,canonical:'marmita'}
];

const genericCategoryRules=[
  {re:/\bcomida\b/,category:'Comida'},
  {re:/\broupas?\b/,category:'Roupas'},
  {re:/\btecnologia\b/,category:'Tecnologia'},
  {re:/\bfarmacia\b/,category:'Farmácia'},
  {re:/\bmercado\b/,category:'Mercado'},
  {re:/\bbeleza\b/,category:'Beleza'}
];

const falseProducts=new Set([
  'comer','comendo','comida','tomar','bebendo','procurar','procurando','achar','encontrar','comprar','querer','quero','queria',
  'loja','lojas','comercio','comercios','negocio','negocios','empresa','empresas','ponto','pontos','lugar','lugares','local','locais',
  'estabelecimento','estabelecimentos','aberto','aberta','abertos','abertas','venda','vende','vendem','vender','produto','produtos',
  'opcao','opcoes','opção','opções','restaurante','restaurantes'
]);

const groupOnlyTerms=new Set(['pizza','pizzaria','japonesa','japones','oriental','hamburgueria','hamburguer','lanche','doceria','doce','sorveteria','sorvete','acai','marmita','padaria','pastelaria','churrascaria']);
const weekDays={domingo:0,segunda:1,'segunda feira':1,terca:2,'terca feira':2,quarta:3,'quarta feira':3,quinta:4,'quinta feira':4,sexta:5,'sexta feira':5,sabado:6};

function userMsg(text){if(!msgs)return;const d=document.createElement('div');d.className='msg user';d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}

function cleanFalseProduct(state,force=false){
  if(!state)return;
  const p=norm(state.product),t=norm(state.term);
  const falseValue=force||falseProducts.has(p)||falseProducts.has(t)||groupOnlyTerms.has(p)||groupOnlyTerms.has(t)||(/^com(er|ida|endo)?$/.test(p))||(/^com(er|ida|endo)?$/.test(t));
  if(falseValue){state.product=null;state.term=null;state.specialty=null;state.selectedProduct=null}
}

function applyGenericFilters(original,state){
  const n=norm(original);let foundDay=null;
  if(/\bhoje\b/.test(n))foundDay=new Date().getDay();
  else if(/\bamanha\b/.test(n))foundDay=(new Date().getDay()+1)%7;
  else for(const[name,num]of Object.entries(weekDays)){const re=new RegExp(`(?:^|\\s)${name.replace(/ /g,'\\s+')}(?:\\s|$)`);if(re.test(n)){foundDay=num;break}}
  if(foundDay!==null){state.day=foundDay;state.openNow=false}
  if(/abert[oa]s? agora|aberto agora|aberta agora/.test(n)){state.openNow=true;state.day=null}
  if(/com entrega|delivery|entrega hoje|entrega rapida/.test(n))state.delivery=true;
  else if(/sem entrega|nao quero entrega/.test(n))state.delivery=false;
  if(/mais perto|perto de mim/.test(n))state.sortBy='distancia';
  if(/mais barato|mais barata|barato|barata/.test(n))state.sortBy='preco';
  if(/melhor avaliad|bem avaliad/.test(n))state.sortBy='avaliacao';
  if(/aberto ate tarde|aberta ate tarde|ate tarde/.test(n)){state.timePeriod='late_open';state.timeStart=1260;state.timeEnd=null}
}

function applyCharacteristicFilters(original,state){
  const n=norm(original);
  const traits=[];
  if(/vegetarian|vegano|vegana/.test(n))traits.push('vegetariano');
  if(/familia|familiar|para criancas|para crianca/.test(n))traits.push('familia');
  if(/tranquilo|calmo|sossegado/.test(n))traits.push('tranquilo');
  if(/entrega rapida|rapido para entregar|delivery rapido/.test(n)){state.delivery=true;state.sortBy=state.sortBy||'distancia'}
  if(/barato|barata|economico|economica|em conta/.test(n))state.sortBy='preco';
  if(traits.length){state.specialty=traits.join(' ');state.term=traits.join(' ');state.product=null}
}

function applyExclusions(original,state){
  const n=norm(original);
  const exclusions=[
    [/sem pizzaria|nao quero pizza|menos pizza|exceto pizza/,'Pizzaria'],
    [/sem hamburgueria|nao quero hamburguer|menos hamburguer/,'Hamburgueria'],
    [/sem japonesa|nao quero japonesa|menos japonesa|sem sushi/,'Japonesa'],
    [/sem doceria|nao quero doces|menos doces/,'Doceria'],
    [/sem sorvete|sem sorveteria/,'Sorveteria']
  ];
  for(const[re,g]of exclusions)if(re.test(n))state.excludedGroups?.add?.(norm(g));
}

function renderGenericContext(state){
  if(!ctx)return;const parts=[];
  if(state.location?.city)parts.push('Cidade: '+state.location.city);
  if(state.location?.uf)parts.push('Estado: '+state.location.uf);
  if(state.category)parts.push('Categoria: '+state.category);
  if(state.group)parts.push('Grupo: '+state.group);
  if(state.day!==null&&state.day!==undefined){const days=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];parts.push('Dia: '+days[state.day])}
  if(state.openNow)parts.push('abertas agora');
  if(state.delivery===true)parts.push('com entrega');
  if(state.delivery===false)parts.push('sem entrega');
  if(state.specialty)parts.push('Características: '+state.specialty);
  ctx.textContent=parts.length?'Contexto: '+parts.join(' · '):'';
}

function hideProductFromContext(){
  if(!ctx)return;const txt=ctx.textContent||'';if(!txt.includes('Produto:'))return;
  ctx.textContent=txt.replace(/\s*·\s*Produto:\s*[^·]+(?=\s*·|$)/g,'').replace(/Contexto:\s*Produto:\s*[^·]+\s*·?\s*/g,'Contexto: ').replace(/\s*·\s*$/,'').replace(/Contexto:\s*$/,'');
}

async function runCanonical(original,canonical,{category=null,clearGroup=false,genericCategory=false}={}){
  const engine=window.LocalAIEngine;if(!engine)return;const state=engine.state;
  cleanFalseProduct(state,true);
  if(genericCategory){state.category=category;state.group=null;state.product=null;state.specialty=null;state.term=null;state.selectedProduct=null;state.selectedStore=null;state.lastResults=[];applyGenericFilters(original,state);applyCharacteristicFilters(original,state);applyExclusions(original,state)}
  else{if(category)state.category=category;if(clearGroup){state.group=null;state.selectedStore=null;state.lastResults=[]}}
  userMsg(original);input.value='';
  const normalizedOriginal=normalizeNaturalLanguage(original);
  const queryForEngine=genericCategory?'lojas':`${canonical} ${normalizedOriginal}`;
  await engine.handle(queryForEngine);
  if(genericCategory){state.category=category;state.group=null;state.product=null;state.selectedProduct=null;renderGenericContext(state)}else cleanFalseProduct(state);
  applyCharacteristicFilters(original,state);applyExclusions(original,state);hideProductFromContext();
}

form?.addEventListener('submit',async e=>{
  const engine=window.LocalAIEngine;if(!engine||!input)return;
  const original=input.value.trim();if(!original)return;
  const normalizedOriginal=normalizeNaturalLanguage(original);const n=norm(normalizedOriginal);
  const semantic=semanticRules.find(r=>r.re.test(n));
  if(semantic){e.preventDefault();e.stopImmediatePropagation();await runCanonical(original,semantic.canonical);return}
  const generic=genericCategoryRules.find(r=>r.re.test(n));
  if(generic){e.preventDefault();e.stopImmediatePropagation();await runCanonical(original,'lojas',{category:generic.category,clearGroup:true,genericCategory:true});return}
  if(normalizedOriginal!==original||/\b(loja|lojas)\b/.test(n)){
    e.preventDefault();e.stopImmediatePropagation();userMsg(original);input.value='';cleanFalseProduct(engine.state,true);applyGenericFilters(normalizedOriginal,engine.state);applyCharacteristicFilters(normalizedOriginal,engine.state);applyExclusions(normalizedOriginal,engine.state);await engine.handle(normalizedOriginal);cleanFalseProduct(engine.state);hideProductFromContext();return
  }
  cleanFalseProduct(engine.state);applyCharacteristicFilters(original,engine.state);applyExclusions(original,engine.state);
},true);

if(ctx)new MutationObserver(()=>hideProductFromContext()).observe(ctx,{childList:true,characterData:true,subtree:true});
if(msgs)new MutationObserver(()=>{cleanFalseProduct(window.LocalAIEngine?.state);hideProductFromContext()}).observe(msgs,{childList:true,subtree:true});

window.LocalAISemanticGuard={normalize:norm,correctTypos,normalizeBusinessTerms,normalizeNaturalLanguage,rules:semanticRules,cleanFalseProduct,hideProductFromContext,applyCharacteristicFilters,applyExclusions};
