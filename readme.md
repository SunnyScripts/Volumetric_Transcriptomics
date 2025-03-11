# Volumetric Transcriptomics: Simulation on the GPU
Discrete cellular modeling and simulation are possible using 3D spatial transcriptomics data deconvoluted to identify cell type, volume, position and velocity. A teired modeling approach utilizes purpose built compute shaders to incorporate:

- ODE defined cellular pathways
- Surface protein cell-cell interaction networks
- Markov chain monte carlo sampling for cell state
- Histology feature detection to identify extracellular matrix or vasculature
- Signal diffusion to capture cell communication accross larger distances. 

This novel approach allows for a discrete understanding of genetic mechanisms for disease at scale in one portable package.

![Sim Layers](/img/Sim%20Layers.JPG)