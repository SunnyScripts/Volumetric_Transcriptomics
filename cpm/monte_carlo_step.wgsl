//Created by Ryan Berg 11/11/24

@group(2) @binding(0) var<storage, read> agent_list_src: array<Agent>;
@group(2) @binding(1) var<storage, read_write> agent_list_dst: array<Agent>;

@group(0) @binding(1) var readTexture: texture_3d<f32>;
@group(0) @binding(2) var writeTexture: texture_storage_3d<rgba16float, write>;


struct Cell {
    perimeter: f32,
    volume: f32,
};

@compute
@workgroup_size(64)
fn main(@builtin(global_invocation_id) global_invocation_id: vec3<u32>) {

}
