'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {Scene,shapes,STRIDE}=require('../src/meshes3d.js');const G=require('../src/renderer3d.js');const {World}=require('../src/core.js');
test('procedural meshes are nonempty, finite triangle position/normal streams',()=>{for(const v of Object.values(shapes)){assert.ok(v instanceof Float32Array);assert.ok(v.length>0);assert.equal(v.length%18,0);assert.ok(v.every(Number.isFinite));let zmin=Infinity,zmax=-Infinity;for(let i=2;i<v.length;i+=6){zmin=Math.min(zmin,v[i]);zmax=Math.max(zmax,v[i]);}assert.ok(zmax>zmin);}});
test('every nondegenerate vertex normal is unit length',()=>{for(const v of Object.values(shapes))for(let i=0;i<v.length;i+=6){const d=Math.hypot(v[i+3],v[i+4],v[i+5]);assert.ok(d<1e-6||Math.abs(d-1)<1e-5);}});
test('scene rendering leaves serialized simulation untouched',()=>{const w=new World('READ-ONLY','standard',true,{layout:'portrait',height:1040});const before=JSON.stringify(w);const scene=new Scene();scene.build({world:w,w:w.width,h:w.height,t:5});assert.equal(JSON.stringify(w),before);});
test('portrait, desktop and title instances stay finite and within buffer limits',()=>{const s=new Scene();for(const [w,h] of [[1280,800],[720,620],[720,1180]]){const groups=s.build({w,h,t:3,world:null,mobile:w===720});assert.ok(s.count>100);for(const arr of Object.values(groups)){assert.equal(arr.length%STRIDE,0);assert.ok(arr.length/STRIDE<4096);assert.ok(arr.every(Number.isFinite));}}});
test('cached static meshes do not grow between repeated frames',()=>{const s=new Scene(),f={w:1280,h:800,t:1,world:null,mobile:false};const counts=[];for(let i=0;i<20;i++){s.build(f);counts.push(s.count);}assert.equal(new Set(counts).size,1);});

test('flight and scenery use disjoint valid depth bands in both APIs',()=>{
 assert.match(G.GL_VERTEX,/z01\*2\.-1\./);
 assert.match(G.WG_MESH,/o.clip=vec4f\([^;]*z01,1\.\)/);
 for(const z of [-500,-100,0,70,280,600]){
  for(const cls of [.02,.08,.44,.74,.86])assert.ok(G.depth01(z,cls)>=G.DEPTH.sceneryNear-1e-12);
  for(const cls of [.58,.66])assert.ok(G.depth01(z,cls)<=G.DEPTH.flightFar+1e-12);
 }
});
test('stage architecture is visibly differentiated between the three sectors',()=>{const hashes=[];for(const stage of [0,1,2]){const s=new Scene();s.floor(720,1180,stage,'ARCH-SEED');let acc=0;for(const arr of Object.values(s.groups))for(let i=0;i<Math.min(arr.length,STRIDE*20);i++)acc=(acc*33+Math.round(arr[i]*10))>>>0;hashes.push(acc);}assert.equal(new Set(hashes).size,3);});

test('dynamic background animation changes geometry over time without changing static cache key',()=>{const s=new Scene();s.floor(720,1180,1,'ANIM-SEED');const before=Object.values(s.groups).reduce((n,a)=>n+a.length,0);s.dynamicScenery(720,1180,1,'ANIM-SEED',0);const snap0=JSON.stringify(s.groups.box.slice(-64))+JSON.stringify(s.groups.orb.slice(-64))+JSON.stringify(s.groups.ring.slice(-64));for(const k of Object.keys(s.groups))s.groups[k].length=0;s.floor(720,1180,1,'ANIM-SEED');s.dynamicScenery(720,1180,1,'ANIM-SEED',3.5);const snap1=JSON.stringify(s.groups.box.slice(-64))+JSON.stringify(s.groups.orb.slice(-64))+JSON.stringify(s.groups.ring.slice(-64));assert.notEqual(snap0,snap1);assert.ok(Object.values(s.groups).reduce((n,a)=>n+a.length,0)>before);});

test('only explicit shadow materials are shaded as shadows, never ground .02',()=>{
 const scene=new Scene();scene.ship(360,600,0,1,3);
 const records=Object.values(scene.groups).flatMap(a=>Array.from({length:a.length/STRIDE},(_,i)=>a.slice(i*STRIDE,(i+1)*STRIDE)));
 const shadows=records.filter(a=>a[7]<0);assert.ok(shadows.length===4);
 assert.ok(shadows.every(a=>a[2]>-40));
 assert.match(G.GL_FRAGMENT,/if\(vClass<0\.\)/);
 assert.match(G.WG_MESH,/if\(v.cls<0\.\)/);
 assert.doesNotMatch(G.GL_FRAGMENT,/shadowMask=1\.-step/);
});
test('GL and GPU frame uniforms share the 80-byte layout and retain edge shock origin',()=>{const d=G.frameData({w:720,h:900,t:2,shock:{x:0,y:0,age:.2,strength:1},reduced:true,postFX:0,bloom:2,bgAnim:0},720,900);assert.equal(d.byteLength,80);assert.equal(d[4],0);assert.equal(d[5],0);assert.equal(d[15],1);assert.equal(d[16],0);assert.ok(d[17]>1);assert.equal(d[11],0);});
test('frame data carries boss emphasis and stage clear colors vary by sector',()=>{const world=new World('BOSS-FX','standard',true,{layout:'portrait',height:1040});world.stage=2;world.enemies=[{type:'boss',spawn:0,phase:2,hp:40,maxHp:100}];const d=G.frameData({w:720,h:1040,t:2,world,reduced:false},720,1040);assert.ok(d[10]>.7);const c0=G.clearColor(0,0),c1=G.clearColor(1,0),c2=G.clearColor(2,.9);assert.notDeepEqual(c0,c1);assert.ok(c2.r>c0.r);});
test('WebGPU effects use compute storage textures and bounded dispatch kernels',()=>{for(const s of [G.WG_BLUR,G.WG_COMPOSITE]){assert.match(s,/@compute @workgroup_size\(8,8\)/);assert.match(s,/texture_storage_2d/);assert.match(s,/gid\.xy>=dims/);assert.match(s,/textureStore/);}assert.match(G.WG_COMPOSITE,/original\.a<\.5&&warped\.a<\.5/);});
test('all included GLSL shaders declare WebGL2 GLSL ES 3.00',()=>{for(const s of [G.GL_VERTEX,G.GL_FRAGMENT,G.GL_QUAD,G.GL_BLUR,G.GL_COMPOSITE])assert.ok(s.startsWith('#version 300 es'));});
test('3D build embeds both backends and preserves all source files for rebuilding',()=>{const html=fs.readFileSync(require('node:path').join(__dirname,'../dist/NEMESIS-PACT.html'),'utf8');assert.match(html,/class GPUBackend/);assert.match(html,/dispatchWorkgroups/);assert.match(html,/class GLBackend/);assert.doesNotMatch(html,/<script\s+src=/);});
