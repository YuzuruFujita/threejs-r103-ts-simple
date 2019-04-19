export * from './node_modules/three/src/Three';

export * from './node_modules/three/examples/jsm/controls/OrbitControls'
export * from './node_modules/three/examples/jsm/loaders/GLTFLoader'
export * from './node_modules/three/examples/jsm/exporters/GLTFExporter'

export declare class DRACOLoader {
    public static setDecoderPath(path: string): DRACOLoader
    public static getDecoderModule(): Promise<any>
}

export as namespace THREE;
