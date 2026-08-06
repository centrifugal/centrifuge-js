/**
 * Where the structure dictionary is kept between connections.
 * @internal
 */
const storageKey = 'centrifuge.dict';

/**
 * dictionaryCache remembers the structure dictionary across connections, so a
 * reconnect costs an id rather than a transfer.
 *
 * Only the structure dictionary is stored, and only the most recent one. Its id
 * changes only when a server is upgraded or an operator edits it, so a single
 * entry matches on essentially every reconnect; during a rolling deploy, where
 * old and new nodes disagree, a client re-downloads once per hop at about 1.6 KB
 * and needs no eviction policy to get right.
 *
 * Channel dictionaries are deliberately never stored. They contain verbatim
 * fragments of other users' messages, and writing those to disk on a shared
 * machine would outlive the session that was entitled to them. They are also
 * built per node, so a stored copy would rarely match anyway.
 *
 * The id is a hash of the content, computed by the server, so an entry can never
 * be used for a dictionary whose bytes differ. The CRC guards the other
 * direction - storage that was truncated or edited underneath us - since a
 * browser cannot recompute the server's hash synchronously.
 *
 * @internal
 */
export class DictionaryCache {
  private id: string = '';
  private dict: Uint8Array | null = null;
  private loaded: boolean = false;

  /**
   * Storage is read once, on first use rather than on construction. A page may
   * create many clients and the entry is per origin, not per client, so reading
   * it repeatedly would be wasted synchronous I/O on a hot path.
   */
  private ensureLoaded(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    this.load();
  }

  /** Bytes for this id, or null when it is not the one held. */
  get(id: string): Uint8Array | null {
    this.ensureLoaded();
    if (!id || id !== this.id || this.dict === null) {
      return null;
    }
    return this.dict;
  }

  /** Ids to advertise at connect. The protocol allows several; this keeps one. */
  ids(): string[] {
    this.ensureLoaded();
    return this.id ? [this.id] : [];
  }

  put(id: string, dict: Uint8Array): void {
    if (!id || dict.length === 0) {
      return;
    }
    this.ensureLoaded();
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
    try {
      globalThis.localStorage?.removeItem(storageKey);
    } catch (e) {
      // Storage unavailable or blocked - nothing to clean up.
    }
  }

  private load(): void {
    try {
      const raw = globalThis.localStorage?.getItem(storageKey);
      if (!raw) {
        return;
      }
      const entry = JSON.parse(raw);
      if (!entry || typeof entry.id !== 'string' || typeof entry.b64 !== 'string') {
        return;
      }
      const bytes = base64ToBytes(entry.b64);
      if (bytes.length === 0 || crc32(bytes) !== entry.crc) {
        // Truncated or tampered with. Decoding against it would corrupt every
        // frame, so treat it as absent.
        this.forget(entry.id);
        return;
      }
      this.id = entry.id;
      this.dict = bytes;
    } catch (e) {
      // Unparseable, unavailable, or quota-blocked storage is simply a cache miss.
    }
  }

  private save(): void {
    if (this.dict === null) {
      return;
    }
    try {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify({
        id: this.id,
        b64: bytesToBase64(this.dict),
        crc: crc32(this.dict),
      }));
    } catch (e) {
      // Storage full or disabled: caching is an optimisation, not a requirement.
    }
  }
}

/**
 * CRC32 over the stored bytes. This is an integrity check against storage that
 * was truncated or edited underneath us, not a security measure - a browser
 * cannot recompute the server's content hash synchronously, and fflate does not
 * export a checksum, so twelve lines here beat an async digest on a hot path.
 */
function crc32(b: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < b.length; i++) {
    c ^= b[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (~c) >>> 0;
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
 * @internal
 */
export const sharedDictionaryCache = new DictionaryCache();
