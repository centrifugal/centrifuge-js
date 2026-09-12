import { Centrifuge } from './centrifuge';
import { SubscriptionState, TransportName } from './types';

import WebSocket from 'ws';
import * as crypto from 'crypto';

// Runs against the secure Centrifugo instance from docker-compose.yml (port 8002):
// connection tokens are required, and the privatemap namespace requires
// subscription tokens.

const endpoint = 'ws://localhost:8002/connection/websocket';

function jwt(claims: Record<string, any>): string {
  const encode = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}`;
  const signature = crypto.createHmac('sha256', 'secret').update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

test('map subscription gets a new token when recovering with an expired one', async () => {
  const user = 'map_token_' + Date.now();
  const channel = 'privatemap:' + user;
  const c = new Centrifuge([{ transport: 'websocket' as TransportName, endpoint }], {
    websocket: WebSocket,
    token: jwt({ sub: user, exp: nowSeconds() + 3600 }),
  });

  let tokenCalls = 0;
  const sub = c.newMapSubscription(channel, {
    getToken: async () => {
      tokenCalls++;
      return jwt({ sub: user, channel, exp: nowSeconds() + 2 });
    },
  });
  sub.subscribe();
  c.connect();
  await sub.ready(5000);
  expect(tokenCalls).toBe(1);

  // The server checks expiry in whole seconds.
  await delay(3500);

  // After reconnecting, the subscription recovers from its position with the
  // expired token, gets "token expired" and must fetch a new token.
  const resubscribed = new Promise<void>(resolve => sub.once('subscribed', () => resolve()));
  (c as any)._transport.close();
  await Promise.race([resubscribed, delay(10000)]);

  expect(sub.state).toBe(SubscriptionState.Subscribed);
  expect(tokenCalls).toBeGreaterThanOrEqual(2);
  c.disconnect();
}, 20000);
