'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||8080);
const lan=process.argv.includes('--lan'),host=lan?'0.0.0.0':'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer from 1 to 65535');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{
  let file;try{const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+requestPath+(requestPath.endsWith('/')?'index.html':''));}catch(_){res.writeHead(400);return res.end('Bad request');}
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);});
});
server.on('error',err=>{console.error(err.message);process.exitCode=1;});server.listen(port,host,()=>{console.log('NEMESIS PACT: http://127.0.0.1:'+port);if(lan){console.log('LAN access enabled. Use only on a trusted local network; stop with Ctrl+C.');const interfaces=require('node:os').networkInterfaces();for(const list of Object.values(interfaces))for(const i of list||[])if(i.family==='IPv4'&&!i.internal)console.log('Phone: http://'+i.address+':'+port+'/dist/NEMESIS-PACT.html');}});
