---
name: Tactical Intelligence Interface
colors:
  surface: '#03161d'
  surface-dim: '#03161d'
  surface-bright: '#293c44'
  surface-container-lowest: '#001017'
  surface-container-low: '#0b1e25'
  surface-container: '#0f2229'
  surface-container-high: '#1a2c34'
  surface-container-highest: '#25373f'
  on-surface: '#d2e6f0'
  on-surface-variant: '#bfcbaf'
  inverse-surface: '#d2e6f0'
  inverse-on-surface: '#21333b'
  outline: '#89957b'
  outline-variant: '#404a35'
  surface-tint: '#7fde00'
  primary: '#deffba'
  on-primary: '#1c3700'
  primary-container: '#8bf108'
  on-primary-container: '#3a6900'
  inverse-primary: '#3a6a00'
  secondary: '#74d6d6'
  on-secondary: '#003737'
  secondary-container: '#369f9f'
  on-secondary-container: '#002f2f'
  tertiary: '#d3ffde'
  on-tertiary: '#00391e'
  tertiary-container: '#71f0a5'
  on-tertiary-container: '#006c3e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#95fc20'
  primary-fixed-dim: '#7fde00'
  on-primary-fixed: '#0e2000'
  on-primary-fixed-variant: '#2a5000'
  secondary-fixed: '#90f3f2'
  secondary-fixed-dim: '#74d6d6'
  on-secondary-fixed: '#002020'
  on-secondary-fixed-variant: '#004f50'
  tertiary-fixed: '#7cfbaf'
  tertiary-fixed-dim: '#5ede95'
  on-tertiary-fixed: '#00210f'
  on-tertiary-fixed-variant: '#00522e'
  background: '#03161d'
  on-background: '#d2e6f0'
  surface-variant: '#25373f'
typography:
  headline-lg:
    fontFamily: Archivo Narrow
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Archivo Narrow
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: 0.02em
  headline-sm:
    fontFamily: Archivo Narrow
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Archivo Narrow
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Archivo Narrow
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Archivo Narrow
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  label-md:
    fontFamily: Archivo Narrow
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.1em
  headline-lg-mobile:
    fontFamily: Archivo Narrow
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-tight: 4px
  stack-default: 12px
  section-gap: 24px
---

## Brand & Style

The design system is engineered for the "AI War Room" aesthetic—a high-stakes environment where precision, speed, and technical clarity are paramount. The personality is authoritative, tactical, and high-energy, evoking the feel of a sophisticated command center.

The design style leans into **High-Contrast / Modern Brutalism**. It utilizes a dark, immersive foundation to minimize eye strain during extended operations, punctuated by high-visibility neon accents that draw immediate attention to critical data points and system alerts. The visual language is disciplined, stripping away decorative fluff in favor of dense information density and functional geometry. It communicates a sense of "mission-critical" reliability.

## Colors

The palette is anchored by **Dark Forest (#005543)**, providing a deep, monochromatic base that serves as the "void" for the interface. 

- **Neon Lime (#8bf108)** is the Primary highlight color, reserved for high-visibility data, active states, and critical "Go" signals. Its high luminance ensures it vibrates against the dark background.
- **Deep Teal (#0d8888)** acts as the secondary action color, used for primary buttons and interactive components that require focus without the urgency of the lime.
- **Emerald (#00a260)** provides tonal support for secondary UI elements and positive status indicators.
- **Muted Slate (#6e818a)** is used for technical metadata, borders, and inactive states, grounding the more vibrant colors.
- **Surface Tints**: Use variations of Dark Forest for layering, shifting slightly toward the Teal for elevated panels.

## Typography

This design system exclusively utilizes **Archivo Narrow** to achieve a condensed, technical, and data-efficient feel. 

- **Tactical Headers**: All headlines and labels must be uppercase with increased letter spacing to enhance legibility and provide an "instrument panel" aesthetic.
- **Weight Strategy**: Use Bold (700) for structural hierarchy and Regular (400) for data readouts and body text.
- **Labels**: Small labels are treated as "Status Codes"—they should be tracked out heavily (0.1em) to ensure they look intentional and distinct from body copy.

## Layout & Spacing

The layout follows a **Rigid Grid** philosophy. Content is packed densely to simulate an information-rich dashboard, but organized with strict alignment to maintain order.

- **Grid**: A 12-column grid for desktop with 16px gutters.
- **Rhythm**: All spacing is derived from a 4px base unit. 
- **Density**: Prefer tight "stack-tight" (4px) margins between related data points and their labels. Sections should be separated by clear, visible borders rather than excessive whitespace.
- **Reflow**: On mobile, layouts collapse into a single column, but maintain the 16px horizontal margin to maximize screen real estate for technical data.

## Elevation & Depth

Hierarchy in this design system is achieved through **Tonal Layers and Technical Outlines** rather than traditional shadows.

- **Surface Tiers**: Use #005543 as the base. Elevated containers use a slightly lighter version of the background or a subtle Deep Teal stroke.
- **Outer Glows**: Rare, low-spread glows using Neon Lime (#8bf108) may be applied to "Active" or "Alarm" states to simulate a backlit screen effect.
- **Borders**: Instead of shadows, use 1px solid borders in Muted Slate (#6e818a) or Emerald (#00a260) to define component boundaries. This maintains the "War Room" tool vibe.

## Shapes

The shape language is **Precision-Focused**. 

- **Corner Radius**: Elements use a standard `rounded-sm` (4px) radius. This provides just enough softening to prevent the UI from feeling "broken" while maintaining a sharp, professional tool aesthetic.
- **Geometric Rigidity**: Avoid circles unless used for status pips or specific iconography. Buttons, inputs, and cards should remain rectangular with the specified subtle rounding.

## Components

- **Buttons**:
    - *Primary Action*: Deep Teal background with White or Neon Lime text.
    - *Highlight Action*: Neon Lime background with Dark Forest text (high-visibility).
    - *Ghost*: 1px Muted Slate border with uppercase label text.
- **Input Fields**: Darker surface background with a 1px Muted Slate border that turns Neon Lime on focus. Labels sit directly above the field in `label-md` style.
- **Status Chips**: Small, rectangular blocks with background colors corresponding to system status (Neon Lime for 'Active', Muted Slate for 'Standby').
- **Data Cards**: No shadows. Use 1px Emerald borders and a slightly lighter surface tint. Use `label-lg` for card titles.
- **HUD Elements**: Vertical and horizontal lines (1px) in Muted Slate can be used to further divide complex data sets, mimicking heads-up display crosshairs.
- **Telemetry Lists**: Monospaced-style data lists (using Archivo Narrow) with alternating row highlights using a 5% opacity Emerald overlay.