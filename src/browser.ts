/**
 * This file is the entrypoint of browser builds.
 */
import { Centrifuge } from './centrifuge'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Centrifuge = Centrifuge
