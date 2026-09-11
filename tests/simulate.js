/* Integration playthrough bot. Uses public player actions only; no health,
 * enemy, timer, damage or progression cheats. Full state observation gives
 * this bot an advantage over humans; this is not a human difficulty study. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {World, segmentHit} = require('../src/core.js');
function pilot(w) {
  const p=w.p, t=w.time;
  // Smooth elliptical strafing, with short-horizon threat repulsion.
  const a=t*.52,portrait=w.layout==='portrait';
  const gx=portrait?w.width/2+Math.sin(a)*w.width*.3:640+Math.sin(a)*405,gy=portrait?w.height*.63+Math.cos(a)*w.height*.2:440+Math.cos(a)*160;
  let mx=(gx-p.x)/110, my=(gy-p.y)/110, danger=0, nearby=0, laser=false;
  for(const b of w.bullets) {
    if(!b.hostile||b.life<=0)continue;
    const dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy);
    if(d<67)nearby++;
    if(d<140){
      const h=.20,fx=b.x+b.vx*h,fy=b.y+b.vy*h,dd=Math.hypot(fx-p.x,fy-p.y);
      if(dd<70){const force=(70-dd)/20;mx+=(p.x-fx)/Math.max(dd,1)*force;my+=(p.y-fy)/Math.max(dd,1)*force;danger++;}
    }
  }
  for(const e of w.enemies){const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);if(d<e.r+90){mx+=dx/Math.max(d,1)*2;my+=dy/Math.max(d,1)*2;}}
  for(const l of w.lasers){if((l.active||l.t<.3)&&segmentHit(l.x,l.y,l.x+Math.cos(l.a)*1600,l.y+Math.sin(l.a)*1600,p.x,p.y,55)){
    laser=true; const side=Math.sin(l.a)*(p.x-l.x)-Math.cos(l.a)*(p.y-l.y)>0?1:-1;
    mx+=Math.sin(l.a)*side*3;my-=Math.cos(l.a)*side*3;
  }}
  const len=Math.hypot(mx,my);if(len>1){mx/=len;my/=len;}
  return {mx,my,shoot:true,autoAim:true,parry:nearby>0&&p.parryCd<=0,
    dash:(laser||(danger>=2&&p.parryCd>0&&p.parry===0))&&p.dashCd<=0,
    nova:p.energy>=w.novaCost()&&(w.enemies.length>2||w.wave===2),
    breach:p.hp<=2&&!w.broken};
}
function play(seed,difficulty,viewport={}) {
  const w=new World(seed,difficulty,false,viewport);let frames=0,peakBullets=0,peakEnemies=0;
  while(!['won','dead'].includes(w.phase)&&frames<120*720) {
    if(w.phase==='pact'){const ids=['mercy','sanctuary','mirror'];w.sign(ids[w.stage]);}
    else if(w.phase==='upgrade'){
      const weight={scatter:7,rapid:7,orbit:9,homing:8,rail:7,parry:6,magnet:3,hull:9,leech:7,echo:7,razor:2,nova:4,repair:w.p.hp<=3?20:0};
      const choice=[...w.offers].sort((a,b)=>weight[b.id]-weight[a.id])[0];w.chooseUpgrade(choice.id);
    }
    else {w.step(1/120,pilot(w));frames++;}
    w.takeEvents();peakBullets=Math.max(peakBullets,w.bullets.length);peakEnemies=Math.max(peakEnemies,w.enemies.length);
    if(!Number.isFinite(w.p.x+w.p.y+w.p.hp+w.score))throw new Error('Non-finite simulation');
  }
  return {...w.report(),frames,peakBullets,peakEnemies,remainingHull:w.p.hp};
}
if(require.main===module){
  const result={method:'Full-state heuristic bot; legal player inputs only; fixed 120 Hz; no combat or progression cheats',runs:[]};
  for(const difficulty of ['assist','standard','veteran'])for(const seed of ['NEMESIS','PLAYTEST-02','PLAYTEST-03']){
    const r=play(seed,difficulty);result.runs.push(r);console.log(difficulty,seed,r.outcome,r.seconds,r.bosses,r.remainingHull,r.damageTaken,r.parries);
  }
  result.completed=result.runs.filter(r=>r.outcome==='won').length;result.total=result.runs.length;
  fs.writeFileSync(path.join(__dirname,'../docs/simulation-results.json'),JSON.stringify(result,null,2)+'\n');
  if(result.runs.some(r=>r.outcome!=='won'&&r.outcome!=='dead'))process.exitCode=1;
}
module.exports={pilot,play};
