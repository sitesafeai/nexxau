import fs from 'fs';
import path from 'path';

describe('Railway deployment configuration', () => {
  const appRailwayToml = fs.readFileSync(
    path.join(__dirname, '../../railway.toml'),
    'utf8'
  );
  const mediaMtxRailwayToml = fs.readFileSync(
    path.join(__dirname, '../../../docker/mediamtx/railway.toml'),
    'utf8'
  );
  const dockerCompose = fs.readFileSync(
    path.join(__dirname, '../../../docker-compose.yml'),
    'utf8'
  );

  it('starts the app with the Next.js package start script', () => {
    expect(appRailwayToml).toContain('startCommand = "npm run start"');
    expect(appRailwayToml).not.toContain('startCommand = "node server.js"');
  });

  it('uses MediaMTX-supported credential env vars in deployment docs', () => {
    expect(mediaMtxRailwayToml).toContain('MTX_AUTHINTERNALUSERS_0_USER');
    expect(mediaMtxRailwayToml).toContain('MTX_AUTHINTERNALUSERS_0_PASS');
    expect(mediaMtxRailwayToml).not.toContain('# MEDIAMTX_USER');
    expect(mediaMtxRailwayToml).not.toContain('# MEDIAMTX_PASS');
  });

  it('maps local MediaMTX credentials to the env vars MediaMTX reads', () => {
    expect(dockerCompose).toContain('MEDIAMTX_API_USERNAME=${MEDIAMTX_USER:-admin}');
    expect(dockerCompose).toContain('MEDIAMTX_API_PASSWORD=${MEDIAMTX_PASS:-nexxau}');
    expect(dockerCompose).toContain('MTX_AUTHINTERNALUSERS_0_USER=${MEDIAMTX_USER:-admin}');
    expect(dockerCompose).toContain('MTX_AUTHINTERNALUSERS_0_PASS=${MEDIAMTX_PASS:-nexxau}');
  });
});
