/* Shared, bounded AI protocol. The local provider is a deterministic mock, NOT an LLM. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PactIntelligence=api;})(globalThis,function(){'use strict';
const CONTRACTS=['mercy','mirror','glass','silence','duel','sanctuary','velocity'];
const DIRECTORS=['balanced','pursuit','crossfire'];
const TASKS=['negotiate','director','debrief'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function cleanRequest(x){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Expected an object');
 if(Object.keys(x).some(k=>!['task','prompt','seed','stage','allowed','telemetry'].includes(k)))throw Error('Unknown field');
 if(!TASKS.includes(x.task))throw Error('Unknown task');
 if(typeof x.prompt!=='string'||x.prompt.length>280)throw Error('Prompt must be at most 280 characters');
 if(typeof x.seed!=='string'||x.seed.length>48)throw Error('Invalid seed');
 if(!Number.isInteger(x.stage)||x.stage<0||x.stage>5)throw Error('Invalid sector');
 if(!Array.isArray(x.allowed)||!x.allowed.length||x.allowed.length>7||new Set(x.allowed).size!==x.allowed.length||x.allowed.some(id=>!CONTRACTS.includes(id)))throw Error('Invalid pact list');
 const t=x.telemetry||{},telemetry={};if(typeof t!=='object'||Array.isArray(t))throw Error('Invalid telemetry');
 for(const k of Object.keys(t)){if(!['kills','parries','grazes','damageTaken','seconds','score'].includes(k))throw Error('Unknown telemetry');if(!Number.isFinite(t[k])||t[k]<0||t[k]>1e7)throw Error('Invalid telemetry value');telemetry[k]=Math.round(t[k]);}
 return {task:x.task,prompt:x.prompt.replace(/[\u0000-\u001f]/g,' ').trim(),seed:x.seed,stage:x.stage,allowed:[...x.allowed],telemetry};
}
function schema(r){return {type:'object',additionalProperties:false,properties:{task:{type:'string',enum:[r.task]},contractId:{type:'string',enum:r.allowed},directorId:{type:'string',enum:DIRECTORS},line:{type:'string'},rationale:{type:'string'}},required:['task','contractId','directorId','line','rationale']};}
function validateDecision(x,r){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==5||!['task','contractId','directorId','line','rationale'].every(k=>own(x,k)))throw Error('Invalid decision shape');
 if(x.task!==r.task||!r.allowed.includes(x.contractId)||!DIRECTORS.includes(x.directorId))throw Error('Decision outside the safe catalog');
 if(typeof x.line!=='string'||!x.line.trim()||x.line.length>340||typeof x.rationale!=='string'||!x.rationale.trim()||x.rationale.length>600)throw Error('Invalid decision text');
 return {task:x.task,contractId:x.contractId,directorId:x.directorId,line:x.line,rationale:x.rationale};
}
function mock(request){const r=cleanRequest(request),p=r.prompt.toLowerCase();let intent=r.allowed[0];
 const rules=[['mercy',/slow|speed|time|easier/],['mirror',/return|reflect|parry|mirror/],['glass',/damage|armor|glass|fragile/],['silence',/stop|silence|cease|quiet/],['duel',/alone|adds|minion|duel|witness/],['sanctuary',/safe|center|shelter|ground/],['velocity',/dash|fast|mobile|velocity/]];
 for(const [id,rx] of rules)if(rx.test(p)&&r.allowed.includes(id)){intent=id;break;}
 const lines={mercy:'I will slow my bullets. You will face more of them.',mirror:'Then take my fire and make it yours. Your own shots will be weaker.',glass:'We shed our armor together. Neither of us leaves untouched.',silence:'For a moment, neither of us will fire. Use that silence well.',duel:'No witnesses. Only you, and a faster answer from me.',sanctuary:'The center is yours. The rest of the sky is mine.',velocity:'Move faster, pilot. My bullets will do the same.'};
 let directorId=(r.telemetry.damageTaken||0)>5?'balanced':(r.telemetry.parries||0)>20?'crossfire':'pursuit';
 if(/steady|balanced|gentle|safe/.test(p))directorId='balanced';if(/cross|lattice|turret/.test(p))directorId='crossfire';if(/hunt|pursuit|chase/.test(p))directorId='pursuit';
 const output={task:r.task,contractId:intent,directorId,line:lines[intent],rationale:'Selected from the current offer list. Benefit and price stay fixed; signing is required before the rule changes.'};
 if(r.task==='director'){output.line=directorId==='balanced'?'Give the pilot room to read the next move.':directorId==='pursuit'?'A mobile formation will test your route through the sky.':'A lattice of slower arrivals will test your timing.';output.rationale='Template selection only. Local validation caps the wave at 36 spawns, with at least 1.05 seconds between arrivals. No model-generated code runs.';}
 if(r.task==='debrief'){output.line=`Flight log: ${r.telemetry.kills||0} eliminations, ${r.telemetry.parries||0} reflections, ${r.telemetry.grazes||0} grazes.`;output.rationale=(r.telemetry.damageTaken||0)>5?'Next run: favor recovery routes and reserve Nova for crowded patterns.':'Next run: try an elite route or a different airframe. Your route decisions are recorded with the seed.';}
 return validateDecision(output,r);
}
function telemetry(w){return {kills:w.kills,parries:w.parries,grazes:w.grazes,damageTaken:w.damageTaken,seconds:Math.round(w.time),score:w.score};}
class Client{
 constructor(){this.mode='mock';this.token='';this.active=null;this.sequence=0;}
 cancel(){this.sequence++;this.active?.abort();this.active=null;}
 async request(input){const r=cleanRequest(input);this.cancel();const seq=this.sequence;
  if(this.mode==='mock'){await new Promise(resolve=>setTimeout(resolve,220));if(seq!==this.sequence)throw Error('Request superseded');return {provider:'mock',fallback:false,decision:mock(r)};}
  if(!globalThis.NEMESIS_HOSTED||!/^https?:$/.test(location.protocol))return {provider:'mock',fallback:true,reason:'The standalone build is offline. Use the hosted build for server mode.',decision:mock(r)};
  const abort=new AbortController();this.active=abort;const timer=setTimeout(()=>abort.abort(),10000);
  try{const response=await fetch('/api/intelligence',{method:'POST',headers:{'Content-Type':'application/json',...(this.token?{Authorization:'Bearer '+this.token}:{})},body:JSON.stringify(r),signal:abort.signal});
   if(!response.ok)throw Error('Server returned '+response.status);const x=await response.json();if(seq!==this.sequence)throw Error('Request superseded');
   if(!['mock','openai'].includes(x.provider))throw Error('Unknown provider');return {...x,decision:validateDecision(x.decision,r)};
  }catch(error){if(seq!==this.sequence)throw error;return {provider:'mock',fallback:true,reason:'Server unavailable or rejected. Using the local rule-based fallback.',decision:mock(r)};}
  finally{clearTimeout(timer);if(seq===this.sequence)this.active=null;}
 }
}
return {CONTRACTS,DIRECTORS,TASKS,cleanRequest,schema,validateDecision,mock,telemetry,Client};
});
