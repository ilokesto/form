import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  accessSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const packageDirectory = fileURLToPath(new URL('../..', import.meta.url));
const sourceManifest = JSON.parse(readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'));
const qaDirectory = path.join(packageDirectory, '.qa');
mkdirSync(qaDirectory, { recursive: true });
assert.ok(realpathSync(qaDirectory).startsWith(realpathSync(packageDirectory) + path.sep),
  'Packed consumer QA directory escaped the package checkout');
const consumerDirectory = mkdtempSync(path.join(qaDirectory, 'packed-consumer-'));
const artifactsDirectory = path.join(consumerDirectory, 'artifacts');

const run = (command, args, cwd) => {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
};

const requireTarball = (packageName) => {
  const tarball = readdirSync(artifactsDirectory).find((entry) => entry.startsWith(packageName));
  if (tarball === undefined) throw new TypeError(`Missing ${packageName} tarball`);
  return path.join(artifactsDirectory, tarball);
};

try {
  run('pnpm', ['pack', '--pack-destination', artifactsDirectory], packageDirectory);

  const formTarball = requireTarball('ilokesto-form-');
  // The consumer must not join the owning library's workspace.
  writeFileSync(
    path.join(consumerDirectory, 'pnpm-workspace.yaml'),
    "packages:\n  - .\nlinkWorkspacePackages: false\n",
  );
  writeFileSync(
    path.join(consumerDirectory, 'package.json'),
    JSON.stringify({
      packageManager: sourceManifest.packageManager,
      dependencies: {
        '@ilokesto/form': `file:${formTarball}`,
        '@types/react': sourceManifest.devDependencies['@types/react'],
        immer: '11.1.8',
        react: sourceManifest.devDependencies.react,
        'solid-js': sourceManifest.devDependencies['solid-js'],
        svelte: sourceManifest.devDependencies.svelte,
        typescript: sourceManifest.devDependencies.typescript,
        vue: sourceManifest.devDependencies.vue,
      },
      private: true,
      type: 'module',
    }),
  );
  writeFileSync(
    path.join(consumerDirectory, 'verify.mjs'),
    `import { CreateForm } from '@ilokesto/form';
import { useForm as useReactForm } from '@ilokesto/form/react';
import { useForm as useSolidForm } from '@ilokesto/form/solid';
import { useForm as useSvelteForm } from '@ilokesto/form/svelte';
import { useForm as useVueForm } from '@ilokesto/form/vue';

for (const exportedValue of [CreateForm, useReactForm, useSolidForm, useSvelteForm, useVueForm]) {
  if (typeof exportedValue !== 'function') throw new TypeError('Expected a function export');
}
const form = new CreateForm({ defaultValues: { email: '' } });
form.setValue('email', 'packed');
if (form.getValue('email') !== 'packed') throw new TypeError('Packed form runtime failed');
`,
  );
  writeFileSync(
    path.join(consumerDirectory, 'types.ts'),
    `import type { ReactFormOptions } from '@ilokesto/form/react';
import type { SolidFormOptions } from '@ilokesto/form/solid';
import type { SvelteFieldSnapshot, SvelteFormOptions } from '@ilokesto/form/svelte';
import type { VueFormOptions } from '@ilokesto/form/vue';
import type { Accessor } from 'solid-js';
import type { Readable } from 'svelte/store';

type Values = { readonly email: string };
const externalValues: Values = { email: 'packed@example.com' };
const reactOptions: ReactFormOptions<Values> = {
  defaultValues: { email: '' },
  resetOptions: { keepDirtyValues: true },
  values: externalValues,
};
const vueOptions: VueFormOptions<Values> = {
  defaultValues: { email: '' },
  resetOptions: { keepDirtyValues: true },
  values: () => externalValues,
};
const solidValues: Accessor<Values | undefined> = () => externalValues;
const solidOptions: SolidFormOptions<Values> = {
  defaultValues: { email: '' },
  resetOptions: { keepDirtyValues: true },
  values: solidValues,
};
const svelteValues: Readable<Values | undefined> = {
  subscribe(run) {
    run(externalValues);
    return () => undefined;
  },
};
const svelteOptions: SvelteFormOptions<Values> = {
  defaultValues: { email: '' },
  resetOptions: { keepDirtyValues: true },
  values: svelteValues,
};
const snapshot: SvelteFieldSnapshot = {
  dirty: false,
  errors: [],
  touched: false,
  value: '',
};
void reactOptions;
void solidOptions;
void snapshot;
void svelteOptions;
void vueOptions;
`,
  );
  writeFileSync(
    path.join(consumerDirectory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        lib: ['DOM', 'ES2022'],
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        noEmit: true,
        strict: true,
        target: 'ES2022',
      },
      include: ['types.ts'],
    }),
  );

  run('pnpm', ['install', '--ignore-scripts', '--store-dir', path.join(consumerDirectory, '.pnpm-store')], consumerDirectory);
  run('node', ['verify.mjs'], consumerDirectory);
  run('pnpm', ['exec', 'tsc', '--noEmit'], consumerDirectory);

  const installedFormDirectory = path.join(consumerDirectory, 'node_modules/@ilokesto/form');
  for (const target of [
    'dist/index.js',
    'dist/index.d.ts',
    'dist/react/index.js',
    'dist/react/index.d.ts',
    'dist/solid/index.js',
    'dist/solid/index.d.ts',
    'dist/svelte/index.js',
    'dist/svelte/index.d.ts',
    'dist/vue/index.js',
    'dist/vue/index.d.ts',
  ]) {
    accessSync(path.join(installedFormDirectory, target));
  }

  const installedManifest = JSON.parse(
    readFileSync(path.join(installedFormDirectory, 'package.json'), 'utf8'),
  );
  const storeRange = installedManifest?.dependencies?.['@ilokesto/store'];
  assert.equal(storeRange, sourceManifest.dependencies['@ilokesto/store']);
  assert.match(storeRange, /^\d+\.\d+\.\d+$/, 'Store must resolve an exact registry version');
  assert.deepEqual(installedManifest.exports, sourceManifest.exports);
  assert.deepEqual(installedManifest.files, sourceManifest.files);
  assert.equal(installedManifest.version, sourceManifest.version);
  const physicalForm = realpathSync(installedFormDirectory);
  assert.ok(physicalForm.startsWith(path.join(realpathSync(consumerDirectory), 'node_modules') + path.sep),
    'Form escaped the isolated consumer');
  const locations = createRequire(path.join(physicalForm, 'package.json'))
    .resolve.paths('@ilokesto/store');
  const storeDirectory = locations.map(location => path.join(location, '@ilokesto/store'))
    .find(directory => {
      try { accessSync(path.join(directory, 'package.json')); return true; }
      catch (error) { if (error.code === 'ENOENT') return false; throw error; }
    });
  assert.ok(storeDirectory, 'Store did not resolve from the packed Form consumer');
  const physicalStore = realpathSync(storeDirectory);
  assert.ok(physicalStore.startsWith(path.join(realpathSync(consumerDirectory), 'node_modules') + path.sep),
    'Store escaped the isolated consumer');
  const storeManifest = JSON.parse(readFileSync(path.join(physicalStore, 'package.json'), 'utf8'));
  assert.equal(storeManifest.version, storeRange);
  const lock = parse(readFileSync(path.join(consumerDirectory, 'pnpm-lock.yaml'), 'utf8'));
  assert.deepEqual(Object.keys(lock.importers), ['.'], 'Consumer joined another workspace');
  const registryResolution = lock.packages[`@ilokesto/store@${storeRange}`]?.resolution;
  assert.match(registryResolution?.integrity ?? '', /^sha512-/, 'Store lacks registry integrity');
  assert.equal(registryResolution.tarball, undefined, 'Store must not use a tarball override');
  assert.equal(lock.overrides, undefined, 'Consumer overrides are forbidden');
  console.log(JSON.stringify({
    status: 'PACKED_CONSUMER_VERIFIED',
    package: installedManifest.name,
    version: installedManifest.version,
    adapters: ['core', 'react', 'solid', 'svelte', 'vue'],
    consumerDirectory,
    formDirectory: physicalForm,
    workspaceImporters: Object.keys(lock.importers),
    store: { version: storeManifest.version, directory: physicalStore, integrity: registryResolution.integrity },
    runtime: 'passed',
    types: 'passed',
  }));
} finally {
  rmSync(consumerDirectory, { force: true, recursive: true });
}
