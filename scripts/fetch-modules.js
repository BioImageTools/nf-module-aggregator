#!/usr/bin/env node

/**
 * Fetch module data from configured repositories
 *
 * This script clones nf-core module repositories locally and extracts
 * metadata from meta.yml files to populate the static site catalog.
 *
 * Usage: npm run fetch-modules
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const REPOS_DIR = join(PROJECT_ROOT, 'repos');
const CONFIG_PATH = join(PROJECT_ROOT, 'repos.config.json');
const OUTPUT_PATH = join(PROJECT_ROOT, 'src', 'data', 'modules.json');

/**
 * Load repository configuration
 */
function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Configuration file not found: ${CONFIG_PATH}`);
  }
  const content = readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Clone or update a repository using shallow clone
 */
function cloneOrUpdateRepo(repo) {
  const repoPath = join(REPOS_DIR, repo.name);

  if (existsSync(repoPath)) {
    console.log(`  Updating ${repo.name}...`);
    try {
      execSync('git fetch --depth 1 origin && git reset --hard origin/HEAD', {
        cwd: repoPath,
        stdio: 'pipe',
      });
    } catch (error) {
      console.warn(`  Warning: Failed to update ${repo.name}, re-cloning...`);
      execSync(`rm -rf "${repoPath}"`);
      execSync(`git clone --depth 1 "${repo.url}" "${repoPath}"`, { stdio: 'pipe' });
    }
  } else {
    console.log(`  Cloning ${repo.name}...`);
    mkdirSync(REPOS_DIR, { recursive: true });
    execSync(`git clone --depth 1 "${repo.url}" "${repoPath}"`, { stdio: 'pipe' });
  }

  // Detect default branch name
  let defaultBranch = 'main';
  try {
    const ref = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      cwd: repoPath,
      stdio: 'pipe',
    }).toString().trim();
    defaultBranch = ref.replace('refs/remotes/origin/', '');
  } catch {
    // fallback to 'main'
  }

  return { repoPath, defaultBranch };
}

/**
 * Recursively find all meta.yml files in a directory
 */
function findMetaFiles(dir, files = []) {
  if (!existsSync(dir)) {
    return files;
  }

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findMetaFiles(fullPath, files);
    } else if (entry === 'meta.yml' || entry === 'meta.yaml') {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse a meta.yml file and extract module information
 */
function parseMetaFile(metaPath, repo, type, defaultBranch) {
  try {
    const content = readFileSync(metaPath, 'utf-8');
    const meta = parseYaml(content);

    if (!meta || !meta.name) {
      console.warn(`  Warning: Invalid meta.yml at ${metaPath}`);
      return null;
    }

    // Determine the module path relative to repo for GitHub URL
    const repoPath = join(REPOS_DIR, repo.name);
    const relativePath = metaPath.replace(repoPath + '/', '').replace('/meta.yml', '').replace('/meta.yaml', '');

    // Create URL-friendly slug
    const slug = `${repo.name}-${type}-${meta.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Build GitHub URL to the module directory
    const repoBaseUrl = repo.url.replace(/\.git$/, '');
    const repository = `${repoBaseUrl}/tree/${defaultBranch}/${relativePath}`;

    // Process tools (may be array of objects with tool name as key)
    let tools = [];
    if (meta.tools && Array.isArray(meta.tools)) {
      tools = meta.tools.map((tool) => {
        if (typeof tool === 'string') {
          return { name: tool };
        }
        // Handle object format: { "tool_name": { description, homepage, ... } }
        const toolName = Object.keys(tool)[0];
        const toolInfo = tool[toolName] || {};
        return {
          name: toolName,
          description: toolInfo.description,
          homepage: toolInfo.homepage,
          documentation: toolInfo.documentation,
          licence: toolInfo.licence || toolInfo.license,
        };
      });
    }

    // Process inputs
    let inputs = [];
    if (meta.input && Array.isArray(meta.input)) {
      inputs = meta.input.map((input) => {
        if (typeof input === 'string') {
          return { name: input };
        }
        const inputName = Object.keys(input)[0];
        const inputInfo = input[inputName] || {};
        return {
          name: inputName,
          type: inputInfo.type,
          description: inputInfo.description,
          pattern: inputInfo.pattern,
        };
      });
    }

    // Process outputs
    let outputs = [];
    if (meta.output && Array.isArray(meta.output)) {
      outputs = meta.output.map((output) => {
        if (typeof output === 'string') {
          return { name: output };
        }
        const outputName = Object.keys(output)[0];
        const outputInfo = output[outputName] || {};
        return {
          name: outputName,
          type: outputInfo.type,
          description: outputInfo.description,
          pattern: outputInfo.pattern,
        };
      });
    }

    // Process authors/maintainers (remove @ prefix)
    const authors = (meta.authors || []).map((a) => (typeof a === 'string' ? a.replace(/^@/, '') : a));
    const maintainers = (meta.maintainers || []).map((m) => (typeof m === 'string' ? m.replace(/^@/, '') : m));

    return {
      name: meta.name,
      slug,
      description: meta.description || 'No description available',
      type,
      source: repo.name,
      sourceLabel: repo.label,
      repository,
      keywords: meta.keywords || [],
      tools: tools.length > 0 ? tools : undefined,
      components: meta.components || undefined,
      authors,
      maintainers: maintainers.length > 0 ? maintainers : undefined,
      inputs: inputs.length > 0 ? inputs : undefined,
      outputs: outputs.length > 0 ? outputs : undefined,
    };
  } catch (error) {
    console.warn(`  Warning: Failed to parse ${metaPath}: ${error.message}`);
    return null;
  }
}

/**
 * Check if a module matches the keyword filter configured for a repository.
 * If no keywordFilter is configured, all modules pass.
 */
function matchesKeywordFilter(module, repo) {
  if (!repo.keywordFilter || !Array.isArray(repo.keywordFilter)) {
    return true;
  }
  const keywords = (module.keywords || []).map(k => k.toLowerCase());
  return repo.keywordFilter.some(filter => keywords.includes(filter.toLowerCase()));
}

/**
 * Process a repository and extract all modules/subworkflows
 */
function processRepository(repo, defaultBranch) {
  const repoPath = join(REPOS_DIR, repo.name);
  const modules = [];

  // Find modules
  const modulesDir = join(repoPath, 'modules');
  const moduleMetaFiles = findMetaFiles(modulesDir);
  console.log(`  Found ${moduleMetaFiles.length} modules`);

  for (const metaPath of moduleMetaFiles) {
    const module = parseMetaFile(metaPath, repo, 'module', defaultBranch);
    if (module && matchesKeywordFilter(module, repo)) {
      modules.push(module);
    }
  }

  // Find subworkflows
  const subworkflowsDir = join(repoPath, 'subworkflows');
  const subworkflowMetaFiles = findMetaFiles(subworkflowsDir);
  console.log(`  Found ${subworkflowMetaFiles.length} subworkflows`);

  for (const metaPath of subworkflowMetaFiles) {
    const subworkflow = parseMetaFile(metaPath, repo, 'subworkflow', defaultBranch);
    if (subworkflow && matchesKeywordFilter(subworkflow, repo)) {
      modules.push(subworkflow);
    }
  }

  return modules;
}

/**
 * Main function
 */
async function main() {
  console.log('Fetching module data from repositories...\n');

  // Load configuration
  const config = loadConfig();
  console.log(`Found ${config.repositories.length} repositories in configuration\n`);

  // Process each repository
  const allModules = [];

  for (const repo of config.repositories) {
    console.log(`Processing ${repo.label} (${repo.name}):`);

    try {
      const { defaultBranch } = cloneOrUpdateRepo(repo);
      const modules = processRepository(repo, defaultBranch);
      allModules.push(...modules);
      console.log(`  Total: ${modules.length} items\n`);
    } catch (error) {
      console.error(`  Error processing ${repo.name}: ${error.message}\n`);
    }
  }

  // Sort modules by name
  allModules.sort((a, b) => a.name.localeCompare(b.name));

  // Ensure output directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  // Write modules to JSON file
  writeFileSync(OUTPUT_PATH, JSON.stringify({ lastUpdated: new Date().toISOString(), modules: allModules }, null, 2));

  console.log(`\nWrote ${allModules.length} modules to ${OUTPUT_PATH}`);

  // Summary by source
  const bySources = {};
  for (const m of allModules) {
    bySources[m.sourceLabel] = (bySources[m.sourceLabel] || 0) + 1;
  }
  console.log('\nSummary by source:');
  for (const [source, count] of Object.entries(bySources)) {
    console.log(`  ${source}: ${count}`);
  }

  // Summary by type
  const byType = {};
  for (const m of allModules) {
    byType[m.type] = (byType[m.type] || 0) + 1;
  }
  console.log('\nSummary by type:');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
