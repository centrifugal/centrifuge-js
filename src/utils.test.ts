import { localStorageItem } from './utils';

const g = globalThis as any;

function restoreLocalStorage() {
  delete g.localStorage;
}

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
