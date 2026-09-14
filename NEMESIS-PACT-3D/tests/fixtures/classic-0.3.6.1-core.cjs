/* NEMESIS PACT — deterministic, dependency-free game simulation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PactCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const W = 1280, H = 800, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const angle = (a,b) => Math.atan2(b.y-a.y,b.x-a.x);
  function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0),16777619); return h >>> 0; }
  function rng(seed) { let a = hash(seed); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15,1 | a); t = t + Math.imul(t ^ t >>> 7,61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function segmentHit(x1,y1,x2,y2,cx,cy,r) {
    const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy;
    const t=l ? clamp(((cx-x1)*dx+(cy-y1)*dy)/l,0,1) : 0;
    return (x1+t*dx-cx)**2+(y1+t*dy-cy)**2 <= r*r;
  }
  const CONTRACTS = [
  {
    "id": "mercy",
    "name": "Slow Violence",
    "en": "SLOW VIOLENCE",
    "label": "BULLET CONTROL",
    "icon": "◷",
    "line": "“Slow your bullets. Send as many as you like.”",
    "gift": "Enemy bullet speed −30%",
    "cost": "About 40% more enemy bullets",
    "tip": "Read the gaps, not the density.",
    "hud": "Bullet speed −30%",
    "color": "#78e8d0"
  },
  {
    "id": "mirror",
    "name": "Return to Sender",
    "en": "RETURN TO SENDER",
    "label": "REFLECTION",
    "icon": "◇",
    "line": "“Your own bullets will end you.”",
    "gift": "Reflected damage ×2.2",
    "cost": "Normal shot damage −25%",
    "tip": "Press E or right-click to return fire.",
    "hud": "Reflected damage ×2.2",
    "color": "#78dafa"
  },
  {
    "id": "glass",
    "name": "Glass Covenant",
    "en": "GLASS COVENANT",
    "label": "HIGH RISK",
    "icon": "△",
    "line": "“Drop your armor. I will drop mine.”",
    "gift": "All enemy hull −30%",
    "cost": "You take double damage",
    "tip": "End it quickly. Trust your evasive skills.",
    "hud": "Enemy hull −30%",
    "color": "#ffbf77"
  },
  {
    "id": "silence",
    "name": "Ceasefire",
    "en": "CEASEFIRE",
    "label": "TIME CONTROL",
    "icon": "Ⅱ",
    "line": "“Every five seconds, silence the world.”",
    "gift": "Bullets stop for 1.3s every 5s",
    "cost": "You cannot fire during the pause",
    "tip": "You can still move, parry and dash.",
    "hud": "1.3s pause every 5s",
    "color": "#c8afff"
  },
  {
    "id": "duel",
    "name": "No Witnesses",
    "en": "NO WITNESSES",
    "label": "BOSS DUEL",
    "icon": "⌖",
    "line": "“No reinforcements. Just you and me.”",
    "gift": "Bosses summon no reinforcements",
    "cost": "Boss attack rate +25%",
    "tip": "One opponent. Your undivided attention.",
    "hud": "No reinforcements",
    "color": "#f69fa9"
  },
  {
    "id": "sanctuary",
    "name": "Sacred Ground",
    "en": "SACRED GROUND",
    "label": "SAFE ZONE",
    "icon": "◎",
    "line": "“Leave the circle at the center untouched.”",
    "gift": "Center circle erases enemy bullets",
    "cost": "Normal shot damage −22%",
    "tip": "Lasers and enemy bodies can still hit you.",
    "hud": "Center erases bullets",
    "color": "#97df9a"
  },
  {
    "id": "velocity",
    "name": "Fast & Fearless",
    "en": "FAST & FEARLESS",
    "label": "MOBILITY",
    "icon": "↯",
    "line": "“Shoot faster. I will move faster still.”",
    "gift": "Dash cooldown −45%",
    "cost": "Enemy bullet speed +30%",
    "tip": "Dash through bullets and lasers unharmed.",
    "hud": "Dash cooldown −45%",
    "color": "#f5dc79"
  }
];
  const UPGRADES = [
  {
    "id": "scatter",
    "name": "Trident",
    "en": "TRIDENT",
    "label": "SPREAD",
    "icon": "⋔",
    "desc": "Add 2 projectiles per shot. Damage per projectile −18%.",
    "tag": "Spread build",
    "max": 2
  },
  {
    "id": "rapid",
    "name": "Overclock",
    "en": "OVERCLOCK",
    "label": "FIREPOWER",
    "icon": "ϟ",
    "desc": "Time between shots −18%.",
    "tag": "Firepower",
    "max": 3
  },
  {
    "id": "rail",
    "name": "Phase Rail",
    "en": "PHASE RAIL",
    "label": "PIERCING",
    "icon": "⟶",
    "desc": "Shots pierce 2 more enemies. Shot damage +20%.",
    "tag": "Piercing build",
    "max": 2
  },
  {
    "id": "echo",
    "name": "Echo Wing",
    "en": "ECHO WING",
    "label": "AFTERIMAGE",
    "icon": "◈",
    "desc": "An armed echo follows your past flight path.",
    "tag": "Echo build",
    "max": 2
  },
  {
    "id": "parry",
    "name": "Mirror Engine",
    "en": "MIRROR ENGINE",
    "label": "REFLECTION",
    "icon": "◇",
    "desc": "Parry window +0.08s. Parry cooldown −22%.",
    "tag": "Reflection build",
    "max": 2
  },
  {
    "id": "razor",
    "name": "Razor Drive",
    "en": "RAZOR DRIVE",
    "label": "DASH ATTACK",
    "icon": "╱",
    "desc": "Dashing into an enemy deals 90 damage.",
    "tag": "Dash build",
    "max": 2
  },
  {
    "id": "orbit",
    "name": "Orbital",
    "en": "ORBITAL",
    "label": "SUPPORT",
    "icon": "◎",
    "desc": "A satellite circles your ship and fires at enemies.",
    "tag": "Satellite build",
    "max": 3
  },
  {
    "id": "magnet",
    "name": "Danger Magnet",
    "en": "DANGER MAGNET",
    "label": "ENERGY",
    "icon": "⊕",
    "desc": "Graze radius +14. Energy gain +35%.",
    "tag": "Nova build",
    "max": 2
  },
  {
    "id": "hull",
    "name": "Second Heart",
    "en": "SECOND HEART",
    "label": "SURVIVAL",
    "icon": "♥",
    "desc": "Maximum hull +2. Restore 3 hull.",
    "tag": "Survival",
    "max": 2
  },
  {
    "id": "leech",
    "name": "Regenerator",
    "en": "REGENERATOR",
    "label": "SURVIVAL",
    "icon": "✚",
    "desc": "Restore 1 hull for every 12 enemies destroyed.",
    "tag": "Survival",
    "max": 1
  },
  {
    "id": "homing",
    "name": "Seeker",
    "en": "SEEKER",
    "label": "HOMING",
    "icon": "⌁",
    "desc": "Shots gently home in on enemies. Shot damage +10%.",
    "tag": "Homing build",
    "max": 1
  },
  {
    "id": "nova",
    "name": "Supernova",
    "en": "SUPERNOVA",
    "label": "ENERGY BURST",
    "icon": "✳",
    "desc": "Nova damage +70%. Energy cost −20.",
    "tag": "Nova build",
    "max": 2
  },
  {
    "id": "repair",
    "name": "Field Repair",
    "en": "FIELD REPAIR",
    "label": "RECOVERY",
    "icon": "+",
    "desc": "Fully restore your hull instead of taking an upgrade.",
    "tag": "Recovery",
    "max": 99
  }
];
  const BOSSES = [
  {
    "name": "THE NOTARY",
    "subtitle": "Enforcer of the Pact",
    "quote": "“Every promise has a price.”",
    "color": "#ff746c",
    "hp": 2400
  },
  {
    "name": "THE CHOIR",
    "subtitle": "The Silent Choir",
    "quote": "“In the silence, I will hear your heartbeat.”",
    "color": "#bb9dff",
    "hp": 3600
  },
  {
    "name": "THE SOVEREIGN",
    "subtitle": "The Last King",
    "quote": "“The world is a pact. What will you keep?”",
    "color": "#ffd27a",
    "hp": 5100
  }
];
  const SECTORS = [
  "Faded Signatures",
  "Silent Cathedral",
  "Kingless Dawn"
];
  function modifiers(id,broken=false) {
    const m={speed:1,hp:1,damage:1,gun:1,reflect:1,dash:1,extra:false,silence:false,sanctuary:false,noAdds:false,bossRate:1,enemyRate:broken?1.25:1};
    if(broken) return m;
    switch(id){
      case 'mercy': m.speed=.7;m.extra=true;break;
      case 'mirror':m.reflect=2.2;m.gun=.75;break;
      case 'glass':m.hp=.7;m.damage=2;break;
      case 'silence':m.silence=true;break;
      case 'duel':m.noAdds=true;m.bossRate=1.25;break;
      case 'sanctuary':m.sanctuary=true;m.gun=.78;break;
      case 'velocity':m.dash=.55;m.speed=1.3;break;
    }
    return m;
  }
  class World {
    constructor(seed='NEMESIS',difficulty='standard',training=false,viewport={}) {
      // Geometry is chosen once per run. Resizing the browser never teleports
      // entities or changes an in-flight bullet's velocity / collision radius.
      this.layout=viewport.layout==='portrait'?'portrait':'desktop';
      this.width=this.layout==='portrait'?720:1280;
      this.height=this.layout==='portrait'?Math.round(clamp(Number(viewport.height)||1024,520,1440)):800;
      const W=this.width,H=this.height;
      this.bounds={left:36,right:W-36,top:this.layout==='portrait'?36:112,bottom:H-(this.layout==='portrait'?36:105)};
      this.bossY=this.layout==='portrait'?Math.max(160,H*.22):235;
      this.motionScale=this.layout==='portrait'?.86:1;

      this.seed=String(seed).slice(0,48);this.random=rng(this.seed);this.difficulty=['assist','standard','veteran'].includes(difficulty)?difficulty:'standard';
      this.training=training;this.stage=0;this.wave=0;this.phase='pact';this.time=0;this.waveTime=0;this.score=0;this.combo=0;this.comboTimer=0;
      this.kills=0;this.parries=0;this.grazes=0;this.damageTaken=0;this.breaches=0;this.bossKills=0;this.contracts=[];this.upgrades={};this.log=[];this.events=[];
      this.enemies=[];this.bullets=[];this.lasers=[];this.history=[];this.orbitClock=0;this.nextId=1;this.pact=null;this.broken=false;this.ceasefire=false;
      this.p={x:W/2,y:this.layout==='portrait'?H*.75:H*.69,vx:0,vy:0,angle:-Math.PI/2,hp:this.difficulty==='assist'?10:7,maxHp:this.difficulty==='assist'?10:7,r:5,
        inv:0,fire:0,dash:0,dashCd:0,parry:0,parryCd:0,parryAge:0,energy:35,dashAngle:0};
      this.mods=modifiers(null);this.clearClock=0;this.offers=[];this.wavePlan=[];this.planIndex=0;
      this.diffSpeed=this.difficulty==='assist'?.77:this.difficulty==='veteran'?1.18:1;
      this.diffHp=this.difficulty==='veteran'?1.25:1;
      if(training){this.phase='combat';this.spawn('turret',W/2,this.layout==='portrait'?this.bossY:210);this.enemies[0].hp=this.enemies[0].maxHp=999999;}
    }
    emit(type,data={}){this.events.push({type,...data});if(['signed','breach','upgrade','boss','victory','death','wave'].includes(type))this.log.push({t:+this.time.toFixed(2),type,...data});}
    takeEvents(){return this.events.splice(0);}
    offersForPact(){const sets=[['mercy','mirror','glass'],['silence','sanctuary','duel'],['velocity','mirror','silence']];return sets[this.stage].map(id=>CONTRACTS.find(c=>c.id===id));}
    sign(id){
      if(this.phase!=='pact'||!this.offersForPact().some(c=>c.id===id))return false;
      this.pact=id;this.broken=false;this.mods=modifiers(id);this.contracts.push({stage:this.stage,id,kept:true});
      this.emit('signed',{id,stage:this.stage});this.startWave();return true;
    }
    startWave(){
      const W=this.width,H=this.height,portrait=this.layout==='portrait';
      this.phase='combat';this.waveTime=0;this.clearClock=0;this.bullets=[];this.lasers=[];this.enemies=[];this.history=[];this.planIndex=0;this.ceasefire=false;
      this.p.x=W/2;this.p.y=H*(portrait?.76:.7);this.p.vx=this.p.vy=0;this.p.inv=1.8;this.p.dash=0;this.p.parry=0;this.p.fire=.25;
      if(this.wave===2){this.wavePlan=[];this.spawn('boss',W/2,portrait?this.bossY:230);this.emit('boss',{stage:this.stage});}
      else{
        const count=12+this.stage*6+this.wave*6,planRandom=rng(this.seed+'/wave/'+this.stage+'/'+this.wave);
        this.wavePlan=Array.from({length:count},(_,i)=>{
          const pool=this.stage===0?['chaser','chaser','turret','spinner']:['chaser','turret','spinner','lancer','warden'];
          const type=pool[Math.floor(planRandom()*pool.length)];
          const a=planRandom()*TAU;let x=clamp(W/2+Math.cos(a)*540,70,W-70),y=clamp(H/2+Math.sin(a)*300,120,H-140);
          if(i===0){x=360;y=170;}if(i===1){x=920;y=180;}
          if(portrait){
            x=clamp(W/2+Math.cos(a)*(W*.39),75,W-75);
            y=clamp(H/2+Math.sin(a)*(H*.37),100,H-90);
            if(i===0){x=W*.28;y=this.bossY;}if(i===1){x=W*.72;y=this.bossY+15;}
          }
          return {at:1.0+i*(this.wave?1.05:1.3),type,x,y};
        });
      }
      this.emit('wave',{stage:this.stage,wave:this.wave});
    }
    chooseUpgrade(id){
      if(this.phase!=='upgrade'||!this.offers.some(u=>u.id===id))return false;
      this.upgrades[id]=(this.upgrades[id]||0)+1;
      if(id==='hull'){this.p.maxHp+=2;this.p.hp=Math.min(this.p.maxHp,this.p.hp+3);}
      if(id==='repair')this.p.hp=this.p.maxHp;
      this.emit('upgrade',{id});this.wave++;this.startWave();return true;
    }
    offerUpgrade(){
      this.phase='upgrade';this.bullets=[];this.lasers=[];
      const offerRandom=rng(this.seed+'/upgrade/'+this.stage+'/'+this.wave);
      const pool=UPGRADES.filter(u=>(this.upgrades[u.id]||0)<u.max&&u.id!=='repair');
      this.offers=[];while(this.offers.length<3&&pool.length){const idx=Math.floor(offerRandom()*pool.length);this.offers.push(pool.splice(idx,1)[0]);}
      if(this.p.hp<=this.p.maxHp*.55)this.offers[Math.min(2,this.offers.length)]=UPGRADES.find(u=>u.id==='repair');
    }
    spawn(type,x,y){
      if(this.enemies.length>=56)return;
      const hp=type==='boss'?BOSSES[this.stage].hp:({chaser:30,turret:58,spinner:78,lancer:54,warden:130}[type]||30);
      const e={id:this.nextId++,type,x,y,px:x,py:y,vx:0,vy:0,r:type==='boss'?54:type==='warden'?24:18,
        hp:hp*this.mods.hp*this.diffHp,maxHp:hp*this.mods.hp*this.diffHp,age:0,fire:1.1+this.random(),special:2.6,
        rot:this.random()*TAU,phase:0,hit:0,spawn:.8,stun:0,dashHit:false,charge:0,tx:0,ty:0};
      this.enemies.push(e);this.emit('spawn',{x,y,boss:type==='boss'});return e;
    }
    bullet(x,y,a,speed,hostile=true,extra={}){
      if(this.bullets.length>=1100)return;
      const sp=speed*(hostile?this.mods.speed*this.diffSpeed*this.motionScale:1);
      const b={id:this.nextId++,x,y,px:x,py:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:hostile?5:3.2,
        hostile,damage:10,pierce:0,hitIds:[],life:hostile?9:2.1,grazed:false,reflected:false,shape:0,...extra};
      this.bullets.push(b);return b;
    }
    enemyShot(e,a,speed=175,extra={}){
      if(this.ceasefire)return;
      this.bullet(e.x,e.y,a,speed,true,extra);
      if(this.mods.extra&&this.random()<.4)this.bullet(e.x,e.y,a+.085,speed*.96,true,extra);
    }
    ring(e,n,speed,offset=0,gap=null){for(let i=0;i<n;i++){const a=i*TAU/n+offset;let d=gap===null?9:Math.abs(Math.atan2(Math.sin(a-gap),Math.cos(a-gap)));if(d>.19)this.enemyShot(e,a,speed);}}
    nearest(x,y){let target=null,ds=Infinity;for(const e of this.enemies){if(e.hp<=0||e.spawn>0)continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<ds){ds=d;target=e;}}return target;}
    shoot(x,y,a,scale=1,ghost=false){
      const count=1+(this.upgrades.scatter||0)*2;
      const damage=10*Math.pow(.82,this.upgrades.scatter||0)*Math.pow(1.2,this.upgrades.rail||0)*(this.upgrades.homing?1.1:1)*this.mods.gun*scale;
      for(let j=0;j<count;j++)this.bullet(x+Math.cos(a)*20,y+Math.sin(a)*20,a+(j-(count-1)/2)*.13,760,false,
        {damage,pierce:(this.upgrades.rail||0)*2,homing:!!this.upgrades.homing,ghost});
      if(!ghost)this.emit('shoot',{x,y,a});
    }
    hitEnemy(e,damage,kind='shot'){
      if(e.hp<=0||e.spawn>0)return;
      e.hp-=damage;e.hit=.07;
      if(kind!=='shot'||this.random()<.2)this.emit('hit',{x:e.x,y:e.y,damage,kind});
      if(e.hp<=0){
        this.kills++;this.combo=clamp(this.combo+1,0,50);this.comboTimer=4;const pts=e.type==='boss'?4500:100;
        this.score+=Math.round(pts*(1+Math.floor(this.combo/5)*.25));
        this.energy(e.type==='boss'?25:3);
        if(this.upgrades.leech&&this.kills%12===0)this.heal(1);
        this.emit('kill',{x:e.x,y:e.y,kind:e.type,stage:this.stage});
        if(e.type==='boss')this.bossKills++;
      }
    }
    heal(n){const before=this.p.hp;this.p.hp=Math.min(this.p.maxHp,this.p.hp+n);if(before!==this.p.hp)this.emit('heal',{x:this.p.x,y:this.p.y});}
    energy(n){this.p.energy=clamp(this.p.energy+n*(1+(this.upgrades.magnet||0)*.35),0,100);}
    hurt(){
      if(this.p.inv>0||this.p.dash>0||this.training||this.phase!=='combat')return false;
      const amount=this.mods.damage;this.p.hp=Math.max(0,this.p.hp-amount);this.damageTaken+=amount;this.p.inv=1.35;this.combo=0;
      this.emit('hurt',{x:this.p.x,y:this.p.y});
      // A small, readable breathing pocket prevents unavoidable chained hits.
      for(const b of this.bullets)if(b.hostile&&dist(b,this.p)<95)b.life=0;
      if(this.p.hp<=0){this.phase='dead';this.emit('death');}return true;
    }
    breach(){
      if(this.phase!=='combat'||!this.pact||this.broken||this.training)return false;
      const previousHpScale=this.mods.hp;this.broken=true;this.breaches++;this.contracts[this.contracts.length-1].kept=false;this.mods=modifiers(null,true);this.ceasefire=false;
      this.bullets=this.bullets.filter(b=>!b.hostile);this.lasers=[];this.heal(1);this.p.inv=2;
      for(const e of this.enemies){if(previousHpScale!==1){e.maxHp/=previousHpScale;e.hp/=previousHpScale;}e.stun=2;this.hitEnemy(e,e.type==='boss'?e.maxHp*.2:100,'breach');}
      this.emit('breach',{stage:this.stage});return true;
    }
    nova(){
      const need=this.novaCost();if(this.phase!=='combat'||this.p.energy<need)return false;
      this.p.energy-=need;this.p.inv=Math.max(this.p.inv,.85);
      let count=0;for(const b of this.bullets)if(b.hostile){count++;b.life=0;}
      this.lasers=[];for(const e of this.enemies)this.hitEnemy(e,210*(1+.7*(this.upgrades.nova||0)),'nova');
      this.score+=count*8;this.emit('nova',{x:this.p.x,y:this.p.y,count});return true;
    }
    novaCost(){return 100-(this.upgrades.nova||0)*20;}
    dashCooldown(){return .95*this.mods.dash;}
    parryCooldown(){return 1.35*Math.pow(.78,this.upgrades.parry||0);}
    step(dt,input={}){
      const W=this.width,H=this.height;
      if(this.phase!=='combat'||!Number.isFinite(dt)||dt<=0)return;
      dt=Math.min(dt,1/30);this.time+=dt;this.waveTime+=dt;const p=this.p;
      const wasSilent=this.ceasefire;this.ceasefire=this.mods.silence&&this.waveTime%5>=3.7;
      if(this.ceasefire!==wasSilent)this.emit(this.ceasefire?'silence':'unsilence');
      for(const k of ['inv','fire','dash','dashCd','parry','parryCd'])p[k]=Math.max(0,p[k]-dt);
      p.parryAge+=dt;this.comboTimer-=dt;if(this.comboTimer<=0)this.combo=0;
      let mx=clamp(Number(input.mx)||0,-1,1),my=clamp(Number(input.my)||0,-1,1);const ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml;}
      if(Number.isFinite(input.aimx)&&Number.isFinite(input.aimy))p.angle=Math.atan2(input.aimy-p.y,input.aimx-p.x);
      if(input.autoAim){const e=this.nearest(p.x,p.y);if(e)p.angle=angle(p,e);}
      if(input.dash&&p.dashCd<=0){p.dash=.17;p.dashCd=this.dashCooldown();p.inv=Math.max(p.inv,.22);p.dashAngle=ml>.1?Math.atan2(my,mx):p.angle;
        for(const e of this.enemies)e.dashHit=false;this.emit('dash',{x:p.x,y:p.y,a:p.dashAngle});}
      if(input.parry&&p.parryCd<=0){p.parry=.23+(this.upgrades.parry||0)*.08;p.parryAge=0;p.parryCd=this.parryCooldown();this.emit('parry-start',{x:p.x,y:p.y});}
      if(input.nova)this.nova();if(input.breach)this.breach();
      const oldX=p.x,oldY=p.y;
      if(p.dash>0){p.vx=Math.cos(p.dashAngle)*1060*this.motionScale;p.vy=Math.sin(p.dashAngle)*1060*this.motionScale;}
      else{const speed=310*this.motionScale;const ease=1-Math.exp(-24*dt);p.vx+=(mx*speed-p.vx)*ease;p.vy+=(my*speed-p.vy)*ease;}
      p.x=clamp(p.x+p.vx*dt,this.bounds.left,this.bounds.right);p.y=clamp(p.y+p.vy*dt,this.bounds.top,this.bounds.bottom);
      let fired=false;
      if(input.shoot&&p.fire<=0&&!this.ceasefire){p.fire=.11*Math.pow(.82,this.upgrades.rapid||0);this.shoot(p.x,p.y,p.angle);fired=true;}
      this.history.push({t:this.time,x:p.x,y:p.y,a:p.angle,fire:fired});
      while(this.history.length&&this.history[0].t<this.time-1.6)this.history.shift();
      if(this.upgrades.echo&&!this.ceasefire){for(let j=1;j<=this.upgrades.echo;j++){const h=this.history.find(h=>h.t>=this.time-j*.55);if(h&&h.fire){this.shoot(h.x,h.y,h.a,.38,true);}}}
      this.orbitClock-=dt;if(this.orbitClock<=0&&!this.ceasefire&&this.upgrades.orbit){this.orbitClock=.32;for(let i=0;i<this.upgrades.orbit;i++){
        const a=this.time*1.8+i*TAU/this.upgrades.orbit,x=p.x+Math.cos(a)*45,y=p.y+Math.sin(a)*45,e=this.nearest(x,y);if(e)this.shoot(x,y,Math.atan2(e.y-y,e.x-x),.5,true);}}
      if(!this.training)while(this.planIndex<this.wavePlan.length&&this.waveTime>=this.wavePlan[this.planIndex].at){const n=this.wavePlan[this.planIndex++];
        // Avoid spawning directly on the pilot; telegraph still precedes contact.
        if(Math.hypot(n.x-p.x,n.y-p.y)<150)n.x=n.x<W/2?W-100:100;this.spawn(n.type,n.x,n.y);}
      for(const e of this.enemies){
        if(e.hp<=0)continue;e.age+=dt;e.hit=Math.max(0,e.hit-dt);e.spawn=Math.max(0,e.spawn-dt);e.stun=Math.max(0,e.stun-dt);e.px=e.x;e.py=e.y;
        if(e.spawn>0||e.stun>0)continue;
        if(e.type==='boss')this.updateBoss(e,dt);else this.updateEnemy(e,dt);
        if(p.dash>0&&this.upgrades.razor&&!e.dashHit&&segmentHit(oldX,oldY,p.x,p.y,e.x,e.y,e.r+20)){e.dashHit=true;this.hitEnemy(e,90*this.upgrades.razor,'dash');}
        if(dist(e,p)<e.r+7)this.hurt();
      }
      for(const l of this.lasers){l.t-=dt;if(l.t<=0&&!l.active){l.active=true;l.t=.36;this.emit('laser',{x:l.x,y:l.y});}
        else if(l.active&&l.t<=0)l.dead=true;
        if(l.active&&!l.dead&&!this.ceasefire&&segmentHit(l.x,l.y,l.x+Math.cos(l.a)*1600,l.y+Math.sin(l.a)*1600,p.x,p.y,l.width/2+p.r))this.hurt();}
      this.lasers=this.lasers.filter(l=>!l.dead);
      for(const b of this.bullets){
        if(b.life<=0)continue;b.px=b.x;b.py=b.y;
        if(!b.hostile&&b.homing){const t=this.nearest(b.x,b.y);if(t){const sp=Math.hypot(b.vx,b.vy),a=angle(b,t),f=1-Math.exp(-4*dt);b.vx+=(Math.cos(a)*sp-b.vx)*f;b.vy+=(Math.sin(a)*sp-b.vy)*f;}}
        if(!b.hostile||!this.ceasefire){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
        if(b.x<-80||b.x>W+80||b.y<-80||b.y>H+80){b.life=0;continue;}
        if(b.hostile){
          if(this.mods.sanctuary&&segmentHit(b.px,b.py,b.x,b.y,W/2,H/2,76)){b.life=0;continue;}
          const d=dist(b,p);
          if(p.parry>0&&segmentHit(b.px,b.py,b.x,b.y,p.x,p.y,70)){
            b.hostile=false;b.reflected=true;b.homing=true;b.life=2.8;b.hitIds=[];const e=this.nearest(b.x,b.y);const a=e?angle(b,e):p.angle;
            b.vx=Math.cos(a)*830;b.vy=Math.sin(a)*830;const perfect=p.parryAge<.105;
            b.damage=(perfect?58:38)*this.mods.reflect;b.pierce=1;this.parries++;this.energy(perfect?8:4);this.score+=perfect?100:40;
            this.emit('reflect',{x:b.x,y:b.y,perfect});continue;
          }
          if(!b.grazed&&d<32+(this.upgrades.magnet||0)*14&&d>b.r+p.r+2){b.grazed=true;this.grazes++;this.energy(2);this.score+=12;this.emit('graze',{x:b.x,y:b.y});}
          if(segmentHit(b.px,b.py,b.x,b.y,p.x,p.y,p.r+b.r)&&p.inv<=0&&p.dash<=0){if(this.hurt())b.life=0;}
        }else{
          for(const e of this.enemies){if(e.hp<=0||e.spawn>0||b.hitIds.includes(e.id))continue;
            if(segmentHit(b.px,b.py,b.x,b.y,e.x,e.y,e.r+b.r)){
              b.hitIds.push(e.id);this.hitEnemy(e,b.damage,b.reflected?'reflect':'shot');if(b.pierce--<=0){b.life=0;break;}
            }}
        }
      }
      this.bullets=this.bullets.filter(b=>b.life>0);this.enemies=this.enemies.filter(e=>e.hp>0);
      if(this.training){p.hp=p.maxHp;p.energy=Math.max(p.energy,100);return;}
      if(this.phase!=='combat')return;
      if(this.enemies.length===0&&this.planIndex>=this.wavePlan.length){this.clearClock+=dt;if(this.clearClock>1.2){
        if(this.wave===2){this.score+=this.broken?1000:3000;this.heal(2);this.stage++;this.wave=0;this.bullets=[];this.lasers=[];
          if(this.stage===3){this.phase='won';this.score+=Math.max(0,Math.round(6000-this.time*4))+this.p.hp*250;this.emit('victory',{ending:this.breaches===0?'keeper':this.breaches===3?'breaker':'survivor'});}
          else{this.phase='pact';this.emit('sector-clear',{stage:this.stage});}
        }else this.offerUpgrade();
      }}else this.clearClock=0;
    }
    updateEnemy(e,dt){
      const W=this.width,H=this.height;
      const p=this.p,a=angle(e,p),d=dist(e,p);e.rot+=dt*.7;
      if(e.type==='chaser'){
        const speed=(80+this.stage*13)*this.motionScale;e.x+=Math.cos(a)*speed*dt;e.y+=Math.sin(a)*speed*dt;
      }else if(e.type==='turret'){
        if(d<180){e.x-=Math.cos(a)*40*dt;e.y-=Math.sin(a)*40*dt;}
      }else if(e.type==='spinner'){
        e.x+=Math.cos(e.rot)*32*dt;e.y+=Math.sin(e.rot)*32*dt;
      }else if(e.type==='warden'){
        e.x+=Math.cos(a)*30*dt;e.y+=Math.sin(a)*30*dt;
      }else if(e.type==='lancer'){
        if(e.charge>0){e.charge-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;}
        else if(e.fire<.65&&!this.ceasefire){if(!e.locked){e.tx=p.x;e.ty=p.y;e.locked=true;}}
      }
      e.x=clamp(e.x,45,W-45);e.y=clamp(e.y,this.bounds.top,this.bounds.bottom);
      if(this.ceasefire)return;e.fire-=dt*this.mods.enemyRate;
      if(e.fire<=0){
        switch(e.type){
          case 'chaser':this.enemyShot(e,a,185);e.fire=2.8;break;
          case 'turret':for(let j=-1;j<=1;j++)this.enemyShot(e,a+j*.19,210);e.fire=this.training?1.5:1.9;break;
          case 'spinner':this.ring(e,8,140,e.rot);e.fire=2.2;break;
          case 'warden':this.ring(e,14,125,e.rot);e.fire=2.6;break;
          case 'lancer':{const a2=Math.atan2(e.ty-e.y,e.tx-e.x);e.vx=Math.cos(a2)*450;e.vy=Math.sin(a2)*450;e.charge=.6;e.locked=false;e.fire=3.0;break;}
        }
      }
    }
    updateBoss(e,dt){
      const W=this.width,H=this.height;
      const stage=this.stage,p=this.p;const phase=e.hp/e.maxHp<.32?2:e.hp/e.maxHp<.66?1:0;
      if(e.phase!==phase){e.phase=phase;e.stun=1.0;this.bullets=this.bullets.filter(b=>!b.hostile);this.emit('boss-phase',{phase});}
      const targetX=W/2+Math.sin(e.age*.35)*(stage===2?275:225)*(W/1280),targetY=this.bossY+Math.sin(e.age*.52)*(this.layout==='portrait'?45:65);
      e.x+=(targetX-e.x)*(1-Math.exp(-1.5*dt));e.y+=(targetY-e.y)*(1-Math.exp(-1.5*dt));e.rot+=dt*(.4+phase*.15);
      if(this.ceasefire)return;const rate=this.mods.bossRate*this.mods.enemyRate;
      e.fire-=dt*rate;e.special-=dt*rate;
      if(e.fire<=0){
        if(stage===0){
          if(phase===0){this.ring(e,16,145,e.rot,angle(e,p));e.fire=1.05;}
          else{for(let i=0;i<3;i++)this.enemyShot(e,e.rot*2.5+i*TAU/3,155+phase*14);e.fire=.13;}
        }else if(stage===1){
          for(let i=0;i<4;i++){const a=e.rot*1.7+i*TAU/4;const q={x:e.x+Math.cos(a)*75,y:e.y+Math.sin(a)*75};this.enemyShot(q,a+Math.sin(e.age)*.7,160+phase*10,{shape:1});}
          e.fire=.22-phase*.025;
        }else{
          this.ring(e,20+phase*4,165+phase*14,e.rot*.8,angle(e,p)+Math.sin(e.age)*.22);e.fire=.85-phase*.13;
        }
      }
      if(e.special<=0){
        if(stage===0){for(let j=-3-phase;j<=3+phase;j++)this.enemyShot(e,angle(e,p)+j*.14,235);e.special=2.0;
          if(!this.mods.noAdds&&this.enemies.length<5&&phase>0)this.spawn('chaser',e.x+(this.random()-.5)*230,e.y+80);
        }else{
          const a=angle(e,p);const n=stage===2?3:2;
          for(let j=0;j<n;j++)this.lasers.push({x:e.x+(j-(n-1)/2)*105,y:e.y,a:a+(j-(n-1)/2)*.26,t:.95,width:stage===2?22:28,active:false});
          e.special=stage===2?3.4:3.2;
          if(!this.mods.noAdds&&this.enemies.length<4&&phase>0)this.spawn(stage===2?'spinner':'turret',this.random()>.5?W-145:145,this.layout==='portrait'?this.bossY+40:250);
        }
      }
    }
    report(){return {version:'0.3.6.1',layout:this.layout,arena:{width:this.width,height:this.height},seed:this.seed,difficulty:this.difficulty,outcome:this.phase,score:this.score,seconds:+this.time.toFixed(2),kills:this.kills,bosses:this.bossKills,parries:this.parries,grazes:this.grazes,damageTaken:this.damageTaken,breaches:this.breaches,contracts:this.contracts.map(c=>({...c})),upgrades:{...this.upgrades},timeline:this.log.slice(-256)};}
  }
  return {World,W,H,TAU,CONTRACTS,UPGRADES,BOSSES,SECTORS,modifiers,clamp,dist,angle,hash,rng,segmentHit};
});
