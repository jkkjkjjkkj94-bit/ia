import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
import{groupsByCategory}from'./guru-store-groups.js?v=1';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
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
 const{data,error}=await sb.from('local_ai_stores').select('id,name,category,group,groups,specialties').eq('id',currentStoreId).maybeSingle();if(error||!data)return;
 host.querySelector('#adminStoreGroupBox')?.remove();const allowed=new Set(groupsByCategory[data.category]||[]),group=allowed.has(data.group)?data.group:'',extra=(data.groups||[]).filter(g=>g&&g!==group&&allowed.has(g));
 const box=document.createElement('div');box.id='adminStoreGroupBox';box.className='drawer-section';box.innerHTML=`<h3>Classificação da IA</h3><div class="field"><label>Grupo principal</label><select id="adminStoreGroup">${optionsFor(data.category,group)}</select></div><div class="field"><label>Grupos adicionais</label><textarea id="adminStoreGroups" placeholder="Um por linha">${esc(extra.join('\n'))}</textarea><div class="meta">Use somente grupos disponíveis para a categoria.</div></div><div class="field"><label>Especialidades / palavras-chave</label><textarea id="adminStoreSpecialties" placeholder="bolo de aniversário\nbrigadeiro\ndoces para festa">${esc((data.specialties||[]).join('\n'))}</textarea></div><div class="meta">Categoria: ${esc(data.category||'—')}.</div><div id="adminStoreClassAlert"></div><button id="adminSaveStoreGroup" class="btn dark" type="button" style="margin-top:10px">Salvar classificação</button>`;
 host.prepend(box);document.getElementById('adminStoreClassAlert').innerHTML=await inconsistency(data);
 document.getElementById('adminSaveStoreGroup').onclick=async()=>{const selected=document.getElementById('adminStoreGroup').value||null,validGroup=selected&&allowed.has(selected)?selected:null,extras=split(document.getElementById('adminStoreGroups').value).filter(x=>x!==validGroup&&allowed.has(x)),specialties=split(document.getElementById('adminStoreSpecialties').value),all=[...new Set([validGroup,...extras].filter(Boolean))];const{error:e}=await sb.from('local_ai_stores').update({group:validGroup,groups:all,specialties}).eq('id',currentStoreId);if(e)return alert(e.message);const btn=document.getElementById('adminSaveStoreGroup');btn.textContent='Salvo';setTimeout(()=>{if(btn)btn.textContent='Salvar classificação'},1200)};
}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-open-store]');if(!btn)return;currentStoreId=btn.dataset.openStore;setTimeout(inject,80)});
window.GuruAdminStoreGroups={groupsByCategory};
