#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex;uniform sampler2D bloom;uniform vec4 uF[5];out vec4 outColor;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec4 orig=texture(tex,uv);vec2 q=uv;float postFx=uF[4].x,bloomAmt=uF[4].y;float strength=uF[1].w*(1.-uF[3].w)*postFx,age=uF[1].z,bossFx=uF[2].z,stage=uF[0].w;
 vec2 origin=vec2(uF[1].x,1.-uF[1].y);vec2 d=q-origin;d.x*=uF[0].x/uF[0].y;float radius=length(d),pulse=exp(-pow((radius-age*1.6)*16.,2.));
 vec2 shift=normalize(d+vec2(.0001))*(sin(radius*65.-age*30.)*.008*pulse*strength);q+=shift;
 vec4 warped=texture(tex,clamp(q,vec2(0.),vec2(1.)));vec3 col=orig.rgb;if(orig.a<.5&&warped.a<.5)col=warped.rgb;
 vec2 cdir=(uv-.5)*vec2(uF[0].x/uF[0].y,1.);float cab=(.0012+.0018*bossFx)*(1.-uF[3].w)*postFx;
 vec4 redSample=texture(tex,clamp(q+cdir*cab,vec2(0.),vec2(1.)));vec4 blueSample=texture(tex,clamp(q-cdir*cab,vec2(0.),vec2(1.)));
 if(orig.a<.5&&warped.a<.5&&redSample.a<.5&&blueSample.a<.5)col=mix(col,vec3(redSample.r,col.g,blueSample.b),( .45+.25*bossFx)*min(postFx,1.));
 col+=texture(bloom,uv).rgb*mix(.27,.10,uF[3].w)*(1.+bossFx*.30)*bloomAmt;
 vec3 grade=stage<.5?vec3(1.00,.985,1.02):stage<1.5?vec3(1.03,.97,1.05):vec3(1.06,1.00,.94);
 float scan=1.-.012*(1.-sin((uv.y*uF[3].y+uF[0].z*42.)*.7)); if(orig.a<.5)col*=mix(1.,scan,min(postFx,1.)*(1.-uF[3].w));
 grade=mix(vec3(1.),grade,min(postFx,1.));col=aces(col*uF[3].z*grade);col=pow(col,vec3(1./2.2));
 float edge=uv.x*uv.y*(1.-uv.x)*(1.-uv.y);col*=mix(1.,.9+.1*clamp(pow(edge*16.,.18),0.,1.),min(postFx,1.));outColor=vec4(col,1.);}
