export async function createVolumeTexture(device)
{
    // Fetch the image and upload it into a GPUTexture.
    let volumeTexture;
    {
        const width = 180;
        const height = 216;
        const depth = 180;
        const format = 'r8unorm';
        const blockLength = 1;
        const bytesPerBlock = 1;
        const blocksWide = Math.ceil(width / blockLength);
        const blocksHigh = Math.ceil(height / blockLength);
        const bytesPerRow = blocksWide * bytesPerBlock;
        const dataPath =
            '../img/t1_icbm_normal_1mm_pn0_rf0_180x216x180_uint8_1x1.bin-gz';

        // Fetch the compressed data
        const response = await fetch(dataPath);
        const compressedArrayBuffer = await response.arrayBuffer();

        // Decompress the data using DecompressionStream for gzip format
        const decompressionStream = new DecompressionStream('gzip');
        const decompressedStream = new Response(
            compressedArrayBuffer
        ).body.pipeThrough(decompressionStream);
        const decompressedArrayBuffer = await new Response(
            decompressedStream
        ).arrayBuffer();
        const byteArray = new Uint8Array(decompressedArrayBuffer);

        volumeTexture = device.createTexture({
            dimension: '3d',
            size: [width, height, depth],
            format: format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        device.queue.writeTexture(
            {
                texture: volumeTexture,
            },
            byteArray,
            { bytesPerRow: bytesPerRow, rowsPerImage: blocksHigh },
            [width, height, depth]
        );
    }
    return volumeTexture;
}