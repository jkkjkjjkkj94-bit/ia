import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import {patternKey} from './guru-knowledge-v11.mjs?v=1';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const $=id=>document.getElementById(id);
let currentUser=null,proposals=[];
const STOP=new Set(('por favor por gentileza voce poderia consegue gostaria quero queria preciso um uma uns umas de da do dos das para com por sem em na no nas nos a o as os me eu tem alguma algum encontrar encontre buscar busque procurar procure ache achar que qual quais onde loja lojas estabelecimento estabelecimentos produto produtos hoje agora').split(' '));
const norm=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const safe=value=>{
 const s=norm(value).slice(0,150);
 return s.length>=3&&!/[\w.+-]+@[\w.-]+\.[a-z]{2,}/.test(String(value))&&!/\b\d{8,}\b/.test(s)&&!(/https?:\/\//.test(String(value)))?s:'';
};
function clusterKey(s){
 const terms=s.split(' ').filter(t=>t.length>2&&!STOP.has(t)).slice(0,12);
 return [...new Set(terms)].sort().join(' ').slice(0,160);
}
const message=s=>{$('message').textContent=s};
async function verify(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session?.user)return false;
 const {data,error}=await sb.from('local_ai_profiles').select('role').eq('user_id',session.user.id).maybeSingle();
 if(error||data?.role!=='admin')return false;
 currentUser=session.user;return true;
}
async function load(){
 const {data,error}=await sb.from('guru_knowledge_proposals').select('*').order('occurrences',{ascending:false}).limit(500);
 if(error)throw error;
 proposals=data||[];
 for(const status of ['pending','approved','rejected'])$(status).textContent=proposals.filter(p=>p.status===status).length;
 render();
}
function node(tag,cls,text){
 const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;
 return el;
}
function render(){
 const status=$('statusFilter').value,items=proposals.filter(p=>status==='all'||p.status===status);
 $('list').replaceChildren();
 if(!items.length){$('list').appendChild(node('p','muted','Nenhuma sugestão nesta categoria.'));return}
 for(const p of items){
  const card=node('article','item');
  card.appendChild(node('h3','',p.sample_question));
  card.appendChild(node('div','meta',p.occurrences+' ocorrência(s) · '+p.status+' · '+(p.suggested_category||'sem categoria')));
  if(p.status==='pending'){
   card.appendChild(node('label','muted','Resposta revisada pelo administrador'));
   const answer=node('textarea');answer.placeholder='Escreva uma resposta factual, verificável e que não dependa de informações desatualizadas.';answer.maxLength=2000;
   if(p.proposed_answer)answer.value=p.proposed_answer;
   card.appendChild(answer);
   const bar=node('div','toolbar');
   const approve=node('button','primary','Aprovar e publicar');
   approve.onclick=async()=>{
    const value=answer.value.trim();
    if(value.length<15){message('A resposta deve ter pelo menos 15 caracteres.');return}
    approve.disabled=true;
    try{
     const {error}=await sb.rpc('guru_v11_approve_proposal',{p_proposal_id:p.id,p_answer:value});
     if(error)throw error;
     message('Conhecimento aprovado e publicado.');await load();
    }catch(e){message('Não foi possível aprovar: '+e.message)}
    finally{approve.disabled=false}
   };
   const reject=node('button','','Rejeitar');
   reject.onclick=async()=>{
    reject.disabled=true;
    try{
     const {error}=await sb.from('guru_knowledge_proposals').update({status:'rejected',reviewed_at:new Date().toISOString(),reviewed_by:currentUser.id}).eq('id',p.id).eq('status','pending');
     if(error)throw error;
     message('Sugestão rejeitada.');await load();
    }catch(e){message('Erro ao rejeitar: '+e.message)}
    finally{reject.disabled=false}
   };
   bar.append(approve,reject);card.appendChild(bar);
  }else if(p.proposed_answer){
   card.appendChild(node('p','muted',p.proposed_answer));
  }
  $('list').appendChild(card);
 }
}
async function analyze(){
 const button=$('analyze');button.disabled=true;message('Analisando registros de buscas sem resultados...');
 try{
  // A origem já tem RLS: apenas o administrador pode consultar os eventos.
  const {data,error}=await sb.from('local_ai_quality_events')
   .select('normalized_query,query,category,event_type,result_count,created_at')
   .or('result_count.eq.0,event_type.eq.unanswered')
   .order('created_at',{ascending:false}).limit(2000);
  if(error)throw error;
  const grouped=new Map();
  for(const event of data||[]){
   const label=safe(event.normalized_query||event.query);
   if(!label)continue;
   const key=patternKey(label);
   if(!key||key.length<3)continue;
   const item=grouped.get(key)||{normalized_query:key,sample_question:label,suggested_category:event.category||null,occurrences:0,first_seen_at:event.created_at,last_seen_at:event.created_at};
   item.occurrences++;
   if(event.created_at>item.last_seen_at){item.last_seen_at=event.created_at;item.sample_question=label}
   if(event.created_at<item.first_seen_at)item.first_seen_at=event.created_at;
   grouped.set(key,item);
  }
  const known=new Map(proposals.map(p=>[p.normalized_query,p]));
  let count=0;
  for(const entry of [...grouped.values()].sort((a,b)=>b.occurrences-a.occurrences).slice(0,100)){
   const previous=known.get(entry.normalized_query);
   if(previous){
    // Não reabre conhecimento aprovado ou rejeitado. A contagem é idempotente.
    if(previous.status!=='pending'||previous.occurrences>=entry.occurrences)continue;
    const {error}=await sb.from('guru_knowledge_proposals').update({
     occurrences:entry.occurrences,last_seen_at:entry.last_seen_at
    }).eq('id',previous.id).eq('status','pending');
    if(error)throw error;
   }else{
    const {error}=await sb.from('guru_knowledge_proposals').insert(entry);
    if(error&&error.code!=='23505')throw error;
   }
   count++;
  }
  message('Análise concluída: '+grouped.size+' padrões identificados; '+count+' sugestões adicionadas ou atualizadas.');
  await load();
 }catch(e){message('Não foi possível concluir a análise: '+e.message)}
 finally{button.disabled=false}
}
$('analyze').onclick=analyze;
$('refresh').onclick=()=>load().catch(e=>message(e.message));
$('statusFilter').onchange=render;
if(await verify()){
 $('workspace').hidden=false;
 await load().catch(e=>message('Erro ao carregar a fila: '+e.message));
}else $('unauthorized').style.display='block';
