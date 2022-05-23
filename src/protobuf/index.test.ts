import Centrifuge from './index'
import WebSocket from 'ws';
import { DisconnectedContext } from './../types';
import { disconnectedCodes } from './../codes';

test('connect and disconnect with Protobuf', async () => {
    const c = new Centrifuge('ws://localhost:8000/connection/websocket?cf_protocol_version=v2', {
        websocket: WebSocket,
        protocol: 'protobuf'
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
