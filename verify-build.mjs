import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(frontendRoot, 'dist');
const packageJson = JSON.parse(await readFile(path.join(frontendRoot, 'package.json'), 'utf8'));
const vitePackage = JSON.parse(await readFile(path.join(frontendRoot, 'node_modules/vite/package.json'), 'utf8').catch(() => '{"version":"missing"}'));
const reactPluginPackage = JSON.parse(await readFile(path.join(frontendRoot, 'node_modules/@vitejs/plugin-react/package.json'), 'utf8').catch(() => '{"version":"missing"}'));
const indexPath = path.join(distRoot, 'index.html');

function fail(message) {
  console.error(`BUILD VERIFICATION FAILED: ${message}`);
  process.exit(1);
}

let html;
try {
  html = await readFile(indexPath, 'utf8');
} catch {
  fail('frontend/dist/index.html is missing. Run the Vite production build first.');
}

if (!html.includes('<html') || !html.includes('</html>')) {
  fail('dist/index.html is not a complete HTML document.');
}
if (vitePackage.version !== packageJson.devDependencies?.vite) {
  fail(`Installed Vite ${vitePackage.version} does not match the pinned version ${packageJson.devDependencies?.vite}.`);
}
if (reactPluginPackage.version !== packageJson.devDependencies?.['@vitejs/plugin-react']) {
  fail(`Installed @vitejs/plugin-react ${reactPluginPackage.version} does not match the pinned version ${packageJson.devDependencies?.['@vitejs/plugin-react']}.`);
}
if (html.includes('/@vite/client') || html.includes('/src/main.jsx')) {
  fail('The output still contains Vite development/source entry references.');
}

const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((value) => !/^(?:https?:|data:|#)/i.test(value));
const assetReferences = references.filter((value) => /\.(?:m?js|css)(?:\?.*)?$/i.test(value));
if (!assetReferences.some((value) => /\.m?js(?:\?.*)?$/i.test(value))) {
  fail('No compiled JavaScript entry bundle is referenced by dist/index.html.');
}

for (const reference of assetReferences) {
  const clean = decodeURIComponent(reference.split('?')[0].split('#')[0]);
  const relative = clean.replace(/^\//, '');
  const resolved = path.resolve(distRoot, relative);
  if (!resolved.startsWith(`${distRoot}${path.sep}`) && resolved !== indexPath) {
    fail(`An asset reference escapes the dist folder: ${reference}`);
  }
  try {
    const info = await stat(resolved);
    if (!info.isFile() || info.size === 0) fail(`Referenced asset is missing or empty: ${reference}`);
  } catch {
    fail(`Referenced asset does not exist: ${reference}`);
  }
}

async function walk(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

const allFiles = await walk(distRoot);
const buildAssets = allFiles.filter((file) => /\.(?:m?js|css|wasm|woff2?|ttf|otf|bin)$/i.test(file));
if (!buildAssets.some((file) => /\.m?js$/i.test(file))) {
  fail('No JavaScript bundle exists under dist/assets.');
}

const manifestFiles = [];
for (const file of buildAssets) {
  const bytes = await readFile(file);
  const relative = path.relative(distRoot, file).split(path.sep).join('/');
  manifestFiles.push({
    file: relative,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
manifestFiles.sort((a, b) => a.file.localeCompare(b.file));

const manifest = {
  application: 'DS PDF Studio Tool',
  version: packageJson.version,
  verified: true,
  verifiedAtUtc: new Date().toISOString(),
  node: process.version,
  vite: vitePackage.version,
  reactPlugin: reactPluginPackage.version,
  entrypoint: 'index.html',
  totalAssetBytes: manifestFiles.reduce((sum, item) => sum + item.bytes, 0),
  assets: manifestFiles,
};

await writeFile(path.join(distRoot, 'BUILD-INFO.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`BUILD VERIFIED: DS PDF Studio Tool ${manifest.version}`);
console.log(`  Vite: ${manifest.vite}`);
console.log(`  Assets hashed: ${manifestFiles.length}`);
console.log(`  Asset bytes: ${manifest.totalAssetBytes}`);
console.log('  Manifest: frontend/dist/BUILD-INFO.json');
