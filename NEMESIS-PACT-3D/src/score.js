/* NEMESIS PACT 0.4.1 — authored motifs + deterministic, local arrangements.
 * No samples, remote music service, LLM calls, or gameplay RNG consumption.
 * This module is pure: usable in the browser, Node tests and offline audio renders.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PactScore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const finite=(n,d=0)=>Number.isFinite(n)?n:d;
 const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
 const MODES={minor:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],harmonic:[0,2,3,5,7,8,11],major:[0,2,4,5,7,9,11],lydian:[0,2,4,6,7,9,11]};
 const degree=(n,scale)=>scale[((n%7)+7)%7]+12*Math.floor(n/7);
 const midiHz=m=>440*Math.pow(2,(m-69)/12);
 const profiles=[
  {id:'verdigris',name:'Verdigris Oath',sector:'Faded Signatures',bpm:112,root:38,mode:'dorian',chords:[0,5,3,4,0,2,5,4],motif:[0,2,4,6,4,2,1,4,3,2,0,-1,0,4,6,4],rhythm:[0,2,5,6,8,10,12,15],lead:'pluck',bass:'round',groove:'four',swing:0},
  {id:'foundry',name:'Foundry Pulse',sector:'Silent Cathedral',bpm:126,root:42,mode:'minor',chords:[0,0,5,4,0,3,5,4],motif:[0,0,4,3,0,6,4,1,0,2,3,4,6,4,3,1],rhythm:[0,3,6,8,9,12,14,15],lead:'metal',bass:'drive',groove:'broken',swing:.08},
  {id:'crown',name:'Crown of Dawn',sector:'Kingless Dawn',bpm:104,root:45,mode:'harmonic',chords:[0,3,5,4,0,5,3,4],motif:[0,4,6,7,6,4,2,1,3,5,7,6,4,2,1,0],rhythm:[0,3,6,8,11,14],lead:'bell',bass:'round',groove:'half',swing:0},
  {id:'tidal',name:'Tidal Memory',sector:'Tidal Archive',bpm:96,root:40,mode:'dorian',chords:[0,3,1,4,0,5,3,4],motif:[0,2,4,5,4,2,1,0,2,4,6,4,2,1,0,-1],rhythm:[0,3,6,10,12,15],lead:'keys',bass:'round',groove:'sync',swing:.12},
  {id:'roseglass',name:'Roseglass Run',sector:'Prism Orchard',bpm:138,root:36,mode:'minor',chords:[0,5,3,6,0,2,5,4],motif:[0,4,2,6,4,7,6,2,0,3,1,5,3,6,4,2],rhythm:[0,2,3,6,8,10,11,14],lead:'glass',bass:'drive',groove:'breaks',swing:.04},
  {id:'horizon',name:'Unwritten Horizon',sector:'The Unwritten Sky',bpm:118,root:35,mode:'minor',chords:[0,5,3,4,0,2,5,4],motif:[0,2,4,7,6,4,2,4,5,4,2,1,0,4,6,7],rhythm:[0,2,4,7,8,10,12,14],lead:'wide',bass:'drive',groove:'four',swing:0}
 ];
 const bossNames=['Final Clause','Dissonant Engine','Crownfall','Undertow','Threadbreaker','The Last Signature'];
 const bossOwners=['The Notary','The Choir','The Sovereign','The Leviathan','The Weaver','The Unwritten'];
 const bossBpm=[132,146,128,120,158,148];
 const tracks=[];
 const add=(p)=>{tracks.push({...p,boss:false,kind:'menu',bars:32,...p});};
 add({id:'title',name:'Before the First Signature',sector:'Main menu',bpm:76,root:38,mode:'minor',chords:[0,5,3,4,0,5,2,4],motif:[0,4,6,7,6,4,2,0,3,5,6,4,2,1,0,-1],rhythm:[0,6,10,14],lead:'bell',bass:'round',groove:'ambient',swing:0});
 add({id:'hangar',name:'Ready the Wings',sector:'Hangar / loadout',bpm:96,root:45,mode:'dorian',chords:[0,3,5,4,0,1,3,4],motif:[0,2,4,2,5,4,2,1,0,4,6,4,3,2,1,0],rhythm:[0,3,6,10,12],lead:'keys',bass:'round',groove:'soft',swing:.1});
 add({id:'interlude',name:'Terms in the Quiet',sector:'Pacts / route / intelligence',bpm:84,root:40,mode:'minor',chords:[0,3,1,4,0,5,3,4],motif:[0,4,2,6,4,2,1,0,3,6,4,2,1,0,-1,0],rhythm:[0,5,10,14],lead:'glass',bass:'round',groove:'ambient',swing:0});
 profiles.forEach((p,stage)=>{
  add({...p,stage,kind:'sector'});
  add({...p,id:p.id+'-boss',name:bossNames[stage],sector:bossOwners[stage],stage,kind:'boss',boss:true,bpm:bossBpm[stage],groove:stage===3?'half':stage===4?'breaks':'assault',
   chords:[0,0,5,4,0,3,6,4],motif:p.motif.map((n,i)=>i%4===3?n+1:n),rhythm:[0,2,3,5,6,8,10,11,12,14,15]});
 });
 add({id:'victory',name:'A Sky Unbound',sector:'Victory',bpm:102,root:36,mode:'lydian',chords:[0,3,4,0,5,3,4,0],motif:[0,2,4,7,6,4,5,7,7,6,4,2,3,4,6,7],rhythm:[0,2,6,8,10,14],lead:'wide',bass:'round',groove:'soft',swing:0});
 add({id:'defeat',name:'Ink in the Rain',sector:'Run lost',bpm:64,root:38,mode:'minor',chords:[0,5,3,4,0,3,5,0],motif:[7,6,4,2,4,2,1,0,6,4,3,1,2,1,0,-1],rhythm:[0,6,12],lead:'keys',bass:'round',groove:'ambient',swing:0});
 const TRACKS=Object.freeze(tracks.map(p=>Object.freeze({...p,chords:Object.freeze(p.chords),motif:Object.freeze(p.motif),rhythm:Object.freeze(p.rhythm)})));
 const lookup=new Map(TRACKS.map(t=>[t.id,t]));
 const get=id=>lookup.get(id)||lookup.get('title');
 const cues=profiles.map(p=>p.id);
 function resolve(state={}){
  const w=state.world,screen=state.screen||'menu';
  if(screen==='result')return w?.phase==='won'?'victory':'defeat';
  if(screen==='menu'||screen==='archive')return 'title';
  if(screen==='hangar'||screen==='loadout')return 'hangar';
  if(['route','choices','ai-screen'].includes(screen))return 'interlude';
  if(screen==='game'&&w){const stage=clamp(Math.trunc(finite(w.stage)),0,5);return cues[stage]+(w.enemies?.some(e=>e.type==='boss'&&e.hp>0)?'-boss':'');}
  // Overlay screens must not switch tracks or lose the musical phrase.
  if(['pause','settings-screen','help-screen','confirm-screen'].includes(screen))return null;
  return 'title';
 }
 function energy(state={}){const w=state.world;if(!w)return .20;if(w.training)return .25;
  const boss=w.enemies?.find(e=>e.type==='boss'&&e.hp>0),bullets=(w.bullets||[]).filter(b=>b.hostile).length;
  return clamp(.28+bullets/180+finite(w.combo)/100+(boss ? .20+clamp(finite(boss.phase)/2,0,1)*.22 : 0),0,1);
 }
 // Returns bounded note/percussion descriptors for one sixteenth-note tick.
 // A 32-bar A/B/breakdown/finale cycle avoids a four-bar loop becoming monotonous.
 function plan(id,step,options={}){
  const tr=get(id),s=Math.max(0,Math.trunc(finite(step))),bar=Math.floor(s/16),tick=s%16,section=Math.floor(bar/8)%4;
  const scale=MODES[tr.mode],root=tr.root+degree(tr.chords[bar%8],scale),beat=60/tr.bpm,unit=beat/4;
  const adaptive=options.adaptive!==false,intensity=adaptive?clamp(finite(options.intensity,.45),0,1):.58;
  const mode=tr.boss?'boss':tr.kind,calm=tr.groove==='ambient',breakdown=section===2&&!tr.boss;
  const spice=hash(String(options.seed||'NEMESIS')+'/'+tr.id+'/'+Math.floor(bar/8));
  const swing=tick%2?tr.swing*unit:0;
  const silence=!!options.ceasefire,out=[];
  const note=(inst,midi,duration,amp,pan=0,offset=swing)=>out.push({inst,midi,hz:midiHz(midi),duration:Math.max(.035,duration),amp,pan,offset});
  const drum=(inst,amp,pan=0)=>out.push({inst,amp,pan,duration:inst==='kick'?.25:.13,offset:swing});
  // Wide sustained harmony: the middle 8 bars use different voicings, not a random key.
  if(tick===0){const chordDegrees=[0,2,4];for(let j=0;j<3;j++)note('pad',tr.root+24+degree(tr.chords[bar%8]+chordDegrees[j]+(section===3&&j===2?7:0),scale),beat*3.9,.033+(calm?.012:0),[-.55,0,.55][j],0);}
  const bassSteps=calm?[0,8]:tr.groove==='half'?[0,6,10]:tr.groove==='sync'?[0,3,7,10,14]:tr.boss?[0,2,6,8,10,14]:[0,6,8,14];
  if(!silence&&bassSteps.includes(tick)&&(!breakdown||tick%8===0))note(tr.bass==='drive'?'bass-drive':'bass',root+(tick===14?7:0),beat*(calm?1.7:.40),calm?.11:.22,0,0);
  // Original motif, with A/B register and response variation seeded independently of gameplay.
  if(tr.rhythm.includes(tick)&&(!breakdown||tick%4===0)){
   const index=(bar%2)*8+tr.rhythm.indexOf(tick),degree0=tr.motif[index%16];
   const transpose=section===1&&bar%2===1?7:section===3?7:0;
   const m=tr.root+24+degree(degree0+transpose,scale);
   const octave=((spice>>>2)&1)&&section===1&&tick>=12?12:0;
   note(tr.lead,m+octave,beat*(calm?1.0:tr.lead==='keys'?.75:.55),calm?.10:tr.boss?.125:.115,Math.sin((tick+bar)*.7)*.24);
   if(tr.boss&&intensity>.55&&tick%4===2)note('pluck',m-12,beat*.25,.045,-.25);
  }
  // Explicit drum vocabulary: broken industrial beats, half-time sanctum, liquid syncopation.
  if(!calm&&!silence){
   const sets={four:[0,4,8,12],broken:[0,3,8,10],half:[0,10],sync:[0,7,10],breaks:[0,6,8,11],soft:[0,8],assault:[0,4,6,8,12,14]};
   const kick=sets[tr.groove]||sets.four;
   if(kick.includes(tick)&&(!breakdown||tick===0))drum('kick',tr.boss?.44:.36);
   if((tr.groove==='half'?tick===8:tick===4||tick===12)&&!breakdown){drum('snare',tr.boss?.18:.12);if(tr.groove==='breaks'&&intensity>.5)drum('clap',.08);}
   const dense=tr.boss||intensity>.62;
   if((tick%(dense?1:2)===0)&&(!breakdown||tick%4===0))drum(tick===14&&intensity>.45?'open-hat':'hat',(tick%4===2?.047:.032)*(breakdown?.55:1),tick%4<2?-.32:.32);
   if((tr.groove==='broken'||tr.groove==='breaks')&&[3,11,15].includes(tick)&&intensity>.45)note('metal',root+36+(tick%3)*7,.075,.035,tick%2?.5:-.5);
  }
  // A fill every eight bars; score never changes the game or calls out to a model.
  if(!calm&&!silence&&bar%8===7&&tick>=12&&intensity>.4){drum('tom',.13+(tick-12)*.018,(tick-13.5)*.15);}
  if(section===3&&!silence&&tick%4===2&&intensity>.5)note('bell',root+48+([0,7,12,7][Math.floor(tick/4)]),beat*.6,.033,(tick<8?-.6:.6));
  if(options.broken&&tick===0&&!calm)note('bass-drive',tr.root-12,.9*beat,.075,0,0);
  return out;
 }
 return {TRACKS,MODES,get,resolve,energy,plan,hash,midiHz,degree,clamp};
});
