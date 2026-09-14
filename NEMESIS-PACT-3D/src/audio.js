/* NEMESIS PACT 0.4.1 — local adaptive soundtrack and procedural effects.
 * AudioContext time owns the sequencer, independently of the graphics frame rate.
 * No recordings, downloads, microphone, remote provider or gameplay RNG are used.
 */
(function(root,factory){
  const Score=typeof module==='object'&&module.exports?require('./score.js'):root.PactScore;
  const Sound=factory(Score);if(typeof module==='object'&&module.exports)module.exports=Sound;else root.PactSound=Sound;
})(typeof globalThis!=='undefined'?globalThis:this,function(Score){'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const safe=(n,fallback)=>Number.isFinite(n)?n:fallback;
  const OVERLAYS=new Set(['pause','settings-screen','help-screen','confirm-screen']);
  class Sound {
    constructor(options={}){
      this.ctx=null;this.volume=.55;this.music=true;this.muted=false;this.musicVolume=.72;this.sfxVolume=1;this.adaptive=true;
      this.active=false;this.intensity=.3;this.lastShot=0;this.lastReflect=0;this.current=null;this.retiring=[];this.voices=new Set();
      this.state={screen:'menu',seed:'TITLE',cue:'title',hidden:false,ceasefire:false,broken:false,intensity:.2};
      this.previewId=null;this.savedCue='title';this.timer=null;this.disposed=false;this.errors=[];this.skippedTicks=0;this.scheduledNotes=0;
      this.offline=!!options.offline;this.manual=!!options.manual;this.gate=false;this.serial=0;this.lastSettings='';
      if(options.context)this.attach(options.context);
    }
    attach(context){
      if(this.ctx)return;this.ctx=context;
      const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.volume*.58;
      this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-4;this.limiter.knee.value=5;this.limiter.ratio.value=16;this.limiter.attack.value=.003;this.limiter.release.value=.16;
      this.master.connect(this.limiter);this.limiter.connect(c.destination);
      this.musicInput=c.createGain();this.musicGain=c.createGain();this.duck=c.createGain();this.sfxGain=c.createGain();
      this.musicGain.gain.value=0;this.sfxGain.gain.value=this.sfxVolume;this.musicInput.connect(this.musicGain);this.musicGain.connect(this.duck);this.duck.connect(this.master);this.sfxGain.connect(this.master);
      // Two short, filtered stereo echoes add space without an external impulse response.
      this.echoNodes=[];
      for(const [delay,pan] of [[.231,-.65],[.347,.65]]){
        const d=c.createDelay(1),filter=c.createBiquadFilter(),fb=c.createGain(),wet=c.createGain(),p=c.createStereoPanner();
        d.delayTime.value=delay;filter.type='lowpass';filter.frequency.value=2500;fb.gain.value=.20;wet.gain.value=.12;p.pan.value=pan;
        this.musicInput.connect(d);d.connect(filter);filter.connect(fb);fb.connect(d);filter.connect(wet);wet.connect(p);p.connect(this.musicGain);
        this.echoNodes.push(d,filter,fb,wet,p);
      }
      this.noiseBuffer=c.createBuffer(1,c.sampleRate,c.sampleRate);const noise=this.noiseBuffer.getChannelData(0);let seed=Score.hash('NEMESIS:NOISE:041');
      for(let i=0;i<noise.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;noise[i]=(seed>>>0)/2147483648-1;}
      this.settings(this.volume,this.music,this.muted,this.musicVolume,this.sfxVolume,this.adaptive);
    }
    unlock(){
      if(this.disposed)return;
      try{
        if(!this.ctx){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;this.attach(new Audio({latencyHint:'interactive'}));}
        if(this.ctx.state==='suspended')this.ctx.resume().then(()=>this.pump()).catch(e=>this.fail(e));
        if(!this.offline&&!this.manual&&!this.timer)this.timer=setInterval(()=>{try{this.pump();}catch(e){this.fail(e);}},25);
        this.pump();
      }catch(e){this.fail(e);}
    }
    fail(error){if(this.errors.length<8)this.errors.push(String(error?.message||error));}
    ramp(param,value,time=.035){if(!this.ctx)return;const now=this.ctx.currentTime;param.cancelScheduledValues(now);param.setTargetAtTime(value,now,time);}
    settings(volume,music,muted=false,musicVolume=this.musicVolume,sfxVolume=this.sfxVolume,adaptive=this.adaptive){
      this.volume=clamp(safe(volume,.55),0,1);this.music=!!music;this.muted=!!muted;
      this.musicVolume=clamp(safe(musicVolume,.72),0,1);this.sfxVolume=clamp(safe(sfxVolume,1),0,1);this.adaptive=adaptive!==false;
      if(this.ctx){this.ramp(this.master.gain,this.muted?0:this.volume*.58);this.ramp(this.sfxGain.gain,this.sfxVolume);this.ramp(this.musicGain.gain,this.shouldPlay()?this.musicVolume*.75:0);}
    }
    shouldPlay(){return !this.disposed&&this.music&&!this.muted&&!this.state.hidden&&(!!this.previewId||!OVERLAYS.has(this.state.screen));}
    tick(state={},legacyIntensity=0){
      // The legacy signature remains available for external test/dev integrations.
      if(typeof state==='boolean')state={screen:state?'game':'pause',world:{stage:0,bullets:[],enemies:[],training:false},intensity:legacyIntensity};
      const cue=Score.resolve(state),w=state.world;
      this.state={screen:state.screen||'menu',cue:cue||this.state.cue||'title',seed:w?String(w.seed||'NEMESIS'):'TITLE',hidden:!!state.hidden,
        intensity:safe(state.intensity,Score.energy(state)),ceasefire:!!w?.ceasefire,broken:!!w?.broken};
      this.active=this.shouldPlay();if(this.ctx)this.pump();
    }
    preview(id){if(!Score.TRACKS.some(t=>t.id===id))return false;if(!this.previewId)this.savedCue=this.state.cue;this.previewId=id;this.unlock();this.pump();return true;}
    stopPreview(){if(!this.previewId)return;this.previewId=null;this.state.cue=this.savedCue||this.state.cue;this.pump();}
    makeDeck(id,seed,when){const gain=this.ctx.createGain();gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(1,when+.45);gain.connect(this.musicInput);
      return {id,seed,token:++this.serial,gain,epoch:when,next:when,step:0,end:Infinity};}
    switchDeck(id,seed,now){
      if(this.current?.id===id&&this.current.seed===seed)return;
      // Align an uninterrupted track change to the next beat, capped at 450ms.
      let at=now+.025;
      if(this.current&&this.gate){const beat=60/Score.get(this.current.id).bpm;at=Math.min(now+.45,this.current.epoch+Math.ceil((now+.025-this.current.epoch)/beat)*beat);}
      if(this.current){const old=this.current;old.end=at+.5;old.gain.gain.cancelScheduledValues(now);old.gain.gain.setValueAtTime(1,now);old.gain.gain.setValueAtTime(1,at);old.gain.gain.linearRampToValueAtTime(0,old.end);this.retiring.push(old);}
      while(this.retiring.length>2)this.retire(this.retiring.shift(),now);
      this.current=this.makeDeck(id,seed,at);
    }
    retire(deck,at){
      if(!deck)return;
      for(const voice of this.voices)if(voice.deck===deck.token)for(const source of voice.sources){try{source.stop(Math.max(this.ctx.currentTime,at));}catch{}}
      try{deck.gain.disconnect();}catch{}
    }
    pump(){
      if(!this.ctx||this.disposed||this.ctx.state==='closed')return;
      const c=this.ctx,now=c.currentTime;
      this.retiring=this.retiring.filter(deck=>{if(deck.end<=now){this.retire(deck,now);return false;}return true;});
      const enabled=this.shouldPlay();
      if(enabled!==this.gate){this.gate=enabled;this.ramp(this.musicGain.gain,enabled?this.musicVolume*.75:0,.025);if(enabled&&this.current)this.current.next=Math.max(this.current.next,now+.025);}
      if(!enabled||c.state==='suspended')return;
      this.switchDeck(this.previewId||this.state.cue,this.previewId?'PREVIEW':this.state.seed,now);
      const deck=this.current,tr=Score.get(deck.id),unit=60/tr.bpm/4;
      if(deck.next<now-.08){const missed=Math.ceil((now-deck.next)/unit);deck.step+=missed;this.skippedTicks+=missed;deck.next=now+.015;}
      this.intensity+=(this.state.intensity-this.intensity)*.10;
      let budget=12;
      while(deck.next<now+.115&&budget-->0){
        const options={seed:deck.seed,intensity:this.previewId ? .65 : this.intensity,adaptive:this.adaptive,
          ceasefire:!this.previewId&&this.state.ceasefire,broken:!this.previewId&&this.state.broken};
        for(const note of Score.plan(deck.id,deck.step,options))this.synth(note,deck.next+note.offset,deck);
        deck.step++;deck.next+=unit;
      }
    }
    canVoice(category){if(!this.ctx||this.disposed||this.muted)return false;if(this.offline)return true;
      let count=0;for(const v of this.voices)if(v.category===category)count++;
      return count<(category==='sfx'?48:128);
    }
    voice(sources,nodes,when,duration,category,deck=null){
      const record={sources,nodes,category,deck:deck?.token,end:when+duration};this.voices.add(record);let remaining=sources.length;
      const release=()=>{if(--remaining>0)return;for(const node of [...sources,...nodes])try{node.disconnect();}catch{}this.voices.delete(record);};
      for(const s of sources){s.onended=release;s.start(when);s.stop(when+duration+.01);}this.scheduledNotes++;
    }
    tone(freq,duration=.12,type='sine',vol=.15,when=null,to=null){
      if(!this.canVoice('sfx'))return;const c=this.ctx,t=Math.max(c.currentTime,when===null?c.currentTime:when),o=c.createOscillator(),g=c.createGain();
      o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(Math.max(to,20),t+duration);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(vol,.001),t+.007);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
      o.connect(g);g.connect(this.sfxGain);this.voice([o],[g],t,duration,'sfx');
    }
    noise(duration=.1,vol=.1,hz=2000,when=null){
      if(!this.canVoice('sfx'))return;const c=this.ctx,t=Math.max(c.currentTime,when===null?c.currentTime:when),s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();
      s.buffer=this.noiseBuffer;f.type='highpass';f.frequency.value=hz;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(this.sfxGain);this.voice([s],[f,g],t,duration,'sfx');
    }
    synth(note,when,deck){
      if(!this.canVoice('music'))return;const c=this.ctx,t=Math.max(c.currentTime,when),duration=clamp(note.duration,.035,6),amp=clamp(note.amp,0,.6),f0=clamp(note.hz||110,22,c.sampleRate*.16);
      const env=c.createGain(),p=c.createStereoPanner(),filter=c.createBiquadFilter(),sources=[],nodes=[env,p,filter];
      p.pan.value=clamp(note.pan||0,-1,1);filter.type='lowpass';filter.frequency.value=4500;filter.Q.value=.5;
      filter.connect(env);env.connect(p);p.connect(deck.gain);
      let attack=.008,decay=duration,peak=amp;
      const osc=(type,freq,level=1,detune=0,endFreq=null)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(Math.min(freq,c.sampleRate*.45),t);o.detune.value=detune;g.gain.value=level;if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+duration);o.connect(g);g.connect(filter);sources.push(o);nodes.push(g);};
      const noise=()=>{const s=c.createBufferSource();s.buffer=this.noiseBuffer;s.loop=duration>1;s.connect(filter);sources.push(s);};
      switch(note.inst){
        case 'pad':attack=Math.min(.25,duration*.15);osc('triangle',f0,.58,-4);osc('triangle',f0,.42,4);filter.frequency.value=1250;break;
        case 'bass':osc('sine',f0,.82);osc('triangle',f0,.18);filter.frequency.value=800;break;
        case 'bass-drive':osc('sawtooth',f0,.32);osc('sine',f0,.75);filter.frequency.setValueAtTime(1250,t);filter.frequency.exponentialRampToValueAtTime(240,t+duration);break;
        case 'pluck':osc('triangle',f0,.82);osc('sine',f0*2,.18);filter.frequency.setValueAtTime(6000,t);filter.frequency.exponentialRampToValueAtTime(700,t+duration);break;
        case 'metal':osc('sine',f0,.72);osc('sine',f0*2.76,.19);osc('sine',f0*4.13,.09);filter.frequency.value=7000;break;
        case 'bell':osc('sine',f0,.76);osc('sine',f0*2,.16);osc('sine',f0*2.99,.08);filter.frequency.value=7500;break;
        case 'keys':osc('sine',f0,.72);osc('triangle',f0,.22);osc('sine',f0*3,.06);filter.frequency.value=3400;attack=.012;break;
        case 'glass':osc('sine',f0,.8);osc('sine',f0*3.005,.15);osc('sine',f0*7,.05);filter.frequency.value=8200;break;
        case 'wide':osc('sawtooth',f0,.23,-5);osc('triangle',f0,.6,5);filter.frequency.value=2300;attack=.023;break;
        case 'kick':osc('sine',145,1,0,43);filter.frequency.value=650;attack=.004;break;
        case 'snare':noise();osc('triangle',168,.25,0,105);filter.type='highpass';filter.frequency.value=850;attack=.004;break;
        case 'clap':noise();filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.6;attack=.007;break;
        case 'hat':noise();filter.type='highpass';filter.frequency.value=6500;decay=.042;attack=.002;break;
        case 'open-hat':noise();filter.type='highpass';filter.frequency.value=5300;decay=.19;attack=.002;break;
        case 'tom':osc('sine',145+(note.pan||0)*65,1,0,65);filter.frequency.value=950;attack=.004;break;
        default:osc('sine',f0);
      }
      env.gain.setValueAtTime(.0001,t);env.gain.exponentialRampToValueAtTime(Math.max(.001,peak),t+attack);
      if(note.inst==='pad'){env.gain.setValueAtTime(peak*.82,t+duration*.66);env.gain.exponentialRampToValueAtTime(.0001,t+duration);}
      else env.gain.exponentialRampToValueAtTime(.0001,t+Math.max(attack+.01,decay));
      this.voice(sources,nodes,t,Math.max(duration,decay),'music',deck);
    }
    duckMusic(amount=.68){if(!this.ctx)return;const now=this.ctx.currentTime,g=this.duck.gain;g.cancelScheduledValues(now);g.setTargetAtTime(amount,now,.015);g.setTargetAtTime(1,now+.12,.09);}
    effect(type,extra={}){
      if(!this.ctx)return;const t=this.ctx.currentTime;
      if(['reflect','hurt','nova','breach'].includes(type))this.duckMusic(type==='nova'||type==='breach'?.5:.72);
      switch(type){
        case 'shoot':if(t-this.lastShot>.065){this.lastShot=t;this.tone(420,.055,'triangle',.055,null,170);}break;
        case 'dash':this.noise(.14,.13,900);this.tone(240,.15,'sine',.18,null,75);break;
        case 'parry-start':this.tone(320,.11,'sine',.11,null,700);break;
        case 'reflect':if(t-this.lastReflect>.06){this.lastReflect=t;this.tone(extra.perfect?1244:830,.22,'sine',.25);this.tone(1661,.12,'triangle',.08);this.noise(.055,.06,4000);}break;
        case 'hurt':this.noise(.25,.5,80);this.tone(140,.3,'sawtooth',.25,null,40);break;
        case 'kill':this.noise(extra.kind==='boss'?.5:.14,extra.kind==='boss'?.5:.16,extra.kind==='boss'?50:300);this.tone(95,.16,'triangle',.17,null,28);break;
        case 'nova':case 'breach':this.noise(.45,.6,40);this.tone(65,.65,'sine',.7,null,22);[220,330,440].forEach((f,i)=>this.tone(f,.6,'triangle',.12,t+i*.06,70));break;
        case 'heal':this.tone(659,.18,'sine',.2);this.tone(988,.25,'sine',.17,t+.1);break;
        case 'signed':case 'upgrade':[220,330,440,660].forEach((f,i)=>this.tone(f,.4,'triangle',.17,t+i*.07));break;
        case 'laser':this.noise(.18,.16,1700);this.tone(110,.3,'sawtooth',.08,null,55);break;
        case 'victory':[261,329,392,523,659,784].forEach((f,i)=>this.tone(f,.9,'triangle',.18,t+i*.14));break;
        case 'death':[220,196,164,110].forEach((f,i)=>this.tone(f,.8,'triangle',.15,t+i*.2));break;
      }
    }
    status(){const tr=Score.get(this.current?.id||this.previewId||this.state.cue);return {cue:tr.id,name:tr.name,bpm:tr.bpm,bar:Math.floor((this.current?.step||0)/16)%32+1,
      section:['A','B','BREAKDOWN','FINALE'][Math.floor((this.current?.step||0)/128)%4],preview:!!this.previewId,playing:!!this.ctx&&this.shouldPlay()&&this.ctx.state==='running',
      voices:this.voices.size,retiring:this.retiring.length,scheduledNotes:this.scheduledNotes,skippedTicks:this.skippedTicks,errors:[...this.errors]};}
    destroy(){if(this.timer){clearInterval(this.timer);this.timer=null;}if(this.ctx){for(const v of this.voices)for(const s of v.sources)try{s.stop();}catch{}this.voices.clear();
      for(const n of [this.current?.gain,...this.retiring.map(d=>d.gain),...this.echoNodes,this.musicInput,this.musicGain,this.sfxGain,this.duck,this.master,this.limiter])try{n?.disconnect();}catch{}
      if(!this.offline&&this.ctx.state!=='closed')this.ctx.close().catch(()=>{});}
      this.disposed=true;this.current=null;this.retiring=[];}
    static async renderOffline(id,seconds=8,options={}){
      const OC=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;if(!OC)throw Error('OfflineAudioContext is unavailable');
      const sampleRate=options.sampleRate||24000,duration=clamp(safe(seconds,8),.5,120),c=new OC(2,Math.ceil((duration+.65)*sampleRate),sampleRate);
      const sound=new Sound({context:c,offline:true,manual:true});sound.master.gain.cancelScheduledValues(0);sound.master.gain.setValueAtTime(.58,0);sound.musicGain.gain.cancelScheduledValues(0);sound.musicGain.gain.setValueAtTime(.75*(options.volume??.72),0);
      const deck=sound.makeDeck(id,options.seed||'PREVIEW',0),tr=Score.get(id),unit=60/tr.bpm/4;
      for(let step=0;step*unit<duration;step++)for(const n of Score.plan(id,step,{intensity:.7,...options}))sound.synth(n,step*unit+n.offset,deck);
      deck.gain.gain.setValueAtTime(1,duration-.12);deck.gain.gain.linearRampToValueAtTime(0,duration+.38);
      const buffer=await c.startRendering();sound.destroy();return buffer;
    }
  }
  return Sound;
});
