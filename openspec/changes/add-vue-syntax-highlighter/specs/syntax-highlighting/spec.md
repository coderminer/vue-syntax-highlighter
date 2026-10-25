## Purpose

Defines the component contract for rendering highlighted code as accessible, selectable text, including line features, slot-based customization, and safe loading, error, and fallback states.

## ADDED Requirements

### Requirement: Code block structure and content fidelity

The component SHALL render highlighted code inside a `pre` element containing a `code` element by default. The visible text of the code element MUST equal the supplied source after line-ending normalization, with every whitespace character and line break preserved. An empty or whitespace-only source MUST render a valid, empty code block without error. The declared language SHALL be exposed through a conventional `language-<id>` class on the code element.

#### Scenario: Multi-line code is preserved

- **WHEN** three lines of JavaScript are rendered with language `js`
- **THEN** the code element contains the same visible text and line breaks as the source
- **AND** the code element has the class `language-js`

#### Scenario: Empty source renders without error

- **WHEN** the code prop is an empty string
- **THEN** the component renders a `pre` containing an empty `code` element
- **AND** no error state or development warning is produced

### Requirement: Token rendering and output safety

Highlighted output MUST be represented as ordered lines of text tokens. The component SHALL render every token as text content and MUST NOT interpret token or engine output as HTML. Special characters, tags, and script-like content in the source MUST appear literally and MUST NOT create executable elements.

#### Scenario: HTML-like source is escaped

- **WHEN** the source contains `<img src=x onerror="alert(1)">`
- **THEN** that exact string is visible as code text
- **AND** the rendered output contains no `img` element

### Requirement: Line numbering

Line numbers SHALL be disabled by default, enabled through a `lineNumbers` prop, and configurable with a starting line. The number gutter MUST be hidden from assistive technology so the code is announced without numbers. Copying the code selection without the gutter MUST yield code text without line numbers. Numbers MUST align with displayed lines, including when wrapping is enabled.

#### Scenario: Line numbers start at a custom line

- **WHEN** line numbers are enabled with a start line of 10 and three lines of code
- **THEN** the gutter shows 10, 11, and 12
- **AND** the gutter is hidden from assistive technology
- **AND** copying the code does not include the numbers

#### Scenario: Line numbers are off by default

- **WHEN** no line-number configuration is supplied
- **THEN** no number gutter is rendered

### Requirement: Line highlighting and wrapping

The component SHALL accept individual line numbers or ranges to emphasize and SHALL apply a distinct, themeable full-line background to those lines. Entries outside the rendered range MUST be ignored without error. A `wrap` prop SHALL control wrapping; when disabled, long lines MUST remain intact and the code block SHALL scroll horizontally. Highlighted line references SHALL use source line numbers when a custom start line is configured.

#### Scenario: Highlighted range is applied exactly

- **WHEN** lines 2 through 3 are requested for a five-line block
- **THEN** exactly lines 2 and 3 carry the highlighted-line marker
- **AND** requesting line 99 adds no marker and raises no error

#### Scenario: Wrapping controls overflow

- **WHEN** wrapping is disabled
- **THEN** long lines remain intact and the block scrolls horizontally
- **WHEN** wrapping is enabled
- **THEN** long lines wrap while preserving their leading indentation

### Requirement: Slot and tag customization

The component SHALL expose scoped slots for line content, line numbers, individual tokens, loading, error, header, and footer. A supplied slot MUST replace only the corresponding default rendering, leaving gutter alignment, accessibility attributes, and line markers intact. The root `pre` and inner `code` elements SHALL be replaceable with a custom tag or component while preserving content and semantics.

#### Scenario: Custom token slot

- **WHEN** a token slot renders each token as a custom element
- **THEN** every token is rendered through that slot
- **AND** line breaks, line numbers, and highlighted-line markers are unchanged

#### Scenario: Custom pre and code tags

- **WHEN** custom `preTag` and `codeTag` values are supplied
- **THEN** the rendered structure uses them
- **AND** code text and the language class are still present

### Requirement: Loading and fallback states

While an asynchronous highlight is pending and no previous result exists, the component SHALL render the plain source with the same line structure and SHALL expose the region as busy. When a refresh is pending, the previous highlighted output SHALL remain visible. When highlighting fails, or a requested language is unavailable, the component SHALL render the plain source if no previous result exists, otherwise retain the previous output; in both cases it SHALL surface the failure through the error slot and an error event and MUST NOT throw during render. A development warning SHALL be emitted at most once per distinct failure.

#### Scenario: Pending highlight shows plain source

- **WHEN** an asynchronous highlight request has not yet resolved
- **THEN** the source is visible as plain text
- **AND** the code region is exposed as busy

#### Scenario: Engine failure does not break the page

- **WHEN** the engine rejects or returns a result that does not match the token model
- **THEN** the source remains visible as plain text
- **AND** the error slot and error event receive the failure
- **AND** the surrounding application continues to render

### Requirement: Accessibility and attribute fallthrough

The component SHALL expose a keyboard-focusable code region when content can scroll, SHALL expose the declared language to assistive technology, and SHALL allow an accessible label. Unrecognized attributes, including `class`, `style`, `data-*`, and `aria-*`, SHALL fall through to the root element, and caller classes MUST be merged with, not replace, built-in classes.

#### Scenario: Label and caller class are preserved

- **WHEN** a caller supplies an accessible label and a custom class
- **THEN** the root element carries both the caller class and the built-in classes
- **AND** the accessible label is present
- **AND** the code region can receive keyboard focus for scrolling
