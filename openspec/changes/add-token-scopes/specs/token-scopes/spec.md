## Purpose

Defines the opt-in raw scope passthrough and the guarantee that default tokens, markup, and cache behavior do not change.

## ADDED Requirements

### Requirement: Scopes are opt-in

`HighlightToken` SHALL expose an optional `scopes` field. Engines SHALL populate it only when called with `engineOptions.tokenScopes === true`. Existing results without the option MUST NOT contain `scopes`.

#### Scenario: Default results have no scopes

- **WHEN** a block highlights without `tokenScopes`
- **THEN** every token has no `scopes` field and the rendered markup is unchanged

#### Scenario: Opt-in results keep scopes

- **WHEN** a block passes `engineOptions: { tokenScopes: true }`
- **THEN** tokens whose engine provides scopes include a non-empty string array

### Requirement: Adapters map their native classification

The Shiki adapter SHALL return the TextMate scope stack attached to each explanation entry. The highlight.js and Prism adapters SHALL return normalized class names with the `hljs-` and `token` prefixes removed, matching the same normalization used for `type`. Plain-text languages SHALL produce no scopes.

#### Scenario: Shiki returns TextMate scopes

- **WHEN** Shiki highlights `const` in JavaScript with `tokenScopes` enabled
- **THEN** the token scopes contain the grammar scope stack, including `source.js`

#### Scenario: Class engines return normalized names

- **WHEN** highlight.js or Prism highlights `const` in JavaScript with `tokenScopes` enabled
- **THEN** the token scopes contain `keyword` and no prefixed duplicate such as `hljs-keyword`

### Requirement: Rendering is additive

The default token span SHALL render `data-vsh-scope` with the space-joined scopes only when the token has a non-empty scope array. Tokens without scopes, including all tokens when the option is disabled, MUST NOT emit the attribute. The `token` slot SHALL receive the same `token.scopes`.

#### Scenario: Attribute appears only with scopes

- **WHEN** a scoped token renders
- **THEN** its span has `data-vsh-scope="source.ts keyword.control.ts"`

#### Scenario: Disabled option keeps the old markup

- **WHEN** a consumer upgrades without enabling `tokenScopes`
- **THEN** no `data-vsh-scope` attribute exists anywhere in the output

### Requirement: Validation and caching stay consistent

`isHighlightResult` SHALL accept an absent `scopes` field or an array of strings and SHALL reject other shapes. `freezeResult` SHALL preserve and freeze the array. The cache key SHALL continue to include `engineOptions`, so scoped and unscoped results never share an entry, and character accounting SHALL include scope names.

#### Scenario: Malformed scopes are rejected

- **WHEN** an engine returns `scopes: 'source.ts'` or `scopes: [1]`
- **THEN** the result is rejected as invalid

#### Scenario: Scoped cache entries are separate

- **WHEN** the same source is highlighted with and without `tokenScopes`
- **THEN** the two results use different cache keys and the engine runs for each
