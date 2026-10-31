const CORE_URL='https://ccsypggvelcxsqszepfs.supabase.co';
const CORE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
const AI_HOST='innziuzgtpfsiywqmies.supabase.co';
const CORE_TABLES=['local_ai_stores','local_ai_products'];
const originalFetch=window.fetch.bind(window);

function getRequestUrl(input){
  try{
    if(typeof input==='string')return input;
    if(input instanceof URL)return input.toString();
    if(input instanceof Request)return input.url;
    if(input&&typeof input.url==='string')return input.url;
    return String(input||'');
  }catch{return ''}
}

function isCoreRequest(input){
  try{
    const raw=getRequestUrl(input);
    if(!raw)return false;
    const u=new URL(raw,window.location.href);
    if(u.host!==AI_HOST)return false;
    return CORE_TABLES.some(t=>u.pathname.includes('/rest/v1/'+t));
  }catch{return false}
}

window.fetch=async(input,init={})=>{
  if(!isCoreRequest(input))return originalFetch(input,init);

  const raw=getRequestUrl(input);
  const oldUrl=new URL(raw,window.location.href);
  const newUrl=new URL(oldUrl.pathname+oldUrl.search,CORE_URL);

  const sourceHeaders=input instanceof Request?input.headers:undefined;
  const headers=new Headers(sourceHeaders||init.headers||{});
  if(init.headers){
    const extra=new Headers(init.headers);
    extra.forEach((value,key)=>headers.set(key,value));
  }

  headers.set('apikey',CORE_KEY);
  headers.set('authorization','Bearer '+CORE_KEY);

  const method=init.method||(input instanceof Request?input.method:'GET');
  const next={...init,method,headers};

  if(input instanceof Request){
    if(!next.body&&method!=='GET'&&method!=='HEAD'){
      try{next.body=await input.clone().text()}catch{}
    }
    if(next.credentials==null)next.credentials=input.credentials;
    if(next.cache==null)next.cache=input.cache;
    if(next.redirect==null)next.redirect=input.redirect;
  }

  const response=await originalFetch(newUrl.toString(),next);
  if(!response.ok)console.error('[Local AI] Core DB request failed',response.status,newUrl.pathname);
  return response;
};

window.LocalAIDataSources={
  core:{url:CORE_URL,tables:[...CORE_TABLES],mode:'direct-route'},
  ai:{url:'https://'+AI_HOST,mode:'direct'},
  ready:true
};
