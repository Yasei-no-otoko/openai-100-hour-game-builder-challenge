"""Actual offline Chromium/WebGL2 fixtures and real UI interaction. No paid API calls."""
from pathlib import Path
import json, hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'validation-0.4.0';OUT.mkdir(exist_ok=True)
HTML=(ROOT/'dist/NEMESIS-PACT.html').read_text()
results=[]
def wait_js(page,expr):
    for _ in range(100):
        if page.evaluate(expr): return
        page.wait_for_timeout(50)
    raise AssertionError({'expr':expr,'status':page.inner_text('#ai-status'),'provider':page.inner_text('#ai-provider')})

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for name,width,height,mobile in [('desktop',1280,800,False),('portrait',390,844,True),('small',320,568,True)]:
        print('BEGIN',name,flush=True)
        context=browser.new_context(viewport={'width':width,'height':height},has_touch=mobile,is_mobile=mobile,device_scale_factor=1,offline=True)
        page=context.new_page();errors=[];network=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:','ws:','wss:')) else None)
        page.evaluate('window.__PACT_TEST_MODE__=true;window.requestAnimationFrame=()=>0;')
        page.set_content(HTML)
        page.evaluate('async()=>{await NEMESIS_RENDERER.initialized;__PACT_TEST__.render(3)}')
        assert page.evaluate('NEMESIS_RENDERER.stats().backend')=='WEBGL2 / PBR',page.evaluate('NEMESIS_RENDERER.stats()')
        if name!='small':page.screenshot(path=str(OUT/f'{name}-01-title.png'))
        page.click('#start')
        assert page.evaluate('__PACT_TEST__.screen')=='hangar'
        assert page.evaluate("document.querySelector('#hangar').scrollWidth<=document.querySelector('#hangar').clientWidth+1")
        if name!='small':page.screenshot(path=str(OUT/f'{name}-02-hangar.png'))
        page.click('#airframes button:nth-child(2)');page.click('#hangar-ready');page.click('#launch')
        assert page.evaluate('__PACT_TEST__.world.airframe')=='wraith'
        assert page.evaluate('__PACT_TEST__.screen')=='route'
        if name!='small':page.screenshot(path=str(OUT/f'{name}-03-route.png'))
        page.click('#route-intelligence');page.fill('#ai-prompt','Test my route with a crossfire lattice.');page.click('#ai-request')
        wait_js(page,"!document.querySelector('#ai-apply').disabled")
        assert 'MOCK' in page.inner_text('#ai-provider')
        page.click('#ai-apply');assert page.evaluate('__PACT_TEST__.world.director')=='crossfire'
        page.click('#route-options button:nth-child(2)')
        assert page.evaluate('__PACT_TEST__.world.credits')==80
        page.click('#negotiate');page.fill('#ai-prompt','Let me reflect your attacks.');page.click('#ai-request')
        wait_js(page,"!document.querySelector('#ai-apply').disabled")
        assert '2.2' in page.inner_text('#ai-benefit')
        assert page.evaluate('__PACT_TEST__.world.phase')=='pact'  # Preview never changes mechanics.
        if name!='small':page.screenshot(path=str(OUT/f'{name}-04-negotiation.png'))
        page.click('#ai-apply');assert page.evaluate('__PACT_TEST__.world.pact')=='mirror'
        assert page.evaluate('__PACT_TEST__.world.mods.reflect')==2.2
        assert page.evaluate('__PACT_TEST__.screen')=='game'
        # Each sector is a controlled visual fixture, NOT a legal campaign win.
        frames=[]
        for stage in range(6):
            page.evaluate('''stage=>{const T=__PACT_TEST__;const w=T.world;w.stage=stage;w.wave=2;w.startWave();w.time=7;w.waveTime=7;w.p.inv=0;w.p.x=w.width*.60;w.p.y=w.height*.74;w.p.angle=-1.9;
             for(const e of w.enemies){e.spawn=0;e.age=7;e.phase=1;e.hp=e.maxHp*.6;}
             for(const [i,type]of ['harrier','prism','carrier'].entries()){const e=w.spawn(type,w.width*(.24+i*.26),w.height*.55);e.spawn=0;e.age=7;}
             for(let i=0;i<18;i++)w.bullet(w.width*.5,w.height*.30,i*Math.PI*2/18,130,true);
             for(const b of w.bullets){b.x+=b.vx*.8;b.y+=b.vy*.8;}
             w.takeEvents();T.show('game');T.updateHUD();document.getElementById('announcement').classList.remove('visible');T.render(7);
            }''',stage)
            before=page.evaluate('JSON.stringify(__PACT_TEST__.world)');page.evaluate('__PACT_TEST__.render(7)');assert page.evaluate('JSON.stringify(__PACT_TEST__.world)')==before
            assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
            if name!='small':page.screenshot(path=str(OUT/f'{name}-sector-{stage+1}.png'))
            frames.append(page.evaluate('NEMESIS_RENDERER.stats()'))
        print('SCENES DONE',name,flush=True)
        # Pixel mask safety: includes ALL new craft, not merely JavaScript instance counts.
        pixels=page.evaluate('''()=>{
         const canvas=document.createElement('canvas'),b=new PactGPU.GLBackend(canvas,PactMeshes.shapes);b.hdr=false;
         const W=256,H=256,f={w:W,h:H,t:7,postFX:0,bloom:0,bgAnim:0};
         function raw(s){b.render(s.groups,f,W,H);const g=b.gl;g.bindFramebuffer(g.FRAMEBUFFER,b.full.fb);const p=new Uint8Array(W*H*4);g.readPixels(0,0,W,H,g.RGBA,g.UNSIGNED_BYTE,p);if(g.getError())throw Error('readPixels');return p;}
         const ground=[];for(let stage=0;stage<6;stage++){const s=new PactMeshes.Scene();s.floor(W,H,stage,'LUMA');
          for(const key of Object.keys(s.groups)){const arr=s.groups[key],a=[];for(let i=0;i<arr.length;i+=16)if(arr[i+7]===PactMeshes.LAYER.GROUND)a.push(...arr.slice(i,i+16));s.groups[key]=a;}
          f.world={stage,enemies:[]};const p=raw(s);let sum=0,n=0;for(let y=24;y<232;y++)for(let x=24;x<232;x++){const i=(y*W+x)*4;sum+=(p[i]+p[i+1]+p[i+2])/3;n++;}ground.push({stage,meanLinearByte:sum/n});}
         const masks=[];for(const type of ['player','harrier','prism','carrier','boss3','boss4','boss5']){const s=new PactMeshes.Scene();
          if(type==='player')s.ship(128,128,0,1,7);else if(type.startsWith('boss'))s.boss({x:128,y:128,rot:.6,phase:2},Number(type.slice(-1)),7);else s.enemy({type,x:128,y:128,r:24,rot:.6,spawn:0,hit:0},7,{x:64,y:128});
          const base=raw(s);s.box(128,128,400,200,200,300,0,[.03,.04,.05],.6,.8,0,.86);const p=raw(s);let n=0,missing=0;for(let i=3;i<p.length;i+=4){if(base[i]>128)n++;if((base[i]>128)!==(p[i]>128))missing++;}masks.push({type,pixels:n,maskMismatch:missing});}
         return {ground,masks};
        }''')
        for g in pixels['ground']:assert g['meanLinearByte']>4,g
        for f in pixels['masks']:assert f['pixels']>100 and f['maskMismatch']==0,f
        print('PIXELS DONE',name,flush=True)
        page.click('#pause-btn');page.click('#pause-settings')
        for n in [0,1,2]:
            page.evaluate('''n=>{for(const id of ['postfx','bloom','bganim']){const e=document.getElementById(id);e.value=n;e.dispatchEvent(new Event('input',{bubbles:true}));}__PACT_TEST__.render(7)}''',n)
            assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
        assert page.evaluate("document.querySelector('#settings-screen').scrollWidth<=document.querySelector('#settings-screen').clientWidth+1")
        page.click('#settings-close');page.click('#resume')
        if mobile:
            w0=page.evaluate('__PACT_TEST__.world.p.x')
            pad=page.locator('#move-pad').bounding_box()
            page.dispatch_event('#move-pad','pointerdown',{'pointerId':31,'pointerType':'touch','clientX':pad['x']+pad['width']/2,'clientY':pad['y']+pad['height']/2,'bubbles':True})
            page.dispatch_event('#move-pad','pointermove',{'pointerId':31,'pointerType':'touch','clientX':pad['x']+pad['width']*.95,'clientY':pad['y']+pad['height']/2,'bubbles':True})
            # Synthetic pointer events verify code flow; real hardware touch remains untested.
            page.evaluate('''()=>{const T=__PACT_TEST__;const input=T.touch.sample();if(input.mx<.2)throw Error('Touch input did not update');T.world.step(1/120,input);T.touch.clear();}''')
            assert page.evaluate('__PACT_TEST__.world.p.x')>w0
            before=page.evaluate('JSON.stringify(__PACT_TEST__.world)');page.set_viewport_size({'width':height,'height':width});page.evaluate('__PACT_TEST__.render(7)');assert page.evaluate('JSON.stringify(__PACT_TEST__.world)')==before
        # Host transition refused in standalone. No accidental network call.
        page.evaluate("__PACT_TEST__.world.phase='won';__PACT_TEST__.results()")
        page.click('#debrief');page.select_option('#ai-mode','server');page.check('#ai-consent');page.click('#ai-request');assert 'offline' in page.inner_text('#ai-status').lower()
        page.select_option('#ai-mode','mock');page.click('#ai-request');wait_js(page,"document.querySelector('#ai-status').textContent.includes('VALIDATED')")
        assert not errors,errors;assert not network,network
        results.append({'viewport':[width,height],'name':name,'sectors':len(frames),'frames':frames,'pixels':pixels,'errors':errors,'networkRequests':network,'ui':['hangar','airframe','route','director proposal/apply','negotiation preview/sign','settings','debrief','standalone server guard']})
        context.close()
    (OUT/'browser-results.json').write_text(json.dumps({'build':'0.4.0','htmlSha256':hashlib.sha256(HTML.encode()).hexdigest(),'browser':browser.version,'backend':'ANGLE / SwiftShader SOFTWARE','nativeWebGPU':'NOT EXECUTED','results':results},indent=2))
    print(json.dumps({'browser':browser.version,'viewports':len(results),'sectorFixtures':sum(r['sectors'] for r in results),'errors':sum(len(r['errors']) for r in results),'externalRequests':0},indent=2));browser.close()
