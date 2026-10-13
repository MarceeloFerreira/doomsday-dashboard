const transientStatus=new Set([429,500,502,503,504]);
async function requestSheet(fetcher,url,token,payload={}){
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,token}),signal:AbortSignal.timeout(attempt===0?10000:15000),cache:'no-store'});
      if(attempt===0&&transientStatus.has(response.status)){await response.body?.cancel();continue;}
      return response;
    }catch(error){
      if(attempt===0&&(error.name==='TimeoutError'||error.name==='AbortError'||error instanceof TypeError))continue;
      throw error;
    }
  }
}
function keepLatest(previous,incoming){
  if(previous?.source==='google-sheets'&&incoming.source==='snapshot'&&previous.edition?.date===incoming.edition?.date){
    const reason=(incoming.warning||'A atualização falhou.').split(' Exibindo o histórico salvo')[0];
    return {...previous,warning:reason+' Mantivemos a última leitura válida da planilha.',stale:true};
  }
  return incoming;
}
module.exports={requestSheet,keepLatest};
