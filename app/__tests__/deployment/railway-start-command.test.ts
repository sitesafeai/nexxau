import fs from 'fs';
import path from 'path';

const appRoot = path.resolve(__dirname, '../..');

function readAppFile(fileName: string): string {
  return fs.readFileSync(path.join(appRoot, fileName), 'utf8');
}

function readNextConfigs(): string[] {
  return ['next.config.js', 'next.config.ts']
    .map((fileName) => path.join(appRoot, fileName))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => fs.readFileSync(filePath, 'utf8'));
}

describe('Railway deployment config', () => {
  it('starts the app through the package start script unless a standalone server is built', () => {
    const railwayToml = readAppFile('railway.toml');
    const packageJson = JSON.parse(readAppFile('package.json'));
    const dockerfile = readAppFile('Dockerfile');
    const startCommand = railwayToml.match(/^\s*startCommand\s*=\s*"([^"]+)"/m)?.[1];
    const buildsStandaloneServer = readNextConfigs().some((config) =>
      /output\s*:\s*['"]standalone['"]/.test(config),
    );

    expect(packageJson.scripts.start).toBe('next start');
    expect(dockerfile).toContain('CMD ["npm", "run", "start"]');
    expect(buildsStandaloneServer).toBe(false);
    expect(startCommand).toBe('npm run start');
  });
});
