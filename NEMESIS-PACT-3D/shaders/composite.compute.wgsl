struct Frame { arena:vec4f, shock:vec4f, shake:vec4f, screen:vec4f };
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var bloom:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@group(0) @binding(3) var dest:texture_storage_2d<rgba8unorm,write>;
@group(0) @binding(4) var<uniform> f:Frame;
fn aces(x:vec3f)->vec3f{return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),vec3f(0.),vec3f(1.));}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) gid:vec3u){let dims=textureDimensions(dest);if(any(gid.xy>=dims)){return;}let uv=(vec2f(gid.xy)+.5)/vec2f(dims);let original=textureSampleLevel(source,samp,uv,0.);let delta=(uv-f.shock.xy)*vec2f(f.arena.x/f.arena.y,1.);let r=length(delta);let age=f.shock.z;let strength=f.shock.w*(1.-f.screen.w);let pulse=exp(-pow((r-age*1.6)*16.,2.));let shift=normalize(delta+vec2f(.0001))*sin(r*65.-age*30.)*.008*pulse*strength;
 let q=clamp(uv+shift,vec2f(0.),vec2f(1.));let warped=textureSampleLevel(source,samp,q,0.);var col=original.rgb;
 if(original.a<.5&&warped.a<.5){col=warped.rgb;let qr=clamp(q+shift*.22,vec2f(0.),vec2f(1.));let qb=clamp(q-shift*.22,vec2f(0.),vec2f(1.));let rr=textureSampleLevel(source,samp,qr,0.);let bb=textureSampleLevel(source,samp,qb,0.);if(rr.a<.5&&bb.a<.5){col=vec3f(rr.r,col.g,bb.b);}}
 col+=textureSampleLevel(bloom,samp,uv,0.).rgb*mix(.35,.12,f.screen.w);col=pow(aces(col*f.screen.z),vec3f(1./2.2));let edge=uv.x*uv.y*(1.-uv.x)*(1.-uv.y);col*=.84+.16*clamp(pow(edge*16.,.18),0.,1.);textureStore(dest,vec2i(gid.xy),vec4f(col,1.));}
