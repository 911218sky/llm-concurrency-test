# LLMTest UI Design Contract

## 0. Product intent

LLMTest is a focused, browser-based load-testing workbench for OpenAI-compatible and Anthropic chat APIs. The surface keeps the existing neo-brutalist character, but makes the operational states easier to scan in both light and dark themes. Language selection covers English, Traditional Chinese, and Simplified Chinese.

## 1. Atmosphere and layout

- Atmosphere: tactile developer tool, warm paper in light mode and charcoal workbench in dark mode.
- Main flow: compact utility header, short explanation, warning/relay guidance, one configuration panel, then result panels.
- Content width: `--content-max` (896px) with 16px minimum page gutters.
- Responsive behavior: header controls wrap on narrow screens; form controls use two columns at mobile and four columns at medium widths; result tables scroll horizontally instead of clipping.

## 2. Tokens

The source of truth is the CSS custom-property palette in `index.html`.

- Light page: `--bg-page: #fdfbf7`, `--bg-header: #ffffff`, `--bg-panel: #faebd7`, `--bg-input: #eff3f8`; this preserves the original warm pale-yellow surface.
- Dark page: `--bg-page: #121417`, `--bg-header: #191c21`, `--bg-panel: #20252c`, `--bg-input: #2a3038`.
- Text: `--text` for primary content and `--text-dim` for labels and supporting copy.
- Accent: `--accent-yellow` for active/attention states and `--accent-green-btn` for the primary action.
- Semantic fills: `--fill-success`, `--fill-danger`, and `--fill-warn` with matching text tokens.
- Borders use `--border-color`; dark-mode shadows use `--shadow-color` and remain visually dark rather than becoming white.

## 3. Typography

- Inter is the existing UI font, with weights 400, 500, 600, 700, and 800.
- Display heading: 3rem to 3.75rem, heavy weight, balanced wrapping.
- Body: 1rem to 1.125rem with a readable line height and constrained measure.
- Labels and table headings: compact semibold text with restrained tracking.
- Numeric result cells use tabular figures for scanability.

## 4. Primitives

- `neo-border`: 3px tokenized border and 8px radius for controls and lightweight framing.
- `neo-button`: tactile primary control with tokenized accent, shadow, hover, focus, active, and disabled states.
- `neo-input`: filled form control with a visible focus ring and tokenized placeholder text.
- `neo-panel`: elevated workbench section with a 4px border, 12px radius, and directional shadow.
- `language-select`: native select styled as a compact header control; options are English, 繁體中文, and 简体中文.
- `stat-box`, `verdict-box`, `track`, and `data-table`: result primitives reused by the live test output.
- `model-catalog`: collapsed-by-default metadata overview; each model card expands its own details without forcing a modal.

## 5. States and motion

- All interactive controls expose hover, active, disabled, and keyboard focus states.
- Theme and language choices persist in local storage and apply before the first paint where possible.
- Only transform, opacity, background, and color transitions are used; reduced-motion users receive no non-essential movement.
- Network, validation, loading, empty, success, warning, and error copy is translated through the same runtime dictionary.

## 6. Accessibility constraints and accepted debt

- Target WCAG 2.2 AA contrast for body text and controls.
- Every form field keeps a visible label; the language select has an accessible label.
- Keyboard focus is visible on all buttons, links, inputs, textareas, and selects.
- CJK copy uses balanced wrapping for headings and natural wrapping for body text; containers must not clip glyphs.

Accepted debt: the project remains a single vanilla HTML file and continues to load Tailwind CDN for its existing utility classes. A future component split can be considered separately; this change keeps the current deployment and relay behavior intact.
