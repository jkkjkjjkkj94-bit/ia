import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sbBase=createClient('https://ccsypggvelcxsqszepfs.supabase.co','sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG');
const $b=id=>document.getElementById(id);
const escB=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let baseRows=[],baseCategories=[],baseSearch='',baseCategory='',basePage=0,baseTotal=0,baseUser=null;
const baseSize=50;

async function refreshBaseUser(){
  const{data:{session}}=await sbBase.auth.getSession();
  baseUser=session?.user||null;
  document.querySelectorAll('.base-admin-only').forEach(el=>el.classList.toggle('hide',!baseUser));
}

async function loadBaseCategories(){
  const{data,error}=await sbBase.rpc('knowledge_category_stats');
  if(error){console.error('Categorias:',error);return}
  baseCategories=data||[];
  renderBaseCategories();
}
function renderBaseCategories(){
  const select=$b('categoryFilter');
  if(!select)return;
  select.innerHTML='<option value="">Todos os temas</option>'+baseCategories.map(x=>`<option value="${escB(x.category)}">${escB(x.category)} (${Number(x.total).toLocaleString('pt-BR')})</option>`).join('');
  select.value=baseCategory;
  const chips=$b('categoryChips');
  if(chips){
    chips.innerHTML=`<button class="chip ${!baseCategory?'on':''}" data-base-cat="">Todos</button>`+baseCategories.slice(0,12).map(x=>`<button class="chip ${baseCategory===x.category?'on':''}" data-base-cat="${escB(x.category)}">${escB(x.category)} <span>${Number(x.total).toLocaleString('pt-BR')}</span></button>`).join('');
    chips.querySelectorAll('[data-base-cat]').forEach(btn=>btn.onclick=()=>{
      baseCategory=btn.dataset.baseCat||'';basePage=0;select.value=baseCategory;renderBaseCategories();loadBasePage();
    });
  }
  const opts=$b('categoryOptions');
  if(opts)opts.innerHTML=baseCategories.map(x=>`<option value="${escB(x.category)}"></option>`).join('');
}

async function loadBasePage(){
  const list=$b('kList');
  if(!list)return;
  list.innerHTML='<div class="locked">Carregando base...</div>';
  try{
    if(baseSearch.trim()){
      const{data,error}=await sbBase.rpc('search_knowledge_filtered',{p_query:baseSearch.trim(),p_category:baseCategory||null,p_limit:50});
      if(error)throw error;
      baseRows=data||[];baseTotal=baseRows.length;basePage=0;
    }else{
      const from=basePage*baseSize;
      let req=sbBase.from('knowledge').select('id,question,keywords,answer,alternatives,created_at,generated,category',{count:'exact'}).order('created_at',{ascending:false}).range(from,from+baseSize-1);
      if(baseCategory)req=req.eq('category',baseCategory);
      const{data,error,count}=await req;
      if(error)throw error;
      baseRows=data||[];baseTotal=count||0;
    }
    renderBaseRows();
  }catch(err){
    console.error('Base:',err);
    list.innerHTML='<div class="locked">Não foi possível carregar a base. Atualize a página e tente novamente.</div>';
  }
}

function renderBaseRows(){
  const list=$b('kList');if(!list)return;
  const count=$b('kbCount');if(count)count.textContent=baseTotal.toLocaleString('pt-BR');
  list.innerHTML=baseRows.length?baseRows.map(x=>`<div class="item"><div><div class="q">${escB(x.question)}</div><div class="ans">${escB(x.answer)}</div><div class="meta"><span class="tag">${escB(x.category||'sem_tag')}</span>${x.generated?'<span class="tag auto">automática</span>':''}${(x.alternatives||[]).length} variações</div></div><div class="acts base-admin-only ${baseUser?'':'hide'}"><button class="mini" data-base-edit="${x.id}">Editar</button><button class="mini del" data-base-del="${x.id}">Excluir</button></div></div>`).join(''):'<div class="locked">Nenhum resultado neste tema.</div>';
  list.querySelectorAll('[data-base-edit]').forEach(btn=>btn.onclick=()=>editBaseRow(btn.dataset.baseEdit));
  list.querySelectorAll('[data-base-del]').forEach(btn=>btn.onclick=()=>deleteBaseRow(btn.dataset.baseDel));
  const pages=Math.max(1,Math.ceil(baseTotal/baseSize));
  if($b('pageInfo'))$b('pageInfo').textContent=baseSearch.trim()?`Busca • ${baseRows.length} resultado(s)`:`Página ${basePage+1} de ${pages}`;
  if($b('prevK'))$b('prevK').disabled=!!baseSearch.trim()||basePage<=0;
  if($b('nextK'))$b('nextK').disabled=!!baseSearch.trim()||(basePage+1)>=pages;
}

function addBaseAlt(value=''){
  const box=$b('alts');if(!box)return;
  const row=document.createElement('div');row.className='alt';
  row.innerHTML=`<textarea class="altI">${escB(value)}</textarea><button type="button" class="btn danger">×</button>`;
  row.querySelector('button').onclick=()=>row.remove();box.appendChild(row);
}
function editBaseRow(id){
  if(!baseUser)return;
  const x=baseRows.find(r=>r.id===id);if(!x)return;
  $b('editId').value=x.id;$b('tq').value=x.question;$b('tc').value=x.category||'manual';$b('tk').value=(x.keywords||[]).join(', ');$b('ta').value=x.answer;$b('alts').innerHTML='';
  (x.alternatives||[]).forEach(addBaseAlt);if($b('altCount'))$b('altCount').textContent=(x.alternatives||[]).length+' variações';if($b('edTitle'))$b('edTitle').textContent='Editar resposta';
  const reg=document.querySelector('.nav button[data-v="register"]');if(reg)reg.click();
}
async function deleteBaseRow(id){
  if(!baseUser||!confirm('Excluir esta resposta?'))return;
  const{error}=await sbBase.from('knowledge').delete().eq('id',id);if(error){alert(error.message);return}
  await Promise.all([loadBaseCategories(),loadBasePage()]);
}

function wireBase(){
  const search=$b('kbSearch'),filter=$b('categoryFilter'),prev=$b('prevK'),next=$b('nextK'),baseBtn=document.querySelector('.nav button[data-v="knowledge"]');
  let timer;
  if(search)search.oninput=e=>{baseSearch=e.target.value;clearTimeout(timer);timer=setTimeout(()=>{basePage=0;loadBasePage()},250)};
  if(filter)filter.onchange=e=>{baseCategory=e.target.value;basePage=0;renderBaseCategories();loadBasePage()};
  if(prev)prev.onclick=()=>{if(basePage>0){basePage--;loadBasePage()}};
  if(next)next.onclick=()=>{if((basePage+1)*baseSize<baseTotal){basePage++;loadBasePage()}};
  if(baseBtn){const original=baseBtn.onclick;baseBtn.onclick=e=>{if(original)original.call(baseBtn,e);loadBaseCategories();loadBasePage()}}
}

await refreshBaseUser();
wireBase();
await loadBaseCategories();
sbBase.auth.onAuthStateChange(async()=>{await refreshBaseUser();renderBaseRows()});
