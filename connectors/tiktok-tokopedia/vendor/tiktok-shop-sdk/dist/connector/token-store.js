"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryTokenStore = void 0;
class InMemoryTokenStore {
    constructor() {
        this.map = new Map();
    }
    get(shopId) {
        return this.map.get(shopId);
    }
    set(shopId, token) {
        this.map.set(shopId, token);
    }
    delete(shopId) {
        this.map.delete(shopId);
    }
    keys() {
        return [...this.map.keys()];
    }
}
exports.InMemoryTokenStore = InMemoryTokenStore;
//# sourceMappingURL=token-store.js.map