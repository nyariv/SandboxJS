import filesize from 'rollup-plugin-filesize';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from "rollup-plugin-terser";

const extensions = ['.js', '.ts']

export default {
  input: ['src/Sandbox.ts'],
  output: [
    { file: "dist/Sandbox.node.js", exports: 'named', format: "cjs" },
    { file: "dist/Sandbox.min.js", sourcemap: true, exports: 'named', format: "esm", plugins: [
      terser({keep_fnames: /SandboxFunction/}),
      filesize()
    ]},
  ],
  plugins: [
    typescript(),
    resolve({ extensions })
  ]
}
