'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const C=require('../src/core.js'),baseline=require('./fixtures/japanese-v0.2.0-mechanics.json');
const cjk=/[\u3040-\u30ff\u3400-\u9fff]/u;
test('English locale is declared and all runtime source strings are localized',()=>{
  assert.match(read('index.html'),/<html lang="en">/);
  for(const name of ['index.html',...fs.readdirSync(path.join(root,'src')).map(f=>'src/'+f)]){
    assert.equal(cjk.test(read(name)),false,name);
  }
});
test('all seven pacts have complete English text and concise HUD labels',()=>{
  assert.equal(C.CONTRACTS.length,7);
  for(const c of C.CONTRACTS){for(const field of ['name','label','line','gift','cost','tip','hud'])assert.ok(c[field]&&/[a-z]/i.test(c[field]),`${c.id}.${field}`);assert.ok(c.hud.length<=26);}
  assert.equal(new Set(C.CONTRACTS.map(c=>c.id)).size,7);
});
test('all thirteen upgrade options have English names, mechanics and categories',()=>{
  assert.equal(C.UPGRADES.length,13);
  for(const u of C.UPGRADES)for(const field of ['name','label','desc','tag'])assert.ok(u[field]&&/[a-z]/i.test(u[field]),`${u.id}.${field}`);
  assert.equal(C.UPGRADES.find(x=>x.id==='parry').max,2);
});
test('three bosses and sector names are localized without changing boss hull',()=>{
  assert.deepEqual(C.BOSSES.map(b=>b.hp),[2400,3600,5100]);
  for(const b of C.BOSSES)assert.ok(b.subtitle&&b.quote.startsWith('“'));
  assert.deepEqual(C.SECTORS,['Faded Signatures','Silent Cathedral','Kingless Dawn']);
});
test('gameplay implementation is byte-identical after excluding locale content and version',()=>{
  const normalized=read('src/core.js').replace(/  const CONTRACTS = \[[\s\S]*?  function modifiers\(/,'  function modifiers(').replace(/version:'[^']+'/g,"version:'CANONICAL'");
  assert.equal(sha(normalized),baseline.normalized_core_sha256);
});
test('localization leaves touch input and synthesized audio implementations unchanged',()=>{
  for(const [name,hash] of Object.entries(baseline.unchanged_source_sha256))assert.equal(sha(read('src/'+name)),hash);
});
test('English run reports retain compatible IDs and the correct build version',()=>{
  const w=new C.World('EN-REPORT');w.sign('mirror');const report=w.report();
  assert.equal(report.version,JSON.parse(read('package.json')).version);
  assert.equal(report.contracts[0].id,'mirror');assert.equal(report.seed,'EN-REPORT');
  assert.match(read('src/game.js'),/nemesis\.settings\.v1/);assert.match(read('src/game.js'),/nemesis\.scores\.v1/);
});
test('English standalone build has no external dependencies and preserves offline CSP',()=>{
  const html=read('dist/NEMESIS-PACT.html');
  assert.match(html,/<html lang="en">/);assert.ok(!cjk.test(html));
  assert.doesNotMatch(html,/<script\s+src=/);assert.doesNotMatch(html,/<link rel="stylesheet"/);
  assert.match(html,/connect-src 'none'/);assert.match(html,/PARRY/);assert.match(html,/NOVA/);
});
