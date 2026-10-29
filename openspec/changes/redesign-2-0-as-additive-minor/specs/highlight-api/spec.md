## Purpose

Defines the default terminal-newline behavior of the programmatic `highlight()` API and the opt-in flag that preserves the trailing newline without changing component rendering or existing callers.

## ADDED Requirements

### Requirement: Default highlight behavior is unchanged

`highlight()` SHALL keep its current default behavior: normalize line endings to LF and remove one terminal newline before highlighting. Existing callers MUST receive the same line structure as before when they do not pass the new option.

#### Scenario: Default call strips one terminal newline

- **WHEN** `highlight()` receives code ending in exactly one `\n` without `preserveTrailingNewline`
- **THEN** the returned lines match the code without that final newline and no extra empty row is added

#### Scenario: Default call preserves intentional blank lines

- **WHEN** `highlight()` receives code ending in two `\n` characters without the option
- **THEN** one terminal newline is removed and the remaining blank line is represented

#### Scenario: Default behavior is identical to the previous release

- **WHEN** the same input is highlighted before and after upgrading without the option
- **THEN** the line count and concatenated text are identical

### Requirement: Trailing-newline preservation is opt-in

`highlight()` SHALL accept a `preserveTrailingNewline` boolean option whose default is `false`. When `true`, the API MUST keep the normalized source's terminal newline and represent it as the final empty line in the returned result.

#### Scenario: Preserved trailing newline adds the final empty line

- **WHEN** `highlight()` receives `"a\n"` with `preserveTrailingNewline: true`
- **THEN** the result contains two lines: `"a"` followed by an empty line

#### Scenario: Preserved input round-trips

- **WHEN** the result lines are joined with `\n`
- **THEN** the joined text equals the LF-normalized input, including the terminal newline

#### Scenario: Multiple terminal newlines are preserved

- **WHEN** `highlight()` receives `"a\n\n"` with `preserveTrailingNewline: true`
- **THEN** both terminal newlines are represented and no newline is removed

### Requirement: Component exposure and composable accept the option

The component's exposed `highlight()` method and the `useSyntaxHighlighter()` composable SHALL accept `preserveTrailingNewline` per call. The composable SHALL also accept a default value in its options. A per-call value MUST override the composable default.

#### Scenario: Exposed method accepts the option

- **WHEN** a component ref calls `highlight({ code: 'a\n', preserveTrailingNewline: true })`
- **THEN** the returned result includes the final empty line

#### Scenario: Composable default applies

- **WHEN** `useSyntaxHighlighter()` is created with `preserveTrailingNewline: true` and `highlight()` is called without a per-call value
- **THEN** the default is applied

#### Scenario: Per-call value overrides the composable default

- **WHEN** the composable default is `true` and a call passes `preserveTrailingNewline: false`
- **THEN** the call uses the default stripping behavior

### Requirement: Rendering is not affected by the option

The option SHALL affect only programmatic `highlight()` results. Component rendering, the `code` prop's display normalization, gutter numbering, and `copy()` output MUST remain unchanged.

#### Scenario: Component display still uses display normalization

- **WHEN** a component renders code with a terminal newline
- **THEN** it still omits the extra terminal row exactly as before

#### Scenario: Copy output is unchanged

- **WHEN** `copy()` is called on a block
- **THEN** it returns the source with its existing newline rules, independent of any `highlight()` option

### Requirement: Cache and validation semantics remain correct

When the option changes the effective source, the cache key SHALL differ so preserved and stripped results are never mixed. Result validation, abort handling, disposal, and error behavior MUST remain unchanged.

#### Scenario: Preserved and stripped results do not collide

- **WHEN** the same input is highlighted once with the option and once without it
- **THEN** each call receives the correct line structure rather than a cached result from the other mode

#### Scenario: Invalid engine output still fails validation

- **WHEN** an engine returns tokens that do not reproduce the preserved source
- **THEN** the existing validation error is raised and the invalid result is not cached

### Requirement: No future default change

No additive release SHALL make trailing-newline preservation the default, remove the option, or change the default stripping rule. Documentation MUST present preservation as an opt-in.

#### Scenario: Default remains stripping

- **WHEN** a consumer upgrades and does not pass the option
- **THEN** `highlight()` continues to remove one terminal newline

#### Scenario: Documentation states the opt-in

- **WHEN** a consumer reads the API documentation
- **THEN** the default and the opt-in behavior are both stated explicitly
