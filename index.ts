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
  // レンダラー
  // r115のSSAOの浮動小数点深度バッファ対応向けにwebgl2専用とした。
  if (!THREE.WEBGL.isWebGL2Available())
    document.body.appendChild(THREE.WEBGL.getWebGL2ErrorMessage());
  const container: HTMLElement | null = document.getElementById('container');
  if (container === null)
    throw Error("Failure")
  const renderer = new THREE.WebGLRenderer(); // r118ではWebGL2がデフォルト
  // レンダリング時はリニアのままレンダーターゲットに出力する。
  // renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // renderer.toneMappingExposure = 0.8;
  // renderer.outputEncoding = THREE.sRGBEncoding;
  console.log(`THREE.REVISION:${THREE.REVISION}`)
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // ステータス表示
  const stats = new THREE.Stats()
  document.body.appendChild(stats.dom)

  // カメラ
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1 / 32, 2000);
  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)

  // シーン
  const scene = new THREE.Scene();

  // ポストプロセッシング
  const parameters: THREE.WebGLRenderTargetOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    stencilBuffer: false,
    type: THREE.HalfFloatType // sRGB補正で8bitでは演算精度が足りないのでHalfFloat(指数ビット5,仮数部10,符号1)にしている。8bitではグラデーションでバンディングが発生する。
  };
  const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, parameters);
  const composer = new THREE.EffectComposer(renderer, renderTarget);
  const ssaoPass = new THREE.SSAOPass(scene, camera)
  ssaoPass.output = THREE.SSAOPass.OUTPUT.Default
  ssaoPass.kernelRadius = 0.2 // サンプリングする距離(m)
  ssaoPass.minDistance = 0.000034 // 遮蔽判定の最小値[near,far] を[0,1]に写した範囲の値。
  ssaoPass.beautyRenderTarget.depthTexture.type = THREE.FloatType // r115で対応予定。なぜか対応されずにCloseされた。https://github.com/mrdoob/three.js/pull/18672
  ssaoPass.beautyRenderTarget.texture.encoding = renderer.outputEncoding // rendererのoutputEncodingを反映する
  composer.addPass(ssaoPass)
  composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader)) // リニア空間からsRGB空間への変換はポストエフェクトの最後に一括で行う。GammaCorrectionとなっているが実装はsRGBへの変換となっている。

  // 環境マップと背景
  let envMap: THREE.Texture
  {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const bg: THREE.DataTexture = await loadEXR("./res/bg.exr")
    envMap = pmremGenerator.fromEquirectangular(bg).texture;
    scene.background = envMap;
    scene.environment = envMap;
    bg.dispose();
    pmremGenerator.dispose();
  }

  // glTFのモデル表示
  // use of RoughnessMipmapper is optional
  const roughnessMipmapper = new THREE.RoughnessMipmapper(renderer);
  const gltf = await loadGLTF("res/Cube.glb")
  const model = findModel(gltf.scene, "DST")
  roughnessMipmapper.generateMipmaps(model.material);
  const matRef: THREE.MeshStandardMaterial = model.material

  // 読み込んだglTFモデルをそのまま表示
  const meshGLTF = new THREE.Mesh(model.geometry, model.material)
  scene.add(meshGLTF)

  // glTFモデルのマテリアルを再構成して表示
  const matStd = new THREE.MeshStandardMaterial();
  matStd.map = model.material.map
  matStd.normalMap = model.material.normalMap
  matStd.normalScale.set(1, -1); // これ大事
  matStd.metalness = 1
  matStd.roughness = 1
  matStd.metalnessMap = model.material.metalnessMap;
  matStd.roughnessMap = model.material.roughnessMap;
  matStd.side = THREE.FrontSide // backface culling
  const meshStd = new THREE.Mesh(model.geometry, matStd)
  meshStd.position.set(-2, 0, 0)
  scene.add(meshStd)

  // glTFモデルのマテリアルをノードベースで再構成して表示
  const matNodeBased = new THREE.StandardNodeMaterial()
  if (matRef.map)
    matNodeBased.color = new THREE.TextureNode(matRef.map)
  // NormalMapNodeで tangent space から world space に変換。blenderのNormal Mapノードと同じ
  // glTFローダと同様にNormalScaleでyの符号を反転する。
  if (matRef.normalMap)
    matNodeBased.normal = new THREE.NormalMapNode(new THREE.TextureNode(matRef.normalMap), new THREE.Vector2Node(1, -1))
  if (matRef.metalnessMap)
    matNodeBased.metalness = new THREE.SwitchNode(new THREE.TextureNode(matRef.metalnessMap), "b") // metalness = blue
  if (matRef.roughnessMap)
    matNodeBased.roughness = new THREE.SwitchNode(new THREE.TextureNode(matRef.roughnessMap), "g") // roughness = red,  ao = red
  if (scene.environment)
    matNodeBased.environment = new THREE.TextureCubeNode(new THREE.TextureNode(scene.environment));
  const meshNodeBased = new THREE.Mesh(model.geometry, matNodeBased)
  meshNodeBased.position.set(2, 0, 0)
  scene.add(meshNodeBased)

  // Shaderマテリアルで再構成して表示
  const matShader = createStandardShaderMaterial(model.material, scene.environment)
  const meshShader = new THREE.Mesh(model.geometry, matShader)
  meshShader.position.set(-4, 0, 0)
  scene.add(meshShader)

  roughnessMipmapper.dispose();

  const gui = new dat.GUI()
  gui.add(meshStd.position, "x", -4, 4, 1 / 2).name("std-x")
  gui.add(meshNodeBased.position, "x", -4, 4, 1 / 2).name("node-x")
  gui.add(meshShader.position, "x", -4, 4, 1 / 2).name("shader-x")
  gui.add(meshGLTF, "visible", meshStd.visible).name("gltf")
  gui.add(meshStd, "visible", meshStd.visible).name("std")
  gui.add(meshNodeBased, "visible", meshNodeBased.visible).name("node")
  gui.add(meshShader, "visible", meshShader.visible).name("shader")

  function f() { console.log(matStd) }
  gui.add({ X: f }, "X").name("matStd")

  // UI
  const orbit = new THREE.OrbitControls(camera, renderer.domElement)
  function onKeyDown(ev: KeyboardEvent) {
    // wasd+qeキー移動
    const f = (kc: number) => { return ev.keyCode == kc ? (ev.shiftKey ? 10 : ev.altKey ? 1 / 10 : 1) : 0 }
    const mv = new THREE.Vector3(f(68) - f(65), f(69) - f(81), f(83) - f(87))
    camera.position.copy(mv).applyMatrix4(camera.matrixWorld)
    orbit.target.copy(mv).add(new THREE.Vector3(0, 0, - 1)).applyMatrix4(camera.matrixWorld)
    camera.updateProjectionMatrix()
  }
  window.addEventListener('keydown', onKeyDown, false)

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  createCameraUI(camera, orbit)

  const syncs: (() => void)[] = []
  function animate() {
    for (const i of syncs)
      i()
    composer.render();
    stats.update()
    requestAnimationFrame(animate);
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
function isBufferGeometry(x: THREE.Geometry | THREE.BufferGeometry): x is THREE.BufferGeometry { return x instanceof THREE.BufferGeometry }

async function loadEXR(url: string): Promise<THREE.DataTexture> {
  const loader = new THREE.EXRLoader()
  loader.setDataType(THREE.UnsignedByteType)
  return loader.loadAsync(url).catch((e) => { throw `Not found. ${url}` });  // r116で対応された非同期読み込み。エラーを置き換えて再スロー。
}

async function loadGLTF(url: string): Promise<THREE.GLTF> {
  const dracoLoader = new THREE.DRACOLoader()
  dracoLoader.setDecoderPath('/node_modules/three/examples/js/libs/draco/');

  const loader = new THREE.GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.setDDSLoader(new THREE.DDSLoader());
  return loader.loadAsync(url).catch((e) => { throw `Not found. ${url}` });
}

function findModel(root: THREE.Object3D, name: string): { geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial } {
  for (const child of traverse(root)) {
    if (child.name === name) {
      if (isMesh(child) && isMaterial(child.material) && isMeshStandardMaterial(child.material) && isBufferGeometry(child.geometry))
        return { geometry: child.geometry, material: child.material }
    }
  }
  throw Error(`Not found. Mesh:${name}`);
}

// ShaderMaterialでMeshStandardMaterial互換のマテリアルを生成する。
// Shaderの一部置き換えればノードベースのようにカスタマイズできる。
function createStandardShaderMaterial(matSrc: THREE.MeshStandardMaterial, envMap: THREE.Texture | null) {
  // MeshStandardMaterial用のUniformを作る。
  const defaultUniforms = THREE.UniformsUtils.clone({ ...THREE.ShaderLib.standard.uniforms, ...THREE.UniformsLib.lights })
  const customUniforms = {
    diffuse: { value: matSrc.color }, // UniformsLib.common.diffuseは0xeeeeeeとなるので、matSrc.color=0xffffffを設定しないと暗くなる。
    map: { value: matSrc.map },
    normalMap: { value: matSrc.normalMap },
    normalScale: { value: new THREE.Vector2(1, -1) },
    roughnessMap: { value: matSrc.roughnessMap },
    metalnessMap: { value: matSrc.metalnessMap },
    envMap: { value: envMap },
    roughness: { value: 1.0 },
    metalness: { value: 1.0 },
  }

  const material = new THREE.ShaderMaterial({
    uniforms: { ...defaultUniforms, ...customUniforms },
    // ShaderMaterialに適切なプロパティを設定すると、USE_MAPなどの対応する定義が自動で設定される。
    defines: {},
    // MeshStandardMaterialの頂点/フラグメントシェーダを利用する。
    vertexShader: THREE.ShaderChunk.meshphysical_vert,
    fragmentShader: THREE.ShaderChunk.meshphysical_frag,
    lights: true // ライトの利用
  });

  type DummyMaterial = { map: THREE.Texture | null; normalMap: THREE.Texture | null; normalMapType: THREE.NormalMapTypes; roughnessMap: THREE.Texture | null; metalnessMap: THREE.Texture | null; envMap: THREE.Texture | null; }
  function isDummyMaterial(v: THREE.ShaderMaterial | DummyMaterial): v is DummyMaterial { return true }
  if (isDummyMaterial(material)) {
    // uniform用ではなくdefinesにUSE_***系を設定する為のもの。またsRGB->Linear補正にも利用される。
    material.map = matSrc.map;
    material.normalMap = matSrc.normalMap;
    material.normalMapType = THREE.TangentSpaceNormalMap
    material.roughnessMap = matSrc.roughnessMap
    material.metalnessMap = matSrc.metalnessMap
    material.envMap = envMap;
  }
  return material;
}

async function createCameraUI(camera: THREE.PerspectiveCamera, orbit: THREE.OrbitControls): Promise<void> {
  function applyJSON(xx: { object: { matrix: number[] } }) {
    const m4x4 = new THREE.Matrix4().fromArray(xx.object.matrix).decompose(camera.position, camera.quaternion, camera.scale)
    camera.updateProjectionMatrix()
    const e = m4x4.elements
    orbit.target.set(e[8], e[9], e[10]).multiplyScalar(-10).add(new THREE.Vector3(e[12], e[13], e[14]))
  }
  const gui = new dat.GUI()
  const folder = gui.addFolder("Camera Pos")
  folder.open()
  function exportJSON() { navigator.clipboard.writeText(JSON.stringify(camera)).then(() => { console.log("OK") }) }
  folder.add({ X: exportJSON }, "X").name("Copy")
  function importJSON() { navigator.clipboard.readText().then((x: string) => { applyJSON(JSON.parse(x)) }).catch((e) => { console.log("NO JSON object.") }) }
  folder.add({ X: importJSON }, "X").name("Paste")
}

create().catch((e) => {
  for (const i of [...document.body.childNodes])
    document.body.removeChild(i)
  const element = document.createElement('div');
  element.innerHTML = e;
  document.body.appendChild(element);
  console.error(e)
})
