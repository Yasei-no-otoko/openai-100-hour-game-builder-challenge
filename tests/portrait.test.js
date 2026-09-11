'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {World,modifiers}=require('../src/core.js');
const {pilot}=require('./simulate.js');
const dt=1/120;
function portrait(height=1040,seed='PORTRAIT-UNIT') {return new World(seed,'standard',false,{layout:'portrait',height});}
function advance(w,seconds,input={}){for(let i=0;i<seconds*120;i++){w.step(dt,input);w.takeEvents();}}
test('portrait has explicit 720-wide geometry, finite clamped height and metadata',()=>{
  for(const [input,expected] of [[1040,1040],[20,520],[9999,1440],[NaN,1024],[Infinity,1440]]){
    const w=portrait(input);assert.equal(w.width,720);assert.equal(w.height,expected);assert.equal(w.layout,'portrait');
    assert.deepEqual(w.report().arena,{width:720,height:expected});assert.equal(w.bounds.top,36);assert.equal(w.bounds.bottom,expected-36);
  }
});
test('desktop world and bounds remain backward-compatible',()=>{const w=new World('DEFAULT');assert.equal(w.width,1280);assert.equal(w.height,800);assert.equal(w.bounds.top,112);assert.equal(w.bounds.bottom,695);assert.equal(w.motionScale,1);});
for(const height of [520,740,1040,1440]){
  test(`portrait ${height}: seeded spawn plans stay inside the visible arena`,()=>{
    for(let stage=0;stage<3;stage++)for(let wave=0;wave<2;wave++){
      const w=portrait(height),b=portrait(height);w.stage=b.stage=stage;w.wave=b.wave=wave;w.startWave();b.startWave();assert.deepEqual(w.wavePlan,b.wavePlan);
      for(const e of w.wavePlan){assert.ok(e.x>=36&&e.x<=684);assert.ok(e.y>=36&&e.y<=height-36);}
    }
  });
  test(`portrait ${height}: movement and dash are bounded on all edges`,()=>{
    const w=new World('BOUNDS','standard',true,{layout:'portrait',height});
    for(const [mx,my] of [[1,0],[-1,0],[0,1],[0,-1]]){advance(w,5,{mx,my,dash:true});assert.ok(w.p.x>=36&&w.p.x<=684);assert.ok(w.p.y>=36&&w.p.y<=height-36);}
  });
  test(`portrait ${height}: every boss's full silhouette stays on screen`,()=>{
    for(let stage=0;stage<3;stage++){
      const w=new World('BOSS-BOUNDS','standard',true,{layout:'portrait',height});w.enemies=[];w.stage=stage;
      const e=w.spawn('boss',360,w.bossY);e.spawn=0;e.hp*=.3;
      for(let i=0;i<2400;i++){w.step(dt,{});w.takeEvents();assert.ok(e.x>=112&&e.x<=w.width-112);assert.ok(e.y>=112&&e.y<=w.height-112);}
    }
  });
}
test('portrait laser collision, reflection and nova remain mechanical, not UI-only',()=>{
  const w=portrait();w.sign('mirror');w.wavePlan=[];w.spawn('turret',360,150).fire=100;
  w.p.inv=0;w.bullet(w.p.x+30,w.p.y,Math.PI,0,true);w.step(dt,{parry:true});assert.equal(w.parries,1);assert.ok(w.bullets.some(b=>b.reflected&&!b.hostile));
  w.lasers=[{x:w.p.x,y:0,a:Math.PI/2,t:0,active:false,width:20}];w.p.inv=0;w.p.dash=0;w.step(dt,{});assert.equal(w.p.hp,w.p.maxHp-1);
  w.p.energy=100;assert.equal(w.nova(),true);assert.equal(w.lasers.length,0);assert.equal(w.p.energy,0);
});
test('portrait source dimensions remain independent of physical viewport changes',()=>{
  const setup={layout:'portrait',height:1040},w=new World('IMMUTABLE','standard',false,setup);w.sign('mercy');
  setup.height=520;setup.layout='desktop';assert.equal(w.height,1040);assert.equal(w.width,720);
});
test('portrait identical inputs and dimensions produce identical runs',()=>{
  const a=portrait(),b=portrait();a.sign('mercy');b.sign('mercy');
  for(let i=0;i<2400;i++){const input=pilot(a);a.step(dt,input);b.step(dt,input);a.takeEvents();b.takeEvents();}
  assert.deepEqual(a.report(),b.report());assert.deepEqual(a.p,b.p);assert.deepEqual(a.bullets,b.bullets);
});
test('portrait breach keeps consequences and cannot be used twice',()=>{
  const w=portrait();w.sign('glass');const boss=w.spawn('boss',360,w.bossY);boss.spawn=0;w.p.hp=3;
  assert.equal(w.breach(),true);assert.equal(w.breach(),false);assert.equal(w.p.hp,4);assert.equal(w.mods.enemyRate,1.25);assert.equal(w.contracts[0].kept,false);assert.equal(w.breaches,1);
});
