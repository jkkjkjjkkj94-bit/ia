// GURU V10: vocabulário compartilhado somente leitura e aprovado no AIDB.
import {normalizeQuery} from './guru-engine-v4-core.mjs';
const normalized=s=>normalizeQuery(s);
const present=(text,phrase)=>(' '+text+' ').includes(' '+phrase+' ');
export function validatedAliases(rows=[],data={}){
 const active=(data.stores||[]).filter(s=>s.active===true&&s.status==='active');
 const activeIds=new Set(active.map(s=>s.id));
 const products=(data.products||[]).filter(p=>activeIds.has(p.store_id)&&p.active===true&&p.show_in_ai===true&&Number(p.stock)>0);
 const catalog=normalized([
  ...active.flatMap(s=>[s.name,s.category,s.group,...(Array.isArray(s.groups)?s.groups:[])]),
  ...products.map(p=>p.name)
 ].join(' '));
 const result=[],seen=new Set();
 for(const row of Array.isArray(rows)?rows:[]){
  if(row.active===false)continue;
  const phrase=normalized(row.phrase),replacement=normalized(row.replacement);
  if(phrase.length<3||replacement.length<3||phrase.length>80||replacement.length>80||phrase===replacement)continue;
  if(!present(catalog,replacement))continue;
  const key=phrase+'|'+replacement;
  if(seen.has(key))continue;
  seen.add(key);result.push({phrase,replacement});
 }
 return result.slice(0,200);
}
export function sharedAlternatives(raw,rows=[],data={}){
 const query=normalized(raw);
 if(!query||query.length>280||/(^| )(sem|nao|exceto|evitar|tirando)( |$)/.test(query))return [];
 const aliases=validatedAliases(rows,data);
 const output=[],seen=new Set([query]);
 for(const {phrase,replacement} of aliases){
  if(!present(query,phrase))continue;
  // Negação imediata à expressão nunca vira recomendação positiva.
  const preceding=(' '+query+' ').split(' '+phrase+' ')[0].trim().split(' ').slice(-1)[0];
  if(['nao','sem','exceto','evitar'].includes(preceding))continue;
  const parts=query.split(' ');
  const phraseParts=phrase.split(' '),replacements=[];
  for(let i=0;i<parts.length;i++){
   if(parts.slice(i,i+phraseParts.length).join(' ')===phrase){
    replacements.push(...replacement.split(' '));i+=phraseParts.length-1;
   }else replacements.push(parts[i]);
  }
  const candidate=replacements.join(' ');
  if(!seen.has(candidate)){
   seen.add(candidate);
   output.push({query:candidate,mode:'approved-alias',changes:[{from:phrase,to:replacement}]});
  }
  if(output.length>=5)break;
 }
 return output;
}
