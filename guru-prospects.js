import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const $=id=>document.getElementById(id);
const statuses={identified:'Identificado',contacted:'Contatado',interested:'Interessado',awaiting_approval:'Aguardando aprovação',approved:'Validado para cadastro',declined:'Não interessado'};
const normal=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'').trim();
const msg=s=>{$('message').textContent=s};
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
let leads=[],session=null,loading=false,credentialText='';
const SUPABASE_URL='https://innziuzgtpfsiywqmies.supabase.co';
const SUPABASE_KEY='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
function temporaryPassword(){
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*-_';
 const values=new Uint32Array(24);crypto.getRandomValues(values);
 const result=Array.from(values,v=>alphabet[v%alphabet.length]);
 // Garante letras maiúsculas, minúsculas, número e caractere especial.
 result[0]='ABCDEFGHJKLMNPQRSTUVWXYZ'[values[0]%24];
 result[1]='abcdefghijkmnopqrstuvwxyz'[values[1]%25];
 result[2]='23456789'[values[2]%8];
 result[3]='!@#$%&*-_'[values[3]%9];
 return result.join('');
}
function showCredentials(email,password){
 credentialText='Painel da GURU: '+location.origin+'/ia/lojista.html\nE-mail: '+email+'\nSenha provisória: '+password+'\nAltere a senha no primeiro acesso.';
 $('createdEmail').textContent=email;
 $('createdPassword').textContent=password;
 $('credentialsDialog').classList.remove('hidden');
 $('copyCredentials').focus();
}
function closeCredentials(){
 $('credentialsDialog').classList.add('hidden');
 $('createdPassword').textContent='';
 $('createdEmail').textContent='';
 credentialText='';
}
$('closeCredentials').onclick=closeCredentials;
$('copyCredentials').onclick=async()=>{
 if(!credentialText)return;
 try{
  await navigator.clipboard.writeText(credentialText);
  msg('Dados de acesso copiados. Entregue-os somente ao responsável autorizado.');
 }catch{msg('Não foi possível copiar automaticamente. Copie os dados exibidos antes de fechar.')}
};

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
 const accountBox=el('div','account-fields hidden');
 const emailWrap=el('label');emailWrap.append(el('span','','E-mail do responsável autorizado'));
 const emailInput=el('input');emailInput.type='email';emailInput.placeholder='responsavel@empresa.com.br';emailInput.autocomplete='off';emailWrap.append(emailInput);
 const nameWrap=el('label');nameWrap.append(el('span','','Nome de exibição do lojista'));
 const displayInput=el('input');displayInput.value=p.name;displayInput.maxLength=140;nameWrap.append(displayInput);
 const authorizedWrap=el('label');const authorizedInput=el('input');authorizedInput.type='checkbox';
 authorizedInput.style.width='auto';authorizedWrap.append(authorizedInput,el('span','','Confirmei o e-mail com o responsável e tenho autorização para criar o acesso.'));
 const accountHelp=el('p','muted','O endereço e os produtos da loja são cadastrados depois, pelo próprio lojista. A senha será mostrada uma única vez.');
 const createAccount=el('button','primary','Confirmar criação da conta');createAccount.type='button';
 const cancelAccount=el('button','','Cancelar');cancelAccount.type='button';
 const accountActions=el('div','actions');accountActions.append(createAccount,cancelAccount);
 accountBox.append(emailWrap,nameWrap,authorizedWrap,accountHelp,accountActions);
 const startAccount=el('button','primary',p.merchant_user_id?'Conta criada':'Criar conta de lojista');
 startAccount.type='button';startAccount.disabled=Boolean(p.merchant_user_id);
 startAccount.onclick=()=>{accountBox.classList.remove('hidden');emailInput.focus()};
 cancelAccount.onclick=()=>{accountBox.classList.add('hidden');emailInput.value='';authorizedInput.checked=false};
 createAccount.onclick=async()=>{
  if(p.merchant_user_id){msg('Este comércio já possui uma conta de lojista vinculada.');return}
  const email=emailInput.value.trim().toLowerCase(),display_name=displayInput.value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){msg('Informe um e-mail válido e confirmado pelo responsável.');return}
  if(display_name.length<2){msg('Informe um nome válido para o lojista.');return}
  if(!authorizedInput.checked){msg('Confirme a autorização do responsável antes de criar o acesso.');return}
  if(!window.confirm('Criar uma conta de lojista para '+p.name+' no e-mail '+email+'?'))return;
  const password=temporaryPassword();
  createAccount.disabled=true;startAccount.disabled=true;
  let accountCreated=false;
  try{
   const {data:{session:latest},error:sessionErr}=await sb.auth.getSession();
   if(sessionErr||!latest?.access_token)throw Error('Sessão expirada. Entre novamente no painel.');
   const res=await fetch(SUPABASE_URL+'/functions/v1/admin-create-merchant',{
    method:'POST',
    headers:{'Content-Type':'application/json',apikey:SUPABASE_KEY,Authorization:'Bearer '+latest.access_token},
    body:JSON.stringify({display_name,email,password})
   });
   const result=await res.json();
   if(!res.ok||result.error||!result.ok||!result.user_id)throw Error(result.error||'A criação da conta não foi confirmada.');
   accountCreated=true;
   // Mostrar a senha ANTES da atualização de vínculos para nunca perder a credencial criada.
   showCredentials(email,password);
   const {data:linked,error:linkError}=await sb.from('guru_commerce_prospects').update({
    merchant_user_id:result.user_id,merchant_email:email,
    merchant_created_at:new Date().toISOString(),status:'awaiting_approval',
    updated_at:new Date().toISOString()
   }).eq('id',p.id).is('merchant_user_id',null).select('id').maybeSingle();
   if(linkError||!linked){
    msg('Conta criada, mas não foi possível vincular à captação: '+(linkError?.message||'registro modificado')+'. Copie as credenciais e confira o painel de lojistas.');
   }else{
    await load();
    msg('Conta criada e vinculada à captação. Copie a senha provisória exibida.');
   }
  }catch(e){
   msg('Não foi possível criar o lojista: '+e.message);
  }finally{
   createAccount.disabled=false;
   if(!accountCreated)startAccount.disabled=false;
  }
 };
 if(p.merchant_user_id){
  const info=el('p','muted','Conta vinculada: '+(p.merchant_email||'lojista cadastrado')+'. A senha não é armazenada na GURU.');
  card.append(info);
 }
 const bar=el('div','actions');
 const edit=el('button','','Editar');
 const link=el('a','btn','Pesquisar no Maps');
 link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name+' '+p.city+' '+p.uf);
 link.target='_blank';link.rel='noopener noreferrer';
 bar.append(edit,link,startAccount);card.append(bar,accountBox);
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
