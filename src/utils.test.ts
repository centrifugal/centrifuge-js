import { localStorageItem, toOffset } from './utils';

const g = globalThis as any;

function restoreLocalStorage() {
  delete g.localStorage;
}

describe('toOffset', () => {
  it('returns 0 for a missing offset', () => {
    expect(toOffset(undefined)).toBe(0);
    expect(toOffset(null)).toBe(0);
  });

  it('keeps a number', () => {
    expect(toOffset(0)).toBe(0);
    expect(toOffset(42)).toBe(42);
  });

  it('converts what protobuf decodes a uint64 into', () => {
    // A Long of long.js, which comes with protobufjs.
    expect(toOffset({ low: 5, high: 0, unsigned: true, toNumber: () => 5 })).toBe(5);
  });

  it('converts a position an app stored and restored, which has no methods', () => {
    expect(toOffset(JSON.parse('{"low":7,"high":0,"unsigned":true}'))).toBe(7);
  });

  it('converts an offset above 2^32', () => {
    expect(toOffset({ low: 1, high: 2, unsigned: true })).toBe(2 * 4294967296 + 1);
  });

  it('reads the parts of an offset as unsigned', () => {
    expect(toOffset({ low: -1, high: 0, unsigned: true })).toBe(4294967295);
  });

  it('returns 0 for something that is no offset', () => {
    expect(toOffset('not a number')).toBe(0);
    expect(toOffset({})).toBe(0);
  });
});

describe('localStorageItem', () => {
  afterEach(() => {
    restoreLocalStorage();
  });

  it('returns null when localStorage is not defined', () => {
    expect(localStorageItem('centrifuge.debug')).toBeNull();
  });

  it('returns null when localStorage is null (Safari private browsing mode)', () => {
    g.localStorage = null;
    expect(localStorageItem('centrifuge.debug')).toBeNull();
  });

  it('returns null when localStorage has no getItem method', () => {
    g.localStorage = {};
    expect(localStorageItem('centrifuge.debug')).toBeNull();
  });

  it('returns null when getItem throws', () => {
    g.localStorage = {
      getItem: () => { throw new Error('SecurityError'); }
    };
    expect(localStorageItem('centrifuge.debug')).toBeNull();
  });

  it('returns null when accessing localStorage itself throws', () => {
    Object.defineProperty(g, 'localStorage', {
      configurable: true,
      get: () => { throw new Error('SecurityError'); }
    });
    expect(localStorageItem('centrifuge.debug')).toBeNull();
  });

  it('returns stored value', () => {
    g.localStorage = {
      getItem: (key: string) => key === 'centrifuge.debug' ? 'true' : null
    };
    expect(localStorageItem('centrifuge.debug')).toBe('true');
    expect(localStorageItem('unknown.key')).toBeNull();
  });
});
