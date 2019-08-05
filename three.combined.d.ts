export * from './node_modules/three/src/Three';

export * from './node_modules/three/examples/jsm/controls/OrbitControls'
export * from './node_modules/three/examples/jsm/loaders/GLTFLoader'
export * from './node_modules/three/examples/jsm/exporters/GLTFExporter'
export * from './node_modules/three/examples/jsm/loaders/DRACOLoader'
export * from './node_modules/three/examples/jsm/loaders/DDSLoader'

export * from './node_modules/three/examples/jsm/nodes/Nodes'

// minimum definition for './node_modules/jsm/libs/stats.module.js'
export class Stats {
    dom: HTMLElement
    update(): void
}

export as namespace THREE;
