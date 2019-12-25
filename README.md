# threejs-ts-minimum

## 概要

three.js + TypeScript + webpack による最小プロジェクトのひな形。

## 詳細

three/examples/jsm に配置されている型定義(.d.ts)を利用する。
OrbitControlなどthree.module.jsに含まれないものをTHREEの名前空間に所属させる。

## 補足

r112対応
r103,r104,r105はDRACOLoader/DDSLoaderのjsmが存在しないのでエラーとなる。
r106はnodesのjsmが存在しないのでエラーとなる。
r107はDRACOLoaderがstaticメンバではなくなったのでエラーとなる。
r108,r109,r110,r111はStandardNodeMaterialのTypeScript用の型定義が不足している。

