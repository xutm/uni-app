import fs from 'fs'

import path from 'path'
import debug from 'debug'
import resolve from 'resolve'
import { once } from '@dcloudio/uni-shared'

import { normalizePath } from './utils'

const DEFAULT_EXTENSIONS = ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
function resolveWithSymlinks(id: string, basedir: string): string {
  return resolve.sync(id, {
    basedir,
    extensions: DEFAULT_EXTENSIONS,
    // necessary to work with pnpm
    preserveSymlinks: true,
  })
}
export function relativeFile(from: string, to: string) {
  const relativePath = normalizePath(path.relative(path.dirname(from), to))
  return relativePath.startsWith('.') ? relativePath : './' + relativePath
}

export const resolveMainPathOnce = once((inputDir: string) => {
  const mainTsPath = path.resolve(inputDir, 'main.ts')
  if (fs.existsSync(mainTsPath)) {
    return normalizePath(mainTsPath)
  }
  return normalizePath(path.resolve(inputDir, 'main.js'))
})

const ownerModules = ['@dcloudio/uni-app', '@dcloudio/vite-plugin-uni']

const paths: string[] = []

function resolveNodeModulePath(modulePath: string) {
  const nodeModulesPaths: string[] = []
  const nodeModulesPath = path.join(modulePath, 'node_modules')
  if (fs.existsSync(nodeModulesPath)) {
    nodeModulesPaths.push(nodeModulesPath)
  }
  const index = modulePath.lastIndexOf('node_modules')
  if (index > -1) {
    nodeModulesPaths.push(
      path.join(modulePath.substr(0, index), 'node_modules')
    )
  }
  return nodeModulesPaths
}

function initPaths() {
  const cliContext = process.env.UNI_CLI_CONTEXT
  if (cliContext) {
    const pathSet = new Set<string>()
    pathSet.add(path.join(cliContext, 'node_modules'))
    ;[`@dcloudio/uni-` + process.env.UNI_PLATFORM, ...ownerModules].forEach(
      (ownerModule) => {
        let pkgPath: string = ''
        try {
          pkgPath = require.resolve(ownerModule + '/package.json', {
            paths: [cliContext],
          })
        } catch (e) {}
        if (pkgPath) {
          resolveNodeModulePath(path.dirname(pkgPath)).forEach(
            (nodeModulePath) => {
              pathSet.add(nodeModulePath)
            }
          )
        }
      }
    )
    paths.push(...pathSet)
    debug('uni-paths')(paths)
  }
}

export function getBuiltInPaths() {
  if (!paths.length) {
    initPaths()
  }
  return paths
}

export function resolveBuiltIn(path: string) {
  return require.resolve(path, { paths: getBuiltInPaths() })
}

let componentsLibPath: string = ''
export function resolveComponentsLibPath() {
  if (!componentsLibPath) {
    componentsLibPath = path.join(
      resolveWithSymlinks(
        '@dcloudio/uni-components/package.json',
        process.env.UNI_INPUT_DIR
      ),
      '../lib'
    )
  }
  return componentsLibPath
}
