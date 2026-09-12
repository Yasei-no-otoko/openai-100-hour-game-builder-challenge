#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex;uniform vec2 direction;uniform float extractBright;out vec4 outColor;
vec3 getCol(vec2 q){vec3 c=texture(tex,q).rgb;float l=max(c.r,max(c.g,c.b));return mix(c,c*max(l-.7,0.)/max(l,.001),extractBright);}
void main(){vec3 c=getCol(uv)*.227027; c+=(getCol(uv+direction*1.384615)+getCol(uv-direction*1.384615))*.316216;c+=(getCol(uv+direction*3.230769)+getCol(uv-direction*3.230769))*.070270;outColor=vec4(c,1.);}