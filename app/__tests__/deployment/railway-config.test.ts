import fs from 'fs'
import path from 'path'

const appRoot = path.resolve(__dirname, '..', '..')
const repoRoot = path.resolve(appRoot, '..')

const readText = (filePath: string) => fs.readFileSync(filePath, 'utf8')

describe('Railway deployment configuration', () => {
  it('uses the Dockerfile start command for the Next.js app service', () => {
    const railwayConfig = readText(path.join(appRoot, 'railway.toml'))
    const dockerfile = readText(path.join(appRoot, 'Dockerfile'))

    expect(dockerfile).toContain('CMD ["npm", "run", "start"]')
    expect(railwayConfig).not.toMatch(/startCommand\s*=\s*"node server\.js"/)
  })

  it('uses MediaMTX environment override names for internal auth credentials', () => {
    const mediamtxRailwayConfig = readText(path.join(repoRoot, 'docker', 'mediamtx', 'railway.toml'))
    const dockerCompose = readText(path.join(repoRoot, 'docker-compose.yml'))

    expect(mediamtxRailwayConfig).toContain('MTX_AUTHINTERNALUSERS_0_USER')
    expect(mediamtxRailwayConfig).toContain('MTX_AUTHINTERNALUSERS_0_PASS')
    expect(mediamtxRailwayConfig).not.toMatch(/#\s*MEDIAMTX_(USER|PASS)\b/)

    expect(dockerCompose).toContain('MTX_AUTHINTERNALUSERS_0_USER=${MEDIAMTX_USER}')
    expect(dockerCompose).toContain('MTX_AUTHINTERNALUSERS_0_PASS=${MEDIAMTX_PASS}')
    expect(dockerCompose).not.toMatch(/^\s*-\s*MEDIAMTX_(USER|PASS)=/m)
  })

  it('keeps Prisma CLI and client package versions aligned for generate', () => {
    const packageJson = JSON.parse(readText(path.join(appRoot, 'package.json')))
    const packageLock = JSON.parse(readText(path.join(appRoot, 'package-lock.json')))

    expect(packageJson.dependencies['@prisma/client']).toBe(packageJson.devDependencies.prisma)
    expect(packageLock.packages['node_modules/@prisma/client'].version).toBe(
      packageLock.packages['node_modules/prisma'].version
    )
  })
})
