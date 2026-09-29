// Regenerates src/lib/abi.ts from the Foundry artifact. Run after `forge build`.
import { readFileSync, writeFileSync } from 'node:fs'

const artifact = JSON.parse(readFileSync(new URL('../../contracts/out/BOTBlitz.sol/BOTBlitz.json', import.meta.url)))
writeFileSync(
  new URL('../src/lib/abi.ts', import.meta.url),
  '// Generated from contracts/out/BOTBlitz.sol/BOTBlitz.json - regenerate after contract changes.\n' +
    `export const blitzAbi = ${JSON.stringify(artifact.abi, null, 2)} as const\n`,
)
console.log('abi.ts updated')
