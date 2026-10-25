## Purpose

Defines how visual themes are represented, selected, applied, switched at runtime, and emitted during server rendering so highlighted code stays styled and consistent.

## ADDED Requirements

### Requirement: Theme model and resolution

Themes SHALL be data, not rendering code. A theme MUST declare a name, a color scheme, base colors for background and foreground, and styles for a documented set of semantic token types; styles may include color, font style, font weight, and text decoration. The effective theme SHALL resolve from explicit component configuration, then provider or plugin configuration, then a documented default. An unknown or invalid theme MUST be rejected with a development warning and replaced by the default theme without disabling highlighting.

#### Scenario: Provider theme applies

- **WHEN** a provider selects a dark theme and a component supplies no theme
- **THEN** the component uses the provider theme

#### Scenario: Unknown theme falls back

- **WHEN** a component requests a theme that does not exist
- **THEN** the default theme is applied
- **AND** a warning names the unknown theme
- **AND** code remains highlighted

### Requirement: Built-in themes

The library SHALL ship a curated set of at least four built-in themes, including at least two light and two dark themes, with at least two of them forming a matched light and dark pair. Each theme MUST be importable individually as theme data, and a convenience aggregate import MAY exist but MUST NOT be the only option. Theme attribution and licensing SHALL be documented.

#### Scenario: A single theme can be imported

- **WHEN** an application imports only one built-in theme
- **THEN** that theme's data is available
- **AND** no other theme's data is included in the bundle

#### Scenario: Light and dark pairs exist

- **WHEN** the built-in theme inventory is inspected
- **THEN** at least two light and two dark themes are present
- **AND** at least two of them form a matched light and dark pair

### Requirement: CSS custom properties for appearance

The rendered component SHALL expose documented CSS custom properties for background, foreground, gutter, line highlight, selection, font stack, and each semantic token type, scoped to the component root. Applications MUST be able to override these properties without changing the theme or re-running highlighting. Built-in styles MUST NOT leak into unrelated page elements.

#### Scenario: Override a color without re-highlighting

- **WHEN** an application overrides the background or a token color custom property
- **THEN** the appearance changes on the next paint
- **AND** the engine is not invoked

#### Scenario: Styles stay scoped

- **WHEN** a page contains code blocks and unrelated elements
- **THEN** theme background and token colors apply only to code blocks

### Requirement: Custom themes

The library SHALL provide a public helper for defining a custom theme that validates required fields and normalizes optional token-type overrides. A defined theme MUST be usable through component and provider configuration. Invalid theme input MUST be rejected with an actionable development error and MUST NOT produce partially applied styles.

#### Scenario: Custom theme is applied

- **WHEN** an application defines a valid theme with custom background, foreground, and keyword colors
- **THEN** code blocks using it reflect those colors

#### Scenario: Invalid custom theme is rejected

- **WHEN** a theme definition omits the required background or foreground color
- **THEN** an actionable development error is emitted
- **AND** the default theme is used instead
- **AND** no partial custom styling is applied

### Requirement: Dual light and dark themes

The component SHALL accept a light and dark theme pair together with a color-scheme mode of automatic, light, or dark. The pair MAY be supplied as built-in theme names or as theme data. Switching between paired themes MUST NOT re-run highlighting, and the rendered markup MUST carry enough scheme information for CSS to select the correct pair without hydration-time JavaScript. In automatic mode, the visible theme SHALL follow the user's preferred color scheme and SHALL update when that preference changes.

#### Scenario: Paired theme switch is free

- **WHEN** the color-scheme mode changes between light and dark for a paired theme
- **THEN** the visible theme changes
- **AND** the engine is not invoked
- **AND** the previous token output is reused

#### Scenario: Automatic mode follows the system

- **WHEN** the color-scheme mode is automatic and the user preference changes
- **THEN** the component updates to the corresponding paired theme
- **AND** the server-rendered markup allows CSS to select the correct initial mode

### Requirement: Theme switching reuses token output

Changing the active theme, including between themes that do not form a pair, MUST NOT invoke the engine and MUST NOT require re-tokenizing the source. The appearance MUST update in a single paint without a blank, unstyled, or partially styled frame. An invalid replacement theme MUST leave the previous theme in effect and report an actionable error.

#### Scenario: No re-highlighting on arbitrary switch

- **WHEN** an application switches from one valid theme to another
- **THEN** the token output is unchanged
- **AND** the engine invocation count does not change
- **AND** the new appearance is applied in one update

#### Scenario: Invalid switch is contained

- **WHEN** the requested replacement theme is invalid
- **THEN** the previous theme remains applied
- **AND** an actionable error is reported

### Requirement: Server-rendered theme styles

The library SHALL ensure a server-rendered code block includes the custom properties and scheme attributes it needs, either directly in the markup or through a documented server-rendering helper. Server and client MUST agree on the initial theme so hydration produces no flash of unstyled code and no duplicate style elements.

#### Scenario: Server markup is themed

- **WHEN** a code block is rendered to a string with a selected theme
- **THEN** the markup includes the theme identity and required custom properties
- **AND** the block is styled before client JavaScript runs

#### Scenario: Hydration does not duplicate styles

- **WHEN** the server-rendered markup is hydrated on the client
- **THEN** no duplicate theme style elements are inserted
- **AND** no hydration mismatch is reported
