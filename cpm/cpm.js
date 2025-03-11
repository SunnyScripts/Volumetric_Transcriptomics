//Created by Ryan Berg 10/28/24

import {createGPUBuffer} from "/utilities/createGPUBuffer.js"

let cameraProperties = {
    distFromOrigin: 4,
    speed: .0025, //ToDo: incorporate delta time
    fov: .3,
    pixelWidth: 500,
    pixelHeight: 500,
    nearClip: 0.1,
    farClip: 1000,
    angle: {
        x: 0,
        y: 0
    },
    pos: {
        x: 0,
        y: 0,
        z: 0
    }
}

cameraProperties["distFromOrigin"]

export default class CPM{
    /**
     * WebGPU hardware reference
     * @param device
     *
     * Camera looks at always looks at the origin
     * and moves along a sphere at a distance of cameraDistanceFromOrigin
     * @param {{pos: {x: number, y: number, z: number}, angle: {x: number, y: number},
     *  pixelWidth: number, pixelHeight: number,  nearClip: number,  farClip: number,
     *  distFromOrigin: number, fov: number, speed: number}} [cameraSettings = cameraProperties]
     *
     *  Defines width, height and depth of the volume for the cpm.
     * @param {Number} [volumeSize = 64]
     */
    constructor(device, volumeSize = 64, cameraSettings = cameraProperties) {
        this.device = device;
        this.volumeSize = volumeSize;

        this.simRunning = true;
        this.camera = cameraSettings;
        //divide by thread count in shader
        this.workGroupCount = Math.ceil(volumeSize / 4);
        console.log("workgroup count")
        console.log(this.workGroupCount);

        this.userInput = new userInput();

        this.initVolume = {
            pipeline: null,
            bindGroup: null,
            bindGroupLayout: null,
            shader: null
        };
        this.compute = {
            pipeline: null,
            bindGroup: null,
            bindGroupLayout: null,
            shader: null
        };
        this.render = {
            pipeline: null,
            bindGroup: null,
            bindGroupLayout: null,
            shader: null
        };
        this.buffer = {
            vertex: null,
            storageTexture: null,
            cellProperties: null,
            model: null,
            view: null,
            projection: null
        };
        this.matrix = {
            model: glMatrix.mat4.create(),
            view: glMatrix.mat4.create(),
            projection: glMatrix.mat4.create()
        }
    }
    async init()
    {
        this.buildCamera();
        this.initPipelineBuffers();
        await this.createVolumePipeline();

        //Run Volume Initialization
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.initVolume.pipeline);
        passEncoder.setBindGroup(0, this.initVolume.bindGroup);
        passEncoder.dispatchWorkgroups(this.workGroupCount, this.workGroupCount, this.workGroupCount);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        await this.createRenderPipeline();
    }
    buildCamera()
    {
        glMatrix.mat4.lookAt(this.matrix.view,
            glMatrix.vec3.fromValues(0, 0, this.camera.distFromOrigin),
            glMatrix.vec3.fromValues(0,0,0),
            glMatrix.vec3.fromValues(0.0, 1.0, 0)
        );

        glMatrix.mat4.translate(this.matrix.view, this.matrix.view, glMatrix.vec3.fromValues(-.5, -.5, -.5));

        glMatrix.mat4.perspective(this.matrix.projection,
            this.camera.fov, this.camera.pixelWidth / this.camera.pixelHeight, this.camera.nearClip, this.camera.farClip);

        this.buffer.model = createGPUBuffer(this.device, this.matrix.model, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
        this.buffer.view = createGPUBuffer(this.device, this.matrix.view, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
        this.buffer.projection = createGPUBuffer(this.device, this.matrix.projection, GPUBufferUsage.UNIFORM);
    }
    initPipelineBuffers()
    {
        this.buffer.storageTexture = this.device.createTexture({
            label: "storage texture",
            dimension: "3d",
            format: "rgba16float",
            size: [this.volumeSize, this.volumeSize, this.volumeSize],
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
        });

        const cellProperties = new Uint32Array([
            //Background
            0, //volume
            0, //target volume
            0, //perimeter count
            0, //target perimeter count
            0, 0, //perimeter X dimension
            0, 0, //perimeter Y dimension
            0, 0, //perimeter Z dimension
            //Cell 1
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            //Cell 2
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ]);

        this.buffer.cellProperties = createGPUBuffer(this.device, cellProperties, GPUBufferUsage.STORAGE);

        const vertices = new Float32Array([
            1, 0, 0,//bottom-right
            0, 0, 0,//bottom-left
            1, 1, 0,//top-right
            0, 1, 0//top-left
        ]);

        this.buffer.vertex = createGPUBuffer(this.device, vertices, GPUBufferUsage.VERTEX);
    }
    async createVolumePipeline()
    {
        this.initVolume.shader = this.device.createShaderModule({
            code: await fetch("./cpm/st2texture.wgsl").then(r => r.text())
        });

        this.initVolume.bindGroupLayout = this.device.createBindGroupLayout({
            entries:
                [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            format: "rgba16float",
                            viewDimension: "3d"
                        }
                    },
                ]
        });

        this.initVolume.bindGroup = this.device.createBindGroup({
            label: "init volume bind group",
            layout: this.initVolume.bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: this.buffer.storageTexture.createView()
                }
            ]
        });

        this.initVolume.pipeline = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({bindGroupLayouts: [this.initVolume.bindGroupLayout]}),
            compute: {module: this.initVolume.shader}});
    }
    async createRenderPipeline()
    {
        this.render.shader = this.device.createShaderModule({
            code: await fetch("./cpm/render.wgsl").then(r => r.text())
        });

        const sampler = this.device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            addressModeW: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
        });

        this.render.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "float",
                        viewDimension: "3d"
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                }
            ]
        });

        this.render.bindGroup = this.device.createBindGroup({
            layout: this.render.bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource:
                    sampler
                },
                {
                    binding: 1,
                    resource: this.buffer.storageTexture.createView()
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.buffer.model
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.buffer.view
                    }
                },
                {
                    binding: 4,
                    resource: {
                        buffer: this.buffer.projection
                    }
                },
            ]
        });


        this.render.pipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({bindGroupLayouts: [this.render.bindGroupLayout]}),
            vertex: {
                module: this.render.shader,
                entryPoint: 'vs_main',
                buffers: [{
                    attributes: [{
                        shaderLocation: 0, // @location(0)
                        offset: 0,
                        format: 'float32x3'
                    }],
                    arrayStride: 4 * 3, // sizeof(float) * 3
                    stepMode: 'vertex'
                }]
            },
            fragment: {
                module: this.render.shader,
                entryPoint: 'fs_main',
                targets: [
                    {
                        format: "bgra8unorm",
                        blend: {
                            color: {
                                srcFactor: "src-alpha",
                                dstFactor: "dst-alpha",
                                operation: "add"
                            },
                            alpha: {
                                dstFactor: "dst-alpha"
                            }
                        }
                    }
                ]
            },
            primitive: {
                topology: 'triangle-strip',
                frontFace: 'cw',
                cullMode: 'back'
            }
        });
    }
    updateUniforms()
    {
        if(this.simRunning)
        {
            if(!this.userInput.anyCameraMovement)
            {
                this.userInput.left = 1;
                this.camera.angle.y += this.camera.speed * (this.userInput.left + this.userInput.right);
                // this.camera.angle.x -= this.camera.speed * (this.userInput.up + this.userInput.down);

                let up = 1;
                if(Math.abs((this.camera.angle.x + (Math.PI / 2)) % (2 * Math.PI)) > Math.PI)
                    up = -1;

                this.camera.pos.x = this.camera.distFromOrigin * Math.sin(this.camera.angle.y);
                this.camera.pos.y = this.camera.distFromOrigin * Math.cos(this.camera.angle.y) * Math.sin(this.camera.angle.x);
                this.camera.pos.z = this.camera.distFromOrigin * Math.cos(this.camera.angle.y) * Math.cos(this.camera.angle.x);


                glMatrix.mat4.lookAt(this.matrix.view,
                    glMatrix.vec3.fromValues(this.camera.pos.x, this.camera.pos.y, this.camera.pos.z),
                    glMatrix.vec3.fromValues(0, 0, 0),
                    glMatrix.vec3.fromValues(0.0, up, 0.0)
                );
                glMatrix.mat4.translate(this.matrix.view, this.matrix.view, glMatrix.vec3.fromValues(-.5, -.5, -.5));
                this.device.queue.writeBuffer(this.buffer.view, 0, this.matrix.view);


                glMatrix.mat4.translate(this.matrix.model, this.matrix.model, glMatrix.vec3.fromValues(.5, .5, .5));

                glMatrix.mat4.rotateY(this.matrix.model, this.matrix.model, this.camera.speed * (this.userInput.left + this.userInput.right));
                glMatrix.mat4.rotateX(this.matrix.model, this.matrix.model, this.camera.speed * (this.userInput.up + this.userInput.down));

                glMatrix.mat4.translate(this.matrix.model, this.matrix.model, glMatrix.vec3.fromValues(-.5, -.5, -.5));
                this.device.queue.writeBuffer(this.buffer.model, 0, this.matrix.model);




            }
        }
    }
    display(context)
    {
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                clearValue: { r: .2039, g: .08235, b: .2235, a: 1},
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });
        passEncoder.setViewport(0, 0, this.camera.pixelWidth, this.camera.pixelHeight, 0, 1);
        passEncoder.setPipeline(this.render.pipeline);
        passEncoder.setBindGroup(0, this.render.bindGroup);
        passEncoder.setVertexBuffer(0, this.buffer.vertex);
        passEncoder.draw(4, 200);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
}

class userInput{
    constructor() {
        [this.left, this.right, this.up, this.down] = [0, 0, 0, 0];
        this.anyCameraMovement = false;

        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') {this.left = 1; this.anyCameraMovement = true;}
            if (event.key === 'ArrowRight'){this.right = -1; this.anyCameraMovement = true;}
            if (event.key === 'ArrowUp'){this.up = -1; this.anyCameraMovement = true;}
            if (event.key === 'ArrowDown'){this.down = 1; this.anyCameraMovement = true;}
        });

        document.addEventListener('keyup', (event) => {
            if (event.key === 'ArrowLeft') {this.left = 0;}
            if (event.key === 'ArrowRight'){this.right = 0;}
            if (event.key === 'ArrowUp'){this.up = 0;}
            if (event.key === 'ArrowDown'){this.down = 0;}
            if(this.left + this.right + this.up + this.down === 0){this.anyCameraMovement = false;}
        });
    }
}