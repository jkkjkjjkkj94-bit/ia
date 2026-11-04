// GURU V5 — interpretação contextual complementar, comparação baseada no catálogo
// e indicadores de qualidade. Sem rede, sem dados pessoais e sem alteração do ranking.
export const canonical = text => String(text??'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

const references={primeira:0,primeiro:0,segunda:1,segundo:1,terceira:2,terceiro:2,quarta:3,quarto:3,quinta:4,quinto:4,sexta:5,sexto:5};
const ordinalRe=/\b(primeira|primeiro|segunda|segundo|terceira|terceiro|quarta|quarto|quinta|quinto|sexta|sexto)\b/g;
const askComparison=/\b(comparar|compare|comparacao|diferenca|diferencas|qual dessas|qual delas|qual e melhor|qual vale mais a pena|qual compensa mais|qual recomendaria entre|qual voce recomenda entre)\b/;
const aboutPrevious=/\b(dessas|deles|delas|dessas lojas|das opcoes|da lista|entre elas|entre esses|entre essas|alguma delas|qual delas|qual dessas)\b/;
const deliveryRe=/\b(entrega|delivery|frete|entregam)\b/;
const cheaper=/\b(mais barat[oa]|menor preco|mais em conta|economica|economico|preco mais baixo)\b/;
const closer=/\b(mais perto|mais proxima|mais proximo|menor distancia)\b/;
const higherRated=/\b(melhor avaliada|melhor avaliadas|maior nota|mais estrelas|melhor avaliados)\b/;
const onlyStock=/\b(em estoque|disponivel|disponiveis|tem o produto)\b/;

export function contextualIntent(raw,state={}){
 const n=canonical(raw),rows=state.lastResults||[];
 if(!rows.length)return null;
 const ordinals=[...n.matchAll(ordinalRe)].map(m=>references[m[1]]);
 if(askComparison.test(n)&&(ordinals.length>=2||aboutPrevious.test(n)||/\b(compare|comparar|diferenca|qual e melhor|qual vale mais a pena)\b/.test(n))) {
  return {kind:'compare',indices:ordinals.length>=2?[...new Set(ordinals)].slice(0,3):[0,1]};
 }
 const prior=aboutPrevious.test(n)||/^e\s+(?:qual|com|a|tem)/.test(n)||/^(?:qual|quais|alguma|algum|tem|mostra|mostre|quero|me diga|me mostre|prefiro)\b/.test(n);
 if(prior){
  if(deliveryRe.test(n)&&/\b(qual|quais|alguma|algum|tem|com|entrega)\b/.test(n)&&!/\b(preco|taxa|quanto|valor|horario)\b/.test(n))return{kind:'filterPrevious',attribute:'delivery'};
  if(cheaper.test(n))return{kind:'sortPrevious',attribute:'price'};
  if(closer.test(n))return{kind:'sortPrevious',attribute:'distance'};
  if(higherRated.test(n))return{kind:'sortPrevious',attribute:'rating'};
  if(onlyStock.test(n)&&aboutPrevious.test(n))return{kind:'filterPrevious',attribute:'stock'};
 }
 return null;
}
const validDate = value => {
 if(!value)return null;
 const date=new Date(value);return Number.isFinite(date.getTime())?date:null;
};
export function storeDataQuality(store={}, data={}, now=new Date()){
 const activeProducts=(data.products||[]).filter(p=>p.store_id===store.id&&p.active===true&&p.show_in_ai===true&&Number(p.stock)>0);
 const hours=(data.hours||[]).filter(h=>h.store_id===store.id&&h.closed!==true&&h.opens_at&&h.closes_at);
 const reviews=(data.reviews||[]).filter(r=>r.store_id===store.id&&Number(r.rating)>=1&&Number(r.rating)<=5);
 const updated=validDate(store.updated_at);
 const ageDays=updated?Math.max(0,Math.floor((now.getTime()-updated.getTime())/86400000)):null;
 const checks={
  address:!!String(store.address||'').trim(),
  hours:hours.length>0,
  payment:Array.isArray(store.payment_methods)&&store.payment_methods.length>0,
  contact:!!(store.whatsapp||store.phone),
  photo:!!(store.logo_url||store.image_url),
  products:activeProducts.length>0,
  description:!!String(store.description||'').trim()
 };
 const complete=Object.values(checks).filter(Boolean).length;
 return {completed:complete,total:Object.keys(checks).length,missing:Object.keys(checks).filter(k=>!checks[k]),
  updatedAt:updated?.toISOString()||null,daysSinceUpdate:ageDays,stale:ageDays!==null&&ageDays>90,
  activeProducts:activeProducts.length,reviewCount:reviews.length};
}
export function compareStores(rows=[], data={}, currency = amount => String(amount)){
 const selected=rows.filter(Boolean).slice(0,3);
 const ratings=(data.reviews||[]);
 return selected.map(r=>{
  const s=r.store||{},available=(r.products||[]).filter(p=>p.active===true&&Number(p.stock)>0);
  const validPrices=available.map(p=>Number(p.promo_price??p.price)).filter(Number.isFinite);
  const rated=ratings.filter(x=>x.store_id===s.id&&Number(x.rating)>=1&&Number(x.rating)<=5);
  const rating=rated.length?rated.reduce((sum,x)=>sum+Number(x.rating),0)/rated.length:null;
  const q=storeDataQuality(s,data);
  return {
    name:String(s.name||'Estabelecimento'),score:Number.isFinite(r.rankScore)?r.rankScore:null,
    delivery:s.delivery===true,deliveryFee:s.delivery===true&&s.delivery_fee!=null?Number(s.delivery_fee):null,
    distance:Number.isFinite(r.distance)?r.distance:null,price:validPrices.length?Math.min(...validPrices):null,
    rating,ratingCount:rated.length,productCount:available.length,
    location:s.address||null,stale:q.stale,quality:q
  };
 });
}
export function comparisonSummary(items=[],topic=''){
 if(!items.length)return 'Ainda não encontrei opções para comparar.';
 if(items.length===1)return 'Só encontrei uma opção válida na lista atual. Posso procurar mais alternativas.';
 const n=canonical(topic),first=items[0],second=items[1];
 let detail='';
 if(cheaper.test(n)&&items.every(x=>x.price!==null)){
  const winner=[...items].sort((a,b)=>a.price-b.price)[0];
  detail=winner.name+' tem o menor preço de produto cadastrado entre essas opções.';
 }else if(closer.test(n)&&items.every(x=>x.distance!==null)){
  detail=[...items].sort((a,b)=>a.distance-b.distance)[0].name+' está mais perto da localização informada.';
 }else if(higherRated.test(n)&&items.every(x=>x.rating!==null)){
  detail=[...items].sort((a,b)=>b.rating-a.rating)[0].name+' tem a maior média de avaliações cadastradas.';
 }else{
  detail='Compare entrega, localização e avaliações verificadas abaixo; quando um dado não foi informado, ele aparece como não disponível.';
 }
 return 'Comparei '+first.name+' e '+second.name+'. '+detail+' A pontuação GURU é uma classificação interna, não a nota dada pelos clientes.';
}
export function followupPrompts(rows=[],state={}){
 if(!rows.length)return[];
 const prompts=[];
 if(rows.length>=2)prompts.push('Compare a primeira e a segunda');
 if(rows.some(r=>r.store?.delivery))prompts.push('Qual dessas tem entrega?');
 if(rows.some(r=>r.minPrice!=null))prompts.push('Qual é mais barata?');
 if(rows.some(r=>r.distance!=null))prompts.push('Qual fica mais perto?');
 if(state.selectedStore)prompts.push('Qual o horário dela?');
 return prompts.slice(0,3);
}
export function suggestBroadConversation(text){
 const n=canonical(text);
 if(/\b(estou com fome|to com fome|nao sei o que comer|quero comer alguma coisa|quero pedir comida)\b/.test(n)&&!/(pizzaria|pizza|sushi|hamburg|cafeteria|doceria|restaurante|padaria)/.test(n))
  return {text:'Posso te ajudar a decidir! Você prefere pizza, lanche, comida japonesa ou uma cafeteria?',options:['Pizzaria com entrega','Hamburgueria','Comida japonesa','Cafeteria']};
 return null;
}
