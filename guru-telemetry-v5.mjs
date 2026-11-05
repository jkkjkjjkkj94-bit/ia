// Métricas operacionais mínimas para a GURU V5.
// Só registra pedidos de busca, nunca mensagens sociais, contatos ou IP.
const API='https://innziuzgtpfsiywqmies.supabase.co';
const KEY='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const sensitive=/(?:\b\d{8,}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/)/i;
export function safeSearchLabel(raw,group='',category=''){
 const s=String(raw||'').trim();
 if(!s||sensitive.test(s))return String(group||category||'pesquisa').slice(0,70);
 return normalize(s).slice(0,120);
}
async function post(table,body){
 try{
  const r=await fetch(API+'/rest/v1/'+table,{
   method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Prefer':'return=minimal'},
   body:JSON.stringify(body),signal:AbortSignal.timeout(3500),keepalive:true
  });
  return r.ok;
 }catch{return false}
}
export function recordSearch(raw,plan,rows=[],source='search'){
 const label=safeSearchLabel(raw,plan?.taxon?.group,plan?.taxon?.category);
 if(!label)return;
 const count=rows.length;
 const payload={
  query:label,normalized_query:label,category:plan?.taxon?.category||null,
  group_name:plan?.taxon?.group||null,result_count:count,matched:count>0,
  confidence:count?Math.min(1,Math.max(0,Number(rows[0]?.score||0)/100)):0,
  quality_score:count?Number(rows[0]?.rankScore||0):null,
  event_type:'search',
  failure_reason:count?'':source==='search'?'sem_resultados':source,
  unknown_terms:count?[]:(plan?.semanticTerms||[]).filter(w=>w.length>2).slice(0,7),
  filters:plan?.filters||{}
 };
 void post('local_ai_quality_events',payload);
 void post('local_ai_search_events',{query:label,event_type:count?'search':'unanswered',matched:count>0});
}
export function recordSelection(storeId){
 if(!/^[0-9a-f-]{36}$/i.test(String(storeId||'')))return;
 void post('local_ai_search_events',{query:'selecao_de_resultado',event_type:'selection',store_id:storeId,matched:true});
}

// V11: registra falta de resposta para uma pergunta sobre loja, com rótulo anonimizado.
export function recordUnansweredKnowledge(raw,category=''){
 const label=safeSearchLabel(raw,'',category);
 if(!label||label==='pesquisa'||label.length<3)return;
 void post('local_ai_quality_events',{
  query:label,normalized_query:label,category:category||null,
  result_count:0,matched:false,confidence:0,event_type:'unanswered',
  failure_reason:'resposta_nao_cadastrada',unknown_terms:[],filters:{}
 });
}
