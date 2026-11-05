import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const $=id=>document.getElementById(id);
const statuses={identified:'Identificado',contacted:'Contatado',interested:'Interessado',awaiting_approval:'Aguardando aprovação',approved:'Validado para cadastro',declined:'Não interessado'};
const normal=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'').trim();
const msg=s=>{$('message').textContent=s};
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
let leads=[],session=null,loading=false;
async function verify(){
 const {data:{session:current},error}=await sb.auth.getSession();
 if(error||!current?.user)return false;
 const {data:profile,error:pe}=await sb.from('local_ai_profiles').select('role').eq('user_id',current.user.id).maybeSingle();
 if(pe||profile?.role!=='admin')return false;
 session=current;return true;
}
function validUrl(value){try{const url=new URL(value);return url.protocol==='https:'?url.href:null}catch{return null}}
const searchable=p=>[p.name,p.city,p.category,p.address,p.notes].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function stats(){
 $('nAll').textContent=leads.length;
 $('nContacted').textContent=leads.filter(p=>p.status==='contacted').length;
 $('nInterested').textContent=leads.filter(p=>p.status==='interested').length;
 $('nApproval').textContent=leads.filter(p=>p.status==='awaiting_approval').length;
}
async function load(){
 const {data,error}=await sb.from('guru_commerce_prospects').select('*').order('created_at',{ascending:false}).limit(1000);
 if(error)throw error;
 leads=data||[];
 const current=$('categoryFilter').value,options=[...new Set(leads.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 $('categoryFilter').replaceChildren();
 const defaultOption=el('option','','Todas as categorias');defaultOption.value='';$('categoryFilter').append(defaultOption);
 for(const category of options){const opt=el('option','',category);opt.value=category;$('categoryFilter').append(opt)}
 $('categoryFilter').value=options.includes(current)?current:'';
 stats();render();
}
function field(label,value,max=250,multi=false){
 const wrap=el('label');
 wrap.append(el('span','',label));
 const input=el(multi?'textarea':'input');
 input.value=value||'';input.maxLength=max;
 wrap.append(input);
 return {wrap,input};
}
function displayLead(p){
 const card=el('article','lead');
 card.append(el('span','pill'+(p.status==='approved'?' ok':''),statuses[p.status]||p.status));
 card.append(el('h3','',p.name));
 card.append(el('p','',p.category+' · '+p.city+' / '+p.uf));
 if(p.address)card.append(el('p','',p.address));
 if(p.contact_phone)card.append(el('p','',p.contact_phone));
 const sourceUrl=validUrl(p.source_url);
 if(sourceUrl){const a=el('a','btn','Consultar fonte');a.href=sourceUrl;a.target='_blank';a.rel='noopener noreferrer';card.append(a)}
 const bar=el('div','actions');
 const edit=el('button','','Editar');
 const link=el('a','btn','Pesquisar no Maps');
 link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name+' '+p.city+' '+p.uf);
 link.target='_blank';link.rel='noopener noreferrer';
 bar.append(edit,link);card.append(bar);
 const editor=el('div','inline-editor hidden');
 const name=field('Nome',p.name,140),category=field('Categoria',p.category,100),
 city=field('Cidade',p.city,100),uf=field('UF',p.uf,2),
 address=field('Endereço',p.address,250),phone=field('Telefone comercial',p.contact_phone,50),
 source=field('URL da fonte',p.source_url,500),notes=field('Observações',p.notes,1000,true);
 const statusWrap=el('label');statusWrap.append(el('span','','Status de captação'));
 const status=el('select');for(const [key,label] of Object.entries(statuses)){const opt=el('option','',label);opt.value=key;status.append(opt)}status.value=p.status;statusWrap.append(status);
 editor.append(name.wrap,category.wrap,city.wrap,uf.wrap,address.wrap,phone.wrap,source.wrap,statusWrap,notes.wrap);
 notes.wrap.className='wide';
 const tools=el('div','actions wide'),save=el('button','primary','Salvar'),cancel=el('button','','Cancelar'),remove=el('button','warn','Excluir');
 tools.append(save,cancel,remove);editor.append(tools);card.append(editor);
 edit.onclick=()=>{editor.classList.toggle('hidden');edit.textContent=editor.classList.contains('hidden')?'Editar':'Fechar edição'};
 cancel.onclick=()=>{editor.classList.add('hidden');edit.textContent='Editar'};
 save.onclick=async()=>{
  const values={name:name.input.value.trim(),category:category.input.value.trim(),city:city.input.value.trim(),
   uf:uf.input.value.trim().toUpperCase(),address:address.input.value.trim()||null,
   contact_phone:phone.input.value.trim()||null,source_url:source.input.value.trim()||null,
   notes:notes.input.value.trim()||null,status:status.value,updated_at:new Date().toISOString()};
  if(values.name.length<2||!values.city||!values.category||!/^[A-Z]{2}$/.test(values.uf)){msg('Preencha nome, cidade, categoria e UF corretamente.');return}
  if(values.source_url&&!validUrl(values.source_url)){msg('Use um link HTTPS válido para a fonte.');return}
  if(!window.confirm('Salvar as alterações deste comércio?'))return;
  save.disabled=true;
  try{
   const {data,error}=await sb.from('guru_commerce_prospects').update(values).eq('id',p.id).select('id').single();
   if(error)throw error;if(!data?.id)throw Error('Registro não foi atualizado.');
   await load();msg('Comércio atualizado. O cadastro público não foi alterado.');
  }catch(e){msg(e.code==='23505'?'Já existe um comércio com esse nome na cidade.':e.message)}
  finally{save.disabled=false}
 };
 remove.onclick=async()=>{
  if(!window.confirm('Excluir este comércio da lista de captação? A ação não remove um cadastro público da GURU.'))return;
  remove.disabled=true;
  try{
   const {data,error}=await sb.from('guru_commerce_prospects').delete().eq('id',p.id).select('id').single();
   if(error)throw error;if(!data?.id)throw Error('Exclusão não confirmada.');
   await load();msg('Registro removido da captação.');
  }catch(e){msg(e.message)}finally{remove.disabled=false}
 };
 return card;
}
function render(){
 const query=$('query').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 const city=$('cityFilter').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 const category=$('categoryFilter').value,status=$('statusFilter').value;
 const items=leads.filter(p=>(!query||searchable(p).includes(query))&&
  (!city||p.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(city))&&
  (!category||p.category===category)&&(!status||p.status===status));
 $('foundLabel').textContent=items.length+' comércio(s)';
 $('leads').replaceChildren();
 if(!items.length)$('leads').append(el('div','panel','Nenhum comércio encontrado para esses filtros.'));
 for(const lead of items)$('leads').append(displayLead(lead));
}
$('createForm').onsubmit=async event=>{
 event.preventDefault();if(loading)return;
 const name=$('newName').value.trim(),city=$('newCity').value.trim(),uf=$('newUf').value.trim().toUpperCase(),
 category=$('newCategory').value.trim(),source_url=$('newSource').value.trim();
 if(!name||!city||!category||!/^[A-Z]{2}$/.test(uf)){msg('Preencha nome, categoria, cidade e UF.');return}
 if(source_url&&!validUrl(source_url)){msg('O link da fonte deve usar HTTPS.');return}
 if(leads.some(p=>normal(p.name)===normal(name)&&normal(p.city)===normal(city)&&p.uf===uf)){
  msg('Já existe um comércio com esse nome na cidade. Revise o registro existente.');return;
 }
 loading=true;const button=$('createForm').querySelector('button[type=submit]');button.disabled=true;
 try{
  const {error}=await sb.from('guru_commerce_prospects').insert({
   name,city,uf,category,address:$('newAddress').value.trim()||null,contact_phone:$('newPhone').value.trim()||null,
   source_url:source_url||null,source_name:source_url?'Fonte informada pelo administrador':null,
   notes:$('newNotes').value.trim()||null,created_by:session.user.id,status:'identified'
  });
  if(error)throw error;
  $('createForm').reset();$('newCity').value='Salto de Pirapora';$('newUf').value='SP';
  await load();msg('Novo comércio adicionado à captação, ainda não publicado na GURU.');
 }catch(e){msg(e.code==='23505'?'Comércio duplicado: já está na lista.':e.message)}
 finally{loading=false;button.disabled=false}
};
for(const id of ['query','cityFilter','categoryFilter','statusFilter'])$(id).addEventListener('input',render);
$('cityFilter').addEventListener('input',()=>{
 const place=$('cityFilter').value.trim()||'Salto de Pirapora';
 $('maps').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('comércios '+place+' SP');
});
$('refresh').onclick=()=>load().then(()=>msg('Lista atualizada.')).catch(e=>msg('Erro ao atualizar: '+e.message));
if(await verify()){
 $('work').classList.remove('hidden');
 try{await load()}catch(e){msg('Não foi possível carregar os registros: '+e.message)}
}else $('unauthed').style.display='block';
