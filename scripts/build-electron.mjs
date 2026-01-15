import { build, context } from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import path from 'node:path'
import 'dotenv/config'

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
    external: ['keytar', 'better-sqlite3'],
    outExtension: { '.js': '.cjs' },
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(
        process.env.SUPABASE_URL || ''
      ),
      'process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY': JSON.stringify(
        process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''
      ),
    },
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
