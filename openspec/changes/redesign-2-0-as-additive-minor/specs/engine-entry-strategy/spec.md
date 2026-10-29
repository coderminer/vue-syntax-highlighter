## Purpose

Defines which package entry points load built-in highlighting engines, how explicit engines are selected, and the compatibility guarantees that keep entry behavior stable across additive releases.

## ADDED Requirements

### Requirement: Default entry auto-loads built-in engines

The default `vue-syntax-highlighter` entry SHALL make the built-in Shiki, highlight.js, and Prism engines available by string identifier without a separate adapter import. The default entry MUST keep its current API surface and lazy engine loading.

#### Scenario: Default entry resolves a built-in engine string

- **WHEN** a consumer imports `SyntaxHighlighter` from `vue-syntax-highlighter` and renders `engine="shiki"` with Shiki installed
- **THEN** the block highlights with Shiki without importing an adapter module explicitly

#### Scenario: Explicit engine object wins over the default loader

- **WHEN** a block on the default entry receives an engine object through the `engine` prop
- **THEN** that object is used and no built-in engine string is resolved

#### Scenario: Missing built-in peer degrades safely

- **WHEN** the default entry resolves a built-in engine whose peer package is not installed
- **THEN** the block renders plain text and emits one actionable development warning instead of failing the render

### Requirement: Full entry remains equivalent to the default entry

The `vue-syntax-highlighter/full` entry SHALL keep the same built-in engine availability and public exports as the default entry. The `full` entry MUST remain a compatibility entry, not a separate behavior tier.

#### Scenario: Full entry highlights like the default entry

- **WHEN** the same code, language, and built-in engine string are rendered from the default and `full` entries
- **THEN** both produce equivalent normalized token output

### Requirement: Core entry performs no built-in engine imports

The `vue-syntax-highlighter/core` entry SHALL provide the component, provider, composable, themes, and types without statically or dynamically importing a built-in engine adapter. An explicit engine object or a registered custom engine MUST be required for highlighting.

#### Scenario: Core entry renders plain text without an engine

- **WHEN** a consumer imports from `vue-syntax-highlighter/core` and renders a block without an engine
- **THEN** the block renders plain text and a development warning explains that no engine is configured

#### Scenario: Core entry highlights with an explicit engine

- **WHEN** a consumer imports from `vue-syntax-highlighter/core` and passes a ready engine object
- **THEN** the block highlights with that engine and resolves no optional peer

#### Scenario: Core entry remains free of engine peers

- **WHEN** the packed package is installed with only `vue` and the `core` entry is imported in Node
- **THEN** the import succeeds without resolving Shiki, highlight.js, lowlight, or refractor

### Requirement: Engine selection precedence is stable

Engine selection SHALL resolve the component prop first, then the nearest provider, then the plugin scope, then the entry's built-in fallback. The core entry's fallback MUST fail into the documented plain-text warning instead of loading a built-in adapter.

#### Scenario: Nearest provider wins over the plugin scope

- **WHEN** a block without its own `engine` prop is inside a provider that configures an engine
- **THEN** the provider engine is selected instead of the plugin engine

#### Scenario: Outer provider engine changes propagate

- **WHEN** an outer provider changes its engine while a nested provider leaves `engine` unset
- **THEN** descendant blocks re-highlight with the new engine

### Requirement: Additive releases do not change entry defaults

No minor or patch release SHALL switch the default entry to the core entry, remove built-in auto-loading, introduce a default engine into the core entry, or change the `full` entry's contract. The core entry MUST remain the supported opt-out for consumers who want no built-in engine imports.

#### Scenario: Upgrade preserves default entry behavior

- **WHEN** a project upgrades from `1.1.x` to a later additive release without changing its imports
- **THEN** `engine="shiki"` still resolves from the default entry and no adapter import is newly required

#### Scenario: Roadmap no longer schedules an entry flip

- **WHEN** a consumer reads the roadmap or release notes for an additive release
- **THEN** no future version promises to make the default entry engine-free or to move built-in loading out of it

### Requirement: Entry documentation states the supported choice

Documentation SHALL describe the default and `full` entries as built-in-enabled, and the `core` entry as explicit-engine and peer-free. Documentation MUST NOT describe an entry default flip as planned behavior.

#### Scenario: Entry comparison is documented

- **WHEN** a consumer reads the API or roadmap documentation
- **THEN** each entry's engine-loading behavior and upgrade guarantee is stated without a future breaking change
