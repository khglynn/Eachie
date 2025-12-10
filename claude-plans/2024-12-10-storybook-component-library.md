# Plan 3: Storybook Component Library

**Created:** December 10, 2024
**Status:** Future (after Plan 1 & 2)
**Purpose:** Visualize all UI components, design system documentation, error state testing

---

## Overview

Add Storybook to Eachie to:
- See all components in isolation
- Test different props/states/themes
- Document the chalk design system
- Preview all error messages and alerts
- Help Kevin see "what's under the hood" with styling

---

## What to Document in Storybook

### Design System Components

| Component | Stories to Create |
|-----------|-------------------|
| `ChalkIcons` | All icons at different sizes |
| `ChalkFrame` | Regular, filtered, light variants |
| `ChalkProgressBar` | Various progress states |
| Buttons | Primary, secondary, disabled, loading |
| Cards | With/without content, different sizes |
| Modals | Open/closed, different content |
| Toasts | Success, error, warning, info |
| Banners | Different alert types |
| Form inputs | Empty, filled, error, disabled |

### Error States & Messages

| Message | Story |
|---------|-------|
| Free tier exhausted | Modal with sign-in CTA |
| Free tier paused | Banner explaining why |
| Rate limited | Toast with wait message |
| Query too expensive | Warning before submit |
| Payment failed | Toast with update CTA |
| Low balance | Subtle banner |

### Color Palette

Story showing all `paper-*` colors:
- paper-bg, paper-card, paper-surface
- paper-accent, paper-text, paper-muted
- paper-error, paper-warning, paper-success

---

## Setup Steps

### 1. Install Storybook

```bash
npx storybook@latest init
```

This will:
- Detect Next.js and configure accordingly
- Create `.storybook/` config folder
- Add `stories/` folder with examples
- Add npm scripts: `storybook`, `build-storybook`

### 2. Configure for Tailwind + Next.js

Update `.storybook/preview.ts`:

```typescript
import '../app/globals.css' // Include Tailwind styles
import type { Preview } from '@storybook/react'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'eachie',
      values: [
        { name: 'eachie', value: '#020F59' }, // paper-bg
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
}

export default preview
```

### 3. Add SVG Chalk Filter

The chalk filter needs to be available in Storybook. Add to `.storybook/preview-head.html`:

```html
<svg style="position: absolute; width: 0; height: 0;">
  <filter id="chalk">
    <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
    <feGaussianBlur stdDeviation="0.3"/>
  </filter>
</svg>
```

### 4. Create Component Stories

Example story for ChalkIcons:

```typescript
// stories/ChalkIcons.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import * as Icons from '@/components/ChalkIcons'

const meta: Meta = {
  title: 'Design System/Icons',
  parameters: {
    layout: 'centered',
  },
}

export default meta

export const AllIcons: StoryObj = {
  render: () => (
    <div className="grid grid-cols-4 gap-4 p-4">
      {Object.entries(Icons).map(([name, Icon]) => (
        <div key={name} className="flex flex-col items-center gap-2 text-paper-text">
          <Icon size={24} />
          <span className="text-xs text-paper-muted">{name}</span>
        </div>
      ))}
    </div>
  ),
}
```

### 5. Create Messages Stories

```typescript
// stories/Messages.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { MESSAGES } from '@/config/messages'
import { UpgradePrompt } from '@/components/UpgradePrompt'
import { Toast } from '@/components/Toast'
import { Banner } from '@/components/Banner'

const meta: Meta = {
  title: 'Messages/All Messages',
}

export default meta

export const FreeTierExhausted: StoryObj = {
  render: () => <UpgradePrompt message={MESSAGES.freeTierExhausted} />,
}

export const RateLimited: StoryObj = {
  render: () => <Toast message={MESSAGES.rateLimited} />,
}

// ... stories for each message
```

---

## File Structure After Setup

```
.storybook/
  main.ts           # Storybook config
  preview.ts        # Global decorators, backgrounds
  preview-head.html # SVG filter for chalk effect

stories/
  design-system/
    ChalkIcons.stories.tsx
    ChalkFrame.stories.tsx
    Colors.stories.tsx
    Typography.stories.tsx
  components/
    Buttons.stories.tsx
    Cards.stories.tsx
    Modals.stories.tsx
    Forms.stories.tsx
  messages/
    ErrorMessages.stories.tsx
    Alerts.stories.tsx
```

---

## npm Scripts

After setup, these will be available:

```bash
npm run storybook      # Start Storybook dev server (port 6006)
npm run build-storybook # Build static Storybook for deployment
```

---

## Optional: Deploy Storybook

Can deploy to:
- **Vercel** - Add as separate project pointing to `storybook-static/`
- **GitHub Pages** - Free, good for public components
- **Chromatic** - Storybook's own hosting (visual testing included)

URL could be: `storybook.eachie.ai` or `eachie-storybook.vercel.app`

---

## Implementation Order

1. Run `npx storybook@latest init`
2. Configure Tailwind and chalk filter
3. Create design system stories (icons, colors, frames)
4. Create component stories (buttons, cards, modals)
5. Create message stories (all error states)
6. Optional: Deploy to subdomain

---

## Time Estimate

- Initial setup: ~30 minutes
- Design system stories: ~1 hour
- Component stories: ~2 hours
- Message stories: ~30 minutes

**Total: ~4 hours**
