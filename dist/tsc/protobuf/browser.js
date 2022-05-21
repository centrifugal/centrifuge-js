"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This file is the entrypoint of browser builds.
 * The code executes when loaded in a browser.
 */
const protobuf_1 = require("./protobuf");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
window.Centrifuge = protobuf_1.CentrifugeProtobuf; // instead of casting window to any, you can extend the Window interface: https://stackoverflow.com/a/43513740/5433572
//# sourceMappingURL=browser.js.map