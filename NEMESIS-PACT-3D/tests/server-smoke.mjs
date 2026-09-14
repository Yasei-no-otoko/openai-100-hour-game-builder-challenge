/** Loopback integration checks: exact hosted HTML + mock endpoint. Never calls OpenAI. */
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const app=spawn(process.execPath,['tools/serve.js'],{cwd:root,env:{...process.env,PORT:String(port),AI_MODE:'mock',OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
const base='http://127.0.0.1:'+port;let logs='';app.stderr.on('data',b=>logs+=b);
const checks=[];const request={task:'negotiate',prompt:'Reflect your attacks',seed:'HTTP-SMOKE',stage:0,allowed:['mercy','mirror','glass'],telemetry:{kills:10,parries:25}};
try{
 for(let i=0;i<100;i++){try{const res=await fetch(base+'/');if(res.status===200)break;}catch{}await new Promise(r=>setTimeout(r,40));if(i===99)throw Error('Server did not start: '+logs);}
 let res=await fetch(base+'/'),html=await res.text();assert.equal(res.status,200);assert.equal(html,await readFile(path.join(root,'public/index.html'),'utf8'));assert.ok(html.includes('window.NEMESIS_HOSTED=true'));assert.ok(html.includes("connect-src 'self'"));checks.push('Hosted bytes and same-origin opt-in flag');
 for(const url of ['/.env','/.env.example','/server/intelligence.mjs','/src/core.js','/%2eenv','/missing']){res=await fetch(base+url);assert.equal(res.status,404,url);}checks.push('Secrets / source / unknown paths are not served');
 res=await fetch(base+'/api/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});assert.equal(res.status,200);const out=await res.json();assert.equal(out.provider,'mock');assert.equal(out.decision.contractId,'mirror');assert.equal(out.fallback,false);checks.push('HTTP POST mock selects a mechanical contract ID');
 res=await fetch(base+'/api/intelligence');assert.equal(res.status,405);checks.push('GET rejected');
 res=await fetch(base+'/api/intelligence',{method:'POST',body:'x'});assert.equal(res.status,415);checks.push('Non-JSON rejected');
 res=await fetch(base+'/api/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...request,prompt:'x'.repeat(5000)})});assert.equal(res.status,413);checks.push('Oversize body rejected');
 const report={build:'0.4.1',node:process.version,checks,upstreamCalls:0,scope:'Loopback integration, not a Vercel deployment'};await writeFile(path.join(root,'docs/validation-0.4.1/server-smoke.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{app.kill('SIGTERM');}
