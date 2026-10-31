import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const $=id=>document.getElementById(id);
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pick=a=>a[Math.floor(Math.random()*a.length)];
const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const flatConfig=v=>Array.isArray(v)?v:Object.values(v||{}).flatMap(x=>Array.isArray(x)?x:[x]).filter(x=>typeof x==='string');
let stores=[],products=[],hours=[],reviews=[],knowledge=[],userPos=null,aiConfig={};

const state={
  selectedStore:null,selectedProduct:null,lastResults:[],lastIntent:null,lastReply:null,
  location:{city:null,uf:null,neighborhood:null},
  category:null,group:null,product:null,color:null,brand:null,size:null,quantity:null,
  minPrice:null,maxPrice:null,promotionOnly:false,inStockOnly:true,
  openNow:false,day:null,time:null,
  delivery:null,pickup:null,maxDeliveryFee:null,maxDeliveryTime:null,
  paymentMethods:[],minRating:null,maxDistance:null,sortBy:null,
  excludedCategories:new Set(),excludedStores:new Set(),excludedDelivery:false,
  term:null
};

const defaultIntentMap={
  Comida:['comida','alimentação','alimento','alimentos','refeição','refeições','comer','lanche','lanches','almoço','jantar','café da manhã','restaurante','restaurantes','lanchonete','lanchonetes','comida pronta','refeição pronta','delivery de comida','entrega de comida','comida caseira','cafeteria'],
  Roupas:['roupa','roupas','camiseta','camisa','calca','vestido','moda','boutique','vestuario','vestuário'],
  Farmácia:['farmacia','farmácia','drogaria','remedio','remédio','medicamento'],
  Mercado:['mercado','supermercado','mercearia','hortifruti'],
  Beleza:['beleza','salao','barbearia','cabeleireiro','manicure','estetica'],
  Tecnologia:['tecnologia','informatica','celular','computador','notebook','eletronico','fone'],
  Serviços:['servico','servicos','assistencia','conserto','manutencao'],
  'Pet shop':['pet','petshop','pet shop','racao','veterinario'],
  Automóveis:['carro','automovel','autopecas','oficina','pneu'],
  Construção:['construcao','ferragem','tinta','material de construcao']
};

const defaultGroupMap={
  Pizzaria:{parent:'Comida',terms:['pizzaria','pizza','pizzas','pizzeria','pizzarias','pizza artesanal','pizza delivery','rodízio de pizza','rodizio de pizza']},
  Hamburgueria:{parent:'Comida',terms:['hamburgueria','hambúrguer','hamburguer','hambúrgueres','hamburgueres','burger','burguer','x-burguer','x-salada','fast food']},
  Padaria:{parent:'Comida',terms:['padaria','pão','pães','paes','panificadora','panificação','café','salgado','salgados','bolo','bolos']},
  Pastelaria:{parent:'Comida',terms:['pastelaria','pastel','pastéis','pasteis','pastel frito','pastel de feira']},
  Churrascaria:{parent:'Comida',terms:['churrascaria','churrasco','carne','carnes','espetinho','espetinhos','grelhados','rodízio','rodizio']},
  Japonesa:{parent:'Comida',terms:['japonesa','sushi','sashimi','temaki','yakisoba','comida japonesa','japonês','japones','oriental']},
  Marmita:{parent:'Comida',terms:['marmita','marmitas','marmitex','quentinha','quentinhas','prato feito','pf','prato executivo','refeição pronta']},
  Doceria:{parent:'Comida',terms:['doceria','doce','doces','sobremesa','sobremesas','confeitaria','bolo','bolos','brigadeiro']},
  Sorveteria:{parent:'Comida',terms:['sorveteria','sorvete','sorvetes','gelato','casquinha','milk shake','milkshake']},
  Açaí:{parent:'Comida',terms:['açaí','açai','acai','açaiteria','acaiteria','açaí na tigela','acai na tigela']}
};

// AUTO_SYNC_SYNONYMS_START
const syncedSynonyms={
  "Açaí": [
    "açai",
    "acai",
    "açaiteria",
    "acaiteria",
    "açaí na tigela",
    "acai na tigela"
  ],
  "Comida": [
    "alimentação",
    "alimento",
    "alimentos",
    "refeição",
    "refeições",
    "comer",
    "lanche",
    "lanches",
    "almoço",
    "jantar",
    "café da manhã",
    "restaurante",
    "restaurantes",
    "lanchonete",
    "lanchonetes",
    "comida pronta",
    "refeição pronta",
    "delivery de comida",
    "entrega de comida",
    "comida caseira"
  ],
  "roupas": [
    "moda",
    "vestuário"
  ],
  "Doceria": [
    "doce",
    "doces",
    "sobremesa",
    "sobremesas",
    "confeitaria",
    "bolo",
    "bolos",
    "brigadeiro"
  ],
  "Marmita": [
    "marmitas",
    "marmitex",
    "quentinha",
    "quentinhas",
    "prato feito",
    "pf",
    "prato executivo",
    "refeição pronta"
  ],
  "Padaria": [
    "pão",
    "pães",
    "paes",
    "panificadora",
    "panificação",
    "café",
    "salgado",
    "salgados",
    "bolo",
    "bolos"
  ],
  "Japonesa": [
    "sushi",
    "sashimi",
    "temaki",
    "yakisoba",
    "comida japonesa",
    "japonês",
    "japones",
    "oriental"
  ],
  "pizzaria": [
    "pizza",
    "pizzas",
    "pizzeria",
    "pizzarias",
    "pizza artesanal",
    "pizza delivery",
    "rodízio de pizza",
    "rodizio de pizza"
  ],
  "farmácia": [
    "drogaria",
    "remédio"
  ],
  "Pastelaria": [
    "pastel",
    "pastéis",
    "pasteis",
    "pastel frito",
    "pastel de feira"
  ],
  "Sorveteria": [
    "sorvete",
    "sorvetes",
    "gelato",
    "casquinha",
    "milk shake",
    "milkshake"
  ],
  "hambúrguer": [
    "hambúrguer",
    "hamburguer",
    "hambúrgueres",
    "hamburgueres",
    "burger",
    "burguer",
    "lanche",
    "x-burguer",
    "x-salada",
    "fast food"
  ],
  "Churrascaria": [
    "churrasco",
    "carne",
    "carnes",
    "espetinho",
    "espetinhos",
    "grelhados",
    "rodízio",
    "rodizio"
  ]
};
// AUTO_SYNC_SYNONYMS_END

let intentMap=Object.fromEntries(Object.entries(defaultIntentMap).map(([k,v])=>[k,[...v]]));
let groupMap=Object.fromEntries(Object.entries(defaultGroupMap).map(([k,v])=>[k,{parent:v.parent,terms:[...v.terms]}]));
let negativeWords=['nao quero','sem','excluir','evitar'];
let configuredIntents={};
let rankingWeights={category:28,city:22,state:12,neighborhood:10,product:24,open_now:14,delivery:8,rating:2,rating_bonus:4,distance:35,store_name:45};
let contextRules={};

function mergeSynonymsIntoIntentMap(synonyms={}){
  if(!synonyms||typeof synonyms!=='object'||Array.isArray(synonyms))return;
  for(const[key,values]of Object.entries(synonyms)){
    const all=uniq([key,...(Array.isArray(values)?values:[])]);
    const group=Object.keys(groupMap).find(g=>norm(g)===norm(key)||(groupMap[g].terms||[]).some(x=>norm(x)===norm(key))||all.some(v=>(groupMap[g].terms||[]).some(x=>norm(x)===norm(v))));
    if(group){groupMap[group].terms=uniq([...(groupMap[group].terms||[]),...all]);continue}
    let target=Object.keys(intentMap).find(cat=>norm(cat)===norm(key)||(intentMap[cat]||[]).some(x=>norm(x)===norm(key)));
    if(!target)target=Object.keys(intentMap).find(cat=>all.some(v=>(intentMap[cat]||[]).some(x=>norm(x)===norm(v))));
    if(target)intentMap[target]=uniq([...(intentMap[target]||[]),...all]);
    else intentMap[key.charAt(0).toUpperCase()+key.slice(1)]=all;
  }
}
function applyAIConfig(cfg={}){
  aiConfig=cfg||{};
  intentMap=Object.fromEntries(Object.entries(defaultIntentMap).map(([k,v])=>[k,[...v]]));
  groupMap=Object.fromEntries(Object.entries(defaultGroupMap).map(([k,v])=>[k,{parent:v.parent,terms:[...v.terms]}]));
  const cats=Array.isArray(aiConfig.categories)?aiConfig.categories:[];
  for(const c of cats){const label=String(c).trim();if(label&&!intentMap[label])intentMap[label]=[label]}
  mergeSynonymsIntoIntentMap(syncedSynonyms);
  mergeSynonymsIntoIntentMap(aiConfig.synonyms);
  configuredIntents=aiConfig.intents&&typeof aiConfig.intents==='object'&&!Array.isArray(aiConfig.intents)?aiConfig.intents:{};
  const neg=flatConfig(aiConfig.negative_words);if(neg.length)negativeWords=uniq(['nao quero','sem','excluir','evitar',...neg]);
  if(aiConfig.ranking_weights&&typeof aiConfig.ranking_weights==='object'&&!Array.isArray(aiConfig.ranking_weights))rankingWeights={...rankingWeights,...aiConfig.ranking_weights};
  contextRules=aiConfig.context_rules&&typeof aiConfig.context_rules==='object'&&!Array.isArray(aiConfig.context_rules)?aiConfig.context_rules:{};
  window.LocalAIConfig=aiConfig;
}
function configTerms(name){const v=configuredIntents?.[name]??configuredIntents?.[name.toLowerCase()];return Array.isArray(v)?v:typeof v==='string'?[v]:[]}
function configuredIntentMatch(name,text){const n=norm(text);return configTerms(name).some(x=>n.includes(norm(x)))}
function hasNegativeExpression(text){const n=norm(text);return negativeWords.some(x=>{const w=norm(x);return w&&n.includes(w)})}

const stateNames={sp:['sp','sao paulo','estado de sao paulo'],rj:['rj','rio de janeiro','estado do rio de janeiro'],mg:['mg','minas gerais'],pr:['pr','parana'],sc:['sc','santa catarina'],rs:['rs','rio grande do sul'],ba:['ba','bahia'],go:['go','goias'],df:['df','distrito federal'],es:['es','espirito santo']};
const responseSets={
  reset:['Pronto. Limpei o contexto. O que você quer procurar agora?','Tudo certo. Começamos do zero. O que deseja encontrar?','Busca reiniciada. Pode me dizer o que procura agora.','Removi os filtros e o contexto anterior. Qual será a nova busca?'],
  results:['Encontrei estas opções para você:','Separei as opções mais relevantes:','Achei algumas opções que combinam com sua busca:','Estas são as melhores opções que encontrei agora:'],
  none:['Não encontrei uma opção cadastrada com todos esses critérios.','Não achei resultado com essa combinação de filtros.','Nenhuma loja cadastrada atende exatamente a esses critérios agora.']
};
function reply(set){const a=responseSets[set]||['Certo.'];const opts=a.filter(x=>x!==state.lastReply);const r=pick(opts.length?opts:a);state.lastReply=r;return r}

async function load(){const[s,p,h,r,k,cfg]=await Promise.all([
  sb.from('local_ai_stores').select('*').eq('active',true).eq('status','active'),
  sb.from('local_ai_products').select('*').eq('active',true).eq('show_in_ai',true),
  sb.from('local_ai_store_hours').select('*'),sb.from('local_ai_reviews').select('*'),sb.from('local_ai_store_knowledge').select('*').eq('active',true),
  sb.from('local_ai_ai_config').select('config_key,config_value')
]);stores=s.data||[];products=p.data||[];hours=h.data||[];reviews=r.data||[];knowledge=k.data||[];if(!cfg.error)applyAIConfig(Object.fromEntries((cfg.data||[]).map(x=>[x.config_key,x.config_value])));else applyAIConfig({})}

function addMsg(text,user=false){const d=document.createElement('div');d.className='msg '+(user?'user':'bot');d.textContent=text;$('msgs').appendChild(d);$('msgs').scrollTop=$('msgs').scrollHeight;return d}
function addActions(node){const box=document.createElement('div');box.className='chat-actions';[['Horário','qual o horário?'],['Entrega','faz entrega?'],['Pagamentos','formas de pagamento'],['Produtos','quais produtos tem?'],['Endereço','qual o endereço?']].forEach(([label,q])=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>submitSynthetic(q);box.appendChild(b)});node.appendChild(box)}

function detectCategory(t){const n=norm(t);for(const[g,data]of Object.entries(groupMap))if((data.terms||[]).some(w=>n.includes(norm(w)))){state.group=g;return data.parent}for(const[c,terms]of Object.entries(intentMap))if(terms.some(w=>n.includes(norm(w)))){state.group=null;return c}return null}
function extractLocation(address=''){const raw=String(address).replace(/·/g,',').replace(/\s+/g,' ').trim(),parts=raw.split(',').map(x=>x.trim()).filter(Boolean);let uf=null,city=null,neighborhood=null;const dash=[...raw.matchAll(/(?:^|,)\s*([^,]+?)\s*-\s*([A-Z]{2})(?=\s*(?:,|$))/gi)].pop();if(dash){city=dash[1].trim();uf=dash[2].toUpperCase()}for(let i=0;i<parts.length;i++){if(!uf&&/^[A-Z]{2}$/i.test(parts[i])){uf=parts[i].toUpperCase();city=city||parts[i-1]||null}if(!uf&&norm(parts[i])==='sao paulo'){uf='SP';city=city||parts[i-1]||null}}if(city){const ci=parts.findIndex(x=>norm(x)===norm(city)||norm(x).startsWith(norm(city)+' '));if(ci>0){const cand=parts[ci-1];if(!/\d/.test(cand)&&!/^(rua|r |avenida|av |rodovia)/i.test(cand))neighborhood=cand}}return{city,uf,neighborhood}}
function detectUF(text){const n=norm(text);for(const[uf,aliases]of Object.entries(stateNames))if(aliases.some(a=>new RegExp(`(?:^|\\s)${norm(a)}(?:\\s|$)`).test(n)))return uf.toUpperCase();return null}
function detectCity(text){const n=norm(text);let best=null;for(const s of stores){const loc=extractLocation(s.address);if(!loc.city)continue;const c=norm(loc.city);if(c&&n.includes(c)&&(!best||c.length>norm(best.city).length))best=loc}return best}
function detectNeighborhood(text){const n=norm(text);let best=null;for(const s of stores){const loc=extractLocation(s.address);if(!loc.neighborhood)continue;const b=norm(loc.neighborhood);if(b.length>2&&n.includes(b)&&(!best||b.length>norm(best).length))best=loc.neighborhood}return best}
function locationFromText(text){const c=detectCity(text),uf=detectUF(text)||c?.uf||null,b=detectNeighborhood(text);return{city:c?.city||null,uf,neighborhood:b||null}}
function storeMatchesLocation(s,loc){if(!loc?.city&&!loc?.uf&&!loc?.neighborhood)return true;const addr=norm(s.address||''),p=extractLocation(s.address);if(loc.city&&!addr.includes(norm(loc.city))&&norm(p.city)!==norm(loc.city))return false;if(loc.neighborhood&&!addr.includes(norm(loc.neighborhood))&&norm(p.neighborhood)!==norm(loc.neighborhood))return false;if(loc.uf){const uf=norm(loc.uf),aliases=stateNames[uf]||[];if(norm(p.uf)!==uf&&!aliases.some(x=>addr.includes(norm(x)))&&!new RegExp(`(?:^|\\s)${uf}(?:\\s|$)`).test(addr))return false}return true}

function isResetIntent(t){const n=norm(t),verbs=['reiniciar','reinicie','resetar','resete','limpar','limpe','apagar','apague','zerar','zere','recomecar','recomece','refazer','refaca','remover','remova','tirar','tire','esquecer','esqueca','cancelar','cancele'],targets=['filtro','filtros','busca','pesquisa','chat','conversa','contexto','resultado','resultados','criterio','criterios','preferencia','preferencias'];if(['nova busca','nova pesquisa','novo chat','nova conversa','comecar do zero','comecar de novo','vamos do zero','sem filtros'].some(x=>n.includes(x)))return true;return verbs.some(v=>n.includes(v))&&targets.some(x=>n.includes(x))}
function classifyIntent(t){const n=norm(t);if(isResetIntent(t)||configuredIntentMatch('RESET_ALL',t))return'RESET_ALL';if(configuredIntentMatch('COMPARE_RESULTS',t)||/compare|comparar|comparacao|qual.*melhor/.test(n))return'COMPARE_RESULTS';if(configuredIntentMatch('ASK_HOURS',t)||/horario|funcionamento|que horas|abre|fecha/.test(n))return'ASK_HOURS';if(configuredIntentMatch('ASK_DISTANCE',t)||/distancia|quantos km|fica longe|mais perto|mais proxima|mais proximo/.test(n))return state.selectedStore?'ASK_DISTANCE':'REFINE_SEARCH';if((configuredIntentMatch('ASK_DELIVERY',t)||/entrega|delivery|frete/.test(n))&&state.selectedStore)return'ASK_DELIVERY';if(configuredIntentMatch('ASK_PAYMENT',t)||/pix|pagamento|credito|debito|dinheiro|cartao/.test(n))return'ASK_PAYMENT';if((configuredIntentMatch('ASK_PRODUCTS',t)||/produto|produtos|vende|preco|valor|estoque|tamanho|tam\b/.test(n))&&state.selectedStore)return'ASK_PRODUCTS';if(/^\d+$/.test(n)||/primeira|primeiro|segunda|segundo|terceira|terceiro|ultima|ultimo|mais barata|mais barato|mais perto/.test(n))return'SELECT_RESULT';if(configuredIntentMatch('REFINE_NEGATIVE',t)||hasNegativeExpression(t))return'REFINE_NEGATIVE';const loc=locationFromText(t);if(detectCategory(t)||loc.city||loc.uf||loc.neighborhood||configuredIntentMatch('SEARCH',t)||/quero|procuro|preciso|achar|encontrar|comprar|loja/.test(n))return state.lastResults.length?'REFINE_SEARCH':'SEARCH';return state.selectedStore?'ASK_STORE':'SEARCH'}

function clearProductSpecific(){const custom=Array.isArray(contextRules.clear_on_category_change)?contextRules.clear_on_category_change:null;if(custom){for(const key of custom)if(key in state)state[key]=Array.isArray(state[key])?[]:state[key] instanceof Set?new Set():null;state.selectedProduct=null;return}state.group=null;state.product=null;state.color=null;state.brand=null;state.size=null;state.quantity=null;state.minPrice=null;state.maxPrice=null;state.promotionOnly=false;state.term=null;state.selectedProduct=null}
function applyCategoryTransition(newCategory){if(!newCategory||newCategory===state.category)return;if(state.category&&newCategory!==state.category)clearProductSpecific();state.category=newCategory;state.selectedStore=null;state.lastResults=[]}
function reset(){Object.assign(state,{selectedStore:null,selectedProduct:null,lastResults:[],lastIntent:'RESET_ALL',location:{city:null,uf:null,neighborhood:null},category:null,group:null,product:null,color:null,brand:null,size:null,quantity:null,minPrice:null,maxPrice:null,promotionOnly:false,inStockOnly:true,openNow:false,day:null,time:null,delivery:null,pickup:null,maxDeliveryFee:null,maxDeliveryTime:null,paymentMethods:[],minRating:null,maxDistance:null,sortBy:null,excludedDelivery:false,term:null});state.excludedCategories=new Set();state.excludedStores=new Set();renderContext()}

function renderContext(){const a=[];if(state.selectedStore)a.push('Loja: '+state.selectedStore.name);if(state.location.city)a.push('Cidade: '+state.location.city);if(state.location.uf)a.push('Estado: '+state.location.uf);if(state.location.neighborhood)a.push('Bairro: '+state.location.neighborhood);if(state.category)a.push(state.category);if(state.group)a.push('Grupo: '+state.group);if(state.product)a.push('Produto: '+state.product);if(state.color)a.push('Cor: '+state.color);if(state.brand)a.push('Marca: '+state.brand);if(state.size)a.push('Tam. '+state.size);if(state.quantity)a.push('Qtd. '+state.quantity);if(state.minPrice!=null||state.maxPrice!=null)a.push(state.minPrice!=null&&state.maxPrice!=null?`${money(state.minPrice)}–${money(state.maxPrice)}`:state.maxPrice!=null?'até '+money(state.maxPrice):'a partir de '+money(state.minPrice));if(state.promotionOnly)a.push('em promoção');if(state.openNow)a.push('abertas agora');if(state.day)a.push('Dia: '+state.day);if(state.time)a.push('Horário: '+state.time);if(state.delivery===true)a.push('com entrega');if(state.delivery===false||state.excludedDelivery)a.push('sem entrega');if(state.pickup===true)a.push('com retirada');if(state.maxDeliveryFee!=null)a.push('taxa até '+money(state.maxDeliveryFee));if(state.maxDeliveryTime!=null)a.push('entrega até '+state.maxDeliveryTime+' min');if(state.paymentMethods.length)a.push('Pagamento: '+state.paymentMethods.join(', '));if(state.minRating!=null)a.push('nota ≥ '+state.minRating);if(state.maxDistance!=null)a.push('até '+state.maxDistance+' km');if(state.sortBy)a.push('Ordenar: '+state.sortBy);$('ctx').textContent=a.length?'Contexto: '+a.join(' · '):''}

function isOpen(s){const d=new Date(),h=hours.find(x=>x.store_id===s.id&&x.weekday===d.getDay());if(!h||h.closed||!h.opens_at||!h.closes_at)return false;const cur=d.getHours()*60+d.getMinutes(),a=+String(h.opens_at).slice(0,2)*60+ +String(h.opens_at).slice(3,5),b=+String(h.closes_at).slice(0,2)*60+ +String(h.closes_at).slice(3,5);return cur>=a&&cur<=b}
function rating(s){const a=reviews.filter(r=>r.store_id===s.id);return a.length?a.reduce((z,x)=>z+Number(x.rating),0)/a.length:Number(s.rating||0)}
function distance(s){if(!userPos||s.latitude==null||s.longitude==null)return null;const R=6371,rad=x=>x*Math.PI/180,dLat=rad(s.latitude-userPos.lat),dLon=rad(s.longitude-userPos.lng),q=Math.sin(dLat/2)**2+Math.cos(rad(userPos.lat))*Math.cos(rad(s.latitude))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))}
function price(p){const now=Date.now(),promo=p.promo_price&&(!p.promo_start||+new Date(p.promo_start)<=now)&&(!p.promo_end||+new Date(p.promo_end)>=now);return Number(promo?p.promo_price:p.price)}
function isPromo(p){return Number(p.promo_price)>0&&price(p)===Number(p.promo_price)}
function storeProducts(s){return products.filter(p=>p.store_id===s.id&&(!state.inStockOnly||Number(p.stock)>0))}

function parseEntities(t){const n=norm(t),cat=detectCategory(t),loc=locationFromText(t);applyCategoryTransition(cat);if(loc.city)state.location.city=loc.city;if(loc.uf)state.location.uf=loc.uf;if(loc.neighborhood)state.location.neighborhood=loc.neighborhood;
  const range=n.match(/entre\s*r?\$?\s*(\d+(?:[.,]\d+)?)\s*(?:e|a)\s*r?\$?\s*(\d+(?:[.,]\d+)?)/);if(range){state.minPrice=Number(range[1].replace(',','.'));state.maxPrice=Number(range[2].replace(',','.'))}else{const mx=n.match(/(?:ate|menos de|maximo|max)\s*r?\$?\s*(\d+(?:[.,]\d+)?)/);if(mx)state.maxPrice=Number(mx[1].replace(',','.'));const mn=n.match(/(?:acima de|mais de|a partir de)\s*r?\$?\s*(\d+(?:[.,]\d+)?)/);if(mn)state.minPrice=Number(mn[1].replace(',','.'))}
  const sz=n.match(/(?:tamanho|tam)\s*(pp|p|m|g|gg|xg)\b/);if(sz)state.size=sz[1].toUpperCase();
  const qty=n.match(/(?:quero|preciso de|quantidade)\s*(\d+)\b/);if(qty)state.quantity=Number(qty[1]);
  const colors=['preta','preto','branca','branco','azul','vermelha','vermelho','verde','amarela','amarelo','rosa','roxa','roxo','cinza','bege','marrom'];const color=colors.find(c=>n.includes(c));if(color)state.color=color;
  const km=n.match(/(?:ate|no maximo|maximo)\s*(\d+(?:[.,]\d+)?)\s*km/);if(km)state.maxDistance=Number(km[1].replace(',','.'));
  const rt=n.match(/(?:nota|avaliacao).*?(\d(?:[.,]\d)?)/);if(rt)state.minRating=Number(rt[1].replace(',','.'));
  if(/abert[oa]s? agora|aberto agora|aberta agora/.test(n))state.openNow=true;
  const day=(['domingo','segunda','terca','quarta','quinta','sexta','sabado']).find(d=>n.includes(d));if(day)state.day=day;
  const tm=n.match(/(?:depois das|apos as|a partir das|as)\s*(\d{1,2})(?::(\d{2}))?\s*h?/);if(tm)state.time=`${String(tm[1]).padStart(2,'0')}:${tm[2]||'00'}`;
  if(/com entrega|delivery|entrega hoje/.test(n)&&!/sem entrega|nao quero entrega/.test(n)){state.delivery=true;state.excludedDelivery=false}if(/sem entrega|nao quero entrega/.test(n)){state.delivery=false;state.excludedDelivery=true}
  if(/retirada|retirar na loja|buscar na loja/.test(n))state.pickup=true;
  const fee=n.match(/(?:taxa|frete).{0,15}(?:ate|maximo)\s*r?\$?\s*(\d+(?:[.,]\d+)?)/);if(fee)state.maxDeliveryFee=Number(fee[1].replace(',','.'));
  const dt=n.match(/(?:entrega|chegue|chegar).{0,20}(?:ate|maximo)\s*(\d+)\s*(?:min|minutos)/);if(dt)state.maxDeliveryTime=Number(dt[1]);
  const pays=[['Pix','pix'],['Dinheiro','dinheiro'],['Crédito','credito'],['Débito','debito'],['Cartão','cartao']];for(const[label,key]of pays)if(n.includes(key)&&!state.paymentMethods.includes(label))state.paymentMethods.push(label);
  if(/promocao|promoção|em oferta|com desconto/.test(t.toLowerCase()))state.promotionOnly=true;
  if(/mais perto|mais proxima|mais proximo/.test(n))state.sortBy='distancia';else if(/mais barata|mais barato|menor preco/.test(n))state.sortBy='preco';else if(/melhor avaliada|melhor avaliacao|maior nota/.test(n))state.sortBy='avaliacao';
  for(const[c,terms]of Object.entries(intentMap))if(terms.some(w=>new RegExp(`(?:nao quero|sem|evitar)\\s+.*${norm(w)}`).test(n)))state.excludedCategories.add(c);
  for(const[g,data]of Object.entries(groupMap))if((data.terms||[]).some(w=>new RegExp(`(?:nao quero|sem|evitar)\\s+.*${norm(w)}`).test(n)))state.excludedCategories.add(data.parent);
  if(/nao quero loja longe|sem loja longe|so perto|somente perto/.test(n)&&state.maxDistance==null)state.maxDistance=10;
  for(const s of stores)if(new RegExp(`(?:nao quero|nao mostre|excluir|evitar)\\s+.*${norm(s.name)}`).test(n))state.excludedStores.add(s.id);
  const geo=[...(loc.city?norm(loc.city).split(' '):[]),...(loc.uf?[norm(loc.uf),...(stateNames[norm(loc.uf)]||[])]:[]),...(loc.neighborhood?norm(loc.neighborhood).split(' '):[])].flatMap(x=>norm(x).split(' '));const catWords=cat?(intentMap[cat]||[]).flatMap(x=>norm(x).split(' ')):[];const groupWords=state.group?(groupMap[state.group]?.terms||[]).flatMap(x=>norm(x).split(' ')):[];
  const stop=new Set(['quero','preciso','procuro','onde','achar','encontrar','comprar','loja','uma','um','com','sem','ate','agora','perto','mais','tamanho','entrega','nao','em','de','da','do','das','dos','estado','cidade','bairro','pagamento','retirada','promocao','oferta','desconto',...geo,...catWords,...groupWords,...colors.map(norm)]);
  const words=n.split(' ').filter(w=>w.length>3&&!stop.has(w));const candidate=words.join(' ');if(candidate){state.term=candidate;if(!state.product&&cat)state.product=candidate}
  renderContext();
}

function productMatches(p){if(state.maxPrice!=null&&price(p)>state.maxPrice)return false;if(state.minPrice!=null&&price(p)<state.minPrice)return false;if(state.size&&!(p.sizes||[]).map(norm).includes(norm(state.size)))return false;if(state.color&&!norm([p.color,p.name,p.description].join(' ')).includes(norm(state.color)))return false;if(state.brand&&!norm([p.brand,p.name,p.description].join(' ')).includes(norm(state.brand)))return false;if(state.promotionOnly&&!isPromo(p))return false;if(state.quantity&&Number(p.stock)<state.quantity)return false;const q=norm(state.term||state.product||'');if(!q)return true;const hay=norm([p.name,p.description,p.category,p.color,p.brand,(p.sizes||[]).join(' ')].join(' '));return q.split(' ').filter(x=>x.length>3).every(w=>hay.includes(w))}
async function ensureLocation(){if(userPos)return true;return new Promise(resolve=>{if(!navigator.geolocation)return resolve(false);navigator.geolocation.getCurrentPosition(p=>{userPos={lat:p.coords.latitude,lng:p.coords.longitude};resolve(true)},()=>resolve(false),{enableHighAccuracy:true,timeout:7000})})}

function weight(name,fallback){const v=Number(rankingWeights[name]);return Number.isFinite(v)?v:fallback}
function scoreStore(s,t){if(state.excludedStores.has(s.id))return null;if([...state.excludedCategories].some(c=>norm(c)===norm(s.category)))return null;if(state.category&&norm(s.category)!==norm(state.category))return null;if(!storeMatchesLocation(s,state.location))return null;if(state.delivery===true&&!s.delivery)return null;if(state.excludedDelivery&&s.delivery)return null;if(state.pickup===true&&!s.pickup)return null;if(state.maxDeliveryFee!=null&&Number(s.delivery_fee||0)>state.maxDeliveryFee)return null;if(state.maxDeliveryTime!=null&&Number(s.delivery_time||s.delivery_time_minutes||9999)>state.maxDeliveryTime)return null;if(state.paymentMethods.length){const pm=(s.payment_methods||[]).map(norm);if(!state.paymentMethods.every(x=>pm.some(y=>y.includes(norm(x))||norm(x).includes(y))))return null}if(state.openNow&&!isOpen(s))return null;
  const d=distance(s);if(state.maxDistance!=null&&d!=null&&d>state.maxDistance)return null;const r=rating(s);if(state.minRating!=null&&r<state.minRating)return null;const ps=storeProducts(s).filter(productMatches);if((state.minPrice!=null||state.maxPrice!=null||state.size||state.color||state.brand||state.product||state.term||state.promotionOnly||state.quantity)&&!ps.length)return null;
  let pts=0,reasons=[];if(state.category){pts+=weight('category',28);reasons.push(state.group?`é do grupo ${state.group}`:'é da categoria que você pediu')}if(state.location.city){pts+=weight('city',22);reasons.push('fica em '+state.location.city)}else if(state.location.uf){pts+=weight('state',12);reasons.push('fica no estado '+state.location.uf)}if(state.location.neighborhood){pts+=weight('neighborhood',10);reasons.push('fica no bairro '+state.location.neighborhood)}if(ps.length){pts+=weight('product',24);reasons.push('tem produto compatível em estoque')}if(isOpen(s)){pts+=weight('open_now',14);reasons.push('está aberta agora')}if(s.delivery){pts+=weight('delivery',8);reasons.push('faz entrega')}pts+=Math.min(r*weight('rating',2),10);if(r>=4){pts+=weight('rating_bonus',4);reasons.push('tem boa avaliação')}if(d!=null){pts+=Math.max(0,weight('distance',35)-d*4);reasons.unshift(`fica a ${d.toFixed(1)} km de você`)}if(ps.length){const cheapest=Math.min(...ps.map(price));pts+=Math.max(0,10-Math.min(cheapest/25,10))}if(norm(t).includes(norm(s.name))){pts+=weight('store_name',45);reasons.unshift('você citou essa loja')}return{store:s,score:pts,reasons:[...new Set(reasons)],distance:d,rating:r,products:ps}}
function search(t){const a=stores.map(s=>scoreStore(s,t)).filter(Boolean);a.sort((x,y)=>{if(state.sortBy==='distancia')return(x.distance??Infinity)-(y.distance??Infinity);if(state.sortBy==='preco'){const xp=Math.min(...(x.products.length?x.products.map(price):[Infinity])),yp=Math.min(...(y.products.length?y.products.map(price):[Infinity]));return xp-yp}if(state.sortBy==='avaliacao')return y.rating-x.rating;return y.score-x.score});return a.slice(0,6)}

function selectByReference(t){const n=norm(t),a=state.lastResults;if(!a.length)return null;const digit=n.match(/^([1-9])$/);if(digit)return a[Number(digit[1])-1]||null;if(/primeira|primeiro/.test(n))return a[0]||null;if(/segunda|segundo/.test(n))return a[1]||null;if(/terceira|terceiro/.test(n))return a[2]||null;if(/ultima|ultimo/.test(n))return a.at(-1)||null;if(/mais barata|mais barato/.test(n))return[...a].sort((x,y)=>Math.min(...(x.products.length?x.products.map(price):[Infinity]))-Math.min(...(y.products.length?y.products.map(price):[Infinity])))[0]||null;if(/mais perto|mais proxima|mais proximo/.test(n))return[...a].filter(x=>x.distance!=null).sort((x,y)=>x.distance-y.distance)[0]||a[0];return null}
function summary(s){const d=distance(s),r=rating(s),h=hours.find(x=>x.store_id===s.id&&x.weekday===new Date().getDay()),parts=[`${pick(['Boa escolha.','Certo.','Perfeito.'])} Vamos falar da ${s.name}.`,`${s.category}${r?` · ★ ${r.toFixed(1)}`:''}${d!=null?` · ${d.toFixed(1)} km de você`:''}`];if(h)parts.push(h.closed?'Hoje está fechada.':`Hoje funciona das ${String(h.opens_at).slice(0,5)} às ${String(h.closes_at).slice(0,5)}${isOpen(s)?' e está aberta agora.':'.'}`);if(s.address)parts.push(`Endereço: ${s.address}`);parts.push(s.delivery?`Entrega disponível${Number(s.delivery_fee)>0?' por '+money(s.delivery_fee):''}.`:'Entrega não informada.');return parts.join('\n\n')}
function answerStore(t,s,intent){if(intent==='ASK_HOURS'){const h=hours.find(x=>x.store_id===s.id&&x.weekday===new Date().getDay());return !h?'O horário de hoje ainda não foi informado.':h.closed?`Hoje a ${s.name} está fechada.`:`Hoje a ${s.name} funciona das ${String(h.opens_at).slice(0,5)} às ${String(h.closes_at).slice(0,5)}.`}if(intent==='ASK_DISTANCE'){const d=distance(s);return d==null?'Ative sua localização para eu calcular a distância real.':`A ${s.name} fica a aproximadamente ${d.toFixed(1).replace('.',',')} km de você.`}if(intent==='ASK_DELIVERY')return s.delivery?`Sim. A ${s.name} faz entrega${Number(s.delivery_fee)>0?' por '+money(s.delivery_fee):''}.`:`A ${s.name} não informou entrega disponível.`;if(intent==='ASK_PAYMENT'){const p=s.payment_methods||[];return p.length?`A ${s.name} aceita ${p.join(', ')}.`:'As formas de pagamento ainda não foram informadas.'}if(intent==='ASK_PRODUCTS'){const ps=storeProducts(s).filter(productMatches);return ps.length?`Na ${s.name} encontrei:\n`+ps.slice(0,8).map(p=>`• ${p.name} — ${money(price(p))}`).join('\n'):`Não encontrei produto compatível em estoque na ${s.name}.`}const k=knowledge.find(x=>x.store_id===s.id&&[x.question,...(x.variations||[])].some(q=>norm(t).includes(norm(q))||norm(q).includes(norm(t))));return k?.answer||null}

function resetForNewSearchKeepLocation(){const preserve=Array.isArray(contextRules.preserve_on_new_search)?contextRules.preserve_on_new_search:['location'];const loc={...state.location};Object.assign(state,{selectedStore:null,selectedProduct:null,lastResults:[],category:null,group:null,product:null,color:null,brand:null,size:null,quantity:null,minPrice:null,maxPrice:null,promotionOnly:false,openNow:false,day:null,time:null,delivery:null,pickup:null,maxDeliveryFee:null,maxDeliveryTime:null,paymentMethods:[],minRating:null,maxDistance:null,sortBy:null,excludedDelivery:false,term:null});state.location=preserve.includes('location')||preserve.includes('city')||preserve.includes('state')?loc:{city:null,uf:null,neighborhood:null};state.excludedCategories=new Set();state.excludedStores=new Set()}
async function handle(t){const intent=classifyIntent(t);state.lastIntent=intent;if(intent==='RESET_ALL'){reset();return addMsg(reply('reset'))}if(intent==='SELECT_RESULT'){const x=selectByReference(t);if(x){state.selectedStore=x.store;state.selectedProduct=x.products?.[0]||null;renderContext();const d=addMsg(summary(x.store));addActions(d);return}}if(intent==='COMPARE_RESULTS'&&state.lastResults.length>=2){const a=state.lastResults.slice(0,2),best=a[0].score>=a[1].score?a[0]:a[1];return addMsg(`Comparando ${a[0].store.name} e ${a[1].store.name}, eu escolheria ${best.store.name} pelo conjunto de distância, estoque, horário, avaliação, preço e entrega.`)}if(state.selectedStore&&['ASK_HOURS','ASK_DISTANCE','ASK_DELIVERY','ASK_PAYMENT','ASK_PRODUCTS','ASK_STORE'].includes(intent)){if(intent==='ASK_DISTANCE'&&!userPos)await ensureLocation();const ans=answerStore(t,state.selectedStore,intent);if(ans){const d=addMsg(ans);addActions(d);return}}
  if(intent==='SEARCH'&&!state.lastResults.length&&!state.selectedStore){}else if(intent==='SEARCH'&&/nova busca|outra busca|novo produto|outra coisa/.test(norm(t)))resetForNewSearchKeepLocation();
  parseEntities(t);if(/perto|distancia|proxima|proximo/.test(norm(t))&&!userPos)await ensureLocation();const results=search(t);if(!results.length)return addMsg(reply('none')+' Tente remover um filtro ou mudar o tipo de estabelecimento.');state.lastResults=results;const intro=reply('results');const list=results.map((x,i)=>`${i+1}. ${x.store.name} — ${x.store.category}${state.group?` · ${state.group}`:''}${x.distance!=null?` · ${x.distance.toFixed(1)} km`:''}${x.rating?` · ★ ${x.rating.toFixed(1)}`:''}\n   ${x.reasons.slice(0,3).join(', ')}.`).join('\n\n');addMsg(`${intro}\n\n${list}\n\nVocê pode dizer “a segunda”, “a mais barata”, “a mais perto” ou continuar refinando a busca.`)}
function submitSynthetic(q){$('q').value=q;$('chatForm').requestSubmit()}
await load();const form=$('chatForm');form.onsubmit=async e=>{e.preventDefault();const t=$('q').value.trim();if(!t)return;addMsg(t,true);$('q').value='';await handle(t)};
window.LocalAIEngine={reset,handle,classifyIntent,state,getConfig:()=>aiConfig,getGroups:()=>groupMap,reloadConfig:async()=>{const{data}=await sb.from('local_ai_ai_config').select('config_key,config_value');applyAIConfig(Object.fromEntries((data||[]).map(x=>[x.config_key,x.config_value])));return aiConfig}};