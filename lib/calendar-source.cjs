const {KEY,validateCalendar}=require('./calendar-data.cjs');
function createCalendarReader({openStore,fallback,clock=Date.now,ttl=60000,timeout=5000}){
  let cached,expires=0,pending;
  return async function read(){
    if(cached&&clock()<expires)return cached;
    if(pending)return pending;
    pending=(async()=>{
      let timer;
      try{
        const data=await Promise.race([
          Promise.resolve().then(()=>openStore().get(KEY,{type:'json',consistency:'strong'})),
          new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Calendar timeout')),timeout);})
        ]);
        validateCalendar(data);
        cached={...data,delivery:{source:'live',degraded:false}};
      }catch{
        const data=cached||validateCalendar(fallback);
        cached={...data,delivery:{source:cached?.delivery.source||'bundled',degraded:true}};
      }finally{clearTimeout(timer);}
      expires=clock()+ttl;
      return cached;
    })().finally(()=>{pending=undefined;});
    return pending;
  };
}
module.exports={createCalendarReader};
