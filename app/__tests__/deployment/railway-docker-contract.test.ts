import fs from 'fs';
import path from 'path';

const appRoot = path.resolve(__dirname, '../..');

describe('Railway Docker deployment contract', () => {
  it('starts with the command supported by app/Dockerfile', () => {
    const railwayToml = fs.readFileSync(path.join(appRoot, 'railway.toml'), 'utf8');
    const dockerfile = fs.readFileSync(path.join(appRoot, 'Dockerfile'), 'utf8');

    expect(railwayToml).toContain('startCommand = "npm run start"');
    expect(dockerfile).toContain('CMD ["npm", "run", "start"]');
    expect(railwayToml).not.toContain('startCommand = "node server.js"');
  });

  it('preserves repo-root src imports required by app routes during Docker builds', () => {
    const dockerfile = fs.readFileSync(path.join(appRoot, 'Dockerfile'), 'utf8');
    const userDashboard = fs.readFileSync(
      path.join(appRoot, 'app/user-dashboard/page.tsx'),
      'utf8'
    );

    expect(userDashboard).toContain("../../../src/components/dashboard/WorkflowBuilder");
    expect(dockerfile).toContain('COPY src/ ./src/');
  });
});
