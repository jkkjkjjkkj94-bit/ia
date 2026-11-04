import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
let view=null;
function toast(t){const e=document.getElementById('toast');if(!e)return;e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2500)}
function ensureUI(){if(view)return;const nav=document.querySelector('.panel-nav'),main=document.querySelector('.panel-main');if(!nav||!main)return;const btn=document.createElement('button');btn.type='button';btn.dataset.view='synonymSuggestions';btn.textContent='Sugestões de sinônimos';nav.appendChild(btn);view=document.createElement('section');view.id='synonymSuggestions';view.className='view';view.innerHTML='<div class="card"><div class="row"><div><h3>Sugestões de sinônimos</h3><div class="meta">Termos que aparecem nas buscas e parecem apontar sempre para o mesmo grupo.</div></div><button class="btn sm" id="reloadSynonymSuggestions">Atualizar</button></div><div id="synonymSuggestionList" class="list" style="margin-top:12px"></div></div>';main.appendChild(view);
const form=document.createElement('form');form.id='guruNewSynonymForm';form.className='card';
form.innerHTML='<h3>Ensinar novo termo à GURU</h3><div class="meta">Sugira uma expressão e escolha uma categoria ou grupo existente. Nada é aprendido automaticamente: revise antes de aprovar.</div>'
 +'<div class="row" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><input id="newSynonymTerm" required maxlength="65" placeholder="Nova expressão" aria-label="Expressão que a GURU deve aprender" style="flex:1;min-width:160px">'
 +'<select id="newSynonymTarget" required aria-label="Categoria ou grupo de destino" style="flex:1;min-width:160px"><option value="">Escolha categoria ou grupo</option></select>'
 +'<button type="submit" class="btn sm">Enviar para revisão</button></div>';
view.prepend(form);
form.addEventListener('submit',event=>{event.preventDefault();void createManualSuggestion()});
btn.onclick=()=>{document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x===view));document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('on',x===btn));const t=document.getElementById('pageTitle');if(t)t.textContent='Sugestões de sinônimos';load()};view.querySelector('#reloadSynonymSuggestions').onclick=load}
async function loadTaxonomyOptions(){
 const select=view?.querySelector('#newSynonymTarget');if(!select||select.dataset.loaded)return;
 const [categories,groups]=await Promise.all([
  sb.from('local_ai_taxonomy_categories').select('id,name,active').eq('active',true),
  sb.from('local_ai_taxonomy_groups').select('id,name,category_id,active').eq('active',true)
 ]);
 if(categories.error||groups.error){toast('Não consegui carregar as categorias para revisão.');return}
 const catById=new Map((categories.data||[]).map(c=>[c.id,c]));
 for(const cat of categories.data||[]){
  const o=document.createElement('option');o.value='category:'+cat.id;o.dataset.category=cat.name;o.textContent='Categoria · '+cat.name;select.appendChild(o);
 }
 for(const group of groups.data||[]){
  const cat=catById.get(group.category_id);if(!cat)continue;
  const o=document.createElement('option');o.value='group:'+group.id;o.dataset.category=cat.name;o.dataset.group=group.name;
  o.textContent='Grupo · '+cat.name+' / '+group.name;select.appendChild(o);
 }
 select.dataset.loaded='true';
}
async function createManualSuggestion(){
 const term=view?.querySelector('#newSynonymTerm')?.value.trim()||'';
 const opt=view?.querySelector('#newSynonymTarget')?.selectedOptions?.[0];
 const category=opt?.dataset.category||'',group=opt?.dataset.group||'';
 if(term.length<2||!category){toast('Preencha uma expressão e escolha um grupo ou categoria.');return}
 const normalized=normalize(term);
 if(!normalized){toast('Informe uma expressão válida.');return}
 const {error}=await sb.from('local_ai_synonym_suggestions').insert({
  term,normalized_term:normalized,suggested_category:category,
  suggested_group:group||null,hits:2,status:'pending'
 });
 if(error){toast('Não foi possível enviar: '+error.message);return}
 view.querySelector('#newSynonymTerm').value='';
 toast('Termo enviado para revisão. Ele ainda não altera as buscas.');await load();
}
async function writeTaxonomyTerm(row){
 const [cat,groups]=await Promise.all([
  sb.from('local_ai_taxonomy_categories').select('id,name').eq('active',true),
  sb.from('local_ai_taxonomy_groups').select('id,name,category_id').eq('active',true)
 ]);
 if(cat.error||groups.error)throw Error('Falha ao consultar taxonomia.');
 const category=(cat.data||[]).find(c=>normalize(c.name)===normalize(row.suggested_category));
 if(!category)throw Error('Categoria não encontrada na taxonomia.');
 const group=row.suggested_group?(groups.data||[]).find(g=>g.category_id===category.id&&normalize(g.name)===normalize(row.suggested_group)):null;
 if(row.suggested_group&&!group)throw Error('Grupo não encontrado na categoria selecionada.');
 const key=normalize(row.term);
 const existing=await sb.from('local_ai_taxonomy_terms').select('id').eq('normalized_term',key).eq('category_id',category.id).limit(1);
 if(existing.error)throw Error(existing.error.message);
 if(existing.data?.length)return;
 const create=await sb.from('local_ai_taxonomy_terms').insert({
  category_id:category.id,group_id:group?.id||null,term:row.term,
  normalized_term:key,term_type:'learned',source:'admin',active:true
 });
 if(create.error)throw Error(create.error.message);
}
async function approve(row){const{data:cfg,error}=await sb.from('local_ai_ai_config').select('config_value').eq('config_key','synonyms').maybeSingle();if(error)return toast(error.message);const synonyms=cfg?.config_value&&typeof cfg.config_value==='object'&&!Array.isArray(cfg.config_value)?structuredClone(cfg.config_value):{};const key=row.suggested_group||row.suggested_category;if(!key)return toast('A sugestão ainda não tem grupo definido.');const list=Array.isArray(synonyms[key])?synonyms[key]:[];if(!list.some(x=>String(x).toLowerCase()===String(row.term).toLowerCase()))list.push(row.term);const up=await sb.from('local_ai_ai_config').update({config_value:{...synonyms,[key]:list},updated_at:new Date().toISOString()}).eq('config_key','synonyms');if(up.error)return toast(up.error.message);try{await writeTaxonomyTerm(row)}catch(err){toast('Revisão não concluída: '+err.message);return}
const st=await sb.from('local_ai_synonym_suggestions').update({status:'approved',updated_at:new Date().toISOString()}).eq('id',row.id);if(st.error)return toast(st.error.message);toast(`“${row.term}” adicionado a ${key}.`);await load()}
async function reject(row){const{error}=await sb.from('local_ai_synonym_suggestions').update({status:'rejected',updated_at:new Date().toISOString()}).eq('id',row.id);if(error)return toast(error.message);toast('Sugestão rejeitada.');await load()}
async function load(){ensureUI();if(!view)return;void loadTaxonomyOptions();const box=view.querySelector('#synonymSuggestionList');box.innerHTML='<div class="meta">Carregando...</div>';const{data,error}=await sb.from('local_ai_synonym_suggestions').select('*').eq('status','pending').order('selections',{ascending:false}).order('hits',{ascending:false}).limit(100);if(error){box.innerHTML=`<div class="meta">${esc(error.message)}</div>`;return}const rows=(data||[]).filter(x=>Number(x.selections)>0||Number(x.hits)>=2);if(!rows.length){box.innerHTML='<div class="meta">Ainda não há sugestões com evidência suficiente.</div>';return}box.innerHTML='';for(const r of rows){const el=document.createElement('div');el.className='item';el.innerHTML=`<div class="row"><div><b>${esc(r.term)}</b><div class="meta">Sugestão: ${esc(r.suggested_category||'—')}${r.suggested_group?' · '+esc(r.suggested_group):''} · ${Number(r.hits||0)} ocorrência(s) · ${Number(r.selections||0)} seleção(ões)</div></div><div style="display:flex;gap:6px"><button class="btn sm" data-approve>Aprovar</button><button class="btn sm danger" data-reject>Rejeitar</button></div></div>`;el.querySelector('[data-approve]').onclick=()=>approve(r);el.querySelector('[data-reject]').onclick=()=>reject(r);box.appendChild(el)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUI,{once:true});else ensureUI();
