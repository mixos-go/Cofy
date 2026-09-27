"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeConnector = exports.InMemoryTokenStore = void 0;
exports.createShopeeConnector = createShopeeConnector;
var token_store_1 = require("./token-store");
Object.defineProperty(exports, "InMemoryTokenStore", { enumerable: true, get: function () { return token_store_1.InMemoryTokenStore; } });
var connector_1 = require("./connector");
Object.defineProperty(exports, "ShopeeConnector", { enumerable: true, get: function () { return connector_1.ShopeeConnector; } });
const connector_2 = require("./connector");
/** Factory: buat ShopeeConnector untuk satu kredensial partner. */
function createShopeeConnector(config) {
    return new connector_2.ShopeeConnector(config);
}
//# sourceMappingURL=index.js.map