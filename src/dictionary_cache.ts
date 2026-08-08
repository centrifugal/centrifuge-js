/**
 * Where the dictionary is kept between connections.
 * @internal
 */
const storageKey = 'centrifuge.dict';

/**
 * dictionaryCache remembers the dictionary the server sent in the connect reply,
 * so a reconnect - including a page reload - costs an id rather than a transfer.
 *
 * One entry, the most recent. A dictionary belongs to a profile and changes only
 * when the server publishes a new version, so a single entry matches on
 * essentially every reconnect; during a rolling deploy, where old and new nodes
 * disagree, a client re-downloads once per hop and needs no eviction policy to
 * get right. A client that moves between profiles pays one transfer per switch.
 *
 * The entry outlives the session, which is the point - and worth being explicit
 * about, because a dictionary is a sample of the traffic the profile carries. A
 * server that puts application content into one is asserting that content may be
 * handed to any connection of that profile; storing it here extends that to
 * anyone using the same browser profile afterwards.
 *
 * **Stored bytes are verified against their id before use, by hashing them.**
 * That is not an integrity check, it is the security boundary of the cache. An
 * id is the server's hash of the content, and DEFLATE back references resolve
 * into the dictionary - so bytes substituted in storage do not merely corrupt a
 * frame, they make a legitimate server frame decode into content of the
 * substituter's choosing, which the application then handles as a publication.
 * That is a data-injection primitive, and a checksum does not stop it: a CRC is
 * trivial to forge.
 *
 * Recomputing the hash closes it in both directions. Bytes changed under a real
 * id fail the comparison and are dropped. Bytes changed together with a matching
 * forged id verify locally, but then this client advertises an id no server
 * knows, so the server sends the genuine dictionary and the forged one is never
 * used.
 *
 * Verification is asynchronous, because that is the only digest a browser
 * offers. It is started once, eagerly, and a client that connects before it
 * finishes simply advertises nothing and pays one transfer.
 *
 * @internal
 */
export class DictionaryCache {
  private id: string = '';
  private dict: Uint8Array | null = null;
  private started: boolean = false;
  /** Resolves when the stored entry has been verified, or found absent. */
  private ready: Promise<void> | null = null;

  /**
   * Storage is read once, on first use rather than on construction. A page may
   * create many clients and the entry is per origin, not per client, so reading
   * it repeatedly would be wasted work on a hot path.
   */
  private ensureStarted(): Promise<void> {
    if (!this.started) {
      this.started = true;
      this.ready = this.load();
    }
    return this.ready as Promise<void>;
  }

  /**
   * Begin verifying the stored entry. Call as early as possible - the sooner it
   * finishes the sooner a returning client stops paying for transfers it does
   * not need.
   */
  warm(): Promise<void> {
    return this.ensureStarted();
  }

  /** Bytes for this id, or null when it is not the one held and verified. */
  get(id: string): Uint8Array | null {
    this.ensureStarted();
    if (!id || id !== this.id || this.dict === null) {
      return null;
    }
    return this.dict;
  }

  /**
   * The id to advertise at connect, or empty when nothing is cached or
   * verification has not finished yet. Empty is always safe: it costs one
   * dictionary transfer and never risks decoding against unverified bytes.
   */
  advertise(): string {
    this.ensureStarted();
    return this.id;
  }

  put(id: string, dict: Uint8Array): void {
    if (!id || dict.length === 0) {
      return;
    }
    this.ensureStarted();
    if (id === this.id) {
      return; // already stored, no need to write again
    }
    this.id = id;
    this.dict = dict;
    this.save();
  }

  /**
   * Drop the entry. Called when a frame fails to decode while this dictionary is
   * in use: without it a bad entry would be advertised again on every reconnect
   * and wedge the client in a loop.
   */
  forget(id: string): void {
    if (id !== this.id) {
      return;
    }
    this.id = '';
    this.dict = null;
    this.remove();
  }

  private remove(): void {
    try {
      globalThis.localStorage?.removeItem(storageKey);
    } catch (e) {
      // Storage unavailable or blocked - nothing to clean up.
    }
  }

  private async load(): Promise<void> {
    let id = '';
    let bytes: Uint8Array | null = null;
    try {
      const raw = globalThis.localStorage?.getItem(storageKey);
      if (!raw) {
        return;
      }
      const entry = JSON.parse(raw);
      if (!entry || typeof entry.id !== 'string' || typeof entry.b64 !== 'string') {
        return;
      }
      id = entry.id;
      bytes = base64ToBytes(entry.b64);
    } catch (e) {
      // Unparseable, unavailable, or quota-blocked storage is simply a cache miss.
      return;
    }
    if (bytes === null || bytes.length === 0) {
      this.remove();
      return;
    }
    let digest: string;
    try {
      digest = await dictionaryId(bytes);
    } catch (e) {
      // No WebCrypto, or it refused. Unverifiable bytes are unusable bytes.
      this.remove();
      return;
    }
    if (digest !== id) {
      this.remove();
      return;
    }
    if (this.dict !== null) {
      // A connection completed while the digest was in flight and stored a
      // fresher dictionary. What was on disk is stale by definition, so let the
      // newer one stand rather than clobbering it with what we just verified.
      return;
    }
    this.id = id;
    this.dict = bytes;
  }

  private save(): void {
    if (this.dict === null) {
      return;
    }
    try {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify({
        id: this.id,
        b64: bytesToBase64(this.dict),
      }));
    } catch (e) {
      // Storage full or disabled: caching is an optimisation, not a requirement.
    }
  }
}

/**
 * Recompute the server's dictionary id: the first 12 bytes of SHA-256 over the
 * content, base64url encoded without padding. Must stay byte-for-byte identical
 * to DictionaryID in centrifugal/protocol, since a mismatch would silently turn
 * every cache hit into a miss.
 *
 * @internal
 */
export async function dictionaryId(dict: Uint8Array): Promise<string> {
  const subtle = (globalThis as any).crypto?.subtle;
  if (!subtle) {
    throw new Error('centrifuge: no WebCrypto available');
  }
  // Copy into a plain ArrayBuffer: a Uint8Array view over a larger buffer would
  // otherwise hash the whole buffer.
  const buf = new Uint8Array(dict).buffer;
  const sum = new Uint8Array(await subtle.digest('SHA-256', buf));
  return base64UrlNoPad(sum.subarray(0, 12));
}

function base64UrlNoPad(b: Uint8Array): string {
  return bytesToBase64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesToBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) {
    s += String.fromCharCode(b[i]);
  }
  return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
}

function base64ToBytes(s: string): Uint8Array {
  const binary = typeof atob === 'function'
    ? atob(s)
    : Buffer.from(s, 'base64').toString('binary');
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/**
 * The cache shared by every client on this origin. A dictionary is identified by
 * a hash of its content, so sharing one entry between clients is safe regardless
 * of which server each is talking to: a mismatched id is simply a miss.
 *
 * Verification starts here, at module load, so it is almost always finished by
 * the time anything connects.
 * @internal
 */
export const sharedDictionaryCache = new DictionaryCache();
void sharedDictionaryCache.warm();
