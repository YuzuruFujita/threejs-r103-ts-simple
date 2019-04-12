import * as THREE from "three"
import "imports-loader?THREE=three!./node_modules/three/examples/js/controls/OrbitControls.js"
import "imports-loader?THREE=three!./node_modules/three/examples/js/loaders/DDSLoader.js";
import "imports-loader?THREE=three!./node_modules/three/examples/js/loaders/GLTFLoader.js";
import "imports-loader?THREE=three!./node_modules/three/examples/js/exporters/GLTFExporter.js"
import * as dat from "dat.GUI"

class Main {
  private camera: THREE.PerspectiveCamera
  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private syncs: (() => void)[] = []

  constructor() {
    const container: HTMLElement | null = document.getElementById('container');
    if (container === null)
      throw Error("Failure")

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1 / 32, 2000);
    this.camera.position.set(5, 5, 5)
    this.camera.lookAt(0, 0, 0)

    this.scene = new THREE.Scene();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dir = new THREE.DirectionalLight(0xffffff, 1)
    this.scene.add(dir)
    dir.position.set(1, 2, 3)

    this.scene.add(new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xff0000 })).translateX(2))
    Main.load("res/Suzanne.gltf").then((m) => { this.scene.add(m.scene) })

    const gui = new dat.GUI()
    gui.add({ X: () => Main.exportScene(this.scene) }, "X").name("export glTF")

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    new THREE.OrbitControls(this.camera, this.renderer.domElement)

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
  }

  private static load = async (url: string) => {
    return new Promise<THREE.GLTF>((resolve, reject) => {
      const loader = new THREE.GLTFLoader
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