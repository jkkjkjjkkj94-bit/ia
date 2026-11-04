// Consulta de produtos EXCLUSIVAMENTE das fontes autorizadas no Supabase.
// As políticas RLS exigem que a fonte esteja habilitada por administrador.
const BASE='https://innziuzgtpfsiywqmies.supabase.co';
const KEY='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
export const normalize=s=>String(s||'').toLowerCase().normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const discard=new Set('quero preciso achar encontar encontrar encontre buscar busque procura procure produtos produto tenis sapato roupas roupa nike loja lojas comprar me mostre mostrar tem uma um na no de da do por favor gostaria para com qual onde existe voces voce pode poderia site fonte fontes marca mais barato preco valores'.split(' '));
function tokens(query){return normalize(query).split(' ').filter(x=>x.length>2&&!discard.has(x)).slice(0,6)}
const isSafeProductUrl=(url,base)=>{
 try{const page=new URL(url),host=new URL(base);return page.protocol==='https:'&&page.hostname===host.hostname&&page.port===''&&page.username===''&&page.password===''}catch{return false}
};
const refreshApproved=async(source)=>{
 if(!source?.id)return false;
 try{
  const result=await fetch(BASE+'/functions/v1/guru-approved-sources',{
   method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},
   body:JSON.stringify({action:'refresh',sourceId:source.id}),
   signal:AbortSignal.timeout(16000),
  });
  return result.ok&&(await result.json()).status==='ok';
 }catch{return false}
};
const withApi=async(path)=>{
 const result=await fetch(BASE+'/rest/v1/'+path,{
  headers:{apikey:KEY,Accept:'application/json'},signal:AbortSignal.timeout(5500)
 });
 if(!result.ok)throw new Error('Catálogo de fontes indisponível.');
 return result.json();
};
export async function approvedSourceProducts(query,attemptRefresh=true){
 try{
  const [sources,products]=await Promise.all([
   withApi('guru_web_sources?select=id,name,base_url,sync_status,last_synced_at&enabled=eq.true&limit=20'),
   withApi('guru_web_products?select=source_id,name,product_url,price,currency,availability,last_checked_at&limit=1000')
  ]);
  // Se o catálogo aprovado ainda não possui produtos, tenta indexar sob demanda.
  // O servidor impede que a mesma fonte seja consultada repetidamente em menos de 12h.
  if(attemptRefresh){
    const topic=normalize(query);
    const candidates=sources.filter(source=>{
      const name=normalize(source.name).split(' ')[0];
      const last=Date.parse(source.last_synced_at||'');
      const due=!Number.isFinite(last)||Date.now()-last>12*60*60*1000;
      return due&&(name&&topic.includes(name)||sources.length===1&&/\b(tenis|camiseta|roupa|sapato|produto|comprar)\b/.test(topic));
    });
    if(candidates.length&&await refreshApproved(candidates[0]))
       return approvedSourceProducts(query,false);
  }
  const trusted=new Map(sources.map(s=>[s.id,s]));
  const queryTerms=tokens(query);
  const matches=[];
  for(const p of products){
   const source=trusted.get(p.source_id);
   if(!source||!isSafeProductUrl(p.product_url,source.base_url))continue;
   const name=normalize(p.name);
   const hit=queryTerms.filter(t=>name.includes(t)).length;
   if(queryTerms.length&&!hit)continue;
   if(p.availability==='out_of_stock')continue;
   const price=p.price==null?null:Number(p.price);
   matches.push({name:p.name,url:p.product_url,source:source.name,sourceId:source.id,
    price:Number.isFinite(price)?price:null,currency:p.currency||'BRL',
    availability:p.availability,checkedAt:p.last_checked_at,score:hit});
  }
  matches.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'pt-BR'));
  return {items:matches.slice(0,12),sources:sources.map(s=>({id:s.id,name:s.name,url:s.base_url,status:s.sync_status,lastSync:s.last_synced_at}))};
 }catch{return{items:[],sources:[],unavailable:true}}
}
