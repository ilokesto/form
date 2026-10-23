import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { verifyCheckpoint, verifyHistory, verifyStandalone } from '../../scripts/verify-migration.mjs';

const repository = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(await readFile(path.join(repository, '.migration/source-manifest.json'), 'utf8'));
const git = (root, args) => execFileSync('git', ['--no-pager', '-C', root, ...args], {
  env: { ...process.env, GIT_MASTER: '1', GIT_PAGER: 'cat', PAGER: 'cat',
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.test',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.test' },
  stdio: 'pipe',
});
const put = async (root, file, value) => {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), JSON.stringify(value));
};

test('standalone workspace: own library and private runtime -> permitted without sibling links', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'form-workspace-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, ['init', '--quiet']);
  await put(root, 'package.json', { name: '@ilokesto/form', version: '9.0.0' });
  await put(root, 'website/package.json', { name: '@ilokesto/form-website', private: true, dependencies: {
    '@ilokesto/form': 'workspace:*', '@ilokesto/form-docs-runtime': 'workspace:*',
  } });
  await put(root, 'docs-publication/runtime/package.json', { name: '@ilokesto/form-docs-runtime', private: true,
    dependencies: { '@ilokesto/released-form': 'npm:@ilokesto/form@1.0.0' } });
  git(root, ['add', '.']);

  assert.equal((await verifyStandalone(root, manifest)).manifests, 3);

  await put(root, 'website/package.json', { name: '@ilokesto/form-website', private: true,
    dependencies: { '@ilokesto/store': 'workspace:*' } });
  await assert.rejects(verifyStandalone(root, manifest), /SIBLING_DEPENDENCY/);
  await put(root, 'website/package.json', { name: '@ilokesto/form-website', private: true,
    dependencies: { '@ilokesto/store': 'file:../../store' } });
  await assert.rejects(verifyStandalone(root, manifest), /EXTERNAL_DEPENDENCY_PATH/);
  await put(root, 'website/package.json', { name: '@ilokesto/form-website', private: false,
    dependencies: { '@ilokesto/form': 'workspace:*' } });
  await assert.rejects(verifyStandalone(root, manifest), /SIBLING_DEPENDENCY/);
  await put(root, 'website/package.json', { name: '@ilokesto/form-website', private: true,
    dependencies: { '@ilokesto/queryable': '0.0.1' } });
  await assert.rejects(verifyStandalone(root, manifest), /PRIVATE_PACKAGE_DEPENDENCY/);
  await put(root, 'website/package.json', { name: '@ilokesto/form-website', private: true });
  await put(root, 'examples/new-example/package.json', {
    name: '@ilokesto/form-new-example', private: true,
    dependencies: { '@ilokesto/store': 'workspace:*' },
  });
  await assert.rejects(verifyStandalone(root, manifest), /SIBLING_DEPENDENCY/);
});

test('checkpoint: future development commit and new version -> immutable history remains valid', async t => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'form-future-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'clone');
  git(repository, ['clone', '--no-local', '--quiet', repository, root]);
  const current = JSON.parse(await readFile(path.join(repository, 'package.json'), 'utf8'));
  current.version = '9.0.0';
  await put(root, 'package.json', current);
  await writeFile(path.join(root, 'future-development.txt'), 'future development\n');
  git(root, ['add', 'package.json', 'future-development.txt']);
  git(root, ['commit', '--quiet', '-m', 'Future development fixture']);

  const result = await verifyCheckpoint(root, manifest);

  assert.equal(result.checkpoint, manifest.checkpoint.commit);
  assert.notEqual(git(root, ['rev-parse', 'HEAD']).toString().trim(), manifest.checkpoint.commit);
  await verifyStandalone(root, manifest);
});

test('history: missing Sicilian typeSafety archive -> original-history proof fails', async t => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'form-missing-history-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'clone');
  git(repository, ['clone', '--no-local', '--quiet', repository, root]);
  const missing = 'refs/remotes/origin/legacy/sicilian/heads/typeSafety';
  git(root, ['update-ref', '-d', missing]);

  await assert.rejects(verifyHistory(root, manifest), /MISSING_ARCHIVE_REF: refs\/heads\/legacy\/sicilian\/heads\/typeSafety/);
});

async function pathFixture(t, workspaces = false) {
  await mkdir(path.join(repository, '.qa'), { recursive: true });
  const parent = await mkdtemp(path.join(repository, '.qa/form-path-repair-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'repo');
  const outside = path.join(parent, 'sibling');
  await mkdir(root);
  await mkdir(outside);
  git(root, ['init', '--quiet']);
  const files = ['package.json', ...(workspaces ? [
    'website/package.json', 'docs-publication/runtime/package.json',
    ...['react-array-register', 'react-validation-flow', 'solid-login-form',
      'svelte-login-form', 'vue-login-form'].map(name => `examples/${name}/package.json`),
  ] : [])];
  for (const file of files) {
    await put(root, file, JSON.parse(await readFile(path.join(repository, file), 'utf8')));
  }
  return { root, outside };
}

function standaloneCli(t, root) {
  const args = [path.join(repository, 'scripts/verify-migration.mjs'),
    'standalone', '--repo', root, '--manifest-stdin', '-'];
  const result = spawnSync(process.execPath, args, {
    cwd: root, input: JSON.stringify(manifest), encoding: 'utf8',
    timeout: 10_000, maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  t.diagnostic(JSON.stringify({
    command: [process.execPath, ...args], cwd: root,
    exitCode: result.status, stdout: result.stdout, stderr: result.stderr,
  }));
  return { exitCode: result.status, ...JSON.parse(result.status === 0 ? result.stdout : result.stderr) };
}

for (const staged of [false, true]) {
  test(`standalone paths: ${staged ? 'staged' : 'untracked'} current private workspaces -> all eight accepted`, async t => {
    const { root } = await pathFixture(t, true);
    if (staged) git(root, ['add', '.']);

    const result = standaloneCli(t, root);

    assert.equal(result.exitCode, 0);
    assert.equal(result.results[0].manifests, 8);
  });
}

for (const protocol of ['file', 'link']) {
  test(`standalone paths: ${protocol} normalized and symlink escapes -> rejected`, async t => {
    const { root, outside } = await pathFixture(t);
    await writeFile(path.join(root, '.gitignore'), 'escape\n');
    await symlink(outside, path.join(root, 'escape'), 'dir');
    git(root, ['add', '.']);
    for (const target of ['./../sibling', './nested/../../sibling', '.\\nested\\..\\..\\sibling', './escape', outside]) {
      await put(root, 'package.json', {
        name: '@ilokesto/form', dependencies: { probe: `${protocol}:${target}` },
      });

      const result = standaloneCli(t, root);

      assert.equal(result.exitCode, 1, target);
      assert.equal(result.code, 'EXTERNAL_DEPENDENCY_PATH', target);
    }
  });

  test(`standalone paths: internal ${protocol} dependency -> accepted`, async t => {
    const { root } = await pathFixture(t, true);
    await put(root, 'website/package.json', {
      name: '@ilokesto/form-website', private: true,
      dependencies: { '@ilokesto/form-docs-runtime': `${protocol}:../docs-publication/runtime` },
    });

    const result = standaloneCli(t, root);

    assert.equal(result.exitCode, 0);
    assert.equal(result.results[0].manifests, 8);
  });
}

test('standalone workspace: own name with external path or foreign alias -> rejected', async t => {
  const { root } = await pathFixture(t, true);
  for (const range of ['workspace:../../store', 'workspace:%2e%2e/%2e%2e/store', 'workspace:@ilokesto/store@*']) {
    await put(root, 'website/package.json', {
      name: '@ilokesto/form-website', private: true, dependencies: { '@ilokesto/form': range },
    });

    const result = standaloneCli(t, root);

    assert.equal(result.exitCode, 1);
    assert.equal(result.code, 'SIBLING_DEPENDENCY');
  }
});

test('standalone discovery: external manifest and directory symlinks -> rejected', async t => {
  const { root, outside } = await pathFixture(t);
  await put(outside, 'package.json', { name: '@ilokesto/form-website', private: true });
  await mkdir(path.join(root, 'website'));
  await symlink(path.join(outside, 'package.json'), path.join(root, 'website/package.json'));
  const manifestResult = standaloneCli(t, root);
  assert.equal(manifestResult.exitCode, 1);
  assert.equal(manifestResult.code, 'EXTERNAL_REPOSITORY_PATH');

  await rm(path.join(root, 'website'), { recursive: true });
  await symlink(outside, path.join(root, 'website'), 'dir');
  const directoryResult = standaloneCli(t, root);
  assert.equal(directoryResult.exitCode, 1);
  assert.equal(directoryResult.code, 'EXTERNAL_REPOSITORY_PATH');
});

test('pnpm local references: same-repository aliases, relative workspaces and literal percent -> accepted', async t => {
  const { root } = await pathFixture(t);
  await put(root, 'package.json', {
    name: '@ilokesto/form', version: '2.0.1', private: true, packageManager: 'pnpm@10.17.1',
  });
  await put(root, 'docs-publication/runtime/package.json', {
    name: '@ilokesto/form-docs-runtime', version: '0.0.0', private: true,
  });
  await put(root, '%2e%2e/payload/package.json', { name: 'form-percent-data', version: '1.0.0', private: true });
  await put(root, 'literal%/payload/package.json', { name: 'form-literal-data', version: '1.0.0', private: true });
  await put(root, 'website/package.json', {
    name: '@ilokesto/form-website', private: true,
    dependencies: {
      'root-alias': 'workspace:@ilokesto/form@^2.0.1',
      runtime: 'workspace:@ilokesto/form-docs-runtime@*',
      'relative-runtime': 'workspace:../docs-publication/runtime',
      'relative-root': 'workspace:..',
      'file-runtime': 'file://../docs-publication/runtime',
      'link-runtime': 'link://../docs-publication/runtime',
      'file-percent': 'file:../%2e%2e/payload',
      'link-percent': 'link:../%2e%2e/payload',
      'file-literal': 'file:../literal%/payload',
      'link-literal': 'link:../literal%/payload',
    },
  });
  await writeFile(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - .\n  - website\n  - docs-publication/runtime\n');
  const args = ['install', '--lockfile-only', '--offline', '--ignore-scripts', '--store-dir', path.join(root, '.pnpm-store')];

  const install = spawnSync('pnpm', args, { cwd: root, encoding: 'utf8', timeout: 30_000 });

  t.diagnostic(JSON.stringify({
    command: ['pnpm', ...args], cwd: root, exitCode: install.status,
    stdout: install.stdout, stderr: install.stderr,
  }));
  assert.equal(install.error, undefined);
  assert.equal(install.status, 0, install.stderr);
  const result = standaloneCli(t, root);
  assert.equal(result.exitCode, 0);
  assert.equal(result.results[0].manifests, 5);
});
