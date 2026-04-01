# Next Major: Clean Subscription Types

This document describes changes to make when the next major version removes backwards-compatibility constraints around subscription types.

## Current state (v5)

Class hierarchy exists but is partially hidden behind type aliases:

- `BaseSubscription` (class) — all logic, uses `InternalSubscriptionEvents` (broad event type for internal emit calls)
- `Subscription extends BaseSubscription` — empty wrapper, exists for backwards compat
- `MapSubscription extends BaseSubscription` — adds `publish(key, data?)` and `remove(key)`
- `SharedPollSubscription extends BaseSubscription` — empty placeholder

Exported types in `centrifuge.ts` are manually constructed (`CommonSurface` + explicit type members) to narrow the public surface. Internal classes are imported with `_` prefix to avoid name collisions with the type aliases. Factory methods use `as unknown as` to bridge between internal classes and exported types.

Event types:
- `SubscriptionEvents` — clean stream events (no `sync`/`update`)
- `InternalSubscriptionEvents` — extends `SubscriptionEvents` with `sync`/`update`, used only by `BaseSubscription` class internally so subclasses can emit map/shared-poll events
- `MapSubscriptionEvents` — `SubscriptionEvents` + narrowed `sync`/`update` with `MapUpdateContext`
- `SharedPollSubscriptionEvents` — `SubscriptionEvents` + narrowed `update` with `SharedPollUpdateContext`
- `BaseSubscriptionEvents` — alias for `SubscriptionEvents` (shared by all types)

Known compromises:
- `MapSubscription.publish(key, data?)` — `data` is optional to satisfy TS override of `BaseSubscription.publish(data)`. The exported type alias narrows it back to `publish(key: string, data: any)`.
- `mapPublish`/`mapRemove`/`track`/`untrack`/`trackedKeys` still live on `BaseSubscription` with runtime guards. Hidden from narrowed exported types but accessible via the class.
- `InternalSubscriptionEvents` exists solely because `BaseSubscription` needs to emit `sync`/`update` for its subclasses.

## Changes for next major

### 1. Rename `Subscription` → `StreamSubscription`, export classes directly

Rename the class and drop the type alias indirection. Remove the `CommonSurface` type, the `_`-prefixed imports, and all `as unknown as` casts. Export the actual classes:

```typescript
// subscription.ts
export class BaseSubscription extends ... { ... }
export class StreamSubscription extends BaseSubscription { ... }
export class MapSubscription extends BaseSubscription { ... }
export class SharedPollSubscription extends BaseSubscription { ... }
```

```typescript
// centrifuge.ts
import { BaseSubscription, StreamSubscription, MapSubscription, SharedPollSubscription } from './subscription';

// No type aliases needed — the classes ARE the types
```

```typescript
// index.ts
export { StreamSubscription, MapSubscription, SharedPollSubscription } from './subscription';
// BaseSubscription exported only if users need it for mixed-type registries
export { BaseSubscription } from './subscription';
```

Centrifuge client methods rename accordingly:
- `newSubscription()` → `newStreamSubscription()`
- `getSubscription()` returns `AnySubscription | null` (see step 4)
- `removeSubscription()` accepts `AnySubscription | null`

### 2. Move `publish(data)` and `history()` from BaseSubscription to StreamSubscription

These are stream-specific. Currently on `BaseSubscription` because that used to be `Subscription`.

```typescript
// subscription.ts
export class BaseSubscription extends ... {
  // Remove: publish(data), history(opts)
  // Keep: subscribe, unsubscribe, ready, presence, presenceStats, etc.
}

export class StreamSubscription extends BaseSubscription {
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
  // mapPublish/mapRemove removed — publish/remove are the API
}

export class SharedPollSubscription extends BaseSubscription {
  async track(...) { ... }
  async untrack(...) { ... }
  trackedKeys(): Set<string> { ... }
}
```

This also eliminates the runtime guards — calling `track()` on a `MapSubscription` is a compile-time error, not a runtime throw.

### 4. Unify get/remove/subscriptions methods with discriminated union

Replace the separate typed getters with union returns:

```typescript
type AnySubscription = StreamSubscription | MapSubscription | SharedPollSubscription;

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

This requires making `type` a string literal on each class (currently it's `string`):

```typescript
class StreamSubscription extends BaseSubscription {
  readonly type = 'stream' as const;
}
class MapSubscription extends BaseSubscription {
  readonly type = 'map' as const;
}
class SharedPollSubscription extends BaseSubscription {
  readonly type = 'shared_poll' as const;
}
```

### 5. Eliminate InternalSubscriptionEvents

Currently `BaseSubscription` uses `InternalSubscriptionEvents` (the superset with `sync`/`update`) because the emit calls for map and shared-poll events live in `BaseSubscription` methods. After step 3 moves logic to subclasses, each class can use its own event map:

- `BaseSubscription` → `BaseSubscriptionEvents` (no `sync`/`update`)
- `StreamSubscription` → `StreamSubscriptionEvents` (rename from `SubscriptionEvents`)
- `MapSubscription` → `MapSubscriptionEvents`
- `SharedPollSubscription` → `SharedPollSubscriptionEvents`

TypeScript doesn't allow changing the EventEmitter generic on `extends`. Approaches:
- Have `BaseSubscription` use a broad internal type and subclasses use `declare` to narrow
- Or make each subclass extend `EventEmitter` directly (losing shared constructor code)
- Or keep `InternalSubscriptionEvents` on the base class but never export it — subclasses just get narrower public types via their own event maps. This is what we have now and may be acceptable even in the next major.

### 6. Clean up internal state fields

`BaseSubscription` currently carries all state for all subscription types (`_map`, `_mapPhase`, `_sharedPoll`, `_sharedPollTrackedItems`, etc.). Move these to the subclasses that use them. This is a larger refactor since much of the logic in `BaseSubscription` references these fields directly — it may require extracting handler methods that subclasses override.

### 7. Remove deprecated method aliases

- Remove `mapPublish` / `mapRemove` from public API (already hidden by type narrowing, just delete from class)
- Remove `track`/`untrack`/`trackedKeys` from `BaseSubscription` (moved to `SharedPollSubscription` in step 3)

## Migration guide for users

| v5 | Next major |
|---|---|
| `import { Subscription }` | `import { StreamSubscription }` |
| `client.newSubscription(ch)` | `client.newStreamSubscription(ch)` |
| `client.getMapSubscription(ch)` | `client.getSubscription(ch)` + narrow with `sub.type === 'map'` |
| `client.getSharedPollSubscription(ch)` | `client.getSubscription(ch)` + narrow with `sub.type === 'shared_poll'` |
| `client.mapSubscriptions()` | Filter `client.subscriptions()` by `sub.type` |
| `client.sharedPollSubscriptions()` | Filter `client.subscriptions()` by `sub.type` |
| `client.removeMapSubscription(sub)` | `client.removeSubscription(sub)` |
| `client.removeSharedPollSubscription(sub)` | `client.removeSubscription(sub)` |
| `import type { MapSubscription }` | `import { MapSubscription }` — it's a class now, not just a type |
| `import type { SharedPollSubscription }` | `import { SharedPollSubscription }` — it's a class now, not just a type |
| `SubscriptionEvents` | `StreamSubscriptionEvents` |

## Lessons from validation

The full refactor was applied and validated (tsc clean, 135 tests pass). Key findings:

### `private` → `protected` is required for moving methods to subclasses

Moving `publish`/`history`/`track`/`untrack` etc. to subclasses requires these BaseSubscription members to become `protected`:
- `_centrifuge` — subclasses delegate to `this._centrifuge.publish(...)`, `this._centrifuge.mapPublish(...)`, etc.
- `_methodCall()` — gate for all RPC methods (waits for subscribed state)
- `_isSubscribed()` — used by track/untrack to decide whether to send immediately or buffer
- `_sharedPollTrackedItems`, `_sharedPollGetSignature`, `_sharedPollPendingSignature`, `_sharedPollPendingItems` — accessed by SharedPollSubscription.track/untrack
- `_sendTrackRequest()`, `_sendUntrackRequest()`, `_handleTrackError()` — called by SharedPollSubscription.track

### Steps 6, 5, and "export classes directly" are one domino chain

They cannot be done independently:
1. **Move state fields to subclasses (step 6)** — the real work. Internal logic (subscribe flow, recovery, publication handling) heavily references `_map*` and `_sharedPoll*` fields. Requires extracting handler methods that subclasses override.
2. **Eliminate InternalSubscriptionEvents (step 5)** — blocked by step 6. The `emit('sync', ...)` and `emit('update', ...)` calls live in BaseSubscription methods that process publications. Until that logic moves to subclasses, the base class needs the broad event type.
3. **Export classes directly / remove type aliases (step 1 partial)** — blocked by step 5. Type aliases exist because the class EventEmitter type is `InternalSubscriptionEvents` (too broad). Until each subclass has its own narrowed EventEmitter, the type aliases provide the narrowing.

Everything else in the checklist is independent and works cleanly.

### `removeSubscription` with union param needs internal cast

When `removeSubscription(sub: AnySubscription | null)` replaces separate typed remove methods, the body needs to cast `sub as unknown as _BaseSubscription` before calling internal `_removeSubscription`, since `AnySubscription` is a type alias (not the class).

## Checklist

- [ ] Rename `Subscription` → `StreamSubscription` (no deprecated alias — clean break)
- [ ] Rename `newSubscription()` → `newStreamSubscription()` (no deprecated alias)
- [ ] Rename `SubscriptionEvents` → `StreamSubscriptionEvents`
- [ ] Move `publish(data)` and `history()` to `StreamSubscription` class
- [ ] Move `mapPublish`/`mapRemove` logic into `MapSubscription.publish`/`remove`
- [ ] Move `track`/`untrack`/`trackedKeys` to `SharedPollSubscription`
- [ ] Change `private` → `protected` for `_centrifuge`, `_methodCall`, `_isSubscribed`, `_sharedPoll*`, `_sendTrackRequest`, `_sendUntrackRequest`, `_handleTrackError`
- [ ] Make `type` a const literal on each class for discriminated union narrowing
- [ ] Unify `getSubscription`/`removeSubscription`/`subscriptions` return to `AnySubscription` discriminated union
- [ ] Remove typed getters (`getMapSubscription`, `removeMapSubscription`, `getSharedPollSubscription`, `removeSharedPollSubscription`, `mapSubscriptions`, `sharedPollSubscriptions`)
- [ ] Remove `mapPublish`/`mapRemove` method aliases from class
- [ ] Export `StreamSubscription`, `MapSubscription`, `SharedPollSubscription` classes from `index.ts`
- [ ] Update tests
- [ ] Update CHANGELOG with migration notes
- [ ] **(Domino chain — do together, or defer):**
  - [ ] Move subscription-type-specific state fields and logic to subclasses (`_map*`, `_sharedPoll*`)
  - [ ] Eliminate `InternalSubscriptionEvents` — each subclass gets own EventEmitter type
  - [ ] Remove `CommonSurface` type, `_`-prefixed imports, `as unknown as` casts — export classes directly
