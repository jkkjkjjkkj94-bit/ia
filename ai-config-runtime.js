import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const aiDB=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
let config={};

async function loadConfig(){
  const{data,error}=await aiDB.from('local_ai_ai_config').select('config_key,config_value');
  if(error){console.warn('[Local AI Config]',error.message);return}
  config=Object.fromEntries((data||[]).map(x=>[x.config_key,x.config_value]));
  window.LocalAIConfig=config;
}

function expandSynonyms(text){
  const synonyms=config.synonyms&&typeof config.synonyms==='object'?config.synonyms:{};
  const categories=Array.isArray(config.categories)?config.categories:[];
  const n=norm(text);
  const additions=[];
  for(const[key,values]of Object.entries(synonyms)){
    const list=[key,...(Array.isArray(values)?values:[])];
    if(list.some(v=>{const x=norm(v);return x&&n.includes(x)}))additions.push(key);
  }
  for(const c of categories){const x=norm(c);if(x&&n.includes(x))additions.push(String(c))}
  return [...new Set(additions)].length?text+' '+[...new Set(additions)].join(' '):text;
}

function applyNegativeWords(text){
  const words=Array.isArray(config.negative_words)?config.negative_words:[];
  const n=norm(text);
  return words.some(w=>{const x=norm(w);return x&&n.includes(x)});
}

await loadConfig();
const form=document.getElementById('chatForm');
const input=document.getElementById('q');
form?.addEventListener('submit',()=>{
  if(!input)return;
  const original=input.value;
  input.dataset.originalQuery=original;
  input.value=expandSynonyms(original);
  if(applyNegativeWords(original))input.dataset.hasConfiguredNegative='1';else delete input.dataset.hasConfiguredNegative;
},true);

window.LocalAIConfigRuntime={reload:loadConfig,getConfig:()=>config,expandSynonyms};
