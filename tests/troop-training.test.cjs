const {test}=require('node:test');
const assert=require('node:assert/strict');
const {INFANTRY,calculate:calculateWithDefault,budgetSeconds,duration}=require('../public/troop-training.cjs');
const calculate=input=>calculateWithDefault({speed:0,...input});

test('all six supplied infantry costs and reference times remain exact',()=>{
  const expected=[[15,45,45,0],[30,91,91,0],[60,136,136,5],[80,327,327,14],[100,454,454,91],[120,817,817,163]];
  INFANTRY.forEach((unit,i)=>{
    const result=calculate({tier:i+1,quantity:1});
    assert.deepEqual([result.requiredSeconds,result.tomato,result.wood,result.oil],expected[i]);
    assert.equal(result.approximate,false);
  });
});
test('one thousand T6 require 817000 of each main resource, 163000 oil and 120000 seconds',()=>{
  const result=calculate({tier:6,quantity:1000});
  assert.equal(result.tomato,817000);assert.equal(result.wood,817000);assert.equal(result.oil,163000);
  assert.equal(result.requiredSeconds,120000);assert.equal(duration(result.requiredSeconds),'1d 9h 20min');
});
test('one day of speedups trains whole troops with an exact unspent balance',()=>{
  const budget=budgetSeconds({days:1});
  const result=calculate({tier:6,mode:'speedups',budget});
  assert.equal(result.troops,720);assert.equal(result.requiredSeconds,86400);assert.equal(result.remainingSeconds,0);
  assert.equal(result.tomato,588240);assert.equal(result.oil,117360);
  const counts=INFANTRY.map(unit=>calculate({tier:unit.tier,mode:'speedups',budget}).troops);
  assert.deepEqual(counts,[5760,2880,1440,1080,864,720]);
});
test('speedup boundaries never count partially trainable troops',()=>{
  for(const unit of INFANTRY){
    assert.equal(calculate({tier:unit.tier,mode:'speedups',budget:unit.seconds-1}).troops,0);
    assert.equal(calculate({tier:unit.tier,mode:'speedups',budget:unit.seconds}).troops,1);
  }
});
test('mixed speedup denominations are added without imposing a 24h input limit',()=>{
  assert.equal(budgetSeconds({days:1,hours:25,minutes:61,seconds:60}),180120);
  assert.equal(budgetSeconds({}),0);
});
test('base duration is divided by the training rate bonus without rounding each troop',()=>{
  const standard=calculate({tier:1,quantity:100,speed:0});
  const faster=calculate({tier:1,quantity:100,speed:100});
  assert.equal(standard.requiredSeconds,1500);assert.equal(faster.requiredSeconds,750);
  assert.equal(faster.tomato,standard.tomato);
  const r=calculateWithDefault({tier:6,quantity:1000});
  assert.ok(Math.abs(r.secondsPerTroop-120/1.973)<1e-10);
  assert.equal(r.requiredSeconds,60822);
  for(const type of ['infantry','motos','shooters']){
    for(const [index,base] of [15,30,60,80,100,120].entries()){
      assert.equal(calculate({type,tier:index+1,quantity:1}).secondsPerTroop,base);
      assert.equal(calculate({type,tier:index+1,quantity:1,speed:100}).secondsPerTroop,base/2);
    }
  }
});
test('zero input returns zero troops, resources and time',()=>{
  for(const mode of ['quantity','speedups']){
    const result=calculate({tier:6,mode});
    assert.equal(result.troops,0);assert.equal(result.tomato,0);assert.equal(result.requiredSeconds,0);
  }
});
test('unsupported troop types and invalid or fractional inputs fail without misleading results',()=>{
  for(const input of [{type:'rider'},{tier:7},{quantity:-1},{quantity:1.5},{quantity:Infinity},{speed:-1},{speed:NaN},{mode:'evolution'}]){
    assert.throws(()=>calculate({tier:1,...input}));
  }
  assert.throws(()=>budgetSeconds({minutes:1.5}));
  assert.throws(()=>budgetSeconds({days:Infinity}));
});
test('T1 to T6 evolution uses the exact resource and time differences supplied by the user',()=>{
  const result=calculate({tier:1,highestTier:6,operation:'evolution',quantity:1});
  assert.deepEqual([result.tomato,result.wood,result.oil,result.requiredSeconds],[772,772,163,105]);
  assert.equal(result.targetTier,6);
  const bulk=calculate({tier:1,highestTier:6,operation:'evolution',quantity:1000});
  assert.deepEqual([bulk.tomato,bulk.wood,bulk.oil,bulk.requiredSeconds],[772000,772000,163000,105000]);
});
test('evolution with one day of accelerators consumes only complete upgrades',()=>{
  const result=calculate({tier:1,highestTier:6,operation:'evolution',mode:'speedups',budget:86400});
  assert.equal(result.troops,822);assert.equal(result.remainingSeconds,90);
  assert.equal(result.tomato,634584);
  assert.equal(calculate({tier:1,highestTier:6,operation:'evolution',mode:'speedups',budget:104}).troops,0);
});
test('evolution honors the highest unlocked tier and rejects equal or descending levels',()=>{
  const result=calculate({tier:3,highestTier:5,operation:'evolution',quantity:1});
  assert.deepEqual([result.tomato,result.wood,result.oil,result.requiredSeconds],[318,318,86,40]);
  for(const highestTier of [1,2,7])assert.throws(()=>calculate({tier:2,highestTier,operation:'evolution',quantity:1}));
});

test('all supplied motos training costs include steel and exact reference seconds',()=>{
  const expected=[[15,27,64,0,0],[30,0,91,45,0],[60,0,136,68,5],[80,0,327,163,14],[100,0,454,227,91],[120,0,817,409,163]];
  expected.forEach((row,index)=>{
    const r=calculate({type:'motos',tier:index+1,quantity:1});
    assert.deepEqual([r.requiredSeconds,r.tomato,r.wood,r.steel,r.oil],row);
  });
});
test('all supplied shooter training costs preserve their distinct resource mix',()=>{
  const expected=[[15,64,27,0,0],[30,91,0,45,0],[60,136,0,68,5],[80,327,0,163,14],[100,454,0,227,91],[120,817,0,409,163]];
  expected.forEach((row,index)=>{
    const r=calculate({type:'shooters',tier:index+1,quantity:1});
    assert.deepEqual([r.requiredSeconds,r.tomato,r.wood,r.steel,r.oil],row);
  });
});
test('T1 evolutions to T6 never promise refunds for resources no longer required',()=>{
  const moto=calculate({type:'motos',tier:1,highestTier:6,operation:'evolution',quantity:1});
  assert.deepEqual([moto.tomato,moto.wood,moto.steel,moto.oil,moto.requiredSeconds],[0,753,409,163,105]);
  const shooter=calculate({type:'shooters',tier:1,highestTier:6,operation:'evolution',quantity:1});
  assert.deepEqual([shooter.tomato,shooter.wood,shooter.steel,shooter.oil,shooter.requiredSeconds],[753,0,409,163,105]);
  assert.equal(calculate({tier:6,quantity:1000}).steel,0);
});
test('one day of accelerators compares infantry, motos and shooters at T6',()=>{
  const results=['infantry','motos','shooters'].map(type=>calculate({type,tier:6,mode:'speedups',budget:86400}));
  assert.deepEqual(results.map(r=>r.troops),[720,720,720]);
  assert.equal(results[1].wood,588240);assert.equal(results[1].steel,294480);assert.equal(results[1].remainingSeconds,0);
  assert.equal(results[2].tomato,588240);assert.equal(results[2].wood,0);
});
test('motos and shooters evolution respects intermediate highest unlocked tiers',()=>{
  for(const type of ['motos','shooters']){
    const r=calculate({type,tier:2,highestTier:4,operation:'evolution',quantity:100});
    assert.equal(r.steel,11800);assert.equal(r.oil,1400);assert.equal(r.requiredSeconds,5000);
    assert.equal(r[type==='motos'?'wood':'tomato'],23600);
    assert.throws(()=>calculate({type,tier:4,highestTier:4,operation:'evolution'}));
  }
});

test('speedup formats match both examples displayed by the game',()=>{
  const {speedupSeconds}=require('../public/troop-training.cjs');
  assert.equal(speedupSeconds({format:'days',time:{days:'206',hours:'4',minutes:'19'}}),296899*60);
  assert.equal(speedupSeconds({minutes:'296899'}),296899*60);
  assert.equal(speedupSeconds({format:'days',time:{days:'133',hours:'9',minutes:'3'}}),192063*60);
});
test('switching formats preserves the available training budget for every troop type',()=>{
  const {speedupSeconds,splitMinutes}=require('../public/troop-training.cjs');
  const original=speedupSeconds({minutes:'192063'});
  const converted=splitMinutes(original);
  assert.deepEqual(converted,{minutes:'192063',time:{days:'133',hours:'9',minutes:'3'}});
  const restored=speedupSeconds({format:'days',time:converted.time});
  for(const type of ['infantry','motos','shooters']){
    assert.deepEqual(calculate({type,tier:6,mode:'speedups',budget:original}),calculate({type,tier:6,mode:'speedups',budget:restored}));
  }
});
test('minute totals remain readable and explicitly approximate fractional conversions',()=>{
  const {minutesLabel}=require('../public/troop-training.cjs');
  assert.equal(minutesLabel(86400),'1.440 min');
  assert.equal(minutesLabel(61000),'≈ 1.016,67 min');
  assert.equal(minutesLabel(53),'≈ 0,88 min');
  assert.equal(minutesLabel(24),'0,4 min');
  assert.equal(minutesLabel(0),'0 min');
});
test('speedup stock accepts whole minutes and rejects incomplete or fractional amounts',()=>{
  const {speedupSeconds,splitMinutes}=require('../public/troop-training.cjs');
  for(const minutes of ['',-1,1.5,Infinity])assert.throws(()=>speedupSeconds({minutes}));
  assert.throws(()=>speedupSeconds({format:'days',time:{days:'',hours:'0',minutes:'0'}}));
  assert.throws(()=>splitMinutes(61));
  assert.equal(speedupSeconds({minutes:'0'}),0);
});

test('Supremo scores training in phase 3 for every tier and troop type',()=>{
  const {supremoScores}=require('../public/troop-training.cjs');
  for(const type of ['infantry','motos','shooters'])for(const [index,points]of [5,10,20,40,80,150].entries()){
    assert.equal(supremoScores(calculate({type,tier:index+1,quantity:10})).phase3,points*10);
  }
  const result=calculate({tier:6,mode:'speedups',budget:86400,speed:80});
  const score=supremoScores(result);
  assert.equal(result.troops,1296);assert.equal(score.phase3,194400);assert.equal(score.credited,360000);
});
test('Supremo evolution awards the difference in rank points',()=>{
  const {supremoScores}=require('../public/troop-training.cjs');
  assert.equal(supremoScores(calculate({tier:1,highestTier:6,operation:'evolution',quantity:100})).phase3,14500);
  assert.equal(supremoScores(calculate({tier:3,highestTier:5,operation:'evolution',quantity:100})).phase3,6000);
});
test('day 1 caps the simulated score without asking for previous points',()=>{
  const {supremoScores}=require('../public/troop-training.cjs');
  const r=calculate({tier:6,quantity:300000});
  const s=supremoScores(r);
  assert.equal(s.raw,150000000);assert.equal(s.credited,100000000);assert.equal(s.excess,50000000);
  assert.equal(supremoScores(r,400000*60).excess,0);
  assert.equal(supremoScores(r,400001*60).excess,250);
  for(const seconds of [-1,NaN,Infinity])assert.throws(()=>supremoScores(r,seconds));
});
test('day 1 can compare the entire entered stock including unused training balance',()=>{
  const {supremoScores}=require('../public/troop-training.cjs');
  const r=calculate({tier:6,mode:'speedups',budget:180});
  assert.equal(supremoScores(r,180).raw,750);
  assert.equal(supremoScores(r,180).phase3,150);
});
test('day 1 excludes unused budget and does not invent fractional-minute points',()=>{
  const {supremoScores}=require('../public/troop-training.cjs');
  const r=calculate({tier:6,mode:'speedups',budget:239});
  assert.equal(r.troops,1);assert.equal(supremoScores(r).raw,500);
  assert.equal(supremoScores(calculate({tier:1,quantity:3})).raw,0);
  assert.equal(supremoScores(calculate({tier:6,quantity:0})).phase3,0);
  assert.equal(supremoScores(calculate({tier:6,quantity:0})).raw,0);
});
