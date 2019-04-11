# threejs-r103-ts-simple

## 概要
@types/threeがdeprecatedとなって利用できなくなったのでthree.jsが提供する.d.tsを利用しビルドする最小限の環境を作成した。

## 詳細
このプロジェクトではThree.d.tsを利用するのでnode_modules/three/build/three.module.jsではなくnode_modules/three/src/Three.jsを参照する。
問題となるのが、node_modules/three/examples/jsm/controls/OrbitControlや, GLTFLoader, GLTFExporterではnode_modules/three/build/three.module.jsを参照しているので、three.module.jsとThree.jsを別モジュールとして複数インポートしてしまう。これを解消するためにtsconfigのpathsとwebpack.config.jsのresolve.aliasを設定し、参照先をnode_modules/three/src/Three.jsとするようにしている。
