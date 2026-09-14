'use strict';
const {Run,RELICS}=require('../src/expansion.js'),{pilot}=require('./simulate.js'),fs=require('node:fs'),path=require('node:path');
const result={method:'Fixed 120Hz, full-state heuristic pilot. Only legal combat inputs and offered menu decisions. No hull, timer or progression overrides. Not a human difficulty study.',runs:[]};
for(const layout of ['desktop','portrait'])for(const mode of ['expedition','gauntlet'])for(const difficulty of ['assist','standard','veteran']){
 const w=new Run('ASCENT-'+layout,difficulty,false,layout==='portrait'?{layout,height:1000}:{},{mode,airframe:'vanguard'});let frames=0,peakBullets=0,peakEnemies=0;
 while(!['won','dead'].includes(w.phase)&&frames<120*1800){
  if(w.phase==='route'){
   // Real purchases only, using credits earned by this same run.
   const desired=['echo','satellite','second','needle','nova','capacitor','lens','razor'];
   for(const id of desired)if(w.shop.some(r=>r.id===id))w.purchase(id);
   if(w.p.hp<=3)w.repair();w.chooseRoute('refuge');
  }else if(w.phase==='pact'){
   const ids=w.offersForPact().map(c=>c.id),pref=['mirror','sanctuary','mercy','duel','silence','velocity','glass'];w.sign(pref.find(id=>ids.includes(id)));
  }else if(w.phase==='upgrade'){
   const weight={scatter:7,rapid:9,orbit:10,homing:9,rail:8,parry:7,magnet:3,hull:8,leech:9,echo:10,razor:2,nova:8,repair:w.p.hp<=3?20:0};
   w.chooseUpgrade([...w.offers].sort((a,b)=>weight[b.id]-weight[a.id])[0].id);
  }else{w.step(1/120,pilot(w));frames++;}
  w.takeEvents();peakBullets=Math.max(peakBullets,w.bullets.length);peakEnemies=Math.max(peakEnemies,w.enemies.length);
  if(!Number.isFinite(w.p.x+w.p.y+w.score))throw Error('Non-finite state');
 }
 const r={...w.report(),hullRemaining:w.p.hp,peakBullets,peakEnemies,frames};result.runs.push(r);console.log(layout,mode,difficulty,r.outcome,r.bosses,r.seconds,r.hullRemaining);
 if(!['won','dead'].includes(w.phase)){console.log('STALL',JSON.stringify({stage:w.stage,wave:w.wave,p:w.p,upgrades:w.upgrades,enemies:w.enemies,plan:[w.planIndex,w.wavePlan.length],fire:w.ceasefire,pact:w.pact}));process.exitCode=1;}
}
result.completed=result.runs.filter(r=>r.outcome==='won').length;result.total=result.runs.length;
fs.mkdirSync(path.join(__dirname,'../docs/validation-0.4.0'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../docs/validation-0.4.0/campaign-simulations.json'),JSON.stringify(result,null,2));
