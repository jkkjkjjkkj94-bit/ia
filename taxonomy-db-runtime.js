import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const URL='https://innziuzgtpfsiywqmies.supabase.co';
const KEY='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
const sb=createClient(URL,KEY);
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
let cache=null;
async function fetchTaxonomy(){
 const[c,g,t]=await Promise.all([
  sb.from('local_ai_taxonomy_categories').select('id,key,name,sort_order').eq('active',true).order('sort_order'),
  sb.from('local_ai_taxonomy_groups').select('id,category_id,key,name,sort_order').eq('active',true).order('sort_order'),
  sb.from('local_ai_taxonomy_terms').select('category_id,group_id,term,term_type,weight').eq('active',true)
 ]);
 if(c.error||g.error||t.error)throw new Error(c.error?.message||g.error?.message||t.error?.message||'Falha ao carregar taxonomia.');
 const cats=c.data||[],groups=g.data||[],terms=t.data||[];
 const byCat=new Map(cats.map(x=>[x.id,x]));
 const byGroup=new Map(groups.map(x=>[x.id,x]));
 const taxonomy={},aliases={};
 cats.forEach(cat=>{taxonomy[cat.name]={};aliases[cat.name]=[]});
 groups.forEach(group=>{const cat=byCat.get(group.category_id);if(cat)taxonomy[cat.name][group.name]=[]});
 terms.forEach(term=>{const cat=byCat.get(term.category_id);if(!cat)return;if(term.group_id){const group=byGroup.get(term.group_id);if(group&&taxonomy[cat.name]?.[group.name])taxonomy[cat.name][group.name].push(term.term)}else aliases[cat.name].push(term.term)});
 for(const[cat,groupsObj]of Object.entries(taxonomy))for(const[group,list]of Object.entries(groupsObj))groupsObj[group]=[...new Set([group,...list])];
 for(const cat of Object.keys(aliases))aliases[cat]=[...new Set([cat,...aliases[cat]])];
 return{taxonomy,aliases,categories:cats,groups,terms};
}
function applyToEngine(data){
 const engine=window.LocalAIEngine;if(!engine?.getTaxonomy)return false;
 const live=engine.getTaxonomy();
 Object.keys(live).forEach(k=>delete live[k]);
 Object.assign(live,structuredClone(data.taxonomy));
 if(window.LocalAITaxonomy){window.LocalAITaxonomy.active=live;window.LocalAITaxonomy.db=data;window.LocalAITaxonomy.dbAliases=data.aliases}
 window.GuruTaxonomyDB={...data,reload};
 return true;
}
async function reload(){cache=await fetchTaxonomy();let tries=0;while(!applyToEngine(cache)&&tries++<30)await new Promise(r=>setTimeout(r,100));return cache}
await reload().catch(e=>console.warn('[GURU Taxonomy DB]',e.message));
const engine=window.LocalAIEngine;if(engine?.reloadConfig&&!engine.__dbTaxonomyWrapped){const original=engine.reloadConfig.bind(engine);engine.reloadConfig=async()=>{const r=await original();await reload().catch(()=>{});return r};engine.__dbTaxonomyWrapped=true}
