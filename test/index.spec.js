/* global describe, it, before */

import chai from 'chai';
import CentrifugeJSON from '../dist/centrifuge.js';
import CentrifugeProtobuf from '../dist/centrifuge.protobuf.js';

chai.expect();

const expect = chai.expect;

let centrifugeJSON;
let centrifugeProtobuf;

describe('Given an instance of my Centrifuge', () => {
  before(() => {
    centrifugeJSON = new CentrifugeJSON('ws://localhost:8000/connection/websocket');
  });
  describe('when I need the url', () => {
    it('should return the url', () => {
      expect(centrifugeJSON._url).to.be.equal('ws://localhost:8000/connection/websocket');
    });
  });
});

describe('Given an instance of my Centrifuge', () => {
  before(() => {
    centrifugeJSON = new CentrifugeJSON('ws://localhost:8000/connection/websocket');
  });
  describe('when I try to send message in disconnected state', () => {
    it('send rejects a promise', () => {
      return centrifugeJSON.send({})
        .then(function () { throw new Error('was not supposed to succeed'); })
        .catch(function (m) { expect(m.code).to.equal(0); });
    });
  });
});

describe('Given an instance of my Centrifuge with Protobuf', () => {
  before(() => {
    centrifugeProtobuf = new CentrifugeProtobuf('ws://localhost:8000/connection/websocket');
  });
  describe('when I need the url', () => {
    it('should return the url', () => {
      expect(centrifugeProtobuf._url).to.be.equal('ws://localhost:8000/connection/websocket');
    });
  });
});
