## Purpose

Defines the existing base and fallback stylesheets, the new single-import complete stylesheet, and the compatibility guarantees that keep current CSS imports and selectors working.

## ADDED Requirements

### Requirement: Base stylesheet behavior is unchanged

`vue-syntax-highlighter/styles.css` SHALL remain the base stylesheet for layout, tokens, and `light-dark()` colors. Its selectors, custom properties, and import behavior MUST remain compatible with existing consumers. It MUST NOT start including the fallback rules implicitly.

#### Scenario: Existing base import still works

- **WHEN** a consumer imports `vue-syntax-highlighter/styles.css`
- **THEN** layout, token, and color styles apply exactly as before

#### Scenario: Base import does not add fallback rules

- **WHEN** only `styles.css` is imported in a browser without `light-dark()` support
- **THEN** the fallback rules are absent, matching the pre-change behavior

### Requirement: Fallback stylesheet remains available and optional

`vue-syntax-highlighter/styles/fallback.css` SHALL remain an optional compatibility stylesheet for browsers without `light-dark()`. It MUST NOT become a no-op, be removed, or start warning at import time.

#### Scenario: Fallback import restores pre-light-dark colors

- **WHEN** a consumer imports `styles.css` followed by `styles/fallback.css` in a browser without `light-dark()`
- **THEN** the fallback variable rules apply for light, dark, and automatic schemes

#### Scenario: Fallback remains a real file

- **WHEN** the packed package is inspected
- **THEN** `styles/fallback.css` is present with the same compatibility purpose as before

### Requirement: Complete stylesheet provides one import

The package SHALL add `vue-syntax-highlighter/styles/complete.css`, which contains the base rules followed by the fallback rules. Importing this file alone MUST provide the same result as importing `styles.css` and then `styles/fallback.css`.

#### Scenario: Complete import covers both paths

- **WHEN** a consumer imports only `styles/complete.css`
- **THEN** base styling applies and browsers without `light-dark()` receive the fallback values

#### Scenario: Complete import works in modern browsers

- **WHEN** a consumer imports only `styles/complete.css` in a browser with `light-dark()` support
- **THEN** the fallback block is inert and base colors are used

#### Scenario: Complete import preserves the original order

- **WHEN** the complete stylesheet is evaluated
- **THEN** base declarations precede fallback declarations, so fallback values only apply where supported

### Requirement: Complete stylesheet is packaged and exported

The package exports map and packed file list SHALL expose `./styles/complete.css`. Package validation MUST fail if the file or export is missing. The existing `./styles.css` and `./styles/fallback.css` exports MUST remain.

#### Scenario: Complete subpath resolves

- **WHEN** a consumer imports `vue-syntax-highlighter/styles/complete.css` from the packed package
- **THEN** the import resolves to the published CSS file

#### Scenario: Existing subpaths still resolve

- **WHEN** the packed package is validated
- **THEN** `styles.css` and `styles/fallback.css` still resolve and remain in the tarball

### Requirement: Stylesheet behavior does not change implicitly

No additive release SHALL merge the fallback into `styles.css`, remove the standalone fallback entry, change the required import order for existing entries, or add runtime style injection.

#### Scenario: Upgrade keeps existing stylesheet imports valid

- **WHEN** an existing consumer upgrades without changing stylesheet imports
- **THEN** the same files apply the same rules and no new import is required

#### Scenario: Documentation presents complete as opt-in

- **WHEN** a consumer reads the styling documentation
- **THEN** `styles/complete.css` is described as an optional single-import convenience, not as a required migration
