# Next Major: Clean Subscription Types

This document describes changes to make when the next major version removes backwards-compatibility constraints around subscription types.

## Status

A subset of this plan has already landed in v5 because the map/shared-poll APIs are not yet released and the user authorized breaking changes there:

- ✅ `publish(data)` and `history(opts)` moved from `BaseSubscription` into `Subscription` class (still named `Subscription`, not yet `StreamSubscription`).
- ✅ `mapPublish` / `mapRemove` deleted from `BaseSubscription`; their logic is inlined into `MapSubscription.publish(key, data)` / `MapSubscription.remove(key)`.
- ✅ `MapSubscription.publish` now takes `data: any` (required) on both the impl and the public type — the `data?` override hack is gone.
- ✅ `track`, `untrack`, `trackedKeys` moved from `BaseSubscription` to `SharedPollSubscription`; the `if (!this._sharedPoll) throw` runtime guards are gone.
- ✅ Required protected members promoted: `_centrifuge`, `_methodCall`, `_debounceMs`, `_debouncedPublish`, `_cancelDebounce`, `_isSubscribed`, `_sharedPollTrackedItems`, `_sharedPollGetSignature`, `_sharedPollPendingSignature`, `_sharedPollPendingItems`, `_sendTrackRequest`, `_sendUntrackRequest`, `_handleTrackError`.

The remaining items below are still future work.

## Current state (v5, post-shipped-cleanup)

Class hierarchy exists but is partially hidden behind type aliases:

- `BaseSubscription` (class) — lifecycle + shared internal helpers (including the protected `_sendTrackRequest` / `_sendUntrackRequest` / `_handleTrackError` and the shared-poll lifecycle handlers `_sharedPollReplayTrack` / `_sharedPollRefreshSignature` invoked from the subscribe flow). Uses `InternalSubscriptionEvents` (broad event type for internal emit calls). No longer hosts `publish(data)`, `history(opts)`, `mapPublish`, `mapRemove`, `track`, `untrack`, or `trackedKeys`.
- `Subscription extends BaseSubscription` — defines `publish(data)` and `history(opts)` for stream channels.
- `MapSubscription extends BaseSubscription` — defines `publish(key, data)` and `remove(key)`, no override conflict.
- `SharedPollSubscription extends BaseSubscription` — defines `track`, `untrack`, `trackedKeys` directly; no runtime guards.

Exported types in `centrifuge.ts` are still manually constructed (`CommonSurface` + explicit type members) to narrow the public surface. Internal classes are imported with `_` prefix to avoid name collisions with the type aliases. Factory methods still use `as unknown as` to bridge between internal classes and exported types.

Event types:
- `SubscriptionEvents` — clean stream events (no `sync`/`update`)
- `InternalSubscriptionEvents` — extends `SubscriptionEvents` with `sync`/`update`, used by `BaseSubscription` class internally so subclasses can emit map/shared-poll events
- `MapSubscriptionEvents` — `SubscriptionEvents` + narrowed `sync`/`update` with `MapEntry` / `MapUpdateContext`
- `SharedPollSubscriptionEvents` — `SubscriptionEvents` + narrowed `update` with `SharedPollUpdateContext`
- `BaseSubscriptionEvents` — alias for `SubscriptionEvents` (shared by all types)

Remaining known compromise:
- `InternalSubscriptionEvents` still exists because `BaseSubscription` lifecycle code emits `sync` and `update` from publication handlers and from `_sharedPollReplayTrack` / `_sharedPollRefreshSignature` (synthetic `removed:true` events on key revocation). Eliminating it requires moving those emit sites into the subclasses, which is part of the domino chain (state-field migration → event-type narrowing → drop type aliases).

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

Already done — both `publish(data)` and `history(opts)` live on the `Subscription` class (which will be renamed `StreamSubscription`). `BaseSubscription` no longer hosts either method, so map and shared-poll subscriptions don't inherit them. The override conflict and `data?` optional hack are gone.

### 3. Move map/shared-poll methods from BaseSubscription to subclasses

Already done. Both sides are now in their respective subclasses with no runtime guards:

```typescript
export class MapSubscription extends BaseSubscription {
  async publish(key: string, data: any): Promise<PublishResult> { ... }
  async remove(key: string): Promise<PublishResult> { ... }
}

export class SharedPollSubscription extends BaseSubscription {
  track(keysOrItems: string[] | SharedPollTrackItem[], signature?: string): void { ... }
  untrack(keys: string[]): void { ... }
  trackedKeys(): Set<string> { ... }
}
```

Calling `track()` on a `MapSubscription` (or vice versa) is now a compile-time error rather than a runtime throw.

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

Already done. `mapPublish` / `mapRemove` no longer exist on `BaseSubscription`. `track`/`untrack`/`trackedKeys` are no longer on `BaseSubscription` — they live on `SharedPollSubscription`.

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

All of the BaseSubscription members needed by the migrated subclass methods are now `protected`:
- `_centrifuge` — subclasses delegate to `this._centrifuge.publish(...)`, `this._centrifuge.mapPublish(...)`, etc.
- `_methodCall()` — gate for all RPC methods (waits for subscribed state).
- `_debounceMs`, `_debouncedPublish()`, `_cancelDebounce()` — used by both `Subscription.publish` and `MapSubscription.publish`/`remove`.
- `_isSubscribed()` — used by `track`/`untrack` to decide whether to send immediately or buffer.
- `_sharedPollTrackedItems`, `_sharedPollGetSignature`, `_sharedPollPendingSignature`, `_sharedPollPendingItems` — accessed by `SharedPollSubscription.track`/`untrack`.
- `_sendTrackRequest()`, `_sendUntrackRequest()`, `_handleTrackError()` — called by `SharedPollSubscription.track`/`untrack`.

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
- [x] Move `publish(data)` and `history(opts)` to `StreamSubscription` class _(done in v5; both live on `Subscription` pending the rename)_
- [x] Move `mapPublish`/`mapRemove` logic into `MapSubscription.publish`/`remove`
- [x] Move `track`/`untrack`/`trackedKeys` to `SharedPollSubscription`
- [x] Promote all required `private` → `protected` members (`_centrifuge`, `_methodCall`, `_debounceMs`, `_debouncedPublish`, `_cancelDebounce`, `_isSubscribed`, `_sharedPollTrackedItems`, `_sharedPollGetSignature`, `_sharedPollPendingSignature`, `_sharedPollPendingItems`, `_sendTrackRequest`, `_sendUntrackRequest`, `_handleTrackError`)
- [ ] Make `type` a const literal on each class for discriminated union narrowing
- [ ] Unify `getSubscription`/`removeSubscription`/`subscriptions` return to `AnySubscription` discriminated union
- [ ] Remove typed getters (`getMapSubscription`, `removeMapSubscription`, `getSharedPollSubscription`, `removeSharedPollSubscription`, `mapSubscriptions`, `sharedPollSubscriptions`)
- [x] Remove `mapPublish`/`mapRemove` method aliases from class
- [ ] Export `StreamSubscription`, `MapSubscription`, `SharedPollSubscription` classes from `index.ts`
- [ ] Update tests
- [ ] Update CHANGELOG with migration notes
- [ ] **(Domino chain — do together, or defer):**
  - [ ] Move subscription-type-specific state fields and logic to subclasses (`_map*`, `_sharedPoll*`)
  - [ ] Eliminate `InternalSubscriptionEvents` — each subclass gets own EventEmitter type
  - [ ] Remove `CommonSurface` type, `_`-prefixed imports, `as unknown as` casts — export classes directly
