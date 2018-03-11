/* global describe, it, before */

import chai from 'chai';
import Centrifuge from '../dist/centrifuge.js';

chai.expect();

const expect = chai.expect;

let centrifuge;

describe('Given an instance of my Centrifuge', () => {
  before(() => {
    centrifuge = new Centrifuge("ws://localhost:8000/connection/websocket");
  });
  describe('when I need the url', () => {
    it('should return the url', () => {
      expect(centrifuge._url).to.be.equal("ws://localhost:8000/connection/websocket");
    });
  });
});
