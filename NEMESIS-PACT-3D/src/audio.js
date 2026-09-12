/* Procedural score and effects. No media files, requests, libraries or models. */
(function(){'use strict';
  class Sound {
    constructor(){this.ctx=null;this.volume=.55;this.music=true;this.muted=false;this.active=false;this.intensity=0;this.step=0;this.next=0;this.lastShot=0;this.lastReflect=0;}
    unlock(){
      try{if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);this.master.gain.value=this.volume*.38;this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate*.5,this.ctx.sampleRate);const a=this.noiseBuffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;this.next=this.ctx.currentTime;}
        if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
      }catch(_){this.ctx=null;}
    }
    settings(volume,music,muted=false){this.volume=volume;this.music=music;this.muted=muted;if(this.master&&this.ctx)this.master.gain.setTargetAtTime(muted?0:volume*.38,this.ctx.currentTime,.04);}
    tone(freq,duration=.12,type='sine',vol=.15,when=null,to=null){
      if(!this.ctx||this.muted)return;const t=when===null?this.ctx.currentTime:when,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(Math.max(to,20),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(vol,.001),t+.007);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    noise(duration=.1,vol=.1,hz=2000,when=null){if(!this.ctx||this.muted)return;const t=when===null?this.ctx.currentTime:when,s=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();s.buffer=this.noiseBuffer;f.type='highpass';f.frequency.value=hz;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
    effect(type,extra={}){
      if(!this.ctx)return;const t=this.ctx.currentTime;
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
    tick(active,intensity){
      if(!this.ctx)return;this.active=active;this.intensity=intensity;
      const now=this.ctx.currentTime;if(!active||!this.music||this.muted){this.next=now+.1;return;}
      if(this.next<now-.2)this.next=now;
      // A look-ahead sequencer driven by the animation loop; pauses with the game.
      const beat=60/116/4;
      while(this.next<now+.09){const s=this.step++%64,t=this.next;this.next+=beat;
        const roots=[55,65.406,48.999,43.654],root=roots[Math.floor(s/16)];
        if(s%4===0){this.tone(135,.2,'sine',.38,t,38);this.noise(.028,.10,6000,t);}
        if(s%8===4){this.noise(.11,.15,1700,t);this.tone(170,.09,'triangle',.1,t,80);}
        if(s%2===0)this.noise(.035,.035+(s%4===2?.02:0),6000,t);
        if(s%4===0||s%8===6)this.tone(root*(s%8===6?2:1),.19,'triangle',.22,t);
        const arp=[0,7,12,15,19,12,7,3],note=root*4*Math.pow(2,arp[Math.floor(s/2)%8]/12);
        if(s%2===0)this.tone(note,.23,'sine',.045+intensity*.035,t);
        if(intensity>.6&&s%4===1)this.tone(note*2,.13,'triangle',.038,t);
        if(s%16===0)[1,1.4983,2.3784].forEach(r=>this.tone(root*r*2,1.5,'sine',.055,t));
      }
    }
  }
  window.PactSound=Sound;
})();
