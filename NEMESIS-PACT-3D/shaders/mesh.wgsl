struct Frame { arena:vec4f, shock:vec4f, shake:vec4f, screen:vec4f };
@group(0) @binding(0) var<uniform> f:Frame;
struct In { @location(0) pos:vec3f,@location(1) norm:vec3f,@location(2) a:vec4f,@location(3) s:vec4f,@location(4) c:vec4f,@location(5) p:vec4f };
struct Out { @builtin(position) clip:vec4f,@location(0) norm:vec3f,@location(1) pos:vec3f,@location(2) c:vec4f,@location(3) p:vec4f,@location(4) cls:f32 };
@vertex fn vs(v:In)->Out {let cs=cos(v.a.w);let sn=sin(v.a.w);let ct=cos(v.p.w);let st=sin(v.p.w);var p=v.pos*v.s.xyz;let yz=mat2x2f(ct,st,-st,ct)*p.yz;p=vec3f(p.x,yz);let xy=mat2x2f(cs,sn,-sn,cs)*p.xy;p=vec3f(xy,p.z);
 var n=v.norm/max(v.s.xyz,vec3f(.001));let nyz=mat2x2f(ct,st,-st,ct)*n.yz;n=vec3f(n.x,nyz);n=vec3f(mat2x2f(cs,sn,-sn,cs)*n.xy,n.z);let world=p+v.a.xyz;let loc=world.xy+f.shake.xy-vec2f(0.,p.z*.22);
 let layerHeight=clamp(v.s.w,0.,1.)*220.;let depthHeight=world.z+layerHeight+world.y*.03;
 var o:Out;o.clip=vec4f(loc.x/f.arena.x*2.-1.,1.-loc.y/f.arena.y*2.,-depthHeight/700.,1.);o.norm=normalize(n);o.pos=world;o.c=v.c;o.p=v.p;o.cls=v.s.w;return o;}
fn fresnel(c:f32,f0:vec3f)->vec3f{return f0+(vec3f(1.)-f0)*pow(1.-c,5.);}
@fragment fn fs(v:Out)->@location(0) vec4f {let N=normalize(v.norm);let V=normalize(vec3f(0.,-.25,1.));let L=normalize(vec3f(-.45,-.5,.85));let H=normalize(V+L);
 let rough=clamp(v.c.w,.14,.94);let metal=v.p.x;let grain=fract(sin(dot(floor(v.pos.xy*2.),vec2f(12.9898,78.233)))*43758.5453);let base=v.c.rgb*(.97+grain*.06);
 let nl=max(dot(N,L),.001);let nv=max(dot(N,V),.001);let nh=max(dot(N,H),0.);let vh=max(dot(V,H),0.);let a=rough*rough;let a2=a*a;let den=nh*nh*(a2-1.)+1.;let D=a2/(3.14159265*den*den+.0001);let k=(rough+1.)*(rough+1.)/8.;
 let G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);let F=fresnel(vh,mix(vec3f(.04),base,metal));var lit=((vec3f(1.)-F)*(1.-metal)*base/3.14159265+D*G*F/(4.*nl*nv+.001))*vec3f(4.,3.7,3.25)*nl;
 let refl=reflect(-V,N);let env=pow(max(dot(refl,normalize(vec3f(.5,-.5,1.))),0.),mix(95.,4.,rough));lit+=base*(.12+.16*max(N.z,0.))*(1.-metal*.55)+mix(vec3f(.10,.16,.20),base,metal)*env*.6;
 var tint=vec3f(.18,.8,.7);if(f.arena.w>.5){tint=vec3f(.5,.2,1.);}if(f.arena.w>1.5){tint=vec3f(1.,.52,.14);}lit+=tint*pow(1.-nv,3.)*.18+base*v.p.y+vec3f(v.p.z);return vec4f(max(lit,vec3f(0.)),v.cls);}
