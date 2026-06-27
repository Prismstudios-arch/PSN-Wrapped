/**
 * @endcard/shared — the single source of truth for Endcard's domain.
 *
 * Imported by BOTH the backend and the mobile app. Keep this package free of
 * any runtime dependency on platform SDKs, Node-only APIs, or React Native APIs
 * so it stays usable everywhere.
 */
export * from './platform';
export * from './models';
export * from './connector';
