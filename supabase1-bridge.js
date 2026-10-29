// Redirecta a conexão existente do BuscaIA para o Supabase 1.
// Usa somente a publishable key, apropriada para frontend.
(() => {
  const OLD_URL = 'https://ccsypggvelcxsqszepfs.supabase.co';
  const NEW_URL = 'https://innziuzgtpfsiywqmies.supabase.co';
  const OLD_KEY = 'sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
  const NEW_KEY = 'sb_publishable_fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    let url = typeof input === 'string' ? input : input?.url;
    if (!url || !url.startsWith(OLD_URL)) {
      return originalFetch(input, init);
    }

    url = NEW_URL + url.slice(OLD_URL.length);

    const headers = new Headers(
      init.headers || (typeof input !== 'string' && input?.headers) || {}
    );

    if (headers.get('apikey') === OLD_KEY || !headers.get('apikey')) {
      headers.set('apikey', NEW_KEY);
    }

    const auth = headers.get('authorization');
    if (auth === `Bearer ${OLD_KEY}` || !auth) {
      headers.set('authorization', `Bearer ${NEW_KEY}`);
    }

    const nextInit = { ...init, headers };
    return originalFetch(url, nextInit);
  };

  console.info('BuscaIA: conexão redirecionada para Supabase 1.');
})();
