/* Layout integration only. This bot sees every projectile's exact position;
   completion is not a human playability, difficulty or frame-rate benchmark. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{play}=require('./simulate.js');
const result={method:'120Hz legal-input full-state bot; no health, enemy, time or progression overrides',version:require('../package.json').version,runs:[]};
for(const height of [620,900,1180])for(const difficulty of ['assist','standard','veteran'])for(const seed of ['PORTRAIT-01','PORTRAIT-02','PORTRAIT-03']){
  const r=play(seed,difficulty,{layout:'portrait',height});result.runs.push(r);
  console.log(height,difficulty,seed,r.outcome,r.seconds,r.bosses,r.remainingHull,r.damageTaken);
}
result.completed=result.runs.filter(r=>r.outcome==='won').length;result.total=result.runs.length;
fs.writeFileSync(path.join(__dirname,'../docs/portrait-simulation-results.json'),JSON.stringify(result,null,2)+'\n');
console.log('Completed',result.completed,'/',result.total);
if(result.runs.some(r=>!['won','dead'].includes(r.outcome)))process.exitCode=1;
