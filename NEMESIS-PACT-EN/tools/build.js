'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/<link rel="stylesheet" href="(src\/[^"<>]+)">/g,(_,name)=>'<style>\n'+fs.readFileSync(path.join(root,name),'utf8')+'\n</style>');
html=html.replace(/<script src="(src\/[^"<>]+)"><\/script>/g,(_,name)=>'<script>\n'+fs.readFileSync(path.join(root,name),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist','NEMESIS-PACT.html'),html);
console.log('Built dist/NEMESIS-PACT.html ('+Buffer.byteLength(html)+' bytes, no external assets)');
