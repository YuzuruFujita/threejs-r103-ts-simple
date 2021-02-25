# threejs-ts-minimum

## 概要

three.js + TypeScript + webpack による最小プロジェクトのひな形。

## 詳細
HDR画像を背景と環境マップに設定。PMREMGeneratorを利用。
glTFモデルをロードして表示。
THREE.MeshStandardMaterial/StandardNodeMaterial/ShaderMaterialでマテリアルを再構築してモデルを表示。
PostProcessingのSSAOを利用。深度バッファの精度を得るためにwebgl2化＋FloatType対応した。
OrbitControlなどthree.module.jsに含まれないものをTHREEの名前空間に含める。

## 補足
r126対応。
@types/threeへの対応。three.js本体から切り離されてDefinitelyTypedに移行している。
glTFローダはDDS非対応になった。
webpack5は放置。