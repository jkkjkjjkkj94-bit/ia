import{taxonomy,functionalWords}from'./ai-taxonomy.js?v=4';

const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const ctx=document.getElementById('ctx');
const msgs=document.getElementById('msgs');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const hasTerm=(text,term)=>new RegExp(`(?:^|\\s)${norm(term).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\ /g,'\\s+')}(?:\\s|$)`).test(text);
let cleaning=false;

for(const category of Object.keys(taxonomy))functionalWords.add(norm(category));

function isRedundantGroup(category,group){
  return !!category&&!!group&&norm(category)===norm(group);
}

function removeRedundantGroup(state=window.LocalAIEngine?.state){
  if(!state||!isRedundantGroup(state.category,state.group))return false;
  state.group=null;
  if(state.lastAnalysis&&isRedundantGroup(state.lastAnalysis.category,state.lastAnalysis.group))state.lastAnalysis.group=null;
  return true;
}

function detectGenericCategory(text){
  const n=norm(text);
  for(const[category,groups]of Object.entries(taxonomy)){
    if(!hasTerm(n,category))continue;
    let hasSpecificGroup=false;
    for(const[group,terms]of Object.entries(groups)){
      if(norm(group)===norm(category))continue;
      for(const term of [group,...terms]){
        if(hasTerm(n,term)){hasSpecificGroup=true;break}
      }
      if(hasSpecificGroup)break;
    }
    if(!hasSpecificGroup)return category;
  }
  return null;
}

function clearGroupForGenericCategory(){
  const engine=window.LocalAIEngine;
  if(!engine||!input)return;
  const category=detectGenericCategory(input.value);
  const state=engine.state;
  if(!state)return;
  if(category){
    state.category=category;
    state.group=null;
    state.product=null;
    state.specialty=null;
    state.term=null;
    state.selectedProduct=null;
    state.selectedStore=null;
    state.lastResults=[];
  }
  removeRedundantGroup(state);
}

function cleanRenderedContext(){
  if(cleaning)return;
  const state=window.LocalAIEngine?.state;
  const changed=removeRedundantGroup(state);
  if(!ctx)return;
  const text=ctx.textContent||'';
  const match=text.match(/Categoria:\s*([^·→]+).*?(?:Grupo:\s*([^·→]+)|→\s*([^·→]+))/i);
  const category=match?.[1]?.trim();
  const group=(match?.[2]||match?.[3]||'').trim();
  if(!changed&&!isRedundantGroup(category,group))return;
  cleaning=true;
  let next=text;
  next=next.replace(/\s*[·→]\s*Grupo:\s*([^·→]+)(?=\s*[·→]|$)/gi,(all,g)=>isRedundantGroup(category,g.trim())?'':all);
  if(state?.category&&state?.group==null){
    const duplicate=new RegExp(`(Contexto:\s*${state.category.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})\\s*→\\s*${state.category.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'i');
    next=next.replace(duplicate,'$1');
  }
  next=next.replace(/\s*[·→]\s*[·→]\s*/g,' · ').replace(/\s+[·→]\s*$/,'').trim();
  if(next!==text)ctx.textContent=next;
  queueMicrotask(()=>{cleaning=false});
}

form?.addEventListener('submit',()=>{
  clearGroupForGenericCategory();
  setTimeout(cleanRenderedContext,0);
  setTimeout(cleanRenderedContext,180);
  setTimeout(cleanRenderedContext,500);
},true);

ctx&&new MutationObserver(()=>cleanRenderedContext()).observe(ctx,{childList:true,characterData:true,subtree:true});
msgs&&new MutationObserver(()=>removeRedundantGroup()).observe(msgs,{childList:true,subtree:true});
setTimeout(cleanRenderedContext,250);

window.GuruCategoryContextFix={detectGenericCategory,isRedundantGroup,removeRedundantGroup,cleanRenderedContext};
