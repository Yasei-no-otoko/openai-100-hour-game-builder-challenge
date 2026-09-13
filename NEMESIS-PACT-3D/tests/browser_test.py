"""Offline browser regression tests. Test dependency only: playwright + Chromium.
Run: python3 tests/browser_test.py [--browser /usr/bin/chromium]
"""
from pathlib import Path
import argparse, json, subprocess
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--browser', default='/usr/bin/chromium')
args = p.parse_args()
shots = ROOT / 'docs' / 'screenshots'
shots.mkdir(parents=True, exist_ok=True)
html = (ROOT/'dist'/'NEMESIS-PACT.html').read_text()
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=args.browser, headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
    context = browser.new_context(viewport={'width':1440,'height':900}, device_scale_factor=1, offline=True)
    page = context.new_page()
    errors, network = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: network.append(r.url) if r.url.startswith(('http:', 'https:', 'ws:', 'wss:')) else None)
    # Render the exact single-file build in memory, with networking disabled
    # from inception. File-URL navigation and HTTP delivery are not this test.
    page.evaluate('window.__PACT_TEST_MODE__ = true')
    page.set_content(html)
    page.wait_for_timeout(500)
    assert page.locator('#menu').is_visible()
    page.screenshot(path=str(shots/'01-title.png'))
    page.click('#help')
    assert page.locator('#help-screen').is_visible()
    page.click('#help-close')
    page.click('#settings')
    page.check('#reduced')
    page.locator('#volume').evaluate('(el) => el.value=35')
    page.locator('#volume').dispatch_event('input')
    page.click('#settings-close')
    page.click('#start')
    page.click('[data-difficulty="assist"]')
    page.fill('#seed','BROWSER-QA')
    page.click('#launch')
    assert page.locator('#choices').is_visible()
    page.screenshot(path=str(shots/'02-contracts.png'))
    page.keyboard.press('1')
    page.keyboard.down('KeyD')
    page.keyboard.down('KeyJ')
    page.wait_for_timeout(800)
    page.keyboard.up('KeyD')
    page.keyboard.up('KeyJ')
    assert page.evaluate('__PACT_TEST__.world.p.x') > 700
    page.keyboard.press('Space')
    page.wait_for_timeout(100)
    page.keyboard.press('Escape')
    assert page.locator('#pause').is_visible()
    before = page.evaluate('__PACT_TEST__.world.time')
    page.wait_for_timeout(300)
    assert page.evaluate('__PACT_TEST__.world.time') == before
    page.click('#resume')
    # Exercise real parry collision at a controlled, reproducible state.
    page.evaluate('''() => {const w=__PACT_TEST__.world;w.p.parryCd=0;w.p.inv=0;w.bullet(w.p.x+40,w.p.y,Math.PI,130,true);w.step(1/120,{parry:true});}''')
    assert page.evaluate('__PACT_TEST__.world.parries') >= 1
    page.evaluate('''() => {const w=__PACT_TEST__.world;w.p.energy=100;}''')
    page.keyboard.press('KeyF')
    page.wait_for_timeout(100)
    assert page.evaluate('__PACT_TEST__.world.p.energy') < 100
    page.keyboard.press('KeyQ')
    page.wait_for_timeout(100)
    assert page.evaluate('__PACT_TEST__.world.broken')
    # Visual boss fixture. This is not a claim of a human gameplay clear.
    page.evaluate('''() => {const a=__PACT_TEST__,w=a.world;w.stage=1;w.wave=2;w.pact='silence';w.broken=false;w.mods=PactCore.modifiers('silence');w.upgrades={scatter:1,orbit:2,rail:1};w.p.hp=w.p.maxHp;w.startWave();w.p.inv=100;w.enemies[0].hp*=.58;w.enemies[0].phase=1;a.consumeEvents();}''')
    page.wait_for_timeout(6200)
    page.keyboard.press('Escape')
    page.evaluate("document.getElementById('pause').hidden=true;__PACT_TEST__.updateHUD();__PACT_TEST__.render();")
    page.screenshot(path=str(shots/'03-battle.png'))
    page.evaluate("document.getElementById('pause').hidden=false")
    page.click('#resume')
    # Full browser playthrough with legal bot inputs (no combat state cheats).
    # The preceding screenshot is a visual fixture; this fresh run is not.
    pilot = subprocess.check_output(['node','-e',
      "console.log(require('./tests/simulate.js').pilot.toString())"], cwd=ROOT, text=True)
    # A script tag avoids eval, which the game's CSP deliberately forbids.
    page.add_script_tag(content='window.__QA_PILOT__ = (() => {const segmentHit=PactCore.segmentHit;return '+pilot+';})();')
    browser_run = page.evaluate("""() => {
      const a=__PACT_TEST__;a.sound.settings(0,false,true);a.start(false,'BROWSER-QA');
      let frames=0;
      while(!['won','dead'].includes(a.world.phase)&&frames<120*720){
        const w=a.world;
        if(w.phase==='pact')a.choose(['mercy','sanctuary','mirror'][w.stage]);
        else if(w.phase==='upgrade'){
          const weight={scatter:7,rapid:7,orbit:9,homing:8,rail:7,parry:6,magnet:3,hull:9,leech:7,echo:7,razor:2,nova:4,repair:w.p.hp<=3?20:0};
          const choice=[...w.offers].sort((x,y)=>weight[y.id]-weight[x.id])[0];a.choose(choice.id);
        }else{
          for(let i=0;i<120&&w.phase==='combat';i++){w.step(1/120,__QA_PILOT__(w));frames++;}
          a.advance(0);
        }
      }
      a.results();a.render();return a.world.report();
    }""")
    assert browser_run['outcome']=='won', browser_run
    assert browser_run['bosses']==3
    page.screenshot(path=str(shots/'04-ending.png'))
    assert page.locator('#result').is_visible()
    with page.expect_download() as download:
        page.click('#export')
    data = json.loads(Path(download.value.path()).read_text())
    assert data['seed']=='BROWSER-QA' and data['outcome']=='won'
    page.click('#retry')
    assert page.locator('#choices').is_visible()
    assert page.evaluate('__PACT_TEST__.world.time') == 0
    # about:blank storage is unavailable: the real fallback must not crash.
    page.evaluate('__PACT_TEST__.show("menu")')
    assert page.evaluate('__PACT_TEST__.options.reduced') is True
    assert abs(page.evaluate('__PACT_TEST__.options.volume')-.35) < .01
    page.click('#train')
    assert page.locator('#tutorial-hud').is_visible()
    page.click('#training-exit')
    assert page.locator('#menu').is_visible()
    # Small desktop viewport; logical canvas and UI share a single transform.
    page.set_viewport_size({'width':960,'height':600})
    page.click('#start')
    assert page.locator('#launch').bounding_box()['x'] >= 0
    assert not errors, errors
    assert not network, network
    result={'passed':True,'browser':browser.version,'external_network_requests':len(network),'file_url_status':'not tested; exact standalone HTML rendered in memory while offline','storage_status':'storage-denied fallback verified; real persistent reload not verified','page_errors':errors,'browser_playthrough':{k:browser_run[k] for k in ['seed','difficulty','outcome','seconds','bosses','damageTaken','score']},'checks':['exact standalone HTML loaded in memory; networking disabled','help/settings','settings state with storage denied','difficulty and seeded start','contract selection via keyboard','movement and shooting','dash','pause freezes simulation','actual parry collision','nova','contract breach','boss render fixture','full legal-input bot campaign in browser','result/retry','JSON download','training','960x600 layout']}
    (ROOT/'docs'/'browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False,indent=2))
    browser.close()

