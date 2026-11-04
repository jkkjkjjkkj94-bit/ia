import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=id=>document.getElementById(id);
const explainSourceError=(message,source)=>{
 const text=String(message||'');
 if(/robots\.txt|HTTP\s*(401|403)|indexa[cç][aã]o.+permiss[aã]o/i.test(text))
  return 'A loja '+(source?.name||'selecionada')+' não permitiu a consulta automática. Os produtos já cadastrados permanecem disponíveis.';
 return text;
};
const sourceStatus=source=>{
 if(source.auto_sync_enabled!==true)return 'Consulta automática indisponível';
 if(source.sync_status==='ok')return 'Catálogo atualizado';
 if(source.sync_status==='pending')return 'Aguardando sincronização';
 if(source.sync_status==='no_products')return 'Nenhum produto encontrado';
 if(source.sync_status==='error')return 'Não foi possível consultar a loja';
 return 'Fonte cadastrada';
};
const tell=msg=>{const toast=get('toast');if(toast){toast.textContent=msg;toast.classList.add('on');setTimeout(()=>toast.classList.remove('on'),4000)}};
const validate=(url,site=null)=>{
 try{
  const u=new URL(url);const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||host==='localhost'||
    host.endsWith('.local')||host.endsWith('.internal')||/^\d+\.\d+\.\d+\.\d+$/.test(host)||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host))return null;
  if(site&&site.hostname!==host)return null;
  return u;
 }catch{return null}
};
let ready=false;
function init(){
 if(ready||!get('sources'))return;
 ready=true;
 const section=get('sources');
 const card=document.createElement('div');card.className='card';card.id='guruWebSourcesPanel';card.style.marginTop='14px';
 card.innerHTML='<div class="section-head"><div><h3>Fontes de lojas autorizadas</h3>'
 +'<div class="meta">A GURU consulta somente sites adicionados aqui. O cadastro não coleta preços ou estoque automaticamente: é necessário sincronizar a página pública e verificar os resultados.</div></div></div>'
 +'<form id="guruSourceForm" class="grid admin-grid" style="margin-top:12px">'
 +'<div class="field"><label>Nome da loja</label><input id="guruSourceName" maxlength="120" placeholder="Ex.: Nike Brasil" required></div>'
 +'<div class="field"><label>Site oficial (HTTPS)</label><input id="guruSourceUrl" type="url" placeholder="https://www.nike.com.br" required></div>'
 +'<div class="field"><label>Página pública do catálogo (mesmo domínio)</label><input id="guruCatalogUrl" type="url" placeholder="https://www.nike.com.br/nav/categorias/tenis" required></div>'
 +'<div class="field"><label>Ação</label><button type="submit" class="btn dark">Cadastrar fonte</button></div></form>'
 +'<div class="meta" style="margin:12px 0">A sincronização respeita regras do site e não consegue extrair todos os catálogos. Se a loja usar JavaScript ou bloquear consultas automatizadas, utilize um feed autorizado ou uma API oficial.</div>'
 +'<div id="guruApprovedSourcesList" class="list"></div>'
 +'<form id="guruManualProductForm" class="card" style="display:grid;gap:10px;margin-top:14px">'
 +'<h3>Adicionar produto da loja</h3><div class="meta">Cadastre o nome e o link oficial da loja. Preço e estoque não serão presumidos.</div>'
 +'<div class="field"><label for="guruManualSource">Loja cadastrada</label><select id="guruManualSource" required><option value="">Escolha a loja</option></select></div>'
 +'<div class="field"><label for="guruManualName">Nome do produto</label><input id="guruManualName" maxlength="200" minlength="3" required placeholder="Ex.: Tênis Samba OG"></div>'
 +'<div class="field"><label for="guruManualUrl">Link oficial do produto</label><input id="guruManualUrl" type="url" required placeholder="https://www.adidas.com.br/..."></div>'
 +'<button class="btn dark" type="submit">Adicionar produto</button>'
 +'<div class="meta" id="guruManualFeedback" role="status"></div></form>';
 section.appendChild(card);
 get('guruSourceForm').addEventListener('submit',e=>{e.preventDefault();void addSource()});
 get('guruManualProductForm').addEventListener('submit',e=>{e.preventDefault();void addManualProduct()});
 void refresh();
}
async function addSource(){
 const name=get('guruSourceName').value.trim();
 const site=validate(get('guruSourceUrl').value.trim());
 const catalog=validate(get('guruCatalogUrl').value.trim(),site);
 if(name.length<2||!site||!catalog){tell('Confira os endereços HTTPS. O catálogo deve ser do mesmo domínio aprovado.');return}
 const {error}=await sb.from('guru_web_sources').insert({
  name,base_url:site.origin,catalog_url:catalog.href,enabled:true,sync_status:'pending'
 });
 if(error){tell('Não foi possível cadastrar: '+error.message);return}
 get('guruSourceForm').reset();tell('Fonte autorizada cadastrada. Sincronize para buscar produtos.');await refresh();
}
async function editStatus(source,enabled){
 const {error}=await sb.from('guru_web_sources').update({enabled,updated_at:new Date().toISOString()}).eq('id',source.id);
 if(error){tell('Erro ao atualizar fonte: '+error.message);return}
 tell(enabled?'Fonte ativada.':'Fonte desativada: os produtos deixam de aparecer nas buscas.');await refresh();
}
// Synchronizes approved records in the GURU database, not the blocked website.
async function synchronize(source){
 const button=get('guruSync_'+source.id);
 if(button){button.disabled=true;button.textContent='Sincronizando...'}
 try{
  const {count,error}=await sb.from('guru_web_products').select('id',{count:'exact',head:true}).eq('source_id',source.id);
  if(error)throw error;
  const quantity=Number(count||0);
  const {error:saveError}=await sb.from('guru_web_sources').update({indexed_count:quantity,updated_at:new Date().toISOString()}).eq('id',source.id);
  if(saveError)throw saveError;
  tell('Catálogo sincronizado no Supabase: '+quantity+' produtos em '+source.name+'.');
 }catch(err){tell('Não foi possível atualizar o catálogo: '+(err?.message||'erro desconhecido'))}
 await refresh();
}
async function addManualProduct(){
 const form=get('guruManualProductForm'),feedback=get('guruManualFeedback');
 const id=get('guruManualSource')?.value||'';
 const name=get('guruManualName')?.value.trim()||'';
 const link=get('guruManualUrl')?.value.trim()||'';
 if(!id||name.length<3){feedback.textContent='Selecione uma loja e informe o produto.';return}
 const {data:source,error:sourceError}=await sb.from('guru_web_sources').select('id,name,base_url,enabled').eq('id',id).maybeSingle();
 if(sourceError||!source?.enabled){feedback.textContent='Fonte indisponível ou sem permissão.';return}
 const site=validate(source.base_url),url=validate(link,site);
 if(!site||!url||site.origin!==url.origin){feedback.textContent='O link HTTPS deve pertencer exatamente ao site oficial cadastrado.';return}
 const {error}=await sb.from('guru_web_products').upsert({
  source_id:id,name,product_url:url.href,price:null,currency:null,availability:'unknown'
 },{onConflict:'source_id,product_url',ignoreDuplicates:true});
 if(error){feedback.textContent='Não foi possível cadastrar: '+error.message;return}
 form.reset();feedback.textContent='Produto registrado. Preço e estoque não confirmados.';
 await synchronize(source);
}

async function refresh(){
 const list=get('guruApprovedSourcesList');if(!list)return;
 list.textContent='Consultando fontes autorizadas...';
 const {data,error}=await sb.from('guru_web_sources').select('id,name,base_url,catalog_url,enabled,sync_status,sync_note,last_synced_at,next_page,indexed_count,scanned_pages,auto_sync_enabled').order('name');
 if(error){list.textContent='Sem acesso às fontes: '+error.message;return}
 list.replaceChildren();
 if(!data?.length){list.textContent='Nenhuma fonte web cadastrada.';return}
 const productSource=get('guruManualSource');
 if(productSource){
  const current=productSource.value;
  productSource.replaceChildren(new Option('Escolha a loja',''));
  for(const item of data.filter(x=>x.enabled))productSource.add(new Option(item.name,item.id));
  if(data.some(x=>x.id===current&&x.enabled))productSource.value=current;
 }
 for(const s of data){
  const item=document.createElement('div');item.className='item';
  const header=document.createElement('div');header.className='row';
  const left=document.createElement('div');
  left.innerHTML='<b>'+esc(s.name)+'</b><div class="meta">'+esc(s.base_url)+'</div>'
    +'<div class="meta">Status: '+esc(sourceStatus(s))+' · '+(s.last_synced_at?new Date(s.last_synced_at).toLocaleString('pt-BR'):'sem sincronização')+'</div>'
    +'<div class="meta">Consulta automática ao site: '+(s.auto_sync_enabled===true?'permitida':'desativada; o botão sincroniza apenas produtos do Supabase')+'</div>'
    +'<div class="meta">Produtos indexados: '+Number(s.indexed_count||0)+' · páginas processadas: '+Number(s.scanned_pages||0)+' · próxima página: '+Number(s.next_page||1)+'</div>'
    +(s.sync_note?'<div class="meta">'+esc(explainSourceError(s.sync_note,s))+'</div>':'');
  const buttons=document.createElement('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
  const sync=document.createElement('button');sync.id='guruSync_'+s.id;sync.className='btn sm';sync.type='button';sync.textContent='Sincronizar catálogo';sync.disabled=!s.enabled;sync.onclick=()=>synchronize(s);
  const toggle=document.createElement('button');toggle.className='btn sm';toggle.type='button';
  toggle.textContent=s.enabled?'Desativar':'Ativar';toggle.onclick=()=>editStatus(s,!s.enabled);
  buttons.append(sync,toggle);header.append(left,buttons);item.appendChild(header);list.appendChild(item);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
