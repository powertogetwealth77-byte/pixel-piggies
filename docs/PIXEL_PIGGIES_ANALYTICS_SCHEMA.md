# Pixel Piggies — Analytics Schema V1

## Rules

- Use snake_case event names.
- Never send unnecessary personal information.
- Include `app_version`, `level_id`, `session_number`, and `config_version` where relevant.
- Economy events must include source/sink and balance after transaction.
- Ad and purchase success must be confirmed by the provider callback, not button tap.

## Core funnel

| Event | Required properties |
|---|---|
| `session_started` | session_number, days_since_install |
| `tutorial_step_started` | step_id, level_id |
| `tutorial_step_completed` | step_id, level_id, duration_seconds |
| `level_started` | level_id, attempt_number, hearts_before |
| `level_completed` | level_id, duration_seconds, stars, max_flow, pods_max_used, boosters_used |
| `level_failed` | level_id, duration_seconds, fail_reason, pods_used, queue_position, boosters_used |
| `level_restarted` | level_id, reason |

## Mechanic diagnostics

| Event | Required properties |
|---|---|
| `piggie_selected` | level_id, piggie_color, ammo_before, queue_position |
| `piggie_attack_finished` | color, ammo_spent, ammo_remaining, targets_destroyed |
| `piggie_entered_pod` | color, ammo_remaining, pod_index, pods_used |
| `piggie_relaunched` | color, ammo_remaining, wait_seconds |
| `pod_capacity_warning` | level_id, pods_used |
| `perfect_flow_changed` | previous_value, new_value, break_reason |
| `bloom_burst_started` | level_id, max_flow |
| `bloom_burst_skipped` | level_id, elapsed_seconds |

## Economy

| Event | Required properties |
|---|---|
| `currency_earned` | currency, amount, source, balance_after |
| `currency_spent` | currency, amount, sink, balance_after |
| `booster_granted` | booster_id, amount, source |
| `booster_used` | booster_id, level_id, attempt_number |
| `heart_changed` | amount, reason, balance_after |

## Ads

| Event | Required properties |
|---|---|
| `rewarded_ad_offered` | placement, level_id |
| `rewarded_ad_started` | placement, network |
| `rewarded_ad_completed` | placement, network, reward_id |
| `rewarded_ad_failed` | placement, network, error_group |

## Purchases

| Event | Required properties |
|---|---|
| `store_opened` | entry_point |
| `offer_viewed` | offer_id, entry_point |
| `purchase_started` | product_id, localized_price |
| `purchase_completed` | product_id, localized_price, currency_code, transaction_verified |
| `purchase_failed` | product_id, error_group |
| `purchases_restored` | restored_count |

## Retention/meta

| Event | Required properties |
|---|---|
| `daily_reward_claimed` | streak_day, reward_id |
| `fragment_earned` | piggie_id, amount, source |
| `piggie_unlocked` | piggie_id, rarity, source |
| `collection_opened` | entry_point, unlocked_count |
| `world_unlocked` | world_id, total_stars |

## Dashboard gates

- Tutorial completion ≥80%
- Median first session ≥7 completed levels
- Level 1 completion ≥90%
- Level 7 completion among starters ≥50%
- D1 retention ≥32%
- D7 retention ≥10%
- Crash-free sessions ≥99.5%
- Rewarded-ad participation ≥25% after introduction
- First purchase conversion ≥1.5% after a statistically useful cohort exists

