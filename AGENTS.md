# AGENTS.md - Developer Guide

## Overview

Static GitHub Pages website showcasing DJ mixes and portfolio. Plain HTML/CSS/JS - no build step, no dependencies.

## Structure

```
/
├── index.html          # Main page - loads mixes dynamically
├── about.html          # About page (legacy, minimal styling)
├── styles/
│   └── main.css        # All styling (CSS custom properties)
├── js/
│   └── main.js         # Mix loading & parsing logic
├── mixes/
│   └── 2024/           # Source mix files (Traaktor exports)
└── stylesheet.css      # Legacy - unused
```

## Key Features

### Mix Loading (js/main.js)
- Fetches HTML files from `mixes/2024/`
- Parses Traaktor export tables
- Renders essential columns: Title, Artist, Genre, BPM, Key, Duration

### Scrollable Tables
- Each mix in its own `<section class="mix-section">`
- Table container has `max-height: 400px` with `overflow-y: auto`
- Custom scrollbar styling matches theme

### Design
- Minimalist aesthetic, CSS custom properties in `:root`
- Responsive: hides less important columns on mobile
- Sticky header and table headers

## Adding a New Mix

1. Export mix from Traaktor as HTML
2. Save to `mixes/2024/YYYY-MM-DD.html`
3. Add entry to `mixFiles` array in `js/main.js`:
   ```js
   { id: '2025-01-15', file: 'mixes/2024/2025-01-15.html' }
   ```

## Testing Locally

Open `index.html` in a browser. For fetch to work, serve via local server:

```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

## Deploy

Push to `main` branch. GitHub Pages serves automatically from root.