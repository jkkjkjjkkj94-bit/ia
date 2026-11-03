import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const form=document.getElementById('chatForm'),input=document.getElementById('q'),msgs=document.getElementById('msgs');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const add=(text,user=false)=>{if(!msgs)return null;const d=document.createElement('div');d.className='msg '+(user?'user':'bot');d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d};
async function fallbackSearch(text){
 const[s,p]=await Promise.all([
  sb.from('local_ai_stores').select('*').eq('active',true).eq('status','active'),
  sb.from('local_ai_products').select('*').eq('active',true).eq('show_in_ai',true)
 ]);
 if(s.error)throw s.error;if(p.error)throw p.error;
 const stores=s.data||[],products=p.data||[],q=norm(text),words=q.split(' ').filter(w=>w.length>2&&!['quero','uma','um','de','da','do','para','perto','loja','lojas','lugar','lugares','onde','tem','com'].includes(w));
 const rows=stores.map(store=>{const ps=products.filter(x=>x.store_id===store.id);const hay=norm([store.name,store.category,store.group,(store.groups||[]).join(' '),(store.specialties||[]).join(' '),store.description,...ps.flatMap(x=>[x.name,x.category,x.description,x.brand])].join(' '));const matched=words.filter(w=>hay.includes(w));let score=matched.length*10;if(q&&hay.includes(q))score+=30;if(store.name&&q.includes(norm(store.name)))score+=40;return{store,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
 if(!rows.length){add('Não encontrei uma opção cadastrada com esses critérios.');return}
 add('Encontrei estas opções para você:\n\n'+rows.map((x,i)=>`${i+1}. ${x.store.name} — ${x.store.category||'Sem categoria'}${x.store.group?' · '+x.store.group:''}`).join('\n\n'));
}
let busy=false;
async function submit(e){
 if(e.target!==form)return;
 // Com o motor normal pronto, não interfere no submit: contexto, negações e refinamentos continuam funcionando.
 if(window.LocalAIEngine?.handle)return;
 e.preventDefault();e.stopPropagation();
 if(busy||!input)return;
 const original=String(input.value||'').trim();if(!original)return;
 busy=true;add(original,true);input.value='';
 try{await fallbackSearch(original)}catch(err){console.error('[GURU Chat Runtime]',err);add('Não consegui concluir essa busca agora. Tente novamente em alguns segundos.')}finally{busy=false;input.focus()}
}
document.addEventListener('submit',submit,true);
window.GuruChatRuntimeFix={ready:true,fallbackSearch};
