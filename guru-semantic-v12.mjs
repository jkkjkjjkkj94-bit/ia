// GURU 2.0 — compreensão de necessidades indiretas, limitada ao catálogo ativo.
// Não inventa disponibilidade ou serviços e não consulta fontes externas.
import {normalizeQuery} from './guru-engine-v4-core.mjs';

const RULES=[
 {pattern:/\b(?:fazer|aparar|cuidar|tirar)\s+(?:a\s+)?barba\b/,categories:['barbearia']},
 {pattern:/\b(?:fazer|pintar|arrumar)\s+(?:as\s+)?unhas\b/,categories:['manicure','esmalteria']},
 {pattern:/\b(?:consertar|arrumar|reparar)\s+(?:o\s+|a\s+|meu\s+|minha\s+)?(?:computador|notebook|pc)\b/,categories:['assistencia tecnica','informatica']},
 {pattern:/\b(?:consertar|arrumar|reparar|trocar\s+a\s+tela\s+d[eo])\s+(?:o\s+|meu\s+)?(?:celular|smartphone)\b/,categories:['assistencia tecnica','conserto de celulares']},
 {pattern:/\b(?:meu\s+)?pneu\s+(?:furou|furado)\b/,categories:['borracharia']},
 {pattern:/\b(?:meu|minha)\s+(?:carro|moto)\s+(?:quebrou|nao\s+liga)\b/,categories:['oficina mecanica','mecanica']},
 {pattern:/\b(?:quero|preciso|gostaria\s+de)\s+(?:um\s+)?(?:lugar\s+)?(?:para\s+)?jantar\b/,categories:['restaurante']},
 {pattern:/\b(?:encomendar|comprar|pedir)\s+(?:um\s+)?bolo\s+de\s+aniversario\b/,categories:['confeitaria','padaria']}
];
const NEGATIVE=/\b(?:nao|sem|exceto|evitar|tirando)\b/;
const words=s=>normalizeQuery(s).split(' ').filter(Boolean);
const includesPhrase=(text,term)=>(' '+text+' ').includes(' '+term+' ');
function activeCategories(data={}){
 const out=new Set();
 for(const store of data.stores||[]){
  if(store.active!==true||store.status!=='active')continue;
  for(const field of [store.category,store.group,...(Array.isArray(store.groups)?store.groups:[])]){
   const phrase=normalizeQuery(field);
   if(phrase)out.add(phrase);
  }
 }
 return out;
}
export function semanticNeedAlternatives(raw,data={}){
 const n=normalizeQuery(raw);
 if(!n||n.length>280||NEGATIVE.test(n))return [];
 const active=activeCategories(data),out=[],seen=new Set([n]);
 for(const rule of RULES){
  if(!rule.pattern.test(n))continue;
  const category=rule.categories.find(c=>[...active].some(v=>includesPhrase(v,c)||includesPhrase(c,v)&&v.length>=6));
  if(!category)continue;
  const replaced=normalizeQuery(n.replace(rule.pattern,' '+category+' '));
  // Nomes, horários, preço e demais restrições fora da expressão permanecem intactos.
  if(!replaced||seen.has(replaced))continue;
  seen.add(replaced);
  out.push({query:replaced,mode:'semantic-need',changes:[{from:n.match(rule.pattern)?.[0]||'',to:category}]});
  if(out.length===3)break;
 }
 return out;
}
