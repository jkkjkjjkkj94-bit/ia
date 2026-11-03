// GURU v4: pure interpretation, strict filtering and deterministic ranking.
// No DOM, network access or shared mutable state in this module.
export const norm = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s#]/g,' ').replace(/\s+/g,' ').trim();
const has=(text,term)=>(' '+norm(text)+' ').includes(' '+norm(term)+' ');
const words=text=>norm(text).split(' ').filter(Boolean);
const STOP=new Set('quero queria preciso preciso de procuro procurando procurar encontre encontrar achar onde como qual quais uma um uns umas de da do das dos em no na nos nas aos todos todas cada com para por que meu minha seus suas me mostre mostra mostre negocio negocios comercio comercios loja lojas lugar lugares local locais estabelecimento estabelecimentos empresa empresas ponto pontos aberto aberta abertos abertas agora hoje amanha depois antes ate mais menos real reais preco precos custa custam tem vende vendem fique fiquem ficar fica ficam esteja estejam estar esta estao funcione funcionem funciona funcionam abram abrem abre abrir aberto abertos me me da ai tipo generico qualquer algo algum alguma coisa comer comida almoco jantar refeicao restaurante restaurantes horario funciona funcionamento perto longe mim aqui entrega frete taxa quanto fica eu gostaria'.split(' '));
const COLORS=['preto','preta','branco','branca','azul','vermelho','vermelha','verde','amarelo','amarela','rosa','roxo','roxa','cinza','bege','marrom'];
const GROUP_HINTS=new Set('pizza pizzaria sushi japonesa japones oriental hamburguer hamburgueria doceria doce acai sorveteria sorvete marmita padaria pastelaria churrascaria cafeteria restaurante'.split(' '));
const RETAIL=/\b(loja|lojas|comercio|comercios|empresa|empresas|ponto|pontos)\b/;
const FOOD=/\b(comida|comer|almoco|jantar|japonesa|japones|sushi|pizza|pizzaria|hamburguer|hamburgueria|lanche|doceria|doce|sorvete|sorveteria|acai|marmita|padaria|cafeteria|restaurante|churrasco|churrascaria|pastel|pastelaria)\b/;
const TYPO=new Map(Object.entries({pizaria:'pizzaria',pizeria:'pizzaria',pizzarria:'pizzaria',pizzariaa:'pizzaria',japoneza:'japonesa',japoneis:'japones',japonez:'japones',hambuguer:'hamburguer',hambuger:'hamburgueria',farmaciaa:'farmacia',sorveteriaa:'sorveteria',comecio:'comercio',restarante:'restaurante',restaurente:'restaurante'}));
const DAYS={domingo:0,segunda:1,terca:2,quarta:3,quinta:4,sexta:5,sabado:6};
const WEEKDAY_PLURALS={domingos:'domingo',segundas:'segunda',tercas:'terca',quartas:'quarta',quintas:'quinta',sextas:'sexta',sabados:'sabado',feiras:'feira'};
const DIGITS={primeira:0,primeiro:0,segunda:1,segundo:1,terceira:2,terceiro:2,quarta:3,quarto:3,quinta:4,quinto:4,sexta:5,sexto:5};
const asNum=s=>Number(String(s||'').replace(',','.'));
export function normalizeQuery(raw){const safe=String(raw||'').replace(/(\d)[.,](\d)/g,'$1DEC$2');return words(safe).map(w=>(TYPO.get(w)||WEEKDAY_PLURALS[w]||w).replace(/(\d)dec(\d)/g,'$1.$2')).join(' ')}
export function retailFoodConflict(raw){const n=normalizeQuery(raw);return RETAIL.test(n)&&FOOD.test(n)}
export function buildLexicon(taxonomy={},categoryAliases={}){
 const terms=[];
 for(const[category,groups]of Object.entries(taxonomy||{})){
  for(const term of [category,...categoryAliases[category]||[]])if(norm(term))terms.push({term:norm(term),category,group:null});
  for(const[group,aliases]of Object.entries(groups||{}))for(const term of [group,...(Array.isArray(aliases)?aliases:[])])if(norm(term))terms.push({term:norm(term),category,group});
 }
 return [...new Map(terms.map(x=>[x.category+'|'+x.group+'|'+x.term,x])).values()].sort((a,b)=>b.term.length-a.term.length);
}
export function getTaxon(text,lexicon){
 const n=normalizeQuery(text),hits=(lexicon||[]).filter(x=>has(n,x.term));
 const groups=hits.filter(x=>x.group);
 if(groups.length)return groups[0];
 if(hits.length)return hits[0];
 // Fuzzy match only long single terms, not broad category labels.
 const ts=words(n).filter(x=>x.length>=5&&!STOP.has(x));
 let best=null;
 for(const token of ts)for(const candidate of lexicon||[]){
  if(candidate.term.includes(' ')||candidate.term.length<5)continue;
  if(Math.abs(candidate.term.length-token.length)>1)continue;
  const d=editDistance(token,candidate.term);
  if(d===1&&(!best||candidate.term.length>best.term.length))best=candidate;
 }
 return best;
}
function editDistance(a,b){
 const dp=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){let prior=dp[0];dp[0]=i;for(let j=1;j<=b.length;j++){const old=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prior+(a[i-1]===b[j-1]?0:1));prior=old}}
 return dp[b.length];
}
function dayOf(n,today=new Date().getDay()){
 if(/\bdepois de amanha\b/.test(n))return(today+2)%7;
 if(/\bamanha\b/.test(n))return(today+1)%7;
 if(/\bhoje\b/.test(n))return today;
 for(const[k,v]of Object.entries(DAYS)){if(k==='segunda'&&/\b(?:a|o) segunda\b/.test(n)&&!/\bsegunda feira\b/.test(n))continue;if(new RegExp('(?:^|\\s)'+k+'(?:\\s|\\sfeira\\b|$)').test(n))return v;}
 return null;
}
const mins=(h,m)=>Number(h)*60+Number(m||0);
const amount=(n,re)=>{const m=n.match(re);return m?asNum(m[1]):null};
function parseFilters(raw,prev={},options={}){
 const n=normalizeQuery(raw),f={...prev};
 if(/\b(abert[oa]s?\s+agora|funcionando agora)\b/.test(n)){f.openNow=true;f.day=null;f.start=null;f.end=null}
 const day=dayOf(n,options.today??new Date().getDay());if(day!==null){f.day=day;f.openNow=false}
 if(/\b(sem entrega|sem delivery|nao quero entrega|nao quero delivery)\b/.test(n))f.delivery=false;
 else if(/\b(com entrega|delivery|faz entrega|entrega rapida|entrega hoje)\b/.test(n))f.delivery=true;
 if(/\b(para retirar|com retirada|retirada na loja|buscar na loja)\b/.test(n))f.pickup=true;
 else if(/\b(sem retirada)\b/.test(n))f.pickup=false;
 if(/\b(melhor avaliadas?|maior nota)\b/.test(n))f.sort='rating';
 else if(/\b(mais proxim[oa]s?|mais perto|perto de mim)\b/.test(n))f.sort='distance';
 else if(/\b(mais barat[oa]s?|barat[oa]s?|economico|economica|menor preco)\b/.test(n))f.sort='price';
 const maxKm=amount(n,/\b(?:ate|no maximo|maximo)\s*(\d+(?:[.,]\d+)?)\s*km\b/);if(maxKm!==null)f.maxDistance=maxKm;
 const maxFee=amount(n,/\b(?:frete|taxa de entrega|taxa de delivery)\s*(?:de )?(?:ate|no maximo|maximo)\s*(?:r\s*)?(\d+(?:[.,]\d+)?)\b/);if(maxFee!==null){f.maxDeliveryFee=maxFee;f.delivery=true}
 const maxDeliveryTime=amount(n,/\b(?:entrega|delivery)\s+(?:em\s+)?(?:ate|no maximo)\s*(\d+)\s*(?:min|mins|minutos)\b/);if(maxDeliveryTime!==null){f.maxDeliveryMinutes=maxDeliveryTime;f.delivery=true}
 const minRating=amount(n,/\b(?:nota|avaliacao)\s*(?:acima de|maior que|de pelo menos|minima|a partir de)\s*(\d(?:[.,]\d)?)\b/);if(minRating!==null)f.minRating=minRating;
 const priceRange=n.match(/\bentre\s*(?:r\s*)?(\d+(?:[.,]\d+)?)\s*(?:e|a)\s*(?:r\s*)?(\d+(?:[.,]\d+)?)\s*(?:reais?)?\b/);
 if(priceRange){f.minPrice=asNum(priceRange[1]);f.maxPrice=asNum(priceRange[2])}
 else{
  const maxPrice=amount(n,/\b(?:ate|menos de|maximo|no maximo)\s*(?:r\s*)?(\d+(?:[.,]\d+)?)\s*(?:reais?|rs|r)?\b(?!\s*(?:h|horas|km|m|minutos)\b)/);
  if(maxPrice!==null&&!/\b(?:frete|taxa|entrega|delivery)\s+/.test(n))f.maxPrice=maxPrice;
  const minPrice=amount(n,/\b(?:acima de|mais de|a partir de)\s*(?:r\s*)?(\d+(?:[.,]\d+)?)\s*(?:reais?)?\b/);if(minPrice!==null)f.minPrice=minPrice;
 }
 if(/\b(em promocao|promocao|com desconto|em oferta|oferta)\b/.test(n))f.promoOnly=true;
 const sz=n.match(/\b(?:tamanho|tam)\s*(pp|p|m|g|gg|xg)\b/);
 const lastSize=(/\b(camisa|camiseta|roupa|vestido|calca)\b/.test(n))?String(raw).match(/\b(PP|P|M|G|GG|XG)\b/):null;
 if(sz||lastSize)f.size=String((sz||lastSize)[1]).toUpperCase();
 const color=COLORS.find(c=>has(n,c));if(color)f.color=color;
 const q=n.match(/\b(\d{1,3})\s*(?:unidades|unidade|pares|itens|pecas)\b/);if(q)f.quantity=Number(q[1]);
 if(/\b(?:pix|pagamento por pix)\b/.test(n))f.payment='pix';
 else if(/\b(?:cartao de credito|credito)\b/.test(n))f.payment='credito';
 else if(/\b(?:cartao de debito|debito)\b/.test(n))f.payment='debito';
 else if(/\bdinheiro\b/.test(n))f.payment='dinheiro';
 const rangeAfter=n.match(/\b(?:depois das|apos as|a partir das)\s*(\d{1,2})(?::(\d{2}))?/);
 const rangeBefore=n.match(/\b(?:antes das|ate as)\s*(\d{1,2})(?::(\d{2}))?/);
 const exact=n.match(/\b(?:as)\s*(\d{1,2})(?::(\d{2}))?\s*(?:h|horas)?\b/);
 if(rangeAfter||rangeBefore||exact||/\b(madrugada|manha|tarde|noite|almoco)\b/.test(n)){
  f.openNow=false;
  if(/\bmadrugada\b/.test(n)){f.start=0;f.end=359}
  else if(/\bmanha\b/.test(n)){f.start=360;f.end=720}
  else if(/\balmoco\b/.test(n)){f.start=660;f.end=900}
  else if(/\btarde\b/.test(n)){f.start=720;f.end=1080}
  else if(/\bnoite\b/.test(n)){f.start=1080;f.end=1439}
  if(rangeAfter){f.start=mins(rangeAfter[1],rangeAfter[2]);f.end=1439}
  if(rangeBefore){f.start=0;f.end=mins(rangeBefore[1],rangeBefore[2])}
  if(exact&&!rangeAfter&&!rangeBefore){f.start=mins(exact[1],exact[2]);f.end=f.start}
 }
 return f;
}
function getReference(n){
 const num=n.match(/^(?:a |o |opcao |numero )?([1-6])(?:\b|$)/);
 if(num)return Number(num[1])-1;
 for(const[k,v]of Object.entries(DIGITS))if(new RegExp('(?:^|\\s)(?:a |o )?'+k+'\\b').test(n))return v;
 if(/\b(ultima|ultimo)\b/.test(n))return -1;
 return null;
}
export function interpret(raw,taxonomy={},aliases={},prev={},options={}){
 const text=String(raw||'').trim(),n=normalizeQuery(text),lexicon=buildLexicon(taxonomy,aliases);
 const reset=/\b(nova busca|nova pesquisa|novo chat|limpar contexto|limpar busca|comecar do zero|reiniciar)\b/.test(n);
 if(reset)return{kind:'reset',raw:text};
 if(retailFoodConflict(text))return{kind:'blocked',raw:text};
 const reference=getReference(n);
 const ask= /\b(que horas|horario|abre|fecha|funciona)\b/.test(n)?'hours':
 /\b(quanto fica com entrega|valor com entrega|preco com frete)\b/.test(n)?'total':
 /\b(entrega|delivery|frete)\b/.test(n)&&!/\b(com entrega|sem entrega|entrega rapida|entrega em ate)\b/.test(n)?'delivery':
 /\b(aceita\s+(?:pix|cartao|credito|debito|dinheiro)|pix|pagamento|cartao|credito|debito)\b/.test(n)?'payment':
 /\b(endereco|onde fica|localizacao)\b/.test(n)?'address':
 /\b(whatsapp|telefone|contato)\b/.test(n)?'contact':
 /\b(avaliacao|nota|reviews)\b/.test(n)?'rating':
 /\b(produtos|cardapio|estoque|tem|vende|tamanho)\b/.test(n)?'products':null;
 if(reference!==null&&Array.isArray(prev.lastResults)&&prev.lastResults.length)return{kind:'select',index:reference,ask,raw:text,filters:parseFilters(text,{},options)};
 if(ask&&prev.selectedStore&&!/\b(nova|outra|outro|procuro|encontrar)\b/.test(n))return{kind:'ask',ask,raw:text,filters:parseFilters(text,{},options)};
 if(prev.selectedStore&&!ask&&!getTaxon(n,lexicon)&&!/(com entrega|sem entrega|mais perto|promocao|qualquer tipo)/.test(n))return{kind:'ask',ask:'knowledge',raw:text,filters:{}};
 if(ask&&!prev.selectedStore&&/\b(ela|ele|essa|esse|a loja|essa loja)\b/.test(n))return{kind:'clarify',raw:text,reason:'store'};
 const neg=n.match(/^(.*?)\b(?:nao quero|sem|exceto|menos|tirando|evitar|excluir)\b\s+(.+)$/);
 const after=neg?.[2]||'';
 const excludedTax=after?getTaxon(after,lexicon):null;
 const positive=neg?.[1]?.trim()||n;
 let taxon=getTaxon(positive,lexicon);
 // Common food service nouns do not map to generic retail.
 if(!taxon&&/\b(restaurante|cafeteria|almoco|jantar|comer)\b/.test(positive))taxon={category:'Comida',group:null};
 const filters=parseFilters(text,{},options);
 const excludedGroups=excludedTax?.group?[norm(excludedTax.group)]:[];
 const excludeCategory=!!excludedTax?.category&&!excludedTax.group&&[norm(excludedTax.category),'roupa','roupas','tecnologia','comida','beleza','mercado','farmacia','servicos','pet','construcao','automoveis'].includes(after);
 const excludedCategories=excludeCategory?[norm(excludedTax.category)]:[];
 const excludedTerms=after&&!excludedGroups.length&&!excludeCategory&&!/^(?:entrega|retirada|frete|delivery)\b/.test(after)?[after]:[];
 const allTerms=(taxon?[taxon.term,normalizeQuery(taxon.category),normalizeQuery(taxon.group||'')]:[]).filter(Boolean);
 let semanticTerms=words(positive).filter(w=>w.length>2&&!STOP.has(w)&&!['tamanho','tam','nota','avaliacao','frete','taxa','promocao','acima','abaixo','barato','barata','economico','economica','aceita','pix','credito','debito','dinheiro','retirada','retirar','entrega','delivery','rapida','rapido','minutos','minuto','horas','hora','numero','noite','manha','tarde'].includes(w)&&!COLORS.includes(w)&&!Object.keys(DAYS).includes(w)&&!allTerms.some(t=>words(t).includes(w))&&!/^\d+(?:\.\d+)?h?$/.test(w));
 const featureTerms=semanticTerms.filter(w=>/^(vegano|vegana|vegetariano|vegetariana|familia|familiar|tranquilo|sossegado|artesanal)$/.test(w));
 const productCue=/\b(camiseta|camisa|calca|vestido|tenis|sapato|notebook|celular|smartphone|fone|produto|comprar|preciso de|tem|vende|estoque)\b/.test(n);
 const genericProduct=/\b(produto|comprar|tem|vende|estoque)\b/.test(n);
 let productTerm=null;
 if(productCue){
  const list=words(positive).filter(w=>w.length>2&&!STOP.has(w)&&!COLORS.includes(w)&&!Object.keys(DAYS).includes(w)&&!['produto','comprar','tem','vende','estoque','tamanho','tam'].includes(w)&&!taxon?.group?.toLowerCase().includes(w));
  if(list.length)productTerm=list.slice(0,3).join(' ');
 }
 if(!productTerm&&genericProduct&&prev.selectedStore)return{kind:'ask',ask:'products',raw:text,filters};
 const broad=/^(lojas?|comercios?|negocios?|estabelecimentos?|lugares?)(?:\s+(?:abert[oa]s?\s+agora|com entrega|sem entrega|com retirada))?$/.test(n);
 return{kind:'search',raw:text,normalized:n,positive,taxon,filters,excludedGroups,excludedCategories,excludedTerms,semanticTerms,featureTerms,productTerm,broad,reference,ask};
}
export function emptyState(){return{category:null,group:null,query:null,semanticTerms:[],featureTerms:[],productTerm:null,excludedGroups:[],excludedCategories:[],excludedTerms:[],filters:{},lastResults:[],selectedStore:null,selectedProduct:null,location:{city:null,uf:null,neighborhood:null}}}
export function nextState(current,plan){
 if(plan.kind!=='search')return current;
 const prev=current||emptyState(),changed=plan.taxon?.category&&plan.taxon.category!==prev.category;
 const next={...prev,filters:{...((changed||plan.broad)?{}:prev.filters),...plan.filters},category:plan.taxon?.category||prev.category,group:changed?null:prev.group,selectedStore:null,selectedProduct:null};
 if(plan.taxon?.group)next.group=plan.taxon.group;
 else if(plan.taxon?.category)next.group=null;
 if(plan.productTerm)next.productTerm=plan.productTerm;
 else if(changed||plan.taxon?.group)next.productTerm=null;
 if(plan.taxon?.category||plan.productTerm||plan.broad){next.semanticTerms=plan.semanticTerms;next.featureTerms=plan.featureTerms}
 if(plan.broad&&!plan.taxon){next.category=null;next.group=null;next.productTerm=null;next.semanticTerms=[];next.featureTerms=[]}
 next.excludedGroups=[...new Set([...((changed||plan.broad)?[]:prev.excludedGroups),...plan.excludedGroups])];
 next.excludedCategories=[...new Set([...((changed||plan.broad)?[]:prev.excludedCategories),...plan.excludedCategories])];
 next.excludedTerms=[...new Set([...((changed||plan.broad)?[]:prev.excludedTerms),...plan.excludedTerms])];
 next.query=plan.raw;
 return next;
}
function storeGroups(store){return [store.group,...(Array.isArray(store.groups)?store.groups:[])].map(norm).filter(Boolean)}
function productName(p){return norm([p.name,p.description,p.category,p.brand,p.color,(Array.isArray(p.sizes)?p.sizes:[]).join(' ')].join(' '))}
export function activePromo(p,now=Date.now()){
 const price=p.price==null?NaN:Number(p.price),promo=p.promo_price==null?NaN:Number(p.promo_price);
 return Number.isFinite(price)&&Number.isFinite(promo)&&promo>0&&promo<price&&(!p.promo_start||Date.parse(p.promo_start)<=now)&&(!p.promo_end||Date.parse(p.promo_end)>=now);
}
export function priceOf(p,now=Date.now()){return activePromo(p,now)?Number(p.promo_price):(p.price==null?NaN:Number(p.price))}
export function eligibleProduct(p,f={},now=Date.now()){
 if(p.active===false||p.show_in_ai===false||!Number.isFinite(Number(p.stock))||Number(p.stock)<=0)return false;
 if(f.quantity!=null&&Number(p.stock)<f.quantity)return false;
 if(f.promoOnly&&!activePromo(p,now))return false;
 const price=priceOf(p,now);
 if((f.minPrice!=null||f.maxPrice!=null||f.sort==='price')&&!Number.isFinite(price))return false;
 if(f.minPrice!=null&&(!Number.isFinite(price)||price<f.minPrice))return false;
 if(f.maxPrice!=null&&(!Number.isFinite(price)||price>f.maxPrice))return false;
 if(f.size&&!(Array.isArray(p.sizes)?p.sizes:[]).some(x=>norm(x)===norm(f.size)))return false;
 if(f.color&&!has(productName(p),f.color))return false;
 return true;
}
function intervalsFor(hours,storeId,weekday){
 const w=weekday??new Date().getDay();
 const intervals=[];
 const get=(day)=>hours.find(h=>h.store_id===storeId&&Number(h.weekday)===day&&!h.closed&&h.opens_at&&h.closes_at);
 for(const delta of [-1,0]){
  const h=get((w+delta+7)%7);if(!h)continue;
  const start=mins(String(h.opens_at).slice(0,2),String(h.opens_at).slice(3,5))+1440*delta;
  let end=mins(String(h.closes_at).slice(0,2),String(h.closes_at).slice(3,5))+1440*delta;
  if(end<=start)end+=1440;
  intervals.push([start,end]);
 }
 return intervals;
}
export function scheduleMatches(store,hours,f={},now=new Date()){
 if(!f.openNow&&f.day==null&&f.start==null&&f.end==null)return true;
 const weekday=f.openNow?now.getDay():f.day??now.getDay();
 const intervals=intervalsFor(hours,store.id,weekday);
 if(!intervals.length)return false;
 if(f.openNow){const m=now.getHours()*60+now.getMinutes();return intervals.some(([a,b])=>a<=m&&m<b)}
 const a=f.start??0,b=f.end??1439;
 if(a===b)return intervals.some(([from,to])=>from<=a&&to>a);
 return intervals.some(([from,to])=>from<=b&&to>a);
}
export function distanceKm(a,b){
 if(!a||b.latitude==null||b.longitude==null)return null;
 const lat=Number(b.latitude),lon=Number(b.longitude),alat=Number(a.lat),alon=Number(a.lng);
 if(![lat,lon,alat,alon].every(Number.isFinite))return null;
 const rad=x=>x*Math.PI/180,R=6371,dlat=rad(lat-alat),dlon=rad(lon-alon);
 const v=Math.sin(dlat/2)**2+Math.cos(rad(alat))*Math.cos(rad(lat))*Math.sin(dlon/2)**2;
 return R*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v));
}
export function ratingsMap(reviews=[]){
 const m=new Map();for(const r of reviews){const v=Number(r.rating);if(!Number.isFinite(v)||v<1||v>5)continue;const z=m.get(r.store_id)||{sum:0,count:0};z.sum+=v;z.count++;m.set(r.store_id,z)}
 return m;
}
function semanticHit(token,text){
 const n=norm(token);
 const families={
  vegano:/\bvegan[ao]s?\b/,vegana:/\bvegan[ao]s?\b/,
  vegetariano:/\bvegetarian[ao]s?\b/,vegetariana:/\bvegetarian[ao]s?\b/,
  familia:/\b(familia|familiar|criancas)\b/,familiar:/\b(familia|familiar|criancas)\b/,
  tranquilo:/\b(tranquil[ao]|sossegad[ao]|calm[ao])\b/,
  sossegado:/\b(tranquil[ao]|sossegad[ao]|calm[ao])\b/
 };
 return families[n]?families[n].test(text):text.includes(n);
}
export function searchStores(data={},state={},position=null,options={}){
 const stores=data.stores||[],products=data.products||[],hours=data.hours||[],reviews=data.reviews||[],knowledge=data.knowledge||[],f=state.filters||{};
 const rating=ratingsMap(reviews),max=options.limit??6,now=options.now||new Date(),output=[];
 const byStore=new Map(),kByStore=new Map();
 for(const p of products){if(!byStore.has(p.store_id))byStore.set(p.store_id,[]);byStore.get(p.store_id).push(p)}
 for(const k of knowledge)if(k.active!==false){if(!kByStore.has(k.store_id))kByStore.set(k.store_id,[]);kByStore.get(k.store_id).push(k)}
 for(const store of stores){
  if(store.active!==true||store.status!=='active')continue;
  if(state.category&&norm(store.category)!==norm(state.category))continue;
  const groups=storeGroups(store);if(state.group&&!groups.includes(norm(state.group)))continue;
  if((state.excludedCategories||[]).includes(norm(store.category)))continue;
  if(groups.some(g=>(state.excludedGroups||[]).includes(g)))continue;
  if(f.delivery===true&&!store.delivery)continue;
  if(f.delivery===false&&store.delivery)continue;
  if(f.pickup===true&&!store.pickup)continue;
  if(f.pickup===false&&store.pickup)continue;
  if(f.payment&&!Array.isArray(store.payment_methods))continue;
  if(f.payment&&!(store.payment_methods||[]).some(p=>norm(p).includes(f.payment)))continue;
  if(f.maxDeliveryFee!=null&&(!store.delivery||store.delivery_fee==null||Number(store.delivery_fee)>f.maxDeliveryFee))continue;
  if(f.maxDeliveryMinutes!=null&&(!store.delivery||store.avg_delivery_minutes==null||Number(store.avg_delivery_minutes)>f.maxDeliveryMinutes))continue;
  const where=state.location||{};if((where.city&&!norm(store.address).includes(norm(where.city)))||(where.uf&&!has(norm(store.address),where.uf))||(where.neighborhood&&!norm(store.address).includes(norm(where.neighborhood))))continue;
  if(!scheduleMatches(store,hours,f,now))continue;
  const km=distanceKm(position,store);if(f.maxDistance!=null&&(km==null||km>f.maxDistance))continue;
  const rv=rating.get(store.id),avg=rv?rv.sum/rv.count:0;
  if(f.minRating!=null&&(!rv||avg<f.minRating))continue;
  const allProducts=(byStore.get(store.id)||[]).filter(p=>eligibleProduct(p,f,now.getTime()));
  const requested=words(state.productTerm||'').filter(w=>!STOP.has(w));
  const eligible=allProducts.filter(p=>requested.every(w=>productName(p).includes(w))&&!(state.excludedTerms||[]).some(term=>has(productName(p),term)));
  const mustHaveProduct=!!state.productTerm||f.minPrice!=null||f.maxPrice!=null||f.promoOnly||f.size||f.color||f.quantity!=null||f.sort==='price'||(state.excludedTerms||[]).length>0;
  if(mustHaveProduct&&!eligible.length)continue;
  const text=norm([store.name,store.address,store.category,store.group,(store.groups||[]).join(' '),(store.specialties||[]).join(' '),store.description,...eligible.flatMap(p=>[p.name,p.description,p.category,p.brand]),...(kByStore.get(store.id)||[]).flatMap(k=>[k.question,(k.variations||[]).join(' '),k.answer])].join(' '));
  const semanticTerms=state.semanticTerms||[],featureTerms=state.featureTerms||[];
  const hits=semanticTerms.filter(t=>semanticHit(t,text));
  // A mandatory feature requested in prose must be present in store/catalog information.
  if(featureTerms.length&&!featureTerms.every(t=>semanticHit(t,text)))continue;
  if(semanticTerms.length&&!hits.length)continue;
  let score=0,reasons=[];
  if(state.category){score+=30;reasons.push('categoria '+state.category)}
  if(state.group){score+=45;reasons.push('grupo '+state.group)}
  if(eligible.length&&mustHaveProduct){score+=35;reasons.push('produto disponível em estoque')}
  if(hits.length){score+=hits.length*9;reasons.push('correspondência com sua descrição')}
  if(f.delivery===true){score+=8;reasons.push('faz entrega')}
  if(f.pickup===true){score+=7;reasons.push('permite retirada')}
  if(f.openNow){score+=10;reasons.push('aberta agora')}
  if(km!=null){score+=Math.max(0,25-km*3);reasons.push('a '+km.toFixed(1).replace('.',',')+' km')}
  if(rv){score+=Math.min(10,avg*2);reasons.push('avaliação '+avg.toFixed(1)+'/5')}
  if(norm(state.query).includes(norm(store.name))){score+=45;reasons.unshift('loja citada')}
  if(store.verified)score+=2;
  if(!score){const generic=STOP.has(norm(state.query))||/^(lojas|comercios|negocios|estabelecimentos|lugares)/.test(norm(state.query));if(!generic)continue;score=1}
  output.push({store,products:eligible,score,reason:reasons,distance:km,rating:avg,reviewCount:rv?.count||0,minPrice:eligible.length?Math.min(...eligible.map(p=>priceOf(p,now.getTime()))):null});
 }
 const sort=f.sort;
 output.sort((a,b)=>sort==='distance'?(a.distance??Infinity)-(b.distance??Infinity):sort==='price'?(a.minPrice??Infinity)-(b.minPrice??Infinity):sort==='rating'?b.rating-a.rating:b.score-a.score||String(a.store.name).localeCompare(String(b.store.name),'pt-BR'));
 return output.slice(0,max);
}
