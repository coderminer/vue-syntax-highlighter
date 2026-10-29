## Purpose

Defines where theme variables and scheme attributes are emitted, the opt-in root-owned theme scope, and the guarantee that provider-owned theming and existing CSS selectors remain the default.

## ADDED Requirements

### Requirement: Provider-owned theme scope remains the default

When a block inherits its theme from a provider that renders a wrapper, the block SHALL NOT duplicate theme variables or scheme attributes on its own root by default. The provider wrapper MUST remain the single theme scope for that subtree.

#### Scenario: Inherited block does not repeat the theme payload

- **WHEN** a block inside a wrapper provider inherits the provider theme
- **THEN** the block root contains no theme custom properties and no theme scheme attributes

#### Scenario: Standalone block still owns its theme

- **WHEN** a block has no wrapper provider in its ancestor chain
- **THEN** the block root emits theme variables and scheme attributes as before

### Requirement: Root theme scope is opt-in

`SyntaxHighlighter` SHALL accept a `themeScope` prop with values `inherit` and `self`, defaulting to `inherit`. With `themeScope="self"`, the block MUST emit theme custom properties and scheme attributes on its own `.vsh` root even when a wrapper provider exists. The provider wrapper MUST remain in the DOM.

#### Scenario: Self scope emits root attributes

- **WHEN** a block inside a wrapper provider sets `themeScope="self"`
- **THEN** its `.vsh` root contains theme variables plus `data-vsh-scheme`, `data-vsh-theme`, and both theme-name attributes

#### Scenario: Provider wrapper is not removed

- **WHEN** a block sets `themeScope="self"`
- **THEN** the ancestor `vsh-scope` wrapper is still rendered

#### Scenario: Self scope without a provider is harmless

- **WHEN** a standalone block sets `themeScope="self"`
- **THEN** it emits the same theme payload it already emitted by default, without duplication

### Requirement: Renderless providers imply root ownership

When the nearest theme-providing provider is renderless, descendant blocks SHALL emit their own theme scope even if `themeScope` is `inherit`. This keeps theme overrides effective without a wrapper. An explicit `themeScope="self"` MUST behave the same way.

#### Scenario: Renderless provider descendant owns the theme

- **WHEN** a block inherits a theme from a renderless provider
- **THEN** the block root emits the theme variables and scheme attributes that the absent wrapper would have supplied

#### Scenario: Wrapper ancestor does not suppress the inner override

- **WHEN** a renderless provider with a theme override sits inside a wrapper provider
- **THEN** descendant block roots emit the inner override rather than relying only on the outer wrapper

### Requirement: Theme selection and local overrides are unchanged

`themeScope="self"` SHALL NOT change which theme is selected. Selection MUST still follow local props, then the nearest provider, then the plugin, then the default theme. Local theme, pair, and scheme props MUST continue to win.

#### Scenario: Local override wins in self mode

- **WHEN** a block sets `themeScope="self"` and a local `theme` prop while its provider sets a different theme
- **THEN** the block root emits the local theme

#### Scenario: Inherited pair still resolves in self mode

- **WHEN** a block sets `themeScope="self"` and inherits a light/dark pair with `colorScheme="auto"`
- **THEN** the block root emits both variable sets and the automatic scheme attribute

### Requirement: Existing CSS selectors continue to apply

Both `.vsh-scope[data-vsh-scheme]` and `.vsh[data-vsh-scheme]` styling paths SHALL remain supported. Root-owned themes MUST include the scheme attribute on `.vsh` so `light-dark()` and the fallback stylesheet resolve correctly. The default provider-owned path MUST remain selector-compatible.

#### Scenario: Fallback stylesheet works with a root-owned theme

- **WHEN** a browser without `light-dark()` renders a block with `themeScope="self"` and the fallback stylesheet is imported
- **THEN** the fallback rules target the root scheme attribute and produce the selected light or dark values

#### Scenario: Provider-owned selectors remain valid

- **WHEN** existing application CSS targets `.vsh-scope[data-vsh-scheme]`
- **THEN** it continues to match the default provider wrapper

### Requirement: Server rendering and hydration remain deterministic

Theme variables and attributes for both scope modes SHALL be present in server HTML. Root-owned theming MUST NOT introduce runtime `<style>` insertion, a second style source, or a hydration mismatch.

#### Scenario: Self scope renders on the server

- **WHEN** a block with `themeScope="self"` is server-rendered
- **THEN** its HTML contains the theme variables and scheme attributes, and hydration produces no mismatch warning

#### Scenario: No duplicate style source

- **WHEN** a self-scoped block hydrates
- **THEN** no runtime `<style>` element is created and no duplicate theme payload is added

### Requirement: The default theme location never changes implicitly

No additive release SHALL move theme variables from the provider wrapper to block roots, remove the provider wrapper, or require consumers to update theme selectors. Root ownership MUST require an explicit `themeScope="self"` or a renderless provider.

#### Scenario: Upgrade keeps provider-owned theming

- **WHEN** an existing consumer upgrades without setting `themeScope` or `renderless`
- **THEN** theme variables remain on the provider wrapper and application selectors keep working
