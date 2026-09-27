import type { TokenSet } from './types';
/**
 * Abstraksi penyimpanan token, kunci = shop/seller id.
 * Implementasi boleh sync (return nilai) atau async (return Promise).
 */
export interface TokenStore {
    get(shopId: string): Promise<TokenSet | undefined> | TokenSet | undefined;
    set(shopId: string, token: TokenSet): Promise<void> | void;
    delete(shopId: string): Promise<void> | void;
}
export declare class InMemoryTokenStore implements TokenStore {
    private readonly map;
    get(shopId: string): TokenSet | undefined;
    set(shopId: string, token: TokenSet): void;
    delete(shopId: string): void;
    keys(): string[];
}
