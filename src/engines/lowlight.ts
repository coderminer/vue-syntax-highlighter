// lowlight is the HAST-based implementation behind the highlight.js adapter.
// This entry makes that adapter addressable under the implementation name too.
export {
  createHighlightjsEngine,
  createHighlightjsEngine as createLowlightEngine,
  supportedLanguages,
} from './highlightjs/index.js'
export type {
  HighlightjsEngine,
  HighlightjsEngine as LowlightEngine,
  HighlightjsEngineOptions,
  HighlightjsEngineOptions as LowlightEngineOptions,
  HighlightjsLanguageLoader,
  HighlightjsLanguageLoader as LowlightLanguageLoader,
  HighlightjsLanguageRegistration,
  HighlightjsLanguageRegistration as LowlightLanguageRegistration,
} from './highlightjs/index.js'
