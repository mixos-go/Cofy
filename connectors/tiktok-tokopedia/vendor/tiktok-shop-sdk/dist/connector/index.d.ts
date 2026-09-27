export type { TokenSet, TikTokShopConnectorConfig } from './types';
export type { TokenStore } from './token-store';
export { InMemoryTokenStore } from './token-store';
export { TikTokShopConnector } from './connector';
import type { TikTokShopConnectorConfig } from './types';
import { TikTokShopConnector } from './connector';
/** Factory: buat TikTokShopConnector untuk satu kredensial app. */
export declare function createTikTokShopConnector(config: TikTokShopConnectorConfig): TikTokShopConnector;
