import { ConnectorError, isImplemented, type Platform, type PlatformConnector } from '@endcard/shared';
import { psnConnector } from './psn/psnConnector.js';

/**
 * Connector registry — the single switchboard from a `Platform` to its
 * implementation. Adding Xbox/Steam means adding one line here plus the
 * connector folder. No other file needs to know a new platform exists.
 */
const REGISTRY: Partial<Record<Platform, PlatformConnector>> = {
  psn: psnConnector,
};

export function getConnector(platform: Platform): PlatformConnector {
  const connector = REGISTRY[platform];
  if (!connector) {
    const reason = isImplemented(platform)
      ? `Connector for "${platform}" is registered as implemented but missing from the registry`
      : `"${platform}" is not supported yet`;
    throw new ConnectorError('NOT_SUPPORTED', platform, reason, { retryable: false });
  }
  return connector;
}

export function availablePlatforms(): Platform[] {
  return Object.keys(REGISTRY) as Platform[];
}
