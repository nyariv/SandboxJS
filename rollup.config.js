import babel from '@rollup/plugin-babel';
import filesize from 'rollup-plugin-filesize';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from "rollup-plugin-terser";

const extensions = ['.js', '.ts']

export default {
  input: ['src/Sandbox.ts'],
  output: {
    dir: 'dist',
    name: 'SandboxJS',
    format: 'es',
    exports: 'named',
    sourcemap: true
  },
  plugins: [
    typescript(),
    resolve({ extensions }),
    babel({ extensions, babelHelpers: 'bundled' }),
    filesize(),
    terser()
  ]
}
