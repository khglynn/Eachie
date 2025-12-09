# Chalk/Hand-Drawn SVG Animation Technique

## Core Concept
Animate SVG paths using `stroke-dasharray` and `stroke-dashoffset` CSS properties, combined with SVG filters for texture. This creates a "drawing itself" effect that's GPU-accelerated and works at any size.

## The Animation Trick

```javascript
// 1. Create an SVG path
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('d', 'M 10 50 L 190 50'); // Any path data
path.setAttribute('stroke', '#f0f0f0');
path.setAttribute('fill', 'none');

// 2. Get the path's total length
const length = path.getTotalLength();

// 3. Set dash array to full length (creates one "dash" that covers entire path)
path.style.strokeDasharray = length;

// 4. Offset it by full length (hides the entire path)
path.style.strokeDashoffset = length;

// 5. Animate offset to 0 (reveals the path progressively)
path.style.animation = 'draw 2s ease forwards';

// CSS keyframe:
// @keyframes draw { to { stroke-dashoffset: 0; } }
```

## Chalk Texture Filter

```xml
<filter id="chalk" x="-20%" y="-20%" width="140%" height="140%">
  <!-- Generate noise pattern -->
  <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="4" result="noise"/>
  <!-- Displace the stroke using the noise (creates wobbly edges) -->
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5"/>
  <!-- Slight blur for dusty chalk look -->
  <feGaussianBlur stdDeviation="0.35"/>
</filter>
```

Apply with: `path.setAttribute('filter', 'url(#chalk)')`

## Filter Parameters Explained

| Parameter | Effect | Chalk Value | Pencil Value |
|-----------|--------|-------------|--------------|
| `baseFrequency` | Noise density (higher = finer grain) | 0.4-0.6 | 1.0-1.5 |
| `numOctaves` | Noise complexity | 3-4 | 2-3 |
| `scale` | Displacement amount (higher = more wobbly) | 2-3 | 0.8-1.2 |
| `stdDeviation` | Blur amount | 0.3-0.5 | 0-0.2 |

## Dynamic Progress Control

Instead of CSS animation, use JavaScript to control progress:

```javascript
function setProgress(path, progress) {
  // progress is 0-1
  const length = path.getTotalLength();
  path.style.strokeDashoffset = length * (1 - progress);
}

// Example: update based on data loading
fetch('/api/data').then(response => {
  const reader = response.body.getReader();
  const total = response.headers.get('content-length');
  let loaded = 0;
  
  reader.read().then(function process({ done, value }) {
    if (done) return;
    loaded += value.length;
    setProgress(progressBar, loaded / total);
    return reader.read().then(process);
  });
});
```

## Animating Individual Elements (Stitches, Ticks, Blocks)

For discrete elements that appear one-at-a-time:

```javascript
const elements = []; // Array of SVG elements to reveal

function showUpTo(index) {
  elements.forEach((el, i) => {
    el.style.opacity = i <= index ? 1 : 0;
  });
}

// Or animate each element's own stroke-dashoffset
function animateElement(el, duration = 100) {
  const len = el.getTotalLength?.() || 20;
  el.style.strokeDasharray = len;
  el.style.strokeDashoffset = len;
  el.style.transition = `stroke-dashoffset ${duration}ms ease`;
  requestAnimationFrame(() => {
    el.style.strokeDashoffset = 0;
  });
}
```

## Fill Patterns (Scribble, Hachure, Crosshatch)

For filling shapes with hand-drawn texture:

```javascript
// Generate scribble lines within a bounding box
function generateScribble(x, y, width, height, density = 8) {
  const lines = [];
  for (let i = 0; i < width; i += density) {
    // Diagonal lines with slight randomness
    const x1 = x + i + (Math.random() - 0.5) * 3;
    const y1 = y + (Math.random() - 0.5) * 3;
    const x2 = x + i + height * 0.3 + (Math.random() - 0.5) * 3;
    const y2 = y + height + (Math.random() - 0.5) * 3;
    lines.push({ x1, y1, x2, y2 });
  }
  return lines;
}
```

## Performance Notes

- SVG filters have a performance cost; avoid applying to 100+ elements simultaneously
- `stroke-dashoffset` animation is GPU-accelerated and very efficient
- For complex scenes, consider using a single `<path>` with multiple subpaths rather than many separate elements
- `getTotalLength()` is synchronous and fast, but cache the value if calling repeatedly

## Browser Support

- `stroke-dasharray` / `stroke-dashoffset`: Universal (IE9+)
- SVG filters: Universal (IE10+)
- `getTotalLength()`: Universal

## File Size

This technique requires zero external libraries. Total overhead: ~0 KB (just your path data and filter definitions).
