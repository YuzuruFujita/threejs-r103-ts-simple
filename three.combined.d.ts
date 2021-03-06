export * from './node_modules/@types/three/src/Three';

// controls
export * from './node_modules/@types/three/examples/jsm/controls/OrbitControls'
// loaders
export * from './node_modules/@types/three/examples/jsm/loaders/GLTFLoader'
export * from './node_modules/@types/three/examples/jsm/loaders/RGBELoader'
export * from './node_modules/@types/three/examples/jsm/loaders/DRACOLoader'
export * from './node_modules/@types/three/examples/jsm/loaders/DDSLoader'
export * from './node_modules/@types/three/examples/jsm/loaders/EXRLoader'
// util
export * from './node_modules/@types/three/examples/jsm/utils/RoughnessMipmapper'
// postprocessing
export * from './node_modules/@types/three/examples/jsm/postprocessing/EffectComposer'
export * from './node_modules/@types/three/examples/jsm/postprocessing/SSAOPass'
export * from './node_modules/@types/three/examples/jsm/postprocessing/ShaderPass'
// shader
export * from './node_modules/@types/three/examples/jsm/shaders/GammaCorrectionShader'
// nodes
export * from './node_modules/@types/three/examples/jsm/nodes/Nodes'
// WEBGL
export * from './node_modules/@types/three/examples/jsm/WebGL'

// minimum definition for './node_modules/jsm/libs/stats.module.js'
export class Stats {
    dom: HTMLElement
    update(): void
}

export as namespace THREE;
