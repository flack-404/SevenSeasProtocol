# Seven Seas Protocol — Agent Behaviour Patterns
**Five autonomous AI pirates, each with a distinct strategic identity**

---

## How Agents Work

Each agent runs an independent loop every 30 seconds:

```
Read chain state → Build prompt → Call Groq LLM → Parse decision → Execute on-chain
```

The system prompt defines the agent's personality and rules. The LLM receives a compact snapshot of current game state and outputs a JSON decision. Sanity overrides block impossible moves. When Groq's daily token limit is hit, each agent falls back to hardcoded rules that mirror their LLM strategy.

---

## Agent 0 — Blackbeard 🏴‍☠️
**Archetype: AggressiveRaider (`type = 0`)**

### Personality
The most feared pirate on the Seven Seas. Reckless, violent, lives for the fight. Never idles, never backs down, never repairs unless he's nearly dead.

### Strategy
| Decision | Blackbeard's approach |
|---|---|
| **Battle wager** | 20–30% of bankroll — large bets every time |
| **Target selection** | Prefers weak opponents (low ELO) for easy wins |
| **Repair threshold** | Only repairs below 40% HP — embraces damage |
| **Upgrades** | Prioritises attack (cannons) when gold > 500 |
| **GPM claims** | Claims frequently — funds more fights |
| **Idle behaviour** | Never idles. If no open match, creates one |

### Fallback rules (when Groq limit hit)
1. If bankroll < 200 SEAS → `deposit_bankroll`
2. If open matches exist → `accept_match`
3. If HP < 40% → `repair_ship`
4. Default → `wager_battle` with 25% of bankroll

### Risk profile
**HIGH RISK / HIGH REWARD.** Most likely to blow up bankroll fast or snowball into a dominant position. Tempest's chief rival in aggression. In live testing, Blackbeard's large wagers mean a single loss streak can drain his bankroll. His ELO swings dramatically.

### Typical cycle
```
Check claimable gold → claim if any
Look for weak-ELO open matches → accept immediately
If none → create new match at 25% wager
If HP < 40% → repair (reluctantly)
```

---

## Agent 1 — Ironclad ⚓
**Archetype: DefensiveTrader (`type = 1`)**

### Personality
Admiral Ironclad — disciplined Navy commander. Methodical, patient, protects assets above all else. Would rather let a fight pass than take an unfavourable wager.

### Strategy
| Decision | Ironclad's approach |
|---|---|
| **Battle wager** | 5–10% of bankroll — very conservative |
| **Condition to fight** | Only wagers when HP > 80% AND his ELO > opponent ELO |
| **Repair threshold** | Repairs at 70% HP — won't wait until critical |
| **Upgrades** | Prioritises GPM (passive income) over combat stats |
| **Location** | Stays at ports when possible (safe zones, no battle while docked) |
| **Idle behaviour** | Happy to check_in, claim_gpm, upgrade GPM rather than fight |

### Fallback rules (when Groq limit hit)
1. If bankroll < 200 SEAS → `deposit_bankroll`
2. If HP < 70% → `repair_ship`
3. If claimable gold > 0 → `claim_gpm`
4. If HP > 80% and open match exists with opponent ELO ≤ own ELO → `accept_match`
5. Default → `check_in` or `upgrade` (GPM)

### Risk profile
**LOW RISK / SLOW GROWTH.** Ironclad accumulates wealth passively through GPM upgrades and only fights when conditions are near-perfect. His win rate should be high but his total wagers will be low. Unlikely to be eliminated but unlikely to dominate ELO.

### Typical cycle
```
Claim GPM if available
If at port and crew not full → hire_crew
If HP < 70% → repair
If HP > 80% and good matchup exists → accept carefully
Otherwise → upgrade GPM or check_in
```

---

## Agent 2 — TheGhost 👻
**Archetype: AdaptiveLearner (`type = 2`)**

### Personality
A mysterious mercenary. Calculates every edge. Does not fight on emotion — only on mathematics. Uses Kelly Criterion for bankroll sizing and studies opponent ELO before committing.

### Strategy
| Decision | TheGhost's approach |
|---|---|
| **Battle wager** | Kelly Criterion sizing: win_rate > 60% → 20%; 40–60% → 15%; < 40% → 10% |
| **Condition to fight** | Only when own stats favour the matchup |
| **Repair threshold** | 60% HP |
| **Upgrades** | Upgrades attack when `attack < defense × 1.2` — keeps offensive edge |
| **Target selection** | Tracks the highest ELO opponent for potential upset bets |
| **Edge focus** | Won't wager if no statistical advantage |

### Fallback rules (when Groq limit hit)
1. If bankroll < 200 SEAS → `deposit_bankroll`
2. If HP < 60% → `repair_ship`
3. If wins > losses (positive win rate) and open match exists → `accept_match` at 15% wager
4. If wins ≤ losses → `claim_gpm` or `upgrade` (attack)
5. Default → `check_in`

### Risk profile
**MEDIUM RISK / PRECISION-FOCUSED.** TheGhost's Kelly sizing means he won't over-bet — but he also won't under-bet a favourable position. He is the most mathematically sound agent. Expected to have the most consistent long-term ELO growth if win rates stay above 50%.

### Known issue
TheGhost was one of two agents that had `isRegistered: false` early in testing — his initial 100 SEAS bankroll was wiped in early losses before the 200 SEAS proactive top-up logic was added. Re-registered with 500 SEAS via `fix-registration.js`.

### Typical cycle
```
Assess win rate (wins / total games)
Size wager per Kelly → create or accept match
If no edge → repair / claim / upgrade attack
Track highest ELO agent for future upset target
```

---

## Agent 3 — Admiralty 🎖️
**Archetype: GuildCoordinator (`type = 3`)**

### Personality
The Admiralty — a fleet coordinator. Builds alliances, maintains organisation, dominates through structure rather than brute force. Keeps crew at full strength at all times.

### Strategy
| Decision | Admiralty's approach |
|---|---|
| **Battle wager** | 15% of bankroll — medium risk |
| **Condition to fight** | Prefers similar-ELO opponents (fair fights) |
| **Repair threshold** | 50% HP |
| **Crew** | Always maintains full crew — first priority at any port |
| **Upgrades** | Crew and GPM upgrades first; combat stats second |
| **GPM claims** | Claims frequently to fuel upgrades and crew costs |

### Fallback rules (when Groq limit hit)
1. If bankroll < 200 SEAS → `deposit_bankroll`
2. If at port and crew < maxCrew → `hire_crew`
3. If HP < 50% → `repair_ship`
4. If claimable gold > 0 → `claim_gpm`
5. If open match with similar ELO (±100) → `accept_match` at 15%
6. Default → `upgrade` (GPM or crew capacity)

### Risk profile
**MEDIUM RISK / BALANCED.** Admiralty is the most well-rounded agent. His focus on crew bonuses means his combat stats get a passive boost from full-crew multipliers. Medium wager size keeps bankroll stable. Expected to be competitive across a wide range of ELO matchups.

### Known issue
Same as TheGhost — deactivated early due to initial 100 SEAS bankroll depleted in losses. Re-registered with 500 SEAS.

### Typical cycle
```
At port: hire crew to full, claim GPM
Assess open matches → prefer ±100 ELO range
Create or accept match at 15% wager
Upgrade crew/GPM when gold allows
Repair if HP < 50%
```

---

## Agent 4 — Tempest 🌊
**Archetype: BalancedAdmiral (`type = 4`)**

### Personality
Admiral Tempest — an unpredictable force of nature. Adapts constantly. Win streak? Go aggressive. Loss streak? Go defensive. Always surprises.

### Strategy
| Decision | Tempest's approach |
|---|---|
| **Battle wager (win streak)** | 20% of bankroll — aggressive mode when wins > losses × 1.5 |
| **Battle wager (loss streak)** | 10% of bankroll — defensive mode when losses > wins |
| **Battle wager (neutral)** | 15% of bankroll |
| **Repair threshold** | 65% HP |
| **Upgrades** | Mixes all upgrade types — doesn't specialise |
| **ELO hunting** | Occasionally challenges the highest-ELO agent for statement wins |
| **Adaptation** | Changes strategy each cycle based on running record |

### Fallback rules (when Groq limit hit)
1. If bankroll < 200 SEAS → `deposit_bankroll`
2. If HP < 65% → `repair_ship`
3. If open match exists:
   - Win streak (wins > losses × 1.5) → `accept_match` at 20%
   - Loss streak (losses > wins) → `accept_match` at 10%
   - Otherwise → `accept_match` at 15%
4. Default → `wager_battle` (sized by streak mode) or `claim_gpm`

### Risk profile
**VARIABLE RISK / HIGHEST CEILING.** Tempest's adaptive sizing makes him hard to predict and hard to counter. In live testing he went **33W/0L** with ELO 1660 and a bankroll of ~3001 SEAS — the dominant agent. His willingness to challenge high-ELO targets while on a win streak accelerates ELO gain.

### Why Tempest is winning
- Win streaks trigger 20% wagers → bankroll compounds quickly
- Mixed upgrades mean no stat weakness opponents can exploit
- Occasional high-ELO challenges give disproportionate ELO gain on wins
- Adaptive mode shift prevents prolonged loss spirals

### Typical cycle
```
Assess current win/loss ratio → set aggression mode
Claim GPM if available
Look for open match:
  - On win streak → preferentially target high ELO
  - On loss streak → target low ELO for safe recovery
Execute at appropriate wager %
Mix upgrade types each cycle (attack → defense → GPM → crew → repeat)
```

---

## Cross-Agent Interaction Patterns

### Match creation dynamics
Blackbeard creates matches aggressively → Tempest and Admiralty accept them frequently → Ironclad only accepts if HP > 80% and ELO advantage → TheGhost accepts only when Kelly says there's edge.

### Who fights who most
- Tempest vs Blackbeard — highest volume, both aggressive
- Admiralty vs TheGhost — medium ELO range, similar wager sizes
- Ironclad mostly waits for favourable matchups, lowest fight frequency

### Bankroll risk ladder (most to least risky)
```
Blackbeard (25% wager, fights regardless of HP)
  > Tempest (20% on win streak)
    > TheGhost (Kelly, up to 20% with edge)
      > Admiralty (15% flat)
        > Ironclad (5-10%, conditions required)
```

### ELO projection
| Agent | Expected trajectory |
|---|---|
| Tempest | Continues climbing — adaptive strategy self-corrects |
| Blackbeard | High variance — can peak high or crash |
| TheGhost | Slow steady climb — best long-run consistency |
| Admiralty | Stable mid-table — reliable but not dominant |
| Ironclad | Low fight rate — ELO barely moves, bankroll grows slowly |

---

## Groq LLM Integration

- **Model:** `llama-3.3-70b-versatile`
- **Max tokens:** 200 (raised from 120 to prevent truncated JSON)
- **Prompt structure:**
  ```
  [System prompt with archetype + rules]
  [Compact state: HP%, bankroll, ELO, wins/losses, claimable gold, location]
  [Open matches list]
  [Action schema: JSON format required]
  ```
- **Free tier limit:** 100,000 tokens/day — fallback activates when exhausted
- **Fallback:** Each agent has rule-based decisions matching their LLM strategy, ensuring no downtime

### Why LLM + rules hybrid
Pure LLM: unreliable when context window is tight, hallucinates impossible actions (claim_gpm with 0 gold, hire_crew not at port), and hits daily limits.

Pure rules: predictable, no strategic flavour, no adaptation to novel situations.

**Hybrid approach:** LLM handles strategy and flavour, rules handle impossible states and limit fallback. Best of both.
