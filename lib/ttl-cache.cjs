// Blocking revalidation: never return an expired value while refreshing.
function timedReader(read,ttl=15000,clock=Date.now){
  let value,expires=0,pending;
  return async function(){
    if(value!==undefined&&clock()<expires)return value;
    if(pending)return pending;
    pending=Promise.resolve().then(read).then(result=>{value=result;expires=clock()+ttl;return result;}).finally(()=>{pending=undefined;});
    return pending;
  };
}
module.exports={timedReader};
