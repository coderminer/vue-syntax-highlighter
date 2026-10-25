# Live Demo

Change the engine, language, theme pair, scheme, line numbers, wrapping, and deferral. The copy action always copies the complete source without gutter numbers.

<script setup>
import LiveDemo from './components/LiveDemo.vue'
</script>

<ClientOnly>
  <LiveDemo />
</ClientOnly>

## What to look for

- Changing **Theme pair** or **Color scheme** updates appearance in one paint and does not invoke the engine.
- Changing **Engine** loads only that adapter. The core entry has no engine in its static graph.
- **Defer** waits for the block to approach the viewport; the visible demo starts once.
- **Wrap** toggles the `.vsh-wrap` class; it is incompatible with virtualization.
- **Copy source** uses `copy()`/`getCopyPayload()`, not the rendered DOM window.
