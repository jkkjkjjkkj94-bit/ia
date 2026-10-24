import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://ccsypggvelcxsqszepfs.supabase.co','sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG');
let K=[],P=[],U=[],categories=[],user=null,ctx=null,search='',category='',page=0,total=0;
const size=50,hist=new Map(),used=new Set(),$=x=>document.getElementById(x);
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
const esc=s=>(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function toast(t){$('toast').textContent=t;$('toast').classList.add('on');setTimeout(()=>$('toast').classList.remove('on'),2200)}
function msg(t,c='bot'){const d=document.createElement('div');d.className='msg '+c;d.textContent=t;$('msgs').appendChild(d);$('msgs').scrollTop=$('msgs').scrollHeight}
function reply(x){const key=x.id,p=[x.answer,...(x.alternatives||[])].filter(Boolean),st=hist.get(key)||{u:new Set(),n:0};let c=p.filter(v=>!st.u.has(v)&&!used.has(v));if(!c.length)c=p.filter(v=>!st.u.has(v));const r=c.length?c[Math.floor(Math.random()*c.length)]:['Claro —','Resumindo:','Em outras palavras:','De outro jeito:'][st.n%4]+' '+x.answer;st.u.add(r);st.n++;hist.set(key,st);used.add(r);return r}
function cat(t){const n=norm(t),m={mercado:['mercado','supermercado'],farmacia:['farmacia','remedio'],restaurante:['restaurante','almocar','jantar'],hospital:['hospital','upa'],posto:['posto','gasolina']};for(const[c,w]of Object.entries(m))if(w.some(x=>n.includes(x)))return c;for(const p of P)if(n.includes(norm(p.category)))return norm(p.category);return null}
function placeIntent(t){const n=norm(t);return!!cat(t)&&['perto','proximo','onde tem','onde fica','achar','encontrar'].some(x=>n.includes(x))}

async function loadCategories(){
  const{data,error}=await sb.rpc('knowledge_category_stats');
  if(error){console.error(error);return}
  categories=data||[];
  renderCategories();
}
function renderCategories(){
  const select=$('categoryFilter');
  const current=category;
  select.innerHTML='<option value="">Todos os temas</option>'+categories.map(x=>`<option value="${esc(x.category)}">${esc(x.category)} (${Number(x.total).toLocaleString('pt-BR')})</option>`).join('');
  select.value=current;
  $('categoryOptions').innerHTML=categories.map(x=>`<option value="${esc(x.category)}"></option>`).join('');
  const top=categories.slice(0,12);
  $('categoryChips').innerHTML=`<button class="chip ${!category?'on':''}" data-cat="">Todos</button>`+top.map(x=>`<button class="chip ${category===x.category?'on':''}" data-cat="${esc(x.category)}">${esc(x.category)} <span>${Number(x.total).toLocaleString('pt-BR')}</span></button>`).join('');
  $('categoryChips').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{category=b.dataset.cat;select.value=category;page=0;renderCategories();loadPage()});
}

async function loadPage(){
  const q=search.trim();
  if(q){
    const{data,error}=await sb.rpc('search_knowledge_filtered',{p_query:q,p_category:category||null,p_limit:50});
    if(error){console.error(error);return toast('Erro na busca.')}K=data||[];total=K.length;page=0;renderK();return;
  }
  const from=page*size;
  let req=sb.from('knowledge').select('id,question,keywords,answer,alternatives,created_at,generated,category',{count:'exact'}).order('created_at',{ascending:false}).range(from,from+size-1);
  if(category)req=req.eq('category',category);
  const{data,error,count}=await req;
  if(error){console.error(error);return toast('Erro ao carregar a base.')}
  K=data||[];total=count||0;renderK();
}
async function load(){
  const p=await sb.from('places').select('*').order('created_at',{ascending:false});
  if(p.error){$('status').textContent='● erro';return}
  $('status').textContent='● Supabase online';P=p.data||[];renderP();
  await loadCategories();
  if(user)await loadPage();
}
function renderK(){
  $('kbCount').textContent=total.toLocaleString('pt-BR');
  $('kList').innerHTML=K.length?K.map(x=>`<div class="item"><div><div class="q">${esc(x.question)}</div><div class="ans">${esc(x.answer)}</div><div class="meta"><span class="tag">${esc(x.category||'sem_tag')}</span>${x.generated?'<span class="tag auto">automática</span>':''}${(x.alternatives||[]).length} variações</div></div><div class="acts"><button class="mini" onclick="editK('${x.id}')">Editar</button><button class="mini del" onclick="delK('${x.id}')">Excluir</button></div></div>`).join(''):'<div class="locked">Nenhum resultado neste tema.</div>';
  const pages=Math.max(1,Math.ceil(total/size));
  $('pageInfo').textContent=search.trim()?`Busca • ${K.length} resultado(s)`:`Página ${page+1} de ${pages}`;
  $('prevK').disabled=!!search.trim()||page<=0;
  $('nextK').disabled=!!search.trim()||(page+1)>=pages;
}
function renderP(){$('places').innerHTML=P.length?P.map(x=>`<div class="item"><div><b>${esc(x.name)}</b><div class="meta">${esc(x.category)} • ${esc(x.city)} • ${esc(x.address||'')}</div></div><button class="btn danger" onclick="delP('${x.id}')">Excluir</button></div>`).join(''):'<div class="locked">Nenhum local.</div>'}
function renderU(){$('pending').innerHTML=U.length?U.map(x=>`<div class="item"><div>${esc(x.question)}</div><button class="btn danger" onclick="delU('${x.id}')">Excluir</button></div>`).join(''):'<div class="locked">Sem pendentes.</div>'}
async function adminData(){const{data}=await sb.from('unanswered').select('*').order('created_at',{ascending:false});U=data||[];renderU()}
function addAlt(v=''){const r=document.createElement('div');r.className='alt';r.innerHTML=`<textarea class="altI">${esc(v)}</textarea><button type="button" class="btn danger">×</button>`;r.querySelector('button').onclick=()=>{r.remove();countAlt()};$('alts').appendChild(r);countAlt()}
function countAlt(){$('altCount').textContent=document.querySelectorAll('.altI').length+' variações'}
function clearEd(){$('editId').value='';$('tq').value='';$('tc').value='manual';$('tk').value='';$('ta').value='';$('alts').innerHTML='';$('edTitle').textContent='Cadastrar resposta';countAlt()}
function go(v){document.querySelectorAll('.nav button,.view').forEach(x=>x.classList.remove('on'));const b=document.querySelector(`.nav button[data-v="${v}"]`);if(b)b.classList.add('on');$('v-'+v).classList.add('on');$('title').textContent=titles[v][0];$('sub').textContent=titles[v][1];if(user&&v==='knowledge')loadPage();if(user&&v==='pending')adminData()}
window.editK=id=>{const x=K.find(v=>v.id===id);if(!x)return;$('editId').value=x.id;$('tq').value=x.question;$('tc').value=x.category||'manual';$('tk').value=(x.keywords||[]).join(', ');$('ta').value=x.answer;$('alts').innerHTML='';(x.alternatives||[]).forEach(addAlt);$('edTitle').textContent='Editar resposta';countAlt();go('register')};

$('kForm').onsubmit=async e=>{
  e.preventDefault();
  const id=$('editId').value,row={question:$('tq').value.trim(),category:$('tc').value.trim()||'manual',keywords:$('tk').value.split(',').map(x=>x.trim()).filter(Boolean),answer:$('ta').value.trim(),alternatives:[...document.querySelectorAll('.altI')].map(x=>x.value.trim()).filter(Boolean)};
  if(!row.question||!row.answer)return toast('Preencha pergunta e resposta.');
  const r=id?await sb.from('knowledge').update(row).eq('id',id).select().single():await sb.from('knowledge').insert({...row,generated:false}).select().single();
  if(r.error)return toast(r.error.message);
  hist.delete(id);clearEd();await loadCategories();toast(id?'Resposta atualizada.':'Resposta cadastrada.');go('knowledge');
};
$('clearEd').onclick=clearEd;$('addAlt').onclick=()=>addAlt();
let tm;$('kbSearch').oninput=e=>{search=e.target.value;clearTimeout(tm);tm=setTimeout(()=>{page=0;loadPage()},250)};
$('categoryFilter').onchange=e=>{category=e.target.value;page=0;renderCategories();loadPage()};
$('prevK').onclick=()=>{if(page>0){page--;loadPage()}};$('nextK').onclick=()=>{if((page+1)*size<total){page++;loadPage()}};

$('chatForm').onsubmit=async e=>{
  e.preventDefault();const t=$('q').value.trim();if(!t)return;msg(t,'user');$('q').value='';
  try{
    if(ctx){const l=norm(t),r=P.filter(p=>norm(p.category).includes(ctx.c)&&norm(`${p.city} ${p.neighborhood||''} ${p.address||''}`).includes(l));if(r.length){msg(r.map((p,i)=>`${i+1}. ${p.name} — ${p.address||p.city}${p.hours?' • '+p.hours:''}`).join('\n'));await log(ctx.q,true)}else{msg(`Ainda não encontrei ${ctx.c} cadastrado em ${t}.`);await log(ctx.q,false);await pend(`${ctx.q} | Localidade: ${t}`)}ctx=null;return}
    if(placeIntent(t)){ctx={c:cat(t),q:t};msg('Qual sua cidade ou bairro?');return}
    const{data,error}=await sb.rpc('search_knowledge',{p_query:t,p_limit:5});if(error)throw error;const b=data?.[0];if(b){msg(reply(b));await log(t,true)}else{msg('Ainda não tenho uma resposta para isso. Registrei sua pergunta para o administrador.');await log(t,false);await pend(t)}
  }catch(e){console.error(e);msg('Não consegui acessar a base agora.')}
};
async function log(q,a){await sb.from('questions_log').insert({question:q,answered:a})}async function pend(q){await sb.from('unanswered').insert({question:q})}

function authUI(){document.querySelectorAll('.admin').forEach(x=>x.classList.toggle('hide',!user));document.querySelectorAll('.gate').forEach(x=>x.classList.toggle('hide',!!user));$('auth').textContent=user?'Sair admin':'Entrar admin'}
$('auth').onclick=async()=>{if(user){await sb.auth.signOut();user=null;K=[];authUI();go('chat')}else $('modal').classList.add('on')};
$('close').onclick=()=>$('modal').classList.remove('on');
$('login').onclick=async()=>{const{data,error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('pass').value});if(error)return toast('Login inválido');user=data.user;$('modal').classList.remove('on');authUI();await Promise.all([adminData(),loadCategories(),loadPage()]);toast('Admin conectado')};
$('placeForm').onsubmit=async e=>{e.preventDefault();const row={name:$('pn').value.trim(),category:$('pc').value.trim(),city:$('pci').value.trim(),neighborhood:$('pb').value.trim()||null,address:$('pa').value.trim()||null,hours:$('ph').value.trim()||null},{data,error}=await sb.from('places').insert(row).select().single();if(error)return toast(error.message);P.unshift(data);e.target.reset();renderP()};

$('exportK').onclick=async()=>{if(!user)return toast('Entre como administrador.');let rows=[],from=0;while(true){const{data,error}=await sb.from('knowledge').select('question,category,keywords,answer,alternatives').eq('generated',false).order('created_at',{ascending:false}).range(from,from+999);if(error)return toast('Erro ao exportar.');rows.push(...(data||[]));if(!data||data.length<1000)break;from+=1000}const c=v=>'"'+String(v??'').replace(/"/g,'""')+'"',lines=[['pergunta','tema','palavras_chave','resposta','variacoes'].map(c).join(';'),...rows.map(x=>[x.question,x.category||'manual',(x.keywords||[]).join(', '),x.answer,(x.alternatives||[]).join(' || ')].map(c).join(';'))],blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='buscaia-minhas-respostas.csv';a.click();URL.revokeObjectURL(a.href);toast(rows.length+' exportadas.')};
function delim(t){const f=(t.replace(/^\uFEFF/,'').split(/\r?\n/).find(x=>x.trim())||'');let q=false,c=0,s=0;for(let i=0;i<f.length;i++){const x=f[i];if(x==='"')q=!q;else if(!q){if(x===',')c++;if(x===';')s++}}return s>c?';':','}
function parse(t,d){t=t.replace(/^\uFEFF/,'');const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const x=t[i];if(x==='"'){if(q&&t[i+1]==='"'){f+='"';i++}else q=!q}else if(x===d&&!q){r.push(f);f=''}else if((x==='\n'||x==='\r')&&!q){if(x==='\r'&&t[i+1]==='\n')i++;r.push(f);f='';if(r.some(v=>v.trim()))R.push(r);r=[]}else f+=x}r.push(f);if(r.some(v=>v.trim()))R.push(r);return R}
function hi(h,n){const a=h.map(norm);for(const x of n){const i=a.indexOf(norm(x));if(i>=0)return i}return-1}
$('importK').onchange=async e=>{const f=e.target.files?.[0];e.target.value='';if(!f||!user)return;const info=$('importInfo');info.classList.remove('hide');info.textContent='Importando...';try{const txt=await f.text(),R=parse(txt,delim(txt)),h=R[0],iq=hi(h,['pergunta','question']),ic=hi(h,['tema','tag','categoria','category']),ik=hi(h,['palavras_chave','keywords']),ia=hi(h,['resposta','answer']),iv=hi(h,['variacoes','alternatives']);if(iq<0||ia<0)throw Error('CSV precisa de pergunta e resposta.');const add=[];for(const r of R.slice(1)){const question=(r[iq]||'').trim(),answer=(r[ia]||'').trim();if(question&&answer)add.push({question,answer,category:ic>=0?(r[ic]||'manual').trim()||'manual':'manual',keywords:ik>=0?(r[ik]||'').split(',').map(x=>x.trim()).filter(Boolean):[],alternatives:iv>=0?(r[iv]||'').split(/\s*\|\|\s*/).filter(Boolean):[],generated:false})}for(let i=0;i<add.length;i+=500){const{error}=await sb.from('knowledge').insert(add.slice(i,i+500));if(error)throw error}await Promise.all([loadCategories(),loadPage()]);info.textContent=add.length+' importadas.';toast('Importação concluída.')}catch(err){info.textContent='Erro: '+err.message}};

window.delK=async id=>{if(!confirm('Excluir esta resposta?'))return;const{error}=await sb.from('knowledge').delete().eq('id',id);if(error)return toast(error.message);clearEd();await Promise.all([loadCategories(),loadPage()])};
window.delP=async id=>{await sb.from('places').delete().eq('id',id);P=P.filter(x=>x.id!==id);renderP()};
window.delU=async id=>{await sb.from('unanswered').delete().eq('id',id);U=U.filter(x=>x.id!==id);renderU()};

const titles={chat:['Conversar','Faça uma pergunta para o assistente.'],knowledge:['Base de conhecimento','Explore as respostas por tema ou tag.'],register:['Cadastrar','Cadastre ou edite perguntas, respostas e variações.'],places:['Locais','Cadastre lugares para as buscas.'],pending:['Pendentes','Perguntas ainda não respondidas.']};
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
const{data:{session}}=await sb.auth.getSession();user=session?.user||null;authUI();clearEd();msg('Olá! Eu sou o BuscaIA. Como posso ajudar?');await load();if(user){await adminData();await loadPage()}