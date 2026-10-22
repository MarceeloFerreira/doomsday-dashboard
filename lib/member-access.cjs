const accounts=require('./member-accounts.cjs');
const service=accounts.createAccounts();
async function permitted(request,admin=false){
  if(accounts.accountMode()){
    try{await service.requireSession(request.cookies.get(accounts.COOKIE)?.value,admin);return true;}catch{return false;}
  }
  const auth=require(admin?'./r4-auth.cjs':'./member-auth.cjs');
  return auth.valid(request.cookies.get(admin?'bope_r4':'bope_member')?.value);
}
module.exports={permitted};
