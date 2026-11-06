// GURU V9: classificação contextual e aprendizado local a partir de escolhas explícitas.
// Nunca altera estoque, horários, status, pontuação administrativa ou dados remotos.
import {norm,normalizeQuery} from './guru-engine-v4-core.mjs';

const KEY='guru_v9_relevance_feedback';
const MAX_QUERIES=120;
const STOP=new Set(('por favor poderia consegue gostaria queria quero preciso busque buscar encontre encontrar achar procure pesquisar pesquise indicar indique me voce voces eu o a os as um uma de do da dos das na no nas nos em para por com que qual quais onde loja lojas estabelecimento estabelecimentos produto produtos aqui agora hoje existe tem seja alguma algum').split(' '));
const synonyms=new Map([
 ['smartphone','celular'],['smartphones','celular'],['celulares','celular'],
 ['drogaria','farmacia'],['drogarias','farmacia'],['medicamentos','remedio'],
 ['pizzarias','pizzaria'],['hamburgueres','hamburguer'],
 ['cafes','cafe'],['cafezinho','cafe'],['cafeterias','cafeteria'],
 ['camisetas','camiseta'],['tenis','tenis'],['calcados','calcado'],
 ['mercados','mercado'],['supermercados','supermercado'],
 ['lanchonetes','lanchonete'],['notebooks','notebook']
]);
const wordTokens=value=>normalizeQuery(value).split(' ').filter(Boolean);
const canonicalTokens=value=>[...new Set(wordTokens(value).filter(t=>t.length>2&&!STOP.has(t)&&!(/^\d+$/.test(t))).map(t=>synonyms.get(t)||t))];
function read(){
 try{
  const data=JSON.parse(localStorage.getItem(KEY)||'{}');
  return data&&typeof data==='object'&&!Array.isArray(data)?data:{};
 }catch{return {};}
}
function write(value){try{localStorage.setItem(KEY,JSON.stringify(value));}catch{}}
function keyForQuery(query){
 const terms=canonicalTokens(query).slice(0,10);
 return terms.length?terms.sort().join(' '):'';
}
export function rememberSelection(query,storeId){
 const key=keyForQuery(query),id=String(storeId??'');
 if(!key||!id||id.length>100)return false;
 const db=read();
 const row=db[key]&&typeof db[key]==='object'?db[key]:{};
 row[id]=Math.min(15,Math.max(0,Number(row[id])||0)+1);
 delete db[key];
 db[key]=row;
 const keys=Object.keys(db);
 for(const k of keys.slice(0,Math.max(0,keys.length-MAX_QUERIES)))delete db[k];
 write(db);
 return true;
}
export function learningStats(){
 const saved=read();
 return {queries:Object.keys(saved).length,scope:'local',source:'seleções explícitas'};
}
export function rankV9(rows=[],query='',sort=null){
 if(!Array.isArray(rows)||!rows.length)return [];
 const learned=read()[keyForQuery(query)]||{};
 const queryTerms=canonicalTokens(query);
 const normalized=norm(query);
 const evaluated=rows.map(row=>{
  const store=row.store||{};
  const name=norm(store.name);
  const group=norm([store.category,store.group,...(Array.isArray(store.groups)?store.groups:[])].join(' '));
  const products=norm((row.products||[]).map(p=>[p.name,p.category,p.brand].join(' ')).join(' '));
  const info=norm([store.description,...(Array.isArray(store.specialties)?store.specialties:[])].join(' '));
  let relevance=0;
  for(const term of queryTerms){
   if((' '+name+' ').includes(' '+term+' '))relevance+=12;
   else if((' '+group+' ').includes(' '+term+' '))relevance+=9;
   else if((' '+products+' ').includes(' '+term+' '))relevance+=8;
   else if((' '+info+' ').includes(' '+term+' '))relevance+=3;
  }
  if(name&&normalized.includes(name))relevance+=30;
  const learnedCount=Number(learned[String(store.id)]||0);
  // Aprendizado influencia apenas empates e nunca altera o score administrativo.
  return {...row,contextScore:relevance,learningSignals:learnedCount};
 });
 // Apenas agrega sinais: contextualRank é o único classificador final.
 // Não reordene aqui, inclusive quando o usuário pediu preço, distância ou nota.
 return evaluated;
}
