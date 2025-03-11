@group(0) @binding(0) var cpmTexture: texture_storage_3d<rgba16float, write>;

fn hash33(_p3: vec3f) -> vec3f
{
    var p3 = _p3;
	p3 = fract(p3 * vec3(.1031,.11369,.13787));
    p3 += dot(p3, p3.yxz+19.19);
    return -1.0 + 2.0 * fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}

fn simplex_noise(p: vec3f) -> f32
{
    const K1 = 0.333333333;
    const K2 = 0.166666667;

    let i = floor(p + (p.x + p.y + p.z) * K1);
    let d0 = p - (i - (i.x + i.y + i.z) * K2);

    // thx nikita: https://www.shadertoy.com/view/XsX3zB
    let e = step(vec3(0.0), d0 - d0.yzx);
	let i1 = e * (1.0 - e.zxy);
	let i2 = 1.0 - e.zxy * (1.0 - e);

    let d1 = d0 - (i1 - 1.0 * K2);
    let d2 = d0 - (i2 - 2.0 * K2);
    let d3 = d0 - (1.0 - 3.0 * K2);

    let h = max((0.6 - vec4<f32>(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3))), vec4(0., 0., 0., 0.));
    let n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));

    return dot(vec4(31.316), n);
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) id: vec3u)
{
    //vec3(113.5,271.9,124.6)
//    if(id.x == 32)
//    {
//        textureStore(cpmTexture, id, vec4<f32>(1., 1., 1., 1.));
//    }
//    if(id.z == 32)
//    {
//        textureStore(cpmTexture, id, vec4<f32>(1., 1., 1., 1.));
//    }

//    if(id.x < 151 && id.x > 100 && id.z < 151 && id.z > 100 && id.y < 151 && id.y > 100)
//    {
//         textureStore(cpmTexture, id, vec4<f32>(1., 1., 1., 1.));
//    }
//    if(id.z > 200 || id.z < 50) { return ; }
//    if(id.y > 200 || id.y < 50) { return ; }
    textureStore(cpmTexture, id, vec4<f32>(smoothstep(0.2, 1., simplex_noise(vec3<f32>(id) / 33 )), 1., 1., 1.));
}