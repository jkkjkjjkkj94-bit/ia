import{taxonomy,functionalWords}from'./ai-taxonomy.js?v=4';

const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const hasTerm=(text,term)=>new RegExp(`(?:^|\\s)${norm(term).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\ /g,'\\s+')}(?:\\s|$)`).test(text);

for(const category of Object.keys(taxonomy))functionalWords.add(norm(category));

function detectGenericCategory(text){
  const n=norm(text);
  for(const[category,groups]of Object.entries(taxonomy)){
    if(!hasTerm(n,category))continue;
    let hasSpecificGroup=false;
    for(const[group,terms]of Object.entries(groups)){
      for(const term of [group,...terms]){
        const nt=norm(term);
        if(nt===norm(category))continue;
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
  if(!category)return;
  const state=engine.state;
  if(!state)return;
  state.category=category;
  state.group=null;
  state.product=null;
  state.specialty=null;
  state.term=null;
  state.selectedProduct=null;
  state.selectedStore=null;
  state.lastResults=[];
}

form?.addEventListener('submit',clearGroupForGenericCategory,true);
