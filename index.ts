import * as THREE from "three"
import * as dat from "dat.GUI"

class Main {
  private camera: THREE.PerspectiveCamera
  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private syncs: (() => void)[] = []
  private stats: THREE.Stats

  constructor() {
    const container: HTMLElement | null = document.getElementById('container');
    if (container === null)
      throw Error("Failure")

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1 / 32, 2000);
    this.camera.position.set(5, 5, 5)
    this.camera.lookAt(0, 0, 0)

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x888888)

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dir = new THREE.DirectionalLight(0xffffff, 1)
    this.scene.add(dir)
    dir.position.set(1, 2, 3)

    const material = new THREE.StandardNodeMaterial()
    const uvmap = new THREE.FloatNode(6);
    (material as any).color = new THREE.CheckerNode(new THREE.OperatorNode(new THREE.UVNode(), uvmap, THREE.OperatorNode.MUL) as any) // The color property of THREE.StandardNodeMaterial is undefined. The first parameter of CheckerNode does not accept THREE.OperatorNode.
    this.scene.add(new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 1), material).translateX(2))
    Main.load("res/Suzanne.gltf").then((m) => { this.scene.add(m.scene) })

    const gui = new dat.GUI()
    gui.add(uvmap, "value", 1, 8)
    // gui.add({ X: () => Main.exportScene(this.scene) }, "X").name("export glTF")

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    console.log(`THREE.REVISION:${THREE.REVISION}`)
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    new THREE.OrbitControls(this.camera, this.renderer.domElement)

    this.stats = new THREE.Stats()
    document.body.appendChild(this.stats.dom)

    window.addEventListener('resize', this.onWindowResize, false);
    this.animate()
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    for (const i of this.syncs)
      i()
    requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
    this.stats.update()
  }

  private static load = async (url: string) => {
    const dracoLoader = new THREE.DRACOLoader()
    dracoLoader.setDecoderPath('/node_modules/three/examples/js/libs/draco/');

    const loader = new THREE.GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.setDDSLoader(new THREE.DDSLoader());

    return new Promise<THREE.GLTF>((resolve, reject) => {
      loader.load(url, (gltf: THREE.GLTF) => { resolve(gltf) }, (e) => { }, (e) => { reject(e) })
    })
  }

  private static exportScene = (scene: THREE.Scene) => {
    const e = new THREE.GLTFExporter()
    e.parse(scene, (gltf: object) => {
      const blob = new Blob([gltf as any], { type: "text/plain" })
      const dlink = document.createElement("a")
      dlink.download = "scene.glb"
      dlink.href = window.URL.createObjectURL(blob)
      dlink.onclick = () => { }
      dlink.click()
    }, { binary: true })
  }
}

new Main()