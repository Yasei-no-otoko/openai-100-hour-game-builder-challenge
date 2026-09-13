"""English UI localization and text-layout checks on the exact standalone build.
Controlled display fixtures cover all content; they are not gameplay clears.
The existing mobile/desktop tests separately cover legal-input playthroughs.
"""
from pathlib import Path
import argparse, json, re
from playwright.sync_api import sync_playwright, Error
ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--browser', default='/usr/bin/chromium')
args = parser.parse_args()
HTML = (ROOT / 'dist/NEMESIS-PACT.html').read_text()
OUT = ROOT / 'docs/screenshots/english'
OUT.mkdir(parents=True, exist_ok=True)
errors, network, cases = [], [], []
# Range rectangles catch clipped text even when its parent hides overflow.
# Vertical page scrolling is intentional; card/button clipping is not.
SCAN = r'''() => {
  const cjk=/[\u3040-\u30ff\u3400-\u9fff]/u, bad=[], clipped=[];
  const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walk.nextNode()) {
    const node=walk.currentNode,el=node.parentElement;
    if(!el || ['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName) || !node.textContent.trim()) continue;
    const range=document.createRange();range.selectNodeContents(node);
    const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
    if(!rects.length)continue;
    if(cjk.test(node.textContent))bad.push(node.textContent);
    for(const r of rects) {
      if(r.left < -1.5 || r.right > innerWidth+1.5)clipped.push({text:node.textContent.trim(),axis:'viewport-x',left:r.left,right:r.right});
      for(let a=el;a&&a!==document.body;a=a.parentElement){
        const s=getComputedStyle(a),b=a.getBoundingClientRect();
        if(['hidden','clip','auto'].includes(s.overflowX) && (r.left<b.left-2||r.right>b.right+2))clipped.push({text:node.textContent.trim(),axis:'ancestor-x',container:a.id||a.className});
        if(['hidden','clip'].includes(s.overflowY)&&!['ui','stage'].includes(a.id)&&!a.classList.contains('screen')&&(r.top<b.top-2||r.bottom>b.bottom+2))clipped.push({text:node.textContent.trim(),axis:'ancestor-y',container:a.id||a.className});
      }
    }
  }
  for(const el of document.querySelectorAll('[aria-label],[placeholder],[title]'))for(const attr of ['aria-label','placeholder','title'])if(cjk.test(el.getAttribute(attr)||''))bad.push(el.getAttribute(attr));
  return {lang:document.documentElement.lang,bad,clipped};
}'''

def inspect(page, name, case):
    data=page.evaluate(SCAN)
    assert data['lang']=='en', (name,data)
    assert not data['bad'], (name,data['bad'])
    assert not data['clipped'], (case['viewport'],name,data['clipped'])
    case['screens'].append(name)

def fixture_pacts(page, stage):
    page.evaluate('''stage=>{const a=__PACT_TEST__,w=a.world;
      w.stage=stage;w.phase='pact';a.advance(0);
    }''',stage)

def fixture_upgrades(page, offset):
    page.evaluate('''offset=>{const a=__PACT_TEST__,w=a.world;
      w.phase='upgrade';w.wave=0;w.offers=PactCore.UPGRADES.slice(offset,offset+3);a.advance(0);
    }''',offset)

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for w,h,touch,safe in [(320,568,True,False),(375,667,True,False),(390,844,True,False),(393,852,True,True),(430,932,True,True),(360,800,True,False),(844,390,True,False),(1440,900,False,False),(960,600,False,False)]:
        case={'viewport':f'{w}x{h}','touch':touch,'safe_area_simulated':safe,'screens':[]}
        print('English text layout',case['viewport'],flush=True)
        # English remains explicit even when the browser's preferred language is Japanese.
        ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if touch else 1,has_touch=touch,is_mobile=touch,locale='ja-JP',offline=True)
        page=ctx.new_page();page.set_default_timeout(5000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:','ws:','wss:')) else None)
        page.evaluate('window.__PACT_TEST_MODE__=true');page.set_content(HTML);page.wait_for_timeout(90)
        if safe:
            page.evaluate("document.body.style.setProperty('--safe-top','47px');document.body.style.setProperty('--safe-bottom','34px');window.dispatchEvent(new Event('resize'))")
        inspect(page,'title',case)
        if w==390:page.screenshot(path=str(OUT/'01-title.png'))
        if w==320:page.screenshot(path=str(OUT/'small-title.png'))
        page.locator('#help').click();inspect(page,'help',case)
        page.locator('#help-close').click();page.locator('#settings').click();inspect(page,'settings',case)
        page.locator('#settings-close').click();page.locator('#daily').click()
        assert re.fullmatch(r'DAILY-\d{4}-\d{2}-\d{2}',page.locator('#seed').input_value())
        inspect(page,'run-setup-and-daily-seed',case)
        if w==390:page.screenshot(path=str(OUT/'02-setup.png'))
        page.locator('#seed').fill('EN-LOCALIZATION');page.locator('#launch').click()
        for stage in range(3):
            fixture_pacts(page,stage);inspect(page,f'pact-sector-{stage+1}',case)
            ids=page.locator('.choice-card').evaluate_all('(els)=>els.map(el=>el.dataset.id)')
            for id in ids:
                if touch:
                    page.locator(f'.choice-card[data-id="{id}"]').click()
                    assert page.locator('#choice-confirm').inner_text()=='Sign this pact →'
                    assert page.evaluate('__PACT_TEST__.world.time')==0
                    inspect(page,f'pact-preview-{stage}-{id}',case)
            if w==390 and stage==0:
                page.locator('.choice-card[data-id="mercy"]').click()
                page.locator('#choices').evaluate('(el)=>el.scrollTop=0')
                page.screenshot(path=str(OUT/'03-pacts.png'))
        # Every upgrade's description, stack count and confirm label.
        for offset in range(0,13,3):
            fixture_upgrades(page,offset)
            if touch:
                page.locator('.choice-card').first.click()
                assert page.locator('#choice-confirm').inner_text()=='Equip this upgrade →'
            inspect(page,f'upgrade-group-{offset}',case)
            if w==390 and offset==0:page.screenshot(path=str(OUT/'04-upgrades.png'))
        # Actual sign/confirm interaction, then inspect every active pact HUD.
        for stage,id in [(0,'mercy'),(0,'mirror'),(0,'glass'),(1,'silence'),(1,'duel'),(1,'sanctuary'),(2,'velocity')]:
            fixture_pacts(page,stage)
            page.locator(f'.choice-card[data-id="{id}"]').click()
            if touch:page.locator('#choice-confirm').click()
            page.evaluate('__PACT_TEST__.updateHUD()')
            inspect(page,f'hud-{id}',case)
            # Reset display-fixture time, not used to claim a playthrough.
            page.locator('#pause-btn').click()
            page.evaluate('__PACT_TEST__.world.time=0')
        inspect(page,'pause',case)
        page.locator('#quit').click();inspect(page,'confirm-quit',case)
        assert page.locator('#confirm-title').inner_text()=='End this run?'
        page.locator('#confirm-cancel').click()
        if touch:
            page.locator('#pause-breach').click();inspect(page,'confirm-breach',case)
            assert page.locator('#confirm-title').inner_text()=='Break your pact?'
            if w==390:page.screenshot(path=str(OUT/'06-confirm.png'))
            page.locator('#confirm-yes').click()
            inspect(page,'broken-pact-announcement',case)
            page.locator('#pause-btn').click()
        # All ending branches and defeat, controlled text/layout fixtures.
        for outcome,breaches in [('won',0),('won',1),('won',3),('dead',0)]:
            page.evaluate('''args=>{const a=__PACT_TEST__,w=a.world;
              w.phase=args[0];w.breaches=args[1];w.score=42750;
              w.contracts=['mercy','sanctuary','velocity'].map((id,i)=>({id,stage:i,kept:i>=w.breaches}));
              w.upgrades=Object.fromEntries(PactCore.UPGRADES.map(u=>[u.id,1]));a.results();
            }''',[outcome,breaches])
            inspect(page,f'ending-{outcome}-{breaches}',case)
            if w==390 and outcome=='won' and breaches==0:page.screenshot(path=str(OUT/'07-ending.png'))
        cases.append(case);ctx.close()
    # Complete every mobile tutorial step through normal controls (target fixture
    # only for a reproducible reflection). Check the resulting English text.
    ctx=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True,is_mobile=True,offline=True)
    page=ctx.new_page();page.set_default_timeout(5000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:','ws:','wss:')) else None)
    page.evaluate('window.__PACT_TEST_MODE__=true');page.set_content(HTML)
    case={'viewport':'390x844 tutorial','touch':True,'screens':[]}
    page.locator('#train').tap();inspect(page,'lesson-move',case)
    page.screenshot(path=str(OUT/'05-training.png'))
    page.keyboard.down('KeyD');page.wait_for_timeout(1500);page.keyboard.up('KeyD')
    assert page.evaluate('__PACT_TEST__.trainingStep')==1
    inspect(page,'lesson-dash',case)
    page.locator('#touch-dash').tap();page.wait_for_timeout(320)
    assert page.evaluate('__PACT_TEST__.trainingStep')==2
    inspect(page,'lesson-parry',case)
    page.evaluate('''()=>{const w=__PACT_TEST__.world;w.p.parryCd=0;w.bullet(w.p.x-35,w.p.y,0,10,true);}''')
    page.locator('#touch-parry').tap();page.wait_for_timeout(80)
    assert page.evaluate('__PACT_TEST__.trainingStep')==3,page.evaluate('({step:__PACT_TEST__.trainingStep,parries:__PACT_TEST__.world.parries,p:__PACT_TEST__.world.p})')
    inspect(page,'lesson-nova',case)
    page.locator('#touch-nova').tap();page.wait_for_timeout(80)
    assert page.evaluate('__PACT_TEST__.trainingStep')==4
    inspect(page,'lesson-ready',case)
    # Verify the failure fallback string, without relying on a platform dialog.
    page.locator('#pause-btn').tap();page.locator('#pause-settings').tap()
    page.evaluate("()=>{document.getElementById('stage').requestFullscreen=()=>Promise.reject(new Error('QA unsupported fullscreen'));}")
    page.locator('#fullscreen').click()
    assert page.locator('#fullscreen').inner_text()=='Fullscreen unavailable in this browser'
    inspect(page,'fullscreen-unavailable',case)
    cases.append(case);ctx.close()
    # Attempt a direct file launch without weakening browser policy. Some managed
    # environments block all file URLs; report that as unverified, not a pass.
    ctx=browser.new_context(viewport={'width':1280,'height':800},offline=True)
    page=ctx.new_page();file_launch=False;file_launch_note=None
    try:
        page.goto((ROOT/'dist/NEMESIS-PACT.html').as_uri());page.wait_for_timeout(100)
        assert page.locator('#start').is_visible()
        assert page.evaluate('document.documentElement.lang')=='en'
        assert page.evaluate('typeof window.__PACT_TEST__')=='undefined'
        file_launch=True
    except Error as e:
        if 'ERR_BLOCKED_BY_ADMINISTRATOR' not in str(e):raise
        file_launch_note='Managed browser policy blocks file URLs (ERR_BLOCKED_BY_ADMINISTRATOR); direct-file launch remains unverified.'
    ctx.close()
    # Normal, non-test startup in the supported in-memory offline harness.
    ctx=browser.new_context(viewport={'width':1280,'height':800},offline=True)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:','ws:','wss:')) else None)
    page.set_content(HTML);page.wait_for_timeout(100)
    assert page.evaluate('typeof window.__PACT_TEST__')=='undefined'
    page.locator('#train').click();page.wait_for_timeout(100)
    assert page.locator('#tutorial-title').inner_text()=='01 / MOVE'
    ctx.close()
    assert not errors,errors
    assert not network,network
    result={'version':'0.2.1-en','passed':True,'browser':'Chromium '+browser.version,
      'cases':cases,'text_layout_checks':sum(len(c['screens']) for c in cases),
      'direct_file_launch_passed':file_launch,'file_launch_note':file_launch_note,'normal_startup_passed':True,'javascript_errors':errors,'external_network_requests':len(network),
      'scope':['All 7 pacts and 13 upgrade options','Three victory endings and defeat','English visible text, aria labels and placeholders','Text rectangle clipping, including overflow-hidden cards','Six portrait sizes, one touch landscape and two desktop sizes','Complete touch tutorial and fullscreen fallback','Same English UI when browser locale is ja-JP'],
      'limitations':['Display fixtures are not gameplay-clear evidence.','Only Linux Chromium; no physical iPhone/Android or Safari/WebKit.','OS safe areas simulated in CSS.','No human playability or performance benchmark.', *([file_launch_note] if file_launch_note else [])]}
    (ROOT/'docs/english-browser-results.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='cases'},indent=2))
    browser.close()
