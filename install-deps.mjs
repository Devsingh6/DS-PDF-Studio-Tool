#!/usr/bin/env node
/**
 * Diagnose npm registry access before installing frontend dependencies.
 * Optional fallback must be explicitly supplied by the operator to avoid
 * silently switching package sources.
 */
import { spawnSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check-only');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runNpm(args, options = {}) {
  return spawnSync(npmCommand, args, {
    cwd: frontendRoot,
    encoding: 'utf8',
    timeout: options.timeout ?? 45_000,
    shell: process.platform === 'win32',
    env: options.env ?? process.env,
    maxBuffer: 8 * 1024 * 1024,
  });
}

function normaliseRegistry(value) {
  const parsed = new URL(value);
  const localHttp = parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !localHttp) {
    throw new Error('Registry must use HTTPS (HTTP is allowed only for localhost tests).');
  }
  return parsed.toString().endsWith('/') ? parsed.toString() : `${parsed.toString()}/`;
}

function printFailure(registry, result) {
  const details = [result.error?.message, result.stdout, result.stderr]
    .filter(Boolean)
    .join('\n')
    .trim();
  console.error(`\nERROR: npm cannot reach the configured registry: ${registry}`);
  if (/EAI_AGAIN|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|Could not resolve/i.test(details)) {
    console.error('The failure is DNS/network/proxy connectivity, not a React, Vite, or application-code error.');
  }
  if (details) console.error(details.split('\n').slice(-12).join('\n'));
  console.error('\nCheck connectivity from this computer:');
  console.error(`  nslookup ${new URL(registry).hostname}`);
  console.error('  npm ping --registry="' + registry + '"');
  console.error('\nOn Windows, also check VPN/proxy/firewall settings. If DNS recently changed, run:');
  console.error('  ipconfig /flushdns');
  console.error('\nFor an organisation-approved registry or mirror, set NPM_CONFIG_REGISTRY.');
  console.error('For an explicitly approved one-time fallback, set PDF_STUDIO_NPM_REGISTRY_FALLBACK.');
}

function registryFromNpmConfig() {
  const configured = process.env.NPM_CONFIG_REGISTRY || process.env.npm_config_registry;
  if (configured) return normaliseRegistry(configured);
  const result = runNpm(['config', 'get', 'registry'], { timeout: 10_000 });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.error?.message || 'Could not read npm registry configuration.');
  }
  return normaliseRegistry(String(result.stdout).trim());
}

async function checkRegistry(registry, env) {
  console.log(`Checking npm registry: ${registry}`);
  let lastResult;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = runNpm(
      ['ping', `--registry=${registry}`, '--fetch-retries=0', '--fetch-timeout=15000', '--loglevel=error'],
      { timeout: 25_000, env },
    );
    if (result.status === 0) {
      console.log('Registry connection successful.');
      return { ok: true, result };
    }
    lastResult = result;
    if (attempt < 3) {
      console.warn(`Registry check attempt ${attempt}/3 failed; retrying shortly...`);
      await delay(700 * attempt);
    }
  }
  return { ok: false, result: lastResult };
}

const packageJson = JSON.parse(await readFile(path.join(frontendRoot, 'package.json'), 'utf8'));
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const supportedNode = (nodeMajor === 20 && nodeMinor >= 19) || (nodeMajor === 22 && nodeMinor >= 12) || nodeMajor > 22;
if (!supportedNode) {
  console.error(`Vite 8 requires Node.js ^20.19.0 or ^22.12.0 (and newer supported majors). Current: ${process.version}`);
  process.exit(2);
}
const offlineMode = process.argv.includes('--offline') || process.env.PDF_STUDIO_NPM_OFFLINE === '1';
const directDependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
const lockExists = await access(path.join(frontendRoot, 'package-lock.json')).then(() => true).catch(() => false);

async function installedDependenciesMatch() {
  for (const [name, expectedVersion] of Object.entries(directDependencies)) {
    try {
      const installedPath = path.join(frontendRoot, 'node_modules', name, 'package.json');
      const installed = JSON.parse(await readFile(installedPath, 'utf8'));
      if (installed.version !== expectedVersion) return false;
    } catch {
      return false;
    }
  }
  const viteExecutable = path.join(
    frontendRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'vite.cmd' : 'vite',
  );
  try {
    await access(viteExecutable);
  } catch {
    return false;
  }
  // `npm ls` is local-only: it catches incomplete installs and invalid/missing
  // transitive or peer dependencies without contacting the registry.
  const tree = runNpm(['ls', '--depth=0'], { timeout: 30_000 });
  return tree.status === 0;
}

// A complete, version-matched node_modules installation is enough to build.
// Do not make a healthy local/offline build depend on an npm registry ping.
if (!checkOnly && await installedDependenciesMatch()) {
  console.log('All pinned React/Vite packages are already installed at the expected versions.');
  console.log('Skipping npm registry checks and dependency installation; proceeding with the local build.');
  process.exit(0);
}

let primary = null;
let selectedRegistry = null;
let activeEnv = { ...process.env };
let checked = { ok: true, result: null };

if (offlineMode) {
  console.log('Offline dependency mode enabled. Registry access will not be attempted.');
  if (await installedDependenciesMatch()) {
    console.log('Existing node_modules contains every pinned direct dependency.');
    if (checkOnly) process.exit(0);
    console.log('Using the verified local dependency installation without network access.');
    process.exit(0);
  }
} else {
  try {
    primary = registryFromNpmConfig();
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(2);
  }

  selectedRegistry = primary;
  checked = await checkRegistry(primary, activeEnv);
}

if (!offlineMode && !checked.ok) {
  const fallbackInput = process.env.PDF_STUDIO_NPM_REGISTRY_FALLBACK?.trim();
  if (fallbackInput) {
    let fallback;
    try {
      fallback = normaliseRegistry(fallbackInput);
    } catch (error) {
      console.error(`Invalid PDF_STUDIO_NPM_REGISTRY_FALLBACK: ${error.message}`);
      process.exit(2);
    }
    if (fallback === primary) {
      console.error('The configured fallback registry is the same as the primary registry.');
      printFailure(primary, checked.result);
      process.exit(2);
    }
    console.warn(`Primary registry unavailable. Trying the explicitly configured fallback: ${fallback}`);
    delete activeEnv.npm_config_registry;
    activeEnv.NPM_CONFIG_REGISTRY = fallback;
    const fallbackCheck = await checkRegistry(fallback, activeEnv);
    if (fallbackCheck.ok) {
      selectedRegistry = fallback;
      checked = fallbackCheck;
    } else {
      printFailure(fallback, fallbackCheck.result);
      process.exit(2);
    }
  } else if (!checkOnly) {
    // A complete npm cache can still produce the real Vite bundle without DNS.
    // This does not switch registries or trust a different package source.
    console.warn('npm registry is unavailable. Trying the existing local npm cache in offline mode...');
    const cacheArgs = lockExists
      ? ['ci', '--offline', '--no-audit', '--no-fund']
      : ['install', '--offline', '--no-audit', '--no-fund'];
    const cacheResult = runNpm(cacheArgs, { timeout: 15 * 60_000, env: activeEnv });
    if (cacheResult.status === 0) {
      console.log('Frontend dependencies were installed from the local npm cache. No registry access was used.');
      process.exit(0);
    }
    if (cacheResult.stdout) console.log(cacheResult.stdout);
    if (cacheResult.stderr) console.error(cacheResult.stderr);
    console.warn('The local npm cache does not contain every required package. A registry or approved mirror is still required.');
    printFailure(primary, checked.result);
    process.exit(cacheResult.status || 2);
  } else {
    printFailure(primary, checked.result);
    process.exit(2);
  }
}

if (checkOnly) {
  if (offlineMode) {
    console.log('Registry check skipped by offline mode.');
  } else {
    console.log(`Registry preflight passed: ${selectedRegistry}`);
  }
  process.exit(0);
}

const installCommand = lockExists ? 'npm ci' : 'npm install';
console.log(`Installing DS PDF Studio Tool ${packageJson.version} frontend dependencies with ${installCommand}${offlineMode ? ' --offline' : ''}...`);
if (!offlineMode && selectedRegistry !== primary) {
  console.log(`Using approved fallback registry: ${selectedRegistry}`);
}
const installArgs = lockExists
  ? ['ci', '--no-audit', '--no-fund', ...(offlineMode ? ['--offline'] : ['--fetch-retries=2', '--fetch-timeout=60000', `--registry=${selectedRegistry}`])]
  : ['install', '--no-audit', '--no-fund', ...(offlineMode ? ['--offline'] : ['--fetch-retries=2', '--fetch-timeout=60000', `--registry=${selectedRegistry}`])];
const installResult = runNpm(installArgs, {
  timeout: 15 * 60_000,
  env: activeEnv,
});
if (installResult.status !== 0) {
  if (installResult.stdout) console.log(installResult.stdout);
  if (installResult.stderr) console.error(installResult.stderr);
  console.error(`Frontend dependency installation failed (exit ${installResult.status ?? 'unknown'}).`);
  console.error(offlineMode ? 'Offline mode could not complete from the existing node_modules/npm cache. Connect to an approved registry or populate the npm cache first.' : 'The registry preflight succeeded; inspect the npm error above for a package, proxy, certificate, or disk issue.');
  process.exit(installResult.status || 1);
}
console.log('Frontend dependencies installed successfully.');
