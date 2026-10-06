import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(repositoryRoot, 'node_modules/typeorm/cli-ts-node-esm.js');
const dataSourcePath = join(repositoryRoot, 'test/fixtures/typeorm-cli/data-source.ts');
const temporaryDirectory = await mkdtemp(join(repositoryRoot, '.fo014-typeorm-cli-'));
const migrationPrefix = join(temporaryDirectory, 'CliSmoke');

function runCli(arguments_, environment = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...arguments_], {
    cwd: repositoryRoot,
    env: { ...process.env, ...environment },
    encoding: 'utf8'
  });

  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(`TypeORM CLI failed with exit code ${result.status ?? 'unknown'}`);
  }
}

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
let connected = false;

try {
  await client.connect();
  connected = true;
  await client.query('DROP TABLE IF EXISTS fo014_cli_smoke');
  await client.query('DROP TABLE IF EXISTS fo014_cli_smoke_migrations');

  runCli(['migration:generate', migrationPrefix, '-d', dataSourcePath]);

  const generatedFiles = (await readdir(temporaryDirectory)).filter((file) => file.endsWith('.ts'));
  if (generatedFiles.length !== 1) {
    throw new Error(`Expected one generated migration, found ${generatedFiles.length}`);
  }

  const environment = {
    TYPEORM_SMOKE_MIGRATIONS: join(temporaryDirectory, generatedFiles[0])
  };

  runCli(['migration:show', '-d', dataSourcePath], environment);
  runCli(['migration:run', '-d', dataSourcePath], environment);

  const afterRun = await client.query("SELECT to_regclass('public.fo014_cli_smoke') AS table_name");
  if (afterRun.rows[0]?.table_name !== 'fo014_cli_smoke') {
    throw new Error('Generated migration did not create the smoke table');
  }

  runCli(['migration:show', '-d', dataSourcePath], environment);
  runCli(['migration:revert', '-d', dataSourcePath], environment);

  const afterRevert = await client.query("SELECT to_regclass('public.fo014_cli_smoke') AS table_name");
  if (afterRevert.rows[0]?.table_name !== null) {
    throw new Error('Migration revert did not remove the smoke table');
  }
} finally {
  try {
    if (connected) {
      await client.query('DROP TABLE IF EXISTS fo014_cli_smoke');
      await client.query('DROP TABLE IF EXISTS fo014_cli_smoke_migrations');
    }
  } finally {
    if (connected) {
      await client.end();
    }
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
