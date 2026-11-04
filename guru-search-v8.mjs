// GURU V8 — expansão contextual conservadora, baseada apenas no catálogo cadastrado.
// Não consulta sites, não cria produtos e não relaxa requisitos obrigatórios.
import {norm,normalizeQuery,eligibleProduct} from './guru-engine-v4-core.mjs';

const STOP = new Set('por favor poderia voce voces consegue conseguiria gostaria queria quero preciso buscar busque encontre encontrar achar ache procure pesquisar pesquise me indique recomendar recomende mostre mostrar um uma uns umas o a os as de da do das dos para por com em no na nos nas que qual quais onde eu tem existe existem loja lojas estabelecimento estabelecimentos produto produtos'.split(' '));
const SYNONYMS = [
  ['tenis','calcado'],['calcado','tenis'],
  ['smartphone','celular'],['celular','smartphone'],
  ['fone de ouvido','headset'],['headset','fone'],
  ['camisa','camiseta'],['camiseta','camisa'],
  ['perfumaria','perfume'],['perfume','perfumaria'],
  ['mercado','supermercado'],['supermercado','mercado'],
  ['lanche','lanchonete'],['lanche','hamburgueria'],
  ['cafe','cafeteria'],['cafeteria','cafe'],
  ['pizza','pizzaria'],['pizzaria','pizza'],
  ['remedio','farmacia'],['medicamento','farmacia'],
  ['corte de cabelo','barbearia'],['corte de cabelo','salao'],
  ['academia','fitness'],['roupas esportivas','esportivo']
];
const singular = word => {
 if(word.endsWith('oes') && word.length>5)return word.slice(0,-3)+'ao';
 if(word.endsWith('ais') && word.length>5)return word.slice(0,-3)+'al';
 if(word.endsWith('es') && word.length>5)return word.slice(0,-2);
 if(word.endsWith('s') && word.length>4)return word.slice(0,-1);
 return word;
};
const tokens=s=>normalizeQuery(s).split(' ').filter(Boolean);
function phraseIn(sentence,phrase){
 return (' '+sentence+' ').includes(' '+phrase+' ');
}
function vocabulary(data={},taxonomy={},aliases={}){
 const words=new Set();
 const add=s=>{const n=normalizeQuery(s);if(!n)return;words.add(n);for(const t of tokens(n))words.add(t)};
 for(const store of data.stores||[]){
  if(store.active!==true||store.status!=='active')continue;
  for(const v of [store.name,store.category,store.group,store.description,...(store.groups||[]),...(store.specialties||[])])add(v);
 }
 const activeIds=new Set((data.stores||[]).filter(s=>s.active===true&&s.status==='active').map(s=>s.id));
 for(const p of data.products||[]){
  if(!activeIds.has(p.store_id)||!eligibleProduct(p))continue;
  for(const v of [p.name,p.category,p.brand,p.description])add(v);
 }
 for(const [category,groups] of Object.entries(taxonomy||{})){
  // Taxonomia só complementa conceitos de lojas realmente cadastradas.
  if(![...words].some(w=>w===normalizeQuery(category)))continue;
  for(const v of aliases[category]||[])add(v);
  for(const [group,values] of Object.entries(groups||{})){
   if(!words.has(normalizeQuery(group)))continue;
   for(const v of values||[])add(v);
  }
 }
 return words;
}
export function catalogAwareAlternatives(raw,data={},taxonomy={},aliases={}){
 const original=normalizeQuery(raw),vocab=vocabulary(data,taxonomy,aliases),out=[],seen=new Set([original]);
 const add=(query,mode,from,to)=>{
  const q=normalizeQuery(query);
  if(!q||seen.has(q))return;
  seen.add(q);out.push({query:q,mode,changes:[{from,to}]});
 };
 // Expressões extensas são detectadas no texto inteiro, sem depender de verbo de busca.
 for(const [from,to] of SYNONYMS){
  if(!phraseIn(original,from)||!vocab.has(to))continue;
  add(original.replace(new RegExp('\\b'+from.replace(/ /g,'\\s+')+'\\b','g'),to),'catalog-context',from,to);
 }
 // Flexões simples: correção somente quando a palavra normalizada está no cadastro.
 for(const word of new Set(tokens(original))){
  if(word.length<5||STOP.has(word)||vocab.has(word)||/\d/.test(word))continue;
  const candidate=singular(word);
  if(candidate!==word&&vocab.has(candidate)){
   add(tokens(original).map(w=>w===word?candidate:w).join(' '),'catalog-inflection',word,candidate);
  }
 }
 return out.slice(0,6);
}
