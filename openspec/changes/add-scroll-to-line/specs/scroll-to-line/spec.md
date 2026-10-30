## Purpose

Defines the opt-in navigation method exposed by `SyntaxHighlighter` and the guarantee that it adds a capability without changing rendering, defaults, or existing scroll behavior.

## ADDED Requirements

### Requirement: The component exposes `scrollToLine`

`SyntaxHighlighter` SHALL expose a `scrollToLine(line, options?)` method through its component ref. The method SHALL return `true` when the block was scrolled and `false` when it could not act. Line numbers SHALL be interpreted with the same `startLine` offset used by the gutter and `highlightLines`.

#### Scenario: Jump inside the rendered range

- **WHEN** a mounted block starting at line `10` calls `scrollToLine(12)`
- **THEN** the method returns `true` and positions the block at the row for line `12`

#### Scenario: Line zero is not a valid row

- **WHEN** the block starts at line `1` and calls `scrollToLine(0)`
- **THEN** the method returns `false` and leaves the scroll position unchanged

#### Scenario: Non-integer input is rejected

- **WHEN** any block calls `scrollToLine(1.5)` or `scrollToLine(Number.NaN)`
- **THEN** the method returns `false` and leaves the scroll position unchanged

### Requirement: Positioning is exact in both rendering modes

Virtualized blocks SHALL position by multiplying the zero-based row index by the numeric `lineHeight`. Non-virtualized blocks SHALL measure the rendered row so that visual, font-relative rows and fixed rows are both exact. The scroll offset MUST be clamped to the scrollable range.

#### Scenario: Virtualized positioning uses the numeric line height

- **WHEN** a virtualized block with `lineHeight="20"` and `startLine="1"` calls `scrollToLine(51)`
- **THEN** the resulting scroll offset is `1000` px, clamped to the scrollable range

#### Scenario: Non-virtualized positioning measures the row

- **WHEN** a non-virtualized block in the default visual mode calls `scrollToLine(n)`
- **THEN** the offset comes from the rendered row, not from a font-relative estimate

#### Scenario: A customized border does not shift the row

- **WHEN** the scroll element has a top border and a non-virtualized block calls `scrollToLine(n)`
- **THEN** the border width is excluded from the measured offset

### Requirement: Unavailable contexts are safe no-ops

The method SHALL return `false` and perform no work when the block is not mounted, when server rendering, or when the requested line is outside the rendered document. It MUST NOT throw.

#### Scenario: Server rendering does not scroll

- **WHEN** a consumer renders the component on the server
- **THEN** no scroll API is called and `scrollToLine` is unavailable or returns `false` on an unmounted instance

#### Scenario: Unmount clears the target

- **WHEN** a mounted block is unmounted and the retained ref calls `scrollToLine(1)`
- **THEN** the method returns `false` instead of touching a detached element

### Requirement: Smooth scrolling is opt-in

`scrollToLine` SHALL accept `options.behavior` using the standard `ScrollBehavior` values and default to `auto`. Smooth scrolling MUST use the browser scroll API when available and fall back to an immediate `scrollTop` assignment otherwise.

#### Scenario: Default behavior is immediate

- **WHEN** a caller omits `options.behavior`
- **THEN** the block scrolls immediately and the virtual window updates without waiting for an animation

#### Scenario: Smooth behavior is forwarded

- **WHEN** a caller passes `{ behavior: 'smooth' }`
- **THEN** the scroll API receives `behavior: 'smooth'`

### Requirement: Existing behavior is unchanged

The method SHALL NOT change rendered markup, props, defaults, cache keys, controller scheduling, or the existing `refresh`, `highlight`, `copy`, and `getCopyPayload` methods.

#### Scenario: Consumers that never call the method see no difference

- **WHEN** an existing consumer upgrades without using `scrollToLine`
- **THEN** markup, defaults, scroll handling, and cache behavior remain identical
