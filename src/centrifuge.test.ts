import { Centrifuge } from './centrifuge'
import WebSocket from 'ws';

test('invalid endpoint', () => {
    expect(() => { new Centrifuge('') }).toThrowError();
});

test('no websocket constructor', async () => {
    const c = new Centrifuge('ws://localhost:8000/connection/websocket?cf_protocol_version=v2');
    expect(() => { c.connect() }).toThrowError();
});

test('websocket connects', async () => {
    const c = new Centrifuge('ws://localhost:8000/connection/websocket?cf_protocol_version=v2', {
        websocket: WebSocket
    });
    c.connect();
    await c.ready(5000);
    c.disconnect();
    expect(c.disconnect);
});
