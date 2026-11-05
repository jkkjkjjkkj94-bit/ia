import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e};
const msg=value=>{$('message').textContent=String(value||'')};
const statuses={identified:'Identificado',contacted:'Contatado',interested:'Interessado',store_created:'Loja criada',account_created:'Conta criada (legado)',awaiting_approval:'Aguardando aprovação',approved:'Validado para cadastro',declined:'Não interessado'};
const validUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}};
const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const authEndpoint='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/guru-captured-stores';
const coreKey='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
let leads=[],merchants=[],session=null,bulkRunning=false,loading=false;
let accountBatchRunning=false,generatedAccesses=[];
const selected=new Set();
const cachedOwners=new Map();
async function verify(){
 const {data:{session:active},error}=await sb.auth.getSession();
 if(error||!active?.user)return false;
 const {data:profile,error:pe}=await sb.from('local_ai_profiles').select('role').eq('user_id',active.user.id).maybeSingle();
 if(pe||profile?.role!=='admin')return false;
 session=active;return true;
}
async function core(action,payload={}){
 const {data:{session:active},error:sessionError}=await sb.auth.getSession();
 if(sessionError||!active?.access_token)throw Error('Sessão expirada. Entre novamente como administrador.');
 const response=await fetch(authEndpoint,{
  method:'POST',
  headers:{'Content-Type':'application/json',apikey:coreKey,Authorization:'Bearer '+active.access_token},
  body:JSON.stringify({action,...payload})
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.error||data.ok===false)throw Error(data.error||'Operação não confirmada no Supabase principal.');
 return data;
}

const aiEndpoint='https://innziuzgtpfsiywqmies.supabase.co/functions/v1/admin-create-merchant';
const aiPublishable='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
function generateProvisionalPassword(){
 const upper='ABCDEFGHJKLMNPQRSTUVWXYZ',lower='abcdefghijkmnopqrstuvwxyz',numbers='23456789',symbols='!@#$%&*-_';
 const all=upper+lower+numbers+symbols;
 const values=new Uint32Array(24);crypto.getRandomValues(values);
 const result=Array.from(values,v=>all[v%all.length]);
 result[0]=upper[values[0]%upper.length];
 result[1]=lower[values[1]%lower.length];
 result[2]=numbers[values[2]%numbers.length];
 result[3]=symbols[values[3]%symbols.length];
 return result.join('');
}
function accountLogin(p){
 return 'guru-'+String(p.id||'').replaceAll('-','').toLowerCase()+'@example.com';
}
function renderAccessResults(results){
 generatedAccesses=results.filter(x=>x.password);
 const list=$('generatedMerchantList');list.replaceChildren();
 for(const item of results){
  const card=el('div','panel');card.append(el('strong','',item.name));
  if(item.email)card.append(el('p','muted','Login: '+item.email));
  if(item.password)card.append(el('div','credential-value',item.password));
  card.append(el('p','muted',item.error?'Erro: '+item.error:item.warning||'Conta vinculada à loja.'));
  list.append(card);
 }
 const made=results.filter(x=>x.password).length,linked=results.filter(x=>x.linked).length,failed=results.filter(x=>x.error).length;
 $('generatedMerchantSummary').textContent='Criadas: '+made+' · Vinculadas: '+linked+' · Pendências: '+failed+
 '. Copie os acessos antes de fechar. Os dados não ficarão disponíveis para consulta posterior.';
 $('generatedMerchantCredentials').classList.remove('hidden');
}
function clearAccessResults(){
 $('generatedMerchantCredentials').classList.add('hidden');
 $('generatedMerchantList').replaceChildren();
 generatedAccesses=[];
}
$('closeGeneratedMerchantCredentials').onclick=clearAccessResults;
$('copyGeneratedMerchantCredentials').onclick=async()=>{
 if(!generatedAccesses.length){msg('Nenhuma senha nova foi gerada neste lote.');return}
 const txt=generatedAccesses.map(item=>[
  item.name,'Painel: https://jkkjkjjkkj94-bit.github.io/ia/lojista.html',
  'Login provisório: '+item.email,'Senha provisória: '+item.password,
  item.error?'ATENÇÃO: '+item.error:''
 ].filter(Boolean).join('\n')).join('\n\n---\n\n');
 try{await navigator.clipboard.writeText(txt);msg('Acessos copiados. Entregue cada senha somente ao responsável autorizado.')}
 catch{msg('Não foi possível copiar automaticamente. Copie os acessos exibidos antes de fechar.')}
};
function refreshAccountButton(){
 const count=leads.filter(p=>p.existing_store_id&&!p.merchant_user_id).length;
 $('missingAccountCount').textContent=count+' loja(s) ainda sem conta cadastrada na captação';
 $('createAllMerchantAccounts').disabled=!count||accountBatchRunning||bulkRunning;
}
async function registerMerchantAccountForStore(p){
 if(!p.existing_store_id)throw Error('Crie a loja antes de criar a conta.');
 // Releia o vínculo para recuperar operações parciais sem duplicar usuários.
 const {data:current,error:readError}=await sb.from('guru_commerce_prospects')
  .select('id,name,existing_store_id,merchant_user_id,merchant_email').eq('id',p.id).single();
 if(readError||!current)throw Error('Não foi possível conferir a captação.');
 let userId=current.merchant_user_id,login=current.merchant_email,password=null,warning='';
 if(!userId){
  login=accountLogin(p);
  const {data:existingAccount,error:lookupError}=await sb.from('local_ai_accounts')
   .select('user_id,email').eq('email',login).maybeSingle();
  if(lookupError)throw Error('Não foi possível verificar contas preexistentes.');
  if(existingAccount?.user_id){
   // Uma interrupção após a criação não pode gerar um segundo usuário.
   userId=existingAccount.user_id;warning='Conta provisória recuperada de uma tentativa anterior; senha antiga não está disponível. Redefina-a pelo fluxo de recuperação do administrador.';
  }else{
   password=generateProvisionalPassword();
   const {data:{session:active},error:sessionError}=await sb.auth.getSession();
   if(sessionError||!active?.access_token)throw Error('Sessão administrativa expirada.');
   const res=await fetch(aiEndpoint,{method:'POST',headers:{
    'Content-Type':'application/json',apikey:aiPublishable,
    Authorization:'Bearer '+active.access_token
   },body:JSON.stringify({display_name:current.name,email:login,password})});
   const payload=await res.json().catch(()=>({}));
   if(!res.ok||payload.error||!payload.ok||!payload.user_id)
    throw Error(payload.error||'A conta não foi confirmada no servidor.');
   userId=payload.user_id;
   if(payload.warning)warning=payload.warning;
  }
  const {data:linked,error:linkError}=await sb.from('guru_commerce_prospects')
   .update({merchant_user_id:userId,merchant_email:login,merchant_created_at:new Date().toISOString(),updated_at:new Date().toISOString(),status:'account_created'})
   .eq('id',p.id).is('merchant_user_id',null).select('id').maybeSingle();
  if(linkError||!linked){
   return {name:current.name,email:login,password,linked:false,error:'Conta criada, mas não vinculada à captação: '+(linkError?.message||'atualização concorrente')};
  }
 }
 try{
  await core('assign_owner',{store_id:current.existing_store_id,owner_id:userId});
  return {name:current.name,email:login,password,linked:true,warning};
 }catch(e){
  return {name:current.name,email:login,password,linked:false,error:'Conta criada, mas vínculo com a loja pendente: '+e.message};
 }
}
$('createAllMerchantAccounts').onclick=async()=>{
 if(accountBatchRunning||bulkRunning)return;
 const targets=leads.filter(p=>p.existing_store_id&&!p.merchant_user_id);
 if(!targets.length){msg('Nenhuma loja sem conta disponível.');return}
 if(!window.confirm('Criar e vincular '+targets.length+' contas de lojista?\n\nSerá criada uma conta provisória individual para cada loja. Os acessos serão exibidos UMA VEZ e nenhuma loja será ativada. Confirme que você está autorizado a administrar esses acessos.'))return;
 accountBatchRunning=true;refreshAccountButton();
 const results=[];
 try{
  for(let i=0;i<targets.length;i++){
   const p=targets[i];
   msg('Criando e vinculando conta '+(i+1)+' de '+targets.length+' · '+p.name);
   try{results.push(await registerMerchantAccountForStore(p))}
   catch(e){results.push({name:p.name,error:e.message})}
  }
  renderAccessResults(results);
  try{await load();await loadMerchants()}catch(e){msg('A operação terminou, mas não foi possível recarregar: '+e.message)}
  msg('Criação de contas concluída. Verifique pendências e copie as senhas exibidas.');
 }finally{accountBatchRunning=false;refreshAccountButton()}
};
async function load(){
 const {data,error}=await sb.from('guru_commerce_prospects').select('*').order('created_at',{ascending:false}).limit(1000);
 if(error)throw error;
 leads=data||[];
 const available=new Set(leads.filter(x=>!x.existing_store_id).map(x=>x.id));
 for(const id of [...selected])if(!available.has(id))selected.delete(id);
 const previous=$('categoryFilter').value;
 const cats=[...new Set(leads.map(x=>x.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 const category=$('categoryFilter');
 category.replaceChildren();
 const defaultOption=el('option','','Todas as categorias');defaultOption.value='';category.append(defaultOption);
 for(const name of cats){const option=el('option','',name);option.value=name;category.append(option)}
 category.value=cats.includes(previous)?previous:'';
 $('nAll').textContent=leads.length;
 $('nContacted').textContent=leads.filter(x=>x.status==='contacted').length;
 $('nInterested').textContent=leads.filter(x=>x.status==='interested').length;
 $('nApproval').textContent=leads.filter(x=>x.status==='awaiting_approval').length;
 render();
 refreshAccountButton();
}
async function loadMerchants(){
 const data=await core('list_merchants');
 merchants=data.merchants||[];
 return merchants;
}
function visible(){
 const query=clean($('query').value),city=clean($('cityFilter').value),category=$('categoryFilter').value,status=$('statusFilter').value;
 return leads.filter(p=>!query||clean([p.name,p.city,p.category,p.address,p.notes].join(' ')).includes(query))
 .filter(p=>!city||clean(p.city).includes(city))
 .filter(p=>!category||p.category===category)
 .filter(p=>!status||p.status===status);
}
function selectionCount(){
 $('selectionCount').textContent=selected.size+' selecionado(s) (máximo 20)';
 $('createBulk').disabled=!selected.size||bulkRunning;
 refreshAccountButton();
}
function field(label,value,max=250,multiline=false){
 const wrap=el('label');wrap.append(el('span','',label));
 const input=el(multiline?'textarea':'input');
 input.value=String(value||'');input.maxLength=max;wrap.append(input);
 return {wrap,input};
}
async function registerStores(items){
 if(!items.length)return [];
 const data=await core('create_stores',{prospect_ids:items.map(p=>p.id)});
 const results=data.results||[];
 for(const result of results){
  if(!result.store_id)continue;
  // A loja é criada no banco principal; o vínculo com a captação é idempotente.
  const {data:updated,error}=await sb.from('guru_commerce_prospects')
   .update({existing_store_id:result.store_id,status:'store_created',updated_at:new Date().toISOString()})
   .eq('id',result.prospect_id).select('id').maybeSingle();
  if(error||!updated)result.warning='Loja criada, mas vínculo administrativo não sincronizado. Repita a sincronização; não recrie a loja.';
 }
 return results;
}
function leadCard(p){
 const card=el('article','lead');
 if(!p.existing_store_id){
  const label=el('label','select-lead'),check=el('input');
  check.type='checkbox';check.checked=selected.has(p.id);
  check.onchange=()=>{
   if(check.checked&&selected.size>=20){check.checked=false;msg('Selecione até 20 lojas por operação.');return}
   if(check.checked)selected.add(p.id);else selected.delete(p.id);
   selectionCount();
  };
  label.append(check,el('span','','Selecionar loja'));card.append(label);
 }
 card.append(el('span','pill'+(p.existing_store_id?' ok':''),p.existing_store_id?'Loja pendente criada':statuses[p.status]||p.status));
 card.append(el('h3','',p.name),el('p','',p.category+' · '+p.city+' / '+p.uf));
 if(p.address)card.append(el('p','',p.address));
 if(p.contact_phone)card.append(el('p','',p.contact_phone));
 const actions=el('div','actions');
 const maps=el('a','btn','Pesquisar no Maps');
 maps.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name+' '+p.city+' '+p.uf);
 maps.rel='noopener noreferrer';maps.target='_blank';actions.append(maps);
 if(validUrl(p.source_url)){const source=el('a','btn','Consultar fonte');source.href=validUrl(p.source_url);source.target='_blank';source.rel='noopener noreferrer';actions.append(source)}
 const edit=el('button','','Editar');edit.type='button';actions.append(edit);
 const create=el('button','primary',p.existing_store_id?'Loja já criada':'Criar loja');
 create.type='button';create.disabled=Boolean(p.existing_store_id)||bulkRunning;actions.append(create);
 if(p.existing_store_id){
  const link=el('a','btn','Ver no painel de lojas');link.href='admin.html?view=stores';actions.append(link);
  if(p.merchant_user_id){
   const retry=el('button','','Conferir / vincular conta');
   retry.type='button';retry.disabled=bulkRunning||accountBatchRunning;
   retry.onclick=async()=>{
    if(!window.confirm('Conferir o vínculo desta loja com a conta de lojista já criada?'))return;
    retry.disabled=true;
    try{
     const result=await registerMerchantAccountForStore(p);
     if(result.error)throw Error(result.error);
     msg('Conta vinculada à loja '+p.name+'.');
     await load();
    }catch(e){msg('Falha ao vincular: '+e.message)}
    finally{retry.disabled=false}
   };
   actions.append(retry);
  }
 }
 card.append(actions);
 if(p.existing_store_id){
  card.append(el('p','muted','Cadastro pendente · '+p.existing_store_id+'. Sem ativação pública automática.')); 
  const assignBox=el('div','account-fields hidden');
  const title=el('strong','','Vincular a uma conta de lojista existente');
  const selector=el('select');
  const empty=el('option','','Selecione uma conta');empty.value='';selector.append(empty);
  const confirm=el('button','primary','Vincular conta à loja');confirm.type='button';
  const refresh=el('button','','Atualizar contas');refresh.type='button';
  const fill=()=>{
   selector.replaceChildren(empty.cloneNode(true));
   for(const m of merchants){
    const o=el('option','',(m.name||'Lojista')+(m.email?' · '+m.email:'')+(m.has_store?' · já tem loja':''));
    o.value=m.id;o.disabled=Boolean(m.has_store);selector.append(o);
   }
  };
  fill();
  const accountBar=el('div','actions'),pick=el('button','','Selecionar conta');pick.type='button';
  pick.onclick=async()=>{assignBox.classList.toggle('hidden');if(!assignBox.classList.contains('hidden')){try{await loadMerchants();fill()}catch(e){msg(e.message)}}};
  refresh.onclick=async()=>{try{await loadMerchants();fill()}catch(e){msg(e.message)}};
  confirm.onclick=async()=>{
   const owner=selector.value;
   if(!owner){msg('Selecione uma conta de lojista disponível.');return}
   if(!window.confirm('Vincular '+p.name+' à conta selecionada? Essa ação altera o responsável da loja.'))return;
   confirm.disabled=true;
   try{
    await core('assign_owner',{store_id:p.existing_store_id,owner_id:owner});
    msg('Conta vinculada à loja '+p.name+'. O lojista poderá completar os dados no próprio painel.');
    await loadMerchants();fill();assignBox.classList.add('hidden');
   }catch(e){msg('Não foi possível vincular: '+e.message)}finally{confirm.disabled=false}
  };
  accountBar.append(refresh,confirm);assignBox.append(title,selector,accountBar);
  actions.append(pick);card.append(assignBox);
 }
 create.onclick=async()=>{
  if(p.existing_store_id||bulkRunning)return;
  if(!window.confirm('Criar a loja '+p.name+' como PENDENTE, sem conta associada e sem publicar na GURU?'))return;
  create.disabled=true;
  try{
   const results=await registerStores([p]),result=results[0];
   if(!result?.store_id)throw Error(result?.error||'Nenhuma loja foi criada.');
   await load();msg((result.existing?'Loja já existia. ':'Loja criada. ')+(result.warning||'Agora você pode vinculá-la a uma conta existente.'));
  }catch(e){msg('Falha ao criar a loja: '+e.message)}finally{create.disabled=false}
 };
 const editBox=el('div','inline-editor hidden');
 const name=field('Nome',p.name,140),category=field('Categoria',p.category,100),city=field('Cidade',p.city,100),uf=field('UF',p.uf,2),
 address=field('Endereço',p.address,250),phone=field('Telefone',p.contact_phone,50),source=field('URL da fonte',p.source_url,500),notes=field('Observações',p.notes,1000,true);
 const statusLabel=el('label');statusLabel.append(el('span','','Status de captação'));const status=el('select');
 for(const [key,label] of Object.entries(statuses)){const opt=el('option','',label);opt.value=key;status.append(opt)}
 status.value=p.status;statusLabel.append(status);
 notes.wrap.className='wide';
 editBox.append(name.wrap,category.wrap,city.wrap,uf.wrap,address.wrap,phone.wrap,source.wrap,statusLabel,notes.wrap);
 const controls=el('div','actions wide'),save=el('button','primary','Salvar alterações'),cancel=el('button','','Cancelar'),remove=el('button','warn','Excluir da captação');
 for(const btn of [save,cancel,remove])btn.type='button';
 controls.append(save,cancel,remove);editBox.append(controls);card.append(editBox);
 edit.onclick=()=>{editBox.classList.toggle('hidden')};
 cancel.onclick=()=>editBox.classList.add('hidden');
 save.onclick=async()=>{
  const payload={name:name.input.value.trim(),category:category.input.value.trim(),city:city.input.value.trim(),uf:uf.input.value.trim().toUpperCase(),
   address:address.input.value.trim()||null,contact_phone:phone.input.value.trim()||null,source_url:source.input.value.trim()||null,
   notes:notes.input.value.trim()||null,status:status.value,updated_at:new Date().toISOString()};
  if(payload.name.length<2||!payload.city||!payload.category||!/^[A-Z]{2}$/.test(payload.uf)){msg('Informe nome, categoria, cidade e UF válidos.');return}
  if(payload.source_url&&!validUrl(payload.source_url)){msg('Informe uma URL HTTPS válida.');return}
  if(!window.confirm('Salvar alterações na captação? As lojas já criadas não serão modificadas automaticamente.'))return;
  save.disabled=true;
  try{
   const {data,error}=await sb.from('guru_commerce_prospects').update(payload).eq('id',p.id).select('id').maybeSingle();
   if(error||!data)throw Error(error?.message||'Alteração não confirmada.');
   await load();msg('Captação atualizada.');
  }catch(e){msg(e.message)}finally{save.disabled=false}
 };
 remove.onclick=async()=>{
  if(p.existing_store_id){msg('Esta captação possui loja vinculada. Gerencie a exclusão da loja antes de remover o registro.');return}
  if(!window.confirm('Excluir este registro de captação?'))return;
  remove.disabled=true;
  try{
   const {data,error}=await sb.from('guru_commerce_prospects').delete().eq('id',p.id).is('existing_store_id',null).select('id').maybeSingle();
   if(error||!data)throw Error(error?.message||'Exclusão não permitida.');
   await load();msg('Captação excluída.');
  }catch(e){msg(e.message)}finally{remove.disabled=false}
 };
 return card;
}
function render(){
 const items=visible();
 $('foundLabel').textContent=items.length+' comércio(s)';
 $('leads').replaceChildren();
 if(!items.length)$('leads').append(el('div','panel','Nenhum comércio encontrado.'));
 for(const item of items)$('leads').append(leadCard(item));
 selectionCount();
}
$('selectVisible').onclick=()=>{
 for(const p of visible()){
  if(selected.size>=20)break;
  if(!p.existing_store_id)selected.add(p.id);
 }
 render();
};
$('clearSelected').onclick=()=>{selected.clear();render()};
$('createBulk').onclick=async()=>{
 if(bulkRunning)return;
 const targets=leads.filter(p=>selected.has(p.id)&&!p.existing_store_id).slice(0,20);
 if(!targets.length)return;
 if(!window.confirm('Criar '+targets.length+' LOJAS pendentes, sem criar contas ou senhas? Elas não serão publicadas.'))return;
 bulkRunning=true;selectionCount();
 try{
  const results=await registerStores(targets);
  const created=results.filter(x=>x.created).length,existing=results.filter(x=>x.existing).length;
  const errors=results.filter(x=>x.error||x.warning);
  await load();
  selected.clear();render();
  msg('Lote concluído: '+created+' lojas criadas, '+existing+' já existentes, '+errors.length+' com pendência. '+(errors.length?errors.map(x=>x.error||x.warning).slice(0,3).join('; '):'Agora é possível selecionar uma conta para cada loja.'));
 }catch(e){msg('Falha ao criar o lote: '+e.message)}
 finally{bulkRunning=false;selectionCount()}
};
$('createForm').onsubmit=async event=>{
 event.preventDefault();if(loading)return;
 const name=$('newName').value.trim(),city=$('newCity').value.trim(),uf=$('newUf').value.trim().toUpperCase(),
 category=$('newCategory').value.trim(),source_url=$('newSource').value.trim();
 if(name.length<2||!city||!category||!/^[A-Z]{2}$/.test(uf)){msg('Preencha nome, categoria, cidade e UF.');return}
 if(source_url&&!validUrl(source_url)){msg('O link da fonte deve ser HTTPS.');return}
 const norm=value=>clean(value).replace(/[^a-z0-9]/g,'');
 if(leads.some(p=>norm(p.name)===norm(name)&&norm(p.city)===norm(city)&&p.uf===uf)){msg('Comércio já existente na captação.');return}
 const btn=$('createForm').querySelector('[type="submit"]');loading=true;btn.disabled=true;
 try{
  const {error}=await sb.from('guru_commerce_prospects').insert({name,city,uf,category,
   address:$('newAddress').value.trim()||null,contact_phone:$('newPhone').value.trim()||null,
   source_url:source_url||null,source_name:source_url?'Fonte administrativa':null,notes:$('newNotes').value.trim()||null,
   created_by:session.user.id,status:'identified'});
  if(error)throw error;
  $('createForm').reset();$('newCity').value='Salto de Pirapora';$('newUf').value='SP';
  await load();msg('Comércio incluído na captação. Agora você pode criar a loja pendente.');
 }catch(e){msg(e.message)}finally{loading=false;btn.disabled=false}
};
for(const id of ['query','cityFilter','categoryFilter','statusFilter'])$(id).addEventListener('input',render);
$('cityFilter').addEventListener('input',()=>{$('maps').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('comércios '+$('cityFilter').value.trim()+' SP')});
$('refresh').onclick=()=>load().then(()=>msg('Lista atualizada.')).catch(e=>msg(e.message));
if(await verify()){
 $('work').classList.remove('hidden');
 try{await load();await loadMerchants()}catch(e){msg('Erro ao carregar: '+e.message)}
}else $('unauthed').style.display='block';
