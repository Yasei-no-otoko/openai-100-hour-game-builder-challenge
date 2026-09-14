/* Sculpted sector silhouettes; all scenery stays in the protected background depth band. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./meshes3d.js'));else root.PactMeshes=factory(root.PactMeshes);})(globalThis,function(M){'use strict';
const {colors,LAYER,STRIDE,rng}=M,TAU=Math.PI*2;
const PALETTES=[
 {accent:[.28,.80,.63],alloy:[.18,.27,.29],trim:[.57,.64,.59],ground:[.032,.057,.067]},
 {accent:[.55,.30,.85],alloy:[.20,.16,.28],trim:[.40,.40,.52],ground:[.037,.033,.058]},
 {accent:[.86,.54,.18],alloy:[.25,.20,.14],trim:[.61,.49,.31],ground:[.060,.044,.027]},
 {accent:[.22,.64,.9],alloy:[.14,.25,.31],trim:[.55,.67,.73],ground:[.024,.051,.077]},
 {accent:[.87,.29,.58],alloy:[.26,.16,.26],trim:[.68,.51,.62],ground:[.057,.029,.057]},
 {accent:[.82,.78,.49],alloy:[.20,.20,.30],trim:[.61,.62,.66],ground:[.026,.029,.060]}
];
function facetMesh(){const out=[],v=[[0,0,1],[.45,0,0],[0,.45,0],[-.45,0,0],[0,-.45,0],[0,0,-.5]];function tri(a,b,c){const u=b.map((n,i)=>n-a[i]),w=c.map((n,i)=>n-a[i]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n)||1;for(const p of [a,b,c])out.push(...p,...n.map(v=>v/l));}for(let i=1;i<=4;i++){const j=i===4?1:i+1;tri(v[0],v[i],v[j]);tri(v[5],v[j],v[i]);}return new Float32Array(out);}
M.shapes.crystal=facetMesh();
class Scene extends M.Scene{
 bossShadow(x,y,s=1,lift=110){const p=PALETTES[this.theme||0];this.add('orb',x+lift*.22,y+lift*.28,-78,69*s,34*s,.06,0,p.ground.map(v=>v*.48),.98,0,0,LAYER.SHADOW);}
 shipShadow(x,y,a,s=1,lift=96){const p=PALETTES[this.theme||0];this.add('orb',x+lift*.2,y+lift*.25,-78,21*s,10*s,.06,a,p.ground.map(v=>v*.38),.98,0,0,LAYER.SHADOW);}
 floor(w,h,stage=0,seed='TITLE'){
  stage=Math.max(0,Math.min(5,stage));this.theme=stage;const p=PALETTES[stage],r=rng(seed+':ascension:'+stage),cx=w/2,cy=h/2;
  // The game is above a layered landscape, not embedded in a bright tiled floor.
  this.box(cx,cy,-112,w+180,h+180,8,0,p.ground,.82,.16,0,LAYER.GROUND);
  this.box(cx,cy,-130,w+260,h+260,6,0,p.ground,.95,.04,0,.97);
  const edge=Math.min(w,h)*.16;
  for(let i=0;i<12;i++){
   const side=i%2?-1:1,y=h*(.10+Math.floor(i/2)*.16),x=side<0?edge*.5:w-edge*.5,s=55+r()*25,z=-67+r()*18;
   this.box(x,y,z,s,95+r()*20,36,side*.12,p.alloy,.56,.58,0,LAYER.LOW);
   this.box(x,y,z+20,s*.80,73,6,side*.12,p.trim,.43,.64,0,LAYER.LOW);
   // Carved steps give lateral faces a silhouette without hiding the pilot.
   for(let j=0;j<3;j++)this.box(x+side*(s*.42+j*7),y,z-8-j*7,9,58-j*6,10,0,p.alloy,.50,.70,0,LAYER.LOW);
   for(let j=0;j<3;j++)this.box(x-14+j*12,y-23,z+25,3,24,2,0,p.accent,.30,.22,.42,LAYER.TRIM);
  }
  // Long, thin conduits replace large bright central rings.
  for(const x of [w*.18,w*.82]){
   this.box(x,cy,-66,5,h*.84,7,0,p.alloy,.55,.65,0,LAYER.LOW);
   for(let i=0;i<13;i++)this.box(x,h*(.10+i*.065),-59,1.6,13,2,0,p.accent,.30,.30,.48,LAYER.TRIM);
  }
  for(let i=0;i<5;i++){const y=h*(.16+i*.16);this.box(cx,y,-80,w*.50,4,5,0,p.alloy,.75,.50,0,LAYER.GROUND);}
  if(stage===0){
   // A split citadel: stacked buttresses and broken arch shoulders.
   for(const side of [-1,1])for(let i=0;i<3;i++){
    const x=cx+side*w*.34,y=h*(.20+i*.28);
    for(let j=0;j<3;j++)this.box(x+side*j*7,y,-47+j*26,56-j*10,82-j*11,28,side*.07,p.alloy,.32,.8,0,LAYER.HIGH);
    this.add('hex',x,y,28,15,21,36,.2,p.trim,.28,.76,0,LAYER.HIGH);
    this.box(x-side*31,y,4,38,11,18,side*.27,p.trim,.3,.72,0,LAYER.MID);
   }
   this.add('ring',cx,cy,-52,w*.26,h*.28,7,.15,p.alloy,.6,.6,0,LAYER.LOW);
  }else if(stage===1){
   // Furnace ribs alternate along two suspended production spines.
   for(const side of [-1,1])for(let i=0;i<7;i++){
    const x=cx+side*w*.30,y=h*(.12+i*.12),z=-32+(i%2)*15;
    this.box(x,y,z,64,24,68,side*.18,p.alloy,.25,.85,0,LAYER.HIGH);
    this.box(x-side*33,y,7,54,9,13,side*.18,p.trim,.35,.82,0,LAYER.HIGH);
    this.box(x,y+10,15,36,2,5,0,p.accent,.2,.12,.72,LAYER.TRIM);
   }
  }else if(stage===2){
   // Ziggurats face an empty processional avenue.
   for(const side of [-1,1])for(let i=0;i<3;i++){
    const x=cx+side*w*.29,y=h*(.18+i*.30);
    for(let j=0;j<5;j++)this.box(x,y,-66+j*18,88-j*12,100-j*13,20,Math.PI/4,p.alloy,.42,.64,0,LAYER.HIGH);
    this.add('crystal',x,y,32,19,19,40,0,p.trim,.22,.83,.1,LAYER.HIGH);
   }
  }else if(stage===3){
   // Pearl archives: cylindrical vaults and offset seabed plates.
   for(let i=0;i<12;i++){
    const side=i%2?-1:1,x=cx+side*(w*.29+r()*w*.06),y=h*(.12+Math.floor(i/2)*.15),z=-42;
    this.add('hex',x,y,z,36,38,72,.25,p.alloy,.38,.7,0,LAYER.HIGH);
    this.add('ring',x,y,-3,37,38,11,0,p.trim,.30,.8,0,LAYER.HIGH);
    this.add('orb',x,y,5,24,24,10,0,p.accent,.16,.4,.3,LAYER.MID);
   }
  }else if(stage===4){
   // Faceted quartz groves: shape, not only palette, changes.
   for(let i=0;i<30;i++){
    const side=i%2?-1:1,x=cx+side*(w*.24+r()*w*.22),y=55+r()*(h-110);
    this.add('crystal',x,y,-30+r()*15,22+r()*25,22+r()*25,35+r()*80,r()*TAU,i%3?p.alloy:p.trim,.20,.65,i%5===0?.25:0,LAYER.HIGH,0,(r()-.5)*.4);
   }
   for(const side of [-1,1])this.add('ring',cx+side*w*.28,cy,-40,w*.12,h*.30,14,side*.4,p.alloy,.26,.8,0,LAYER.LOW);
  }else{
   // The final sky: layered orbital shells, interrupted by ivory locks.
   for(let j=0;j<3;j++)this.add('ring',cx,cy,-72+j*15,Math.min(w,h)*(.30+j*.07),Math.min(w,h)*(.30+j*.07),10,0,p.alloy,.30,.82,0,LAYER.LOW,0,j*.07);
   for(let i=0;i<12;i++){
    const a=i*TAU/12,x=cx+Math.cos(a)*w*.34,y=cy+Math.sin(a)*h*.38;
    this.box(x,y,-14,28,60,90,a,p.trim,.32,.68,0,LAYER.HIGH);
    this.box(x,y,34,5,32,6,a,p.accent,.18,.22,.60,LAYER.TRIM);
   }
  }
  // Fine floating debris gives a separate distance scale. Stable for a seed.
  for(let i=0;i<28;i++){
   const x=r()*w,y=r()*h,s=2+r()*5;
   this.box(x,y,-87,s,s*2,4,r()*TAU,p.trim,.75,.25,0,LAYER.GROUND);
  }
 }
 dynamicScenery(w,h,stage=0,seed='TITLE',t=0,bossFx=0,bgAnim=1){
  const p=PALETTES[Math.min(stage,5)],cx=w/2,cy=h/2;const tt=bgAnim===0?0:t*(bgAnim===2?1.25:1),b=bgAnim===0?0:bossFx;
  // A broken ring visibly rotates; a perfect torus alone would not show rotation.
  for(let i=0;i<18;i++){
   const a=i*TAU/18+tt*.07,rr=Math.min(w,h)*.27;
   this.box(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,-48,8,2,3,a,p.accent,.38,.20,.55+b*.28,LAYER.TRIM);
  }
  for(const side of [-1,1])for(let i=0;i<6;i++){
   const y=h*(.12+i*.145),x=cx+side*w*.35,lift=Math.sin(tt*.8+i*.5)*7;
   this.box(x,y,-10+lift,9,18,25,0,p.trim,.3,.75,0,LAYER.MID);
   this.box(x,y,4+lift,3,12,2,0,p.accent,.25,.2,.6+b*.4,LAYER.TRIM);
  }
  for(let j=0;j<10;j++){
   const f=(tt*.05+j*.10)%1,x=j%2?w*.18:w*.82,y=h*(.08+f*.84);
   this.box(x,y,-56,3,12,3,0,p.accent,.2,.1,.8+b*.4,LAYER.TRIM);
  }
  if(b>.01){
   const n=stage===0?6:stage===1?4:stage===2?8:stage===3?9:stage===4?5:12;
   for(let i=0;i<n;i++){
    const a=i*TAU/n+tt*(stage%2?-.16:.12),rr=Math.min(w,h)*(.22+.025*Math.sin(tt*.5+i));
    const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
    this.add(stage===4?'crystal':'hex',x,y,-40,stage===3?9:5,5,5,a,p.accent,.25,.15,.55+b*.55,LAYER.TRIM);
   }
  }
 }
 ship(x,y,a,s=1,t=0,dash=false,ghost=false){super.ship(x,y,a,s,t,dash,ghost);
  if(ghost)return;const kit=this.airframe||'vanguard',p=kit==='wraith'?PALETTES[1]:kit==='bastion'?PALETTES[2]:PALETTES[0];
  for(const side of [-1,1]){const dx=-6,dy=side*(kit==='bastion'?22:18),px=x+(dx*Math.cos(a)-dy*Math.sin(a))*s,py=y+(dx*Math.sin(a)+dy*Math.cos(a))*s;
   this.add(kit==='wraith'?'crystal':'hull',px,py,9,kit==='bastion'?15*s:11*s,6*s,kit==='wraith'?16*s:7*s,a,p.alloy,.23,.84,0,LAYER.FLIGHT_HIGH);
   this.box(px,py,17,6*s,1.5*s,2*s,a,p.accent,.2,.15,.9,LAYER.FLIGHT_HIGH);
  }
 }
 boss(e,stage=0,t=0,s=1){
  if(stage<3)return super.boss(e,stage,t,s);
  const p=PALETTES[Math.min(stage,5)],cls=LAYER.FLIGHT_HIGH,x=e.x,y=e.y,a=e.rot||0;this.bossShadow(x,y,s,110);
  this.add('hex',x,y,18,37*s,37*s,40*s,a,p.alloy,.27,.84,0,cls,e.hit>0?.65:0);
  this.add('orb',x,y,45,12*s,12*s,8*s,0,p.accent,.15,.24,1.2,cls);
  if(stage===3){
   for(let i=-3;i<=3;i++){if(i===0)continue;const dx=i*25*s,dy=Math.sin(i*.7+t)*13*s;
    this.add('hull',x+dx,y+dy,12,(24-Math.abs(i)*2)*s,19*s,22*s,Math.PI*.5,p.trim,.29,.78,0,cls);
    this.add('crystal',x+dx,y+dy+22*s,16,13*s,13*s,26*s,0,p.accent,.22,.62,.28,cls);
   }
  }else if(stage===4){
   for(let i=0;i<5;i++){const ang=i*TAU/5+a,rr=68*s;
    this.add('crystal',x+Math.cos(ang)*rr,y+Math.sin(ang)*rr,18,34*s,20*s,44*s,ang,p.trim,.17,.82,.10,cls);
    this.box(x+Math.cos(ang)*rr*.6,y+Math.sin(ang)*rr*.6,10,42*s,4*s,8*s,ang,p.alloy,.3,.8,0,cls);
   }
  }else{
   for(let j=0;j<2;j++)this.add('ring',x,y,12+j*22,53*s+j*27*s,53*s+j*27*s,8*s,a,p.trim,.22,.85,.05,cls,0,j*.16);
   for(let i=0;i<8;i++){const ang=i*TAU/8-a,rr=85*s;
    this.add('hull',x+Math.cos(ang)*rr,y+Math.sin(ang)*rr,18,21*s,12*s,19*s,ang+Math.PI,p.alloy,.23,.9,0,cls);
    this.add('orb',x+Math.cos(ang)*rr,y+Math.sin(ang)*rr,31,3*s,3*s,3*s,0,p.accent,.16,.1,1.4,cls);
   }
  }
 }
 enemy(e,t,pilot){
  if(!['harrier','prism','carrier'].includes(e.type)){super.enemy(e,t,pilot);return;}
  if(e.spawn>0)return;const a=e.rot,cls=LAYER.FLIGHT,c=e.type==='prism'?PALETTES[4]:e.type==='carrier'?PALETTES[3]:PALETTES[1];this.enemyShadow(e.type,e.x,e.y,a);
  this.add(e.type==='prism'?'crystal':'hull',e.x,e.y,12,e.r,e.r,26,a,c.alloy,.22,.8,0,cls,e.hit>0?.7:0);
  this.add('orb',e.x,e.y,28,5,5,5,0,c.accent,.18,.1,1.15,cls);
  for(let i=0;i<3;i++){const ang=a+i*TAU/3;this.box(e.x+Math.cos(ang)*e.r,e.y+Math.sin(ang)*e.r,10,16,4,8,ang,c.trim,.3,.8,0,cls);}
 }
 build(frame){this.airframe=frame.world?.airframe||frame.airframe||'vanguard';return super.build(frame);}
}
return {...M,Scene,PALETTES};
});
