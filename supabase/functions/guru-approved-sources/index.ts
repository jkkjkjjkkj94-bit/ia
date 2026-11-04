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

 // Importação progressiva: até três páginas por execução para evitar sobrecarga.
 // O próximo cursor pertence à fonte aprovada, nunca é uma URL recebida do visitante.
 const PAGE_BATCH=3,MAX_PAGE=200;
 let nextPage=Math.min(MAX_PAGE,Math.max(1,Number(s.next_page)||1));
 let imported=0,scanned=0,completed=false,status="error",note="";
 let listingAllowed=false,robotsText="";
 try{
  const robots=await fetch(site.origin+"/robots.txt",{redirect:"error",signal:AbortSignal.timeout(5000)});
  if(!robots.ok)throw Error("Não foi possível confirmar permissão de indexação no robots.txt.");
  robotsText=(await robots.text()).slice(0,100000);
  if(!permittedByRobots(robotsText,catalog.pathname))throw Error("A página inicial do catálogo não permite indexação.");
  listingAllowed=true;
  for(let i=0;i<PAGE_BATCH&&nextPage<=MAX_PAGE;i++){
   const pageUrl=new URL(catalog.href);
   if(nextPage>1)pageUrl.searchParams.set("page",String(nextPage));
   // Não usar links externos, redirects ou URLs livres na paginação.
   if(pageUrl.origin!==site.origin||!permittedByRobots(robotsText,pageUrl.pathname+pageUrl.search))
     throw Error("Página do catálogo não autorizada pelas regras da fonte.");
   const page=await fetch(pageUrl.href,{
     redirect:"error",
     headers:{Accept:"text/html,application/xhtml+xml","User-Agent":"GURU-Catalog/1.0"},
     signal:AbortSignal.timeout(6500)
   });
   if(!page.ok)throw Error("Página "+nextPage+": o site não permitiu a leitura pública.");
   const type=page.headers.get("content-type")||"";
   if(!type.includes("text/html"))throw Error("Catálogo não retornou HTML.");
   if(Number(page.headers.get("content-length")||0)>2000000)throw Error("Página maior que o limite.");
   const html=(await page.text()).slice(0,2000000);
   const found=productsFromHtml(html,pageUrl);
   scanned++;
   if(!found.length){
     // Quando não há produtos legíveis, não declarar que o catálogo todo foi importado.
     status=imported?"partial":"no_products";
     note="Página "+nextPage+" sem produtos extraíveis. O site pode exigir uma API ou feed oficial.";
     completed=true;
     break;
   }
   const rows=found.map(x=>({...x,source_id:s.id,last_checked_at:new Date().toISOString()}));
   const write=await rest("guru_web_products?on_conflict=source_id,product_url",{
      method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},
      body:JSON.stringify(rows)
   });
   if(!write.ok)throw Error("Falha ao gravar produtos da página "+nextPage+".");
   imported+=rows.length;
   nextPage++;
   status="ok";
   // Continuação limitada ao catálogo previamente autorizado.
   if(nextPage>MAX_PAGE){completed=true;break;}
  }
  if(status==="ok")note=imported+" links encontrados em "+scanned+" páginas nesta execução; próxima página "+nextPage+". Preço e estoque não foram presumidos.";
 }catch(e){
  status=imported?"partial":"error";
  note=String(e instanceof Error?e.message:e).slice(0,240);
 }
 if(!listingAllowed)nextPage=Math.max(1,Number(s.next_page)||1);
 // Registra o cursor para continuar o catálogo da próxima vez.
 const count=await rest("guru_web_products?select=id&source_id=eq."+id+"&limit=1",{
   headers:{Prefer:"count=exact"}
 });
 const range=count.headers.get("content-range")||"";
 const savedCount=Number(range.split("/").at(-1));
 const update={
  sync_status:status,
  sync_note:note,
  next_page:completed?1:Math.min(MAX_PAGE,nextPage),
  scanned_pages:Number(s.scanned_pages||0)+scanned,
  indexed_count:Number.isFinite(savedCount)?savedCount:Number(s.indexed_count||0),
  last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()
 };
 await rest("guru_web_sources?id=eq."+id,{method:"PATCH",body:JSON.stringify(update)});
 return output({status,products:imported,total: update.indexed_count,pages:scanned,nextPage:update.next_page,message:note,source:s.name});

}
Deno.serve(async req=>{
 if(req.headers.get("origin")!==ORIGIN)return output({error:"Origem não autorizada."},403);
 if(req.method==="OPTIONS")return output({ok:true});
 if(req.method!=="POST"||!SECRET||!BASE)return output({error:"Indisponível."},503);
 let body:any;try{body=await req.json()}catch{return output({error:"JSON inválido."},400)}
 if(typeof body?.sourceId!=="string"||!/^[0-9a-f-]{36}$/i.test(body.sourceId))return output({error:"Fonte inválida."},400);
 if(body.action==="refresh"){
  // Coleta automática SOMENTE de fontes previamente aprovadas, uma vez por 12 horas.
  const claim=await rest("rpc/guru_web_claim_refresh",{
    method:"POST",body:JSON.stringify({p_source:body.sourceId}),
  });
  if(!claim.ok)return output({error:"Atualização indisponível."},503);
  if(await claim.json()!==true)return output({status:"recent",products:0,message:"Fonte atualizada recentemente ou em atualização."});
  return syncSource(body.sourceId);
 }
 if(body.action!=="sync")return output({error:"Ação inválida."},400);
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
 return syncSource(body.sourceId);
});
