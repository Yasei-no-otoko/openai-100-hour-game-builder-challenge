"""Real Web Audio synthesis, transport and the shipped Settings UI in Chromium.
No external music service, paid API, or recording of a microphone is used.
"""
from pathlib import Path
import base64, hashlib, json, math, os, wave
import numpy as np
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'validation-0.4.1';OUT.mkdir(exist_ok=True)
WAV=Path(os.environ.get('NEMESIS_AUDIO_WAV_DIR',str(OUT/'audio-wav')));WAV.mkdir(parents=True,exist_ok=True)
HTML=(ROOT/'dist/NEMESIS-PACT.html').read_text()
results={'build':'0.4.1','htmlSha256':hashlib.sha256(HTML.encode()).hexdigest(),'rendered':[],'ui':[],'checks':[]}

def check(label,ok):
    assert ok,label
    results['checks'].append(label)

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    results['browser']=browser.version
    ctx=browser.new_context(offline=True)
    page=ctx.new_page();errors=[];network=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:','ws:','wss:')) else None)
    page.set_content('<html><head></head><body>Offline audio validation</body></html>')
    page.add_script_tag(content=(ROOT/'src/score.js').read_text());page.add_script_tag(content=(ROOT/'src/audio.js').read_text())
    tracks=page.evaluate('PactScore.TRACKS')
    for tr in tracks:
        result=page.evaluate('''async id=>{
          const b=await PactSound.renderOffline(id,8,{seed:'SUBMISSION-AUDIO',sampleRate:24000,intensity:.8});
          const left=b.getChannelData(0),right=b.getChannelData(1);let peak=0,sum=0,invalid=0,stereo=0;
          const data=new Uint8Array(b.length*4),view=new DataView(data.buffer);
          for(let i=0;i<b.length;i++)for(let ch=0;ch<2;ch++){const x=ch?right[i]:left[i];if(!Number.isFinite(x))invalid++;peak=Math.max(peak,Math.abs(x));sum+=x*x;view.setInt16((i*2+ch)*2,Math.round(Math.max(-1,Math.min(1,x))*32767),true);if(ch)stereo+=Math.abs(left[i]-right[i]);}
          let binary='';for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));
          return{pcm:btoa(binary),peak,rms:Math.sqrt(sum/(b.length*2)),invalid,stereo:stereo/b.length,sampleRate:b.sampleRate,frames:b.length};
        }''',tr['id'])
        pcm=base64.b64decode(result.pop('pcm'))
        f=WAV/(tr['id']+'.wav')
        with wave.open(str(f),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(result['sampleRate']);w.writeframes(pcm)
        a=np.frombuffer(pcm,dtype='<i2').astype(np.float32)/32768
        result.update(id=tr['id'],name=tr['name'],bpm=tr['bpm'],sha256=hashlib.sha256(pcm).hexdigest(),clippedSamples=int((np.abs(a)>=.999).sum()))
        check('non-silent finite stereo render: '+tr['id'],result['rms']>.002 and result['invalid']==0 and result['stereo']>.00001)
        check('peak headroom / no clipped samples: '+tr['id'],result['peak']<.95 and result['clippedSamples']==0)
        results['rendered'].append(result);print('RENDER',tr['id'],round(result['rms'],4),round(result['peak'],4),flush=True)
    check('17 distinct PCM outputs',len({x['sha256'] for x in results['rendered']})==17)
    (OUT/'audio-render-results.json').write_text(json.dumps(results,indent=2))
    ctx.close()

    for name,width,height,mobile in [('desktop',1280,800,False),('portrait',390,844,True),('small',320,568,True)]:
        print('UI BEGIN',name,flush=True)
        ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=mobile,is_mobile=mobile,device_scale_factor=1,offline=True)
        page=ctx.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:','ws:','wss:')) else None)
        page.evaluate('window.__PACT_TEST_MODE__=true;window.requestAnimationFrame=()=>0;')
        page.set_content(HTML);print('UI LOADED',name,errors,flush=True);page.evaluate('async()=>{await NEMESIS_RENDERER.initialized;__PACT_TEST__.render(2)}');print('UI RENDERED',name,flush=True)
        page.click('#settings');check(name+' soundtrack dropdown includes 17 cues',page.locator('#music-track option').count()==17)
        page.select_option('#music-track','tidal');page.click('#music-preview');page.wait_for_timeout(850)
        status=page.evaluate('__PACT_TEST__.sound.status()');print('PREVIEW STATUS',name,status,flush=True);check(name+' selected audio actually scheduled',status['cue']=='tidal' and status['scheduledNotes']>0 and status['playing'])
        page.evaluate('__PACT_TEST__.updateMusicStatus()')
        page.locator('.sound-lab').scroll_into_view_if_needed();page.screenshot(path=str(OUT/(name+'-soundtrack.png')))
        check(name+' settings no horizontal overflow',page.evaluate("(()=>{const e=document.querySelector('#settings-screen');return e.scrollWidth<=e.clientWidth+1})()"))
        page.select_option('#music-track','roseglass-boss');page.wait_for_timeout(850)
        check(name+' preview changes cue',page.evaluate('__PACT_TEST__.sound.status().cue')=='roseglass-boss')
        page.click('#music-preview');before=page.evaluate('__PACT_TEST__.sound.scheduledNotes');page.wait_for_timeout(250)
        check(name+' stopped preview does not continue sequencing',page.evaluate('__PACT_TEST__.sound.scheduledNotes')==before)
        page.evaluate("document.getElementById('music-volume').value=25;document.getElementById('music-volume').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('sfx-volume').value=80;document.getElementById('sfx-volume').dispatchEvent(new Event('input',{bubbles:true}));")
        opts=page.evaluate('__PACT_TEST__.options');check(name+' independent mix inputs wired',opts['musicVolume']==.25 and opts['sfxVolume']==.8)
        page.click('#settings-close');page.click('#train');page.wait_for_timeout(800)
        check(name+' training uses first sector cue',page.evaluate('__PACT_TEST__.sound.status().cue')=='verdigris')
        screen_cues=[]
        for stage in range(6):
            page.evaluate('''stage=>{const w=__PACT_TEST__.world;w.stage=stage;w.enemies=[];__PACT_TEST__.updateAudio();}''',stage)
            page.wait_for_timeout(80)
            sector=page.evaluate('__PACT_TEST__.sound.status().cue')
            page.evaluate('''()=>{const w=__PACT_TEST__.world;w.enemies=[{type:'boss',hp:100,maxHp:100,phase:0,spawn:.5}];__PACT_TEST__.updateAudio();}''')
            boss=page.evaluate('__PACT_TEST__.sound.status().cue');check(f'{name} sector {stage+1} routes to own boss arrangement',boss==sector+'-boss');screen_cues.append([sector,boss])
        # Return to a valid training world before resuming renderer fixtures.
        page.evaluate('__PACT_TEST__.start(true,"AUDIO-QA");__PACT_TEST__.show("pause")');page.wait_for_timeout(120)
        before=page.evaluate('__PACT_TEST__.sound.scheduledNotes');page.wait_for_timeout(350)
        check(name+' pause holds music transport',page.evaluate('__PACT_TEST__.sound.scheduledNotes')==before)
        page.evaluate('__PACT_TEST__.show("game")');page.wait_for_timeout(550)
        check(name+' resume reactivates transport',page.evaluate('__PACT_TEST__.sound.scheduledNotes')>before)
        page.evaluate('''()=>{const s=__PACT_TEST__.sound;for(const tr of PactScore.TRACKS)s.preview(tr.id)}''');page.wait_for_timeout(700)
        st=page.evaluate('__PACT_TEST__.sound.status()');check(name+' rapid previews bounded',st['voices']<=128 and st['retiring']<=2 and not st['errors'])
        page.evaluate('__PACT_TEST__.sound.destroy()');check(name+' audio lifecycle teardown',page.evaluate('__PACT_TEST__.sound.timer===null&&__PACT_TEST__.sound.voices.size===0'))
        results['ui'].append({'viewport':[width,height],'label':name,'cues':screen_cues,'finalStatus':st});ctx.close()
    check('no uncaught browser errors',not errors);check('no external requests for audio or game',not network)
    results.update(errors=errors,externalRequests=network,scope='Chromium software render + actual Web Audio and OfflineAudioContext; no physical listening-device or Safari verification')
    (OUT/'audio-results.json').write_text(json.dumps(results,indent=2))
    browser.close()
print('PASS',len(results['checks']),'audio/browser checks',flush=True)
