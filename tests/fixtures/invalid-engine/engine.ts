import type { HighlightEngine } from 'vue-syntax-highlighter'

// Missing the required `highlight` member on purpose. This file is excluded
// from normal type checking and compiled by scripts/check-package.mjs to prove
// invalid adapters are rejected.
export const invalidEngine: HighlightEngine = {
  id: 'invalid',
}
