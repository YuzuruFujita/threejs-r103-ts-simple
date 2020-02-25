import * as THREE from "three"
import * as dat from "dat.GUI"

// based on https://github.com/mrdoob/three.js/blob/master/examples/webgl_loader_gltf.html

type Main = {
  renderer: THREE.WebGLRenderer,
  stats: THREE.Stats
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  syncs: (() => void)[]
}

async function create(): Promise<Main> {
  const container: HTMLElement | null = document.getElementById('container');
  if (container === null)
    throw Error("Failure")

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.outputEncoding = THREE.sRGBEncoding;
  console.log(`THREE.REVISION:${THREE.REVISION}`)
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const stats = new THREE.Stats()
  document.body.appendChild(stats.dom)

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1 / 32, 2000);
  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)

  const scene = new THREE.Scene();

  let envMap: THREE.Texture
  {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const bg: THREE.DataTexture = await loadRGBE("./res/bg.hdr")
    envMap = pmremGenerator.fromEquirectangular(bg).texture;
    scene.background = envMap;
    scene.environment = envMap;
    bg.dispose();
    pmremGenerator.dispose();
  }

  // use of RoughnessMipmapper is optional
  const roughnessMipmapper = new THREE.RoughnessMipmapper(renderer);

  const gltf = await loadGLTF("res/Suzanne.glb")
  for (const child of traverse(gltf.scene)) {
    if (isMesh(child) && isMaterial(child.material) && isMeshStandardMaterial(child.material))
      roughnessMipmapper.generateMipmaps(child.material);
  }
  for (const i of gltf.scene.children)
    scene.add(i)

  roughnessMipmapper.dispose();

  {
    const nodeTexture = new THREE.TextureNode(envMap);
    const nodeTextureIntensity = new THREE.FloatNode(1);
    const material = new THREE.StandardNodeMaterial()
    const uvmap = new THREE.FloatNode(6);
    material.color = new THREE.ColorNode(0xaaaaaa)
    material.roughness = new THREE.CheckerNode(new THREE.OperatorNode(new THREE.UVNode(), uvmap, THREE.OperatorNode.MUL) as any)
    material.environment = new THREE.OperatorNode(new THREE.TextureCubeNode(nodeTexture), nodeTextureIntensity, THREE.OperatorNode.MUL);
    const geo = new THREE.PlaneBufferGeometry(10, 10).rotateX(-Math.PI / 2).translate(0, -1, 0)
    scene.add(new THREE.Mesh(geo, material))

    const gui = new dat.GUI()
    gui.add(uvmap, "value", 1, 32, 1)
  }

  const orbit = new THREE.OrbitControls(camera, renderer.domElement)

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  const syncs: (() => void)[] = []
  function animate() {
    for (const i of syncs)
      i()
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    stats.update()
  }

  //
  window.addEventListener('resize', onWindowResize, false);
  animate()

  return { renderer: renderer, syncs: syncs, camera: camera, scene: scene, stats: stats }
}

function* traverse(x: THREE.Object3D): Generator<THREE.Object3D> {
  yield x
  for (const i of x.children) {
    for (const j of traverse(i)) {
      yield j
    }
  }
}

function isMesh(x: THREE.Object3D): x is THREE.Mesh { return x instanceof THREE.Mesh }
function isMaterial(x: THREE.Material | THREE.Material[]): x is THREE.Material { return x instanceof THREE.Material }
function isMeshStandardMaterial(x: THREE.Material): x is THREE.MeshStandardMaterial { return x instanceof THREE.MeshStandardMaterial }

async function loadRGBE(fileName: string): Promise<THREE.DataTexture> {
  const loader = new THREE.RGBELoader()
  loader.setDataType(THREE.UnsignedByteType)
  return new Promise<THREE.DataTexture>((resolve, reject) => {
    loader.load(fileName, (tex: THREE.DataTexture) => { resolve(tex) }, () => { }, (e) => { reject(e) })
  })
}

async function loadGLTF(url: string): Promise<THREE.GLTF> {
  const dracoLoader = new THREE.DRACOLoader()
  dracoLoader.setDecoderPath('/node_modules/three/examples/js/libs/draco/');

  const loader = new THREE.GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.setDDSLoader(new THREE.DDSLoader());

  return new Promise<THREE.GLTF>((resolve, reject) => {
    loader.load(url, (gltf: THREE.GLTF) => { resolve(gltf) }, (e) => { }, (e) => { reject(e) })
  })
}

(async () => { await create() })()
