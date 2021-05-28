import * as THREE from "three"
import * as dat from "dat.GUI"

// based on https://github.com/mrdoob/three.js/blob/master/examples/webgl_loader_gltf.html

async function create(): Promise<void> {
  console.log(`THREE.REVISION:${THREE.REVISION}`)

  // レンダラー
  // r115のSSAOの浮動小数点深度バッファ対応向けにwebgl2専用とした。
  if (!THREE.WEBGL.isWebGL2Available())
    document.body.appendChild(THREE.WEBGL.getWebGL2ErrorMessage());
  const container: HTMLElement | null = document.getElementById('container');
  if (container === null)
    throw Error("Failure")
  const renderer = new THREE.WebGLRenderer();
  renderer.shadowMap.enabled = true;
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

  // ライト
  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(10, 10, -10)
  light.castShadow = true;
  /*
    normalBias
    シャドウアクネ対策。
    シェーディングポイントのワールド座標を光源方向にnormalBiasだけオフセットしてからシャドウマップ空間に写す。
    表裏のポリゴンの厚さが薄い場合やsideがTHREE.DoubleSide(両面)の場合にアクネが発生するのを抑える。
    深度をオフセットするbiasとは別のもの。
    https://github.com/mrdoob/three.js/pull/18915
  */
  light.shadow.normalBias = 0.1;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 30;
  scene.add(light)

  // ポストプロセッシング
  const parameters: THREE.WebGLRenderTargetOptions = {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    stencilBuffer: false,
    type: THREE.HalfFloatType // sRGB補正で8bitでは演算精度が足りないのでHalfFloat(指数ビット5,仮数部10,符号1)にしている。8bitではグラデーションでバンディングが発生する。
  };
  const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, parameters);
  const composer = new THREE.EffectComposer(renderer, renderTarget);
  const ssaoPass = new THREE.SSAOPass(scene, camera)
  ssaoPass.output = (THREE.SSAOPass.OUTPUT as any).Default // .d.tsの定義はどうするのが正しいのかよくわからない
  ssaoPass.kernelRadius = 0.2 // サンプリングする距離(m)
  ssaoPass.minDistance = 0.000034 // 遮蔽判定の最小値[near,far] を[0,1]に写した範囲の値。
  ssaoPass.normalRenderTarget.depthTexture.type = THREE.FloatType // r122でdepthTextureはbeautyRenderTargetからnormalRenderTargetに変更。normal用のマテリアルによっては結果が変化するかもしれない。
  ssaoPass.beautyRenderTarget.texture.type = THREE.HalfFloatType; // SSAO内部のレンダーターゲットもHalffloat化しないとバンディングが発生する。
  ssaoPass.beautyRenderTarget.texture.encoding = renderer.outputEncoding // rendererのoutputEncodingを反映する
  composer.addPass(ssaoPass)
  composer.addPass(colorManagementPass())

  return Promise.all([loadEnvMap(renderer), loadModel(renderer)]).then(function ([envMap, model]) {
    scene.background = envMap;
    scene.environment = envMap;

    // 読み込んだglTFモデルをそのまま表示
    const mesh = new THREE.Mesh(model.geometry, model.material)
    scene.add(mesh)

    // ノードで再構築
    const meshNode = nodeBased(model, envMap)
    scene.add(meshNode)
    meshNode.position.set(2.5, 0, 2.5)

    // ShaderMaterialで再構築
    const meshShader = shaderMaterialBased(model, scene.environment)
    scene.add(meshShader)
    meshShader.position.set(-2.5, 0, -2.5)

    // 地面
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2).translate(0, -1, 0), new THREE.MeshStandardMaterial()))

    for (const i of traverse(scene)) {
      if (isMesh(i))
        i.receiveShadow = i.castShadow = true;
    }

    const gui = new dat.GUI()
    gui.add(mesh, "visible", mesh.visible).name("gltf")
    gui.add(meshNode, "visible", meshNode.visible).name("Node")
    gui.add(meshShader, "visible", meshShader.visible).name("Shader")

    // UI
    const orbit = new THREE.OrbitControls(camera, renderer.domElement)
    window.addEventListener('keydown', wasdqeMove(camera, orbit), false)

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

    window.addEventListener('resize', onWindowResize, false);
    animate()
  })
}

// リニア空間 -> ACESFilmicトーンマッピング -> sRGB空間への変換
function colorManagementPass(): THREE.ShaderPass {
  return new THREE.ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`
    ,
    fragmentShader: `
		uniform sampler2D tDiffuse;
		varying vec2 vUv;
    #include <tonemapping_pars_fragment>
		void main() {
			vec4 tex = texture2D( tDiffuse, vUv );
			gl_FragColor = LinearTosRGB(vec4(ACESFilmicToneMapping(tex.rgb),1.0));
		}`
  })
}

// 環境マップと背景
async function loadEnvMap(renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
  return loadEXR("res/bg.exr").then(function (bg: THREE.DataTexture) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envMap = pmremGenerator.fromEquirectangular(bg).texture
    bg.dispose();
    pmremGenerator.dispose();
    return envMap;
  })
}

// モデルのロード
async function loadModel(renderer: THREE.WebGLRenderer): Promise<Model> {
  return loadGLTF("res/Cube.glb").then(function (gltf: THREE.GLTF) {
    return findModel(gltf.scene, "DST")
  })
}

// マテリアルをノードベースで再構成
function nodeBased(model: Model, envMap: THREE.Texture): THREE.Mesh<THREE.BufferGeometry, THREE.StandardNodeMaterial> {
  const matRef = model.material

  const matNodeBased = new THREE.StandardNodeMaterial()
  if (matRef.map)
    matNodeBased.color = new THREE.TextureNode(matRef.map)
  // NormalMapNodeでtangent spaceからworld spaceに変換。blenderのNormal Mapノードと同じ
  // glTFローダと同様にNormalScaleでyの符号を反転する。
  if (matRef.normalMap)
    matNodeBased.normal = new THREE.NormalMapNode(new THREE.TextureNode(matRef.normalMap), new THREE.Vector2Node(matRef.normalScale))
  if (matRef.metalnessMap)
    matNodeBased.metalness = new THREE.SwitchNode(new THREE.TextureNode(matRef.metalnessMap), "b") // metalness = blue
  if (matRef.roughnessMap)
    matNodeBased.roughness = new THREE.SwitchNode(new THREE.TextureNode(matRef.roughnessMap), "g") // roughness = red,  ao = red
  matNodeBased.environment = new THREE.TextureCubeNode(new THREE.TextureNode(envMap));
  return new THREE.Mesh(model.geometry, matNodeBased)
}

// ShaderMaterialでMeshStandardMaterial互換のマテリアルを再構成
function shaderMaterialBased(model: Model, envMap: THREE.Texture) {
  const matRef = model.material

  // MeshStandardMaterial用のUniformを作る。
  const uniforms = {
    // 必須のUniform
    ...THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms),
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights),
    // modelのマテリアルで上書き
    diffuse: { value: matRef.color },
    map: { value: matRef.map },
    normalMap: { value: matRef.normalMap },
    normalScale: { value: matRef.normalScale },
    roughnessMap: { value: matRef.roughnessMap },
    metalnessMap: { value: matRef.metalnessMap },
    envMap: { value: envMap },
    roughness: { value: matRef.roughness },
    metalness: { value: matRef.metalness },
  }

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    // ShaderMaterialに適切なプロパティを設定すると、USE_MAPなどの対応する定義が自動で設定される。
    defines: {},
    // MeshStandardMaterialの頂点/フラグメントシェーダを利用する。
    vertexShader: THREE.ShaderChunk.meshphysical_vert,
    fragmentShader: THREE.ShaderChunk.meshphysical_frag,
    lights: true, // ライトの利用。
    glslVersion: THREE.GLSL1
  });

  type DummyMaterial = { map: THREE.Texture | null; normalMap: THREE.Texture | null; normalMapType: THREE.NormalMapTypes; roughnessMap: THREE.Texture | null; metalnessMap: THREE.Texture | null; envMap: THREE.Texture | null; }
  function isDummyMaterial(v: THREE.ShaderMaterial | DummyMaterial): v is DummyMaterial { return true }
  if (!isDummyMaterial(material))
    throw Error("ASSERT")

  // definesにUSE_***を設定してシェーダ内の#ifdefの有効化をする
  // またsRGB->Linear補正にも利用される。
  material.map = matRef.map;
  material.normalMap = matRef.normalMap;
  material.normalMapType = THREE.TangentSpaceNormalMap
  material.roughnessMap = matRef.roughnessMap
  material.metalnessMap = matRef.metalnessMap
  material.envMap = envMap;
  return new THREE.Mesh(model.geometry, material)
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
  // loader.setDDSLoader(new THREE.DDSLoader()); // r126ではDDSはサポートされない。代わりにKTX v2 images with Basis Universal supercompressionの利用が推奨
  return loader.loadAsync(url).catch((e) => { throw `Not found. ${url}` });
}

type Model = { geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial }

function findModel(root: THREE.Object3D, name: string): Model {
  for (const child of traverse(root)) {
    if (child.name === name) {
      if (isMesh(child) && isMaterial(child.material) && isMeshStandardMaterial(child.material))
        return { geometry: child.geometry, material: child.material }
    }
  }
  throw Error(`Not found. Mesh:${name}`);
}

function wasdqeMove(camera: THREE.PerspectiveCamera, orbit: THREE.OrbitControls) {
  return function (ev: KeyboardEvent) {
    // wasd+qeキー移動(blender互換)
    const f = (kc: string) => { return ev.key == kc ? (ev.shiftKey ? 10 : ev.altKey ? 1 / 10 : 1) : 0 }
    const mv = new THREE.Vector3(f("d") - f("a"), f("e") - f("q"), f("s") - f("w"))
    if (mv.length() == 0)
      return
    camera.position.copy(mv).applyMatrix4(camera.matrixWorld)
    orbit.target.copy(mv).add(new THREE.Vector3(0, 0, - 1)).applyMatrix4(camera.matrixWorld)
    camera.updateProjectionMatrix()
    ev.preventDefault()
    ev.cancelBubble = true
  }
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
