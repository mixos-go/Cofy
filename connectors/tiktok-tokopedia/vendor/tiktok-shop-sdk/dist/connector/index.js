"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokShopConnector = exports.InMemoryTokenStore = void 0;
exports.createTikTokShopConnector = createTikTokShopConnector;
var token_store_1 = require("./token-store");
Object.defineProperty(exports, "InMemoryTokenStore", { enumerable: true, get: function () { return token_store_1.InMemoryTokenStore; } });
var connector_1 = require("./connector");
Object.defineProperty(exports, "TikTokShopConnector", { enumerable: true, get: function () { return connector_1.TikTokShopConnector; } });
const connector_2 = require("./connector");
/** Factory: buat TikTokShopConnector untuk satu kredensial app. */
function createTikTokShopConnector(config) {
    return new connector_2.TikTokShopConnector(config);
}
//# sourceMappingURL=index.js.map