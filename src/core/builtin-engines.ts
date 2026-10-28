import type { HighlightEngine } from '../types.js'
import {
  createMissingEngineError,
  setBuiltinEngineLoader,
  type BuiltinEngineId,
} from './engine.js'

async function loadBuiltinEngine(id: BuiltinEngineId): Promise<HighlightEngine> {
  try {
    switch (id) {
      case 'shiki': {
        const module = await import('../engines/shiki.js')
        return await module.createShikiEngine()
      }
      case 'highlightjs': {
        const module = await import('../engines/highlightjs.js')
        return await module.createHighlightjsEngine()
      }
      case 'lowlight': {
        const module = await import('../engines/lowlight.js')
        return await module.createLowlightEngine()
      }
      case 'prism': {
        const module = await import('../engines/prism.js')
        return await module.createPrismEngine()
      }
    }
  } catch (error) {
    throw createMissingEngineError(id, error)
  }
}

// Importing and calling this function is the only thing that enables the
// built-in adapters. The core entry intentionally omits it so bundlers do not
// resolve optional peers.
export function installBuiltinEngines(): void {
  setBuiltinEngineLoader(loadBuiltinEngine)
}
