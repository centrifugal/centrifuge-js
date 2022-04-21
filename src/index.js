import { Centrifuge } from './centrifuge.js';
export default Centrifuge;

export const EventNames = {
  state: 'state',
  connecting: 'connecting',
  connected: 'connected',
  disconnected: 'disconnected',
  error: 'error',

  // Server-side subscription events.
  publication: 'publication',
  join: 'join',
  leave: 'leave',
  subscribed: 'subscribed',
  subscribing: 'subscribing',
  unsubscribed: 'unsubscribed'
};
