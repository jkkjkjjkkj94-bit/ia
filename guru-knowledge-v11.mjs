// GURU V11 — respostas administrativas validadas e normalização de perguntas.
import {normalizeQuery} from './guru-engine-v4-core.mjs';
export function approvedAnswerFor(raw,answers=[]){
 const question=normalizeQuery(raw);
 if(question.length<3||question.length>200)return null;
 for(const item of Array.isArray(answers)?answers:[]){
  if(item.active!==true||typeof item.answer!=='string'||!item.answer.trim())continue;
  const samples=[item.question,...(Array.isArray(item.variations)?item.variations:[])];
  if(samples.some(q=>normalizeQuery(q)===question)){
   return {id:item.id,answer:item.answer.trim()};
  }
 }
 return null;
}
const STOP=new Set('por favor gentileza voce poderia consegue gostaria quero queria preciso um uma uns umas de da do dos das para com em na no nas nos a o as os me eu tem alguma algum encontrar encontre buscar busque procurar procure ache achar que qual quais onde loja lojas estabelecimento estabelecimentos produto produtos hoje agora'.split(' '));
export function patternKey(raw){
 const clean=normalizeQuery(raw);
 if(!clean||clean.length>200)return '';
 const words=clean.split(' ').filter(t=>t.length>2&&!STOP.has(t)).slice(0,12);
 return [...new Set(words)].sort().join(' ').slice(0,160);
}
