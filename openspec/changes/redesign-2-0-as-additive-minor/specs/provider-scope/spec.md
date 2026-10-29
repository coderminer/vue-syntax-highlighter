## Purpose

Defines the provider's default theme wrapper and the opt-in renderless mode, including nesting, cleanup, and the guarantee that the existing `div.vsh-scope` DOM never changes by default.

## ADDED Requirements

### Requirement: Provider wrapper remains the default

`SyntaxHighlighterProvider` SHALL render one wrapper element by default. The default wrapper MUST remain a `div` with class `vsh-scope`, `display: contents`, theme attributes, and theme custom properties. The `scopeTag` prop SHALL continue to replace only the tag name.

#### Scenario: Default provider markup is unchanged

- **WHEN** a provider is rendered without `scopeTag` or `renderless`
- **THEN** its subtree contains one `div.vsh-scope` wrapper with theme variables and scheme attributes

#### Scenario: Custom scope tag preserves wrapper behavior

- **WHEN** a provider sets `scopeTag="section"`
- **THEN** it renders `section.vsh-scope` with the same attributes, variables, and child placement as the default wrapper

### Requirement: Renderless mode is opt-in

The provider SHALL accept a `renderless` boolean prop whose default is `false`. When `renderless` is `true`, the provider MUST provide configuration to descendants without rendering a wrapper element. When `renderless` is `false` or omitted, rendering MUST remain unchanged.

#### Scenario: Renderless provider emits no wrapper

- **WHEN** a provider sets `renderless`
- **THEN** its slot content is rendered without a `vsh-scope` element and without an extra wrapper node

#### Scenario: Default provider still emits a wrapper

- **WHEN** a provider omits `renderless`
- **THEN** the rendered DOM is identical to the pre-change default wrapper

#### Scenario: Renderless provider still supplies context

- **WHEN** a descendant block inside a renderless provider relies on the provider's engine, theme, or deferral settings
- **THEN** those settings still apply to the descendant

### Requirement: Renderless mode resolves scope conflicts predictably

When both `renderless` and `scopeTag` are provided, `renderless` SHALL take precedence and `scopeTag` MUST have no visible effect. The provider MUST emit one development warning describing the ignored `scopeTag`.

#### Scenario: Renderless wins over scopeTag

- **WHEN** a provider sets both `renderless` and `scopeTag="section"`
- **THEN** no wrapper is rendered and one development warning reports that `scopeTag` was ignored

#### Scenario: Warning is emitted once

- **WHEN** the same provider re-renders with both props present
- **THEN** the conflict warning is not repeated

### Requirement: Renderless providers compose across nesting

Nested providers SHALL keep their existing inheritance rules in both modes. A renderless provider MUST contribute its own configuration while leaving an outer wrapper intact, and a wrapper provider inside a renderless ancestor MUST restore a wrapper for its own subtree.

#### Scenario: Renderless provider inside a wrapper provider

- **WHEN** an outer wrapper provider contains an inner renderless provider with a theme override
- **THEN** the inner override applies to its descendants while the outer wrapper remains in the DOM

#### Scenario: Wrapper provider inside a renderless provider

- **WHEN** an outer renderless provider contains an inner wrapper provider
- **THEN** the inner subtree contains the inner provider's wrapper element

### Requirement: Provider lifecycle is unchanged in both modes

Provider disposal, language preloading, engine ownership, and cache ownership SHALL behave identically with and without a wrapper. Renderless mode MUST NOT leave observers, caches, or loader-owned engines alive after unmount.

#### Scenario: Renderless provider cleans up on unmount

- **WHEN** a renderless provider unmounts
- **THEN** its context is disposed and loader-owned resources are released exactly as in wrapper mode

### Requirement: Server rendering is deterministic in both modes

Provider markup SHALL be deterministic on the server. Renderless mode MUST omit the wrapper in server HTML and during hydration, without producing a hydration mismatch.

#### Scenario: Renderless provider server output matches the client

- **WHEN** a renderless provider is server-rendered and then hydrated
- **THEN** the wrapper is absent on both sides and no hydration warning is emitted
