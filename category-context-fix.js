const form=document.getElementById('chatForm');
const input=document.getElementById('q');

function clearGroupForGenericCategory(){
  const engine=window.LocalAIEngine;
  if(!engine||!input)return;
  const text=input.value.trim();
  if(!text)return;
  const analysis=engine.analyzeQuery?.(text);
  if(!analysis?.category||analysis.group||analysis.matchedType!=='category')return;
  const state=engine.state;
  if(!state)return;
  state.category=analysis.category;
  state.group=null;
  state.product=null;
  state.specialty=null;
  state.term=null;
  state.selectedProduct=null;
  state.selectedStore=null;
  state.lastResults=[];
}

form?.addEventListener('submit',clearGroupForGenericCategory,true);
