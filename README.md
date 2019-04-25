# threejs-r104-ts-simple

## 概要

@types/threeがdeprecatedとなって利用できなくなったのでthree.jsが提供する.d.tsを利用しビルドする最小限の環境を作成した。

## 詳細

このプロジェクトでは @types/three の型定義ファイルの変わりに、node_modules/three/src/Three.d.tsを利用する。
また、OrbitControls/GLTFLoader/GLTFExporter もnode_modules/three/examples/jsm/に存在する.d.tsを利用する。
tsconfig.jsonのpathsでthreeモジュールとThree.d.tsとjsm内の.d.tsとの関連付けをする。
namespace を全てTHREEとする為にThree.d.tsとjsm内の.d.tsをthree.combined.tsに纏めている。

## 補足

r103,r104に対応。
