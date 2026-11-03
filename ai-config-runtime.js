import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const aiDB=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
let config={};
async function loadConfig(){
 if(window.LocalAIEngine?.getConfig){config=window.LocalAIEngine.getConfig()||{};window.LocalAIConfig=config;return config}
 const{data,error}=await aiDB.from('local_ai_ai_config').select('config_key,config_value');if(error){console.warn('[Local AI Config]',error.message);return config}
 config=Object.fromEntries((data||[]).map(x=>[x.config_key,x.config_value]));window.LocalAIConfig=config;return config;
}
function expandSynonyms(text){const synonyms=config.synonyms&&typeof config.synonyms==='object'&&!Array.isArray(config.synonyms)?config.synonyms:{},n=norm(text),additions=[];for(const[key,values]of Object.entries(synonyms)){const list=[key,...(Array.isArray(values)?values:[])];if(list.some(v=>{const x=norm(v);return x&&n.includes(x)}))additions.push(key)}return additions.length?String(text||'')+' '+[...new Set(additions)].join(' '):String(text||'')}
await loadConfig();
window.LocalAIConfigRuntime={reload:loadConfig,getConfig:()=>config,expandSynonyms};
