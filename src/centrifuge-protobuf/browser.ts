/**
 * This file is the entrypoint of browser builds.
 * The code executes when loaded in a browser.
 */
import CentrifugeProtobuf from '.';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Centrifuge = CentrifugeProtobuf
