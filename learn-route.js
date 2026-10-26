(()=>{
  const originalFetch=window.fetch.bind(window);
  const oldUrl='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/web-search';
  const newUrl='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/answer-router-llm';
  const SUPABASE_URL='https://ccsypggvelcxsqszepfs.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
  const BUCKET='knowledge-pdfs';

  window.fetch=(input,init)=>{
    try{
      const url=typeof input==='string'?input:(input instanceof Request?input.url:String(input));
      if(url===oldUrl){
        if(input instanceof Request){
          const replacement=new Request(newUrl,input);
          return originalFetch(replacement,init);
        }
        return originalFetch(newUrl,init);
      }
    }catch(e){console.error('BuscaIA RAG route:',e)}
    return originalFetch(input,init);
  };

  let sbPromise=null;
  function getSupabase(){
    if(!sbPromise){
      sbPromise=import('https://esm.sh/@supabase/supabase-js@2.95.0')
        .then(({createClient})=>createClient(SUPABASE_URL,PUBLISHABLE_KEY));
    }
    return sbPromise;
  }

  function saveBlob(blob,name){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=name||'documento.pdf';
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }

  async function exportPdf(button,id){
    const oldText=button.textContent;
    button.disabled=true;
    button.textContent='Baixando...';
    try{
      const sb=await getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session)throw new Error('Entre como administrador para exportar o PDF.');

      const{data:doc,error:docError}=await sb
        .from('documents')
        .select('name,storage_path,status')
        .eq('id',id)
        .single();
      if(docError||!doc)throw new Error(docError?.message||'Documento não encontrado.');
      if(doc.status!=='ready')throw new Error('O PDF ainda não está pronto para exportação.');

      const{data:blob,error:downloadError}=await sb.storage.from(BUCKET).download(doc.storage_path);
      if(!downloadError&&blob){
        saveBlob(blob,doc.name||'documento.pdf');
        return;
      }

      console.warn('Download direto falhou; tentando URL assinada.',downloadError);
      const{data:signed,error:signedError}=await sb.storage.from(BUCKET).createSignedUrl(doc.storage_path,90,{download:true});
      if(signedError||!signed?.signedUrl)throw new Error(signedError?.message||downloadError?.message||'Não foi possível gerar o download.');

      const a=document.createElement('a');
      a.href=signed.signedUrl;
      a.download=doc.name||'documento.pdf';
      a.rel='noopener';
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }catch(e){
      console.error('BuscaIA export PDF:',e);
      alert(e?.message||'Não foi possível exportar o PDF.');
    }finally{
      button.disabled=false;
      button.textContent=oldText||'Exportar PDF';
    }
  }

  document.addEventListener('click',e=>{
    const button=e.target instanceof Element?e.target.closest('[data-download]'):null;
    if(!button)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const id=button.getAttribute('data-download');
    if(id)exportPdf(button,id);
  },true);

  if(!document.querySelector('script[data-buscaia-hybrid-route]')){
    const s=document.createElement('script');
    s.src='hybrid-route.js';
    s.dataset.buscaiaHybridRoute='1';
    document.head.appendChild(s);
  }
  import('./semantic-index.js').catch(e=>console.warn('BuscaIA semantic index loader:',e));
})();
