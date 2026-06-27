// Metro config for an Expo app inside an npm-workspaces monorepo.
// Watches the repo root (for @endcard/shared) and resolves modules from both
// the app and the hoisted root node_modules. projectRoot is pinned to this
// folder via __dirname so it's correct even when EAS bundles from the repo root.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
