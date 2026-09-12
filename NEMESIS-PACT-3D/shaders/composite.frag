#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex;uniform sampler2D bloom;uniform vec4 uF[4];out vec4 outColor;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec4 orig=texture(tex,uv);vec2 q=uv;float strength=uF[1].w*(1.-uF[3].w),age=uF[1].z;
 vec2 origin=vec2(uF[1].x,1.-uF[1].y);vec2 d=q-origin;d.x*=uF[0].x/uF[0].y;float radius=length(d),pulse=exp(-pow((radius-age*1.6)*16.,2.));
 vec2 shift=normalize(d+vec2(.0001))*(sin(radius*65.-age*30.)*.008*pulse*strength);q+=shift;
 vec4 warped=texture(tex,clamp(q,vec2(0.),vec2(1.)));vec3 col=orig.rgb;if(orig.a<.5&&warped.a<.5)col=warped.rgb;
 col+=texture(bloom,uv).rgb*mix(.35,.12,uF[3].w);col=aces(col*uF[3].z);col=pow(col,vec3(1./2.2));
 float edge=uv.x*uv.y*(1.-uv.x)*(1.-uv.y);col*=.84+.16*clamp(pow(edge*16.,.18),0.,1.);outColor=vec4(col,1.);}