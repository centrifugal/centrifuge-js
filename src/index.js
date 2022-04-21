import { Centrifuge } from './centrifuge.js';
export default Centrifuge;

export const EventName = {
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

export const SubscriptionEventName = {
  stat: 'state',
  subscribin: 'subscribing',
  subscribe: 'subscribed',
  unsubscribe: 'unsubscribed',
  erro: 'error',
  publicatio: 'publication',
  joi: 'join',
  leav: 'leave'
};
