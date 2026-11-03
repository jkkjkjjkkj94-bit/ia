if(/\/admin\.html(?:$|[?#])/i.test(window.location.pathname+window.location.search)){
  import('./admin-login-fix.js?v=3').catch(err=>console.error('[Admin Login Bootstrap]',err));
}

const CORE_URL='https://ccsypggvelcxsqszepfs.supabase.co';
const CORE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
const AI_HOST='innziuzgtpfsiywqmies.supabase.co';
const CORE_TABLES=['local_ai_stores','local_ai_products'];
const AUTHORITATIVE_SOURCE={
  local_ai_stores:'core',
  local_ai_products:'core',
  local_ai_profiles:'hibrid',
  local_ai_accounts:'hibrid'
};
const MERCHANT_EDGE=CORE_URL+'/functions/v1/merchant-core';
const originalFetch=window.fetch.bind(window);
const isMerchantPage=/\/lojista\.html(?:$|[?#])/i.test(window.location.pathname+window.location.search);

function getRequestUrl(input){
  try{
    if(typeof input==='string')return input;
    if(input instanceof URL)return input.toString();
    if(input instanceof Request)return input.url;
    if(input&&typeof input.url==='string')return input.url;
    return String(input||'');
  }catch{return ''}
}
function requestHeaders(input,init){
  const h=new Headers(input instanceof Request?input.headers:(init?.headers||{}));
  if(init?.headers)new Headers(init.headers).forEach((v,k)=>h.set(k,v));
  return h;
}
function isCoreRequest(input){
  try{
    const raw=getRequestUrl(input);if(!raw)return false;
    const u=new URL(raw,window.location.href);
    if(u.host!==AI_HOST)return false;
    return CORE_TABLES.some(t=>u.pathname.includes('/rest/v1/'+t));
  }catch{return false}
}
function tableFromUrl(u){
  return CORE_TABLES.find(t=>u.pathname.includes('/rest/v1/'+t))||null;
}
function jsonResponse(data,status=200,headers={}){
  return new Response(data==null?'':JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}});
}
async function readBody(input,init,method){
  if(method==='GET'||method==='HEAD')return null;
  if(init?.body){try{return typeof init.body==='string'?JSON.parse(init.body):init.body}catch{return init.body}}
  if(input instanceof Request){try{const text=await input.clone().text();return text?JSON.parse(text):null}catch{return null}}
  return null;
}
async function merchantBridge(input,init,oldUrl){
  const headers=requestHeaders(input,init);
  const auth=headers.get('authorization')||'';
  if(!auth.toLowerCase().startsWith('bearer ')||auth==='Bearer '+CORE_KEY)return null;
  const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
  const table=tableFromUrl(oldUrl);
  const body=await readBody(input,init,method);
  let action='',payload={};
  if(table==='local_ai_stores'){
    if(method==='GET')action='get_store';
    else if(method==='POST'||method==='PATCH'){action='save_store';payload={store:body||{}}}
  }else if(table==='local_ai_products'){
    if(method==='GET')action='list_products';
    else if(method==='POST'){action='add_product';payload={product:body||{}}}
    else if(method==='DELETE'){
      const raw=oldUrl.searchParams.get('id')||'';
      action='delete_product';payload={id:raw.replace(/^eq\./,'')};
    }
  }
  if(!action)return null;
  const r=await originalFetch(MERCHANT_EDGE,{method:'POST',headers:{'Content-Type':'application/json',apikey:CORE_KEY,Authorization:auth},body:JSON.stringify({action,...payload})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)return jsonResponse({message:data?.error||'Falha ao acessar dados do lojista.',details:null,hint:null,code:'MERCHANT_CORE'},r.status);
  const accept=headers.get('accept')||'';
  const wantsObject=accept.includes('application/vnd.pgrst.object+json');
  if(action==='get_store')return jsonResponse(wantsObject?(data.store||null):(data.store?[data.store]:[]));
  if(action==='list_products')return jsonResponse(data.products||[]);
  if(action==='save_store')return jsonResponse(wantsObject?(data.store||null):(data.store?[data.store]:[]),200,{'Preference-Applied':'return=representation'});
  if(action==='add_product')return jsonResponse(wantsObject?(data.product||null):(data.product?[data.product]:[]),201,{'Preference-Applied':'return=representation'});
  if(action==='delete_product')return new Response('',{status:204});
  return null;
}

window.fetch=async(input,init={})=>{
  if(!isCoreRequest(input))return originalFetch(input,init);
  const raw=getRequestUrl(input);
  const oldUrl=new URL(raw,window.location.href);

  if(isMerchantPage){
    const bridged=await merchantBridge(input,init,oldUrl);
    if(bridged)return bridged;
  }

  const newUrl=new URL(oldUrl.pathname+oldUrl.search,CORE_URL);
  const headers=requestHeaders(input,init);
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
  core:{url:CORE_URL,tables:[...CORE_TABLES],mode:isMerchantPage?'merchant-secure-bridge':'direct-route'},
  ai:{url:'https://'+AI_HOST,mode:'direct'},
  authoritative:{...AUTHORITATIVE_SOURCE},
  ready:true
};
