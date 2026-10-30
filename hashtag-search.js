import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';

const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');

const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const tagsFrom=s=>[...(s||'').matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(m=>m[1]);

function add(text,user=false){
  const d=document.createElement('div');
  d.className='msg '+(user?'user':'bot');
  d.textContent=text;
  msgs?.appendChild(d);
  if(msgs)msgs.scrollTop=msgs.scrollHeight;
}

function requestedTags(text){
  return tagsFrom(text).map(norm).filter(Boolean);
}

function matchingTags(store, wanted){
  const tags=tagsFrom(store.description||'');
  const normalized=tags.map(t=>({raw:t,n: norm(t)}));
  return normalized.filter(t=>wanted.some(w=>t.n===w||t.n.includes(w)||w.includes(t.n))).map(t=>'#'+t.raw);
}

form?.addEventListener('submit',async e=>{
  const text=input?.value.trim()||'';
  const wanted=requestedTags(text);
  if(!wanted.length)return;

  e.preventDefault();
  e.stopImmediatePropagation();
  add(text,true);
  if(input)input.value='';
  if(ctx)ctx.textContent='Contexto: hashtags · '+wanted.map(x=>'#'+x).join(' ');

  const{data,error}=await sb.from('local_ai_stores').select('id,name,category,address,description,rating,delivery,active,status').eq('active',true).eq('status','active');
  if(error){
    add('Não consegui pesquisar as hashtags agora. Tente novamente.');
    return;
  }

  const rows=(data||[]).map(store=>({store,tags:matchingTags(store,wanted)})).filter(x=>x.tags.length);
  if(!rows.length){
    add(`Não encontrei lojas cadastradas com ${wanted.map(x=>'#'+x).join(' ')}.`);
    return;
  }

  const list=rows.slice(0,8).map((x,i)=>{
    const s=x.store;
    const extra=[s.category,s.address,s.delivery?'faz entrega':null].filter(Boolean).join(' · ');
    return `${i+1}. ${s.name}\n${x.tags.join(' ')}${extra?`\n${extra}`:''}`;
  }).join('\n\n');

  add(`Encontrei ${rows.length===1?'1 local':'locais'} com ${wanted.map(x=>'#'+x).join(' ')}:\n\n${list}`);
},true);
