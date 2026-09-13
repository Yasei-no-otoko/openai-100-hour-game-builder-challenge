'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Scene,shapes,STRIDE,LAYER}=require('../src/meshes3d.js');
const G=require('../src/renderer3d.js'),{World}=require('../src/core.js');

test('ground is ordinary shaded scenery; all flight classes alone receive protection',()=>{
 for(const c of [LAYER.GROUND,LAYER.TRIM,LAYER.HIGH,LAYER.TALL,LAYER.SKY,LAYER.SHADOW])assert.equal(G.materialMask(c),0);
 assert.equal(G.materialMask(LAYER.FLIGHT),1);assert.equal(G.materialMask(LAYER.FLIGHT_HIGH),1);
});
test('fog never washes out ships and nearer surfaces receive less aerial haze',()=>{
 for(let stage=0;stage<3;stage++){
  for(const cls of [.58,.66,-1])assert.equal(G.fogAmount(30,300,800,stage,cls),0);
  const far=G.fogAmount(-58,100,800,stage,.02),near=G.fogAmount(-58,700,800,stage,.02);
  assert.ok(far>near&&far<.39);assert.ok(G.fogAmount(100,100,800,stage,.44)<far);
 }
 const fog=[0,1,2].map(s=>G.fogAmount(-58,100,800,s,.02));assert.equal(new Set(fog).size,3);
});
test('ALL transformed mesh vertices fit WebGPU 0..1 and GL -1..1 across scenery seeds',()=>{
 let count=0,flights=0;let minGap=Infinity;
 for(const [width,height]of [[1280,800],[720,520],[720,1440]])for(let stage=0;stage<3;stage++)for(const seed of ['BLACK-REGRESSION','CITADEL-17'])for(const time of [0,9.7]){
  const w=new World(seed,'standard',true,width===720?{layout:'portrait',height}:{});w.stage=stage;w.enemies=[];
  for(const type of ['boss','chaser','turret','spinner','lancer','warden']){const e=w.spawn(type,w.width*.4,w.height*.35);e.spawn=0;e.phase=2;}
  const scene=new Scene(),groups=scene.build({world:w,w:w.width,h:w.height,t:time,bgAnim:2});
  let farthestFlight=0,nearestScenery=1;
  for(const [mesh,arr]of Object.entries(groups))for(let i=0;i<arr.length;i+=STRIDE){
   const cls=arr[i+7],sy=arr[i+5],sz=arr[i+6],st=Math.sin(arr[i+15]),ct=Math.cos(arr[i+15]);
   for(let v=0;v<shapes[mesh].length;v+=6){
    const z=arr[i+2]+shapes[mesh][v+1]*sy*st+shapes[mesh][v+2]*sz*ct;
    const ndc=G.depth01(z,cls),gl=ndc*2-1;
    assert.ok(ndc>0&&ndc<1);assert.ok(gl>-1&&gl<1);
    if(G.isFlight(cls)){farthestFlight=Math.max(farthestFlight,ndc);flights++;}else nearestScenery=Math.min(nearestScenery,ndc);
    count++;
   }
  }
  assert.ok(nearestScenery-farthestFlight>.28,'tower and flight bands overlap');minGap=Math.min(minGap,nearestScenery-farthestFlight);
 }
 assert.ok(count>1e6&&flights>1e4);console.log(`Checked ${count} transformed vertices; minimum depth gap ${minGap.toFixed(4)}`);
});
test('regression demonstrates why the previous WebGPU vertex clipped a ship',()=>{
 const oldZ=-(14+.66*220+560*.03)/700;assert.ok(oldZ<0);
 assert.ok(G.depth01(14,.66)>0&&G.depth01(14,.66)<1);
});
test('background OFF remains static across time even during boss phases',()=>{
 const w=new World('OFF','standard',true);w.enemies=[];const b=w.spawn('boss',640,230);b.spawn=0;
 const sc=new Scene();sc.build({world:w,w:1280,h:800,t:0,bgAnim:0});const stat=JSON.stringify(sc.staticGroups);
 // Direct ambient pass excludes gameplay craft, which must remain live.
 const a=new Scene(),d=new Scene();a.dynamicScenery(1280,800,1,'OFF',0,0,0);d.dynamicScenery(1280,800,1,'OFF',999,0,0);assert.deepEqual(a.groups,d.groups);
 sc.build({world:w,w:1280,h:800,t:999,bgAnim:0});assert.equal(JSON.stringify(sc.staticGroups),stat);
});
test('all graphics settings keep zero values intact and preserve essential tone mapping',()=>{
 for(const n of [0,1,2]){const f=G.frameData({w:1280,h:800,t:2,postFX:n,bloom:n,bgAnim:n},1280,800);assert.ok([...f].every(Number.isFinite));assert.equal(f.length,20);assert.ok(f[14]>0);if(n===0){assert.equal(f[16],0);assert.equal(f[17],0);}}
 assert.match(G.GL_COMPOSITE,/aces\(col/);assert.match(G.WG_COMPOSITE,/aces\(col/);
});
test('each color-aberration sample checks foreground masks, preventing ghost ships',()=>{
 assert.match(G.GL_COMPOSITE,/orig.a<.5&&warped.a<.5&&redSample.a<.5&&blueSample.a<.5/);
 assert.match(G.WG_COMPOSITE,/rr.a<.5&&bb.a<.5/);
});
test('distribution source and standalone both advertise the exact hotfix version',()=>{
 const root=path.resolve(__dirname,'..');const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));assert.equal(pkg.version,'0.3.6.1');
 const html=fs.readFileSync(path.join(root,'dist/NEMESIS-PACT.html'),'utf8');assert.match(html,/build:'0.3.6.1'/);assert.match(html,/vClass<0\./);assert.match(html,/z01,1\.\)/);
});
