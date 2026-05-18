import fs from 'fs';
import path from 'path';

function readAppFile(fileName: string) {
  return fs.readFileSync(path.join(process.cwd(), fileName), 'utf8');
}

function getRailwayStartCommand() {
  const railwayToml = readAppFile('railway.toml');
  const match = railwayToml.match(/^\s*startCommand\s*=\s*"([^"]+)"\s*$/m);
  return match?.[1];
}

describe('Railway app deployment config', () => {
  it('starts the Next.js app with the packaged npm start script', () => {
    const startCommand = getRailwayStartCommand();
    const dockerfile = readAppFile('Dockerfile');
    const packageJson = JSON.parse(readAppFile('package.json'));

    expect(packageJson.scripts.start).toBe('next start');
    expect(dockerfile).toContain('CMD ["npm", "run", "start"]');
    expect(startCommand).toBe('npm run start');
  });
});
