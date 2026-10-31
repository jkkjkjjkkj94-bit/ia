const CORE_URL='https://ccsypggvelcxsqszepfs.supabase.co';
const CORE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
const AI_HOST='innziuzgtpfsiywqmies.supabase.co';
const CORE_TABLES=['local_ai_stores','local_ai_products'];
const originalFetch=window.fetch.bind(window);

function isCoreRequest(url){
  try{
    const u=new URL(typeof url==='string'?url:url.url);
    if(u.host!==AI_HOST)return false;
    return CORE_TABLES.some(t=>u.pathname.includes('/rest/v1/'+t));
  }catch{return false}
}

window.fetch=async(input,init={})=>{
  if(!isCoreRequest(input))return originalFetch(input,init);
  const oldUrl=new URL(typeof input==='string'?input:input.url);
  const newUrl=new URL(oldUrl.pathname+oldUrl.search,CORE_URL);
  const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));
  headers.set('apikey',CORE_KEY);
  const auth=headers.get('authorization');
  if(!auth||auth.toLowerCase().startsWith('bearer sb_publishable_'))headers.set('authorization','Bearer '+CORE_KEY);
  const next={...init,headers};
  return originalFetch(newUrl.toString(),next);
};

window.LocalAIDataSources={
  core:{url:CORE_URL,tables:[...CORE_TABLES]},
  ai:{url:'https://'+AI_HOST}
};
