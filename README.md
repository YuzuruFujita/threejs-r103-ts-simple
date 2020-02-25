# threejs-ts-minimum

## 概要

three.js + TypeScript + webpack による最小プロジェクトのひな形。

## 詳細
HDR画像を背景と環境マップに設定。PMREMGeneratorを利用。
Metalness/Roughnessテクスチャが設定されたDRACO圧縮済みバイナリ版のglTFモデルをロードして表示。
地面はRoughnessをチェック柄で変化させ環境マップを割り当てるノードベースのマテリアルとした。
three/examples/jsm に配置されている型定義(.d.ts)を利用する。
OrbitControlなどthree.module.jsに含まれないものをTHREEの名前空間に含める。

## 補足
r113対応。
three.js公式の一般的な実装に寄せた。
コードをTypeScriptの書き方に合わせてみた。
