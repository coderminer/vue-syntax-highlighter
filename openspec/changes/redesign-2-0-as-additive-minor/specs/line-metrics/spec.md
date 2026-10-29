## Purpose

Defines the current line-height defaults, the opt-in fixed alignment mode, and the guarantee that neither virtualized nor non-virtualized rendering changes its default height.

## ADDED Requirements

### Requirement: Default line metrics stay unchanged

The default virtual line height SHALL remain `20` px. Non-virtual rows SHALL keep their current `1.5em` minimum height and font-relative behavior. No additive release SHALL change the default `lineHeight` value or make non-virtual rows fixed by default.

#### Scenario: Default virtual rows remain 20 px

- **WHEN** a virtualized block is rendered without an explicit `lineHeight`
- **THEN** each rendered row, spacer calculation, and scroll position uses `20` px

#### Scenario: Default non-virtual rows remain font-relative

- **WHEN** a non-virtualized block is rendered without `lineHeightMode="fixed"`
- **THEN** its rows keep the existing `1.5em` minimum height and follow the surrounding font size

#### Scenario: Upgrade does not change visual height

- **WHEN** an existing consumer upgrades without setting `lineHeight` or `lineHeightMode`
- **THEN** both virtualized and non-virtualized blocks render at their previous heights

### Requirement: Fixed line-height mode is opt-in

`SyntaxHighlighter` SHALL accept a `lineHeightMode` prop with values `visual` and `fixed`, defaulting to `visual`. With `lineHeightMode="fixed"`, every row MUST use the numeric `lineHeight` as its exact minimum height, independent of font size. Virtualized and non-virtualized blocks with the same numeric line height MUST occupy the same row height.

#### Scenario: Fixed mode aligns non-virtual rows

- **WHEN** a non-virtualized block sets `lineHeightMode="fixed"` and `lineHeight="20"`
- **THEN** every row has a `20` px minimum height regardless of font size

#### Scenario: Fixed mode matches virtualization

- **WHEN** two blocks use `lineHeightMode="fixed"` and `lineHeight="20"`, one virtualized and one not
- **THEN** both render rows with the same `20` px height and the virtualized block does not drift

#### Scenario: Visual mode remains font-relative

- **WHEN** a block uses the default `lineHeightMode="visual"`
- **THEN** row height continues to follow the `1.5em` stylesheet rule even if `lineHeight` is set for virtualization math

### Requirement: The 21 px metric is available as an opt-in

Consumers SHALL be able to obtain the old roadmap's `21` px metric by setting `lineHeight="21"` together with `lineHeightMode="fixed"`. The component MUST NOT apply `21` px by default, and documentation MUST show the opt-in form rather than describing it as a future default.

#### Scenario: Opt-in 21 px alignment

- **WHEN** a block sets `lineHeight="21"` and `lineHeightMode="fixed"`
- **THEN** virtualized and non-virtualized rows both use `21` px

#### Scenario: Default remains 20 px

- **WHEN** a block omits both props
- **THEN** the documented default is still `20` px for virtualization and the existing `1.5em` visual rule for non-virtual rows

### Requirement: Invalid fixed metrics degrade safely

In `lineHeightMode="fixed"`, a non-finite, zero, or negative `lineHeight` SHALL fall back to `20` px and emit one development warning. An unknown `lineHeightMode` value SHALL fall back to `visual` and emit one development warning. Visual-mode handling of unusual `lineHeight` values MUST remain unchanged.

#### Scenario: Invalid fixed line height falls back

- **WHEN** a block sets `lineHeightMode="fixed"` with `lineHeight=0`
- **THEN** rows render at `20` px and one warning explains the fallback

#### Scenario: Unknown mode falls back to visual

- **WHEN** a block sets an unsupported `lineHeightMode` value
- **THEN** the block uses visual mode and one warning lists the supported values

#### Scenario: Visual mode keeps existing behavior

- **WHEN** a block leaves `lineHeightMode` at `visual` and passes an unusual numeric `lineHeight`
- **THEN** the current virtual-window clamping and font-relative row height remain in effect

### Requirement: Virtualization uses the numeric height exactly

In both modes, the virtualization window, top and bottom spacers, and rendered row boxes SHALL use the numeric `lineHeight` exactly. Spacer pixels and row pixels MUST add up to the same total document height, with no cumulative scroll drift.

#### Scenario: Spacers and rows agree

- **WHEN** a virtualized block scrolls through a long document
- **THEN** the top spacer, rendered rows, and bottom spacer always total `lineCount * lineHeight` pixels

#### Scenario: Row styling cannot override the numeric height

- **WHEN** the base stylesheet's `1.5em` minimum height is larger than the numeric `lineHeight`
- **THEN** virtualized rows still use the numeric height and do not grow beyond it

### Requirement: Server rendering is measurement-free

Row height decisions for both modes SHALL be derivable from props and the documented stylesheet, without browser measurement. Server HTML MUST match the first client render.

#### Scenario: Fixed mode renders deterministically on the server

- **WHEN** a fixed-mode block is server-rendered and hydrated
- **THEN** row heights are present in the server HTML and hydration produces no size-related mismatch
