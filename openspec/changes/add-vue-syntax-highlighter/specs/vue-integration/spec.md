## Purpose

Defines how the library integrates with a Vue application, including installation, scoped configuration, composables, reactivity, events, server rendering, and migration-friendly aliases.

## ADDED Requirements

### Requirement: Plugin installation

The library SHALL provide a Vue plugin that registers the main component globally and accepts defaults for engine, theme or theme pair, preloaded languages, cache capacity, deferral, and virtualization. Installation MUST be repeatable across independent application instances without leaking configuration between them. Invalid plugin options MUST produce an actionable development warning without preventing application startup.

#### Scenario: Plugin registers the component and defaults

- **WHEN** an application installs the plugin with a dark theme and preloaded languages
- **THEN** the main component is available globally
- **AND** code blocks use the configured theme and languages without repeating the configuration

#### Scenario: Applications are isolated

- **WHEN** two application instances install the plugin with different defaults
- **THEN** each application uses its own defaults
- **AND** neither affects the other

### Requirement: Scoped provider configuration

The library SHALL provide a provider component that overrides engine, theme, themes, preloaded languages, cache, deferral, and virtualization for its subtree. Nested providers MUST inherit unspecified values from their parent and override specified values. A provider MUST NOT affect sibling or ancestor subtrees, and it SHALL release resources it owns when unmounted.

#### Scenario: Nested provider overrides a subtree

- **WHEN** a provider inside a themed page selects a different engine and theme
- **THEN** descendants use the override
- **AND** code blocks outside the provider keep the outer configuration

#### Scenario: Unspecified values are inherited

- **WHEN** a nested provider sets only a theme
- **THEN** its descendants inherit the outer engine, languages, and cache
- **AND** they use the nested theme

### Requirement: Composables

The library SHALL expose composables for using highlighting behavior outside the default component, including reactive highlighted lines, loading state, error state, and an explicit refresh operation. Composables MUST be callable in component setup, MUST respect the nearest provider configuration, MUST NOT require DOM access, and MUST NOT leak engine results from disposed scopes.

#### Scenario: Composable exposes reactive state

- **WHEN** code is highlighted through a composable and the source changes
- **THEN** the exposed state updates reactively
- **AND** the loading and error states reflect the latest request

#### Scenario: Composable respects provider configuration

- **WHEN** a composable is used inside a provider that selects an engine and theme
- **THEN** it uses those values without additional configuration

### Requirement: Reactive updates and instance stability

Changes to source, language, theme, line highlighting, wrapping, numbering, or virtualization settings SHALL update the existing component instance in place. The component MUST NOT remount, MUST preserve scroll position where the rendered content permits it, and MUST NOT re-run highlighting when an update does not change effective highlighting inputs.

#### Scenario: Language change updates in place

- **WHEN** the language prop changes from JavaScript to Python
- **THEN** the same component instance renders the Python result
- **AND** no full component remount occurs

#### Scenario: Unrelated prop change keeps tokens

- **WHEN** only the accessible label changes
- **THEN** the token output is preserved
- **AND** the engine is not invoked

### Requirement: Events and exposed operations

The component SHALL emit a highlighted event after a result is applied and an error event when highlighting fails. It SHALL expose operations to refresh the current highlight, highlight explicit input, and copy the complete source text. Copying MUST copy all source lines and MUST resolve with a success indicator rather than throwing when the clipboard is unavailable.

#### Scenario: Highlighted event reports a result

- **WHEN** a highlight result is applied
- **THEN** the highlighted event fires once for that result
- **AND** it identifies the language and theme used

#### Scenario: Copy works without clipboard permission

- **WHEN** the clipboard API is unavailable or denied
- **THEN** the copy operation resolves with a failure indicator
- **AND** no unhandled error is raised

### Requirement: Server rendering and hydration

The library MUST be importable without browser globals. Server rendering SHALL support synchronous and preloaded engines with fully highlighted markup. Asynchronous engines SHALL render a deterministic plain-text shell that is marked busy during server rendering and upgraded after hydration. Hydration MUST NOT produce mismatch warnings, duplicate theme styles, or premature viewport observation.

#### Scenario: Synchronous engine server render

- **WHEN** a preloaded synchronous engine renders to a string
- **THEN** the markup contains highlighted tokens
- **AND** the client hydrates without mismatch warnings

#### Scenario: Asynchronous engine server render

- **WHEN** an asynchronous engine renders to a string
- **THEN** the markup contains deterministic plain source text marked busy
- **AND** highlighting starts only after hydration
- **AND** no hydration mismatch is reported

#### Scenario: Import in a non-browser environment

- **WHEN** the package is imported in a server environment without `window` or `document`
- **THEN** import succeeds
- **AND** no browser API is accessed during module evaluation

### Requirement: Migration-compatible aliases

The library SHALL export compatibility aliases for `Light`, `LightAsync`, `PrismLight`, and `PrismAsync` that select the corresponding built-in adapter and loading behavior. It SHALL accept deprecated prop aliases `showLineNumbers`, `wrapLines`, `customStyle`, and `codeTagProps`, map them to native props, and emit one development warning per alias per application. Native props MUST take precedence when both forms are supplied.

#### Scenario: Alias selects an adapter

- **WHEN** an application uses the `PrismLight` alias
- **THEN** the Prism adapter is used
- **AND** the block renders normally

#### Scenario: Deprecated prop is mapped and warned

- **WHEN** an application supplies `showLineNumbers` and no native equivalent
- **THEN** line numbers are enabled
- **AND** one development warning explains the native prop
- **AND** a second use does not repeat the warning

#### Scenario: Native prop wins

- **WHEN** both a deprecated alias and its native prop are supplied with different values
- **THEN** the native prop controls behavior
- **AND** a development warning is emitted
