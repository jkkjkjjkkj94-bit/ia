import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
import{groupsByCategory}from'./guru-store-groups.js?v=1';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const CLASS_URL='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/admin-pending-stores';
const CORE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
async function requestClassification(method,id,payload){
 const{data:{session},error:sessionError}=await sb.auth.getSession();
 if(sessionError||!session?.access_token)throw new Error('Sessão expirada. Entre novamente como administrador.');
 const url=CLASS_URL+(method==='GET'?'?store_id='+encodeURIComponent(id):'');
 const response=await fetch(url,{
  method,
  headers:{apikey:CORE_KEY,Authorization:'Bearer '+session.access_token,Accept:'application/json',...(method==='POST'?{'Content-Type':'application/json'}:{})},
  ...(method==='POST'?{body:JSON.stringify({action:'save_classification',id,...payload})}:{})
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok||result.error)throw new Error(result.error||'Falha ao consultar o CORE ('+response.status+').');
 if(!result.store)throw new Error('O CORE não confirmou a operação.');
 return result.store;
}

let currentStoreId=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const split=s=>[...new Set(String(s||'').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean))];
const groupHints={Pizzaria:['pizza','calabresa','mussarela','pizzaria'],Hamburgueria:['hamburguer','burger','x-salada','lanche'],Padaria:['pao','padaria','panificadora'],Doceria:['bolo','brigadeiro','doce','pudim','sobremesa','confeitaria'],Sorveteria:['sorvete','gelato','milkshake'],Açaí:['acai','açai'],Japonesa:['sushi','sashimi','temaki','yakisoba']};
const optionsFor=(category,current='')=>`<option value="">Sem grupo</option>${(groupsByCategory[category]||[]).map(g=>`<option value="${esc(g)}" ${g===current?'selected':''}>${esc(g)}</option>`).join('')}`;
async function inconsistency(store){
 const{data:ps,error}=await sb.from('local_ai_products').select('name,description,category').eq('store_id',store.id).eq('active',true);if(error||!ps?.length||!store.group)return'';
 const text=norm(ps.map(p=>[p.name,p.description,p.category].filter(Boolean).join(' ')).join(' ')),own=(groupHints[store.group]||[]).some(x=>text.includes(norm(x)));let suggested=null,best=0;
 for(const[g,terms]of Object.entries(groupHints)){const hits=terms.filter(x=>text.includes(norm(x))).length;if(hits>best){best=hits;suggested=g}}
 return !own&&best>=2&&suggested&&suggested!==store.group?`<div class="alert-row warn" style="margin-top:10px"><b>Possível classificação incorreta</b><span>Os produtos parecem mais relacionados a ${esc(suggested)}. Revise antes de alterar.</span></div>`:'';
}
async function inject(){
 if(!currentStoreId)return;const host=document.getElementById('drawerContent');if(!host)return;
 const storeId=currentStoreId;
 let data;
 try{data=await requestClassification('GET',storeId)}
 catch(error){
  console.error('[Admin Store Group]',error);
  const status=document.createElement('div');
  status.className='alert-row warn';
  status.textContent='Classificação indisponível: '+error.message;
  host.prepend(status);
  return;
 }
 if(!data||storeId!==currentStoreId||host!==document.getElementById('drawerContent'))return;
 host.querySelector('#adminStoreGroupBox')?.remove();const allowed=new Set(groupsByCategory[data.category]||[]),group=allowed.has(data.group)?data.group:'',extra=(data.groups||[]).filter(g=>g&&g!==group&&allowed.has(g));
 const box=document.createElement('div');box.id='adminStoreGroupBox';box.className='drawer-section';box.innerHTML=`<h3>Classificação da IA</h3><div class="field"><label>Grupo principal</label><select id="adminStoreGroup">${optionsFor(data.category,group)}</select></div><div class="field"><label>Grupos adicionais</label><textarea id="adminStoreGroups" placeholder="Um por linha">${esc(extra.join('\n'))}</textarea><div class="meta">Use somente grupos disponíveis para a categoria.</div></div><div class="field"><label>Especialidades / palavras-chave</label><textarea id="adminStoreSpecialties" placeholder="Ex.: sabores especiais\nproduto artesanal\nserviço diferenciado">${esc((data.specialties||[]).join('\n'))}</textarea></div><div class="meta">Categoria: ${esc(data.category||'—')}.</div><div id="adminStoreClassAlert"></div><button id="adminSaveStoreGroup" class="btn dark" type="button" style="margin-top:10px">Salvar classificação</button><div id="adminStoreClassFeedback" class="meta" role="status" aria-live="polite" style="margin-top:8px"></div>`;
 host.prepend(box);
 inconsistency(data).then(html=>{const target=box.querySelector('#adminStoreClassAlert');if(target&&box.isConnected)target.innerHTML=html}).catch(err=>console.warn('[Admin Store Classification] Aviso de classificação:',err));
 const saveButton=box.querySelector('#adminSaveStoreGroup');
 const feedback=box.querySelector('#adminStoreClassFeedback');
 saveButton.onclick=async()=>{
  if(saveButton.disabled)return;
  const selected=box.querySelector('#adminStoreGroup').value||null;
  const validGroup=selected&&allowed.has(selected)?selected:null;
  const extras=split(box.querySelector('#adminStoreGroups').value).filter(x=>x!==validGroup&&allowed.has(x));
  const specialties=split(box.querySelector('#adminStoreSpecialties').value);
  const all=[...new Set([validGroup,...extras].filter(Boolean))];
  saveButton.disabled=true;saveButton.textContent='Salvando...';
  feedback.textContent='Gravando classificação no CORE...';
  try{
   const saved=await requestClassification('POST',storeId,{group:validGroup,groups:all,specialties});
   if(!box.isConnected)return;
   data=saved;
   saveButton.textContent='Salvo';
   feedback.textContent='Classificação salva no CORE com sucesso.';
   feedback.style.color='#19734a';
   window.dispatchEvent(new CustomEvent('guru-admin-classification-saved',{detail:{store:saved}}));
   document.getElementById('refreshBtn')?.click();
  }catch(error){
   console.error('[Admin Store Classification] Não foi possível salvar:',error);
   feedback.style.color='#a22424';
   feedback.textContent='Erro ao salvar: '+(error.message||'falha desconhecida');
   saveButton.textContent='Tentar novamente';
  }finally{
   saveButton.disabled=false;
  }
 };

}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-open-store]');if(!btn)return;currentStoreId=btn.dataset.openStore;setTimeout(inject,80)});
window.GuruAdminStoreGroups={groupsByCategory};
