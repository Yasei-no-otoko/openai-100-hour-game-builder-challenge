"""In-memory standalone browser QA. Xvfb is needed for ANGLE in this Linux image.
Run: xvfb-run -a python3 tests/gpu_browser_test.py
This does not test file-URL/HTTPS delivery, real phones or WebGPU execution.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
SHOTS=ROOT/'docs'/'recovery-screenshots'; SHOTS.mkdir(parents=True,exist_ok=True)
html=(ROOT/'dist'/'NEMESIS-PACT.html').read_text()
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for name,width,height,mobile in [('desktop',1280,800,False),('portrait',390,844,True),('small',320,568,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},has_touch=mobile,is_mobile=mobile,device_scale_factor=1,offline=True)
        page=context.new_page(); errors=[]; network=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:','ws:','wss:')) else None)
        page.evaluate('window.__PACT_TEST_MODE__=true'); page.set_content(html)
        for _ in range(60):
            if page.evaluate('NEMESIS_RENDERER.stats().frames>2'):break
            page.wait_for_timeout(250)
        assert page.evaluate('NEMESIS_RENDERER.stats().frames>2')
        assert page.evaluate('NEMESIS_RENDERER.stats().backend')=='WEBGL2 / PBR'
        page.screenshot(path=str(SHOTS/(name+'-title.png')))
        page.click('#train');page.wait_for_timeout(1000)
        page.evaluate("__PACT_TEST__.show('pause')")
        before=page.evaluate('JSON.stringify(__PACT_TEST__.world)')
        page.evaluate("() => {for(let i=0;i<8;i++)__PACT_TEST__.render();}")
        assert page.evaluate('JSON.stringify(__PACT_TEST__.world)')==before,'Renderer mutated simulation'
        # Exercise ordinary 2D inputs through the unchanged simulation.
        x=page.evaluate('__PACT_TEST__.world.p.x')
        page.evaluate("__PACT_TEST__.advance(60,{mx:1,shoot:true,autoAim:true})")
        assert page.evaluate('__PACT_TEST__.world.p.x')>x
        page.evaluate("__PACT_TEST__.show('game')");page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS/(name+'-training.png')))
        # Controlled boss fixture, not a legal-input campaign completion.
        page.evaluate("""()=>{const w=__PACT_TEST__.world;w.training=false;w.stage=2;w.wave=2;w.pact='mirror';w.mods=PactCore.modifiers('mirror');w.startWave();w.p.inv=100;__PACT_TEST__.advance(220,{shoot:true,autoAim:true});__PACT_TEST__.updateHUD();__PACT_TEST__.consumeEvents();}""")
        page.wait_for_timeout(450);page.evaluate("__PACT_TEST__.show('pause');document.getElementById('pause').hidden=true;document.getElementById('hud').hidden=false;document.getElementById('touch-controls').hidden=!__PACT_TEST__.mobile;__PACT_TEST__.render();")
        page.screenshot(path=str(SHOTS/(name+'-boss.png')))
        assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
        if not mobile:
            page.evaluate("__PACT_TEST__.world.p.energy=100;__PACT_TEST__.world.nova();__PACT_TEST__.consumeEvents();__PACT_TEST__.render();")
            assert page.evaluate('NEMESIS_RENDERER.shock.strength')==1
            page.evaluate("NEMESIS_RENDERER.fallback.hdr=false;NEMESIS_RENDERER.fallback.size='';__PACT_TEST__.render();")
            assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
            page.evaluate("window.__LOSS_EXT=NEMESIS_RENDERER.fallback.gl.getExtension('WEBGL_lose_context');window.__LOSS_EXT.loseContext()")
            page.wait_for_timeout(500)
            assert 'CONTEXT LOST' in page.evaluate('NEMESIS_RENDERER.stats().backend')
            page.evaluate("window.__LOSS_EXT.restoreContext()")
            for _ in range(40):
                if page.evaluate("NEMESIS_RENDERER.stats().backend==='WEBGL2 / PBR'"):break
                page.wait_for_timeout(250)
            assert page.evaluate("NEMESIS_RENDERER.stats().backend==='WEBGL2 / PBR'")
            page.evaluate('__PACT_TEST__.render()')
            assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
        if mobile:
            page.set_viewport_size({'width':height,'height':width});page.wait_for_timeout(200)
            page.evaluate('__PACT_TEST__.render()')
            assert page.evaluate('NEMESIS_RENDERER.fallback.gl.getError()')==0
        assert not errors,errors
        assert not network,network
        results.append({'viewport':name,'size':[width,height],'backend':page.evaluate('NEMESIS_RENDERER.stats()'),'page_errors':errors,'external_network_requests':len(network)})
        context.close()
    report={'build':'0.3.0-recovery.1','browser':browser.version,'adapter':'ANGLE / SwiftShader software rendering','checks':['single-file memory load','WebGL2 shader compilation and rendering','desktop and two portrait sizes','read-only renderer','unchanged 2D movement','three boss fixtures','WebGL error flags','WebGL RGBA8 fallback','context loss/restoration','rotation','network-disabled runtime'],'webgpu_execution':'NOT TESTED: no secure browser context in this sandbox','file_url_delivery':'NOT TESTED: browser navigation policy blocks file and local HTTP URLs','results':results}
    (ROOT/'docs'/'recovery-browser-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    browser.close()
