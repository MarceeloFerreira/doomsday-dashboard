const DEFAULT_SPEED=97.3;
const INFANTRY=Object.freeze([
  {tier:1,seconds:15,tomato:45,wood:45,oil:0},
  {tier:2,seconds:30,tomato:91,wood:91,oil:0},
  {tier:3,seconds:60,tomato:136,wood:136,oil:5},
  {tier:4,seconds:80,tomato:327,wood:327,oil:14},
  {tier:5,seconds:100,tomato:454,wood:454,oil:91},
  {tier:6,seconds:120,tomato:817,wood:817,oil:163}
].map(Object.freeze));
const MOTOS=Object.freeze([
  {tier:1,seconds:15,tomato:27,wood:64,steel:0,oil:0},
  {tier:2,seconds:30,tomato:0,wood:91,steel:45,oil:0},
  {tier:3,seconds:60,tomato:0,wood:136,steel:68,oil:5},
  {tier:4,seconds:80,tomato:0,wood:327,steel:163,oil:14},
  {tier:5,seconds:100,tomato:0,wood:454,steel:227,oil:91},
  {tier:6,seconds:120,tomato:0,wood:817,steel:409,oil:163}
].map(Object.freeze));
const SHOOTERS=Object.freeze([
  {tier:1,seconds:15,tomato:64,wood:27,steel:0,oil:0},
  {tier:2,seconds:30,tomato:91,wood:0,steel:45,oil:0},
  {tier:3,seconds:60,tomato:136,wood:0,steel:68,oil:5},
  {tier:4,seconds:80,tomato:327,wood:0,steel:163,oil:14},
  {tier:5,seconds:100,tomato:454,wood:0,steel:227,oil:91},
  {tier:6,seconds:120,tomato:817,wood:0,steel:409,oil:163}
].map(Object.freeze));
const TROOP_TYPES=Object.freeze({
  infantry:Object.freeze({label:'Infantaria',units:INFANTRY}),
  motos:Object.freeze({label:'Motos',units:MOTOS}),
  shooters:Object.freeze({label:'Atiradores',units:SHOOTERS})
});
const RESOURCES=Object.freeze([['tomato','Tomate'],['wood','Madeira'],['steel','Aço'],['oil','Petróleo']].map(Object.freeze));
const MAX_QUANTITY=1_000_000_000;
function integer(value,label,max=Number.MAX_SAFE_INTEGER){
  if(!Number.isSafeInteger(value)||value<0||value>max)throw Error(label+' deve ser um número inteiro válido, maior ou igual a zero.');
  return value;
}
function budgetSeconds({days=0,hours=0,minutes=0,seconds=0}){
  const result=integer(days,'Dias')*86400+integer(hours,'Horas')*3600+integer(minutes,'Minutos')*60+integer(seconds,'Segundos');
  return integer(result,'Tempo disponível',MAX_QUANTITY*8);
}
function speedupSeconds({format='minutes',minutes='',time={}}){
  if(format==='minutes'){
    if(minutes==='')throw Error('Informe o total de minutos de aceleradores.');
    return budgetSeconds({minutes:Number(minutes)});
  }
  if(format!=='days')throw Error('Formato de aceleradores inválido.');
  if(['days','hours','minutes'].some(key=>time[key]===''||time[key]===undefined))throw Error('Preencha dias, horas e minutos.');
  return budgetSeconds({days:Number(time.days),hours:Number(time.hours),minutes:Number(time.minutes)});
}
function splitMinutes(seconds){
  integer(seconds,'Tempo disponível',MAX_QUANTITY*8);
  if(seconds%60)throw Error('O estoque de aceleradores deve ser informado em minutos inteiros.');
  const total=seconds/60;
  return {minutes:String(total),time:{days:String(Math.floor(total/1440)),hours:String(Math.floor(total%1440/60)),minutes:String(total%60)}};
}
function minutesLabel(seconds){
  const minutes=Math.max(0,seconds)/60;
  const rounded=Math.abs(minutes*100-Math.round(minutes*100))>1e-6;
  return (rounded?'≈ ':'')+new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(minutes)+' min';
}
function calculate({tier,mode='quantity',quantity=0,budget=0,speed=DEFAULT_SPEED,type='infantry',operation='training',highestTier=6}){
  if(!Object.hasOwn(TROOP_TYPES,type))throw Error('Custos desse tipo de tropa ainda não cadastrados.');
  const units=TROOP_TYPES[type].units;
  let unit=units.find(row=>row.tier===tier);
  if(!unit)throw Error('Selecione um nível entre T1 e T6.');
  if(!['training','evolution'].includes(operation))throw Error('Operação inválida.');
  if(operation==='evolution'){
    const target=units.find(row=>row.tier===highestTier);
    if(!target||highestTier<=tier)throw Error('A origem deve ser inferior ao seu maior nível desbloqueado.');
    // Resources absent from the destination have no additional cost; never imply a refund.
    const resources=Object.fromEntries(RESOURCES.map(([key])=>[key,Math.max(0,(target[key]||0)-(unit[key]||0))]));
    unit={tier,seconds:target.seconds-unit.seconds,...resources};
  }
  if(!Number.isFinite(speed)||speed<0||speed>10000)throw Error('Informe uma velocidade de treinamento entre 0% e 10.000%.');
  if(!['quantity','speedups'].includes(mode))throw Error('Modo de cálculo inválido.');
  // Training speed is a bonus to production rate: base duration / (1 + bonus / 100).
  const secondsPerTroop=unit.seconds/(1+speed/100);
  integer(quantity,'Quantidade de tropas',MAX_QUANTITY);
  integer(budget,'Tempo disponível',MAX_QUANTITY*8);
  const troops=mode==='speedups'?Math.floor((budget+1e-9)/secondsPerTroop):quantity;
  integer(troops,'Quantidade calculada',MAX_QUANTITY);
  const usedSeconds=troops*secondsPerTroop;
  return {type,tier,targetTier:operation==='evolution'?highestTier:tier,operation,troops,secondsPerTroop,usedSeconds,
    // Round the total once, not each troop's time.
    requiredSeconds:Math.max(0,Math.ceil(usedSeconds-1e-9)),
    remainingSeconds:mode==='speedups'?Math.max(0,budget-usedSeconds):0,
    ...Object.fromEntries(RESOURCES.map(([key])=>[key,troops*(unit[key]||0)])),
    approximate:false};
}
const SUPREMO_TROOP_POINTS=Object.freeze([0,5,10,20,40,80,150]);
const SUPREMO_SPEEDUP_CAP=100_000_000;
function supremoScores(result,seconds=result.usedSeconds){
  if(!Number.isFinite(seconds)||seconds<0)throw Error('Tempo de aceleradores inválido.');
  const perTroop=SUPREMO_TROOP_POINTS[result.targetTier]-(result.operation==='evolution'?SUPREMO_TROOP_POINTS[result.tier]:0);
  const minutes=Math.floor(seconds/60+1e-9);
  const raw=minutes*250;
  const available=SUPREMO_SPEEDUP_CAP;
  const credited=Math.min(raw,available);
  return {perTroop,phase3:result.troops*perTroop,minutes,raw,available,credited,excess:raw-credited,total:credited,cap:SUPREMO_SPEEDUP_CAP};
}
function duration(seconds){
  let remaining=Math.max(0,Math.ceil(seconds-1e-9));
  const parts=[];
  for(const [label,size]of [['d',86400],['h',3600],['min',60],['s',1]]){
    const value=Math.floor(remaining/size);remaining%=size;
    if(value)parts.push(value+label);
  }
  return parts.join(' ')||'0s';
}
module.exports={SUPREMO_TROOP_POINTS,SUPREMO_SPEEDUP_CAP,supremoScores,DEFAULT_SPEED,INFANTRY,MOTOS,SHOOTERS,TROOP_TYPES,RESOURCES,MAX_QUANTITY,budgetSeconds,speedupSeconds,splitMinutes,minutesLabel,calculate,duration};
