/* COVENANT ASCENT v0.4.0. Authored expansion. All combat remains local. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./core.js'):root.PactCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.PactExpansion=api;})(globalThis,function(C){'use strict';
const {clamp,rng,TAU,angle,dist}=C;
const SECTORS=[
 {name:'VERDIGRIS BASTION',subtitle:'Where every promise becomes a weapon.',style:'Verdigris / pale alloy / radial ramparts',color:'#83e4ca',lore:'The Notary remembers every shot. It offers you terms because the first pilot who refuses them becomes a warning.',boss:C.BOSSES[0]},
 {name:'VIOLET FOUNDRY',subtitle:'A machine that learned to sing.',style:'Amethyst / black chrome / ribbed gantries',color:'#bd9af9',lore:'The Choir was built to agree. Now its voices disagree only on how you should fall.',boss:C.BOSSES[1]},
 {name:'CROWN OF ASH',subtitle:'Even a king can be a prisoner.',style:'Amber / obsidian / monumental terraces',color:'#f0c77d',lore:'The Sovereign guards a crown no one wears. Beyond its throne, three forbidden constellations wait.',boss:C.BOSSES[2]},
 {name:'TIDAL ARCHIVE',subtitle:'The sea keeps what the sky forgets.',style:'Glacier blue / pearl / submerged vaults',color:'#7dcde9',lore:'A leviathan carries the archive on its back. The oldest record is a pilot who returned every bullet.',boss:{name:'THE LEVIATHAN',subtitle:'Keeper of the Flood',quote:'“All debts return with the tide.”',color:'#7dcde9',hp:5600}},
 {name:'PRISM ORCHARD',subtitle:'Light grows where the world was broken.',style:'Rose quartz / ivory / split crystalline arcs',color:'#f2a0cb',lore:'The Weaver cultivates futures in glass. Every reflected shot is a future it did not predict.',boss:{name:'THE WEAVER',subtitle:'Gardener of Futures',quote:'“You may choose your path. Not its ending.”',color:'#f2a0cb',hp:6800}},
 {name:'THE UNWRITTEN SKY',subtitle:'The final signature is yours.',style:'Solar white / indigo / orbital cathedrals',color:'#e9e5ac',lore:'The final guardian has no name. It exists only to ask whether a promise matters when nobody can enforce it.',boss:{name:'THE UNWRITTEN',subtitle:'The Last Clause',quote:'“Write the law that ends me.”',color:'#e9e5ac',hp:8200}}
];
const BOSSES=SECTORS.map(s=>s.boss);
const AIRFRAMES=[
 {id:'vanguard',name:'VANGUARD',role:'Precision / balanced',icon:'\u25c7',desc:'Standard hull. Begin with Phase Rail: +20% shot damage and piercing.',hull:0,upgrade:'rail',color:'#83e4ca'},
 {id:'wraith',name:'WRAITH',role:'Counterplay / mobility',icon:'\u22c8',desc:'2 less maximum hull. Dash recovers 25% faster. Begin with Mirror Engine.',hull:-2,upgrade:'parry',color:'#bfa5fc'},
 {id:'bastion',name:'BASTION',role:'Escort / survivability',icon:'\u2b21',desc:'2 more maximum hull. Dash recovers 20% slower. Begin with one Orbital.',hull:2,upgrade:'orbit',color:'#f4c780'}
];
const RELICS=[
 {id:'needle',name:'Thread of Tomorrow',icon:'\u27f6',desc:'Every friendly projectile gains one extra pierce.',cost:80},
 {id:'capacitor',name:'Storm Capacitor',icon:'\u03df',desc:'Energy gain +20%. Receive 20 energy now.',cost:70},
 {id:'second',name:'Unbroken Heart',icon:'\u2661',desc:'Once this run, a lethal hit restores 3 hull instead.',cost:100},
 {id:'razor',name:'Judgment Drive',icon:'\u2571',desc:'Gain a Razor Drive stack: dash through enemies to deal damage.',cost:80},
 {id:'echo',name:'The Other You',icon:'\u25c8',desc:'Gain an Echo Wing stack. A delayed wingman repeats your shots.',cost:90},
 {id:'lens',name:'Mercy Lens',icon:'\u25ce',desc:'Enemy projectile speed -8%, including boss volleys.',cost:75},
 {id:'nova',name:'Borrowed Sunrise',icon:'\u2733',desc:'Nova costs 15 less energy, down to a minimum of 35.',cost:90},
 {id:'satellite',name:'Little Witness',icon:'\u2299',desc:'Gain an Orbital stack. It auto-targets nearby enemies.',cost:80}
];
const ROUTES=[
 {id:'refuge',name:'THE QUIET WAY',tag:'RECOVER',icon:'\u2727',desc:'Restore 2 hull. Fewer enemies, lower salvage. No new hazards.',reward:'Safer passage / fewer credits',factor:.85,credits:.8},
 {id:'salvage',name:'THE FORGOTTEN WAY',tag:'SALVAGE',icon:'\u25c8',desc:'Enter a debris corridor. 30 credits now; collect drifting salvage.',reward:'Standard threat / bonus salvage',factor:1,credits:1.25},
 {id:'elite',name:'THE BROKEN WAY',tag:'ELITE',icon:'\u25b3',desc:'More enemies. Elite units have 40% more hull. +60 credits at the boss.',reward:'High threat / greater reward',factor:1.2,credits:1.5}
];
const ENEMIES={harrier:{hp:72,r:19},prism:{hp:100,r:21},carrier:{hp:180,r:28}};
const DIRECTORS={balanced:{name:'Measured pressure',desc:'Mixed formations, standard arrival windows.'},pursuit:{name:'Pursuit lane',desc:'More mobile enemies. Arrivals remain capped.'},crossfire:{name:'Crossfire lattice',desc:'More turrets and prisms. Extra spacing between arrivals.'}};
class Run extends C.World{
 constructor(seed,difficulty,training=false,viewport={},options={}){
  super(seed,difficulty,training,viewport);
  this.mode=['expedition','gauntlet','classic'].includes(options.mode)?options.mode:'expedition';
  this.totalStages=this.mode==='classic'?3:6;this.airframe=AIRFRAMES.find(x=>x.id===options.airframe)?.id||'vanguard';
  this.credits=50;this.relics=[];this.routeHistory=[];this.route=null;this.director='balanced';this.pickups=[];this.sectorKills=0;this.relicUsed=false;this.encounters=0;this.routeRewarded=false;
  this.shop=[];this.chronicle=[];this.routeChosen=false;this.gauntletDraft=false;
  if(!training&&this.mode!=='classic'){
   const ship=AIRFRAMES.find(s=>s.id===this.airframe);this.p.hp+=ship.hull;this.p.maxHp+=ship.hull;this.upgrades[ship.upgrade]=1;
   if(this.mode==='gauntlet'){this.upgrades.rapid=1;this.upgrades.rail=Math.max(1,this.upgrades.rail||0);this.p.energy=100;}
   this.phase='route';this.refreshShop();
  }
 }
 bossInfo(){return BOSSES[Math.min(this.stage,5)];}
 offersForPact(){if(this.mode==='classic'||this.training)return super.offersForPact();const sets=[['mercy','mirror','glass'],['silence','sanctuary','duel'],['velocity','mirror','silence'],['mercy','duel','sanctuary'],['glass','mirror','velocity'],['silence','mirror','duel']];return sets[Math.min(this.stage,5)].map(id=>C.CONTRACTS.find(c=>c.id===id));}
 relicAvailable(id){const caps={razor:['razor',2],echo:['echo',2],satellite:['orbit',3]};const cap=caps[id];return !this.relics.includes(id)&&(!cap||(this.upgrades[cap[0]]||0)<cap[1]);}
 refreshShop(){const r=rng(this.seed+'/shop/'+this.stage);const pool=RELICS.filter(x=>this.relicAvailable(x.id));this.shop=[];while(pool.length&&this.shop.length<3)this.shop.push(pool.splice(Math.floor(r()*pool.length),1)[0]);}
 chooseRoute(id){if(this.phase!=='route'||this.routeChosen||!ROUTES.some(r=>r.id===id))return false;
  this.route=ROUTES.find(r=>r.id===id);this.routeHistory.push({stage:this.stage,id});this.routeChosen=true;
  if(id==='refuge')this.heal(2);if(id==='salvage')this.credits+=30;
  this.chronicle.push({stage:this.stage,text:SECTORS[this.stage].lore});this.phase='pact';return true;
 }
 setDirector(id){if(!['route','pact'].includes(this.phase)||!DIRECTORS[id])return false;this.director=id;return true;}
 purchase(id){if(!['route','pact','upgrade'].includes(this.phase))return false;const r=this.shop.find(x=>x.id===id);if(!r||this.credits<r.cost||!this.relicAvailable(id))return false;
  this.credits-=r.cost;this.relics.push(id);this.shop=this.shop.filter(x=>x.id!==id);
  if(id==='capacitor')this.energy(20);if(id==='razor')this.upgrades.razor=Math.min(2,(this.upgrades.razor||0)+1);
  if(id==='echo')this.upgrades.echo=Math.min(2,(this.upgrades.echo||0)+1);if(id==='satellite')this.upgrades.orbit=Math.min(3,(this.upgrades.orbit||0)+1);
  this.emit('relic',{id});return true;
 }
 repair(){if(!['route','pact','upgrade'].includes(this.phase)||this.credits<35||this.p.hp>=this.p.maxHp)return false;this.credits-=35;this.heal(2);return true;}
 startWave(){if(this.mode==='gauntlet')this.wave=2;super.startWave();this.pickups=[];
  if(this.mode==='classic'||this.training)return;
  this.encounters++;this.routeRewarded=false;
  if(this.wave<2){const r=rng(this.seed+'/expedition/'+this.stage+'/'+this.wave+'/'+(this.route?.id||'salvage')+'/'+this.director);
   const pool=this.stage===0?['chaser','turret','spinner']:this.stage===1?['chaser','turret','harrier','lancer']:this.stage===2?['spinner','warden','prism','chaser']:['harrier','prism','carrier','lancer','turret','chaser'];
   const count=Math.min(36,Math.round((12+this.stage*3+this.wave*4)*(this.route?.factor||1)));
   this.wavePlan=Array.from({length:count},(_,i)=>{let type=pool[Math.floor(r()*pool.length)];if(i%4===0&&this.director==='pursuit')type='harrier';if(i%4===0&&this.director==='crossfire')type=this.stage>1?'prism':'turret';
    const theta=i*2.39996+r()*.5;return {at:1.25+i*(this.director==='crossfire'?1.20:1.05),type,x:clamp(this.width*.5+Math.cos(theta)*this.width*.39,75,this.width-75),y:clamp(this.height*.42+Math.sin(theta)*this.height*.3,this.bounds.top+50,this.bounds.bottom-65)};});
  }
 }
 spawn(type,x,y){const e=super.spawn(type,x,y);if(!e)return e;if(ENEMIES[type]){e.hp=e.maxHp=ENEMIES[type].hp*this.mods.hp*this.diffHp;e.r=ENEMIES[type].r;e.special=3;}
  if(this.route?.id==='elite'&&type!=='boss'&&e.id%5===0){e.elite=true;e.hp*=1.4;e.maxHp*=1.4;}
  return e;
 }
 dashCooldown(){return super.dashCooldown()*(this.mode==='classic'||this.training?1:this.airframe==='wraith'?.75:this.airframe==='bastion'?1.2:1);}
 novaCost(){return Math.max(35,super.novaCost()-(this.relics?.includes('nova')?15:0));}
 energy(n){return super.energy(n*(this.relics?.includes('capacitor')?1.2:1));}
 bullet(x,y,a,speed,hostile=true,extra={}){const b=super.bullet(x,y,a,speed*(hostile&&this.relics?.includes('lens')?.92:1),hostile,extra);if(b&&!hostile&&this.relics?.includes('needle'))b.pierce++;return b;}
 hurt(){if(this.relics?.includes('second')&&!this.relicUsed&&!this.training&&this.phase==='combat'&&this.p.inv<=0&&this.p.dash<=0&&this.p.hp<=this.mods.damage){this.relicUsed=true;this.p.hp=Math.min(3,this.p.maxHp);this.p.inv=2;this.bullets=this.bullets.filter(b=>!b.hostile);this.emit('revive');return true;}return super.hurt();}
 hitEnemy(e,d,kind='shot'){const alive=e.hp>0;super.hitEnemy(e,d,kind);if(alive&&e.hp<=0&&this.mode!=='classic'){
  this.sectorKills++;this.credits+=Math.ceil((e.type==='boss'?30:e.elite?7:2)*(this.route?.credits||1));
  if(this.kills%3===0||e.elite){this.pickups.push({x:e.x,y:e.y,life:9,value:e.elite?6:3});if(this.pickups.length>32)this.pickups.shift();}
 }}
 chooseUpgrade(id){if(!this.gauntletDraft)return super.chooseUpgrade(id);if(this.phase!=='upgrade'||!this.offers.some(x=>x.id===id))return false;this.upgrades[id]=(this.upgrades[id]||0)+1;if(id==='hull'){this.p.maxHp+=2;this.heal(3);}if(id==='repair')this.p.hp=this.p.maxHp;this.gauntletDraft=false;this.phase='route';this.emit('upgrade',{id});return true;}
 completeEncounter(){if(this.mode==='classic'){super.completeEncounter();return;}
  this.pickups=[];
  if(this.wave!==2){this.offerUpgrade();return;}
  this.score+=this.broken?1000:3000;this.heal(2);if(this.route?.id==='elite')this.credits+=60;
  this.stage++;this.wave=0;this.bullets=[];this.lasers=[];this.history=[];this.routeChosen=false;
  if(this.stage>=this.totalStages){this.phase='won';this.score+=Math.max(0,Math.round(9000-this.time*3))+this.p.hp*250;this.emit('victory',{ending:this.breaches===0?'keeper':this.breaches===this.totalStages?'breaker':'survivor'});}
  else{this.phase='route';this.refreshShop();this.p.energy=Math.max(35,this.p.energy);this.emit('sector-clear',{stage:this.stage});if(this.mode==='gauntlet'){this.gauntletDraft=true;this.offerUpgrade();}}
 }
 step(dt,input={}){super.step(dt,input);if(this.phase!=='combat'||!Number.isFinite(dt)||dt<=0)return;const d=Math.min(dt,1/30);
  for(const p of this.pickups){p.life-=d;const a=angle(p,this.p),length=dist(p,this.p);if(length<160){p.x+=Math.cos(a)*250*d;p.y+=Math.sin(a)*250*d;}if(length<22){this.credits+=p.value;this.energy(2);p.life=0;this.emit('salvage',{x:p.x,y:p.y,value:p.value});}}
  this.pickups=this.pickups.filter(p=>p.life>0);
 }
 updateEnemy(e,dt){if(!ENEMIES[e.type])return super.updateEnemy(e,dt);
  const a=angle(e,this.p);e.rot+=dt*.6;e.fire-=this.ceasefire?0:dt*this.mods.enemyRate;e.special-=this.ceasefire?0:dt;
  if(e.type==='harrier'){const tangent=a+Math.PI*.42,stride=e.age%3.4<2?70:0;e.x+=Math.cos(tangent)*stride*dt;e.y+=Math.sin(tangent)*stride*dt;
    if(e.fire<=0){for(let i=-1;i<=1;i++)this.enemyShot(e,a+i*.13,205);e.fire=1.8;}}
  if(e.type==='prism'){if(e.fire<=0){for(let i=0;i<3;i++)this.enemyShot(e,e.rot+i*TAU/3,155,{shape:1});e.fire=.75;}}
  if(e.type==='carrier'){e.x+=Math.sin(e.age*.6)*25*dt;if(e.fire<=0){this.ring(e,10,125,e.rot,angle(e,this.p));e.fire=2.3;}if(e.special<=0){if(this.enemies.length<14)this.spawn('chaser',e.x+45,e.y+25);e.special=6;}}
  e.x=clamp(e.x,55,this.width-55);e.y=clamp(e.y,this.bounds.top+24,this.bounds.bottom-24);
 }
 updateBoss(e,dt){if(this.stage<3)return super.updateBoss(e,dt);
  const phase=e.hp/e.maxHp<.32?2:e.hp/e.maxHp<.66?1:0;
  if(e.phase!==phase){e.phase=phase;e.stun=.8;this.bullets=this.bullets.filter(b=>!b.hostile);this.emit('boss-phase',{phase});}
  const sx=this.width/1280,tx=this.width*.5+Math.sin(e.age*.32)*220*sx,ty=this.bossY+Math.sin(e.age*.57)*40;
  e.x+=(tx-e.x)*(1-Math.exp(-1.5*dt));e.y+=(ty-e.y)*(1-Math.exp(-1.5*dt));e.rot+=dt*.35;
  if(this.ceasefire)return;const rate=this.mods.bossRate*this.mods.enemyRate;e.fire-=dt*rate;e.special-=dt*rate;
  if(e.fire<=0){
   if(this.stage===3){for(let i=-4-phase;i<=4+phase;i++)this.enemyShot(e,Math.PI*.5+i*.16+Math.sin(e.age)*.32,170+phase*14,{shape:1});e.fire=.82;}
   else if(this.stage===4){for(let i=0;i<4;i++){const a=e.rot*1.5+i*TAU/4;this.enemyShot(e,a,155+phase*15,{shape:1});this.enemyShot(e,a+.08,130);}e.fire=.25;}
   else{this.ring(e,20+phase*4,155+phase*15,e.rot,angle(e,this.p));for(let i=-1;i<=1;i++)this.enemyShot(e,angle(e,this.p)+i*.14,220);e.fire=.8-phase*.12;}
  }
  if(e.special<=0){const a=angle(e,this.p);const n=this.stage===4?4:2;
   for(let i=0;i<n;i++)this.lasers.push({x:e.x+(i-(n-1)/2)*55,y:e.y,a:a+(i-(n-1)/2)*.24,t:1.15,width:18,active:false});
   if(!this.mods.noAdds&&this.enemies.length<4&&phase>0)this.spawn(this.stage===4?'prism':'harrier',this.random()>.5?100:this.width-100,this.bossY+55);
   e.special=this.stage===5?3.8:4.4;
  }
 }
 report(){return {...super.report(),mode:this.mode,airframe:this.airframe,sectorCount:this.totalStages,credits:this.credits,relics:[...this.relics],routes:this.routeHistory.map(r=>({...r})),director:this.director,encounters:this.encounters,chronicle:this.chronicle.map(r=>({...r}))};}
}
return {Run,SECTORS,BOSSES,AIRFRAMES,RELICS,ROUTES,ENEMIES,DIRECTORS};
});
