# Nextflow Module Aggregator

A static site catalog that aggregates Nextflow modules and subworkflows from multiple repositories. Built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Features

- Aggregates modules from multiple nf-core-style repositories
- Full-text search across all module metadata
- Filter by keyword, organization, or type (module/subworkflow)
- Card and list view modes
- Detailed module pages with inputs, outputs, tools, and component links
- Daily automated updates via GitHub Actions

## Data Sources

Modules are fetched from the following repositories (configured in `repos.config.json`):

| Source | Repository | Description |
|--------|------------|-------------|
| BioImageTools | [BioImageTools/nextflow-modules](https://github.com/BioImageTools/nextflow-modules) | Shared bioimaging modules |
| Sanger | [cellgeni/nf-modules](https://github.com/cellgeni/nf-modules) | Sanger/Cellgeni modules |
| Janelia | [JaneliaSciComp/nextflow-modules](https://github.com/JaneliaSciComp/nextflow-modules) | Janelia modules |

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/nf-module-aggregator.git
cd nf-module-aggregator

# Install dependencies
npm install

# Fetch module data from source repositories
npm run fetch-modules

# Start development server
npm run dev
```

The development server runs at `http://localhost:4321` by default.

### Project Structure

```
nf-module-aggregator/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow
├── repos/                      # Cloned repositories (gitignored)
├── scripts/
│   └── fetch-modules.js        # Script to fetch and parse module data
├── src/
│   ├── components/             # Astro components
│   │   ├── Header.astro
│   │   ├── ModuleCard.astro
│   │   ├── ModuleListItem.astro
│   │   └── SearchBar.astro
│   ├── data/
│   │   └── modules.json        # Generated module data
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro         # Home page with module list
│   │   └── modules/
│   │       └── [slug].astro    # Module detail pages
│   └── styles/
│       └── global.css
├── astro.config.mjs            # Astro configuration
├── repos.config.json           # Repository configuration
├── package.json
└── README.md
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production site to `./dist` |
| `npm run preview` | Preview production build locally |
| `npm run fetch-modules` | Fetch module data from configured repositories |

### Adding a New Repository Source

1. Edit `repos.config.json`:

```json
{
  "repositories": [
    {
      "name": "myorg",
      "label": "My Organization",
      "url": "https://github.com/myorg/nextflow-modules.git"
    }
  ]
}
```

2. Run `npm run fetch-modules` to fetch the new data

The repository must follow nf-core conventions with modules in `modules/` and/or `subworkflows/` directories, each containing a `meta.yml` file.

### Module Data Schema

Each module in `src/data/modules.json` has the following structure:

```typescript
interface Module {
  name: string;           // Module name
  slug: string;           // URL-friendly identifier
  description: string;    // Module description
  type: "module" | "subworkflow";
  source: string;         // Repository key (e.g., "janelia")
  sourceLabel: string;    // Display name (e.g., "Janelia")
  repository: string;     // GitHub URL to module directory
  keywords: string[];     // Search keywords
  tools?: Tool[];         // Tools used (for modules)
  components?: string[];  // Component modules (for subworkflows)
  authors: string[];      // GitHub usernames
  maintainers?: string[];
  inputs?: IOSpec[];      // Input specifications
  outputs?: IOSpec[];     // Output specifications
}
```

## Deployment

### GitHub Pages (Recommended)

The site is configured to deploy automatically to GitHub Pages.

#### Initial Setup

1. **Push to GitHub**

   ```bash
   git remote add origin https://github.com/YOUR_ORG/nf-module-aggregator.git
   git push -u origin main
   ```

2. **Update Astro Configuration**

   Edit `astro.config.mjs` to match your GitHub organization:

   ```javascript
   export default defineConfig({
     site: 'https://YOUR_ORG.github.io',
     base: '/nf-module-aggregator/',
     // ...
   });
   ```

3. **Enable GitHub Pages**

   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under "Build and deployment", set **Source** to "GitHub Actions"

4. **Trigger Deployment**

   The workflow runs automatically on push to `main`. To trigger manually:
   - Go to the **Actions** tab
   - Select "Deploy to GitHub Pages"
   - Click **Run workflow**

#### Automated Updates

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs:
- **Daily at 6 AM UTC** - fetches latest module data
- **On push to main** - deploys changes
- **Manually** - via workflow dispatch

### Manual Deployment

To build and deploy manually:

```bash
# Fetch latest module data
npm run fetch-modules

# Build the site
npm run build

# Generate search index
npx pagefind --site dist

# Deploy the ./dist directory to your hosting provider
```

## Configuration

### Astro Configuration (`astro.config.mjs`)

Key settings:
- `site` - Your deployment URL (e.g., `https://myorg.github.io`)
- `base` - Base path for the site (e.g., `/nf-module-aggregator/`)
- `output` - Set to `static` for static site generation

### Repository Configuration (`repos.config.json`)

Configure which repositories to fetch modules from:

```json
{
  "repositories": [
    {
      "name": "identifier",      // Used in slugs and data
      "label": "Display Name",   // Shown in UI
      "url": "https://github.com/org/repo.git"
    }
  ]
}
```

## Search

The site uses [Pagefind](https://pagefind.app/) for client-side search. The search index is generated during the build process and enables fast, full-text search across all module content.

## License

MIT
