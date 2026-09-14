#version 300 es
precision highp float;
in vec3 vN;in vec3 vPos;in vec4 vC;in vec4 vP;in float vClass;uniform vec4 uF[5];out vec4 outColor;
vec3 sectorTint(float s){if(s>4.5)return vec3(.82,.78,.49);if(s>3.5)return vec3(.87,.29,.58);if(s>2.5)return vec3(.22,.64,.9);if(s>1.5)return vec3(1.,.52,.14);if(s>.5)return vec3(.5,.2,1.);return vec3(.18,.8,.7);}
vec3 fresnel(float c,vec3 f0){return f0+(1.-f0)*pow(1.-c,5.);}
void main(){if(vClass<0.){outColor=vec4(vC.rgb,0.);return;} bool flight=vClass>=.5&&vClass<.7;vec3 N=normalize(vN),V=normalize(vec3(0.,-.25,1.)),L=normalize(vec3(-.45,-.5,.85)),H=normalize(V+L);
 float rough=clamp(vC.w,.14,.94),metal=vP.x;vec3 base=vC.rgb;float t=uF[0].z,stage=uF[0].w,bossFx=uF[2].z;
 float grain=fract(sin(dot(floor(vPos.xy*2.),vec2(12.9898,78.233)))*43758.5453);base*=.97+grain*.06;
 float nl=max(dot(N,L),.001),nv=max(dot(N,V),.001),nh=max(dot(N,H),0.),vh=max(dot(V,H),0.);
 float a=rough*rough,a2=a*a,den=nh*nh*(a2-1.)+1.;float D=a2/(3.14159265*den*den+.0001);float k=(rough+1.)*(rough+1.)/8.;
 float G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);vec3 F=fresnel(vh,mix(vec3(.04),base,metal));
 vec3 lit=((1.-F)*(1.-metal)*base/3.14159265+D*G*F/(4.*nl*nv+.001))*vec3(4.0,3.7,3.25)*nl;
 vec3 tint=sectorTint(stage);
 vec3 skyLo=stage<.5?vec3(.012,.070,.080):stage<1.5?vec3(.045,.020,.085):vec3(.095,.050,.012);
 vec3 skyHi=stage<.5?vec3(.10,.24,.26):stage<1.5?vec3(.20,.10,.32):vec3(.32,.22,.08);
 if(stage>2.5){skyLo=tint*.09;skyHi=tint*.30+vec3(.01,.012,.022);} float skyMix=clamp((vPos.y/uF[0].y)*.7+.5,0.,1.);vec3 sky=mix(skyLo,skyHi,skyMix);
 vec3 refl=reflect(-V,N);float env=pow(max(dot(refl,normalize(vec3(.5,-.5,1.))),0.),mix(95.,4.,rough));
 float pulse=.5+.5*sin((vPos.x+vPos.y)*.018-t*(1.8+bossFx*1.2));
 lit+=base*(.34+.40*max(N.z,0.))*mix(vec3(1.),sky*4.,.16)+mix(sky,base,metal)*env*(.50+.06*bossFx);
 lit+=base*tint*(.06+.02*pulse)+sky*.018;
 lit+=tint*pow(1.-nv,3.)*(.18+.12*bossFx)+base*vP.y+vec3(vP.z);
 float heightDistance=clamp((140.-vPos.z)/240.,0.,1.);
 float farDistance=clamp(1.-vPos.y/uF[0].y,0.,1.);
 float density=stage<.5?.14:stage<1.5?.23:.18;
 float fog=flight?0.:min(.38,1.-exp(-density*(.35+heightDistance+farDistance*.55)));
 vec3 haze=mix(sky,tint,.08)*.22;lit=mix(lit,haze,fog);
 if(!flight&&vPos.z<-85.){float wave=.5+.5*sin(vPos.x*.012+sin(vPos.y*.007+t*.10)*2.);lit+=tint*wave*.016;}
 if(!flight){vec2 delta=(vPos.xy/uF[0].xy-.5);float center=smoothstep(.12,.40,length(delta));lit*=.82+.18*center;}
 outColor=vec4(max(lit,vec3(0.)),flight?1.:0.);}
