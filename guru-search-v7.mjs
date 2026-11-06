// GURU V7 — compreensão de intenção em linguagem natural, relevância
// verificável e ajuda quando o catálogo não possui correspondência.
// Somente dados do COREDB já carregados. Não há fetch, embeddings ou API externa.
import {norm,normalizeQuery,eligibleProduct} from './guru-engine-v4-core.mjs';
import {searchAlternatives,catalogVocabulary} from './guru-search-v6.mjs';

// Relações de linguagem natural com um tipo de estabelecimento, nunca com um produto
// supostamente disponível. A expansão é aceita SOMENTE se existir a categoria no COREDB.
const CONCEPTS=[
 {phrases:[/\b(tomar|beber|pedir)\s+(um\s+)?cafe\b/,/\b(cafe\s+da\s+manha|cafezinho)\b/],terms:['cafeteria','cafe']},
 {phrases:[/\b(comer|pedir|comprar)\s+(uma\s+)?pizza\b/,/\b(lugar|local)\s+(para\s+)?pizza\b/],terms:['pizzaria','pizza']},
 {phrases:[/\b(comer|pedir)\s+(um\s+)?(hamburguer|lanche)\b/],terms:['hamburgueria','lanchonete']},
 {phrases:[/\b(remedios?|medicamentos?)\b/],terms:['farmacia','drogaria']},
 {phrases:[/\b(cortar\s+(o\s+)?cabelo|corte\s+de\s+cabelo)\b/],terms:['barbearia','salao']},
 {phrases:[/\b(comprar|procurar)\s+(um\s+)?(celular|smartphone)\b/],terms:['celular','eletronicos']},
 {phrases:[/\b(fazer\s+as\s+compras|comprar\s+mantimentos)\b/],terms:['mercado','supermercado']}
];
const STOP=new Set(('quero queria gostaria preciso procurar procuro busque buscar encontre encontrar onde qual quais '+
 'a o as os um uma uns umas de do da dos das para por com em na no nas nos me voce poderia '+
 'tem existe existem loja lojas lugar lugares algum alguma produto produtos agora hoje '+
 'ate mais menos preco reais real entrega frete aberto aberta tamanho estoque cor').split(' '));
const tokens=text=>normalizeQuery(text).split(' ').filter(x=>x.length>=3&&!STOP.has(x)&&!/\d/.test(x));
const uniq=arr=>[...new Set(arr)];
const words=text=>norm(text).split(' ').filter(Boolean);
function activeStores(data={}){
 return (data.stores||[]).filter(s=>s.active===true&&s.status==='active');
}
function knownTaxonomyTerms(data={},taxonomy={}){
 const pool=new Set();
 for(const store of activeStores(data)){
  for(const value of [store.category,store.group,...(Array.isArray(store.groups)?store.groups:[])])
   for(const token of words(value))pool.add(token);
 }
 for(const [category,groups] of Object.entries(taxonomy||{})){
  for(const token of words(category))pool.add(token);
  for(const group of Object.keys(groups||{}))for(const token of words(group))pool.add(token);
 }
 return pool;
}
export function conceptAlternatives(raw,data={},taxonomy={}){
 const n=normalizeQuery(raw),available=knownTaxonomyTerms(data,taxonomy),result=[];
 for(const concept of CONCEPTS){
  if(!concept.phrases.some(re=>re.test(n)))continue;
  const term=concept.terms.find(t=>available.has(t));
  if(!term||words(n).includes(term))continue;
  // Preserve other words, numeric requirements and negative constraints unchanged.
  result.push({query:n+' '+term,mode:'concept',changes:[{from:'expressao',to:term}]});
 }
 return result.slice(0,2);
}
export function guidedSearchAlternatives(raw,data={},taxonomy={},aliases={}){
 const literal=normalizeQuery(raw),out=[],seen=new Set([literal]);
 const append=item=>{
  const normalized=normalizeQuery(item.query);
  if(!normalized||seen.has(normalized))return;
  seen.add(normalized);out.push({...item,query:normalized});
 };
 for(const item of searchAlternatives(raw,data,taxonomy,aliases))append(item);
 for(const item of conceptAlternatives(raw,data,taxonomy))append(item);
 return out.slice(0,5);
}
function storeText(store,products=[]){
 return norm([store.name,store.category,store.group,(store.groups||[]).join(' '),
  (store.specialties||[]).join(' '),store.description,
  ...products.filter(p=>eligibleProduct(p)).flatMap(p=>[p.name,p.category,p.description,p.brand])].join(' '));
}
export function evidenceForRow(query,row={},data={}){
 const store=row.store||{};
 const all=(row.products||[]).filter(p=>eligibleProduct(p));
 const name=norm(store.name),category=norm([store.category,store.group,(store.groups||[]).join(' ')].join(' '));
 const product=norm(all.flatMap(p=>[p.name,p.category,p.description,p.brand]).join(' '));
 const rest=storeText(store,all);
 const meaningful=uniq(tokens(query)).slice(0,12);
 let relevance=0,matched=0;
 const reasons=[];
 for(const t of meaningful){
  const exact=(field)=>words(field).includes(t);
  if(exact(name)){relevance+=8;matched++;}
  else if(exact(category)){relevance+=6;matched++;}
  else if(exact(product)){relevance+=5;matched++;}
  else if(exact(rest)){relevance+=2;matched++;}
 }
 if(matched){reasons.push(matched+' termo'+(matched>1?'s':'')+' da pergunta presente'+(matched>1?'s':'')+' no cadastro');}
 if(row.products?.length&&row.products.some(p=>eligibleProduct(p)))reasons.push('produto disponível confirmado no catálogo');
 if(row.distance!=null)reasons.push('distância calculada com coordenadas cadastradas');
 return {relevance,matched,terms:meaningful.length,reasons};
}
export function rerankSearchResults(rows=[],query='',data={},sort=null){
 // Preserva a regra já estabelecida da GURU: classificação maior aparece antes.
 // Relevância serve exclusivamente como desempate entre pontuações idênticas.
 // Esta etapa apenas anexa evidências. A ordenação final é responsabilidade de contextualRank.
 // Preservar a ordem de entrada também mantém ordenações explícitas do usuário.
 const decorated=rows.map(row=>({row,evidence:evidenceForRow(query,row,data)}));
 return decorated.map(({row,evidence})=>({...row,
  relevanceEvidence:evidence,
  reason:uniq([...(row.reason||[]),...evidence.reasons]).slice(0,9)
 }));
}
export function noResultGuidance(query,data={},taxonomy={},aliases={}){
 const available=activeStores(data);
 if(!available.length)return {message:'Ainda não há estabelecimentos ativos no catálogo interno.',suggestions:[]};
 const vocabulary=catalogVocabulary(data,taxonomy,aliases);
 const normalized=normalizeQuery(query);
 const attempts=guidedSearchAlternatives(query,data,taxonomy,aliases).slice(0,3);
 const suggestions=[];
 for(const candidate of attempts){
  if(candidate.query!==normalized&&suggestions.length<2)suggestions.push(candidate.query);
 }
 // Opções amplas somente sugeridas ao usuário, nunca executadas sem permissão:
 // alterar a frase poderia descartar filtros que o usuário exigiu.
 if(!suggestions.length){
  const normalizedTerms=tokens(query);
  const related=uniq(available.map(s=>s.group||s.category).filter(Boolean))
   .filter(s=>words(s).some(t=>normalizedTerms.includes(t)||vocabulary.has(t)&&normalizedTerms.some(w=>w.startsWith(t.slice(0,4)))))
   .slice(0,2);
  for(const candidate of related)if(!suggestions.includes(candidate))suggestions.push(candidate);
 }
 return {
  message:'Não encontrei correspondências no catálogo interno com todos os requisitos informados. Não removi filtros de preço, estoque, entrega ou horário.',
  suggestions:suggestions.slice(0,3)
 };
}
