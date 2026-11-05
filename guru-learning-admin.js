import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import {patternKey} from './guru-knowledge-v11.mjs?v=1';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const $=id=>document.getElementById(id);
let currentUser=null,proposals=[],suppressedPatterns=new Set();
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
 const {data:suppressed,error:suppressionError}=await sb.from('guru_suppressed_review_patterns').select('normalized_query').limit(1000);
 if(suppressionError)throw suppressionError;
 suppressedPatterns=new Set((suppressed||[]).map(x=>x.normalized_query));
 for(const status of ['pending','approved','rejected'])$(status).textContent=proposals.filter(p=>p.status===status).length;
 render();
}
function node(tag,cls,text){
 const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;
 return el;
}
function editableField(label,value,maxLength=200,multiline=false){
 const wrap=node('label','edit-field');
 wrap.appendChild(node('span','muted',label));
 const field=node(multiline?'textarea':'input','review-input');
 field.value=String(value||'');field.maxLength=maxLength;
 if(!multiline)field.type='text';
 wrap.appendChild(field);
 return {wrap,field};
}
const CONTEXT_TYPES=[
 ['general','Conhecimento geral'],['store','Informações sobre lojas'],
 ['product','Produtos e estoque'],['hours','Horários de funcionamento'],
 ['delivery','Entrega e frete'],['payment','Formas de pagamento'],
 ['location','Endereço e localização'],['reviews','Avaliações de clientes']
];
function contextPicker(value){
 const wrap=node('label','edit-field');
 wrap.appendChild(node('span','muted','Direcionar pergunta para o contexto'));
 const field=node('select','review-input');
 for(const [key,label] of CONTEXT_TYPES){
  const option=node('option','',label);option.value=key;
  field.appendChild(option);
 }
 field.value=CONTEXT_TYPES.some(([key])=>key===value)?value:'general';
 wrap.appendChild(field);
 wrap.appendChild(node('span','muted','Contextos de loja consultam dados reais cadastrados, sem substituir estoque, horários ou entrega por respostas genéricas.'));
 return {wrap,field};
}
function render(){
 const status=$('statusFilter').value,items=proposals.filter(p=>status==='all'||p.status===status);
 $('list').replaceChildren();
 if(!items.length){$('list').appendChild(node('p','muted','Nenhuma sugestão nesta categoria.'));return}
 for(const p of items){
  const card=node('article','item');
  const title=node('h3','',p.sample_question);
  card.appendChild(title);
  card.appendChild(node('div','meta',p.occurrences+' ocorrência(s) · '+p.status+' · '+(p.suggested_category||'sem categoria')));
  if(p.status==='pending'||p.status==='approved'){
   const editBox=node('div','review-edit');
   const question=editableField('Pergunta revisada',p.sample_question,200);
   const category=editableField('Categoria',p.suggested_category||'',100);
   const context=contextPicker(p.context_type||'general');
   const answer=editableField('Resposta revisada',p.proposed_answer||'',2000,true);
   answer.field.placeholder='Escreva uma resposta factual e verificada.';
   editBox.append(question.wrap,category.wrap,context.wrap,answer.wrap);
   card.appendChild(editBox);
   const bar=node('div','toolbar');
   let busy=false;
   const buttons=[];
   const setBusy=value=>{busy=value;for(const b of buttons)b.disabled=value};
   const fields=()=>({
    sample_question:question.field.value.trim(),
    suggested_category:category.field.value.trim()||null,
    context_type:context.field.value,
    proposed_answer:answer.field.value.trim()||null
   });
   const validate=(mustHaveAnswer=false)=>{
    const value=fields();
    if(value.sample_question.length<3){message('A pergunta deve ter pelo menos 3 caracteres.');return null}
    if(mustHaveAnswer&&(!value.proposed_answer||value.proposed_answer.length<15)){
     message('A resposta deve ter pelo menos 15 caracteres.');return null;
    }
    if(value.proposed_answer&&value.proposed_answer.length<15){
     message('A resposta deve ter pelo menos 15 caracteres ou ficar em branco.');return null;
    }
    return value;
   };
   const persist=async(value)=>{
    if(p.status==='approved'){
     const {error}=await sb.rpc('guru_v12_edit_approved_proposal',{
      p_proposal_id:p.id,p_question:value.sample_question,
      p_answer:value.proposed_answer,p_category:value.suggested_category||'',
      p_context_type:value.context_type
     });
     if(error)throw error;
    }else{
     const {data,error}=await sb.from('guru_knowledge_proposals')
      .update(value).eq('id',p.id).eq('status','pending').select('id').maybeSingle();
     if(error)throw error;
     if(!data)throw Error('Esta revisão não está mais pendente. Atualize a lista.');
    }
   };
   const save=node('button','','Salvar alterações');
   buttons.push(save);
   save.onclick=async()=>{
    if(busy)return;
    const value=validate(p.status==='approved');if(!value)return;
    setBusy(true);
    try{await persist(value);message('Alterações salvas com sucesso.');await load()}
    catch(e){message('Não foi possível salvar: '+e.message)}
    finally{setBusy(false)}
   };
   bar.appendChild(save);
   if(p.status==='pending'){
    const approve=node('button','primary','Aprovar e publicar');
    buttons.push(approve);
    approve.onclick=async()=>{
     if(busy)return;
     const value=validate(true);if(!value)return;
     setBusy(true);
     try{
      // O rascunho é gravado primeiro para que pergunta e categoria publicadas sejam as editadas.
      await persist(value);
      const {error}=await sb.rpc('guru_v11_approve_proposal',{p_proposal_id:p.id,p_answer:value.proposed_answer});
      if(error)throw error;
      message('Revisão salva, aprovada e publicada.');await load();
     }catch(e){message('Não foi possível publicar: '+e.message)}
     finally{setBusy(false)}
    };
    const reject=node('button','','Rejeitar');
    buttons.push(reject);
    reject.onclick=async()=>{
     if(busy)return;
     setBusy(true);
     try{
      const {data,error}=await sb.from('guru_knowledge_proposals')
       .update({status:'rejected',reviewed_at:new Date().toISOString(),reviewed_by:currentUser.id})
       .eq('id',p.id).eq('status','pending').select('id').maybeSingle();
      if(error)throw error;
      if(!data)throw Error('A revisão não está mais pendente.');
      message('Sugestão rejeitada.');await load();
     }catch(e){message('Erro ao rejeitar: '+e.message)}
     finally{setBusy(false)}
    };
    bar.append(approve,reject);
   }
   card.appendChild(bar);
   card.appendChild(node('p','muted',p.status==='approved'?'Alterações nesta revisão atualizam também a resposta publicada.':'Salvar alterações mantém a revisão pendente até a aprovação.'));
  }else if(p.proposed_answer){
   card.appendChild(node('p','muted',p.proposed_answer));
  }
  const del=node('button','danger','Excluir registro');
  del.type='button';
  del.title='Exclui definitivamente esta revisão e o conhecimento publicado vinculado, se existir.';
  del.onclick=async()=>{
   const prompt=p.status==='approved'
    ?'Excluir definitivamente esta revisão e a resposta publicada na GURU? A ação não pode ser desfeita.'
    :'Excluir definitivamente esta revisão? Ela não será recriada automaticamente pela análise. A ação não pode ser desfeita.';
   if(!window.confirm(prompt))return;
   del.disabled=true;
   try{
    const {data,error}=await sb.rpc('guru_v14_delete_review',{p_proposal_id:p.id});
    if(error)throw error;
    if(data!==true)throw Error('A exclusão não foi confirmada pelo servidor.');
    await load();
    message('Registro excluído. A pergunta não será recriada automaticamente.');
   }catch(e){
    message('Não foi possível excluir: '+e.message);
    del.disabled=false;
   }
  };
  card.appendChild(del);
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
   if(suppressedPatterns.has(entry.normalized_query))continue;
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
 await load().then(async()=>{if(!proposals.length)await analyze()}).catch(e=>message('Erro ao carregar a fila: '+e.message));
}else $('unauthorized').style.display='block';
