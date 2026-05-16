const fs = require('fs');
const path = require('path');

const appRoot = path.join(__dirname, '..', '..');

function readAppFile(fileName) {
  return fs.readFileSync(path.join(appRoot, fileName), 'utf8');
}

function readTomlStringValue(toml, key) {
  const match = toml.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, 'm'));
  return match ? match[1] : undefined;
}

describe('Railway deployment config', () => {
  it('starts the Next app with the same npm start script as the Docker image', () => {
    const railwayToml = readAppFile('railway.toml');
    const dockerfile = readAppFile('Dockerfile');

    expect(readTomlStringValue(railwayToml, 'startCommand')).toBe('npm run start');
    expect(dockerfile).toContain('CMD ["npm", "run", "start"]');
  });
});
