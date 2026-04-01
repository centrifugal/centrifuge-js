# Next Major: Clean Subscription Types

This document describes changes to make when the next major version removes backwards-compatibility constraints around subscription types.

## Current state (v6)

Class hierarchy exists but is partially hidden behind type aliases:

- `BaseSubscription` (class) — all logic
- `Subscription extends BaseSubscription` — empty wrapper, exists for backwards compat
- `MapSubscription extends BaseSubscription` — adds `publish(key, data?)` and `remove(key)`
- `SharedPollSubscription extends BaseSubscription` — empty placeholder

Exported types in `centrifuge.ts` are manually constructed (`CommonSurface` + Pick) to narrow the public surface. Internal classes are imported with `_` prefix to avoid name collisions with the type aliases. Factory methods use `as unknown as` to bridge between internal classes and exported types.

## Changes for next major

### 1. Export classes directly, drop type aliases

Remove the `CommonSurface` type, the `_`-prefixed imports, and all `as unknown as` casts. Export the actual classes:

```typescript
// centrifuge.ts
import { BaseSubscription, Subscription, MapSubscription, SharedPollSubscription } from './subscription';

// No type aliases needed — the classes ARE the types
```

```typescript
// index.ts
export { Subscription, MapSubscription, SharedPollSubscription } from './subscription';
// BaseSubscription exported only if users need it for mixed-type registries
export { BaseSubscription } from './subscription';
```

### 2. Move `publish(data)` and `history()` from BaseSubscription to Subscription

These are stream-specific. Currently on `BaseSubscription` because that used to be `Subscription`.

```typescript
// subscription.ts
export class BaseSubscription extends ... {
  // Remove: publish(data), history(opts)
  // Keep: subscribe, unsubscribe, ready, presence, presenceStats, etc.
}

export class Subscription extends BaseSubscription {
  async publish(data: any): Promise<PublishResult> { ... }
  async history(opts?: HistoryOptions): Promise<HistoryResult> { ... }
}
```

This eliminates the `publish` signature conflict — `MapSubscription.publish(key, data)` no longer overrides anything. The `data?` optional hack goes away.

### 3. Move map/shared-poll methods from BaseSubscription to subclasses

Currently `mapPublish`, `mapRemove`, `track`, `untrack`, `trackedKeys` live on `BaseSubscription` with runtime guards (`if (!this._map) throw`). Move them to their respective subclasses:

```typescript
export class MapSubscription extends BaseSubscription {
  async publish(key: string, data: any): Promise<PublishResult> { ... }
  async remove(key: string): Promise<PublishResult> { ... }
  // mapPublish/mapRemove become private or removed — publish/remove are the API
}

export class SharedPollSubscription extends BaseSubscription {
  async track(...) { ... }
  async untrack(...) { ... }
  trackedKeys(): Set<string> { ... }
}
```

### 4. Unify get/remove/subscriptions methods with discriminated union

Replace the separate typed getters with union returns:

```typescript
type AnySubscription = Subscription | MapSubscription | SharedPollSubscription;

getSubscription(channel: string): AnySubscription | null;
removeSubscription(sub: AnySubscription | null): void;
subscriptions(): Record<string, AnySubscription>;
```

Remove `getMapSubscription`, `removeMapSubscription`, `getSharedPollSubscription`, `removeSharedPollSubscription`, `mapSubscriptions`, `sharedPollSubscriptions`. Users narrow with the `type` discriminant:

```typescript
const sub = client.getSubscription('my-channel');
if (sub?.type === 'map') {
  sub.publish('key', data); // TypeScript knows it's MapSubscription
}
```

This requires making `type` a string literal on each class:

```typescript
class Subscription extends BaseSubscription {
  readonly type = 'stream' as const;
}
class MapSubscription extends BaseSubscription {
  readonly type = 'map' as const;
}
class SharedPollSubscription extends BaseSubscription {
  readonly type = 'shared_poll' as const;
}
```

### 5. Add runtime validation to getSubscription

Optional but recommended — guard against type misuse:

```typescript
getMapSubscription(channel: string): MapSubscription | null {
  const sub = this._subs[channel] ?? null;
  if (sub && sub.type !== 'map') {
    throw new Error(`Subscription to ${channel} is type '${sub.type}', not 'map'`);
  }
  return sub as MapSubscription | null;
}
```

Or just rely on the union + discriminant from step 4 and drop the typed getters entirely.

### 6. Narrow event types per class

Currently `BaseSubscription` extends `TypedEventEmitter<SubscriptionEvents>` where `SubscriptionEvents` is the union of all events. Each subclass should use its own event map:

```typescript
class BaseSubscription extends (EventEmitter as new () => TypedEventEmitter<BaseSubscriptionEvents>) { ... }
class Subscription extends (... as TypedEventEmitter<StreamSubscriptionEvents>) { ... }
class MapSubscription extends (... as TypedEventEmitter<MapSubscriptionEvents>) { ... }
class SharedPollSubscription extends (... as TypedEventEmitter<SharedPollSubscriptionEvents>) { ... }
```

This may require changing the EventEmitter inheritance pattern since TypeScript doesn't allow changing the generic parameter on `extends`. One approach: have `BaseSubscription` use the broadest event map internally, and use `declare` or interface merging on subclasses to narrow the public-facing type.

### 7. Clean up internal state fields

`BaseSubscription` currently carries all state for all subscription types (`_map`, `_mapPhase`, `_sharedPoll`, `_sharedPollTrackedItems`, etc.). Move these to the subclasses that use them. This is a larger refactor since much of the logic in `BaseSubscription` references these fields directly — it may require extracting handler methods that subclasses override.

### 8. Remove deprecated method aliases

- Remove `mapPublish` / `mapRemove` from public API (they become internal or disappear)
- If `track`/`untrack`/`trackedKeys` only exist on `SharedPollSubscription`, no aliases needed

## Migration guide for users

| v6 | Next major |
|---|---|
| `sub.mapPublish(key, data)` | `sub.publish(key, data)` on `MapSubscription` |
| `sub.mapRemove(key)` | `sub.remove(key)` on `MapSubscription` |
| `client.getMapSubscription(ch)` | `client.getSubscription(ch)` + narrow with `sub.type === 'map'` |
| `client.mapSubscriptions()` | Filter `client.subscriptions()` by `sub.type` |
| `import { Subscription }` | Same — but now it's a proper stream-only class |
| `import type { MapSubscription }` | `import { MapSubscription }` — it's a class now, not just a type |

## Checklist

- [ ] Move `publish(data)` and `history()` to `Subscription`
- [ ] Move `mapPublish`/`mapRemove` logic into `MapSubscription.publish`/`remove`
- [ ] Move `track`/`untrack`/`trackedKeys` to `SharedPollSubscription`
- [ ] Export classes directly from `index.ts`
- [ ] Remove `CommonSurface` type, `_`-prefixed imports, `as unknown as` casts
- [ ] Unify `getSubscription` return to discriminated union
- [ ] Remove typed getters (`getMapSubscription`, etc.) or keep as convenience with runtime validation
- [ ] Narrow event emitter types per subclass
- [ ] Move subscription-type-specific state fields to subclasses
- [ ] Update tests
- [ ] Update CHANGELOG with migration notes
