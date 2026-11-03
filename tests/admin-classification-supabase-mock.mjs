export function createClient(){return{
 auth:{getSession:async()=>({data:{session:{access_token:'MOCK_ADMIN_TOKEN'}},error:null})},
 from:()=>({select(){return this},eq(){return this},then(ok,fail){return Promise.resolve({data:[],error:null}).then(ok,fail)}})
}};
