const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
let editor=null;

function parseCurrent(){
  try{return JSON.parse($('aiConfigValue')?.value||'null')}catch{return null}
}
function splitTerms(v){return String(v||'').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean)}
function uniq(a){return [...new Set(a.map(x=>String(x).trim()).filter(Boolean))]}
function keyLabel(k){return ({categories:'Categorias',synonyms:'Sinônimos',intents:'Intenções',negative_words:'Palavras negativas',ranking_weights:'Pesos do ranking',context_rules:'Regras de contexto'})[k]||k}
function helpFor(k){return ({categories:'Adicione ou remova categorias que a IA deve reconhecer.',synonyms:'Cadastre um termo principal e as palavras equivalentes que o usuário pode digitar.',intents:'Agrupe palavras e expressões que representam cada intenção da conversa.',negative_words:'Adicione expressões que indiquem exclusão, rejeição ou preferência negativa.',ranking_weights:'Defina a importância de cada critério no ranking. Quanto maior, mais influencia.',context_rules:'Escolha quais informações devem ser mantidas ou limpas durante a conversa.'})[k]||'Edite esta configuração usando os campos abaixo.'}

function ensureEditor(){
  const ta=$('aiConfigValue'); if(!ta||editor)return;
  const field=ta.closest('.field');
  ta.classList.add('json-hidden-editor');
  const note=document.createElement('div');note.className='visual-editor-note';note.innerHTML='<b>Modo simples</b><span>Você não precisa escrever código. O sistema gera a configuração automaticamente.</span>';
  editor=document.createElement('div');editor.id='aiVisualEditor';editor.className='ai-visual-editor';
  field.insertBefore(note,ta);field.insertBefore(editor,ta);
  const label=field.querySelector('label');if(label)label.textContent='Editor visual';
}
function addGroupCard(container,title='',values=[]){
  const card=document.createElement('div');card.className='ai-config-group';card.innerHTML=`<div class="ai-config-group-head"><strong>Grupo</strong><button type="button" class="btn sm danger ai-remove-group">Remover</button></div><div class="field"><label>Termo principal</label><input class="ai-main-key" value="${esc(title)}" placeholder="Ex.: pizzaria"></div><div class="field"><label>Sinônimos / termos relacionados</label><textarea class="ai-group-values" placeholder="Um termo por linha ou separados por vírgula">${esc(values.join('\n'))}</textarea><div class="meta">Ex.: pizza, pizzas, pizzeria, rodízio de pizza</div></div>`;
  card.querySelector('.ai-remove-group').onclick=()=>{card.remove();syncToJSON()};
  card.querySelectorAll('input,textarea').forEach(x=>x.addEventListener('input',syncToJSON));
  container.appendChild(card);
}
function renderGroups(value){
  const entries=value&&typeof value==='object'&&!Array.isArray(value)?Object.entries(value):[];
  editor.innerHTML=`<div class="visual-editor-help">${esc(helpFor($('aiConfigKey').value))}</div><div id="aiGroups"></div><button type="button" class="btn ai-add-group">+ Adicionar grupo</button>`;
  const box=editor.querySelector('#aiGroups');entries.forEach(([k,v])=>addGroupCard(box,k,Array.isArray(v)?v:[]));if(!entries.length)addGroupCard(box);
  editor.querySelector('.ai-add-group').onclick=()=>addGroupCard(box);
}
function renderList(value){
  const arr=Array.isArray(value)?value:[];
  editor.innerHTML=`<div class="visual-editor-help">${esc(helpFor($('aiConfigKey').value))}</div><div class="field"><label>Itens</label><textarea id="aiSimpleList" placeholder="Um item por linha">${esc(arr.join('\n'))}</textarea><div class="meta">Digite um item por linha. O sistema remove itens repetidos automaticamente.</div></div><div id="aiTagPreview" class="tag-preview"></div>`;
  const ta=editor.querySelector('#aiSimpleList');ta.addEventListener('input',()=>{renderTagPreview();syncToJSON()});renderTagPreview();
}
function renderTagPreview(){const box=editor?.querySelector('#aiTagPreview'),ta=editor?.querySelector('#aiSimpleList');if(!box||!ta)return;box.innerHTML=uniq(splitTerms(ta.value)).slice(0,80).map(x=>`<span class="tag-chip">${esc(x)}</span>`).join('')}
function renderKeyValue(value){
  const obj=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  editor.innerHTML=`<div class="visual-editor-help">${esc(helpFor($('aiConfigKey').value))}</div><div id="aiKVRows" class="kv-rows"></div><button type="button" class="btn ai-add-kv">+ Adicionar regra</button>`;
  const rows=editor.querySelector('#aiKVRows');
  const add=(k='',v='')=>{const row=document.createElement('div');row.className='kv-row';row.innerHTML=`<input class="kv-key" value="${esc(k)}" placeholder="Critério"><input class="kv-value" value="${esc(v)}" placeholder="Valor"><button type="button" class="btn sm danger">Remover</button>`;row.querySelector('button').onclick=()=>{row.remove();syncToJSON()};row.querySelectorAll('input').forEach(x=>x.addEventListener('input',syncToJSON));rows.appendChild(row)};
  Object.entries(obj).forEach(([k,v])=>add(k,typeof v==='object'?JSON.stringify(v):v));if(!Object.keys(obj).length)add();editor.querySelector('.ai-add-kv').onclick=()=>add();
}
function renderEditor(){
  ensureEditor();if(!editor)return;
  const key=$('aiConfigKey')?.value||'',value=parseCurrent();
  const title=document.createElement('div');title.className='visual-editor-title';title.innerHTML=`<div><b>${esc(keyLabel(key))}</b><span>${esc(helpFor(key))}</span></div>`;
  if(['synonyms','intents'].includes(key))renderGroups(value);
  else if(['categories','negative_words'].includes(key))renderList(value);
  else renderKeyValue(value);
  editor.prepend(title);
}
function syncToJSON(){
  const key=$('aiConfigKey')?.value||'',ta=$('aiConfigValue');if(!ta||!editor)return;
  let value;
  if(['synonyms','intents'].includes(key)){
    value={};editor.querySelectorAll('.ai-config-group').forEach(card=>{const k=card.querySelector('.ai-main-key').value.trim(),vals=uniq(splitTerms(card.querySelector('.ai-group-values').value));if(k)value[k]=vals});
  }else if(['categories','negative_words'].includes(key)){
    value=uniq(splitTerms(editor.querySelector('#aiSimpleList')?.value||''));
  }else{
    value={};editor.querySelectorAll('.kv-row').forEach(row=>{const k=row.querySelector('.kv-key').value.trim(),raw=row.querySelector('.kv-value').value.trim();if(!k)return;let v=raw;if(raw==='true')v=true;else if(raw==='false')v=false;else if(raw!==''&&!Number.isNaN(Number(raw)))v=Number(raw);else{try{if((raw.startsWith('{')&&raw.endsWith('}'))||(raw.startsWith('[')&&raw.endsWith(']')))v=JSON.parse(raw)}catch{}}value[k]=v});
  }
  ta.value=JSON.stringify(value,null,2);
}
function bind(){
  ensureEditor();renderEditor();
  $('aiConfigKey')?.addEventListener('change',()=>setTimeout(renderEditor,0));
  $('aiConfigReload')?.addEventListener('click',()=>setTimeout(renderEditor,50));
  $('aiConfigSave')?.addEventListener('click',()=>syncToJSON(),true);
  const ta=$('aiConfigValue');if(ta)new MutationObserver(()=>renderEditor()).observe(ta,{attributes:true});
  let last=ta?.value||'';setInterval(()=>{if(!ta)return;if(ta.value!==last){last=ta.value;renderEditor()}},600);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,400));else setTimeout(bind,400);
import('./admin-sync.js?v=1').catch(err=>console.error('[Local AI Sync Loader]',err));
import('./admin-store-group.js?v=1').catch(err=>console.error('[Store Group Loader]',err));
import('./admin-pending-core.js?v=1').catch(err=>console.error('[Pending Stores Loader]',err));
import('./admin-synonym-suggestions.js?v=1').catch(err=>console.error('[Synonym Suggestions Loader]',err));
import('./guru-quality-admin.js?v=2').catch(err=>console.error('[GURU Quality Loader]',err));
import('./admin-delete-controls.js?v=1').catch(err=>console.error('[Admin Delete Loader]',err));
import('./admin-merchant-enhancements.js?v=1').catch(err=>console.error('[Merchant Enhancements Loader]',err));
import('./admin-merchant-details.js?v=1').catch(err=>console.error('[Merchant Details Loader]',err));
import('./admin-taxonomy-db.js?v=1').catch(err=>console.error('[Taxonomy DB Loader]',err));
