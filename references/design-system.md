# Design System & UI Specifications

## Philosophy: Restrained, Mindful Satire
The UI is styled as a genuine, calm, and contemplative mindfulness journal. When the roast lands, a deliberate dramatic cut flips the mood instantly.

- **Strict Prohibitions**:
  - No gradients, glows, or glassmorphism.
  - No decorative animated backgrounds, pulsing dots, or floating particles.
  - No typewriter text effects or blur-in animations.
  - No emoji icons (use Lucide icons exclusively).
  - No unstyled generic colors.

## Color Tokens & Palettes

### Default Theme (Calm Light Mode)
- **Background**: `#FAF8F5` (warm cream)
- **Surface**: `#FFFFFF` (pure clean card)
- **Border**: `#E7E2DA` (subtle 1px divider)
- **Foreground / Text**: `#1F1B16` (deep warm charcoal)
- **Muted Text**: `#6B645B` (soft earth brown)
- **Primary Button**: `#1F1B16` with light text (`#FAF8F5`)

### Reveal & Burn Mode (`data-theme="burn"`)
- Applied **only** on roast reveal, 404, and 500 error screens.
- **Background**: `#000000` (deep void)
- **Foreground / Text**: `#FFFFFF`
- **Muted Text**: `#8A8A8A`
- **Burn Accent**: `#C62828` (Crimson red, used strictly for the small "The burn" pill/label)

## Typography
- **UI & Body**: Sans-serif (Geist Sans / Inter)
- **Headlines & Gratitude Input Prompt**: Serif (Newsreader / Playfair / Merriweather)
- Standard scale: 12px, 14px, 16px, 20px, 24px, 32px.

## Micro-Interactions & Transitions
- Standard hover and focus transitions: <= 150 ms ease.
- Roast Reveal transition: Instant cut to black background, roast text fade-in within 400 ms.
- Audio Effects (Web Audio API, synthesized):
  - Typing click: 0.12s sine blip (520 Hz -> 700 Hz, gain 0.04), throttled to max 1 per 90ms.
  - Roast Boom: 140 Hz -> 40 Hz pitch sweep over 0.6s + 0.25s subtle noise burst.
- Accessibility: Respect `@media (prefers-reduced-motion: reduce)`. Minimum tap target size 44x44px. Visible keyboard focus rings.
