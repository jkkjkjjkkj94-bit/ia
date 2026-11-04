// GURU — indexação sob demanda, somente de fontes explicitamente aprovadas no painel.
// Esta função NUNCA aceita URLs livres do visitante; só usa a URL cadastrada pelo administrador.
const BASE=Deno.env.get("SUPABASE_URL")||"";
const SECRET=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||
 (()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch{return""}})();
const ORIGIN=Deno.env.get("GURU_ALLOWED_ORIGIN")||"https://jkkjkjjkkj94-bit.github.io";
const headers={
 "Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"content-type,apikey,authorization",
 "Access-Control-Allow-Methods":"OPTIONS,POST","Content-Type":"application/json;charset=utf-8",
 "Cache-Control":"no-store","Vary":"Origin",
};
const output=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers});
const authHeaders={
 apikey:SECRET,...(SECRET.startsWith("eyJ")?{Authorization:"Bearer "+SECRET}:{}),
 "Content-Type":"application/json"
};
const rest=async(path:string,init:RequestInit={})=>fetch(BASE+"/rest/v1/"+path,{...init,headers:{...authHeaders,...init.headers},signal:AbortSignal.timeout(7000)});
const safeURL=(raw:unknown)=>{
 try{
  if(typeof raw!=="string"||raw.length>650)return null;
  const u=new URL(raw);
  if(u.protocol!=="https:"||u.port||u.username||u.password||u.hash)return null;
  const host=u.hostname.toLowerCase();
  // Rejeita IPs, redes internas e domínios não públicos.
  if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host)||
     host==="localhost"||host.endsWith(".local")||host.endsWith(".internal")||
     /^\d+\.\d+\.\d+\.\d+$/.test(host)||host.startsWith("127.")||host.startsWith("10."))return null;
  return u;
 }catch{return null}
};
const decode=(s:string)=>s.replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"')
 .replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
 .replace(/&#(\d+);/g,(_m,n)=>String.fromCodePoint(Math.min(0x10FFFF,Number(n))));
const clean=(s:string)=>decode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ")
 .replace(/\s+/g," ").trim()).slice(0,190);
function productsFromHtml(html:string,base:URL){
 const products=new Map<string,{name:string,product_url:string,image_url:null,price:null,currency:null,availability:"unknown"}>();
 // Links diretos de produto; nenhuma inferência de estoque, preço ou desconto.
 const anchors=html.matchAll(/<a\b([^>]{0,1800})>([\s\S]{0,3500}?)<\/a>/gi);
 for(const m of anchors){
  const attrs=m[1],href=attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  if(!href)continue;
  let u:URL;try{u=new URL(decode(href),base)}catch{continue}
  if(u.protocol!=="https:"||u.hostname!==base.hostname||!u.pathname.endsWith(".html"))continue;
  u.search="";u.hash="";
  const title=clean(m[2])||clean(attrs.match(/\baria-label\s*=\s*["']([^"']+)["']/i)?.[1]||"");
  if(title.length<7||title.length>190||/^(comprar|ver detalhes|saiba mais)$/i.test(title))continue;
  products.set(u.href,{name:title,product_url:u.href,image_url:null,price:null,currency:null,availability:"unknown"});
  if(products.size>=50)break;
 }
 // Só dados estruturados explicitamente classificados como Product.
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]{0,250000}?)<\/script>/gi)){
  try{
   const root=JSON.parse(m[1]);const stack=[root];let scans=0;
   while(stack.length&&scans++<250){
    const node=stack.pop();if(Array.isArray(node)){stack.push(...node.slice(0,100));continue}
    if(!node||typeof node!=="object")continue;
    if(node["@graph"])stack.push(node["@graph"]);
    if(node.itemListElement)stack.push(node.itemListElement);
    if(node.item)stack.push(node.item);
    const kinds=Array.isArray(node["@type"])?node["@type"]:[node["@type"]];
    if(!kinds.includes("Product"))continue;
    const name=clean(String(node.name||""));const link=typeof node.url==="string"?node.url:"";
    let u:URL;try{u=new URL(link,base)}catch{continue}
    if(!name||u.protocol!=="https:"||u.hostname!==base.hostname||!u.pathname.endsWith(".html"))continue;
    u.search="";u.hash="";
    products.set(u.href,{name,product_url:u.href,image_url:null,price:null,currency:null,availability:"unknown"});
   }
  }catch{ /* JSON-LD opcional. */ }
 }
 return [...products.values()].slice(0,50);
}
function permittedByRobots(raw:string,path:string){
 // Política conservadora: sem robots.txt acessível, não indexar automaticamente.
 const rules=raw.split(/\r?\n/).map(x=>x.replace(/#.*$/,"").trim());
 let apply=false,agentFound=false;
 let allow:string[]=[],deny:string[]=[];
 for(const line of rules){
  if(/^user-agent\s*:/i.test(line)){
   const agent=line.split(":").slice(1).join(":").trim().toLowerCase();
   apply=agent==="*";if(apply)agentFound=true;continue;
  }
  if(!apply)continue;
  const pair=line.match(/^(allow|disallow)\s*:\s*(.*)$/i);
  if(!pair||!pair[2])continue;
  (pair[1].toLowerCase()==="allow"?allow:deny).push(pair[2]);
 }
 if(!agentFound)return true;
 const matches=(rule:string)=>path.startsWith(rule.replace(/\*.*$/,"").replace(/\$$/,""));
 const disallow=deny.filter(matches).sort((a,b)=>b.length-a.length)[0];
 const allowed=allow.filter(matches).sort((a,b)=>b.length-a.length)[0];
 return !disallow||Boolean(allowed&&allowed.length>=disallow.length);
}
async function syncSource(sourceId:string){
 const id=encodeURIComponent(sourceId);
 const r=await rest("guru_web_sources?select=*&id=eq."+id+"&limit=1");
 if(!r.ok)return output({error:"Falha na lista de fontes."},503);
 const sources=await r.json(),s=sources[0];
 if(!s||!s.enabled)return output({error:"Fonte inexistente ou desativada."},404);
 const site=safeURL(s.base_url),catalog=safeURL(s.catalog_url);
 if(!site||!catalog||site.hostname!==catalog.hostname||catalog.origin!==site.origin)
  return output({error:"O endereço da fonte precisa ser HTTPS e do domínio aprovado."},400);
 let found:{name:string,product_url:string,image_url:null,price:null,currency:null,availability:"unknown"}[]=[];
 let result="error",note="";
 try{
  const robots=await fetch(site.origin+"/robots.txt",{redirect:"error",signal:AbortSignal.timeout(5000)});
  if(!robots.ok)throw Error("Não foi possível validar robots.txt");
  const robotsText=(await robots.text()).slice(0,100000);
  if(!permittedByRobots(robotsText,catalog.pathname))throw Error("Indexação não permitida pelo site.");
  const page=await fetch(catalog.href,{redirect:"error",headers:{Accept:"text/html,application/xhtml+xml","User-Agent":"GURU-Catalog/1.0"},signal:AbortSignal.timeout(9000)});
  if(!page.ok)throw Error("Site não respondeu com uma página pública.");
  const type=page.headers.get("content-type")||"";
  if(!type.includes("text/html"))throw Error("A fonte não retornou HTML.");
  const size=Number(page.headers.get("content-length")||0);
  if(size>2000000)throw Error("Página maior que o limite de leitura.");
  const html=(await page.text()).slice(0,2000000);
  found=productsFromHtml(html,catalog);
  result=found.length?"ok":"no_products";
  note=found.length?found.length+" links de produtos encontrados. Sem garantia de preço ou estoque.":"Sem produtos extraíveis: a loja pode exigir JavaScript, API oficial ou feed de produtos.";
 }catch(e){note=String(e instanceof Error?e.message:e).slice(0,260)}
 if(result==="ok"){
  // Atualiza somente itens da fonte já cadastrada e URLs do domínio aprovado.
  const rows=found.map(x=>({...x,source_id:s.id,last_checked_at:new Date().toISOString()}));
  const write=await rest("guru_web_products?on_conflict=source_id,product_url",{
   method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)
  });
  if(!write.ok){result="error";note="Erro ao gravar produtos indexados."}
 }
 await rest("guru_web_sources?id=eq."+id,{method:"PATCH",body:JSON.stringify({
  sync_status:result,sync_note:note,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()
 })});
 return output({status:result,products:result==="ok"?found.length:0,message:note,source:s.name});
}
Deno.serve(async req=>{
 if(req.headers.get("origin")!==ORIGIN)return output({error:"Origem não autorizada."},403);
 if(req.method==="OPTIONS")return output({ok:true});
 if(req.method!=="POST"||!SECRET||!BASE)return output({error:"Indisponível."},503);
 const authorization=req.headers.get("authorization")||"";
 if(!authorization.startsWith("Bearer "))return output({error:"Acesso administrativo necessário."},401);
 let user:any;
 try{
  const response=await fetch(BASE+"/auth/v1/user",{
   headers:{apikey:SECRET,Authorization:authorization},signal:AbortSignal.timeout(6000)
  });
  if(!response.ok)return output({error:"Sessão inválida."},401);
  user=await response.json();
 }catch{return output({error:"Não foi possível validar sessão."},401)}
 if(!user?.id)return output({error:"Sessão inválida."},401);
 const check=await rest("local_ai_profiles?select=role&user_id=eq."+encodeURIComponent(user.id)+"&limit=1");
 if(!check.ok)return output({error:"Não foi possível validar permissão."},403);
 const profiles=await check.json();
 if(profiles[0]?.role!=="admin")return output({error:"Apenas administradores podem atualizar fontes."},403);
 let body:any;try{body=await req.json()}catch{return output({error:"JSON inválido."},400)}
 if(body?.action!=="sync"||typeof body.sourceId!=="string"||!/^[0-9a-f-]{36}$/i.test(body.sourceId))
  return output({error:"Ação inválida."},400);
 return syncSource(body.sourceId);
});
