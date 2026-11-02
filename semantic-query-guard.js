const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');

const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

const semanticRules=[
  {re:/\b(loja|lugar|local|restaurante|estabelecimento)?\s*(de )?comida japonesa\b|\bcomida japonesa\b|\b(japonesa|japones|oriental)\b/,canonical:'japonesa'},
  {re:/\b(algo|coisa) doce\b|\bcomer (um |uma )?doce\b|\bvontade de doce\b|\bquero comer.*doce\b|\bloja de doce(s)?\b/,canonical:'doceria'},
  {re:/\bcomer pizza\b|\bvontade de pizza\b|\bquero.*pizza\b|\bloja de pizza(s)?\b/,canonical:'pizzaria'},
  {re:/\b(comer|quero) (um )?(hamburguer|burger|lanche)\b|\bvontade de (hamburguer|lanche)\b|\bloja de hamburguer(es)?\b/,canonical:'hamburgueria'},
  {re:/\b(tomar|quero) (um )?sorvete\b|\balgo gelado\b|\bloja de sorvete(s)?\b/,canonical:'sorveteria'},
  {re:/\b(tomar|quero) (um )?acai\b|\bvontade de acai\b|\bloja de acai\b/,canonical:'acai'},
  {re:/\bcomida caseira\b|\bprato feito\b|\bcomida pronta\b/,canonical:'marmita'}
];

const genericCategoryRules=[
  {re:/\bcomida\b/,category:'Comida'},
  {re:/\broupas?\b/,category:'Roupas'},
  {re:/\btecnologia\b/,category:'Tecnologia'}
];

const falseProducts=new Set([
  'comer','comendo','comida','tomar','bebendo','procurar','procurando','achar','encontrar','comprar','querer','quero','queria',
  'loja','lojas','lugar','lugares','local','locais','estabelecimento','estabelecimentos','aberto','aberta','abertos','abertas',
  'venda','vende','vendem','vender','produto','produtos','opcao','opcoes','opção','opções'
]);

const weekDays={domingo:0,segunda:1,'segunda feira':1,terca:2,'terca feira':2,quarta:3,'quarta feira':3,quinta:4,'quinta feira':4,sexta:5,'sexta feira':5,sabado:6};

function userMsg(text){
  if(!msgs)return;
  const d=document.createElement('div');
  d.className='msg user';
  d.textContent=text;
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
}

function cleanFalseProduct(state,force=false){
  if(!state)return;
  const p=norm(state.product),t=norm(state.term);
  const falseValue=force||falseProducts.has(p)||falseProducts.has(t)||(/^com(er|ida|endo)?$/.test(p))||(/^com(er|ida|endo)?$/.test(t));
  if(falseValue){state.product=null;state.term=null;state.specialty=null;state.selectedProduct=null;}
}

function applyGenericFilters(original,state){
  const n=norm(original);
  let foundDay=null;
  if(/\bhoje\b/.test(n))foundDay=new Date().getDay();
  else if(/\bamanha\b/.test(n))foundDay=(new Date().getDay()+1)%7;
  else{
    for(const[name,num]of Object.entries(weekDays)){
      const re=new RegExp(`(?:^|\\s)${name.replace(/ /g,'\\s+')}(?:\\s|$)`);
      if(re.test(n)){foundDay=num;break;}
    }
  }
  if(foundDay!==null){state.day=foundDay;state.openNow=false;}
  if(/abert[oa]s? agora|aberto agora|aberta agora/.test(n)){state.openNow=true;state.day=null;}
  if(/com entrega|delivery|entrega hoje/.test(n))state.delivery=true;
  else if(/sem entrega|nao quero entrega/.test(n))state.delivery=false;
}

function renderGenericContext(state){
  if(!ctx)return;
  const parts=[];
  if(state.location?.city)parts.push('Cidade: '+state.location.city);
  if(state.location?.uf)parts.push('Estado: '+state.location.uf);
  if(state.category)parts.push('Categoria: '+state.category);
  if(state.day!==null&&state.day!==undefined){
    const days=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    parts.push('Dia: '+days[state.day]);
  }
  if(state.openNow)parts.push('abertas agora');
  if(state.delivery===true)parts.push('com entrega');
  if(state.delivery===false)parts.push('sem entrega');
  ctx.textContent=parts.length?'Contexto: '+parts.join(' · '):'';
}

function hideProductFromContext(){
  if(!ctx)return;
  const txt=ctx.textContent||'';
  if(!txt.includes('Produto:'))return;
  ctx.textContent=txt
    .replace(/\s*·\s*Produto:\s*[^·]+(?=\s*·|$)/g,'')
    .replace(/Contexto:\s*Produto:\s*[^·]+\s*·?\s*/g,'Contexto: ')
    .replace(/\s*·\s*$/,'')
    .replace(/Contexto:\s*$/,'');
}

async function runCanonical(original,canonical,{category=null,clearGroup=false,genericCategory=false}={}){
  const engine=window.LocalAIEngine;
  if(!engine)return;
  const state=engine.state;
  cleanFalseProduct(state,true);
  if(genericCategory){
    state.category=category;
    state.group=null;
    state.product=null;
    state.specialty=null;
    state.term=null;
    state.selectedProduct=null;
    state.selectedStore=null;
    state.lastResults=[];
    applyGenericFilters(original,state);
  }else{
    if(category)state.category=category;
    if(clearGroup){state.group=null;state.selectedStore=null;state.lastResults=[];}
  }
  userMsg(original);
  input.value='';

  // Para categoria generica, nao reenvia "Comida" ao analisador antigo.
  // O estado ja contem Categoria=Comida e Grupo=null, entao "lojas" apenas executa a busca.
  const queryForEngine=genericCategory?'lojas':`${canonical} ${original}`;
  await engine.handle(queryForEngine);

  if(genericCategory){
    state.category=category;
    state.group=null;
    state.product=null;
    state.specialty=null;
    state.term=null;
    state.selectedProduct=null;
    renderGenericContext(state);
  }else cleanFalseProduct(state);
  hideProductFromContext();
}

form?.addEventListener('submit',async e=>{
  const engine=window.LocalAIEngine;
  if(!engine||!input)return;
  const original=input.value.trim();
  if(!original)return;
  const n=norm(original);

  const semantic=semanticRules.find(r=>r.re.test(n));
  if(semantic){
    e.preventDefault();e.stopImmediatePropagation();
    await runCanonical(original,semantic.canonical);
    return;
  }

  const generic=genericCategoryRules.find(r=>r.re.test(n));
  if(generic){
    e.preventDefault();e.stopImmediatePropagation();
    await runCanonical(original,'lojas',{category:generic.category,clearGroup:true,genericCategory:true});
    return;
  }

  cleanFalseProduct(engine.state);
},true);

if(ctx)new MutationObserver(()=>hideProductFromContext()).observe(ctx,{childList:true,characterData:true,subtree:true});
if(msgs)new MutationObserver(()=>{cleanFalseProduct(window.LocalAIEngine?.state);hideProductFromContext()}).observe(msgs,{childList:true,subtree:true});

window.LocalAISemanticGuard={normalize:norm,rules:semanticRules,cleanFalseProduct,hideProductFromContext};
