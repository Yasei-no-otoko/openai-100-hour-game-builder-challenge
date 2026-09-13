#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 iA; layout(location=3) in vec4 iS; layout(location=4) in vec4 iC; layout(location=5) in vec4 iP;
uniform vec4 uF[5]; out vec3 vN; out vec3 vPos; out vec4 vC; out vec4 vP; out float vClass;
float depth01(float z,float cls){
 float scenery=.94-.38*clamp((z+140.)/420.,0.,1.);
 float flight=.28-.16*clamp((z+100.)/280.,0.,1.);
 return (cls>=.5&&cls<.7)?flight:scenery;}
void main(){float c=cos(iA.w),s=sin(iA.w),ct=cos(iP.w),st=sin(iP.w);vec3 p=aPos*iS.xyz; p.yz=mat2(ct,st,-st,ct)*p.yz;
 p.xy=mat2(c,s,-s,c)*p.xy; vec3 n=aNormal/max(iS.xyz,vec3(.001));n.yz=mat2(ct,st,-st,ct)*n.yz;n.xy=mat2(c,s,-s,c)*n.xy;
 vPos=p+iA.xyz; vClass=iS.w; float z01=depth01(vPos.z,vClass); vec2 xy=vPos.xy+uF[2].xy;xy.y-=p.z*.22;
 gl_Position=vec4(xy.x/uF[0].x*2.-1.,1.-xy.y/uF[0].y*2.,z01*2.-1.,1.);
 vN=normalize(n);vC=iC;vP=iP;}
