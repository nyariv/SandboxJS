import filesize from 'rollup-plugin-filesize';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from "@rollup/plugin-terser";

const extensions = ['.js', '.ts']

export default [
    { 
      input: ['src/Sandbox.ts'],
      output: [{dir: "dist/node", exports: 'named', format: "cjs"}],
      plugins: [
        typescript({
          "declaration": true,
          "declarationDir": "./dist/node"
        }),
        resolve({ extensions })
      ]
    },
    { 
      input: ['src/Sandbox.ts'],
      output: [{dir: "dist", sourcemap: true, exports: 'named', format: "esm"}], 
      plugins: [
        typescript({
          "declaration": true,
          "declarationDir": "./dist"
        }),
        resolve({ extensions }),
        terser({keep_fnames: /SandboxFunction/}),
        filesize()
      ]
    },
  ]
