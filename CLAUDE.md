# CLAUDE.md - Project Guide for AI Assistants

## Project Overview

This is a static site catalog that aggregates Nextflow modules and subworkflows from multiple GitHub repositories. It fetches module metadata from `meta.yml` files following nf-core conventions and generates a searchable, filterable catalog.

**Tech Stack:** Astro, Tailwind CSS v4, vanilla JavaScript

**Deployment:** GitHub Pages via GitHub Actions (daily builds)

## Key Commands

```bash
npm install          # Install dependencies
npm run fetch-modules # Clone repos and parse meta.yml files → generates src/data/modules.json
npm run dev          # Start dev server at localhost:4321
npm run build        # Build to ./dist
```

## Project Structure

```
├── repos.config.json        # Repository sources configuration
├── scripts/fetch-modules.js # Clones repos, parses meta.yml, outputs modules.json
├── src/
│   ├── data/modules.json    # Generated module data (do not edit manually)
│   ├── components/
│   │   ├── Header.astro
│   │   ├── ModuleCard.astro      # Card view item
│   │   └── ModuleListItem.astro  # List view item
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro           # Home page with filters
│   │   └── modules/[slug].astro  # Module detail pages
│   └── styles/global.css
├── astro.config.mjs         # Site URL and base path config
└── .github/workflows/deploy.yml
```

## Data Flow

1. `repos.config.json` defines source repositories
2. `fetch-modules.js` clones repos into `repos/` (gitignored), finds `meta.yml` files
3. Parsed data written to `src/data/modules.json`
4. Astro pages import and render the JSON data

## Module Data Schema

```typescript
interface Module {
  name: string;           // e.g., "cellpose"
  slug: string;           // URL-friendly: "janelia-module-cellpose"
  description: string;
  type: "module" | "subworkflow";
  source: string;         // e.g., "janelia"
  sourceLabel: string;    // e.g., "Janelia"
  repository: string;     // GitHub URL to module directory
  keywords: string[];
  tools?: { name, description?, homepage?, licence? }[];
  components?: string[];  // For subworkflows - references other modules
  authors: string[];
  maintainers?: string[];
  inputs?: { name, type?, description? }[];
  outputs?: { name, type?, description? }[];
}
```

## Filtering System

The index page uses client-side filtering via data attributes (no external library):

- `data-org` - GitHub organization
- `data-type` - "module" or "subworkflow"
- `data-searchtext` - Lowercase concatenation of all searchable fields

JavaScript in `index.astro` shows/hides elements based on filter inputs.

## Styling Conventions

- **Module type badge:** Blue (`bg-blue-100 text-blue-700`)
- **Subworkflow type badge:** Purple (`bg-purple-100 text-purple-700`)
- **Keywords/tags:** Gray (`bg-gray-100 text-gray-600`)
- **Component links:** Styled by target type (blue for modules, purple for subworkflows)

## Component Linking

In `[slug].astro`, the `findModule()` function matches component names to modules:
- Handles slash-to-underscore conversion (`spatial/cellpose` → `spatial_cellpose`)
- Prioritizes same-source matches
- Falls back to any source

## Adding a New Repository Source

1. Edit `repos.config.json`:
```json
{
  "name": "identifier",
  "label": "Display Name",
  "url": "https://github.com/org/repo.git"
}
```

2. Run `npm run fetch-modules`

Repository must have `modules/` or `subworkflows/` directories with `meta.yml` files.

## GitHub Pages Configuration

In `astro.config.mjs`:
- `site`: Full URL (e.g., `https://bioimagetools.github.io`)
- `base`: Path prefix (e.g., `/nf-module-aggregator/`)

All internal links use `import.meta.env.BASE_URL` prefix.

## Common Tasks

**Add a new field from meta.yml:**
1. Update parsing in `scripts/fetch-modules.js`
2. Update TypeScript interface in `[slug].astro`
3. Add display logic to detail page or cards

**Modify filters:**
- Filter UI: `index.astro` Filters section
- Filter logic: `applyFilters()` function in `<script>` block
- Data attributes: `ModuleCard.astro` and `ModuleListItem.astro`

**Change color scheme:**
- Type badges: Search for `bg-blue-100` (module) and `bg-purple-100` (subworkflow)
- Keywords: Search for `bg-gray-100 text-gray-600`
