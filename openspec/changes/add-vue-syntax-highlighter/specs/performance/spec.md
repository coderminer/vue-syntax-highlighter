## Purpose

Defines the observable performance guarantees for highlighting and rendering, including caching, update scheduling, deferred work, and virtualization of long documents.

## ADDED Requirements

### Requirement: Bounded result caching

Highlight results SHALL be cached by the effective engine identity, engine options, source text, and language. Tokenization is theme-independent, so the active theme MUST NOT invalidate a cached result. The cache SHALL be bounded, SHALL default to at most 100 entries, SHALL use least-recently-used eviction, and SHALL be configurable per application or provider. A cache size of zero MUST disable caching. Cache hits MUST NOT invoke the engine.

#### Scenario: Repeated render is a cache hit

- **WHEN** the same source, language, theme, and options are rendered a second time
- **THEN** the engine is not invoked again
- **AND** the rendered output matches the first result

#### Scenario: Cache is bounded

- **WHEN** more entries than the configured capacity are highlighted
- **THEN** the least recently used entries are evicted
- **AND** retained entry count never exceeds the configured capacity

#### Scenario: Changing the theme reuses the cache

- **WHEN** only the theme changes for otherwise identical input
- **THEN** the cached token result is reused
- **AND** the engine is not invoked

#### Scenario: Changing the language misses the cache

- **WHEN** only the language changes for otherwise identical input
- **THEN** the request does not reuse the previous result
- **AND** the new result is cached under the new key

### Requirement: In-flight request deduplication

Concurrent requests with the same cache key SHALL share one engine invocation. Each waiting consumer MUST receive the same normalized result or the same failure, and a failed shared request MUST NOT remain cached as a successful result.

#### Scenario: Concurrent identical requests share work

- **WHEN** two code blocks request the same uncached input in the same tick
- **THEN** the engine is invoked once
- **AND** both blocks receive equivalent output

### Requirement: Memoized rendering

Re-rendering a code block because of an unrelated parent update MUST NOT invoke the engine or rebuild the token model when its effective highlighting inputs are unchanged. Rendered output SHALL remain identical across such updates.

#### Scenario: Parent update does not re-highlight

- **WHEN** a parent component re-renders while code, language, theme, and options are unchanged
- **THEN** the engine invocation count stays the same
- **AND** the code block's rendered tokens are unchanged

### Requirement: Stale result rejection and update coalescing

When highlighting inputs change while a request is pending, only the result for the latest inputs SHALL be applied. Results for superseded inputs MUST be discarded. Multiple input changes within the same update cycle SHALL be coalesced so the engine is invoked with only the latest values, and the previous rendered output SHALL remain visible until a replacement is ready.

#### Scenario: Rapid changes apply only the latest result

- **WHEN** code changes twice before the first highlight resolves
- **THEN** only the second result is applied
- **AND** the first result never appears

#### Scenario: Previous output remains during refresh

- **WHEN** a new highlight is pending for changed inputs
- **THEN** the previously highlighted output remains visible
- **AND** it is replaced atomically when the latest result arrives

### Requirement: Offscreen deferral

The component SHALL support opt-in deferral of highlighting until the code block approaches the viewport. Deferred blocks MUST render plain source text without invoking the engine, and SHALL begin highlighting when they enter a configurable viewport margin. Observation MUST stop after the block has been highlighted or unmounted. Deferral MUST be inert during server rendering.

#### Scenario: Offscreen block is not highlighted

- **WHEN** deferral is enabled and a block is far outside the viewport
- **THEN** plain source text is rendered
- **AND** the engine is not invoked

#### Scenario: Deferred block highlights on approach

- **WHEN** a deferred block enters the configured viewport margin
- **THEN** highlighting starts once
- **AND** the plain text is replaced by the highlighted output
- **AND** further scrolling does not trigger repeated requests

### Requirement: Virtualized rendering for long documents

The component SHALL support virtualization, either enabled explicitly or automatically above a configurable line threshold. Virtualization MUST require a bounded viewport height; if height is unavailable or wrapping is enabled, virtualization SHALL be disabled with a development warning. When active, only visible lines plus a configurable overscan MAY exist in the document, line numbers and highlighted-line markers MUST remain correct, and scrolling SHALL update the window without re-invoking the engine. Deferral and virtualization MUST be compatible.

#### Scenario: Long document keeps a small DOM

- **WHEN** a 50,000-line block is virtualized with 20 visible lines and an overscan of 10
- **THEN** at most 100 rendered line elements exist at any time
- **AND** scrolling reveals the correct line numbers and highlighted lines
- **AND** the engine is not invoked again for scrolling

#### Scenario: Incompatible configuration warns

- **WHEN** virtualization is requested together with wrapping or without a bounded height
- **THEN** virtualization is disabled
- **AND** a development warning explains the requirement
- **AND** the block renders normally without virtualization

#### Scenario: Automatic threshold applies

- **WHEN** automatic virtualization is configured and a block exceeds the line threshold with a bounded height
- **THEN** virtualization activates without explicit per-block configuration

### Requirement: Copying virtualized content

The component SHALL expose a way to obtain or copy the complete source text even when only a window of lines is rendered. The result MUST include all source lines and MUST NOT include line numbers or gutter content.

#### Scenario: Copy full source while virtualized

- **WHEN** an application requests the copy payload for a virtualized 50,000-line block
- **THEN** the payload contains all 50,000 lines
- **AND** it contains no line numbers or gutter text
