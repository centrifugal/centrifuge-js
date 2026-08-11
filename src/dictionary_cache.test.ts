import { DictionaryCache, dictionaryId } from './dictionary_cache';

// The cache is what makes a returning client compress from its first frame
// instead of paying for a dictionary transfer it already has. It also has to
// fail safe, and "safe" here is stronger than it sounds: bytes substituted in
// storage make legitimate server frames decode into content of the
// substituter's choosing, so an entry that cannot be verified against its id
// must look absent rather than be used.
describe('dictionary cache', () => {
  const dict = new TextEncoder().encode('{"push":{"channel":"","pub":{"data":{');
  let realId: string;

  let store: Map<string, string>;
  beforeEach(async () => {
    realId = await dictionaryId(dict);
    store = new Map<string, string>();
    // Node's ambient localStorage is not usable here, and the cache treats that
    // as "no storage" by design. These tests are about caching, so install one.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, v); },
        removeItem: (k: string) => { store.delete(k); },
      },
    });
  });

  // A cache that has just read storage. Verification is asynchronous because
  // that is the only digest a browser offers, so anything reading a reloaded
  // entry has to wait for it.
  const reloaded = async () => {
    const c = new DictionaryCache();
    await c.warm();
    return c;
  };

  it('computes the same id as the server', async () => {
    // Byte-for-byte identical to DictionaryID in centrifugal/protocol:
    // base64url of the first 12 bytes of SHA-256, unpadded. A mismatch here
    // would turn every cache hit into a silent miss.
    expect(realId).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(await dictionaryId(dict)).toEqual(realId);
  });

  it('returns bytes only for the id they were stored under', async () => {
    const c = new DictionaryCache();
    c.put(realId, dict);
    expect(c.get(realId)).toEqual(dict);
    expect(c.get('other')).toBeNull();
    expect(c.get('')).toBeNull();
  });

  it('advertises what it holds, and nothing when empty', async () => {
    const c = new DictionaryCache();
    expect(c.advertise()).toEqual('');
    c.put(realId, dict);
    expect(c.advertise()).toEqual(realId);
  });

  it('keeps only the latest, since the id changes only on upgrade', () => {
    const c = new DictionaryCache();
    c.put('v1', dict);
    c.put('v2', dict);
    expect(c.advertise()).toEqual('v2');
    expect(c.get('v1')).toBeNull();
  });

  it('survives a reload', async () => {
    new DictionaryCache().put(realId, dict);
    const fresh = await reloaded();
    expect(fresh.advertise()).toEqual(realId);
    expect(fresh.get(realId)).toEqual(dict);
  });

  it('advertises nothing until verification finishes', () => {
    new DictionaryCache().put(realId, dict);
    // Read synchronously, before the digest can have resolved. Empty is the
    // safe answer: it costs one transfer and never decodes against unverified
    // bytes.
    expect(new DictionaryCache().advertise()).toEqual('');
  });

  it('rejects bytes substituted under a real id', async () => {
    new DictionaryCache().put(realId, dict);
    const raw = JSON.parse(store.get('centrifuge.dict')!);
    // Same length, different content. This is the attack the hash exists for:
    // a CRC is forgeable, and decoding against these bytes would put the
    // substituter's content into frames the application trusts.
    raw.b64 = btoa('x'.repeat(dict.length));
    store.set('centrifuge.dict', JSON.stringify(raw));
    const c = await reloaded();
    expect(c.advertise()).toEqual('');
    expect(c.get(realId)).toBeNull();
    expect(store.has('centrifuge.dict')).toBe(false);
  });

  it('does not let a matching forged id become a real one', async () => {
    // Rewriting bytes *and* id together passes local verification - there is
    // nothing on the client to say otherwise. It is harmless because the id no
    // server ever issued is an id no server recognises, so the server sends the
    // genuine dictionary and these bytes are never used to decode anything.
    const evil = new TextEncoder().encode('x'.repeat(dict.length));
    const evilId = await dictionaryId(evil);
    // Written with a current timestamp so this exercises forgery, not expiry.
    store.set('centrifuge.dict', JSON.stringify({ id: evilId, b64: btoa('x'.repeat(dict.length)), at: Date.now() }));
    const c = await reloaded();
    expect(c.advertise()).toEqual(evilId);
    expect(c.advertise()).not.toEqual(realId);
  });

  it('does not cache a dictionary whose id does not name its content', async () => {
    // A server that derives ids differently, or gets its own bookkeeping wrong.
    // The connection itself is fine - it compresses against the bytes it sent -
    // but caching this would mean advertising an id, being told to reuse it,
    // and dropping it again on every single load. Refusing once is the same
    // outcome without the churn.
    const c = new DictionaryCache();
    c.put('not-the-hash-of-these-bytes', dict);
    expect(c.advertise()).toEqual('not-the-hash-of-these-bytes'); // stored optimistically
    await new Promise((r) => setTimeout(r, 0)); // let the digest settle
    expect(c.advertise()).toEqual('');
    expect(c.get('not-the-hash-of-these-bytes')).toBeNull();
    expect(store.has('centrifuge.dict')).toBe(false);
    expect((await reloaded()).advertise()).toEqual('');
  });

  it('keeps a dictionary whose id does name its content', async () => {
    const c = new DictionaryCache();
    c.put(realId, dict);
    await new Promise((r) => setTimeout(r, 0));
    expect(c.advertise()).toEqual(realId);
    expect(c.get(realId)).toEqual(dict);
  });

  it('forgets an entry, so a bad one is not advertised again', async () => {
    const c = new DictionaryCache();
    c.put(realId, dict);
    c.forget('nomatch');
    expect(c.advertise()).toEqual(realId);
    c.forget(realId);
    expect(c.advertise()).toEqual('');
    expect((await reloaded()).advertise()).toEqual('');
  });

  it('does not let a slow digest clobber a fresher dictionary', async () => {
    // Storage holds an old entry; a connection completes and stores a new one
    // before verification of the old one finishes. The new one has to win, or a
    // client would advertise a dictionary the server has already replaced.
    new DictionaryCache().put(realId, dict);
    const newer = new TextEncoder().encode('{"push":{"channel":"","pub":{"data":{"v":2}}}}');
    const newerId = await dictionaryId(newer);

    const c = new DictionaryCache();
    const verifying = c.warm();
    c.put(newerId, newer);
    await verifying;

    expect(c.advertise()).toEqual(newerId);
    expect(c.get(newerId)).toEqual(newer);
  });

  it('drops an entry older than its lifetime', async () => {
    // The id is advertised on every connect, so an unbounded cache lets a
    // stable, server-chosen value follow a client forever. Expiry bounds that
    // window; it is not a freshness check, since content-addressed ids already
    // make a stale dictionary harmless.
    new DictionaryCache().put(realId, dict);
    const raw = JSON.parse(store.get('centrifuge.dict')!);
    raw.at = Date.now() - 8 * 24 * 60 * 60 * 1000;
    store.set('centrifuge.dict', JSON.stringify(raw));

    const c = await reloaded();
    expect(c.advertise()).toEqual('');
    expect(store.has('centrifuge.dict')).toBe(false);
  });

  it('keeps an entry inside its lifetime', async () => {
    new DictionaryCache().put(realId, dict);
    const raw = JSON.parse(store.get('centrifuge.dict')!);
    raw.at = Date.now() - 6 * 24 * 60 * 60 * 1000;
    store.set('centrifuge.dict', JSON.stringify(raw));

    expect((await reloaded()).advertise()).toEqual(realId);
  });

  it('drops an entry written before expiry existed', async () => {
    // No timestamp means it predates this rule, and could be arbitrarily old.
    // Dropping it costs one transfer; keeping it would exempt exactly the
    // entries that have already lived longest.
    store.set('centrifuge.dict', JSON.stringify({ id: realId, b64: btoa('x'.repeat(dict.length)) }));
    expect((await reloaded()).advertise()).toEqual('');
  });

  it('ignores unparseable storage', async () => {
    store.set('centrifuge.dict', 'not json');
    expect((await reloaded()).advertise()).toEqual('');
    store.set('centrifuge.dict', '{"id":"x"}');
    expect((await reloaded()).advertise()).toEqual('');
  });
});
