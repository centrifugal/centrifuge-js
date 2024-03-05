/**
 * This file is the entrypoint of browser builds.
 */
import { Centrifuge } from './centrifuge'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Centrifuge = Centrifuge
