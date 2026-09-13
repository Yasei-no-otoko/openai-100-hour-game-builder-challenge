"""Offline portrait/touch regression. Playwright is test-only, not a runtime
requirement. Real Chromium multi-touch is sent via CDP (not synthetic click).
Use --browser /path/to/chromium to override the locally installed executable.
"""
from pathlib import Path
import argparse,json,subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--browser',default='/usr/bin/chromium');args=parser.parse_args()
HTML=(ROOT/'dist/NEMESIS-PACT.html').read_text()
OUT=ROOT/'docs'/'screenshots'/'portrait';OUT.mkdir(parents=True,exist_ok=True)
checks=[];sizes=[];errors=[];network=[]

def assert_bounds(page,selector,minsize=44):
    b=page.locator(selector).bounding_box();v=page.viewport_size
    assert b, selector
    assert b['width']>=minsize-.1 and b['height']>=minsize-.1,(selector,b)
    assert b['x']>=-.5 and b['x']+b['width']<=v['width']+.5,(selector,b,v)
    assert b['y']>=-.5 and b['y']+b['height']<=v['height']+.5,(selector,b,v)
    return {k:round(b[k],2) for k in b}

def no_horizontal_overflow(page,selector):
    data=page.locator(selector).evaluate('(el)=>({scroll:el.scrollWidth,client:el.clientWidth})')
    assert data['scroll']<=data['client']+1,(selector,data)

def build_page(browser,w,h,safe=False):
    ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=2,has_touch=True,is_mobile=True,offline=True)
    page=ctx.new_page();page.set_default_timeout(4000);page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda req:network.append(req.url) if req.url.startswith(('http:', 'https:', 'ws:', 'wss:')) else None)
    page.evaluate('window.__PACT_TEST_MODE__=true');page.set_content(HTML);page.wait_for_timeout(100)
    if safe:
        page.evaluate("document.body.style.setProperty('--safe-top','47px');document.body.style.setProperty('--safe-bottom','34px');window.dispatchEvent(new Event('resize'))")
    return ctx,page

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for w,h,safe in [(320,568,False),(375,667,False),(390,844,False),(393,852,True),(430,932,True),(360,800,False)]:
        print('viewport',w,h,safe,flush=True);ctx,page=build_page(browser,w,h,safe)
        assert page.evaluate('__PACT_TEST__.mobile')
        assert page.evaluate('Math.abs(document.getElementById("stage").clientHeight-innerHeight)')<2
        no_horizontal_overflow(page,'#menu')
        page.locator('#start').scroll_into_view_if_needed();assert_bounds(page,'#start')
        if w==390:page.screenshot(path=str(OUT/'01-title.png'))
        page.locator('#start').tap();no_horizontal_overflow(page,'#loadout')
        page.locator('[data-difficulty="assist"]').tap();page.locator('#seed').fill('PORTRAIT-QA')
        page.locator('#launch').tap();assert page.locator('#choices').is_visible()
        no_horizontal_overflow(page,'#choices');assert page.locator('#choice-confirm').is_disabled()
        # A card previews; only explicit confirmation starts the simulation.
        page.locator('.choice-card').first.tap()
        assert page.evaluate('__PACT_TEST__.world.phase')=='pact'
        assert page.evaluate('__PACT_TEST__.world.time')==0
        assert page.locator('.choice-card.selected').count()==1
        page.locator('#choice-confirm').scroll_into_view_if_needed();assert_bounds(page,'#choice-confirm')
        if w==390:page.screenshot(path=str(OUT/'02-contracts.png'))
        page.locator('#choice-confirm').tap();page.wait_for_timeout(250)
        assert page.evaluate('__PACT_TEST__.world.width')==720
        targets={s:assert_bounds(page,s) for s in ['#pause-btn','#move-pad','#touch-parry','#touch-dash','#touch-nova']}
        view=page.evaluate('__PACT_TEST__.view');deck=page.locator('#touch-controls').bounding_box()
        assert view['field']['y']+view['field']['height']<=deck['y']+.5
        # Whole world fits, using a uniform scale in both directions.
        assert page.evaluate('''()=>{const a=__PACT_TEST__,v=a.view,w=a.world;return v.x>=v.field.x-.1&&v.y>=v.field.y-.1&&v.x+w.width*v.scale<=v.field.x+v.field.width+.1&&v.y+w.height*v.scale<=v.field.y+v.field.height+.1}''')
        page.locator('#pause-btn').tap();assert_bounds(page,'#resume')
        page.locator('#pause-help').tap();page.locator('#help-close').tap();page.locator('#pause-settings').tap()
        no_horizontal_overflow(page,'#settings-screen')
        page.locator('#lefthanded').check();page.locator('#settings-close').tap();page.locator('#resume').tap()
        assert page.locator('#move-pad').bounding_box()['x']>page.locator('#touch-parry').bounding_box()['x']
        # Damage/death result is a fixture for responsive output, not a clear.
        page.evaluate("__PACT_TEST__.world.phase='dead';__PACT_TEST__.results()")
        no_horizontal_overflow(page,'#result');page.locator('#export').scroll_into_view_if_needed();assert_bounds(page,'#export')
        page.locator('#retry').tap();assert page.locator('#choices').is_visible()
        sizes.append({'viewport':f'{w}x{h}','safe_area_simulated':safe,'touch_targets':targets,'passed':True})
        ctx.close()
    checks.extend(['six portrait viewports 320–430 CSS px wide','full-height unscaled DOM; no horizontal overflow','44px+ active controls and confirmation','contract preview does not start combat','complete uniformly scaled arena above controls','left-handed mirrored controls','scrollable setup/help/settings/result and retry','simulated 47px top / 34px bottom safe areas'])
    # Multi-touch and lifecycle regression in a separate, unlimited-health lesson.
    ctx,page=build_page(browser,390,844)
    page.locator('#train').tap();page.wait_for_timeout(100)
    cdp=ctx.new_cdp_session(page);active={}
    def point(x,y):return {'x':round(x,2),'y':round(y,2),'radiusX':6,'radiusY':6,'force':1}
    def begin(id,x,y):
        active[id]=point(x,y);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[dict(p,id=i) for i,p in active.items()]})
    def move(id,x,y):
        active[id]=point(x,y);cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[dict(p,id=i) for i,p in active.items()]})
    def end(id):
        released=active.pop(id)
        # The tested Chromium 144 supports explicitly releasing one contact by ID.
        # Sending the remaining contacts here would end the wrong finger.
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[dict(released,id=id)]})
    def center(selector):
        b=page.locator(selector).bounding_box();return b['x']+b['width']/2,b['y']+b['height']/2
    px,py=center('#move-pad');begin(1,px,py);move(1,px+28,py-14);page.wait_for_timeout(180)
    assert page.evaluate('__PACT_TEST__.touch.snapshot().mx')>.2
    x1=page.evaluate('__PACT_TEST__.world.p.x');page.wait_for_timeout(130)
    assert page.evaluate('__PACT_TEST__.world.p.x')>x1+15
    # Observe emissions without changing game state or input processing.
    page.evaluate('''()=>{const w=__PACT_TEST__.world,emit=w.emit;window.__qaEvents=[];w.emit=function(t,d){__qaEvents.push(t);return emit.call(this,t,d)}}''')
    # A reproducible reflection target, then a real second-finger parry.
    page.evaluate('''()=>{const w=__PACT_TEST__.world;w.p.parryCd=0;w.bullet(w.p.x+42,w.p.y,Math.PI,20,true)}''')
    ex,ey=center('#touch-parry');begin(2,ex,ey);page.wait_for_timeout(60)
    assert page.evaluate('__qaEvents.includes("parry-start")')
    assert page.evaluate('__PACT_TEST__.world.parries')>=1
    end(2);page.wait_for_timeout(50)
    assert page.evaluate('__PACT_TEST__.touch.snapshot().movingPointer') is not None
    assert page.evaluate('__PACT_TEST__.touch.snapshot().mx')>.2
    # Add a dash finger while keeping the movement finger captured.
    dx,dy=center('#touch-dash');begin(3,dx,dy);page.wait_for_timeout(150)
    assert page.evaluate('__qaEvents.filter(x=>x==="dash").length')==1
    page.wait_for_timeout(1100) # Holding the button must not auto-repeat.
    assert page.evaluate('__qaEvents.filter(x=>x==="dash").length')==1
    end(3);assert page.evaluate('__PACT_TEST__.touch.snapshot().mx')>.2
    end(1);page.wait_for_timeout(220)
    assert page.evaluate('__PACT_TEST__.touch.snapshot().mx')==0
    assert abs(page.evaluate('__PACT_TEST__.world.p.vx'))<2
    # Secondary relative-drag input works anywhere on the playfield.
    field=page.evaluate('__PACT_TEST__.view.field');sx,sy=field['x']+field['width']*.6,field['y']+field['height']*.65
    begin(8,sx,sy);move(8,sx-22,sy+20);page.wait_for_timeout(80)
    assert page.evaluate('__PACT_TEST__.touch.snapshot().mx')<0
    cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});active.clear();page.wait_for_timeout(40)
    assert page.evaluate('__PACT_TEST__.touch.snapshot().movingPointer') is None
    nx,ny=center('#touch-nova');begin(4,nx,ny);page.wait_for_timeout(80);end(4)
    assert page.evaluate('__qaEvents.includes("nova")')
    # Rotation pauses; the world is not resized, restarted, advanced or warped.
    original=page.evaluate('({x:__PACT_TEST__.world.p.x,y:__PACT_TEST__.world.p.y,width:__PACT_TEST__.world.width,height:__PACT_TEST__.world.height})')
    begin(5,px,py);move(5,px-20,py)
    page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(60)
    assert page.evaluate('__PACT_TEST__.screen')=='pause'
    state=page.evaluate('__PACT_TEST__.world.report()');time_before=state['seconds']
    page.wait_for_timeout(140);assert page.evaluate('__PACT_TEST__.world.report().seconds')==time_before
    assert page.evaluate('__PACT_TEST__.touch.snapshot().movingPointer') is None
    assert state['arena']=={'width':original['width'],'height':original['height']}
    # Physical touch points end on rotation in actual browsers; terminate CDP's.
    cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});active.clear()
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100)
    page.locator('#resume').tap();page.wait_for_timeout(60)
    assert page.evaluate('__PACT_TEST__.world.report().arena')==state['arena']
    page.evaluate("window.dispatchEvent(new Event('blur'))");assert page.evaluate('__PACT_TEST__.screen')=='pause'
    page.locator('#resume').tap()
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
    assert page.evaluate('__PACT_TEST__.screen')=='pause'
    page.evaluate("delete document.hidden")
    checks.extend(['real CDP two-finger movement + reflection','movement capture survives action-finger lift','real CDP simultaneous movement + dash','held dash does not repeat','pointercancel releases movement','relative drag on playfield','real touch nova','rotation pauses, releases capture, preserves geometry and progress','blur and synthetic visibilitychange pause'])
    # Breach is intentionally away from combat buttons and requires confirmation.
    page.evaluate('__PACT_TEST__.start(false,"TOUCH-CONFIRM")');page.locator('.choice-card').first.tap();page.locator('#choice-confirm').tap()
    page.locator('#pause-btn').tap();page.locator('#pause-breach').tap()
    assert page.evaluate('__PACT_TEST__.world.broken') is False
    assert page.locator('#confirm-screen').is_visible();assert_bounds(page,'#confirm-cancel');assert_bounds(page,'#confirm-yes')
    page.locator('#confirm-cancel').tap();assert page.evaluate('__PACT_TEST__.world.broken') is False
    page.locator('#pause-breach').tap();page.locator('#confirm-yes').tap();assert page.evaluate('__PACT_TEST__.world.broken') is True
    assert page.evaluate('__PACT_TEST__.screen')=='game'
    # Capture a boss fixture after the read-only UI/control tests.
    page.evaluate('''()=>{const a=__PACT_TEST__,w=a.world;w.stage=1;w.wave=2;w.pact='silence';w.broken=false;w.mods=PactCore.modifiers('silence');w.upgrades={scatter:1,orbit:2,rail:1};w.p.hp=w.p.maxHp;w.startWave();w.p.inv=100;w.enemies[0].hp*=.58;w.enemies[0].phase=1;a.consumeEvents();a.updateHUD()}''')
    page.wait_for_timeout(3500)
    page.evaluate("__PACT_TEST__.show('pause');document.getElementById('pause').hidden=true;document.getElementById('hud').hidden=false;document.getElementById('touch-controls').hidden=false;__PACT_TEST__.updateHUD();__PACT_TEST__.render()")
    page.screenshot(path=str(OUT/'03-boss.png'))
    checks.extend(['breach confirmation cancel and commit','portrait boss render fixture'])
    # Native vertical scroll should not select a card accidentally.
    page.set_viewport_size({'width':320,'height':568});page.wait_for_timeout(80)
    page.evaluate('__PACT_TEST__.start(false,"SCROLL-QA")')
    page.wait_for_timeout(100);box=page.locator('.choice-card').first.bounding_box()
    tx=box['x']+box['width']/2;ty=min(650,box['y']+box['height']-20)
    begin(6,tx,ty)
    for i in range(1,9):move(6,tx,ty-i*28);page.wait_for_timeout(16)
    end(6);page.wait_for_timeout(250)
    assert page.locator('#choice-confirm').is_disabled()
    assert page.evaluate('document.getElementById("choices").scrollTop')>0
    checks.append('native touch card scrolling neither selects nor starts combat')
    # Actual full campaign in the browser engine, with public legal inputs.
    # Unlike the boss screenshot, this run never changes combat/progression state.
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(80)
    pilot=subprocess.check_output(['node','-e',"console.log(require('./tests/simulate.js').pilot.toString())"],cwd=ROOT,text=True)
    page.add_script_tag(content='window.__MOBILE_PILOT__=(()=>{const segmentHit=PactCore.segmentHit;return '+pilot+';})();')
    browser_run=page.evaluate("""()=>{
      const a=__PACT_TEST__;a.sound.settings(0,false,true);a.start(false,'PORTRAIT-BROWSER-01');let frames=0;
      while(!['won','dead'].includes(a.world.phase)&&frames<120*720){
        const w=a.world;
        if(w.phase==='pact')a.choose(['mercy','sanctuary','mirror'][w.stage]);
        else if(w.phase==='upgrade'){
          const weights={scatter:7,rapid:7,orbit:9,homing:8,rail:7,parry:6,magnet:3,hull:9,leech:7,echo:7,razor:2,nova:4,repair:w.p.hp<=3?20:0};
          a.choose([...w.offers].sort((x,y)=>weights[y.id]-weights[x.id])[0].id);
        }else{for(let i=0;i<120&&w.phase==='combat';i++){w.step(1/120,__MOBILE_PILOT__(w));frames++;}a.advance(0);}
      }
      a.results();a.render();return a.world.report();
    }""")
    assert browser_run['outcome']=='won' and browser_run['bosses']==3,browser_run
    assert browser_run['layout']=='portrait'
    page.screenshot(path=str(OUT/'04-result.png'))
    checks.append('full portrait campaign in Chromium with legal bot inputs; three bosses and ending')
    assert not errors,errors
    assert not network,network
    result={'version':'0.2.1-en','passed':True,'browser':'Chromium '+browser.version,'browser_playthrough':{k:browser_run[k] for k in ['seed','difficulty','arena','outcome','seconds','bosses','damageTaken','score']},'viewport_cases':sizes,'checks':checks,'javascript_errors':errors,'external_network_requests':len(network),'notes':['Exact standalone HTML loaded in memory with networking disabled.','Portrait touch input is real Chromium multi-touch via CDP.','Boss screenshot uses a controlled fixture; not a human playthrough.','Not run on a physical iPhone / Android device.','Safari and WebKit were not tested in this run.','OS safe areas are simulated through CSS custom properties; actual browser chrome is unverified.']}
    (ROOT/'docs'/'mobile-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'passed':True,'viewports':len(sizes),'checks':len(checks),'javascript_errors':errors,'external_network_requests':len(network)},ensure_ascii=False,indent=2))
    ctx.close();browser.close()
