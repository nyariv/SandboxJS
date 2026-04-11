import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rmSync, writeFileSync } from 'node:fs'
import { build } from 'vite'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

rmSync(resolve(root, 'dist'), { recursive: true, force: true })

const entries = {
  Sandbox: resolve(root, 'src/Sandbox.ts'),
  SandboxExec: resolve(root, 'src/SandboxExec.ts'),
}

const minifyOptions = {
  minify: 'terser',
  terserOptions: {
    keep_fnames: /^Sandbox(Symbol|(Async)?(Generator)?(Function|Global)?)$/,
  },
}

function writeModuleTypeManifest(outDir, type) {
  writeFileSync(resolve(root, outDir, 'package.json'), `${JSON.stringify({ type }, null, 2)}\n`)
}

// 1. CJS build → dist/node/
await build({
  root,
  build: {
    outDir: 'dist/cjs',
    minify: false,
    lib: {
      entry: entries,
      formats: ['cjs'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        entryFileNames: '[name].js',
        exports: 'named',
      },
    },
  },
  plugins: [
    dts({
      outDir: 'dist/cjs',
      include: ['src'],
      tsconfigPath: resolve(root, 'tsconfig.json'),
    }),
  ],
})

writeModuleTypeManifest('dist/cjs', 'commonjs')

// 2. UMD build → dist/Sandbox.umd.js
await build({
  root,
  build: {
    outDir: 'dist/umd',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(root, 'src/Sandbox.ts'),
      name: 'Sandbox',
      formats: ['umd'],
      fileName: () => 'Sandbox.min.js',
    },
    rollupOptions: {
      output: { exports: 'named' },
    },
    ...minifyOptions,
  },
})

// 3. UMD build → dist/SandboxExec.umd.js
await build({
  root,
  build: {
    outDir: 'dist/umd',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(root, 'src/SandboxExec.ts'),
      name: 'SandboxExec',
      formats: ['umd'],
      fileName: () => 'SandboxExec.min.js',
    },
    rollupOptions: {
      output: { exports: 'named' },
    },
    ...minifyOptions,
  },
})

// 4. ESM build → dist/esm/
await build({
  root,
  build: {
    outDir: 'dist/esm',
    minify: false,
    sourcemap: true,
    lib: {
      entry: entries,
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        entryFileNames: '[name].js',
        exports: 'named',
      },
    },
  },
  plugins: [
    dts({
      outDir: 'dist/esm',
      include: ['src'],
      tsconfigPath: resolve(root, 'tsconfig.json'),
    }),
  ],
})

writeModuleTypeManifest('dist/esm', 'module')
