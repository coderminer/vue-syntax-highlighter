## Purpose

Defines the published package surface, dependency boundaries, tree-shaking behavior, size budgets, type declarations, and validation required for safe distribution.

## ADDED Requirements

### Requirement: Package format and supported targets

The package SHALL be published as an ESM-only npm package targeting modern evergreen browsers and Node-based server rendering with ES2020 output. Vue `>=3.4` SHALL be the only required peer dependency. The package MUST declare its module format and supported engines so unsupported consumers receive an explicit resolution failure rather than a runtime surprise.

#### Scenario: Modern bundler consumes the package

- **WHEN** the package is imported in a Vite application using Vue 3.4 or later
- **THEN** the import resolves to ESM
- **AND** no CommonJS interop workaround is required

#### Scenario: Unsupported Vue version is rejected

- **WHEN** the package is installed with a Vue version below the supported peer range
- **THEN** the package manager reports an unmet peer requirement
- **AND** the package does not silently run against the unsupported version

### Requirement: Entry points and subpath exports

The package SHALL expose a core entry point, separate entry points for each built-in engine adapter, a theme-data entry point, individual built-in theme data entries, base styles, and `package.json`. Every JavaScript entry point MUST have an adjacent type declaration reachable through the exports map. Deep imports into build output paths MUST be blocked. The exports map SHALL define `types`, `import`, and `default` targets consistently.

#### Scenario: Engine adapter resolves independently

- **WHEN** the Shiki adapter subpath is imported
- **THEN** it resolves to the adapter entry and its types
- **AND** no other adapter is loaded

#### Scenario: Deep import is blocked

- **WHEN** an application imports an internal build path that is not a declared export
- **THEN** module resolution fails with an exports error
- **AND** the public entry points continue to work

#### Scenario: Theme data has its own export

- **WHEN** an application imports one built-in theme's data
- **THEN** only that theme's data is returned
- **AND** base styles are available from their own export

### Requirement: Optional peer dependencies

Shiki, lowlight, highlight.js (required by the lowlight adapter), and refractor SHALL be optional peer dependencies that are required only when their adapter is used. Importing the core entry point MUST NOT fail when none of them is installed. Selecting an adapter without its peer MUST produce an actionable error naming the package and installation command, and MUST fall back to plain text rather than aborting rendering. Vue MUST resolve to a single shared instance.

#### Scenario: Core install without engines

- **WHEN** only Vue and the core package are installed
- **THEN** the core entry imports and renders plain text successfully
- **AND** no engine peer is required

#### Scenario: Adapter peer is missing

- **WHEN** the Shiki adapter is selected but Shiki is not installed
- **THEN** the error names Shiki and the install command
- **AND** plain text is rendered
- **AND** the application does not crash

#### Scenario: Vue is not duplicated

- **WHEN** a consumer inspects the dependency tree
- **THEN** the package does not bundle its own Vue runtime
- **AND** Vue remains a peer dependency

### Requirement: Tree-shaking and side-effect declarations

The core entry point MUST NOT statically include any engine adapter, grammar, language data, non-default theme data, base stylesheet, or browser global. The package SHALL declare side effects limited to stylesheets. Importing the core entry MUST be removable when unused, and importing one adapter or theme MUST NOT pull in unrelated adapters or themes.

#### Scenario: Root bundle excludes engines

- **WHEN** an application imports only the core entry and bundles it
- **THEN** the bundle contains no engine adapter, grammar, or non-default theme data
- **AND** the unused core export is tree-shaken when not referenced

#### Scenario: One adapter does not bundle another

- **WHEN** an application imports the highlight.js adapter
- **THEN** neither the Shiki nor Prism adapter is included

### Requirement: Size budgets

The package SHALL enforce bundle-size budgets in continuous integration. The core entry MUST remain at or below 12 kB gzip excluding Vue, each engine adapter at or below 5 kB gzip excluding its peer runtime, base styles at or below 2 kB gzip, and each built-in theme data entry at or below 2 kB gzip. Exceeding a budget MUST fail the build.

#### Scenario: Core budget is enforced

- **WHEN** the production core bundle is measured
- **THEN** its gzip size is at or below 12 kB
- **AND** a regression above the budget fails continuous integration

#### Scenario: Adapter and theme budgets are independent

- **WHEN** adapter and theme bundles are measured
- **THEN** each adapter is at or below 5 kB gzip and each theme data entry at or below 2 kB gzip
- **AND** peer runtime code is excluded from the measurement

### Requirement: Type declarations

The package SHALL ship strict TypeScript declarations for all public exports, including component props, slots, events, exposed methods, engine contracts, theme definitions, plugin options, and normalized results. Public declarations MUST NOT expose untyped or `any`-shaped contracts. They MUST resolve under both bundler and Node16 module resolution.

#### Scenario: Public types resolve in both modes

- **WHEN** a TypeScript project type-checks the package with bundler resolution and with Node16 resolution
- **THEN** all public imports resolve with their declared types
- **AND** no declaration errors are reported

#### Scenario: Invalid engine implementation is rejected

- **WHEN** a custom engine omits a required contract member
- **THEN** type checking reports the missing member
- **AND** valid engines type-check without suppression

### Requirement: Publish validation

The package SHALL validate its publishable artifact before release. Validation MUST confirm that only intended files are packed, that every declared export resolves to an existing file, that types and runtime entries agree, that `publint` and package-type checks pass, and that a minimal consumer can install the packed tarball and render a code block in both browser and server modes.

#### Scenario: Packed artifact is installable

- **WHEN** the package is packed and installed into a clean fixture
- **THEN** a browser build renders a highlighted block
- **AND** a server render produces markup
- **AND** no missing-file or export errors occur

#### Scenario: Invalid export fails validation

- **WHEN** an exports entry points to a missing file
- **THEN** publish validation fails before release
- **AND** the release is blocked
