//Created by Ryan Berg 11/11/24

@group(2) @binding(1) var<storage, read_write> cell_hamiltonian_dst: array<Cell>;

@group(0) @binding(1) var readTexture: texture_3d<f32>;

struct  UniformData{
    volume_size: u32
}

struct Cell {
    perimeter:  atomic<u32>,
    volume:  atomic<u32>,
}

var<workgroup> localCellProps: array size = 64?? <Cell>;

const neighbors = array<vec3<i32>, 26>(vec3<i32>(1, 1, 0), vec3<i32>(0, 1, 0), vec3<i32>(-1, 1, 0),
                                        vec3<i32>(1, 0, 0), vec3<i32>(-1, 0, 0),
                                        vec3<i32>(1, -1, 0), vec3<i32>(0, -1, 0), vec3<i32>(-1, -1, 0),
                                        vec3<i32>(1, 1, 1), vec3<i32>(0, 1, 1), vec3<i32>(-1, 1, 1),
                                        vec3<i32>(1, 0, 1), vec3<i32>(0, 0, 1), vec3<i32>(-1, 0, 1),
                                        vec3<i32>(1, -1, 1), vec3<i32>(0, -1, 1), vec3<i32>(-1, -1, 1),
                                        vec3<i32>(1, 1, -1), vec3<i32>(0, 1, -1), vec3<i32>(-1, 1, -1),
                                        vec3<i32>(1, 0, -1), vec3<i32>(0, 0, -1), vec3<i32>(-1, 0, -1),
                                        vec3<i32>(1, -1, -1), vec3<i32>(0, -1, -1), vec3<i32>(-1, -1, -1)
                                        );

@compute
@workgroup_size(64)
fn main(@builtin(global_invocation_id) global_invocation_id: vec3<u32>)
{

    var id = vec3<i32>(global_invocation_id);
    let largest_index = i32(u.volume_size - 1);
    let s_texel =  textureLoad(readTexture, id, 0);

    var nonNeighborCount = 0;
    for(let i = 0; i < 26; i++) {
        let neighbor = neighbors[i];

        if(neighbor.x > largest_index) { continue; }
        else if(neighbor.x < 0) { continue; }
        if(neighbor.z > largest_index) { continue; }
        else if(neighbor.z < 0) { continue; }
        if(neighbor.y > largest_index) { continue; }
        else if(neighbor.y < 0) { continue; }

        let n_texel =  textureLoad(readTexture, neighbor, 0);
        if(n_texel.r != s_texel.r){
            nonNeighborCount++;
        }
    }

    if(nonNeighborCount != 0)
    {
        atomicAdd(&localCellProps[u32(s_texel.r)].perimeter, nonNeighborCount);
    }
    if(s_texel.r != 0)
    {
        atomicAdd(&localCellProps[u32(s_texel.r)].volume, 1);
    }

    workgroupBarrier();

    if(local_invocation_id == vec3(0, 0, 0))
    {
        if(localCellProps.perimeter != 0)
        {
            atomicAdd(&cell_hamiltonian_dst[u32(s_texel.r)].perimeter, localCellProps.perimeter);
        }
        if(localCellProps.volume != 0){
            atomicAdd(&cell_hamiltonian_dst[u32(s_texel.r)].volume, localCellProps.volume);
        }
    }
}






















