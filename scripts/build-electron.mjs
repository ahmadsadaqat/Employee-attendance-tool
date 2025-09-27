import { build, context } from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import path from 'node:path'

const watch = process.argv.includes('--watch')

async function run() {
  const options = {
    entryPoints: [
      path.resolve('src/main/main.ts'),
      path.resolve('src/main/preload.ts'),
    ],
    platform: 'node',
    target: 'node18',
    outdir: 'dist-electron',
    format: 'cjs',
    bundle: true,
    sourcemap: true,
    plugins: [nodeExternalsPlugin()],
    external: ['keytar'],
    outExtension: { '.js': '.cjs' },
  }
  if (watch) {
    const ctx = await context(options)
    await ctx.watch()
  } else {
    await build(options)
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
