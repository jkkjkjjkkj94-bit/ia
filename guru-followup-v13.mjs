// GURU v13: refinamentos curtos preservam o assunto e os filtros anteriores.
// Só ativa após resultados de busca; perguntas sobre uma loja selecionada
// ("ela entrega?") continuam sendo respondidas pelos campos estruturados.
import {normalizeQuery} from './guru-engine-v4-core.mjs';

const REFINEMENTS=[
  {pattern:/^(?:com|que (?:tenham|tenham a opcao de)) entrega(?:s)?$/,query:'com entrega'},
  {pattern:/^sem entrega(?:s)?$/,query:'sem entrega'},
  {pattern:/^com retirada$/,query:'com retirada'},
  {pattern:/^sem retirada$/,query:'sem retirada'},
  {pattern:/^(?:(?:que (?:estejam|fiquem) )?abert[oa]s?|funcionando) agora$/,query:'abertas agora'},
  {pattern:/^mais (?:proxim[oa]s?|perto)$/,query:'mais perto'},
  {pattern:/^mais bem avaliadas?$/,query:'melhor avaliadas'},
  {pattern:/^ate (\d+(?:[.,]\d+)?) km$/,query:null},
  {pattern:/^ate (\d+(?:[.,]\d+)?) reais?$/,query:null}
];
function piece(raw){
 const n=normalizeQuery(raw);
 // Remover apenas marcadores de continuação. Negação e outras condições ficam intactas.
 const stripped=n.replace(/^(?:(?:e|so|somente|apenas|quero|mostre|mostrar|me|as|os|a|o)\s+){1,6}/,'').trim();
 for(const rule of REFINEMENTS){
  if(rule.pattern.test(stripped)){
   return rule.query||stripped;
  }
 }
 return null;
}
export function followupRefinement(raw,state={}){
 if(!Array.isArray(state.lastResults)||!state.lastResults.length)return null;
 if(!(state.category||state.group||state.productTerm||state.specialtyTerm))return null;
 const n=normalizeQuery(raw);
 if(!n||n.length>110)return null;
 // Uma consulta livre ou um pedido de seleção não pode ser reescrito como filtro.
 const chunks=n.split(/\s+e\s+(?=(?:com|sem|abert|funcionando|ate)\b)/);
 if(chunks.length>3)return null;
 const parts=chunks.map(piece);
 if(parts.some(x=>!x))return null;
 return {query:parts.join(' e '),kind:'refine'};
}
