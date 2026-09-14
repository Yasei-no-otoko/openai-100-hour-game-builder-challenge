'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {World, rng, modifiers, segmentHit, UPGRADES, CONTRACTS} = require('../src/core.js');
const dt = 1 / 120;
function arena(pact = 'mercy') {
  const w = new World('UNIT-TEST');
  w.sign(pact); w.wavePlan = []; w.planIndex = 0;
  w.p.inv = 0;
  return w;
}
function run(w, frames, input = {}) { for (let i=0; i<frames; i++) { w.step(dt, input); w.takeEvents(); } }
function target(w, type='turret', x=640, y=210) { const e=w.spawn(type,x,y); e.spawn=0; e.fire=100; return e; }

test('seeded RNG is deterministic, bounded, and seed-sensitive', () => {
  const a=rng('ALPHA'), b=rng('ALPHA'), c=rng('BETA');
  const x=Array.from({length:256},a), y=Array.from({length:256},b), z=Array.from({length:256},c);
  assert.deepEqual(x,y); assert.notDeepEqual(x,z); assert.ok(x.every(v=>v>=0&&v<1));
});
test('swept collision detects tunneling and handles stationary segments', () => {
  assert.ok(segmentHit(0,0,100,0,50,0,2));
  assert.ok(!segmentHit(0,0,100,0,50,10,2));
  assert.ok(segmentHit(1,1,1,1,1,1,1));
  assert.ok(!segmentHit(1,1,1,1,5,5,1));
});
test('all seven contracts have real, distinct modifiers', () => {
  assert.equal(CONTRACTS.length,7);
  assert.equal(modifiers('mercy').speed,.7); assert.ok(modifiers('mercy').extra);
  assert.equal(modifiers('mirror').reflect,2.2); assert.equal(modifiers('mirror').gun,.75);
  assert.equal(modifiers('glass').damage,2); assert.equal(modifiers('glass').hp,.7);
  assert.ok(modifiers('silence').silence); assert.ok(modifiers('sanctuary').sanctuary);
  assert.ok(modifiers('duel').noAdds); assert.equal(modifiers('duel').bossRate,1.25);
  assert.equal(modifiers('velocity').dash,.55); assert.equal(modifiers('velocity').speed,1.3);
});
test('invalid difficulty/long seed normalize and invalid contracts do not mutate state', () => {
  const w=new World('x'.repeat(200),'invalid');
  assert.equal(w.seed.length,48); assert.equal(w.difficulty,'standard');
  assert.equal(w.sign('silence'),false); assert.equal(w.phase,'pact'); assert.equal(w.contracts.length,0);
  assert.ok(w.sign('mercy')); assert.equal(w.sign('mercy'),false); assert.equal(w.contracts.length,1);
});
test('wave plan and upgrade choices are independent of cosmetic/hit RNG consumption', () => {
  const a=new World('REPLAY'), b=new World('REPLAY');
  for(let i=0;i<1500;i++) b.random();
  a.sign('mercy'); b.sign('mercy'); assert.deepEqual(a.wavePlan,b.wavePlan);
  a.offerUpgrade(); b.offerUpgrade(); assert.deepEqual(a.offers,b.offers);
});
test('normal and diagonal movement share a speed limit; player stays in bounds', () => {
  const a=arena(), b=arena(); target(a); target(b);
  const start={x:a.p.x,y:a.p.y};run(a,60,{mx:1});run(b,60,{mx:1,my:-1});
  const ax=Math.hypot(a.p.x-start.x,a.p.y-start.y), bx=Math.hypot(b.p.x-start.x,b.p.y-start.y);
  assert.ok(Math.abs(ax-bx)<.001); run(a,600,{mx:1,my:1});
  assert.ok(a.p.x<=1244&&a.p.y<=695);
});
test('invalid/negative dt does not advance and huge dt is clamped', () => {
  const w=arena(); w.step(NaN); w.step(-1); w.step(0); assert.equal(w.time,0);
  w.step(60); assert.ok(w.time<=1/30);
});
test('dash grants invulnerability, cannot retrigger during cooldown', () => {
  const w=arena(); target(w);w.step(dt,{dash:true,mx:1});
  assert.ok(w.p.dash>0&&w.p.inv>0); assert.equal(w.hurt(),false);
  const cd=w.p.dashCd;w.step(dt,{dash:true,mx:1});assert.ok(w.p.dashCd<cd);
});
test('perfect parry turns enemy bullet into homing friendly damage and charges energy', () => {
  const w=arena('mirror');target(w);const energy=w.p.energy;
  const b=w.bullet(w.p.x+40,w.p.y,Math.PI,130,true);
  w.step(dt,{parry:true});assert.equal(b.hostile,false);assert.equal(b.reflected,true);
  assert.ok(b.homing);assert.equal(b.damage,58*2.2);assert.equal(w.parries,1);assert.ok(w.p.energy>energy);
});
test('late parry uses the non-perfect damage window', () => {
  const w=arena();target(w);w.p.parry=.1;w.p.parryAge=.14;
  const b=w.bullet(w.p.x+30,w.p.y,Math.PI,130,true);w.step(dt);
  assert.equal(b.damage,38);assert.equal(w.score,40);
});
test('one projectile can graze only once', () => {
  const w=arena();target(w); w.bullet(w.p.x+24,w.p.y,0,0,true);
  run(w,10);assert.equal(w.grazes,1);assert.equal(w.score,12);
});
test('enemy hits consume hull, damage invulnerability prevents chained hits', () => {
  const w=arena();const hp=w.p.hp;assert.ok(w.hurt());assert.equal(w.p.hp,hp-1);
  assert.equal(w.hurt(),false);assert.equal(w.p.hp,hp-1);
});
test('glass doubles damage and breach removes both sides of the contract', () => {
  const w=arena('glass'),e=target(w);const hp=e.maxHp;w.hurt();assert.equal(w.damageTaken,2);
  e.hp=e.maxHp*0.9;w.breach();assert.equal(e.maxHp,hp/.7);
  assert.equal(w.mods.damage,1);assert.equal(w.mods.hp,1);assert.equal(w.mods.enemyRate,1.25);
  assert.equal(w.contracts[0].kept,false);assert.equal(w.breaches,1);assert.equal(w.breach(),false);
});
test('nova requires energy, clears bullets and lasers, damages enemies', () => {
  const w=arena(),e=target(w,'warden');w.p.energy=99;assert.equal(w.nova(),false);
  w.bullet(400,400,0,100);w.lasers.push({t:.5});w.p.energy=100;assert.ok(w.nova());
  assert.equal(w.lasers.length,0);assert.ok(e.hp<=0);assert.ok(w.bullets.every(b=>b.life<=0));
  assert.ok(w.p.energy<100);assert.equal(w.nova(),false);
});
test('sanctuary clears swept enemy bullets but not enemy bodies', () => {
  const w=arena();w.mods=modifiers('sanctuary');w.p.x=640;w.p.y=400;
  const b=w.bullet(600,400,0,160,true);w.step(dt);assert.ok(b.life<=0);
  const hp=w.p.hp;target(w,'chaser',640,400);w.step(dt);assert.equal(w.p.hp,hp-1);
});
test('ceasefire stops both sides firing and hostile motion, not movement', () => {
  const w=arena();target(w);w.mods=modifiers('silence');w.waveTime=3.8;
  const b=w.bullet(300,300,0,100,true),x=b.x,px=w.p.x;
  run(w,20,{mx:1,shoot:true});assert.ok(w.ceasefire);assert.equal(b.x,x);assert.ok(w.p.x>px);
  assert.equal(w.bullets.filter(b=>!b.hostile).length,0);
});
test('duel suppresses boss reinforcements while ordinary pact allows them', () => {
  const a=arena(),b=arena();a.wave=b.wave=2;a.startWave();b.startWave();b.mods=modifiers('duel');
  for(const w of [a,b]){const e=w.enemies[0];e.spawn=0;e.hp=e.maxHp*.5;e.special=0;w.updateBoss(e,dt);}
  assert.equal(a.enemies.length,2);assert.equal(b.enemies.length,1);
});
test('low-hull upgrade choices always offer a full repair', () => {
  const w=arena();w.p.hp=2;w.offerUpgrade();assert.equal(w.offers[2].id,'repair');
  assert.ok(w.chooseUpgrade('repair'));assert.equal(w.p.hp,w.p.maxHp);assert.equal(w.wave,1);
  assert.equal(w.chooseUpgrade('repair'),false);
});
test('upgrades are unique choices and capped upgrades disappear', () => {
  const w=arena();w.upgrades=Object.fromEntries(UPGRADES.filter(u=>u.id!=='repair'&&u.id!=='rapid').map(u=>[u.id,u.max]));
  w.offerUpgrade();assert.deepEqual(w.offers.map(u=>u.id),['rapid']);
  w.p.hp=2;w.offerUpgrade();assert.ok(w.offers.some(u=>u?.id==='repair'));
});
test('hull upgrade raises capacity and heals without overflow', () => {
  const w=arena();const max=w.p.maxHp;w.phase='upgrade';w.offers=[UPGRADES.find(u=>u.id==='hull')];
  w.chooseUpgrade('hull');assert.equal(w.p.maxHp,max+2);assert.equal(w.p.hp,max+2);
});
test('friendly bullets deal damage once per enemy even with piercing', () => {
  const w=arena(),e=target(w,'warden',640,400),hp=e.hp;
  w.bullet(640,400,0,0,false,{damage:10,pierce:3});run(w,10);
  assert.equal(e.hp,hp-10);
});
test('death cannot be overwritten by same-frame empty-wave progression', () => {
  const w=arena();w.p.hp=1;w.clearClock=1.3;w.hurt();w.step(dt);
  assert.equal(w.phase,'dead');assert.equal(w.report().outcome,'dead');
});
test('all three sectors progress through six choices to the correct victory ending (fixture)', () => {
  const w=new World('FLOW');let choices=0;
  while(w.phase!=='won') {
    if(w.phase==='pact')w.sign(w.offersForPact()[0].id);
    if(w.phase==='upgrade'){w.chooseUpgrade(w.offers[0].id);choices++;}
    if(w.wave===2){const e=w.enemies[0];e.spawn=0;w.hitEnemy(e,e.maxHp+1);}
    w.enemies=[];w.wavePlan=[];w.planIndex=0;run(w,160);
  }
  assert.equal(choices,6);assert.equal(w.bossKills,3);assert.equal(w.stage,3);
  assert.equal(w.contracts.length,3);assert.ok(w.contracts.every(c=>c.kept));
});
test('training is immortal and does not advance campaign', () => {
  const w=new World('TRAIN','standard',true);w.p.inv=0;w.hurt();assert.equal(w.p.hp,w.p.maxHp);
  run(w,500,{shoot:true,autoAim:true});assert.equal(w.phase,'combat');assert.equal(w.stage,0);
});
test('simulation entity budgets prevent unbounded projectile growth', () => {
  const w=arena();for(let i=0;i<3000;i++)w.bullet(200,200,0,10);
  assert.equal(w.bullets.length,1100);for(let i=0;i<100;i++)w.spawn('chaser',100,100);
  assert.equal(w.enemies.length,56);
});
test('identical input streams produce identical full simulation states', () => {
  const a=arena(),b=arena();target(a);target(b);
  for(let i=0;i<1000;i++){const input={mx:Math.sin(i/100),my:Math.cos(i/100),autoAim:true,shoot:true,parry:i%180===0};a.step(dt,input);b.step(dt,input);a.takeEvents();b.takeEvents();}
  assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
});
test('report is detached, bounded and JSON serializable', () => {
  const w=arena();w.log=Array.from({length:500},()=>({type:'wave'}));const r=w.report();
  assert.equal(r.timeline.length,256);r.contracts[0].kept=false;assert.equal(w.contracts[0].kept,true);
  assert.equal(JSON.parse(JSON.stringify(r)).seed,'UNIT-TEST');
});
test('standalone has no external assets and networking is disabled by CSP and hosted gate', () => {
  const html=fs.readFileSync(path.join(__dirname,'../dist/NEMESIS-PACT.html'),'utf8');
  assert.ok(!/<script\s+src=/i.test(html));assert.ok(!/<link[^>]+rel="stylesheet"/i.test(html));
  assert.match(html,/connect-src 'none'/);assert.match(html,/!globalThis\.NEMESIS_HOSTED/);assert.doesNotMatch(html,/window\.NEMESIS_HOSTED=true/);
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(html.includes('window.PactCore'));assert.ok(html.includes('NEMESIS PACT'));
});
