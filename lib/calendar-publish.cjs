const {STORE,KEY,validateCalendar,calendarHash}=require('./calendar-data.cjs');
async function publishCalendar(store,data){
  validateCalendar(data);
  const hash=calendarHash(data);
  const previous=await store.getWithMetadata(KEY,{type:'json',consistency:'strong'});
  if(previous){
    validateCalendar(previous.data);
    if(calendarHash(previous.data)===hash)return {status:'unchanged',hash,events:data.events.length};
    if(Date.parse(data.generatedAt)<Date.parse(previous.data.generatedAt))throw Error('Coleta anterior à versão publicada; publicação recusada');
    if(data.events.length<previous.data.events.length*.8)throw Error('Queda superior a 20% nos eventos; revise antes de publicar');
    await store.setJSON('versions/'+calendarHash(previous.data),previous.data);
  }
  await store.setJSON('versions/'+hash,data);
  const result=await store.setJSON(KEY,data,previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
  if(!result.modified)throw Error('Outra publicação ocorreu ao mesmo tempo. Confira os dados e execute novamente.');
  const verified=await store.get(KEY,{type:'json',consistency:'strong'});
  validateCalendar(verified);
  if(calendarHash(verified)!==hash)throw Error('Leitura após publicar diverge do conteúdo enviado');
  return {status:'published',hash,events:data.events.length,store:STORE};
}
module.exports={publishCalendar};
