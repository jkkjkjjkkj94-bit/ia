import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';

const AI_URL='https://innziuzgtpfsiywqmies.supabase.co';
const AI_KEY='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
const CORE_URL='https://ccsypggvelcxsqszepfs.supabase.co';
const CORE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
const sb=createClient(AI_URL,AI_KEY);
let storesCache=null;

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
function visitorKey(){let k=localStorage.getItem('local_ai_review_visitor');if(!k){k=(crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`);localStorage.setItem('local_ai_review_visitor',k)}return k}
async function loadStores(){if(storesCache)return storesCache;const r=await fetch(`${CORE_URL}/rest/v1/local_ai_stores?select=id,name&active=eq.true&status=eq.active`,{headers:{apikey:CORE_KEY,Authorization:`Bearer ${CORE_KEY}`}});storesCache=r.ok?await r.json():[];return storesCache}
async function findStore(name){const stores=await loadStores(),n=norm(name);return stores.find(s=>norm(s.name)===n)||stores.find(s=>norm(s.name).includes(n)||n.includes(norm(s.name)))||null}
async function getReviews(storeId){const{data}=await sb.from('local_ai_reviews').select('rating,visitor_key').eq('store_id',storeId);return data||[]}
function avg(rows){return rows.length?rows.reduce((a,r)=>a+Number(r.rating||0),0)/rows.length:0}

function injectStyles(){if(document.getElementById('cardRatingStyles'))return;const s=document.createElement('style');s.id='cardRatingStyles';s.textContent=`
.card-rating{margin-top:12px;padding-top:11px;border-top:1px solid #f0f0f0}.card-rating-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}.card-rating-title{font-size:10px;font-weight:700;color:#555}.card-rating-summary{font-size:9.5px;color:#888}.card-rating-stars{display:flex;gap:3px}.card-rating-star{border:0;background:transparent;padding:1px 2px;font-size:18px;line-height:1;color:#cfcfcf;cursor:pointer;transition:transform .12s ease,color .12s ease}.card-rating-star:hover,.card-rating-star.on{color:#111;transform:translateY(-1px)}.card-rating-form{display:none;margin-top:8px;gap:6px;align-items:center}.card-rating-form.on{display:flex}.card-rating-comment{min-width:0;flex:1;border:1px solid #e5e5e5;border-radius:9px;padding:7px 9px;font:inherit;font-size:10px;outline:none}.card-rating-send{border:0;border-radius:9px;background:#111;color:#fff;padding:7px 10px;font-size:10px;font-weight:700;cursor:pointer}.card-rating-note{font-size:9.5px;color:#777;margin-top:6px}.card-rating-done{font-size:10px;color:#555;margin-top:5px}@media(max-width:680px){.card-rating-head{align-items:flex-start;flex-direction:column}.card-rating-form{align-items:stretch;flex-direction:column}.card-rating-send{width:100%}}
`;document.head.appendChild(s)}

async function mount(card){if(card.dataset.ratingMounted==='1')return;const title=card.querySelector('.store-card-top h3, h3');if(!title)return;card.dataset.ratingMounted='1';const store=await findStore(title.textContent.trim());if(!store)return;
 const visitor=visitorKey();let reviews=await getReviews(store.id);let mine=reviews.find(r=>r.visitor_key===visitor)||null;
 const wrap=document.createElement('div');wrap.className='card-rating';
 const header=document.createElement('div');header.className='card-rating-head';
 const left=document.createElement('div');left.innerHTML='<div class="card-rating-title">Avalie esta loja</div>';
 const summary=document.createElement('div');summary.className='card-rating-summary';
 const stars=document.createElement('div');stars.className='card-rating-stars';stars.setAttribute('aria-label','Avaliação de 1 a 5 estrelas');
 const form=document.createElement('div');form.className='card-rating-form';
 const comment=document.createElement('input');comment.className='card-rating-comment';comment.maxLength=240;comment.placeholder='Comentário opcional';
 const send=document.createElement('button');send.type='button';send.className='card-rating-send';send.textContent='Enviar';form.append(comment,send);
 const note=document.createElement('div');note.className='card-rating-note';
 let selected=mine?Number(mine.rating):0;
 function render(){const a=avg(reviews);summary.textContent=reviews.length?`★ ${a.toFixed(1)} · ${reviews.length} ${reviews.length===1?'avaliação':'avaliações'}`:'Ainda sem avaliações';[...stars.children].forEach((b,i)=>b.classList.toggle('on',i<selected));note.textContent=mine?`Sua avaliação: ${'★'.repeat(Number(mine.rating))}`:(selected?'Você escolheu '+selected+' estrela'+(selected>1?'s':'')+'. Pode adicionar um comentário.':'Clique nas estrelas para avaliar.')}
 for(let i=1;i<=5;i++){const b=document.createElement('button');b.type='button';b.className='card-rating-star';b.textContent='★';b.title=`${i} estrela${i>1?'s':''}`;b.onclick=()=>{if(mine)return;selected=i;form.classList.add('on');render()};stars.appendChild(b)}
 send.onclick=async()=>{if(!selected||mine)return;send.disabled=true;send.textContent='Enviando...';const{error}=await sb.from('local_ai_reviews').insert({store_id:store.id,rating:selected,comment:comment.value.trim()||null,visitor_key:visitor,source:'card'});if(error){if(error.code==='23505')note.textContent='Você já avaliou esta loja neste navegador.';else note.textContent='Não consegui salvar sua avaliação agora.';send.disabled=false;send.textContent='Enviar';return}reviews=await getReviews(store.id);mine=reviews.find(r=>r.visitor_key===visitor)||{rating:selected};form.classList.remove('on');render()};
 header.append(left,summary);wrap.append(header,stars,form,note);const actions=card.querySelector('.store-card-actions');if(actions)actions.insertAdjacentElement('beforebegin',wrap);else card.appendChild(wrap);render()}

injectStyles();const root=document.getElementById('msgs')||document.body;function scan(node=document){node.querySelectorAll?.('.store-result-card').forEach(mount);if(node.matches?.('.store-result-card'))mount(node)}scan(root);new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)}))).observe(root,{childList:true,subtree:true});
