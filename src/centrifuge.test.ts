import { Centrifuge } from './centrifuge'
import WebSocket from 'ws';
import { DisconnectedContext, Error, PublicationContext, UnsubscribedContext } from './types';
import { disconnectedCodes, unsubscribedCodes } from './codes';

test('invalid endpoint', () => {
    expect(() => { new Centrifuge('') }).toThrowError();
});

test('no websocket constructor', async () => {
    const c = new Centrifuge('ws://localhost:8000/connection/websocket?cf_protocol_version=v2');
    expect(() => { c.connect() }).toThrowError();
});

test('connect and disconnect', async () => {
    const c = new Centrifuge('ws://localhost:8000/connection/websocket?cf_protocol_version=v2', {
        websocket: WebSocket
    });

    let disconnectCalled: any;
    const p = new Promise<DisconnectedContext>((resolve, _) => {
        disconnectCalled = resolve;
    })

    c.on('disconnected', (ctx) => {
        disconnectCalled(ctx);
    })

    c.connect();
    await c.ready(5000);
    expect(c.state).toBe(Centrifuge.State.Connected);

    c.disconnect();
    const ctx = await p;
    expect(c.state).toBe(Centrifuge.State.Disconnected);
    expect(ctx.code).toBe(disconnectedCodes.disconnectCalled);
});

test('subscribe and unsubscribe', async () => {
    const c = new Centrifuge('ws://localhost:8000/connection/websocket?cf_protocol_version=v2', {
        websocket: WebSocket
    });

    let unsubscribeCalled: any;
    const p = new Promise<UnsubscribedContext>((resolve, _) => {
        unsubscribeCalled = resolve;
    })

    c.connect();
    await c.ready(5000);
    const sub = c.newSubscription('test');
    sub.on('unsubscribed', (ctx: UnsubscribedContext) => {
        unsubscribeCalled(ctx);
    });

    sub.subscribe()
    await sub.ready(5000);
    expect(sub.state).toBe(Centrifuge.SubscriptionState.Subscribed);
    expect(c.state).toBe(Centrifuge.State.Connected);

    sub.unsubscribe();
    c.disconnect();

    const ctx = await p;

    expect(sub.state).toBe(Centrifuge.SubscriptionState.Unsubscribed);
    expect(c.state).toBe(Centrifuge.State.Disconnected);
    expect(ctx.code).toBe(unsubscribedCodes.unsubscribeCalled)
});

test('publish and receive message', async () => {
    const c = new Centrifuge('ws://localhost:8000/connection/websocket?cf_protocol_version=v2', {
        websocket: WebSocket
    });
    c.connect();
    await c.ready(5000);

    let publicationReceived: any;
    const p = new Promise<PublicationContext>((resolve, _) => {
        publicationReceived = resolve;
    })

    const sub = c.newSubscription('test');
    sub.on('publication', (ctx: PublicationContext) => {
        publicationReceived(ctx);
    });
    sub.subscribe()
    await sub.ready(5000);

    await sub.publish({ "my": "data" });

    const ctx = await p;
    c.disconnect();
    expect(ctx.data).toStrictEqual({ "my": "data" });
});

test('rpc buffered till connected', async () => {
    const c = new Centrifuge('ws://localhost:8000/connection/websocket?cf_protocol_version=v2', {
        websocket: WebSocket
    });

    let errorReceived: any;
    const p = new Promise<Error>((resolve, _) => {
        errorReceived = resolve;
    })

    c.rpc('method', { "my": "data" }).then(function () {
        // we are not expecting data in this test, we expect Not Available error.
    }, function (err: Error) {
        errorReceived(err);
    });

    // note: connect called after issuing rpc.
    c.connect();

    const rpcErr = await p;
    c.disconnect();
    expect(rpcErr.code).toStrictEqual(108);
});
