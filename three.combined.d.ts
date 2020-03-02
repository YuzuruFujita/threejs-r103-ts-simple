export * from './node_modules/three/src/Three';

// controls
export * from './node_modules/three/examples/jsm/controls/OrbitControls'
// loaders
export * from './node_modules/three/examples/jsm/loaders/GLTFLoader'
export * from './node_modules/three/examples/jsm/loaders/RGBELoader'
export * from './node_modules/three/examples/jsm/loaders/DRACOLoader'
export * from './node_modules/three/examples/jsm/loaders/DDSLoader'
// util
export * from './node_modules/three/examples/jsm/utils/RoughnessMipmapper.js'
// nodes
export * from './node_modules/three/examples/jsm/nodes/Nodes'
// WEBGL
export * from './node_modules/three/examples/jsm/WebGL'

// minimum definition for './node_modules/jsm/libs/stats.module.js'
export class Stats {
    dom: HTMLElement
    update(): void
}

export as namespace THREE;
