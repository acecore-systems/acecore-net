import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'

// Pages Functions bundles attribute-free JSON imports; mirror that behavior in Node tests.
registerHooks({
  load(url, context, nextLoad) {
    if (!url.startsWith('file:') || !url.endsWith('.json')) {
      return nextLoad(url, context)
    }

    const value = JSON.parse(readFileSync(new URL(url), 'utf8'))

    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(value)}\n`,
    }
  },
})
