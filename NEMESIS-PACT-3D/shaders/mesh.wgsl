struct Frame { arena:vec4f, shock:vec4f, shake:vec4f, screen:vec4f, fx:vec4f };
@group(0) @binding(0) var<uniform> f:Frame;
struct In { @location(0) pos:vec3f,@location(1) norm:vec3f,@location(2) a:vec4f,@location(3) s:vec4f,@location(4) c:vec4f,@location(5) p:vec4f };
struct Out { @builtin(position) clip:vec4f,@location(0) norm:vec3f,@location(1) pos:vec3f,@location(2) c:vec4f,@location(3) p:vec4f,@location(4) cls:f32 };
fn depth01(z:f32,cls:f32)->f32 {
 let scenery=.94-.38*clamp((z+140.)/420.,0.,1.);
 let flight=.28-.16*clamp((z+100.)/280.,0.,1.);
 return select(scenery,flight,cls>=.5&&cls<.7);}
@vertex fn vs(v:In)->Out {let cs=cos(v.a.w);let sn=sin(v.a.w);let ct=cos(v.p.w);let st=sin(v.p.w);var p=v.pos*v.s.xyz;let yz=mat2x2f(ct,st,-st,ct)*p.yz;p=vec3f(p.x,yz);let xy=mat2x2f(cs,sn,-sn,cs)*p.xy;p=vec3f(xy,p.z);
 var n=v.norm/max(v.s.xyz,vec3f(.001));let nyz=mat2x2f(ct,st,-st,ct)*n.yz;n=vec3f(n.x,nyz);n=vec3f(mat2x2f(cs,sn,-sn,cs)*n.xy,n.z);let world=p+v.a.xyz;let loc=world.xy+f.shake.xy-vec2f(0.,p.z*.22);
 let z01=depth01(world.z,v.s.w);
 var o:Out;o.clip=vec4f(loc.x/f.arena.x*2.-1.,1.-loc.y/f.arena.y*2.,z01,1.);o.norm=normalize(n);o.pos=world;o.c=v.c;o.p=v.p;o.cls=v.s.w;return o;}
fn sectorTint(s:f32)->vec3f{if(s>4.5){return vec3f(.82,.78,.49);}if(s>3.5){return vec3f(.87,.29,.58);}if(s>2.5){return vec3f(.22,.64,.9);}if(s>1.5){return vec3f(1.,.52,.14);}if(s>.5){return vec3f(.5,.2,1.);}return vec3f(.18,.8,.7);}
fn fresnel(c:f32,f0:vec3f)->vec3f{return f0+(vec3f(1.)-f0)*pow(1.-c,5.);}
@fragment fn fs(v:Out)->@location(0) vec4f {if(v.cls<0.){return vec4f(v.c.rgb,0.);}let flight=v.cls>=.5&&v.cls<.7;let N=normalize(v.norm);let V=normalize(vec3f(0.,-.25,1.));let L=normalize(vec3f(-.45,-.5,.85));let H=normalize(V+L);
 let rough=clamp(v.c.w,.14,.94);let metal=v.p.x;let stage=f.arena.w;let bossFx=f.shake.z;let t=f.arena.z;
 let grain=fract(sin(dot(floor(v.pos.xy*2.),vec2f(12.9898,78.233)))*43758.5453);let base=v.c.rgb*(.97+grain*.06);
 let nl=max(dot(N,L),.001);let nv=max(dot(N,V),.001);let nh=max(dot(N,H),0.);let vh=max(dot(V,H),0.);let a=rough*rough;let a2=a*a;let den=nh*nh*(a2-1.)+1.;let D=a2/(3.14159265*den*den+.0001);let k=(rough+1.)*(rough+1.)/8.;
 let G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);let F=fresnel(vh,mix(vec3f(.04),base,metal));var lit=((vec3f(1.)-F)*(1.-metal)*base/3.14159265+D*G*F/(4.*nl*nv+.001))*vec3f(4.,3.7,3.25)*nl;
 var tint=vec3f(.18,.8,.7);var skyLo=vec3f(.012,.070,.080);var skyHi=vec3f(.10,.24,.26);if(stage>.5){tint=vec3f(.5,.2,1.);skyLo=vec3f(.045,.020,.085);skyHi=vec3f(.20,.10,.32);}if(stage>1.5){tint=vec3f(1.,.52,.14);skyLo=vec3f(.095,.050,.012);skyHi=vec3f(.32,.22,.08);}if(stage>2.5){tint=sectorTint(stage);skyLo=tint*.09;skyHi=tint*.30+vec3f(.01,.012,.022);}let skyMix=clamp((v.pos.y/f.arena.y)*.7+.5,0.,1.);let sky=mix(skyLo,skyHi,skyMix);
 let refl=reflect(-V,N);let env=pow(max(dot(refl,normalize(vec3f(.5,-.5,1.))),0.),mix(95.,4.,rough));let pulse=.5+.5*sin((v.pos.x+v.pos.y)*.018-t*(1.8+bossFx*1.2));
 lit+=base*(.34+.40*max(N.z,0.))*mix(vec3f(1.),sky*4.,.16)+mix(sky,base,metal)*env*(.50+.06*bossFx);lit+=base*tint*(.06+.02*pulse)+sky*.018;
 lit+=tint*pow(1.-nv,3.)*(.18+.12*bossFx)+base*v.p.y+vec3f(v.p.z);
 let heightDistance=clamp((140.-v.pos.z)/240.,0.,1.);let farDistance=clamp(1.-v.pos.y/f.arena.y,0.,1.);
 let density=select(.14,select(.23,.18,stage>1.5),stage>.5);
 let fog=select(min(.38,1.-exp(-density*(.35+heightDistance+farDistance*.55))),0.,flight);
 let haze=mix(sky,tint,.08)*.22;lit=mix(lit,haze,fog);
 if(!flight&&v.pos.z< -85.){let wave=.5+.5*sin(v.pos.x*.012+sin(v.pos.y*.007+t*.10)*2.);lit+=tint*wave*.016;}
 if(!flight){let delta=v.pos.xy/f.arena.xy-vec2f(.5);let center=smoothstep(.12,.40,length(delta));lit*=.82+.18*center;}return vec4f(max(lit,vec3f(0.)),select(0.,1.,flight));}
