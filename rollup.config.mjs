import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from "@rollup/plugin-terser";
import { bundleStats } from 'rollup-plugin-bundle-stats';

const extensions = ['.js', '.ts']

export default [
    { 
      input: ['src/Sandbox.ts', 'src/SandboxExec.ts', 'src/utils.ts', 'src/parser.ts', 'src/executor.ts'],
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
      input: ['src/Sandbox.ts', 'src/SandboxExec.ts', 'src/utils.ts', 'src/parser.ts', 'src/executor.ts'],
      output: [{dir: "dist", sourcemap: true, exports: 'named', format: "esm"}], 
      plugins: [
        typescript({
          "declaration": true,
          "declarationDir": "./dist"
        }),
        resolve({ extensions })
      ]
    },
    { 
      input: 'src/Sandbox.ts',
      output: [{file: "dist/Sandbox.min.js", sourcemap: true, exports: 'named', format: "esm"}], 
      plugins: [
        typescript({
          "declaration": true,
          "declarationDir": "./dist"
        }),
        resolve({ extensions }),
        terser({
          keep_fnames: /SandboxFunction/,
          maxWorkers: 4
        }),
        bundleStats({
          title: 'Sandbox',
          html: false,
        })
      ]
    },
    { 
      input: 'src/SandboxExec.ts',
      output: [{file: "dist/SandboxExec.min.js", sourcemap: true, exports: 'named', format: "esm"}], 
      plugins: [
        typescript({
          "declaration": true,
          "declarationDir": "./dist"
        }),
        resolve({ extensions }),
        terser({
          keep_fnames: /SandboxFunction/,
          maxWorkers: 4
        }),
        bundleStats({
          title: 'SandboxExec',
          html: false,
        })
      ]
    },
  ]
