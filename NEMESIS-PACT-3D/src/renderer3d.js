/* NEMESIS PACT — 0.3.6, native WebGL2 + native WebGPU.
 * Mesh PBR rasterization; WebGPU runs three compute dispatches per frame.
 * Collision-bearing bullets/reticles and all UI remain outside distortion.
 * Height-class layering keeps ships above field architecture while preserving 2D mechanics.
 * Stage-specific sky / fog / atmosphere, boss-specific background FX, and configurable post settings are included.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PactGPU=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const GL_VERTEX=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 iA; layout(location=3) in vec4 iS; layout(location=4) in vec4 iC; layout(location=5) in vec4 iP;
uniform vec4 uF[5]; out vec3 vN; out vec3 vPos; out vec4 vC; out vec4 vP; out float vClass;
void main(){float c=cos(iA.w),s=sin(iA.w),ct=cos(iP.w),st=sin(iP.w);vec3 p=aPos*iS.xyz; p.yz=mat2(ct,st,-st,ct)*p.yz;
 p.xy=mat2(c,s,-s,c)*p.xy; vec3 n=aNormal/max(iS.xyz,vec3(.001));n.yz=mat2(ct,st,-st,ct)*n.yz;n.xy=mat2(c,s,-s,c)*n.xy;
 vPos=p+iA.xyz; vClass=iS.w; float layerHeight=clamp(vClass,0.,1.)*220.; float depthHeight=vPos.z+layerHeight+vPos.y*.03; vec2 xy=vPos.xy+uF[2].xy;xy.y-=p.z*.22;
 gl_Position=vec4(xy.x/uF[0].x*2.-1.,1.-xy.y/uF[0].y*2.,-depthHeight/700.,1.);
 vN=normalize(n);vC=iC;vP=iP;}
`;
const GL_FRAGMENT=`#version 300 es
precision highp float;
in vec3 vN;in vec3 vPos;in vec4 vC;in vec4 vP;in float vClass;uniform vec4 uF[5];out vec4 outColor;
vec3 fresnel(float c,vec3 f0){return f0+(1.-f0)*pow(1.-c,5.);}
void main(){vec3 N=normalize(vN),V=normalize(vec3(0.,-.25,1.)),L=normalize(vec3(-.45,-.5,.85)),H=normalize(V+L);
 float rough=clamp(vC.w,.14,.94),metal=vP.x;vec3 base=vC.rgb;float t=uF[0].z,stage=uF[0].w,bossFx=uF[2].z;
 float grain=fract(sin(dot(floor(vPos.xy*2.),vec2(12.9898,78.233)))*43758.5453);base*=.97+grain*.06;
 float nl=max(dot(N,L),.001),nv=max(dot(N,V),.001),nh=max(dot(N,H),0.),vh=max(dot(V,H),0.);
 float a=rough*rough,a2=a*a,den=nh*nh*(a2-1.)+1.;float D=a2/(3.14159265*den*den+.0001);float k=(rough+1.)*(rough+1.)/8.;
 float G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);vec3 F=fresnel(vh,mix(vec3(.04),base,metal));
 vec3 lit=((1.-F)*(1.-metal)*base/3.14159265+D*G*F/(4.*nl*nv+.001))*vec3(4.0,3.7,3.25)*nl;
 vec3 tint=stage<.5?vec3(.18,.8,.7):stage<1.5?vec3(.5,.2,1.):vec3(1.,.52,.14);
 vec3 skyLo=stage<.5?vec3(.012,.070,.080):stage<1.5?vec3(.045,.020,.085):vec3(.095,.050,.012);
 vec3 skyHi=stage<.5?vec3(.10,.24,.26):stage<1.5?vec3(.20,.10,.32):vec3(.32,.22,.08);
 float skyMix=clamp((vPos.y/uF[0].y)*.7+.5,0.,1.);vec3 sky=mix(skyLo,skyHi,skyMix);
 vec3 refl=reflect(-V,N);float env=pow(max(dot(refl,normalize(vec3(.5,-.5,1.))),0.),mix(95.,4.,rough));
 float pulse=.5+.5*sin((vPos.x+vPos.y)*.018-t*(1.8+bossFx*1.2));
 lit+=base*(.10+.18*max(N.z,0.))*(1.-metal*.55)+mix(sky,base,metal)*env*(.55+.10*bossFx);
 lit+=sky*(.10+.06*max(N.z,0.)) + tint*(.05+.06*pulse)*(1.-metal*.35);
 lit+=tint*pow(1.-nv,3.)*(.18+.12*bossFx)+base*vP.y+vec3(vP.z);
 float depthMetric=clamp((vPos.z+clamp(vClass,0.,1.)*180.)/280.,0.,1.);
 float fogDensity=stage<.5?.32:stage<1.5?.48:.62;
 float fog=clamp((1.-exp(-depthMetric*(2.0+fogDensity*4.5)))*(.72+.28*skyMix),0.,.88);
 vec3 haze=mix(sky,tint,.18);lit=mix(lit,haze,fog);lit=mix(vec3(dot(lit,vec3(.299,.587,.114))),lit,1.-fog*.16);
 float shadowMask=1.-step(.051,vClass);lit=mix(lit,base*.12,shadowMask);
 outColor=vec4(max(lit,vec3(0.)),vClass);}
`;
const GL_QUAD=`#version 300 es
precision highp float;out vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const GL_BLUR=`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex;uniform vec2 direction;uniform float extractBright;out vec4 outColor;
vec3 getCol(vec2 q){vec3 c=texture(tex,q).rgb;float l=max(c.r,max(c.g,c.b));return mix(c,c*max(l-.7,0.)/max(l,.001),extractBright);}
void main(){vec3 c=getCol(uv)*.227027; c+=(getCol(uv+direction*1.384615)+getCol(uv-direction*1.384615))*.316216;c+=(getCol(uv+direction*3.230769)+getCol(uv-direction*3.230769))*.070270;outColor=vec4(c,1.);}`;
const GL_COMPOSITE=`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex;uniform sampler2D bloom;uniform vec4 uF[5];out vec4 outColor;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec4 orig=texture(tex,uv);vec2 q=uv;float postFx=uF[4].x,bloomAmt=uF[4].y;float strength=uF[1].w*(1.-uF[3].w)*postFx,age=uF[1].z,bossFx=uF[2].z,stage=uF[0].w;
 vec2 origin=vec2(uF[1].x,1.-uF[1].y);vec2 d=q-origin;d.x*=uF[0].x/uF[0].y;float radius=length(d),pulse=exp(-pow((radius-age*1.6)*16.,2.));
 vec2 shift=normalize(d+vec2(.0001))*(sin(radius*65.-age*30.)*.008*pulse*strength);q+=shift;
 vec4 warped=texture(tex,clamp(q,vec2(0.),vec2(1.)));vec3 col=orig.rgb;if(orig.a<.5&&warped.a<.5)col=warped.rgb;
 vec2 cdir=(uv-.5)*vec2(uF[0].x/uF[0].y,1.);float cab=(.0012+.0018*bossFx)*(1.-uF[3].w)*postFx;
 vec3 ca=vec3(texture(tex,clamp(uv+cdir*cab,vec2(0.),vec2(1.))).r,orig.g,texture(tex,clamp(uv-cdir*cab,vec2(0.),vec2(1.))).b);
 if(orig.a<.5) col=mix(col,ca,(.45+.25*bossFx)*postFx);
 col+=texture(bloom,uv).rgb*mix(.38,.15,uF[3].w)*(1.+bossFx*.30)*bloomAmt;
 vec3 grade=stage<.5?vec3(1.00,.985,1.02):stage<1.5?vec3(1.03,.97,1.05):vec3(1.06,1.00,.94);
 float scan=.985+.015*postFx*sin((uv.y*uF[3].y+uF[0].z*42.)*.7); if(orig.a<.5) col*=mix(1.,scan,postFx);
 col=aces(col*uF[3].z*grade);col=pow(col,vec3(1./2.2));
 float edge=uv.x*uv.y*(1.-uv.x)*(1.-uv.y);col*=mix(.96,.84+.16*clamp(pow(edge*16.,.18),0.,1.),.55+.45*postFx);outColor=vec4(col,1.);}
`;
const WG_FRAME=`struct Frame { arena:vec4f, shock:vec4f, shake:vec4f, screen:vec4f, fx:vec4f };`;
const WG_MESH=WG_FRAME+`
@group(0) @binding(0) var<uniform> f:Frame;
struct In { @location(0) pos:vec3f,@location(1) norm:vec3f,@location(2) a:vec4f,@location(3) s:vec4f,@location(4) c:vec4f,@location(5) p:vec4f };
struct Out { @builtin(position) clip:vec4f,@location(0) norm:vec3f,@location(1) pos:vec3f,@location(2) c:vec4f,@location(3) p:vec4f,@location(4) cls:f32 };
@vertex fn vs(v:In)->Out {let cs=cos(v.a.w);let sn=sin(v.a.w);let ct=cos(v.p.w);let st=sin(v.p.w);var p=v.pos*v.s.xyz;let yz=mat2x2f(ct,st,-st,ct)*p.yz;p=vec3f(p.x,yz);let xy=mat2x2f(cs,sn,-sn,cs)*p.xy;p=vec3f(xy,p.z);
 var n=v.norm/max(v.s.xyz,vec3f(.001));let nyz=mat2x2f(ct,st,-st,ct)*n.yz;n=vec3f(n.x,nyz);n=vec3f(mat2x2f(cs,sn,-sn,cs)*n.xy,n.z);let world=p+v.a.xyz;let loc=world.xy+f.shake.xy-vec2f(0.,p.z*.22);
 let layerHeight=clamp(v.s.w,0.,1.)*220.;let depthHeight=world.z+layerHeight+world.y*.03;
 var o:Out;o.clip=vec4f(loc.x/f.arena.x*2.-1.,1.-loc.y/f.arena.y*2.,-depthHeight/700.,1.);o.norm=normalize(n);o.pos=world;o.c=v.c;o.p=v.p;o.cls=v.s.w;return o;}
fn fresnel(c:f32,f0:vec3f)->vec3f{return f0+(vec3f(1.)-f0)*pow(1.-c,5.);}
@fragment fn fs(v:Out)->@location(0) vec4f {let N=normalize(v.norm);let V=normalize(vec3f(0.,-.25,1.));let L=normalize(vec3f(-.45,-.5,.85));let H=normalize(V+L);
 let rough=clamp(v.c.w,.14,.94);let metal=v.p.x;let stage=f.arena.w;let bossFx=f.shake.z;let t=f.arena.z;
 let grain=fract(sin(dot(floor(v.pos.xy*2.),vec2f(12.9898,78.233)))*43758.5453);let base=v.c.rgb*(.97+grain*.06);
 let nl=max(dot(N,L),.001);let nv=max(dot(N,V),.001);let nh=max(dot(N,H),0.);let vh=max(dot(V,H),0.);let a=rough*rough;let a2=a*a;let den=nh*nh*(a2-1.)+1.;let D=a2/(3.14159265*den*den+.0001);let k=(rough+1.)*(rough+1.)/8.;
 let G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);let F=fresnel(vh,mix(vec3f(.04),base,metal));var lit=((vec3f(1.)-F)*(1.-metal)*base/3.14159265+D*G*F/(4.*nl*nv+.001))*vec3f(4.,3.7,3.25)*nl;
 var tint=vec3f(.18,.8,.7);var skyLo=vec3f(.012,.070,.080);var skyHi=vec3f(.10,.24,.26);if(stage>.5){tint=vec3f(.5,.2,1.);skyLo=vec3f(.045,.020,.085);skyHi=vec3f(.20,.10,.32);}if(stage>1.5){tint=vec3f(1.,.52,.14);skyLo=vec3f(.095,.050,.012);skyHi=vec3f(.32,.22,.08);}let skyMix=clamp((v.pos.y/f.arena.y)*.7+.5,0.,1.);let sky=mix(skyLo,skyHi,skyMix);
 let refl=reflect(-V,N);let env=pow(max(dot(refl,normalize(vec3f(.5,-.5,1.))),0.),mix(95.,4.,rough));let pulse=.5+.5*sin((v.pos.x+v.pos.y)*.018-t*(1.8+bossFx*1.2));
 lit+=base*(.10+.18*max(N.z,0.))*(1.-metal*.55)+mix(sky,base,metal)*env*(.55+.10*bossFx);lit+=sky*(.10+.06*max(N.z,0.))+tint*(.05+.06*pulse)*(1.-metal*.35);
 lit+=tint*pow(1.-nv,3.)*(.18+.12*bossFx)+base*v.p.y+vec3f(v.p.z);
 let depthMetric=clamp((v.pos.z+clamp(v.cls,0.,1.)*180.)/280.,0.,1.);let fogDensity=select(.32,select(.48,.62,stage>1.5),stage>.5);let fog=clamp((1.-exp(-depthMetric*(2.0+fogDensity*4.5)))*(.72+.28*skyMix),0.,.88);
 let haze=mix(sky,tint,.18);lit=mix(lit,haze,fog);lit=mix(vec3f(dot(lit,vec3f(.299,.587,.114))),lit,1.-fog*.16);let shadowMask=1.-step(.051,v.cls);lit=mix(lit,base*.12,shadowMask);return vec4f(max(lit,vec3f(0.)),v.cls);}
`;
const WG_BLUR=`
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var samp:sampler;
@group(0) @binding(2) var dest:texture_storage_2d<rgba16float,write>;
override HORIZONTAL:bool=true;override EXTRACT:bool=true;
fn getCol(q:vec2f)->vec3f {let c=textureSampleLevel(source,samp,q,0.).rgb;if(EXTRACT){let lum=max(c.r,max(c.g,c.b));return c*max(lum-.7,0.)/max(lum,.001);}return c;}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) gid:vec3u){let dims=textureDimensions(dest);if(any(gid.xy>=dims)){return;}let uv=(vec2f(gid.xy)+.5)/vec2f(dims);let src=vec2f(textureDimensions(source));var d=vec2f(0.,1./src.y);if(HORIZONTAL){d=vec2f(1./src.x,0.);}
 var col=getCol(uv)*.227027;col+=(getCol(uv+d*1.384615)+getCol(uv-d*1.384615))*.316216;col+=(getCol(uv+d*3.230769)+getCol(uv-d*3.230769))*.070270;textureStore(dest,vec2i(gid.xy),vec4f(col,1.));}
`;
const WG_COMPOSITE=WG_FRAME+`
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var bloom:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@group(0) @binding(3) var dest:texture_storage_2d<rgba8unorm,write>;
@group(0) @binding(4) var<uniform> f:Frame;
fn aces(x:vec3f)->vec3f{return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),vec3f(0.),vec3f(1.));}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) gid:vec3u){let dims=textureDimensions(dest);if(any(gid.xy>=dims)){return;}let uv=(vec2f(gid.xy)+.5)/vec2f(dims);let original=textureSampleLevel(source,samp,uv,0.);let bossFx=f.shake.z;let stage=f.arena.w;let postFx=f.fx.x;let bloomAmt=f.fx.y;let delta=(uv-f.shock.xy)*vec2f(f.arena.x/f.arena.y,1.);let r=length(delta);let age=f.shock.z;let strength=f.shock.w*(1.-f.screen.w)*postFx;let pulse=exp(-pow((r-age*1.6)*16.,2.));let shift=normalize(delta+vec2f(.0001))*sin(r*65.-age*30.)*.008*pulse*strength;
 let q=clamp(uv+shift,vec2f(0.),vec2f(1.));let warped=textureSampleLevel(source,samp,q,0.);var col=original.rgb;
 if(original.a<.5&&warped.a<.5){col=warped.rgb;let cab=(.0012+.0018*bossFx)*(1.-f.screen.w)*postFx;let cdir=(uv-vec2f(.5))*vec2f(f.arena.x/f.arena.y,1.);let qr=clamp(q+cdir*cab,vec2f(0.),vec2f(1.));let qb=clamp(q-cdir*cab,vec2f(0.),vec2f(1.));let rr=textureSampleLevel(source,samp,qr,0.);let bb=textureSampleLevel(source,samp,qb,0.);if(rr.a<.5&&bb.a<.5){col=mix(col,vec3f(rr.r,col.g,bb.b),(.45+.25*bossFx)*postFx);}}
 col+=textureSampleLevel(bloom,samp,uv,0.).rgb*mix(.38,.15,f.screen.w)*(1.+bossFx*.30)*bloomAmt;var grade=vec3f(1.00,.985,1.02);if(stage>.5){grade=vec3f(1.03,.97,1.05);}if(stage>1.5){grade=vec3f(1.06,1.00,.94);}let scan=.985+.015*postFx*sin((uv.y*f.screen.y+f.arena.z*42.)*.7);if(original.a<.5){col*=mix(1.,scan,postFx);}
 col=pow(aces(col*f.screen.z*grade),vec3f(1./2.2));let edge=uv.x*uv.y*(1.-uv.x)*(1.-uv.y);col*=mix(.96,.84+.16*clamp(pow(edge*16.,.18),0.,1.),.55+.45*postFx);textureStore(dest,vec2i(gid.xy),vec4f(col,1.));}
`;
const WG_PRESENT=`@group(0) @binding(0) var finalImage:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f{return textureLoad(finalImage,vec2i(p.xy),0);}`;
function bossFX(world){if(!world||!world.enemies)return 0;const boss=world.enemies.find(e=>e.type==='boss'&&e.spawn<=0);if(!boss)return 0;const phase=(boss.phase||0)/2;const hp=1-(boss.hp||0)/Math.max(1,boss.maxHp||boss.hp||1);return Math.max(0,Math.min(1,.35+phase*.25+hp*.4));}
function clearColor(stage,bossFx=0){const s=stage<.5?[.010,.030,.038]:stage<1.5?[.026,.012,.046]:[.055,.030,.010];const boost=bossFx*.018;return {r:Math.min(.12,s[0]+boost*.6),g:Math.min(.12,s[1]+boost*.45),b:Math.min(.14,s[2]+boost),a:0};}
function frameData(f,width,height){const stage=f.world?Math.min(f.world.stage,2):0,boss=bossFX(f.world),bg=f.bgAnim===2?1.3:f.bgAnim===0?0:1,post=f.postFX===2?1.2:f.postFX===0?0:1,bloom=f.bloom===2?1.55:f.bloom===0?0:1;return new Float32Array([f.w,f.h,f.t,stage,f.shock?.x??.5,f.shock?.y??.5,f.shock?.age||0,f.shock?.strength||0,f.shakeX||0,f.shakeY||0,boss,bg,width,height,1.08+boss*.08+post*.04,f.reduced?1:0,post,bloom,0,0]);}
class GLBackend{
 constructor(canvas,shapes){this.canvas=canvas;const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false});if(!gl)throw Error('WebGL2 is unavailable');this.gl=gl;this.shapes=shapes;this.label='WEBGL2 / PBR';this.frames=0;this.computeDispatches=0;this.initialize();}
 initialize(){const g=this.gl;this.targets=[];this.size='';this.meshes={};this.hdr=!!g.getExtension('EXT_color_buffer_float');this.program=this.programOf(GL_VERTEX,GL_FRAGMENT);this.blur=this.programOf(GL_QUAD,GL_BLUR);this.post=this.programOf(GL_QUAD,GL_COMPOSITE);this.empty=g.createVertexArray();
  for(const [key,vertices] of Object.entries(this.shapes)){const vao=g.createVertexArray();g.bindVertexArray(vao);const vb=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,vb);g.bufferData(g.ARRAY_BUFFER,vertices,g.STATIC_DRAW);for(let j=0;j<2;j++){g.enableVertexAttribArray(j);g.vertexAttribPointer(j,3,g.FLOAT,false,24,j*12);}const ib=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,ib);g.bufferData(g.ARRAY_BUFFER,64*4096,g.DYNAMIC_DRAW);for(let j=0;j<4;j++){g.enableVertexAttribArray(j+2);g.vertexAttribPointer(j+2,4,g.FLOAT,false,64,j*16);g.vertexAttribDivisor(j+2,1);}this.meshes[key]={vao,vb,ib,count:vertices.length/6};}g.bindVertexArray(null);
  this.locations={frame:g.getUniformLocation(this.program,'uF[0]'),blurTex:g.getUniformLocation(this.blur,'tex'),dir:g.getUniformLocation(this.blur,'direction'),extract:g.getUniformLocation(this.blur,'extractBright'),postFrame:g.getUniformLocation(this.post,'uF[0]'),postTex:g.getUniformLocation(this.post,'tex'),bloom:g.getUniformLocation(this.post,'bloom')};
 }
 programOf(v,f){const g=this.gl;const compile=(type,code)=>{const s=g.createShader(type);g.shaderSource(s,code);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS)){const info=g.getShaderInfoLog(s);g.deleteShader(s);throw Error(info);}return s;};const vs=compile(g.VERTEX_SHADER,v),fs=compile(g.FRAGMENT_SHADER,f),p=g.createProgram();g.attachShader(p,vs);g.attachShader(p,fs);g.linkProgram(p);g.deleteShader(vs);g.deleteShader(fs);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));return p;}
 target(w,h,depth){const g=this.gl,tex=g.createTexture(),fb=g.createFramebuffer();g.bindTexture(g.TEXTURE_2D,tex);g.texStorage2D(g.TEXTURE_2D,1,this.hdr?g.RGBA16F:g.RGBA8,w,h);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.bindFramebuffer(g.FRAMEBUFFER,fb);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tex,0);let rb=null;if(depth){rb=g.createRenderbuffer();g.bindRenderbuffer(g.RENDERBUFFER,rb);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT24,w,h);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,rb);}if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('WebGL2 framebuffer incomplete');const t={tex,fb,rb,w,h};this.targets.push(t);return t;}
 resize(w,h){const key=w+':'+h;if(this.size===key)return;const g=this.gl;for(const t of this.targets){g.deleteTexture(t.tex);g.deleteFramebuffer(t.fb);if(t.rb)g.deleteRenderbuffer(t.rb);}this.targets=[];this.canvas.width=w;this.canvas.height=h;this.full=this.target(w,h,true);this.a=this.target(Math.max(1,w>>1),Math.max(1,h>>1),false);this.b=this.target(this.a.w,this.a.h,false);this.size=key;}
 render(groups,f,w,h){const g=this.gl;if(g.isContextLost())return false;this.resize(w,h);const data=frameData(f,w,h);const cc=clearColor(data[3],data[10]);g.bindFramebuffer(g.FRAMEBUFFER,this.full.fb);g.viewport(0,0,w,h);g.enable(g.DEPTH_TEST);g.depthFunc(g.LESS);g.depthMask(true);g.disable(g.BLEND);g.disable(g.CULL_FACE);g.clearColor(cc.r,cc.g,cc.b,0);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.useProgram(this.program);g.uniform4fv(this.locations.frame,data);this.draws=0;
  for(const [key,array]of Object.entries(groups)){if(!array.length)continue;const m=this.meshes[key];g.bindVertexArray(m.vao);g.bindBuffer(g.ARRAY_BUFFER,m.ib);g.bufferSubData(g.ARRAY_BUFFER,0,new Float32Array(array));g.drawArraysInstanced(g.TRIANGLES,0,m.count,array.length/16);this.draws++;}
  g.disable(g.DEPTH_TEST);g.bindVertexArray(this.empty);g.useProgram(this.blur);g.uniform1i(this.locations.blurTex,0);g.activeTexture(g.TEXTURE0);
  g.bindFramebuffer(g.FRAMEBUFFER,this.a.fb);g.viewport(0,0,this.a.w,this.a.h);g.bindTexture(g.TEXTURE_2D,this.full.tex);g.uniform2f(this.locations.dir,1/w,0);g.uniform1f(this.locations.extract,1);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,this.b.fb);g.bindTexture(g.TEXTURE_2D,this.a.tex);g.uniform2f(this.locations.dir,0,1/this.a.h);g.uniform1f(this.locations.extract,0);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,w,h);g.useProgram(this.post);g.uniform4fv(this.locations.postFrame,data);g.uniform1i(this.locations.postTex,0);g.uniform1i(this.locations.bloom,1);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.full.tex);g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.b.tex);g.drawArrays(g.TRIANGLES,0,3);this.frames++;return true;
 }
}
class GPUBackend{
 constructor(canvas,shapes,device,adapter){this.canvas=canvas;this.device=device;this.adapter=adapter;this.shapes=shapes;this.label='WEBGPU / COMPUTE';this.frames=0;this.computeDispatches=0;this.targets=[];this.meshes={};this.size='';this.errors=[];this.context=canvas.getContext('webgpu');if(!this.context)throw Error('WebGPU canvas context unavailable');this.format=navigator.gpu.getPreferredCanvasFormat();}
 async initialize(){const d=this.device;d.pushErrorScope('validation');this.uniform=d.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.sampler=d.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
  const module=async(code,label)=>{const m=d.createShaderModule({code,label});if(m.getCompilationInfo){const result=await m.getCompilationInfo();const errors=result.messages.filter(x=>x.type==='error');if(errors.length)throw Error(label+': '+errors.map(e=>e.message).join('; '));}return m;};
  const mesh=await module(WG_MESH,'PBR mesh WGSL'),blur=await module(WG_BLUR,'Compute bloom WGSL'),composite=await module(WG_COMPOSITE,'Compute composite WGSL'),present=await module(WG_PRESENT,'Presentation WGSL');
  this.meshPipeline=await d.createRenderPipelineAsync({label:'GGX raster',layout:'auto',vertex:{module:mesh,entryPoint:'vs',buffers:[{arrayStride:24,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'}]},{arrayStride:64,stepMode:'instance',attributes:[0,1,2,3].map(i=>({shaderLocation:i+2,offset:i*16,format:'float32x4'}))}]},fragment:{module:mesh,entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'}});
  this.brightPipeline=await d.createComputePipelineAsync({label:'Bloom horizontal + extract',layout:'auto',compute:{module:blur,entryPoint:'main',constants:{HORIZONTAL:1,EXTRACT:1}}});
  this.blurPipeline=await d.createComputePipelineAsync({label:'Bloom vertical',layout:'auto',compute:{module:blur,entryPoint:'main',constants:{HORIZONTAL:0,EXTRACT:0}}});
  this.compPipeline=await d.createComputePipelineAsync({label:'Full-screen composite + shockwave',layout:'auto',compute:{module:composite,entryPoint:'main'}});
  this.presentPipeline=await d.createRenderPipelineAsync({label:'Present',layout:'auto',vertex:{module:present,entryPoint:'vs'},fragment:{module:present,entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
  this.frameGroup=d.createBindGroup({layout:this.meshPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}}]});
  for(const [key,data]of Object.entries(this.shapes)){const vb=d.createBuffer({size:data.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});d.queue.writeBuffer(vb,0,data);const ib=d.createBuffer({size:64*4096,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});this.meshes[key]={vb,ib,count:data.length/6};}
  const error=await d.popErrorScope();if(error)throw Error(error.message);
 }
 resize(w,h){const key=w+':'+h;if(this.size===key)return;const d=this.device;for(const t of this.targets)t.destroy();this.targets=[];this.canvas.width=w;this.canvas.height=h;this.context.configure({device:d,format:this.format,alphaMode:'opaque'});
  const tex=(width,height,format,usage)=>{const t=d.createTexture({size:[width,height],format,usage});this.targets.push(t);return t;};const TU=GPUTextureUsage;
  this.scene=tex(w,h,'rgba16float',TU.RENDER_ATTACHMENT|TU.TEXTURE_BINDING);this.depth=tex(w,h,'depth24plus',TU.RENDER_ATTACHMENT);this.hw=Math.max(1,w>>1);this.hh=Math.max(1,h>>1);
  this.bright=tex(this.hw,this.hh,'rgba16float',TU.STORAGE_BINDING|TU.TEXTURE_BINDING);this.blur=tex(this.hw,this.hh,'rgba16float',TU.STORAGE_BINDING|TU.TEXTURE_BINDING);this.final=tex(w,h,'rgba8unorm',TU.STORAGE_BINDING|TU.TEXTURE_BINDING|TU.COPY_SRC);
  const bloomGroup=(pipeline,input,output)=>d.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:input.createView()},{binding:1,resource:this.sampler},{binding:2,resource:output.createView()}]});
  this.brightGroup=bloomGroup(this.brightPipeline,this.scene,this.bright);this.blurGroup=bloomGroup(this.blurPipeline,this.bright,this.blur);
  this.compGroup=d.createBindGroup({layout:this.compPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:this.scene.createView()},{binding:1,resource:this.blur.createView()},{binding:2,resource:this.sampler},{binding:3,resource:this.final.createView()},{binding:4,resource:{buffer:this.uniform}}]});
  this.presentGroup=d.createBindGroup({layout:this.presentPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:this.final.createView()}]});this.size=key;
 }
 render(groups,f,w,h){this.resize(w,h);const d=this.device;const fd=frameData(f,w,h);const cc=clearColor(fd[3],fd[10]);d.queue.writeBuffer(this.uniform,0,fd);const encoder=d.createCommandEncoder({label:'NEMESIS frame'}),pass=encoder.beginRenderPass({colorAttachments:[{view:this.scene.createView(),clearValue:{r:cc.r,g:cc.g,b:cc.b,a:0},loadOp:'clear',storeOp:'store'}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'discard'}});pass.setPipeline(this.meshPipeline);pass.setBindGroup(0,this.frameGroup);this.draws=0;
  for(const [key,array]of Object.entries(groups)){if(!array.length)continue;const m=this.meshes[key];d.queue.writeBuffer(m.ib,0,new Float32Array(array));pass.setVertexBuffer(0,m.vb);pass.setVertexBuffer(1,m.ib);pass.draw(m.count,array.length/16);this.draws++;}pass.end();
  // Separate passes guarantee storage-write -> sampled-read transitions.
  for(const [pipeline,group,width,height]of [[this.brightPipeline,this.brightGroup,this.hw,this.hh],[this.blurPipeline,this.blurGroup,this.hw,this.hh],[this.compPipeline,this.compGroup,w,h]]){const cp=encoder.beginComputePass();cp.setPipeline(pipeline);cp.setBindGroup(0,group);cp.dispatchWorkgroups(Math.ceil(width/8),Math.ceil(height/8));cp.end();this.computeDispatches++;}
  const pp=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});pp.setPipeline(this.presentPipeline);pp.setBindGroup(0,this.presentGroup);pp.draw(3);pp.end();d.queue.submit([encoder.finish()]);this.frames++;return true;
 }
 destroy(){for(const t of this.targets)t.destroy();for(const m of Object.values(this.meshes)){m.vb.destroy();m.ib.destroy();}this.uniform?.destroy();this.context?.unconfigure();}
}
class Renderer{
 constructor(host,options={}){this.host=host;this.options=options;this.scene=new window.PactMeshes.Scene();this.active=null;this.fallback=null;this.messages=[];this.backend='initializing';this.shock={x:.5,y:.5,age:2,strength:0};this.latestTime=0;this.initialized=this.initialize();}
 makeCanvas(){const c=document.createElement('canvas');c.className='gpu-canvas';c.setAttribute('aria-hidden','true');c.style.pointerEvents='none';return c;}
 notify(){this.options.onStatus?.(this.stats());}
 swap(backend){if(this.active?.canvas.parentNode)this.active.canvas.remove();this.active=backend;this.backend=backend.label;this.host.prepend(backend.canvas);this.notify();}
 async initialize(){const shapes=window.PactMeshes.shapes;const requested=new URLSearchParams(location.search).get('renderer');
  const glCanvas=this.makeCanvas();try{this.fallback=new GLBackend(glCanvas,shapes);this.swap(this.fallback);glCanvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.active===this.fallback){this.backend='CONTEXT LOST / 2D FALLBACK';this.notify();}});glCanvas.addEventListener('webglcontextrestored',()=>{try{this.fallback.initialize();if(this.active===this.fallback){this.backend=this.fallback.label;this.notify();}}catch(e){this.messages.push(String(e));this.notify();}});}catch(e){this.messages.push(String(e));}
  if(requested!=='webgl2'&&navigator.gpu&&window.isSecureContext){let gpu=null;try{const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('No WebGPU adapter');const device=await adapter.requestDevice();gpu=new GPUBackend(this.makeCanvas(),shapes,device,adapter);await gpu.initialize();this.swap(gpu);
    const fail=(message)=>{this.messages.push(message);if(this.active===gpu){if(this.fallback)this.swap(this.fallback);else{this.active=null;this.backend='GPU ERROR / 2D FALLBACK';this.notify();}}};
    device.addEventListener('uncapturederror',e=>fail('WebGPU validation: '+e.error.message));device.lost.then(info=>fail('WebGPU device lost: '+info.message));
   }catch(e){this.messages.push('WebGPU fallback: '+String(e));try{gpu?.destroy();}catch{}this.notify();}}
  else if(requested==='webgpu')this.messages.push('WebGPU needs a secure context and a supported adapter. Using available fallback.');
  if(!this.active)this.backend='CANVAS 2D FALLBACK';this.notify();return this;
 }
 event(e,x,y,w,h){if(e.type==='nova'||e.type==='breach'){this.shock={x:x/w,y:y/h,age:0,strength:1};this.shockStart=this.latestTime;}}
 stats(){return {build:'0.3.6',backend:this.backend,frames:this.active?.frames||0,computeDispatches:this.active?.computeDispatches||0,instances:this.scene.count,draws:this.active?.draws||0,hdr:this.active instanceof GPUBackend||!!this.active?.hdr,errors:[...this.messages]};}
 draw(frame){if(!this.active)return false;this.latestTime=frame.t;const b=this.active;if(b instanceof GLBackend&&b.gl.isContextLost())return false;
  const {view,mobile,world}=frame;let f={...frame};if(mobile&&!world){f.w=720;f.h=720*view.height/view.width;f.scale=view.width/720;f.x=0;f.y=0;}else{f.scale=view.scale;f.x=view.x;f.y=view.y;}
  const cw=f.w*f.scale,ch=f.h*f.scale;const dpr=Math.min(window.devicePixelRatio||1,2),maxPixels=mobile?1200000:2100000,factor=Math.min(dpr,Math.sqrt(maxPixels/Math.max(1,cw*ch)));const rw=Math.max(1,Math.round(cw*factor)),rh=Math.max(1,Math.round(ch*factor));
  Object.assign(b.canvas.style,{left:f.x+'px',top:f.y+'px',width:cw+'px',height:ch+'px'});const age=frame.t-(this.shockStart??-100);f.shock={...this.shock,age:Math.min(2,age),strength:age<1?Math.max(0,1-age):0};
  try{return b.render(this.scene.build(f),f,rw,rh);}catch(e){this.messages.push(String(e));if(b!==this.fallback&&this.fallback)this.swap(this.fallback);else{b.canvas.remove();this.active=null;this.backend='RENDER ERROR / 2D FALLBACK';this.notify();}return false;}
 }
}
return {Renderer,GLBackend,GPUBackend,frameData,bossFX,clearColor,GL_VERTEX,GL_FRAGMENT,GL_QUAD,GL_BLUR,GL_COMPOSITE,WG_MESH,WG_BLUR,WG_COMPOSITE,WG_PRESENT};
});
