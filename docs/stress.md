# 50,000-line Stress Demo

This block is virtualized with a 400 px viewport, 20 px lines, and 10 lines of overscan. At most 41 line elements should exist at once, regardless of document size.

<script setup>
import StressDemo from './components/StressDemo.vue'
</script>

<ClientOnly>
  <StressDemo />
</ClientOnly>

## Expected behavior

- The DOM contains a bounded window of `.vsh-line` elements, never 50,000.
- Scrolling updates `data-line` numbers without invoking the engine again.
- Highlighted-line markers and the gutter stay aligned.
- `copy()` / `getCopyPayload()` still return all 50,000 source lines.
- The server-rendered initial window is deterministic because it derives from the configured height.
