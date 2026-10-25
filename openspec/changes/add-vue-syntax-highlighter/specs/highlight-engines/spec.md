## Purpose

Defines how highlighting engines are selected, configured, loaded, and normalized so that the component behaves consistently across built-in and custom adapters.

## ADDED Requirements

### Requirement: Engine adapter contract

The library SHALL define a public engine adapter contract with a stable identifier, declared capabilities, an optional language loader, an optional disposer, and a highlight operation that returns either a result or a promise. A result MUST contain ordered lines of tokens whose text reproduces the source exactly, and every token MUST carry a semantic token type from a documented set. Engines MUST NOT return colors or markup; visual styling is applied from the active theme. Engines MUST NOT be required to access a DOM.

#### Scenario: A custom adapter is accepted

- **WHEN** an application supplies an adapter that returns two lines of tokens
- **THEN** the component renders those lines with the supplied text and styles
- **AND** no built-in engine is loaded

#### Scenario: Invalid adapter output is rejected safely

- **WHEN** an adapter returns a value that is not a valid token result
- **THEN** the component falls back to plain source text
- **AND** it reports an error instead of rendering partial or unsafe output

### Requirement: Engine selection and precedence

The effective engine SHALL be resolved in this order: explicit component configuration, then provider or plugin configuration, then the built-in default identified as Shiki. Built-in engines SHALL be addressable by stable string identifiers and loaded only when selected. An unknown engine identifier MUST produce an actionable error and a plain-text fallback, not a crash or an unbounded load attempt.

#### Scenario: Component configuration wins

- **WHEN** a provider configures one engine and a component configures another
- **THEN** the component's engine is used
- **AND** the provider default still applies to sibling components

#### Scenario: Unknown engine identifier

- **WHEN** an unknown engine identifier is selected
- **THEN** the source renders as plain text
- **AND** an error identifies the unknown identifier
- **AND** the page continues to render

### Requirement: Built-in adapters

The library SHALL provide separate adapters for Shiki, for highlight.js through lowlight, and for Prism through refractor. Each adapter MUST be importable without importing the other adapters, and the core entry point MUST NOT require any adapter to be installed. For a language supported by more than one adapter, every adapter SHALL produce the same line count and identical concatenated token text for each line for the same source.

#### Scenario: Adapters agree on text

- **WHEN** the same source and language are highlighted by two built-in adapters
- **THEN** both results contain identical line counts
- **AND** the concatenated text of each corresponding line is identical
- **AND** only token segmentation or semantic types may differ

#### Scenario: Core works without adapters

- **WHEN** an application imports only the core entry point and supplies a custom adapter
- **THEN** no built-in engine or grammar is loaded

### Requirement: Lazy language loading

Engines SHALL load languages on demand, SHALL accept a preload list, and SHALL deduplicate concurrent requests for the same resource. Applications MUST be able to register additional languages before or during use. When a requested language cannot be loaded, the component MUST present a single actionable error and plain-text fallback, and MUST retry when the language or engine configuration changes.

#### Scenario: Only requested resources are loaded

- **WHEN** code is rendered in one language for the first time
- **THEN** only that language is requested from the engine
- **AND** a provider-level preload list is requested in advance

#### Scenario: Concurrent requests are deduplicated

- **WHEN** two components request the same uncached language at the same time
- **THEN** the engine receives one load request
- **AND** both components proceed when it resolves

#### Scenario: Missing language degrades gracefully

- **WHEN** a requested language is unavailable and cannot be loaded
- **THEN** plain source text is rendered
- **AND** the error identifies the language
- **AND** no further load attempts occur until the language or engine changes

### Requirement: Synchronous and asynchronous execution

The component SHALL support engines that highlight synchronously and engines that return promises. A synchronous result MUST be reflected in the initial render, including server rendering. An asynchronous result MUST update the component when it settles without changing the component's public API.

#### Scenario: Synchronous engine renders immediately

- **WHEN** a synchronous engine returns a result during setup
- **THEN** the first rendered output already contains highlighted tokens
- **AND** no loading state is exposed

#### Scenario: Asynchronous engine resolves later

- **WHEN** an engine returns a promise
- **THEN** the first render contains plain source text
- **AND** the highlighted result replaces it after resolution

### Requirement: Failure isolation and diagnostics

A missing peer dependency, a rejected load, a thrown highlight operation, or an invalid result MUST be isolated to the affected code block. The component SHALL keep rendering plain text, expose the failure to the application, and emit at most one development warning per distinct failure signature. Rejections MUST NOT escape as unhandled promise rejections.

#### Scenario: Missing peer dependency is actionable

- **WHEN** the default engine is selected but its peer package is not installed
- **THEN** the code renders as plain text
- **AND** the error names the missing package and the installation command
- **AND** the application is not interrupted

### Requirement: Engine lifecycle

An engine owned by a provider or application SHALL be disposed when that owner unmounts. A shared engine MUST NOT be disposed by an individual code block unmounting. Work still pending at disposal MUST be ignored rather than applied.

#### Scenario: Shared engine survives block unmount

- **WHEN** one of several code blocks unmounts
- **THEN** the shared engine is not disposed
- **AND** the remaining blocks keep using it

#### Scenario: Pending work is ignored after disposal

- **WHEN** a highlight resolves after its owner has been disposed
- **THEN** the result is not applied
- **AND** no state update warning is raised
