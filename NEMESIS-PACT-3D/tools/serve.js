'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{Readable}=require('node:stream');
const root=path.resolve(__dirname,'../public'),port=Number(process.env.PORT||8080),lan=process.argv.includes('--lan'),host=lan?'0.0.0.0':'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be from 1 to 65535');
const api=import('../server/intelligence.mjs');
const server=http.createServer(async(req,res)=>{
 try{const u=new URL(req.url,'http://localhost:'+port);
  if(u.pathname==='/api/intelligence'){
   const body=['GET','HEAD'].includes(req.method)?undefined:Readable.toWeb(req);
   const request=new Request(u,{method:req.method,headers:req.headers,body,...(body?{duplex:'half'}:{})});
   const response=await(await api).handle(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
  const part=decodeURIComponent(u.pathname);const file=path.resolve(root,'.'+part+(part.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep)||part.split('/').some(x=>x.startsWith('.'))){res.writeHead(404);res.end('Not found');return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);});
 }catch{res.writeHead(400);res.end('Bad request');}
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});server.listen(port,host,()=>{console.log('COVENANT ASCENT: http://127.0.0.1:'+port);if(lan){console.log('Use a trusted network only; stop with Ctrl+C.');for(const list of Object.values(require('node:os').networkInterfaces()))for(const i of list||[])if(i.family==='IPv4'&&!i.internal)console.log('Phone: http://'+i.address+':'+port+'/');}});
