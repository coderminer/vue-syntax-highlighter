## Purpose

Defines the component-free highlighting entry point, its ownership model, and the guarantee that existing component, provider, and composable behavior does not change.

## ADDED Requirements

### Requirement: `createHighlighter` is the headless entry point

The package SHALL export `createHighlighter(options?)` returning an object with `highlight`, `preload`, and `dispose`. The returned `highlight` method SHALL accept the same `HighlightInput` as the component's exposed method, including `preserveTrailingNewline`, and SHALL return a promise that resolves to a validated `HighlightResult`.

#### Scenario: Highlight without a component

- **WHEN** a script calls `createHighlighter({ engine }).highlight({ code, language })`
- **THEN** it receives a validated result without mounting a Vue component

#### Scenario: Input normalization matches the component

- **WHEN** the input omits `language` or includes a terminal newline
- **THEN** language defaults to `text` and the documented newline behavior applies, matching the component and composable

### Requirement: Every instance owns its state

Each `createHighlighter()` call SHALL create an independent context, cache, and abort signal. Two instances MUST NOT share cached results unless the caller explicitly passes the same `cache` object. No instance may fall back to the module-level default context used by component-free `useSyntaxHighlighter` calls.

#### Scenario: Two instances do not share results

- **WHEN** two instances highlight the same source with the same engine object
- **THEN** the engine runs once per instance because each has its own cache

#### Scenario: SSR requests stay isolated

- **WHEN** a server creates one instance per request
- **THEN** cached results and abort signals from one request are not visible to another

### Requirement: Engine options and language preloading are supported

`createHighlighter` SHALL accept `engineOptions` and pass it to the engine and the cache key, matching the component. `preload()` SHALL load every language supplied through the existing `languages` option and SHALL resolve without throwing when no languages are configured.

#### Scenario: Per-call engine options reach the engine

- **WHEN** an instance is created with `engineOptions` and highlights a source
- **THEN** the engine receives those options and the cache key includes them

#### Scenario: Preload loads configured languages

- **WHEN** an instance is created with `languages: ['typescript']` and `preload()` is awaited
- **THEN** the selected engine has loaded `typescript`

### Requirement: Disposal is deterministic and idempotent

`dispose()` SHALL reject pending `highlight()` and `preload()` calls with the existing disposed-scope error, abort the instance signal, clear the instance-owned cache, and dispose loader-created engines. Engine work stops only when the engine honors the aborted signal; the caller's promises settle as soon as disposal occurs. Calling `dispose()` more than once MUST be safe. Calling `highlight()` or `preload()` after disposal SHALL reject with the same disposed-scope error.

#### Scenario: Dispose settles pending work

- **WHEN** a highlight or preload is pending and the instance is disposed
- **THEN** the pending call rejects with the disposed-scope error and the abort signal is aborted

#### Scenario: Engine ignores the signal

- **WHEN** an engine does not observe the abort signal and disposal occurs
- **THEN** the caller still receives the disposed-scope rejection instead of waiting for the engine

#### Scenario: Preload after disposal rejects

- **WHEN** `preload()` is called after `dispose()`
- **THEN** it rejects with the disposed-scope error instead of resolving silently

#### Scenario: Second dispose is a no-op

- **WHEN** `dispose()` is called twice
- **THEN** no error is thrown

### Requirement: Existing surfaces are unchanged

The new entry point SHALL NOT change the component, provider, plugin, composable, existing exports, defaults, rendered markup, or cache-key format. `HighlightController` SHALL remain internal.

#### Scenario: Existing consumers upgrade without changes

- **WHEN** an existing consumer does not import `createHighlighter`
- **THEN** component rendering, composable behavior, and cache keys remain identical
