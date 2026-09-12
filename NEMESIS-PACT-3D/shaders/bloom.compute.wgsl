
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var samp:sampler;
@group(0) @binding(2) var dest:texture_storage_2d<rgba16float,write>;
override HORIZONTAL:bool=true;override EXTRACT:bool=true;
fn getCol(q:vec2f)->vec3f {let c=textureSampleLevel(source,samp,q,0.).rgb;if(EXTRACT){let lum=max(c.r,max(c.g,c.b));return c*max(lum-.7,0.)/max(lum,.001);}return c;}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) gid:vec3u){let dims=textureDimensions(dest);if(any(gid.xy>=dims)){return;}let uv=(vec2f(gid.xy)+.5)/vec2f(dims);let src=vec2f(textureDimensions(source));var d=vec2f(0.,1./src.y);if(HORIZONTAL){d=vec2f(1./src.x,0.);}
 var col=getCol(uv)*.227027;col+=(getCol(uv+d*1.384615)+getCol(uv-d*1.384615))*.316216;col+=(getCol(uv+d*3.230769)+getCol(uv-d*3.230769))*.070270;textureStore(dest,vec2i(gid.xy),vec4f(col,1.));}
