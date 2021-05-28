# threejs-ts-minimum

## 概要
three.js + TypeScript + webpack5 による最小プロジェクトのひな形。

## 内容
OrbitControlなどthree.module.jsに含まれないものをTHREEの名前空間に含める。
HDR画像を背景と環境マップに設定。
glTFモデルのマテリアルを再構成して表示。
平行光源とシャドウマップ。
SSAO対応。レンダーターゲットをHalfFloat化。
wasdでのカメラ移動。
カメラ位置のコピー＆ペースト。
例外発生時のメッセージ表示。

## 補足
r126,r127,r128,r129対応。
@types/threeへの対応。three.js本体から切り離されてDefinitelyTypedに移行している。

## 今後の予定
・Deferred Shading
    標準マテリアルが利用できないので別プロジェクトで対応。
・DOF2
・FXAA
・MotionBlur
・Uniform Buffer Object
