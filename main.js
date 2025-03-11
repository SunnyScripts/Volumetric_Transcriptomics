import CPM from "./cpm/cpm.js"

const canvas = document.querySelector('canvas');
const context = canvas.getContext('webgpu');
if (!navigator.gpu) {
    alert("WebGPU support is not available. A WebGPU capable browser is required to run this sample.");
    throw new Error("WebGPU support is not available");
}

const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

context.configure({device, format: "bgra8unorm", alphaMode: "premultiplied"});

let cpm = new CPM(device, 128);
await cpm.init();

(function animationLoop()
{
    if(cpm.simRunning) {
        cpm.updateUniforms();
        cpm.display(context);
    }
    requestAnimationFrame(animationLoop);
})();
