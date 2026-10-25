// A lógica da Base de conhecimento já é gerenciada por app.js.
// Este arquivo foi mantido apenas para compatibilidade com o index.html.
//
// Importante: não inicializar um segundo cliente Supabase aqui.
// Ter dois clientes persistindo a mesma sessão e chamar métodos assíncronos
// de Auth dentro de onAuthStateChange podia provocar Web Locks órfãos e
// AbortError ("signal is aborted without reason") durante operações como
// a importação CSV.
//
// A tela, busca, paginação, categorias, CRUD e importação continuam sendo
// controlados pelo cliente único criado em app.js.
