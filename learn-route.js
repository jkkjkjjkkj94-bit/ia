(()=>{
  const originalFetch=window.fetch.bind(window);
  const oldUrl='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/web-search';
  const newUrl='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/answer-and-learn';

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
    }catch(e){console.error('BuscaIA learning route:',e)}
    return originalFetch(input,init);
  };
})();
