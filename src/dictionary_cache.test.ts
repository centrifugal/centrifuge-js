import { DictionaryCache } from './dictionary_cache';

// The cache is what makes a returning client compress from its first frame
// instead of carrying kilobytes uncompressed while it earns a dictionary. It
// also has to fail safe: an entry that cannot be trusted must look absent rather
// than produce garbage.
describe('dictionary cache', () => {
  const dict = new TextEncoder().encode('{"push":{"channel":"","pub":{"data":{');

  // Node's ambient localStorage is not usable here, and the cache treats that as
  // "no storage" by design. These tests are about the caching behaviour, so they
  // install a working one.
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, v); },
        removeItem: (k: string) => { store.delete(k); },
      },
    });
  });

  it('returns bytes only for the id they were stored under', () => {
    const c = new DictionaryCache();
    c.put('abc', dict);
    expect(c.get('abc')).toEqual(dict);
    expect(c.get('other')).toBeNull();
    expect(c.get('')).toBeNull();
  });

  it('advertises what it holds, and nothing when empty', () => {
    const c = new DictionaryCache();
    expect(c.advertise()).toEqual('');
    c.put('abc', dict);
    expect(c.advertise()).toEqual('abc');
  });

  it('keeps only the latest, since the id changes only on upgrade', () => {
    const c = new DictionaryCache();
    c.put('v1', dict);
    c.put('v2', dict);
    expect(c.advertise()).toEqual('v2');
    expect(c.get('v1')).toBeNull();
  });

  it('survives a reload', () => {
    new DictionaryCache().put('abc', dict);
    const fresh = new DictionaryCache();
    expect(fresh.advertise()).toEqual('abc');
    expect(fresh.get('abc')).toEqual(dict);
  });

  it('forgets an entry, so a bad one is not advertised again', () => {
    const c = new DictionaryCache();
    c.put('abc', dict);
    c.forget('nomatch');
    expect(c.advertise()).toEqual('abc');
    c.forget('abc');
    expect(c.advertise()).toEqual('');
    expect(new DictionaryCache().advertise()).toEqual('');
  });

  it('rejects storage that was corrupted underneath it', () => {
    new DictionaryCache().put('abc', dict);
    const raw = JSON.parse(store.get('centrifuge.dict')!);
    // Same length, different content: only the checksum can catch this, and
    // decoding frames against it would corrupt every one of them.
    raw.b64 = btoa('x'.repeat(dict.length));
    store.set('centrifuge.dict', JSON.stringify(raw));
    expect(new DictionaryCache().advertise()).toEqual('');
  });

  it('ignores unparseable storage', () => {
    store.set('centrifuge.dict', 'not json');
    expect(new DictionaryCache().advertise()).toEqual('');
    store.set('centrifuge.dict', '{"id":"x"}');
    expect(new DictionaryCache().advertise()).toEqual('');
  });
});
