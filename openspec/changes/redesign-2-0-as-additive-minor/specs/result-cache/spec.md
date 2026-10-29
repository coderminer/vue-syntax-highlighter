## Purpose

Defines the default cache-key composition, the opt-in engine-identity partition, the per-engine `cacheKey` override, and the guarantee that cache budgets and default deduplication remain unchanged.

## ADDED Requirements

### Requirement: Default cache keys remain engine-id based

Without the new option, cache keys SHALL continue to use the engine's `id`, language, normalized code, and serializable engine options. The theme MUST remain excluded. Two engine objects with the same `id` MUST continue to share cached results by default.

#### Scenario: Same-id engines share by default

- **WHEN** two distinct engine objects with the same `id` highlight identical code and options without the opt-in
- **THEN** the second request may reuse the first cached result

#### Scenario: Theme does not affect the key

- **WHEN** only the theme changes on a block
- **THEN** the cache key is unchanged and no new engine result is required

#### Scenario: Options affect the key

- **WHEN** engine options differ for otherwise identical input
- **THEN** the cache keys differ and results are not mixed

### Requirement: Engine-identity mode is opt-in

Provider props and plugin options SHALL accept a `cacheEngineIdentity` boolean whose default is `false`. When `true`, the fallback cache key MUST include a stable identity for the specific engine object in addition to its `id`, so distinct objects with the same `id` do not share cached results.

#### Scenario: Distinct engine objects stop sharing

- **WHEN** `cacheEngineIdentity` is enabled and two engines share an `id` but are different objects
- **THEN** their cache keys differ and each engine's result is stored separately

#### Scenario: The same engine object keeps a stable key

- **WHEN** the same engine object highlights the same input repeatedly with `cacheEngineIdentity` enabled
- **THEN** the key is stable and subsequent calls reuse the cached result

#### Scenario: Default remains off

- **WHEN** a consumer upgrades without setting `cacheEngineIdentity`
- **THEN** the default engine-id key format and sharing behavior are unchanged

### Requirement: Per-engine cacheKey override keeps precedence

If an engine implements the public `cacheKey` hook and returns a non-empty string, that value SHALL be used instead of both the default and identity-based fallback keys. If the hook throws or returns an empty or non-string value, the selected fallback mode MUST be used without failing the highlight.

#### Scenario: Custom key wins

- **WHEN** an engine returns a custom non-empty cache key
- **THEN** the cache uses that key regardless of the identity option

#### Scenario: Broken custom key falls back safely

- **WHEN** an engine's `cacheKey` hook throws or returns an empty value
- **THEN** highlighting succeeds with the configured fallback key

### Requirement: Deduplication follows the resulting key

In-flight request deduplication SHALL use the same key as the cache. Identical resulting keys MUST share one in-flight request; different keys MUST NOT be merged.

#### Scenario: Identical keys deduplicate

- **WHEN** two concurrent requests produce the same cache key
- **THEN** the engine runs once and both callers receive the same result

#### Scenario: Identity mode separates concurrent requests

- **WHEN** two concurrent requests use different engine identities with identity mode enabled
- **THEN** each key has its own request and results are not merged

### Requirement: Cache budgets and lifecycle are unchanged

Capacity, character budgets, LRU eviction, oversized-entry handling, clearing, and disposal SHALL behave exactly as before in both key modes. The identity option MUST NOT change cache size accounting.

#### Scenario: Budgets still evict correctly

- **WHEN** identity mode is enabled and the cache reaches its entry or character budget
- **THEN** eviction follows the existing least-recently-used rules

#### Scenario: Clearing removes both modes

- **WHEN** the provider cache is cleared
- **THEN** entries and in-flight requests produced under either key mode are removed

### Requirement: Identity configuration is creation-time

`cacheEngineIdentity` SHALL be read when the highlighter context is created, consistent with the existing cache configuration. Changing it after creation MUST be ignored and MUST emit one development warning; consumers recreate the provider or plugin scope to change it.

#### Scenario: Late change warns and does not apply

- **WHEN** `cacheEngineIdentity` changes after the provider is created
- **THEN** the existing mode remains active and one development warning explains that the provider must be recreated

#### Scenario: Recreated scope applies the new mode

- **WHEN** the provider is recreated with a different `cacheEngineIdentity` value
- **THEN** the new scope uses the new key mode

### Requirement: No future default change

No additive release SHALL enable engine-identity keys by default, remove the default engine-id path, or change the `cacheKey` hook's precedence.

#### Scenario: Upgrade keeps default sharing

- **WHEN** an existing consumer upgrades without setting the option
- **THEN** same-id engines still share cached results as before

#### Scenario: Documentation presents identity mode as opt-in

- **WHEN** a consumer reads the caching documentation
- **THEN** the default sharing behavior and the opt-in partition behavior are both stated
