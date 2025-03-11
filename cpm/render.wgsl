@group(0) @binding(2) var<uniform> model: mat4x4<f32>;
@group(0) @binding(3) var<uniform> view: mat4x4<f32>;
@group(0) @binding(4) var<uniform> projection: mat4x4<f32>;

struct VertexOutput
{
    @builtin(position) clip_position: vec4<f32>,
    @location(0) tex_coords: vec3<f32>,
};

@vertex
fn vs_main(@location(0) inPos: vec3<f32>,@builtin(instance_index) instanceIndex: u32) -> VertexOutput
{
    var out: VertexOutput;
    let modelMove = model * vec4<f32>((inPos.x) * 1., (inPos.y) * 1., (inPos.z + 0.) + f32(instanceIndex) * .005, 1.0);
    out.clip_position = projection * view * modelMove;
    out.tex_coords = vec3(modelMove.xyz);
    return out;
}

// Fragment shader
@group(0) @binding(0) var s_diffuse: sampler;
@group(0) @binding(1) var cpmTexture: texture_3d<f32>;

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32>
{
    let colorIntensity = textureSample(cpmTexture, s_diffuse, in.tex_coords);

    if(in.tex_coords.x > 1. || in.tex_coords.x < 0.) { discard ; }
    if(in.tex_coords.z > 1. || in.tex_coords.z < 0.) { discard ; }
    if(in.tex_coords.y > 1. || in.tex_coords.y < 0.) { discard ; }

    return vec4(smoothstep(0.2, 1., in.tex_coords.x), colorIntensity.r * 0.5, smoothstep(0.2, 1.,1. - in.tex_coords.x), colorIntensity.r - .25);
//    return vec4(0., colorIntensity.r, 0., colorIntensity.r);
}