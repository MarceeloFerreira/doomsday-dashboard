function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();}
function date(v){
  const s=String(v??'').trim();let result;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))result=s;
  else {const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!m)return null;result=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
  const d=new Date(result+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===result?result:null;
}
module.exports={norm,date};
