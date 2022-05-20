"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/**
 * This file is the entrypoint of browser builds.
 * The code executes when loaded in a browser.
 */
const index_protobuf_1 = tslib_1.__importDefault(require("./index_protobuf"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
window.Centrifuge = index_protobuf_1.default; // instead of casting window to any, you can extend the Window interface: https://stackoverflow.com/a/43513740/5433572
//# sourceMappingURL=browser.protobuf.js.map