// GURU — ingestão de catálogo licenciado (arquivo CSV/JSON, ou feed Awin autorizado).
// Não consulta nike.com.br, robots.txt ou APIs internas. Só grava na fonte aprovada.
const BASE=Deno.env.get("SUPABASE_URL")||"";
const SECRET=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||
 (()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch{return""}})();
const ORIGIN=Deno.env.get("GURU_ALLOWED_ORIGIN")||"https://jkkjkjjkkj94-bit.github.io";
const CORS={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,content-type,apikey",
 "Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json;charset=utf-8","Cache-Control":"no-store"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:CORS});
const authHeaders={apikey:SECRET,...(SECRET.startsWith("eyJ")?{Authorization:"Bearer "+SECRET}:{})};
async function database(path:string,init:RequestInit={}){
 return fetch(BASE+"/rest/v1/"+path,{...init,headers:{...authHeaders,"Content-Type":"application/json",...init.headers},
 signal:AbortSignal.timeout(9000)});
}
function parseCSV(content:string){
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
 const input=content.replace(/^\uFEFF/,"");
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(quoted){if(c==='"'&&input[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c;continue}
  if(c==='"'){quoted=true;continue}
  if(c===','||c===';'||c==='\t'){row.push(cell);cell="";continue}
  if(c==='\r'||c==='\n'){if(c==='\r'&&input[i+1]==='\n')i++;
   row.push(cell);cell="";if(row.some(v=>v.trim()))rows.push(row);row=[];continue}
  cell+=c;
 }
 if(quoted)throw Error("CSV inválido: aspas não fechadas.");
 row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
 if(rows.length<2)throw Error("O feed precisa de cabeçalho e produtos.");
 if(rows.length>1501)throw Error("Envie no máximo 1.500 linhas por arquivo.");
 const cols=rows.shift()!.map(x=>x.trim().toLowerCase());
 return rows.map(r=>Object.fromEntries(cols.map((key,i)=>[key,r[i]||""])));
}
function parseFeed(text:string,format:string){
 let rows:unknown;
 if(format==="json"){rows=JSON.parse(text);if(!Array.isArray(rows))rows=(rows as any)?.products}
 else if(format==="csv")rows=parseCSV(text);
 else throw Error("Formato não suportado. Use CSV ou JSON.");
 if(!Array.isArray(rows)||rows.length<1||rows.length>1500)throw Error("O feed deve conter de 1 a 1.500 produtos.");
 return rows;
}
function first(p:Record<string,unknown>,names:string[]){
 for(const n of names){const value=p[n];if(value!==undefined&&value!==null&&String(value).trim())return String(value).trim()}
 return "";
}
function safeLink(raw:string,origin:string){
 try{
  const u=new URL(raw);const known=new URL(origin);
  if(u.protocol!=="https:"||u.origin!==known.origin||u.username||u.password||u.port||u.hash)return null;
  // Mantém parâmetros internos das páginas de produtos, mas elimina rastreadores não necessários.
  for(const key of [...u.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/i.test(key))u.searchParams.delete(key);
  return u.href;
 }catch{return null}
}
function normalizeProduct(raw:unknown,origin:string){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const p=raw as Record<string,unknown>;
 const name=first(p,["product_name","name","title","product_title"]).slice(0,200);
 const link=first(p,["merchant_deep_link","deep_link","url","product_url","link"]);
 const product_url=safeLink(link,origin);
 if(name.length<3||!product_url)return null;
 const rawPrice=first(p,["search_price","price","store_price"]);
 const parsedPrice=Number(rawPrice.replace("R$","").replace(/\s/g,"").replace(",","."));
 const price=rawPrice&&Number.isFinite(parsedPrice)&&parsedPrice>=0&&parsedPrice<10000000
  ?Math.round(parsedPrice*100)/100:null;
 const currency=price!==null?first(p,["currency","price_currency"])||"BRL":null;
 const stock=first(p,["in_stock","stock_status","availability","is_for_sale"]).toLowerCase();
 let availability="unknown";
 if(["yes","true","1","in stock","instock","available","em estoque"].includes(stock))availability="in_stock";
 else if(["no","false","0","out of stock","outofstock","unavailable","sem estoque"].includes(stock))availability="out_of_stock";
 // Nunca aceita URLs de imagem arbitrárias para exibição pública; produto é acessado pelo site oficial.
 return {name,product_url,price,currency,availability,image_url:null,last_checked_at:new Date().toISOString()};
}
async function authorizedUser(req:Request){
 const token=req.headers.get("authorization")||"";
 if(!token.startsWith("Bearer ")||token.length>3000)return false;
 const r=await fetch(BASE+"/auth/v1/user",{headers:{...authHeaders,Authorization:token},
  signal:AbortSignal.timeout(6000)});
 if(!r.ok)return false;
 const user=await r.json();if(!user?.id)return false;
 const p=await database("local_ai_profiles?select=role&user_id=eq."+encodeURIComponent(user.id)+"&limit=1");
 if(!p.ok)return false;
 return (await p.json())?.[0]?.role==="admin";
}
async function importFeed(sourceId:string,feedText:string,format:string){
 const sourceResp=await database("guru_web_sources?select=id,name,base_url,enabled,feed_authorized,feed_provider&id=eq."+encodeURIComponent(sourceId)+"&limit=1");
 if(!sourceResp.ok)throw Error("Fonte não pôde ser consultada.");
 const source=(await sourceResp.json())?.[0];
 if(!source?.enabled||source.feed_authorized!==true)throw Error("A fonte deve estar habilitada e ter autorização de feed confirmada pelo administrador.");
 const raw=parseFeed(feedText,format);
 const accepted=new Map<string,Record<string,unknown>>();let discarded=0;
 for(const p of raw){
  const record=normalizeProduct(p,source.base_url);
  if(!record){discarded++;continue}
  accepted.set(record.product_url,{...record,source_id:source.id});
 }
 const rows=[...accepted.values()];
 if(!rows.length)throw Error("Nenhum produto válido do domínio cadastrado foi encontrado.");
 let stored=0;
 for(let i=0;i<rows.length;i+=100){
  const part=rows.slice(i,i+100);
  const r=await database("guru_web_products?on_conflict=source_id,product_url",{
   method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(part)
  });
  if(!r.ok)throw Error("Não foi possível salvar lote "+(Math.floor(i/100)+1)+".");
  stored+=part.length;
 }
 const count=await database("guru_web_products?select=id&source_id=eq."+source.id+"&limit=1",{headers:{Prefer:"count=exact"}});
 const total=Number(count.headers.get("content-range")?.split("/").at(-1));
 const update={
  indexed_count:Number.isFinite(total)?total:stored,
  feed_status:"ready",feed_last_import_at:new Date().toISOString(),feed_last_import_count:stored,
  feed_last_note:stored+" registros importados; "+discarded+" ignorados por campos inválidos ou domínio não aprovado.",
  updated_at:new Date().toISOString()
 };
 await database("guru_web_sources?id=eq."+source.id,{method:"PATCH",body:JSON.stringify(update)});
 return {status:"ready",stored,total:update.indexed_count,discarded,source:source.name};
}
Deno.serve(async req=>{
 if(req.headers.get("origin")!==ORIGIN)return reply({error:"Origem não autorizada."},403);
 if(req.method==="OPTIONS")return reply({ok:true});
 if(req.method!=="POST")return reply({error:"Método não permitido."},405);
 if(!BASE||!SECRET)return reply({error:"Configuração de servidor ausente."},503);
 try{
  if(!await authorizedUser(req))return reply({error:"Somente administradores autenticados."},403);
  if(Number(req.headers.get("content-length")||0)>450000)return reply({error:"Feed maior que o limite de 450 KB."},413);
  const text=await req.text();if(text.length>450000)return reply({error:"Feed maior que o limite de 450 KB."},413);
  const payload=JSON.parse(text);
  if(!/^[0-9a-f-]{36}$/i.test(String(payload?.sourceId||"")))return reply({error:"Fonte inválida."},400);
  if(payload?.action==="upload"){
   if(typeof payload?.feed!=="string")return reply({error:"Feed inválido."},400);
   const result=await importFeed(payload.sourceId,payload.feed,payload.format);
   return reply(result);
  }
  if(payload?.action==="partner_sync"){
   // URL e autenticação do fornecedor ficam exclusivamente em secrets do Supabase.
   const feedUrl=Deno.env.get("GURU_NIKE_AWIN_FEED_URL")||"";
   if(!feedUrl)return reply({status:"not_configured",message:"Configure o feed de parceiro autorizado no segredo GURU_NIKE_AWIN_FEED_URL."},409);
   const url=new URL(feedUrl);
   if(url.protocol!=="https:"||!["productdata.awin.com","datafeed.api.productserve.com"].includes(url.hostname)
      ||url.username||url.password||url.port||url.hash)
      return reply({error:"O feed deve usar o endereço oficial da Awin."},400);
   const sourceResp=await database("guru_web_sources?select=base_url,feed_authorized&id=eq."+encodeURIComponent(payload.sourceId)+"&limit=1");
   const approved=(await sourceResp.json())?.[0];
   if(!sourceResp.ok||approved?.feed_authorized!==true||approved?.base_url!=="https://www.nike.com.br")
    return reply({error:"Sincronização reservada à Nike Brasil após autorização do parceiro."},403);
   const downloaded=await fetch(url.href,{redirect:"error",signal:AbortSignal.timeout(12000)});
   if(!downloaded.ok)return reply({error:"Feed autorizado indisponível: HTTP "+downloaded.status},502);
   if(Number(downloaded.headers.get("content-length")||0)>450000)
    return reply({error:"Feed grande: baixe e importe em partes pelo painel."},413);
   const content=(await downloaded.text()).slice(0,450001);
   if(content.length>450000)return reply({error:"Feed grande: importe em partes pelo painel."},413);
   const format=content.trimStart().startsWith("[")||content.trimStart().startsWith("{")?"json":"csv";
   return reply(await importFeed(payload.sourceId,content,format));
  }
  return reply({error:"Ação inválida."},400);
 }catch(e){return reply({error:String(e instanceof Error?e.message:e).slice(0,200)},400)}
});
