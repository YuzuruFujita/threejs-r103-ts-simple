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
RawShaderMaterialによるMeshStandardMaterial互換の実装。(MRT+Deferred Shading向けの準備)

## 補足
r126,r127,r128,r129,r130対応。
@types/threeへの対応。three.js本体から切り離されてDefinitelyTypedに移行している。
r130辺りで遅くなった模様。

## 今後の予定
・Deferred Shading
    実装
        最初のパスでG-BufferにBaseColor/Normal/Roughness/Metalness + Depthを一括で書く。MeshStandardMateiralのシェーダコードを流用。
        AOをDepthとNormalから生成する。
        Shadow Mapは既存の実装で生成する。
        2つ目のパスでシェーディングする。MeshStandardMateiralのシェーダコードを流用。
        ポストプロセスでFXAA -> DOF -> ToneMapping -> LinearTosRGBの順で行う。

    課題
        半透過はフォワードで描画するがOpaque/Transparentだけを描画する機能が本家にないので対応できない。
        シェーディング/ポストプロセス向けのレンダーターゲットがRGB888ではリニア->sRGB変換で精度がでないので輝度が低い部分でバンディングが発生する。-> Half Float化で回避。

・DOF2
・FXAA
    なぜかうまく動作しない
・MotionBlur
・Uniform Buffer Object
    本家は放置気味。
    オブジェクトが多くなるとUniformの設定のオーバヘッドが大きくなる問題が多少解消すると思われる。
    