#version 300 es
precision highp float;
in vec3 vN;in vec3 vPos;in vec4 vC;in vec4 vP;in float vClass;uniform vec4 uF[4];out vec4 outColor;
vec3 fresnel(float c,vec3 f0){return f0+(1.-f0)*pow(1.-c,5.);}
void main(){vec3 N=normalize(vN),V=normalize(vec3(0.,-.25,1.)),L=normalize(vec3(-.45,-.5,.85)),H=normalize(V+L);
 float rough=clamp(vC.w,.14,.94),metal=vP.x;vec3 base=vC.rgb;
 float grain=fract(sin(dot(floor(vPos.xy*2.),vec2(12.9898,78.233)))*43758.5453);base*=.97+grain*.06;
 float nl=max(dot(N,L),.001),nv=max(dot(N,V),.001),nh=max(dot(N,H),0.),vh=max(dot(V,H),0.);
 float a=rough*rough,a2=a*a,den=nh*nh*(a2-1.)+1.;float D=a2/(3.14159265*den*den+.0001);float k=(rough+1.)*(rough+1.)/8.;
 float G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);vec3 F=fresnel(vh,mix(vec3(.04),base,metal));
 vec3 lit=((1.-F)*(1.-metal)*base/3.14159265+D*G*F/(4.*nl*nv+.001))*vec3(4.0,3.7,3.25)*nl;
 vec3 refl=reflect(-V,N);float env=pow(max(dot(refl,normalize(vec3(.5,-.5,1.))),0.),mix(95.,4.,rough));
 lit+=base*(.12+.16*max(N.z,0.))*(1.-metal*.55)+mix(vec3(.10,.16,.20),base,metal)*env*.60;
 vec3 tint=uF[0].w<.5?vec3(.18,.8,.7):uF[0].w<1.5?vec3(.5,.2,1.):vec3(1.,.52,.14);
 lit+=tint*pow(1.-nv,3.)*.18+base*vP.y+vec3(vP.z);
 outColor=vec4(max(lit,vec3(0.)),vClass);}
