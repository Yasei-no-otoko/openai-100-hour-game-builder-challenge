/* NEMESIS PACT — presentation, input, local save, procedural rendering. */
(function(){'use strict';
  const C=window.PactCore,$=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:true});
  if(!C||!ctx){$('fatal').hidden=false;$('fatal-message').textContent='Could not initialize the game engine or Canvas.';return;}
  const {TAU,clamp,BOSSES,CONTRACTS,UPGRADES,SECTORS}=C;
  let W=C.W,H=C.H;
  let gpuActive=false;
  const gpu=new window.PactGPU.Renderer($('stage'),{onStatus:s=>{const el=$('renderer-status');if(el)el.textContent=s.backend;}});
  window.NEMESIS_RENDERER=gpu;
  const sound=new window.PactSound(),keys=new Set(),pressed=new Set();
  const mouse={x:W/2,y:240,down:false},screens=['menu','loadout','choices','pause','help-screen','settings-screen','result','confirm-screen'];
  let world=null,screen='menu',previousScreen='menu',difficulty='standard',pauseFrom='game',last=0,accum=0,clock=0,shake=0,flash=0,freeze=0;
  let effects=[],particles=[],trails=[],announceTime=0,toastTime=0,uiTimer=0,trainingStep=0,trainingMoved=0,lastWorldPhase='',muted=false,oldPad=[],oldAxes=[0,0];
  let resultSaved=false,renderFrames=0,screenScale=1;
  let mobile=false,touch=null,lastLayout=null,selectedChoice=null,confirmAction=null;
  let view={scale:1,x:0,y:0,width:1280,height:800,field:{x:0,y:0,width:1280,height:800}};
  const storage={read(key,fallback){try{const a=JSON.parse(localStorage.getItem(key));return a??fallback;}catch(_){return fallback;}},write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}};
  const savedSettings=storage.read('nemesis.settings.v1',{});
  const initial=savedSettings&&typeof savedSettings==='object'&&!Array.isArray(savedSettings)?savedSettings:{};
  const level=v=>Number.isFinite(v)?Math.max(0,Math.min(2,Math.round(v))):1;
  const effectLabel=v=>v===0?'OFF':v===2?'HIGH':'STANDARD';
  const opts={volume:Number.isFinite(initial.volume)?clamp(initial.volume,0,1):.55,music:initial.music!==false,reduced:initial.reduced===true||(!('reduced'in initial)&&matchMedia('(prefers-reduced-motion: reduce)').matches),postfx:level(initial.postfx),bloom:level(initial.bloom),bganim:level(initial.bganim),autofire:initial.autofire===true,autoaim:initial.autoaim===true,lefthanded:initial.lefthanded===true,sensitivity:Number.isFinite(initial.sensitivity)?clamp(initial.sensitivity,.7,1.4):1};
  const starRng=C.rng('NEMESIS-STARS-1'),stars=Array.from({length:130},()=>({x:starRng()*W,y:starRng()*H,r:starRng()*1.3+.3,z:starRng(),phase:starRng()*TAU}));
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function refreshView(){
    const r=$('stage').getBoundingClientRect();view.width=r.width;view.height=r.height;
    if(mobile){const f=$('playfield').getBoundingClientRect();view.field={x:f.left-r.left,y:f.top-r.top,width:Math.max(1,f.width),height:Math.max(1,f.height)};}
    else view.field={x:0,y:0,width:r.width,height:r.height};
    const f=view.field;view.scale=Math.min(f.width/W,f.height/H);view.x=f.x+(f.width-W*view.scale)/2;view.y=f.y+(f.height-H*view.scale)/2;
  }
  function resize(){
    mobile=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0||innerWidth<760;
    const landscape=innerWidth>innerHeight,layout=(mobile?'touch':'desktop')+(landscape?'-wide':'-tall');
    const changed=lastLayout!==null&&layout!==lastLayout;lastLayout=layout;
    document.body.classList.toggle('mobile-ui',mobile);document.body.classList.toggle('touch-landscape',mobile&&landscape);
    if(!mobile){const width=Math.min(innerWidth,innerHeight*C.W/C.H),height=width*C.H/C.W;screenScale=width/C.W;$('stage').style.width=width+'px';$('stage').style.height=height+'px';$('ui').style.transform=`scale(${screenScale})`;}
    else{$('stage').style.width='';$('stage').style.height='';$('ui').style.transform='';}
    const r=$('stage').getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));
    refreshView();$('touch-controls').hidden=!(mobile&&screen==='game');
    if(changed){clearInput();if(world&&screen==='game'){show('pause');$('pause-reason').textContent='Screen rotated. The game is paused. Resume when ready.';}}
  }
  function clearInput(){keys.clear();pressed.clear();mouse.down=false;touch?.clear();}
  function show(name){
    screen=name;document.body.dataset.screen=name;document.body.dataset.training=String(!!world?.training);clearInput();for(const id of screens)$(id).hidden=id!==name;
    $('touch-controls').hidden=!(mobile&&name==='game');if($(name))$(name).scrollTop=0;
    if(name==='pause'){$('pause-reason').textContent='The battlefield is paused.';$('pause-breach').disabled=!world?.pact||world.broken||world.training;}
    $('hud').hidden=!world||name==='menu'||name==='loadout'||(mobile&&name!=='game');$('tutorial-hud').hidden=!(world?.training&&name==='game');
    if(name!=='game'){$('announcement').classList.remove('visible');$('toast').classList.remove('visible');announceTime=0;toastTime=0;}
    if(name!=='game'&&!mobile){const button=$(name)?.querySelector('button:not([disabled])');if(button)button.focus({preventScroll:true});}else document.activeElement?.blur();
    refreshView();
    accum=0;
  }
  function home(){world=null;W=C.W;H=C.H;effects=[];particles=[];trails=[];lastWorldPhase='';show('menu');updateBest();resize();}
  function updateBest(){const scores=storage.read('nemesis.scores.v1',[]);const best=Array.isArray(scores)?Math.max(0,...scores.filter(s=>s&&Number.isFinite(s.score)).map(s=>s.score)):0;$('best-score').textContent=best?'BEST '+best.toLocaleString('en-US'):'BEST —';}
  function syncSettings(){
    $('volume').value=Math.round(opts.volume*100);for(const name of ['music','reduced','autofire','autoaim','lefthanded'])$(name).checked=opts[name];
    $('sensitivity').value=Math.round(opts.sensitivity*100);
    $('postfx').value=opts.postfx;$('bloom').value=opts.bloom;$('bganim').value=opts.bganim;
    $('postfx-value').textContent=effectLabel(opts.postfx);$('bloom-value').textContent=effectLabel(opts.bloom);$('bganim-value').textContent=effectLabel(opts.bganim);
    document.body.classList.toggle('lefthanded',opts.lefthanded);
    document.body.classList.toggle('reduced',opts.reduced);sound.settings(opts.volume,opts.music,muted);
  }
  function openSettings(){previousScreen=screen;show('settings-screen');syncSettings();}
  function openHelp(){previousScreen=screen;show('help-screen');}
  function announcement(kicker,title,sub='',duration=2.2){$('announce-kicker').textContent=kicker;$('announce-title').textContent=title;$('announce-sub').textContent=sub;announceTime=duration;$('announcement').classList.add('visible');}
  function toast(text,color='#78e8d0'){if(screen!=='game')return;$('toast').textContent=text;$('toast').style.color=color;toastTime=1.45;$('toast').classList.add('visible');}
  function randomSeed(){let v;try{v=crypto.getRandomValues(new Uint32Array(1))[0];}catch(_){v=Math.floor(Math.random()*0xffffffff);}return 'NP-'+v.toString(36).toUpperCase();}
  function start(training=false,seed=null){sound.unlock();
    // Portrait height follows the available playfield at launch, not total
    // viewport height. A run's geometry stays immutable through rotation.
    $('boss-hud').hidden=true;refreshView();
    const arena=mobile?{layout:'portrait',height:720*view.field.height/view.field.width}:{};
    if(touch){touch.lastX=0;touch.lastY=-1;}
    world=new C.World(seed||$('seed').value.trim()||randomSeed(),difficulty,training,arena);W=world.width;H=world.height;refreshView();lastWorldPhase='';effects=[];particles=[];trails=[];shake=flash=freeze=0;resultSaved=false;trainingStep=trainingMoved=0;
    if(training){show('game');updateTraining();announcement('FLIGHT SCHOOL','First, take flight.','Enemy attacks cannot hurt you here.',2.4);}
    else choiceScreen();updateHUD();}
  function choiceScreen(){
    const pact=world.phase==='pact';selectedChoice=null;show('choices');lastWorldPhase=world.phase;
    $('choice-confirm').disabled=true;$('choice-confirm').textContent=pact?'Choose a pact':'Choose an upgrade';$('choice-selection').textContent='Tap a card to compare';
    const b=BOSSES[world.stage];$('choices').style.setProperty('--choice-color',pact?b.color:'#78e8d0');
    $('choice-kicker').textContent=pact?`SECTOR 0${world.stage+1} / ${b.name}`:'SALVAGE COMPLETE / BUILD YOUR ANSWER';
    $('choice-title').textContent=pact?'Make your terms.':'Choose your edge.';
    $('choice-description').textContent=pact?(mobile?`${b.quote} Weigh the benefit against the price.`:`${b.quote} Choose the terms your enemy must accept.`):'Upgrades last for this run. Collect repeats to stack their effects.';
    $('choice-footer').textContent=pact?(mobile?'Lasts for this sector. Break it from the pause menu.':'Lasts for this sector. Press Q to break it, at a price.'):`HULL ${world.p.hp}/${world.p.maxHp} / NEXT: ${world.wave===1?'BOSS FIGHT':'WAVE II'}`;
    const list=pact?world.offersForPact():world.offers;$('choice-cards').replaceChildren();
    list.forEach((item,i)=>{const el=document.createElement('button');el.className='choice-card'+(pact?' pact-card':' upgrade-card');el.dataset.id=item.id;el.style.setProperty('--card-color',item.color||'#78e8d0');
      el.innerHTML=`<span class="choice-number">0${i+1}</span><span class="choice-icon">${item.icon}</span><span class="en">${item.label||item.en}</span><h3>${item.name}${!pact&&world.upgrades[item.id]?` <small>+${world.upgrades[item.id]+1}</small>`:''}</h3>`+
        (pact?`<p class="quote">${item.line}</p><p class="choice-gift">＋ ${item.gift}</p><p class="choice-cost">− ${item.cost}</p><p class="choice-tip">${mobile&&item.id==='mirror'?'Tap PARRY to return enemy fire.':item.tip}</p>`:
        `<p class="quote">${item.desc}</p><p class="choice-gift">${item.tag}</p><p class="choice-tip">${item.max===1?'One-time upgrade':item.max<10?`Stack up to ${item.max} times`:'Immediately restore full hull'}</p>`);
      el.setAttribute('aria-pressed','false');el.onclick=()=>mobile?selectChoice(item.id):choose(item.id);$('choice-cards').append(el);});
    if(!mobile)$('choice-cards').firstElementChild?.focus({preventScroll:true});
  }
  function selectChoice(id){
    if(screen!=='choices')return;const list=world.phase==='pact'?world.offersForPact():world.offers,item=list.find(x=>x.id===id);if(!item)return;
    selectedChoice=id;for(const card of $('choice-cards').children){const on=card.dataset.id===id;card.classList.toggle('selected',on);card.setAttribute('aria-pressed',String(on));}
    $('choice-selection').textContent=item.name+' selected';$('choice-confirm').disabled=false;
    $('choice-confirm').textContent=world.phase==='pact'?'Sign this pact →':'Equip this upgrade →';
  }
  function requestConfirmation(action){
    if(!world||screen!=='pause')return;if(action==='breach'&&(!world.pact||world.broken||world.training))return;
    confirmAction=action;$('confirm-title').textContent=action==='breach'?'Break your pact?':'End this run?';
    $('confirm-description').textContent=action==='breach'?'Restore 1 hull and clear enemy bullets and lasers. Lose all pact effects; enemy attack rate rises 25%. This cannot be undone.':'Progress in this run will be lost. Saved scores and settings are kept.';
    $('confirm-yes').textContent=action==='breach'?'Break pact & resume':'End run';show('confirm-screen');
  }
  function choose(id){if(screen!=='choices')return;const success=world.phase==='pact'?world.sign(id):world.chooseUpgrade(id);if(!success)return;show('game');lastWorldPhase='combat';consumeEvents();updateHUD();}
  function togglePause(){if(!world)return;if(screen==='game'){pauseFrom='game';show('pause');}else if(screen==='pause')show(pauseFrom);}
  function results(){
    show('result');const won=world.phase==='won',kept=world.contracts.filter(c=>c.kept).length;
    $('result-kicker').textContent=won?'THE LAST SIGNATURE / '+(world.breaches===0?'PACT KEEPER':world.breaches===3?'OATHBREAKER':'SURVIVOR'):'SIGNAL LOST / NOT THE END';
    $('result-title').innerHTML=won?(world.breaches===0?'A promise.<br>A new dawn.':world.breaches===3?'No chains.<br>No masters.':'Scarred.<br>Still flying.'):'One more run.<br>One step further.';
    $('result-story').textContent=won?(world.breaches===0?'The last king lowered his weapon. “Not once? You never broke your word?” You offered no answer. Only a turn toward the dawn.':world.breaches===3?'Every pact is ash. The sky is free, and no words remain to bind your name.':'Some promises were broken. Others survived. As the last bullet faded from the sky, you kept flying.'):'Every defeat leaves a lesson. Try a different pact. Build a different answer. When there is no room to dodge, return fire with a parry.';
    $('result-score').textContent=world.score.toLocaleString('en-US');const rank=won?(world.score>34000?'S':world.score>23000?'A':'B'):'—';$('result-rank').textContent='RANK '+rank;
    const stats=[['TIME',formatTime(world.time)],['BOSSES',`${world.bossKills} / 3`],['ELIMINATIONS',world.kills],['REFLECTIONS',world.parries],['GRAZES',world.grazes],['PACTS KEPT',`${kept} / ${world.contracts.length}`]];
    $('result-stats').innerHTML=stats.map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('');
    $('result-pacts').innerHTML=world.contracts.map(c=>`<div class="result-pact ${c.kept?'':'broken'}"><span>0${c.stage+1} / ${CONTRACTS.find(x=>x.id===c.id).name}</span><small>${c.kept?'KEPT':'BROKEN'}</small></div>`).join('');
    $('result-build').textContent=Object.entries(world.upgrades).map(([id,n])=>UPGRADES.find(x=>x.id===id).name+(n>1?' ×'+n:'')).join(' / ')||'No upgrades collected yet.';
    $('result-seed').textContent=`SEED ${world.seed} · ${(world.difficulty==='assist'?'STORY':world.difficulty.toUpperCase())}`;
    if(!resultSaved){const saved=storage.read('nemesis.scores.v1',[]),scores=Array.isArray(saved)?saved.filter(x=>x&&Number.isFinite(x.score)):[];scores.push(world.report());scores.sort((a,b)=>b.score-a.score);storage.write('nemesis.scores.v1',scores.slice(0,12));resultSaved=true;}
  }
  function formatTime(t){return Math.floor(t/60).toString().padStart(2,'0')+':'+Math.floor(t%60).toString().padStart(2,'0');}
  function updateHUD(){if(!world)return;const p=world.p,b=world.enemies.find(e=>e.type==='boss');
    $('sector-label').textContent=world.training?'FLIGHT SCHOOL':`${mobile?'':'SECTOR '}0${Math.min(world.stage+1,3)} / ${SECTORS[Math.min(world.stage,2)]}`;
    $('hearts').innerHTML=Array.from({length:p.maxHp},(_,i)=>`<i class="heart ${i<p.hp?'on':''}"></i>`).join('');$('hearts').parentElement.classList.toggle('critical',p.hp<=2);
    $('score').textContent=String(world.score).padStart(6,'0');$('combo').textContent=world.combo>=5?'×'+(1+Math.floor(world.combo/5)*.25).toFixed(2):'';
    const wasBossVisible=!$('boss-hud').hidden;$('boss-hud').hidden=!b;if(wasBossVisible!==!!b)refreshView();if(b){$('boss-name').textContent=BOSSES[world.stage].name;$('boss-phase').textContent=`PHASE 0${b.phase+1}`;$('boss-health').style.width=clamp(b.hp/b.maxHp*100,0,100)+'%';$('boss-health').style.background=BOSSES[world.stage].color;}
    const pact=CONTRACTS.find(c=>c.id===world.pact);$('pact-name').textContent=pact?pact.name:'TRAINING';$('pact-state').textContent=world.broken?'BROKEN / Attack rate +25%':world.ceasefire?'CEASEFIRE / FIRE PAUSED':pact?(mobile?pact.hud:pact.gift):'NO DAMAGE';$('pact-state').style.color=world.broken?'#ff746c':world.ceasefire?'#c8afff':'#78e8d0';
    $('wave-label').textContent=world.training?'PRACTICE':world.wave===2?'NEMESIS ENCOUNTER':`WAVE 0${world.wave+1} / 02`;
    const progress=b?1-b.hp/b.maxHp:world.wavePlan.length?clamp((world.planIndex-world.enemies.length)/world.wavePlan.length,0,1):0;$('wave-progress').style.width=(progress*100)+'%';
    $('dash-meter').style.width=(1-clamp(p.dashCd/world.dashCooldown(),0,1))*100+'%';$('parry-meter').style.width=(1-clamp(p.parryCd/world.parryCooldown(),0,1))*100+'%';
    $('dash-status').textContent=p.dashCd>0?p.dashCd.toFixed(1)+'s':'READY';$('parry-status').textContent=p.parryCd>0?p.parryCd.toFixed(1)+'s':'READY';$('dash-ability').classList.toggle('cool',p.dashCd>0);$('parry-ability').classList.toggle('cool',p.parryCd>0);
    const ready=p.energy>=world.novaCost();$('energy-num').textContent=Math.floor(p.energy)+' / '+world.novaCost();$('energy-meter').style.width=Math.min(100,p.energy/world.novaCost()*100)+'%';$('nova-ability').classList.toggle('ready',ready);
    $('breach-ability').classList.toggle('used',world.broken||world.training);$('breach-status').textContent=world.broken?'BROKEN':world.training?'DISABLED':'BREAK PACT';
    $('build-hud').innerHTML=Object.entries(world.upgrades).filter(([id])=>id!=='repair').map(([id,n])=>{const u=UPGRADES.find(x=>x.id===id);return `<span class="build-chip" title="${u.name} ×${n}">${u.icon}${n>1?`<small>${n}</small>`:''}</span>`;}).join('');
    if(mobile){
      $('touch-energy').textContent=Math.floor(Math.min(100,p.energy/world.novaCost()*100))+'%';
      $('touch-energy-meter').style.width=Math.min(100,p.energy/world.novaCost()*100)+'%';
      $('touch-nova').classList.toggle('ready',ready);$('touch-nova').setAttribute('aria-disabled',String(!ready));
      $('touch-nova').setAttribute('aria-label',ready?'Nova ready':'Nova charging: '+Math.floor(p.energy)+' / '+world.novaCost());
      for(const action of ['dash','parry']){
        const cd=action==='dash'?p.dashCd:p.parryCd,max=action==='dash'?world.dashCooldown():world.parryCooldown();
        $('touch-'+action).setAttribute('aria-disabled',String(cd>0));
        $('touch-'+action+'-state').textContent=cd>0?cd.toFixed(1)+'s':'READY';
        $('touch-'+action+'-meter').style.width=(1-clamp(cd/max,0,1))*100+'%';
      }
    }
  }
  const lessons=[
    ['01 / MOVE','Move your ship with WASD or the arrow keys.'],
    ['02 / AIM & FIRE','Aim with the mouse and hold left-click. Hold J for automatic aim.'],
    ['03 / SLIP THROUGH','Press SPACE while moving. Dash through bullets and lasers unharmed.'],
    ['04 / RETURN FIRE','Press E or right-click as bullets approach. Reflect the whole barrage.'],
    ['05 / CLEAR THE SKY','Energy is full. Press F to unleash Supernova.'],
    ['READY / MAKE IT YOURS','Keep practicing, or exit training and choose your first pact.']
  ];
  const touchLessons=[
    ['01 / SLIDE TO MOVE','Slide on the movement pad or battlefield. Aiming and firing are automatic.'],
    ['02 / DASH THROUGH','Tap DASH while moving. Briefly pass through bullets and lasers unharmed.'],
    ['03 / RETURN FIRE','Tap PARRY as bullets approach. Use your other finger to keep moving.'],
    ['04 / CLEAR THE SKY','Energy is full. Tap NOVA to clear enemy fire.'],
    ['READY / MAKE IT YOURS','Keep practicing, or exit training and choose your first pact.']
  ];
  function updateTraining(){const l=mobile?touchLessons[Math.min(trainingStep,4)]:lessons[Math.min(trainingStep,5)];$('tutorial-title').textContent=l[0];$('tutorial-detail').textContent=l[1];}
  function fxRing(x,y,color,r=150,time=.5){effects.push({type:'ring',x,y,color,r,life:time,max:time});}
  function burst(x,y,n,color,speed=180){for(let i=0;i<n;i++){if(particles.length>=650)particles.shift();const a=Math.random()*TAU,v=(.2+Math.random())*speed,life=.25+Math.random()*.6;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life,max:life,r:1+Math.random()*2.7,color});}}
  function consumeEvents(){
    if(!world)return;for(const e of world.takeEvents()){
      sound.effect(e.type,e);
      gpu.event(e,world.p.x,world.p.y,W,H);
      switch(e.type){
        case 'wave':if(world.wave!==2)announcement(`SECTOR 0${world.stage+1} / ${SECTORS[world.stage]}`,`WAVE 0${world.wave+1}`,world.wave===0?(mobile?'Slide to move. Tap PARRY to return fire.':'FIRE: Left-click / J     PARRY: Right-click / E'):'New upgrades. A new wave. Make them count.',2.3);break;
        case 'boss':announcement('NEMESIS ENCOUNTER',BOSSES[e.stage].name,BOSSES[e.stage].quote,2.8);shake=8;break;
        case 'boss-phase':fxRing(world.enemies.find(x=>x.type==='boss')?.x||640,240,'#ff746c',370,.7);toast('PHASE SHIFT / NEW PATTERN','#ffbf77');break;
        case 'kill':{const color=e.kind==='boss'?BOSSES[e.stage].color:e.kind==='spinner'?'#c8aaff':'#ff8676';burst(e.x,e.y,e.kind==='boss'?90:21,color,e.kind==='boss'?330:180);fxRing(e.x,e.y,color,e.kind==='boss'?420:75,e.kind==='boss'?.9:.35);shake=Math.max(shake,e.kind==='boss'?16:3);if(e.kind==='boss'){freeze=opts.reduced?0:.10;flash=.14;}}break;
        case 'hit':if(e.kind!=='shot'){effects.push({type:'text',x:e.x+(Math.random()-.5)*35,y:e.y-25,text:String(Math.round(e.damage)),color:e.kind==='reflect'?'#ffe0a3':'#9bf8e4',life:.65,max:.65});}break;
        case 'dash':trails.push({x:e.x,y:e.y,a:e.a,life:.23,max:.23});burst(e.x,e.y,8,'#78e8d0',70);break;
        case 'parry-start':fxRing(e.x,e.y,'#78e8d0',74,.24);break;
        case 'reflect':burst(e.x,e.y,5,e.perfect?'#ffdf8e':'#78e8d0',140);if(e.perfect){shake=Math.max(shake,2);toast('PERFECT REFLECT','#ffdf8e');}break;
        case 'hurt':shake=11;flash=.19;burst(e.x,e.y,22,'#ff746c',240);fxRing(e.x,e.y,'#ff746c',130,.38);break;
        case 'nova':shake=17;flash=.25;fxRing(e.x,e.y,'#bcfff1',1100,.85);burst(e.x,e.y,90,'#aaffdf',460);toast('SUPERNOVA / '+e.count+' BULLETS ERASED');break;
        case 'breach':shake=18;flash=.25;fxRing(world.p.x,world.p.y,'#ffae7a',1100,1);announcement('THE PRICE OF SURVIVAL','PACT BROKEN','Pact effects lost. Enemy attack rate +25%.',2.3);break;
        case 'heal':fxRing(e.x,e.y,'#98eaa2',60,.6);break;
        case 'silence':toast('CEASEFIRE / THE WORLD HOLDS ITS BREATH','#c8afff');break;
        case 'graze':if(renderFrames%5===0)burst(e.x,e.y,1,'#789eaa',20);break;
      }
      if(world.training){
        const expected=mobile?[null,'dash','reflect','nova'][trainingStep]:[null,'shoot','dash','reflect','nova'][trainingStep];if(expected&&e.type===expected){trainingStep++;sound.effect('heal');updateTraining();}
      }
    }
    if(effects.length>160)effects.splice(0,effects.length-160);
  }
  // --- Canvas artwork. Every sprite, particle and background is drawn locally. ---
  function path(points,fill,stroke=null,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function poly(x,y,r,n,a=0,fill=null,stroke=null,width=1){const p=[];for(let i=0;i<n;i++)p.push([x+Math.cos(a+i*TAU/n)*r,y+Math.sin(a+i*TAU/n)*r]);path(p,fill,stroke,width);}
  function circle(x,y,r,color,stroke=null,width=1){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,TAU);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');circle(x,y,r,g);}
  function line(x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function arena(t,stage=0,title=false){
    if(gpuActive)return;
    if(world?.layout==='portrait'&&!title){portraitArena(t,stage);return;}
    ctx.fillStyle='#080e18';ctx.fillRect(0,0,W,H);
    glow(title?920:W/2,title?370:270,620,stage===1?'#33214a55':stage===2?'#4333214a':'#103f3f55');
    glow(160,660,480,'#10324244');
    for(const s of stars){const x=(s.x+Math.sin(t*.015+s.z)*12)%W,y=s.y+Math.cos(t*.01+s.phase)*6;ctx.globalAlpha=.18+s.z*.3;circle(x,y,s.r,'#b5d7da');}ctx.globalAlpha=1;
    ctx.save();path([[35,125],[61,99],[1219,99],[1245,125],[1245,670],[1219,696],[61,696],[35,670]],'#0b182137','#4e7d8137');ctx.clip();
    ctx.strokeStyle='#31545d25';ctx.lineWidth=1;
    for(let x=-250;x<W+200;x+=68){ctx.beginPath();ctx.moveTo(x,99);ctx.lineTo(x+110,696);ctx.stroke();}
    for(let y=110;y<700;y+=54)line(35,y,1245,y,'#31545d25');
    const cx=title?900:640,cy=title?385:398;
    for(let r=145;r<=580;r+=86){circle(cx,cy,r,null,'#426b7020');circle(cx,cy,r+3,null,'#36525812');}
    ctx.save();ctx.translate(cx,cy);ctx.rotate(t*.007);for(let i=0;i<72;i++){const a=i*TAU/72,r=316;line(Math.cos(a)*r,Math.sin(a)*r,Math.cos(a)*(r+(i%6===0?17:6)),Math.sin(a)*(r+(i%6===0?17:6)),'#75b2b331',i%6===0?2:1);}ctx.restore();
    line(35,398,1245,398,'#63989315');line(cx,99,cx,696,'#63989315');
    ctx.font='10px monospace';ctx.fillStyle='#739d9e3a';ctx.textAlign='left';ctx.fillText('COVENANT FIELD / 00'+(stage+1),58,678);ctx.textAlign='right';ctx.fillText('NO ONE LEAVES UNCHANGED',1221,678);
    ctx.restore();
    for(const x of [35,1245]){for(const y of [153,640]){line(x,y-12,x,y+12,'#63919466',2);}}
  }
  function portraitArena(t,stage){
    ctx.fillStyle='#0a151f';ctx.fillRect(0,0,W,H);glow(W*.5,H*.35,650,['#124b4b50','#37275055','#4f3a2355'][stage]);
    for(const s of stars){ctx.globalAlpha=.2+s.z*.25;circle(s.x/1280*W,(s.y/800*H+Math.sin(t*.15+s.phase)*3),s.r,'#b5d7da');}ctx.globalAlpha=1;
    const a=world.bounds;
    path([[12,34],[34,12],[W-34,12],[W-12,34],[W-12,H-34],[W-34,H-12],[34,H-12],[12,H-34]],'#12263030','#669a9944');
    for(let x=36;x<W;x+=65)line(x,14,x,H-14,'#77b4b015');
    for(let y=36;y<H;y+=65)line(14,y,W-14,y,'#77b4b015');
    for(let r=105;r<W*.65;r+=76)circle(W/2,H/2,r,null,'#82b8b419');
    ctx.save();ctx.translate(W/2,H/2);ctx.rotate(t*.012);
    for(let i=0;i<48;i++){const ang=i*TAU/48,r=W*.4;line(Math.cos(ang)*r,Math.sin(ang)*r,Math.cos(ang)*(r+(i%4?6:14)),Math.sin(ang)*(r+(i%4?6:14)),'#83b9b136',i%4?1:2);}ctx.restore();
    for(const y of [a.top+18,a.bottom-18]){line(12,y-14,12,y+14,'#78e8d070',2);line(W-12,y-14,W-12,y+14,'#78e8d070',2);}
  }
  function renderMobileTitle(t){
    if(gpuActive)return;
    const w=view.width,h=view.height;ctx.fillStyle='#09121c';ctx.fillRect(0,0,w,h);
    const compact=h<=740;const x=w*.62,y=compact?260:Math.min(345,h*.385);
    glow(x,y,Math.max(w*.8,230),'#294e4a5c');
    for(const s of stars){ctx.globalAlpha=.3+s.z*.35;circle(s.x/1280*w,s.y/800*h,s.r*.8,'#b4d9dc');}ctx.globalAlpha=1;
    for(let r=100;r<350;r+=58)circle(x,y,r,null,'#8bc1b524',1);
    ctx.save();ctx.translate(x,y);ctx.rotate(-.38);for(let i=0;i<48;i++){const a=i*TAU/48;line(Math.cos(a)*165,Math.sin(a)*165,Math.cos(a)*(i%4?169:178),Math.sin(a)*(i%4?169:178),'#89b7a73a');}ctx.restore();
    drawBoss({x,y,rot:t*.13,phase:1},0,t,compact?1.05:1.25,true);
    for(let i=0;i<14;i++){const a=i*TAU/14+t*.05,r=compact?149:178;circle(x+Math.cos(a)*r,y+Math.sin(a)*r,2.5,'#edb49b');}
    drawPlayer(w*.32,y+112,-Math.PI/2+.3,.8,false,t);
  }
  function drawPlayer(x,y,a,alpha=1,boost=false,t=clock){
    if(gpuActive){if(world&&Math.abs(x-world.p.x)<.01&&Math.abs(y-world.p.y)<.01){circle(x,y,3.4,'#fcfff5');circle(x,y,6,null,'#081019',1.2);}return;}
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha=alpha;
    const tail=boost?45:15+Math.sin(t*55)*4;
    path([[-12,-6],[-18-tail,0],[-12,6]],'#78e8d055');path([[-13,-3],[-16-tail*.6,0],[-13,3]],'#d7fff0');
    path([[23,0],[-16,-15],[-9,-3],[-13,0],[-9,3],[-16,15]],'#203b4b','#8debdc',1.1);
    path([[23,0],[-5,-7],[-4,0]],'#bde4df');path([[23,0],[-4,0],[-5,7]],'#4c9193');
    path([[-7,-8],[-19,-18],[-14,-4]],'#316374','#74cfc4',.7);path([[-7,8],[-19,18],[-14,4]],'#316374','#74cfc4',.7);
    circle(0,0,3.4,'#fcfff5');circle(0,0,6,null,'#081019',1.2);ctx.restore();
  }
  function drawBoss(e,stage,t,scale=1,hero=false){
    if(gpuActive)return;
    const color=BOSSES[stage].color,phase=e.phase||0;
    ctx.save();ctx.translate(e.x,e.y);ctx.scale(scale,scale);
    glow(0,0,135,color+'18');
    if(hero){for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,140+i*31,105+i*22,t*.04+i*.15,0,TAU);ctx.strokeStyle=color+(i?'16':'38');ctx.lineWidth=1;ctx.stroke();}}
    ctx.save();ctx.rotate(e.rot||t*.16);
    const wings=stage===0?6:stage===1?4:8;
    for(let i=0;i<wings;i++){
      ctx.save();ctx.rotate(i*TAU/wings);const pulse=Math.sin(t*1.7+i)*3;
      if(stage===1){path([[56,-11],[94+pulse,-21],[112+pulse,0],[92+pulse,21],[56,11]],'#1a2134',color+'99',1);path([[65,-6],[99,0],[65,6]],color+'55');line(35,0,80,0,color+'55');}
      else{path([[43,-13],[74+pulse,-24],[91+pulse,-11],[78+pulse,6],[45,14]],'#1e2838',color+'99',1);path([[53,-10],[76,-18],[82,-10],[60,-4]],'#40505d');path([[47,7],[75,1],[86,-8],[70,13]],'#101929');line(75,-12,83,-8,color,2);}
      if(phase>0){circle(100+pulse,0,3,color);line(95+pulse,0,107+pulse,0,color,1);}
      ctx.restore();
    }
    circle(0,0,52,null,color+'48',1.5);circle(0,0,46,null,color+'66',2);
    for(let i=0;i<12;i++){const a=i*TAU/12;line(Math.cos(a)*49,Math.sin(a)*49,Math.cos(a)*54,Math.sin(a)*54,color+'aa',2);}
    ctx.restore();
    poly(0,0,43,stage===1?4:6,stage===1?Math.PI/4:Math.PI/6,'#24323e',color+'bb',1.3);
    poly(0,0,33,stage===1?4:6,t*.13,'#0a141f','#ffffff28');
    ctx.save();ctx.rotate(-t*.2);poly(0,0,27,3,0,color+'26',color+'99');poly(0,0,27,3,Math.PI,color+'12',color+'55');ctx.restore();
    glow(0,0,27,color+'66');circle(0,0,12,'#13171d',color,2);circle(0,0,6,color);circle(-2,-2,2.5,'#fff9e9');
    line(-20,-43,20,-43,'#b8bbc877');
    if(e.hit>0){ctx.globalAlpha=.32;poly(0,0,43,6,Math.PI/6,'#fff3dd');ctx.globalAlpha=1;}
    ctx.restore();
  }
  function drawEnemy(e,t){
    if(gpuActive){
      if(e.spawn>0){circle(e.x,e.y,28+e.spawn*24,null,'#ff8676',1.5);line(e.x-30,e.y,e.x+30,e.y,'#ff867688');line(e.x,e.y-30,e.x,e.y+30,'#ff867688');}
      if(e.locked){const a=Math.atan2(e.ty-e.y,e.tx-e.x);line(e.x,e.y,e.x+Math.cos(a)*400,e.y+Math.sin(a)*400,'#f687c568',1);}
      if(e.type!=='boss'&&e.hp<e.maxHp){ctx.fillStyle='#ffffff26';ctx.fillRect(e.x-17,e.y-31,34,2);ctx.fillStyle='#ffb19b';ctx.fillRect(e.x-17,e.y-31,34*clamp(e.hp/e.maxHp,0,1),2);}
      return;
    }
    if(e.spawn>0){ctx.save();ctx.globalAlpha=.55;circle(e.x,e.y,28+e.spawn*24,null,'#ff8676',1);line(e.x-35,e.y,e.x+35,e.y,'#ff86764d');line(e.x,e.y-35,e.x,e.y+35,'#ff86764d');ctx.restore();return;}
    if(e.type==='boss'){drawBoss(e,world.stage,t);return;}
    ctx.save();ctx.translate(e.x,e.y);const colors={chaser:'#ff8f7e',turret:'#eec186',spinner:'#bf9cf1',lancer:'#f687c5',warden:'#f0b364'},color=colors[e.type];
    if(e.locked){const a=Math.atan2(e.ty-e.y,e.tx-e.x);line(0,0,Math.cos(a)*400,Math.sin(a)*400,'#f687c568',1);}
    ctx.rotate(e.type==='chaser'?C.angle(e,world.p):e.rot);
    if(e.type==='chaser'){path([[22,0],[-13,-16],[-6,0],[-13,16]],e.hit?'#fff5dc':'#3d2b30',color,1.2);path([[13,0],[-4,-5],[-4,5]],color);}
    else if(e.type==='turret'){poly(0,0,19,4,Math.PI/4,e.hit?'#fff5dc':'#303039',color,1.2);poly(0,0,10,4,Math.PI/4,'#161f2c',color+'88');circle(0,0,4,color);for(let i=0;i<4;i++){const a=i*TAU/4;line(Math.cos(a)*16,Math.sin(a)*16,Math.cos(a)*24,Math.sin(a)*24,color,3);}}
    else if(e.type==='spinner'){poly(0,0,20,6,0,e.hit?'#fff5dc':'#2d2943',color,1);poly(0,0,12,3,-e.rot*2,null,color,1);circle(0,0,4,color);}
    else if(e.type==='lancer'){path([[25,0],[-17,-12],[-9,0],[-17,12]],e.hit?'#fff5dc':'#3d2340',color,1.5);line(-8,0,14,0,color,3);}
    else{poly(0,0,25,8,0,e.hit?'#fff5dc':'#3d352c',color,1.5);poly(0,0,18,4,e.rot,null,color+'aa');circle(0,0,6,color);}
    ctx.restore();
    if(e.hp<e.maxHp){ctx.fillStyle='#ffffff1a';ctx.fillRect(e.x-17,e.y-31,34,2);ctx.fillStyle=color;ctx.fillRect(e.x-17,e.y-31,34*clamp(e.hp/e.maxHp,0,1),2);}
  }
  function renderTitle(t){
    arena(t,0,true);
    const x=910+(mouse.x-640)*.012,y=367+Math.sin(t*.5)*7;
    ctx.save();ctx.translate(x,y);ctx.rotate(-.32);
    for(let i=0;i<7;i++){const a=i*TAU/7+t*.045;const x1=Math.cos(a)*203,y1=Math.sin(a)*203;poly(x1,y1,6,4,a,null,'#ed8b7855');line(x1*.93,y1*.93,x1*.73,y1*.73,'#8d5e5550');}
    ctx.restore();drawBoss({x,y,rot:t*.14,phase:1},0,t,2.10,true);
    const shots=21;for(let i=0;i<shots;i++){const a=i*TAU/shots+t*.065,r=240+Math.sin(t*.4+i)*12;const bx=x+Math.cos(a)*r,by=y+Math.sin(a)*r;line(bx-Math.cos(a)*12,by-Math.sin(a)*12,bx,by,'#ff746c22',3);circle(bx,by,3,'#ffc6a6');circle(bx,by,5.5,null,'#e3866755');}
    drawPlayer(905,641,-Math.PI/2+.18,.95,false,t);line(908,599,913,575,'#94fff099',2);line(916,547,919,524,'#94fff099',2);
    ctx.save();ctx.strokeStyle='#96ccc82a';ctx.setLineDash([4,8]);ctx.beginPath();ctx.arc(x,y,270,-.6,2.4);ctx.stroke();ctx.restore();
  }
  function renderGame(t){
    const stage=Math.min(world.stage,2),p=world.p;arena(t,stage);
    if(world.mods.sanctuary){circle(W/2,H/2,76,'#83dca813','#9eecac77',1);circle(W/2,H/2,70,null,'#9eecac35');ctx.font='9px monospace';ctx.textAlign='center';ctx.fillStyle='#9eecac77';ctx.fillText('SANCTUARY',W/2,H/2+96);}
    if(world.ceasefire){ctx.fillStyle='#8573c90a';ctx.fillRect(35,100,1210,595);}
    for(const l of world.lasers){
      const endx=l.x+Math.cos(l.a)*1600,endy=l.y+Math.sin(l.a)*1600;
      if(l.active){line(l.x,l.y,endx,endy,'#ff5fa72b',l.width+13);line(l.x,l.y,endx,endy,'#ff84bb',l.width);line(l.x,l.y,endx,endy,'#ffe6f2',l.width*.3);}
      else{ctx.save();ctx.setLineDash([10,7]);line(l.x,l.y,endx,endy,'#ff9dcc'+(l.t<.3?'c0':'77'),2);ctx.restore();circle(l.x,l.y,9,null,'#ff7db2');}
    }
    if(!opts.reduced){for(const tr of trails)drawPlayer(tr.x,tr.y,tr.a,tr.life/tr.max*.28,true,t);}
    if(world.upgrades.echo){for(let j=1;j<=world.upgrades.echo;j++){const h=world.history.find(h=>h.t>=world.time-j*.55);if(h)drawPlayer(h.x,h.y,h.a,.25,false,t);}}
    for(const e of world.enemies)drawEnemy(e,t);
    // Batches use ordinary compositing so bullet readability does not depend on bloom.
    for(const b of world.bullets){
      const color=b.hostile?(world.ceasefire?'#c4b6ef':b.shape?'#d4a5ff':'#ffa58b'):(b.reflected?'#ffe09b':b.ghost?'#76bac699':'#bcffe9');
      if(!b.hostile){const sp=Math.hypot(b.vx,b.vy)||1;line(b.x-b.vx/sp*(b.reflected?23:16),b.y-b.vy/sp*(b.reflected?23:16),b.x,b.y,color,b.reflected?3.4:2.5);circle(b.x,b.y,b.reflected?4:2,color);}
      else{circle(b.x,b.y,b.r+3,'#120e1acc');if(b.shape)poly(b.x,b.y,b.r+1.2,4,Math.PI/4,color);else circle(b.x,b.y,b.r,color);circle(b.x-1,b.y-1,1.8,'#fff6e2');}
    }
    if(world.upgrades.orbit){circle(p.x,p.y,45,null,'#7cdcd124');for(let i=0;i<world.upgrades.orbit;i++){const a=world.time*1.8+i*TAU/world.upgrades.orbit,x=p.x+Math.cos(a)*45,y=p.y+Math.sin(a)*45;poly(x,y,7,4,a,'#346571','#8deed3');}}
    if(p.inv>0&&p.dash<=0)circle(p.x,p.y,27,null,'#78e8d0'+(Math.floor(p.inv*8)%2?'88':'33'),1);
    if(p.parry>0){const perfect=p.parryAge<.105;circle(p.x,p.y,70,perfect?'#fff2b011':'#78e8d008',perfect?'#ffeba2':'#78e8d0',perfect?3:1.5);for(let i=0;i<8;i++){const a=i*TAU/8+t*5;line(p.x+Math.cos(a)*67,p.y+Math.sin(a)*67,p.x+Math.cos(a)*77,p.y+Math.sin(a)*77,perfect?'#ffeba2':'#78e8d0',2);}}
    drawPlayer(p.x,p.y,p.angle,1,p.dash>0,t);
    if(p.energy>=world.novaCost())circle(p.x,p.y,32+Math.sin(t*3)*2,null,'#d3ffe94f',1);
    const speed=Math.hypot(p.vx,p.vy);if(speed>60&&screen==='game'&&renderFrames%2===0&&!opts.reduced){const life=.25;particles.push({x:p.x-Math.cos(p.angle)*17,y:p.y-Math.sin(p.angle)*17,vx:-p.vx*.2,vy:-p.vy*.2,life,max:life,r:1.7,color:'#78e8d0'});}
    if(p.dash>0&&renderFrames%2===0)trails.push({x:p.x,y:p.y,a:p.angle,life:.23,max:.23});
    if(screen==='game'&&!mobile){
      const target=opts.autoaim||keys.has('KeyJ')?world.nearest(p.x,p.y):null,cx=target?target.x:mouse.x,cy=target?target.y:mouse.y;
      circle(cx,cy,12,null,'#c5e9df77',1);line(cx-18,cy,cx-8,cy,'#c5e9dfa0');line(cx+8,cy,cx+18,cy,'#c5e9dfa0');line(cx,cy-18,cx,cy-8,'#c5e9dfa0');line(cx,cy+8,cx,cy+18,'#c5e9dfa0');
    }
  }
  function render(t=clock){
    const dx=canvas.width/view.width,dy=canvas.height/view.height;ctx.setTransform(dx,0,0,dy,0,0);ctx.globalAlpha=1;
    const shakeX=shake>0&&!opts.reduced?(Math.random()-.5)*shake:0,shakeY=shake>0&&!opts.reduced?(Math.random()-.5)*shake:0;
    gpuActive=gpu.draw({world,w:W,h:H,t:opts.reduced?0:t,mobile,view,reduced:opts.reduced,shakeX,shakeY,postFX:opts.postfx,bloom:opts.bloom,bgAnim:opts.bganim});
    canvas.style.background=gpuActive?'transparent':'#08121c';
    if(gpuActive)ctx.clearRect(0,0,view.width,view.height);else{ctx.fillStyle='#08121c';ctx.fillRect(0,0,view.width,view.height);}
    if(mobile&&!world){renderMobileTitle(opts.reduced?0:t);renderFrames++;return;}
    ctx.save();const f=view.field;ctx.beginPath();ctx.rect(f.x,f.y,f.width,f.height);ctx.clip();
    ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);
    ctx.save();if(shake>0&&!opts.reduced)ctx.translate(shakeX,shakeY);
    if(!world||screen==='menu'||screen==='loadout')renderTitle(t);else renderGame(t);
    ctx.save();ctx.globalCompositeOperation='lighter';for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1)*.8;line(p.x,p.y,p.x-p.vx*.028,p.y-p.vy*.028,p.color,p.r);}ctx.restore();
    for(const e of effects){const a=clamp(e.life/e.max,0,1);ctx.globalAlpha=a;if(e.type==='ring'){const r=e.r*(1-a*a);circle(e.x,e.y,r,null,e.color,opts.reduced?1:2+a*3);}else if(e.type==='text'){ctx.font='bold 15px monospace';ctx.fillStyle=e.color;ctx.textAlign='center';ctx.fillText(e.text,e.x,e.y-(1-a)*30);}}ctx.globalAlpha=1;
    ctx.restore();
    if(flash>0&&!opts.reduced){ctx.fillStyle=`rgba(220,244,230,${Math.min(flash,.13)})`;ctx.fillRect(0,0,W,H);}
    if(!mobile){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#050a11b0');g.addColorStop(.14,'#050a1100');g.addColorStop(.80,'#050a1100');g.addColorStop(1,'#050a11aa');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
    ctx.restore();renderFrames++;
  }
  function updateEffects(dt){
    shake=Math.max(0,shake-dt*42);flash=Math.max(0,flash-dt);for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-3*dt);p.vy*=Math.exp(-3*dt);}particles=particles.filter(p=>p.life>0).slice(-650);
    for(const e of effects)e.life-=dt;effects=effects.filter(e=>e.life>0);for(const tr of trails)tr.life-=dt;trails=trails.filter(tr=>tr.life>0).slice(-30);
    if(announceTime>0){announceTime-=dt;if(announceTime<=0)$('announcement').classList.remove('visible');}if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}
  }
  function gamepad(){
    const pads=navigator.getGamepads?navigator.getGamepads():[],pad=Array.from(pads).find(p=>p&&p.connected);if(!pad){oldPad=[];return null;}
    const edge=i=>!!pad.buttons[i]?.pressed&&!oldPad[i],held=i=>!!pad.buttons[i]?.pressed;
    if(screen==='game'){if(edge(9))togglePause();}
    else if(screen==='pause'&&edge(9))show('game');
    else{const buttons=Array.from($(screen)?.querySelectorAll('button:not([disabled])')||[]);let idx=buttons.indexOf(document.activeElement);const nav=held(13)||held(15)?1:held(12)||held(14)?-1:0;const axis=pad.axes[1]>.6?1:pad.axes[1]<-.6?-1:0;const move=nav||axis;
      if(move&&move!==oldAxes[0]&&buttons.length){idx=(idx+move+buttons.length)%buttons.length;buttons[idx].focus();}oldAxes[0]=move;if(edge(0))(document.activeElement?.tagName==='BUTTON'?document.activeElement:buttons[0])?.click();}
    const ax=Math.abs(pad.axes[0]||0)>.18?pad.axes[0]:0,ay=Math.abs(pad.axes[1]||0)>.18?pad.axes[1]:0,rx=pad.axes[2]||0,ry=pad.axes[3]||0,aim=Math.hypot(rx,ry)>.25;
    const input={mx:ax,my:ay,shoot:aim||held(7),dash:edge(0),parry:edge(4),nova:edge(3),breach:edge(1),autoAim:held(7)&&!aim};
    if(aim&&world){input.aimx=world.p.x+rx*500;input.aimy=world.p.y+ry*500;}
    oldPad=pad.buttons.map(b=>b.pressed);return input;
  }
  function inputState(pad){
    const v={mx:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),my:(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0),aimx:mouse.x,aimy:mouse.y,shoot:mouse.down||keys.has('KeyJ')||opts.autofire,autoAim:opts.autoaim||keys.has('KeyJ'),dash:pressed.has('Space')||pressed.has('ShiftLeft')||pressed.has('ShiftRight'),parry:pressed.has('KeyE')||pressed.has('MouseRight'),nova:pressed.has('KeyF'),breach:pressed.has('KeyQ')};
    if(mobile&&touch){v.aimx=world.p.x;v.aimy=world.p.y-200;const ti=touch.sample();v.mx=clamp(v.mx+ti.mx,-1,1);v.my=clamp(v.my+ti.my,-1,1);for(const k of ['shoot','autoAim','dash','parry','nova'])v[k]=v[k]||ti[k];}
    if(pad){v.mx=clamp(v.mx+pad.mx,-1,1);v.my=clamp(v.my+pad.my,-1,1);for(const k of ['shoot','dash','parry','nova','breach','autoAim'])v[k]=v[k]||pad[k];if(pad.aimx!==undefined){v.aimx=pad.aimx;v.aimy=pad.aimy;}}return v;
  }
  function frame(ts){
    const real=last?Math.min((ts-last)/1000,.05):0;last=ts;clock+=real;const pad=gamepad();
    if(screen==='game'&&world){
      if(freeze>0&&!opts.reduced)freeze=Math.max(0,freeze-real);else{
        accum+=real;let inp=inputState(pad);let stepped=false;
        while(accum>=1/120&&screen==='game'){
          world.step(1/120,inp);accum-=1/120;stepped=true;
          inp={...inp,dash:false,parry:false,nova:false,breach:false};
          if(world.training&&trainingStep===0){trainingMoved+=(Math.abs(inp.mx)+Math.abs(inp.my))/120;if(trainingMoved>1.2){trainingStep=1;updateTraining();sound.effect('heal');}}
          consumeEvents();
          if(world.phase!=='combat'){
            if(world.phase==='pact'||world.phase==='upgrade')choiceScreen();else if(world.phase==='won'||world.phase==='dead')results();accum=0;
          }
        }
        if(stepped){pressed.clear();touch?.consume();}
      }
      updateEffects(real);uiTimer+=real;if(uiTimer>.075){uiTimer=0;updateHUD();}
    }else if(!world)updateEffects(real);
    sound.tick(screen==='game',world?Math.min(1,world.bullets.length/110+(world.wave===2?.35:0)):0);render();requestAnimationFrame(frame);
  }
  // --- Input & menu wiring ---
  function mapPointer(ev){if(mobile||ev.pointerType==='touch')return;const r=canvas.getBoundingClientRect();mouse.x=clamp((ev.clientX-r.left-view.x)/view.scale,0,W);mouse.y=clamp((ev.clientY-r.top-view.y)/view.scale,0,H);}
  window.addEventListener('pointermove',mapPointer);
  canvas.addEventListener('pointerdown',ev=>{if(mobile||ev.pointerType==='touch')return;sound.unlock();mapPointer(ev);if(screen!=='game')return;if(ev.button===0)mouse.down=true;if(ev.button===2)pressed.add('MouseRight');ev.preventDefault();});
  window.addEventListener('pointerup',ev=>{if(ev.pointerType!=='touch')mouse.down=false;});window.addEventListener('pointercancel',ev=>{if(ev.pointerType!=='touch')clearInput();});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{
    const input=e.target instanceof HTMLInputElement;
    if(e.code==='Escape'&&!e.repeat){e.preventDefault();if(screen==='game'||screen==='pause')togglePause();else if(screen==='help-screen'||screen==='settings-screen')show(previousScreen);else if(screen==='confirm-screen')show('pause');else if(screen==='loadout')home();return;}
    if(input)return;
    if(e.code==='Tab'&&screen!=='game'){
      const focusable=Array.from($(screen)?.querySelectorAll('button,input')||[]);if(focusable.length){const first=focusable[0],lastEl=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastEl.focus();}else if(!e.shiftKey&&document.activeElement===lastEl){e.preventDefault();first.focus();}}return;}
    if(e.code==='KeyM'&&!e.repeat){muted=!muted;sound.settings(opts.volume,opts.music,muted);toast(muted?'AUDIO OFF':'AUDIO ON');return;}
    if(screen==='choices'&&/^Digit[123]$/.test(e.code)&&!e.repeat){const i=Number(e.code.slice(-1))-1;$('choice-cards').children[i]?.click();e.preventDefault();return;}
    if(screen==='game'){
      const used=['Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyE','KeyQ','KeyF','KeyP'];if(used.includes(e.code))e.preventDefault();
      if(e.code==='KeyP'&&!e.repeat){togglePause();return;}keys.add(e.code);if(!e.repeat)pressed.add(e.code);
    }
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{clearInput();if(screen==='game')togglePause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(screen==='game')togglePause();}});
  window.addEventListener('resize',resize);
  // ResizeObserver also catches dynamic browser chrome (100dvh) changes.
  if(typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>{const r=$('stage').getBoundingClientRect();if(Math.abs(r.width-view.width)>.5||Math.abs(r.height-view.height)>.5)resize();}).observe($('stage'));}
  $('start').onclick=()=>{sound.unlock();show('loadout');};$('launch').onclick=()=>start();$('train').onclick=()=>start(true);$('training-exit').onclick=home;
  $('daily').onclick=()=>{const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');$('seed').value='DAILY-'+date;show('loadout');};
  for(const el of document.querySelectorAll('[data-difficulty]'))el.onclick=()=>{difficulty=el.dataset.difficulty;for(const b of document.querySelectorAll('[data-difficulty]')){b.classList.toggle('selected',b===el);b.setAttribute('aria-pressed',String(b===el));}};
  for(const el of document.querySelectorAll('[data-home]'))el.onclick=home;
  $('help').onclick=openHelp;$('settings').onclick=openSettings;$('help-close').onclick=()=>show(previousScreen);$('settings-close').onclick=()=>show(previousScreen);
  $('pause-btn').onclick=togglePause;$('resume').onclick=()=>show('game');$('pause-help').onclick=openHelp;$('pause-settings').onclick=openSettings;
  $('quit').onclick=()=>requestConfirmation('quit');$('pause-breach').onclick=()=>requestConfirmation('breach');
  $('confirm-cancel').onclick=()=>show('pause');$('confirm-yes').onclick=()=>{const action=confirmAction;confirmAction=null;if(action==='quit')home();else if(action==='breach'){show('game');world.breach();consumeEvents();updateHUD();}};
  $('choice-confirm').onclick=()=>{if(selectedChoice)choose(selectedChoice);};
  $('retry').onclick=()=>start(false,world.seed);
  for(const name of ['music','reduced','autofire','autoaim','lefthanded'])$(name).onchange=()=>{opts[name]=$(name).checked;touch?.clear();syncSettings();storage.write('nemesis.settings.v1',opts);};
  for(const [name,key] of [['postfx','postfx'],['bloom','bloom'],['bganim','bganim']])$(name).oninput=()=>{opts[key]=level(Number($(name).value));syncSettings();storage.write('nemesis.settings.v1',opts);};
  $('sensitivity').oninput=()=>{opts.sensitivity=Number($('sensitivity').value)/100;storage.write('nemesis.settings.v1',opts);};
  $('volume').oninput=()=>{opts.volume=Number($('volume').value)/100;sound.unlock();syncSettings();storage.write('nemesis.settings.v1',opts);};
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch(_){$('fullscreen').textContent='Fullscreen unavailable in this browser';}};
  $('export').onclick=()=>{if(!world)return;const blob=new Blob([JSON.stringify(world.report(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nemesis-pact-run-'+world.seed.replace(/[^a-zA-Z0-9_-]/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  // Test access is opt-in; normal launches do not expose mutable simulation state.
  if(new URLSearchParams(location.search).has('test')||window.__PACT_TEST_MODE__===true)window.__PACT_TEST__={
    get world(){return world;},get view(){return {...view};},get touch(){return touch;},get mobile(){return mobile;},get trainingStep(){return trainingStep;},get screen(){return screen;},get sound(){return sound;},get options(){return {...opts};},start,choose,selectChoice,show,render,updateHUD,consumeEvents,results,
    advance(n,input={}){for(let i=0;i<n&&world?.phase==='combat';i++)world.step(1/120,input);consumeEvents();updateHUD();if(world.phase==='upgrade'||world.phase==='pact')choiceScreen();else if(world.phase==='won'||world.phase==='dead')results();render();},
    snapshot(){return {screen,world:world?.report(),bullets:world?.bullets.length,particles:particles.length,frames:renderFrames};}
  };
  touch=new window.PactTouch.TouchController({pad:$('move-pad'),surface:canvas,knob:$('move-knob'),isPlaying:()=>screen==='game',isMobile:()=>mobile,getWorld:()=>world,unlock:()=>sound.unlock(),sensitivity:()=>opts.sensitivity});
  document.body.dataset.screen='menu';resize();syncSettings();updateBest();requestAnimationFrame(frame);
})();
