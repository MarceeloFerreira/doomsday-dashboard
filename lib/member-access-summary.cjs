function accessDate(value){
  const date=value?new Date(value):null;
  return date&&Number.isFinite(date.getTime())?new Intl.DateTimeFormat('pt-PT',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Lisbon'}).format(date):null;
}
function accessSummary(access){
  if(!access)return null;
  const count=Number(access.login_count)||0;
  return {count,first:accessDate(access.first_login_at),last:accessDate(access.last_login_at),activity:accessDate(access.last_activity_at),since:accessDate(access.monitored_since)};
}
module.exports={accessDate,accessSummary};
