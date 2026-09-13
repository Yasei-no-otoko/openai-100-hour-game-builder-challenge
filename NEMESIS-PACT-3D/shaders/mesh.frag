#version 300 es
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
