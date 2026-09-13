"""Hotfix regression: actual WebGL2 pixels, not just shader source or draw counts.
Run: xvfb-run -a python3 tests/visibility_browser_test.py
No external origin, local URL or browser security policy changes are required.
WebGPU clip-space is covered by the separate numeric unit tests; native WGSL
execution is explicitly not asserted by this browser test.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'hotfix-0.3.6.1';OUT.mkdir(parents=True,exist_ok=True)
HTML=(ROOT/'dist/NEMESIS-PACT.html').read_text()
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for name,width,height,mobile in [('desktop',1280,800,False),('portrait',390,844,True),('small',320,568,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},has_touch=mobile,is_mobile=mobile,device_scale_factor=1,offline=True)
        page=context.new_page();errors=[];network=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:','ws:','wss:')) else None)
        # Deterministic fixture frames; no repeated animation loop or invulnerability cheat
        # is included in the distribution. Controlled combat fixtures are QA only.
        page.evaluate('window.__PACT_TEST_MODE__=true;window.requestAnimationFrame=()=>0;')
        page.set_content(HTML)
        page.evaluate('async()=>{await NEMESIS_RENDERER.initialized;__PACT_TEST__.render(0)}')
        assert page.evaluate('NEMESIS_RENDERER.stats().backend')=='WEBGL2 / PBR'
        if not mobile:page.screenshot(path=str(OUT/'desktop-title.png'))
        frames=[]
        for stage in range(3):
            page.evaluate('''stage=>{const T=__PACT_TEST__;T.start(false,'BLACK-SCREEN-REGRESSION');const w=T.world;
              w.stage=stage;w.wave=2;w.pact='mirror';w.mods=PactCore.modifiers('mirror');w.startWave();
              w.time=7;w.waveTime=7;w.p.inv=0;w.p.x=w.width*.62;w.p.y=w.height*.71;w.p.angle=-1.85;
              for(const e of w.enemies){e.spawn=0;e.age=7;e.phase=1;e.hp=e.maxHp*.6;}
              for(const [i,type]of ['chaser','turret','spinner'].entries()){const e=w.spawn(type,w.width*(.2+i*.3),w.height*.51);e.spawn=0;e.age=7;}
              for(let i=0;i<17;i++)w.bullet(w.width*.5,w.height*.32,i*Math.PI*2/17,135,true);
              for(const b of w.bullets){b.x+=b.vx*.8;b.y+=b.vy*.8;}
              w.takeEvents();T.show('game');T.updateHUD();T.render(7);
            }''',stage)
            state=page.evaluate('JSON.stringify(__PACT_TEST__.world)')
            page.evaluate('()=>{for(let i=0;i<3;i++)__PACT_TEST__.render(7)}')
            assert page.evaluate('JSON.stringify(__PACT_TEST__.world)')==state
            if name!='small':page.screenshot(path=str(OUT/f'{name}-sector-{stage+1}.png'))
            assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
            frames.append(page.evaluate('NEMESIS_RENDERER.stats()'))
        # Read pixels from a separate production-backend instance in RGBA8 format,
        # to quantify ground illumination and compare flight masks with tall occluders.
        pixels=page.evaluate('''()=>{
          const canvas=document.createElement('canvas'),b=new PactGPU.GLBackend(canvas,PactMeshes.shapes);b.hdr=false;
          const W=256,H=256,f={w:W,h:H,t:7,postFX:0,bloom:0,bgAnim:0};
          function raw(s){b.render(s.groups,f,W,H);const g=b.gl;g.bindFramebuffer(g.FRAMEBUFFER,b.full.fb);const p=new Uint8Array(W*H*4);g.readPixels(0,0,W,H,g.RGBA,g.UNSIGNED_BYTE,p);if(g.getError())throw Error('readPixels failed');return p;}
          const ground=[];
          for(let stage=0;stage<3;stage++){
            const s=new PactMeshes.Scene();s.floor(W,H,stage,'LUMA');
            for(const key of Object.keys(s.groups)){const arr=s.groups[key],a=[];for(let i=0;i<arr.length;i+=16)if(arr[i+7]===PactMeshes.LAYER.GROUND)a.push(...arr.slice(i,i+16));s.groups[key]=a;}
            f.world={stage,enemies:[]};const p=raw(s);let sum=0,count=0,lit=0;
            for(let y=24;y<232;y++)for(let x=24;x<232;x++){const i=(y*W+x)*4,v=(p[i]+p[i+1]+p[i+2])/3;sum+=v;count++;if(v>4)lit++;}
            ground.push({stage,meanLinearByte:sum/count,litFraction:lit/count});
          }
          const foreground=[];
          for(const type of ['player','chaser','turret','spinner','lancer','warden','boss']){
            const s=new PactMeshes.Scene();if(type==='player')s.ship(128,128,0,1,7);else if(type==='boss')s.boss({x:128,y:128,rot:.6,phase:2},2,7);else s.enemy({type,x:128,y:128,rot:.6,spawn:0,hit:0},7,{x:64,y:128});
            const bare=raw(s);const mask=[];for(let i=3;i<bare.length;i+=4)mask.push(bare[i]>128);
            s.box(128,128,400,200,200,300,0,[.03,.04,.05],.6,.8,0,.86);
            const covered=raw(s);let count=0,mismatch=0,bright=0;
            for(let i=0;i<mask.length;i++){const present=covered[i*4+3]>128;if(mask[i]){count++;if(covered[i*4]+covered[i*4+1]+covered[i*4+2]>50)bright++;}if(mask[i]!==present)mismatch++;}
            foreground.push({type,pixels:count,maskMismatch:mismatch,brightFraction:bright/Math.max(1,count)});
          }
          return {ground,foreground};
        }''')
        for g in pixels['ground']:assert g['meanLinearByte']>4 and g['litFraction']>.8,g
        for e in pixels['foreground']:assert e['pixels']>100 and e['maskMismatch']==0 and e['brightFraction']>.25,e
        # Exercise all settings via their real event handlers, including exact OFF.
        page.evaluate("__PACT_TEST__.show('pause')")
        page.click('#pause-settings')
        assert page.evaluate("document.querySelector('#settings-screen').scrollWidth<=document.querySelector('#settings-screen').clientWidth+1")
        for n in [0,1,2]:
            page.evaluate('''n=>{for(const id of ['postfx','bloom','bganim']){const e=document.getElementById(id);e.value=n;e.dispatchEvent(new Event('input',{bubbles:true}));}__PACT_TEST__.render(7)}''',n)
            opts=page.evaluate('__PACT_TEST__.options')
            assert opts['postfx']==n and opts['bloom']==n and opts['bganim']==n
            assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
        if name=='portrait':page.screenshot(path=str(OUT/'portrait-settings.png'))
        # Reduced-effects and LDR render targets remain valid.
        page.evaluate("document.getElementById('reduced').checked=true;document.getElementById('reduced').dispatchEvent(new Event('change'));NEMESIS_RENDERER.fallback.hdr=false;NEMESIS_RENDERER.fallback.size='';__PACT_TEST__.render(7)")
        assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
        if not mobile:
            page.evaluate("window.loss=NEMESIS_RENDERER.fallback.gl.getExtension('WEBGL_lose_context');loss.loseContext()")
            page.wait_for_timeout(350);assert 'CONTEXT LOST' in page.evaluate('NEMESIS_RENDERER.stats().backend')
            page.evaluate('loss.restoreContext()');page.wait_for_timeout(600)
            page.evaluate('__PACT_TEST__.render(7)');assert page.evaluate('NEMESIS_RENDERER.stats().backend')=='WEBGL2 / PBR'
            assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
        else:
            before=page.evaluate('JSON.stringify(__PACT_TEST__.world)')
            page.set_viewport_size({'width':height,'height':width});page.evaluate('__PACT_TEST__.render(7)')
            assert page.evaluate('JSON.stringify(__PACT_TEST__.world)')==before
            assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
        assert not errors,errors;assert not network,network
        results.append({'viewport':[width,height],'name':name,'stageFrames':frames,'pixels':pixels,'pageErrors':errors,'externalRequests':len(network),'settingsLevels':[0,1,2],'rgba8Fallback':'PASS','rotationOrContextRestore':'PASS'})
        context.close()
    report={'build':'0.3.6.1','browser':browser.version,'renderer':'ANGLE / SwiftShader (software)','method':'exact standalone HTML in memory; offline; no local/file URL policy bypass','webgpu':'clip-space numeric regression only; native execution NOT TESTED','results':results}
    (OUT/'browser-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2),flush=True)
    browser.close()
