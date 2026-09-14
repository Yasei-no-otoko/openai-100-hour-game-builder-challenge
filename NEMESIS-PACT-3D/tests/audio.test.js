'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Score=require('../src/score.js'),Sound=require('../src/audio.js');
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function stream(id,options={}){return Array.from({length:512},(_,i)=>Score.plan(id,i,options));}

test('17 named cues cover six sectors, six bosses and five noncombat contexts',()=>{
 assert.equal(Score.TRACKS.length,17);assert.equal(new Set(Score.TRACKS.map(t=>t.id)).size,17);
 for(const kind of ['sector','boss'])assert.deepEqual(Score.TRACKS.filter(t=>t.kind===kind).map(t=>t.stage),[0,1,2,3,4,5]);
 for(const tr of Score.TRACKS){assert.ok(tr.name&&tr.bpm>=60&&tr.bpm<=160);assert.equal(tr.chords.length,8);assert.equal(tr.motif.length,16);}
});
test('all cues have distinct arrangement streams, not only changed labels',()=>{
 const hashes=Score.TRACKS.map(t=>digest(stream(t.id)));assert.equal(new Set(hashes).size,17);
});
test('repeated seeded arrangements match, later phrases can vary independently',()=>{
 const opts={seed:'AUDIO-REPLAY',intensity:.9};assert.equal(digest(stream('verdigris',opts)),digest(stream('verdigris',opts)));
 const variants=new Set(Array.from({length:16},(_,i)=>digest(stream('verdigris',{seed:'variation-'+i,intensity:.9}))));assert.ok(variants.size>=2);
});
test('music composition never reads Math.random or alters a run',()=>{
 const World=require('../src/expansion.js').Run,w=new World('READ-ONLY','standard',true),before=JSON.stringify(w),old=Math.random;
 Math.random=()=>{throw Error('Unseeded random access');};try{Score.resolve({screen:'game',world:w});Score.energy({world:w});stream('tidal',{seed:w.seed});}finally{Math.random=old;}
 assert.equal(JSON.stringify(w),before);
});
test('all generated notes are finite, bounded and have valid instrument parameters',()=>{
 for(const tr of Score.TRACKS)for(const options of [{intensity:0},{intensity:1},{ceasefire:true},{broken:true}])for(let i=0;i<512;i++){
  const events=Score.plan(tr.id,i,options);assert.ok(events.length<=14);
  for(const n of events){assert.ok(Number.isFinite(n.amp)&&n.amp>0&&n.amp<=.6);assert.ok(Number.isFinite(n.duration)&&n.duration>0&&n.duration<6);
   assert.ok(n.pan>=-1&&n.pan<=1);assert.ok(n.offset>=0&&n.offset<.1);if(n.hz!==undefined)assert.ok(Number.isFinite(n.hz)&&n.hz>=20&&n.hz<12000);}
 }
});
test('boss cues start on actual boss presence, not a wave number or title fixture',()=>{
 const base={stage:2,wave:2,enemies:[]};assert.equal(Score.resolve({screen:'game',world:base}),'crown');
 assert.equal(Score.resolve({screen:'game',world:{...base,enemies:[{type:'boss',hp:100,spawn:.8}]}}),'crown-boss');
 assert.equal(Score.resolve({screen:'game',world:{...base,enemies:[{type:'boss',hp:0}]}}),'crown');
 assert.equal(Score.resolve({screen:'menu',world:{...base,enemies:[{type:'boss',hp:1}]}}),'title');
});
test('music state resolver covers selection, results and paused overlays',()=>{
 for(const screen of ['hangar','loadout'])assert.equal(Score.resolve({screen}),'hangar');
 for(const screen of ['route','choices','ai-screen'])assert.equal(Score.resolve({screen}),'interlude');
 for(const screen of ['pause','settings-screen','help-screen','confirm-screen'])assert.equal(Score.resolve({screen}),null);
 assert.equal(Score.resolve({screen:'result',world:{phase:'won'}}),'victory');assert.equal(Score.resolve({screen:'result',world:{phase:'dead'}}),'defeat');
});
test('ceasefire removes rhythmic stems; adaptive intensity and fixed setting differ',()=>{
 const music=stream('roseglass-boss',{intensity:1}),quiet=stream('roseglass-boss',{intensity:1,ceasefire:true});
 assert.ok(music.flat().some(n=>n.inst==='kick'));assert.ok(!quiet.flat().some(n=>['kick','snare','hat','open-hat','tom','clap','bass','bass-drive'].includes(n.inst)));
 assert.notEqual(digest(stream('verdigris',{intensity:0})),digest(stream('verdigris',{intensity:1})));
 assert.equal(digest(stream('verdigris',{intensity:0,adaptive:false})),digest(stream('verdigris',{intensity:1,adaptive:false})));
});
test('32-bar form changes accompaniment and includes an eight-bar breakdown',()=>{
 const tr=Score.get('verdigris');const bar=b=>Array.from({length:16},(_,i)=>Score.plan(tr.id,b*16+i,{intensity:.7})).flat();
 assert.notEqual(digest(bar(0)),digest(bar(8)));assert.ok(bar(16).length<bar(0).length);assert.notEqual(digest(bar(24)),digest(bar(0)));
});
test('legacy sound-effect pitches and event cues are preserved exactly',()=>{
 const before=fs.readFileSync(path.join(__dirname,'fixtures/audio-v0.4.0.js'),'utf8'),after=fs.readFileSync(path.join(__dirname,'../src/audio.js'),'utf8');
 const effect=s=>s.match(/      switch\(type\)\{[\s\S]*?\n      \}/)[0];assert.equal(effect(after),effect(before));
});

class Param{constructor(value=0){this.value=value;this.calls=[];}setValueAtTime(v,t){this.value=v;this.calls.push(['set',v,t]);return this;}linearRampToValueAtTime(v,t){this.value=v;this.calls.push(['linear',v,t]);return this;}exponentialRampToValueAtTime(v,t){this.value=v;this.calls.push(['exp',v,t]);return this;}setTargetAtTime(v,t,k){this.value=v;this.calls.push(['target',v,t,k]);return this;}cancelScheduledValues(t){this.calls.push(['cancel',t]);return this;}}
class Node{constructor(){for(const k of ['gain','frequency','detune','Q','pan','delayTime','threshold','knee','ratio','attack','release'])this[k]=new Param();}connect(){return this;}disconnect(){this.disconnected=true;}start(t){this.startAt=t;}stop(t){this.stopAt=t;}}
class Context{constructor(){this.currentTime=0;this.state='running';this.sampleRate=24000;this.destination=new Node();this.sources=[];}
 createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createDelay(){return new Node();}createStereoPanner(){return new Node();}createBiquadFilter(){return new Node();}
 createBuffer(c,n){const data=new Float32Array(n);return{getChannelData:()=>data};}createOscillator(){const n=new Node();this.sources.push(n);return n;}createBufferSource(){return this.createOscillator();}
 advance(t){this.currentTime=t;for(const n of this.sources)if(n.stopAt<=t&&!n.ended){n.ended=true;n.onended?.();}}
 close(){this.state='closed';return Promise.resolve();}}

test('transport changes once per cue and crossfades with bounded retiring decks',()=>{
 const c=new Context(),s=new Sound({context:c,manual:true});s.tick({screen:'menu'});const serial=s.current.token;
 for(let i=0;i<50;i++)s.tick({screen:'menu'});assert.equal(s.current.token,serial);
 for(const id of Score.TRACKS.map(t=>t.id)){s.preview(id);assert.ok(s.retiring.length<=2);}
 assert.ok(s.status().voices<=128);s.destroy();assert.equal(s.timer,null);
});
test('pause, hidden page and mute stop future scheduling; resume skips no burst',()=>{
 const c=new Context(),s=new Sound({context:c,manual:true});s.tick({screen:'game',world:{seed:'T',stage:1,enemies:[]}});const n=s.scheduledNotes,step=s.current.step;
 s.tick({screen:'pause'});c.advance(3);s.pump();assert.equal(s.scheduledNotes,n);assert.equal(s.current.step,step);
 s.tick({screen:'game',world:{seed:'T',stage:1,enemies:[]}});assert.ok(s.current.step-step<=2);
 const paused=s.scheduledNotes;s.tick({screen:'game',hidden:true});c.advance(6);s.pump();assert.equal(s.scheduledNotes,paused);
 s.settings(.5,true,true);s.tick({screen:'game'});c.advance(8);s.pump();assert.equal(s.scheduledNotes,paused);s.destroy();
});
test('scheduler catches up by dropping missed ticks instead of spraying queued notes',()=>{
 const c=new Context(),s=new Sound({context:c,manual:true});s.tick({screen:'game',world:{seed:'T',stage:4,enemies:[]}});const before=s.scheduledNotes;
 c.advance(10);s.pump();assert.ok(s.skippedTicks>50);assert.ok(s.scheduledNotes-before<24);s.destroy();
});
test('music-off still allows sound effects and volume channels remain independent',()=>{
 const c=new Context(),s=new Sound({context:c,manual:true});s.settings(.5,false,false,0,.8,false);s.tick({screen:'game'});assert.equal(s.scheduledNotes,0);
 s.effect('dash');assert.ok(s.scheduledNotes>0);assert.equal(s.sfxGain.gain.value,.8);assert.equal(s.musicGain.gain.value,0);assert.equal(s.adaptive,false);s.destroy();
});
test('preview does not alter game state and stops when requested',()=>{
 const c=new Context(),s=new Sound({context:c,manual:true});s.tick({screen:'settings-screen'});assert.equal(s.preview('bad-id'),false);assert.equal(s.preview('tidal'),true);assert.equal(s.status().cue,'tidal');assert.ok(s.status().preview);
 s.stopPreview();assert.equal(s.status().preview,false);assert.equal(s.gate,false);s.destroy();
});
test('compiled HTML embeds soundtrack and independent mix controls without remote audio',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../dist/NEMESIS-PACT.html'),'utf8');for(const id of ['music-volume','sfx-volume','adaptive-music','music-track','music-preview'])assert.ok(html.includes(`id="${id}"`));assert.ok(html.includes('Before the First Signature'));assert.ok(html.includes('setInterval'));
 assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../src/audio.js'),'utf8'),/fetch\(|XMLHttpRequest|getUserMedia/);
});
