const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const edit=(a,b)=>{a=norm(a);b=norm(b);const m=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)m[i][0]=i;for(let j=0;j<=b.length;j++)m[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return m[a.length][b.length]};
function bestTerm(token,terms){let best=null;for(const t of terms){const n=norm(t.term);if(!n||n.includes(' ')||Math.abs(n.length-token.length)>2)continue;const d=edit(token,n);if(d<=1||(token.length>=7&&d<=2)){if(!best||d<best.d||d===best.d&&Number(t.weight||1)>Number(best.t.weight||1))best={t,d}}}return best?.t||null}
function enhance(text){
 const db=window.GuruTaxonomyDB;if(!db?.terms?.length)return String(text||'');let out=String(text||''),n=norm(out);
 for(const t of [...db.terms].sort((a,b)=>norm(b.term).length-norm(a.term).length)){const term=norm(t.term);if(term.includes(' ')&&n.includes(term)){const cat=db.categories.find(c=>c.id===t.category_id)?.name,group=db.groups.find(g=>g.id===t.group_id)?.name;if(cat&&!n.includes(norm(cat)))out+=' '+cat;if(group&&!n.includes(norm(group)))out+=' '+group;n=norm(out)}}
 for(const w of n.split(' ')){if(w.length<5)continue;const found=bestTerm(w,db.terms);if(found&&norm(found.term)!==w){const cat=db.categories.find(c=>c.id===found.category_id)?.name,group=db.groups.find(g=>g.id===found.group_id)?.name;if(cat&&!norm(out).includes(norm(cat)))out+=' '+cat;if(group&&!norm(out).includes(norm(group)))out+=' '+group}}
 return out.trim();
}
function wrapEngine(){
 const engine=window.LocalAIEngine;if(!engine?.handle||engine.__semanticDbWrapped)return false;
 const original=engine.handle.bind(engine);
 engine.handle=text=>original(enhance(text));
 engine.__semanticDbWrapped=true;
 return true;
}
let tries=0;const timer=setInterval(()=>{if(wrapEngine()||++tries>100)clearInterval(timer)},50);wrapEngine();
window.GuruSemanticDB={enhance,wrapEngine};
