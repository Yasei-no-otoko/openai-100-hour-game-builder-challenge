/* NEMESIS PACT 0.3.6 — procedural mesh scene; no simulation mutations.
 * 2D mechanics are unchanged. 3D scenery uses seeded pass-height layers, projected shadows,
 * stronger stage-specific architecture, boss-specific background motifs, and configurable ambient animation.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PactMeshes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const TAU=Math.PI*2,STRIDE=16;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function hash(s){let h=2166136261>>>0;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
 function rng(seed){let a=hash(seed)||1;return ()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=(t+Math.imul(t^t>>>7,61|t))^t;return ((t^t>>>14)>>>0)/4294967296;};}
 function normal(a,b,c){const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;return n.map(x=>x/l);}
 function tri(out,a,b,c){const n=normal(a,b,c);for(const p of [a,b,c])out.push(...p,...n);}
 function quad(out,a,b,c,d){tri(out,a,b,c);tri(out,a,c,d);}
 function extrude(poly){const out=[],n=poly.length;const rings=[[-.5,.84],[-.33,1],[.33,1],[.5,.84]].map(([z,s])=>poly.map(([x,y])=>[x*s,y*s,z]));
  for(let j=0;j<3;j++)for(let i=0;i<n;i++){const k=(i+1)%n;quad(out,rings[j][i],rings[j][k],rings[j+1][k],rings[j+1][i]);}
  for(let i=0;i<n;i++){const k=(i+1)%n;tri(out,[0,0,.5],rings[3][i],rings[3][k]);tri(out,[0,0,-.5],rings[0][k],rings[0][i]);}return new Float32Array(out);}
 function torus(major=1,minor=.10,n=48,m=8){const out=[];function pt(i,j){const a=i*TAU/n,b=j*TAU/m;return [(major+minor*Math.cos(b))*Math.cos(a),(major+minor*Math.cos(b))*Math.sin(a),Math.sin(b)*minor];}
  for(let i=0;i<n;i++)for(let j=0;j<m;j++)quad(out,pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1));return new Float32Array(out);}
 function sphere(n=10,m=6){const out=[];function p(i,j){const a=i*TAU/n,b=j*Math.PI/m;return [Math.cos(a)*Math.sin(b),Math.sin(a)*Math.sin(b),Math.cos(b)];}for(let i=0;i<n;i++)for(let j=0;j<m;j++)quad(out,p(i,j),p(i,j+1),p(i+1,j+1),p(i+1,j));return new Float32Array(out);}
 const shapes={box:extrude([[-.5,-.35],[-.35,-.5],[.35,-.5],[.5,-.35],[.5,.35],[.35,.5],[-.35,.5],[-.5,.35]]),
  hull:extrude([[1.15,0],[-.60,.55],[-.95,0],[-.60,-.55]]),
  hex:extrude(Array.from({length:6},(_,i)=>[Math.cos(i*TAU/6),Math.sin(i*TAU/6)])),ring:torus(),orb:sphere()};
 const colors={mint:[.28,.93,.76],red:[1,.23,.12],violet:[.55,.29,1],gold:[1,.65,.20],steel:[.18,.25,.29],silver:[.61,.71,.73],dark:[.026,.044,.059]};
 const LAYER={GROUND:.02,TRIM:.08,LOW:.18,MID:.30,HIGH:.44,FLIGHT:.58,FLIGHT_HIGH:.66,TALL:.74,SKY:.86,SHADOW:.04};
 const SHADOW_A=[.016,.020,.028],SHADOW_B=[.040,.048,.058];
 class Scene{
  constructor(){this.groups={};this.count=0;this.staticKey='';this.staticGroups=null;this.theme=0;for(const k in shapes)this.groups[k]=[];}
  add(mesh,x,y,z,sx,sy,sz,angle=0,c=colors.steel,rough=.36,metal=.7,emit=0,cls=1,hit=0,tilt=0){if(this.count++>3800)return;this.groups[mesh].push(x,y,z,angle,sx,sy,sz,cls,...c,rough,metal,emit,hit,tilt);}
  box(x,y,z,sx,sy,sz,a,c,rough=.38,metal=.75,emission=0,cls=1){this.add('box',x,y,z,sx,sy,sz,a,c,rough,metal,emission,cls);}
  shadow(mesh,x,y,a,sx,sy,sz=2.1,lift=18,spread=1,cls=LAYER.SHADOW){const ox=lift*.18,oy=lift*.22;this.add(mesh,x+ox*1.10,y+oy*1.10,-60,sx*spread*1.22,sy*spread*1.12,Math.max(.8,sz*.75),a,SHADOW_B,.94,0,0,cls);this.add(mesh,x+ox,y+oy,-58,sx*spread,sy*spread,sz,a,SHADOW_A,.94,0,0,cls);}
  shipShadow(x,y,a,s=1,lift=24){this.shadow('hull',x,y,a,26*s,18*s,2.2, lift,1.05);this.shadow('hull',x-5*Math.cos(a)*s,y-5*Math.sin(a)*s,a,17*s,11*s,1.6,lift*.82,1.0);}
  bossShadow(x,y,s=1,lift=34){this.shadow('ring',x,y,0,88*s,88*s,2.2,lift,1.0,.06);this.shadow('hex',x,y,0,62*s,62*s,2.6,lift*.92,1.05,.06);}
  enemyShadow(type,x,y,a){if(type==='chaser'||type==='lancer'){this.shadow('hull',x,y,a,18,12,1.8,14,1.0);}else if(type==='spinner'||type==='turret'){this.shadow('hex',x,y,a,17,17,1.6,12,1.0);}else this.shadow('hex',x,y,a,22,22,1.9,16,1.0);} 
  dynamicScenery(w,h,stage=0,seed='TITLE',t=0,bossFx=0,bgAnim=1){
   const accent=[colors.mint,colors.violet,colors.gold][stage];
   const base=[[.10,.24,.28],[.20,.11,.30],[.32,.24,.10]][stage];
   const theme=(hash(seed+':theme:'+stage)%4)>>>0;
   const ringR=Math.min(w,h)*(.29+.02*((hash(seed+':rr:'+stage)%1000)/1000));
   const innerR=ringR*(.63+.06*((hash(seed+':ir:'+stage)%1000)/1000));
   const cx=w/2,cy=h/2;
   const animScale=bgAnim<=0?0:bgAnim===2?1.45:1;
   const glowScale=bgAnim<=0?.58:bgAnim===2?1.35:1;
   const bossScale=bgAnim<=0?.75:bgAnim===2?1.18:1;
   t*=animScale; bossFx*=bossScale;
   for(let i=0;i<(stage===2?3:2);i++){
    const dir=i%2?-1:1,rr=innerR*(.84+.14*i),ang=t*(.10+.05*i)*(1.+bossFx*.9)*dir+i*.7;
    this.add('ring',cx,cy,-18+i*4,rr,rr,2.5+i,ang,accent,.28,.45,.32+.12*i+bossFx*.35,LAYER.TRIM);
   }
   if(stage===0){
    for(let i=0;i<10;i++){
      const a=i*TAU/10+t*.08+(i%2)*.07,rr=innerR*.72,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
      const pulse=.5+.5*Math.sin(t*(1.2+bossFx*.7)+i*.8),hz=42+26*pulse+bossFx*10;
      this.box(x,y,4+hz*.22,10,10,46+hz,a,[.15,.24,.24],.25,.85,0,LAYER.HIGH);
      this.box(x,y,26+hz*.45,5,20,4,a+Math.PI/2,accent,.20,.18,(1.8+.8*pulse+bossFx*1.2)*glowScale,LAYER.MID);
    }
    for(let i=0;i<4;i++){
      const a=i*TAU/4+t*.04,len=innerR*.80;
      this.box(cx,cy,-8,len,5,5,a,[.12,.20,.21],.30,.65,0,LAYER.LOW);
      for(let j=0;j<4;j++){const f=((t*(.22+bossFx*.12)+j*.27+i*.12)%1),px=cx+Math.cos(a)*(f*len-len/2),py=cy+Math.sin(a)*(f*len-len/2);this.add('orb',px,py,-2,2.2,2.2,2.2,0,accent,.14,.08,(2.4+bossFx*.6)*glowScale,LAYER.TRIM);} 
    }
   }else if(stage===1){
    for(let i=0;i<8;i++){
      const side=(i%4)-1.5,vertical=i<4,rise=.5+.5*Math.sin(t*(1.6+bossFx*.8)+i*.7),x=vertical?cx+side*innerR*.34:cx+side*innerR*.62,y=vertical?cy+side*innerR*.62:cy+side*innerR*.34;
      this.box(x,y,12+rise*18,8,8,42+28*rise,0,[.18,.16,.23],.22,.88,0,LAYER.HIGH);
      this.box(x,y,44+rise*26,4,18,4,0,accent,.22,.16,(2.3+bossFx*1.0)*glowScale,LAYER.TRIM);
    }
    for(let lane=0;lane<4;lane++){
      const a=lane<2?0:Math.PI/2,off=(lane%2?1:-1)*innerR*.26,len=innerR*1.18;
      this.box(a===0?cx:cx+off,a===0?cy+off:cy,-12,a===0?len:6,a===0?6:len,4,a,[.11,.09,.19],.28,.78,0,LAYER.LOW);
      for(let j=0;j<5;j++){const f=((t*(.36+bossFx*.18)+j*.19+lane*.11)%1),px=(a===0?cx-len/2+f*len:cx+off),py=(a===0?cy+off:cy-len/2+f*len);this.add('orb',px,py,-5,2.0,2.0,2.0,0,accent,.12,.05,(2.6+bossFx*.7)*glowScale,LAYER.TRIM);} 
    }
   }else{
    for(let i=0;i<12;i++){
      const a=i*TAU/12-t*(.06+bossFx*.04),rr=innerR*.64,lift=.5+.5*Math.sin(t*(1.1+bossFx*.45)+i*.6),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
      this.box(x,y,8+lift*16,11,11,34+26*lift,a,[.24,.20,.14],.22,.82,0,LAYER.MID);
      this.add('orb',x,y,38+lift*18,2.8,2.8,2.8,0,accent,.15,.07,(2.8+bossFx*.9)*glowScale,LAYER.TRIM);
    }
    for(let loop=0;loop<2;loop++){
      const rr=innerR*(.50+.22*loop),count=10+loop*4;
      for(let i=0;i<count;i++){const a=i*TAU/count+t*(loop?-(.18+bossFx*.08):(.14+bossFx*.06)),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;this.add('orb',x,y,-3,1.9+loop*.3,1.9+loop*.3,1.9+loop*.3,0,accent,.12,.04,(2.5+bossFx*.5)*glowScale,LAYER.TRIM);} 
    }
   }
   if(theme===3){for(let i=0;i<6;i++){const a=i*TAU/6+t*(.03+bossFx*.02),rr=ringR*(.88+.03*Math.sin(t+i));this.box(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,18,16,8,22,a,[base[0],base[1],base[2]],.25,.84,.3+bossFx*.4*glowScale,LAYER.MID);}}
   if(bossFx>.05){
    const extra=3+Math.floor(bossFx*3);
    for(let i=0;i<extra;i++){const a=t*(.32+.06*i)+i*TAU/extra,rr=innerR*(.92+.04*i),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;this.add('orb',x,y,-4,2.5,2.5,2.5,0,accent,.10,.02,(2.7+bossFx*1.2)*glowScale,LAYER.TRIM);}
    if(stage===0){
      for(let i=0;i<6;i++){const a=i*TAU/6+t*.22,rr=innerR*(.48+.08*(i%2)),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;this.box(x,y,16,22,5,18,a,accent,.20,.24,(1.2+bossFx*1.4)*glowScale,LAYER.MID);}
      this.add('ring',cx,cy,10,innerR*.58,innerR*.58,3.5,-t*.35,accent,.18,.22,(1.6+bossFx*1.2)*glowScale,LAYER.TRIM);
    }else if(stage===1){
      for(let i=0;i<4;i++){const a=i*TAU/4+Math.PI/4,x=cx+Math.cos(a)*innerR*.52,y=cy+Math.sin(a)*innerR*.52,pulse=.5+.5*Math.sin(t*2.2+i);this.box(x,y,28+18*pulse,10,10,50+22*pulse,a,[.22,.17,.28],.22,.88,0,LAYER.HIGH);this.box(x,y,62+28*pulse,4,18,4,a+Math.PI/2,accent,.18,.16,(1.8+bossFx*1.6)*glowScale,LAYER.TRIM);} 
      this.box(cx,cy,-6,innerR*.96,7,4,t*.38,accent,.18,.15,(1.2+bossFx*.8)*glowScale,LAYER.TRIM);
      this.box(cx,cy,-6,7,innerR*.96,4,-t*.34,accent,.18,.15,(1.2+bossFx*.8)*glowScale,LAYER.TRIM);
    }else{
      for(let i=0;i<2;i++){const rr=innerR*(.44+.22*i);this.add('ring',cx,cy,22+i*10,rr,rr,2.5+i,-t*(.25+.08*i),accent,.16,.22,(1.6+bossFx*1.4)*glowScale,LAYER.TRIM);} 
      for(let i=0;i<8;i++){const a=i*TAU/8-t*.18,rr=innerR*.74,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;this.box(x,y,34,10,10,34,a,[.28,.22,.14],.20,.84,0,LAYER.HIGH);this.add('orb',x,y,58,3.2,3.2,3.2,0,accent,.12,.04,(2.0+bossFx*1.4)*glowScale,LAYER.TRIM);} 
    }
   }
  }
  // Render-only architectural set dressing. Seed changes skyline, ring segmentation, pylons and bridge positions.
  floor(w,h,stage=0,seed='TITLE'){
   const accent=[colors.mint,colors.violet,colors.gold][stage];
   const stageBase=[[.010,.020,.030],[.020,.016,.032],[.028,.022,.016]][stage];
   const r=rng(seed+':'+stage+':scene');
   const theme=(hash(seed+':theme:'+stage)%4)>>>0;this.theme=theme;
   const ringR=Math.min(w,h)*(.30+.04*r());
   const innerR=ringR*(.62+.10*r());
   const edgeInset=26+Math.floor(r()*10);
   const catwalkA=r()*TAU,catwalkB=catwalkA+Math.PI/2+(r()-.5)*.45;
   const towerBand=theme===0?5:theme===1?6:theme===2?4:7;
   const GROUND=LAYER.GROUND,TRIM=LAYER.TRIM,LOW=LAYER.LOW,MID=LAYER.MID,HIGH=LAYER.HIGH,TALL=LAYER.TALL,SKY=LAYER.SKY;
   this.box(w/2,h/2,-84,w+220,h+220,32,0,[stageBase[0]*.8,stageBase[1]*.8,stageBase[2]*.8],.86,.15,0,GROUND);
   this.box(w/2,h/2,-70,w+120,h+120,16,0,[stageBase[0],stageBase[1],stageBase[2]],.76,.18,0,GROUND);

   const cell=88;
   for(let gy=-1;gy<=Math.ceil(h/cell);gy++)for(let gx=-1;gx<=Math.ceil(w/cell);gx++){
    const x=gx*cell+cell/2,y=gy*cell+cell/2;
    const n=hash(seed+':tile:'+stage+':'+gx+':'+gy),v=(n%1000)/1000;
    const dist=Math.hypot(x-w/2,y-h/2),ring=Math.abs(dist-ringR);
    const terrace=clamp(1-ring/150,0,1);
    const bump=((n>>>3)%4)*1.5 + (terrace>.55?6+terrace*8:0);
    const size=cell-6-((n>>>7)%8);
    const col=[stageBase[0]+v*.010,stageBase[1]+v*.012,stageBase[2]+v*.014];
    this.box(x,y,-58+bump*.24,size,size,10+bump,0,col,.46,.58,terrace*.06,GROUND);
    if((n&7)===0&&dist>innerR*.78&&dist<ringR*1.32){const a=((n>>>8)%4)*Math.PI/2;this.box(x,y,-42+bump*.28,size*.42,4,3,a,accent,.28,.18,.65,TRIM);}
   }

   // Peripheral retaining walls and glowing conduits: tall, but at the field edge.
   for(const x of [edgeInset,w-edgeInset]){
    this.box(x,h/2,-26,16,h-20,74,0,[.11,.16,.19],.27,.88,0,HIGH);
    this.box(x+(x<w/2?9:-9),h/2,8,2,h-50,2,0,accent,.25,.15,2.0,TRIM);
   }
   for(const y of [edgeInset,h-edgeInset]){
    this.box(w/2,y,-26,w-20,16,74,0,[.11,.16,.19],.28,.86,0,HIGH);
    this.box(w/2,y+(y<h/2?9:-9),8,w-50,2,2,0,accent,.25,.15,1.8,TRIM);
   }

   // Buttresses / towers around the arena.
   const towerCount=theme===2?10:12;
   for(let i=0;i<towerCount;i++){
    const side=i%4,lane=Math.floor(i/4)+1;let x,y,a=0;
    if(side===0){x=6+r()*18;y=h*(lane/(Math.ceil(towerCount/4)+1));a=.08;}
    else if(side===1){x=w-(6+r()*18);y=h*(lane/(Math.ceil(towerCount/4)+1));a=-.08;}
    else if(side===2){x=w*(lane/(Math.ceil(towerCount/4)+1));y=6+r()*18;a=Math.PI/2;}
    else{x=w*(lane/(Math.ceil(towerCount/4)+1));y=h-(6+r()*18);a=Math.PI/2;}
    const tw=20+12*r(),td=48+22*r(),th=88+50*r();
    this.box(x,y,-5,tw,td,th,a,[.17,.22,.26],.25,.9,0,HIGH);
    this.box(x,y,th*.42,tw*.66,td*.46,10,a,[.42,.48,.52],.28,.84,0,HIGH);
    this.box(x,y,th*.54,tw*.22,td*.18,5,a,accent,.22,.2,2.2,MID);
    if((i+towerBand)%2===0)this.add('orb',x,y,th*.64,4,4,4,0,accent,.2,.1,1.8,MID);
   }

   // Central deck stack and decorative ring machinery: passable below flight height.
   this.add('ring',w/2,h/2,-46,ringR,ringR,10,0,[.045,.058,.069],.56,.78,0,LOW);
   this.add('ring',w/2,h/2,-42,ringR*.965,ringR*.965,2,0,accent.map(v=>v*.040),.60,.7,.18,TRIM);
   this.add('ring',w/2,h/2,-28,innerR,innerR,14,0,[.03,.04,.05],.52,.74,0,LOW);
   this.add('ring',w/2,h/2,-22,innerR*.975,innerR*.975,2,0,accent.map(v=>v*.05),.48,.58,.35,TRIM);
   for(let i=0;i<48;i++){const a=i*TAU/48 + (theme===1?.02*i:0),rr=(i%2?ringR:ringR*.955),x=w/2+Math.cos(a)*rr,y=h/2+Math.sin(a)*rr;this.box(x,y,-34,5,12+(i%4===0?7:0),5,a,[.17,.26,.27],.4,.52,.12,TRIM);}

   if(theme===0){
    // Citadel spires: the shafts are tall, the crowns sit below ship height.
    for(let i=0;i<6;i++){const a=i*TAU/6+r()*.12,rr=innerR*.72,x=w/2+Math.cos(a)*rr,y=h/2+Math.sin(a)*rr,hz=42+22*r();
      this.box(x,y,-6,18,18,56+hz,a,[.18,.22,.26],.24,.9,0,HIGH);this.box(x,y,28+hz*.48,9,9,14,a,accent,.22,.25,2.2,MID);} 
   }else if(theme===1){
    // Foundry gantries: catwalks are under the player's nominal flight layer.
    for(const a of [catwalkA,catwalkB]){const dx=Math.cos(a),dy=Math.sin(a);this.box(w/2,h/2,-2,innerR*1.28,16,14,a,[.15,.20,.24],.27,.82,0,LOW);
      for(let j=-2;j<=2;j++){const px=w/2+dx*j*innerR*.28,py=h/2+dy*j*innerR*.28;this.box(px,py,22,8,8,54,a,[.16,.21,.25],.24,.88,0,HIGH);this.box(px,py,46,3,20,3,a+Math.PI/2,accent,.24,.18,1.2,TRIM);}}
   }else if(theme===2){
    // Sanctum dais.
    this.box(w/2,h/2,-10,innerR*1.05,innerR*.55,16,.0,[.14,.18,.24],.32,.76,0,LOW);
    this.box(w/2,h/2,-2,innerR*.82,innerR*.34,14,.0,[.18,.22,.28],.30,.82,0,LOW);
    for(let i=0;i<8;i++){const a=i*TAU/8,rr=innerR*.5,x=w/2+Math.cos(a)*rr,y=h/2+Math.sin(a)*rr;this.box(x,y,20,10,24,58,a,[.15,.2,.24],.24,.88,0,TALL);this.add('orb',x,y,52,4.5,4.5,4.5,0,accent,.18,.12,2.4,MID);}    
   }else{
    // Drydock / shipyard ribs.
    const bands=6+Math.floor(r()*3);for(let i=0;i<bands;i++){const off=(i-(bands-1)/2)*innerR*.22;this.box(w/2+off,h/2,-12,12,innerR*1.25,18,0,[.13,.19,.23],.26,.84,0,LOW);this.box(w/2+off,h/2,18,4,innerR*1.20,3,0,accent,.22,.16,1.2,TRIM);}
    for(let i=0;i<4;i++){const side=i<2?-1:1,y=h*(.28+.16*(i%2));this.box(w/2+side*innerR*.63,y,10,18,28,62,0,[.16,.21,.25],.24,.88,0,HIGH);this.box(w/2+side*innerR*.63,y,46,5,16,4,0,accent,.24,.16,1.7,TRIM);} 
   }
   // Stronger stage differentiation: each stage gets unmistakable static silhouettes.
   if(stage===0){
    for(let i=0;i<3;i++){const y=h*(.24+.26*i);this.box(w*.16,y,-8,16,26,120,.06,[.13,.20,.22],.24,.90,0,HIGH);this.box(w*.84,y,-8,16,26,120,-.06,[.13,.20,.22],.24,.90,0,HIGH);this.box(w*.16,y,58,6,18,5,0,accent,.22,.20,2.1,MID);this.box(w*.84,y,58,6,18,5,0,accent,.22,.20,2.1,MID);} 
   }else if(stage===1){
    for(let i=0;i<5;i++){const x=w*(.18+.16*i);this.box(x,h*.18,-4,12,34,92,0,[.18,.14,.22],.24,.88,0,HIGH);this.box(x,h*.82,-4,12,34,92,0,[.18,.14,.22],.24,.88,0,HIGH);} 
    this.box(w/2,h*.22,24,w*.46,10,10,0,accent,.24,.16,1.4,TRIM);this.box(w/2,h*.78,24,w*.46,10,10,0,accent,.24,.16,1.4,TRIM);
   }else if(stage===2){
    const rr=innerR*.94;for(let i=0;i<8;i++){const a=i*TAU/8,x=w/2+Math.cos(a)*rr,y=h/2+Math.sin(a)*rr;this.box(x,y,18,20,20,72,a,[.22,.18,.13],.23,.84,0,HIGH);this.add('orb',x,y,60,4.2,4.2,4.2,0,accent,.16,.08,2.8,MID);} 
   }

   // Seeded external skyline: too tall to overfly at the nominal gameplay altitude.
   const skyline=8+Math.floor(r()*6);
   for(let i=0;i<skyline;i++){
    const a=i*TAU/skyline+(r()-.5)*.24,rr=ringR+70+r()*90,x=w/2+Math.cos(a)*rr,y=h/2+Math.sin(a)*rr;
    const w0=16+20*r(),d0=18+30*r(),h0=80+100*r();
    this.box(x,y,-18,w0,d0,h0,a,[.12,.16,.20],.26,.86,0,HIGH);
    this.box(x,y,h0*.45,w0*.44,d0*.44,10,a,[.43,.46,.49],.26,.78,0,HIGH);
    if((i+theme)%2===0)this.box(x,y,h0*.56,w0*.16,d0*.16,4,a,accent,.2,.12,2.0,TALL);
   }
  }
  ship(x,y,a,s=1,t=0,dash=false,ghost=false){const c=ghost?[.15,.42,.47]:colors.silver,cls=ghost?LAYER.FLIGHT:LAYER.FLIGHT_HIGH;this.shipShadow(x,y,a,s,ghost?16:24);
   this.add('hull',x,y,14,21*s,20*s,13*s,a,c,.24,.80,ghost?.35:0,cls,0,Math.sin(t*2)*.04);
   const part=(dx,dy,z,mesh,sx,sy,sz,col,em=0,rot=0)=>this.add(mesh,x+(dx*Math.cos(a)-dy*Math.sin(a))*s,y+(dx*Math.sin(a)+dy*Math.cos(a))*s,z,sx*s,sy*s,sz*s,a+rot,col,.23,.76,em,cls);
   for(const side of [-1,1]){part(-8,side*13,8,'hull',18,9,5,colors.steel,0,-side*.21);part(-12,side*17,12,'box',12,2.5,3,colors.mint,2);part(-15,side*10,10,'hex',4,4,7,colors.steel);part(-20,side*10,10,'hull',dash?30:10+Math.sin(t*40)*2,3,3,colors.mint,3,Math.PI);}   
   part(1,0,23,'hull',9,8,6,[.08,.40,.43],.7);part(2,0,27,'orb',2.7,2.7,2.7,[.9,1,.93],2.0);
  }
  boss(e,stage=0,t=0,s=1){const color=[colors.red,colors.violet,colors.gold][stage],x=e.x,y=e.y,a=e.rot??t*.15,n=stage===0?6:stage===1?4:8,cls=LAYER.FLIGHT_HIGH;this.bossShadow(x,y,s,34*s);
   this.add('hex',x,y,9,40*s,40*s,24*s,-a*.4,colors.dark,.26,.82,0,cls);
   this.add('ring',x,y,16,48*s,48*s,18*s,a,colors.silver,.22,.9,0,cls);
   this.add('ring',x,y,28,32*s,32*s,5*s,-a,color,.22,.6,.9,cls);
   this.add('hex',x,y,26,25*s,25*s,27*s,-a,colors.steel,.26,.8,0,cls,e.hit>0?.8:0);
   this.add('orb',x,y,43,11*s,11*s,8*s,0,color,.16,.55,2.3+Math.sin(t*4)*.3,cls);
   for(let i=0;i<n;i++){const ang=a+i*TAU/n,r0=(61+Math.sin(t+i)*3)*s,px=x+Math.cos(ang)*r0,py=y+Math.sin(ang)*r0;
    this.box(px,py,14,37*s,20*s,24*s,ang,colors.steel,.29,.86,0,cls);this.box(px,py,30,22*s,12*s,7*s,ang,colors.silver,.3,.88,0,cls);
    this.box(x+Math.cos(ang)*83*s,y+Math.sin(ang)*83*s,15,23*s,10*s,18*s,ang,color,.24,.78,.25,cls);
    this.box(x+Math.cos(ang)*86*s,y+Math.sin(ang)*86*s,26,12*s,3*s,3*s,ang,color,.22,.4,2.4,cls);
    if(e.phase>0)this.add('orb',x+Math.cos(ang)*101*s,y+Math.sin(ang)*101*s,12,3*s,3*s,4*s,0,color,.25,.2,2.5,cls);
   }
  }
  enemy(e,t,p){if(e.spawn>0)return;const a=e.type==='chaser'?Math.atan2(p.y-e.y,p.x-e.x):e.rot,c=e.type==='spinner'?colors.violet:e.type==='lancer'?[.92,.22,.56]:e.type==='turret'?colors.gold:colors.red,cls=LAYER.FLIGHT;this.enemyShadow(e.type,e.x,e.y,a);
   if(e.type==='chaser'||e.type==='lancer'){this.add('hull',e.x,e.y,9,18,22,15,a,colors.steel,.3,.8,0,cls,e.hit>0?.6:0);this.add('hull',e.x,e.y,18,10,8,5,a,c,.24,.6,1,cls);for(const dir of [-1,1]){const dx=-8,dy=dir*12;this.box(e.x+dx*Math.cos(a)-dy*Math.sin(a),e.y+dx*Math.sin(a)+dy*Math.cos(a),6,11,5,8,a,c,.25,.7,.3,cls);}}
   else{const r=e.type==='warden'?23:17;this.add('hex',e.x,e.y,10,r,r,20,a,colors.steel,.3,.85,0,cls,e.hit>0?.6:0);this.add('hex',e.x,e.y,21,r*.7,r*.7,8,-a,c,.22,.8,.3,cls);this.add('orb',e.x,e.y,28,5,5,5,0,c,.2,.2,2,cls);for(let i=0;i<4;i++){const b=a+i*TAU/4;this.box(e.x+Math.cos(b)*r,e.y+Math.sin(b)*r,15,12,5,8,b,colors.silver,.3,.9,0,cls);}}
  }
  build(frame){
   for(const k in this.groups)this.groups[k].length=0;this.count=0;let {world,w,h,t}=frame;const title=!world;
   const seedKey=title?'TITLE':String(world.seed||'SEEDLESS');
   const stage=world?Math.min(world.stage,2):0;
   const key=[w,h,stage,seedKey].join(':');
   if(this.staticKey!==key){this.floor(w,h,stage,seedKey);this.staticGroups={};for(const k in this.groups)this.staticGroups[k]=this.groups[k].slice();this.staticKey=key;}else for(const k in this.groups)this.groups[k].push(...this.staticGroups[k]);
   const bossEntity=world&&world.enemies?world.enemies.find(e=>e.type==='boss'&&e.spawn<=0):null;
   const bossFx=bossEntity?clamp(0.45+(1-bossEntity.hp/Math.max(1,bossEntity.maxHp||bossEntity.hp))*0.55,0,1):0;
   const bgAnim=frame.bgAnim??1;
   this.dynamicScenery(w,h,stage,seedKey,t,bossFx,bgAnim);
   if(title){const s=frame.mobile?1.9:2.15,x=frame.mobile?w*.52:w*.72,y=frame.mobile?h*.40:h*.46;this.boss({x,y,rot:t*.15,phase:1},0,t,s);this.ship(frame.mobile?w*.49:w*.715,frame.mobile?h*.79:h*.81,-Math.PI/2+.12,frame.mobile?1.5:1,t);} 
   else{for(const e of world.enemies)if(e.type==='boss')this.boss(e,Math.min(world.stage,2),t);else this.enemy(e,t,world.p);
    if(world.upgrades.echo)for(let j=1;j<=world.upgrades.echo;j++){const hist=world.history.find(v=>v.t>=world.time-j*.55);if(hist)this.ship(hist.x,hist.y,hist.a,1,t,false,true);}    
    this.ship(world.p.x,world.p.y,world.p.angle,1,t,world.p.dash>0);
    const p=world.p;for(let i=0;i<(world.upgrades.orbit||0);i++){const a=world.time*1.8+i*TAU/world.upgrades.orbit;this.add('hex',p.x+Math.cos(a)*45,p.y+Math.sin(a)*45,10,7,7,10,a,colors.mint,.25,.7,.6,LAYER.FLIGHT_HIGH);}   
   }
   this.count=Object.values(this.groups).reduce((s,a)=>s+a.length/STRIDE,0);return this.groups;
  }
 }
 return {shapes,Scene,STRIDE,colors,hash,rng,clamp,LAYER};
});
