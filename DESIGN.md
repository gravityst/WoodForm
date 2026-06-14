# WoodForm — Game Design Document

**Version:** 1.0 (Pre-Production)
**Prepared by:** WoodForm Design Team
**Status:** Living document
**Primary platform:** iOS · **Secondary:** PC (Steam), Console (Switch, PlayStation, Xbox)
**Companion artifact:** Browser prototype (Three.js + WebAudio) shipping alongside this document

---

## Table of Contents

1. [Overview & Design Pillars](#1-overview--design-pillars)
2. [Core Gameplay Loop](#2-core-gameplay-loop)
3. [Material Removal System](#3-material-removal-system)
4. [Tool Types & Upgrades](#4-tool-types--upgrades)
5. [Wood Types](#5-wood-types)
6. [Object Categories](#6-object-categories)
7. [Scoring System](#7-scoring-system)
8. [Game Modes](#8-game-modes)
9. [Progression System](#9-progression-system)
10. [Economy](#10-economy)
11. [Visual Style](#11-visual-style)
12. [Audio Design](#12-audio-design)
13. [Retention Features](#13-retention-features)
14. [Monetization](#14-monetization)
15. [Technical Design](#15-technical-design)
16. [Roadmap](#16-roadmap)

---

## 1. Overview & Design Pillars

**WoodForm** is a tactile, skill-based wood-carving and lathe-turning game. The player mounts a rotating wooden log onto a lathe, presses carving tools against it to remove material, and shapes the spinning blank into a finished object — a cup, a bowl, a chess knight, a dragon. They then sand and finish the piece and receive a multi-metric score, earning currency and unlocking new tools, woods, and increasingly ambitious commissions.

The game sits at the intersection of four proven satisfaction loops:

- **Craft/cleaning satisfaction** — the dopamine of visible, irreversible transformation (PowerWash Simulator, House Flipper).
- **Simulator progression** — tool trees, workshop upgrades, reputation (Car Mechanic Simulator).
- **Puzzle precision** — matching a target profile under tolerance, where a steady hand and planning are rewarded.
- **ASMR relaxation** — warm wood, soft shavings, gentle ambience, no fail-state pressure.

### 1.1 One-Sentence Pitch

> Mount a log, carve it into something beautiful, and feel every shaving fall away — a relaxing, endlessly replayable woodturning craft game built for short mobile sessions and deep mastery.

### 1.2 Design Pillars

| # | Pillar | What it means in practice | What we will sacrifice to protect it |
|---|--------|---------------------------|--------------------------------------|
| **P1** | **Extremely satisfying carving** | Every contact produces immediate, readable feedback: shavings, sound, a smoothly shrinking profile. The single most important feel in the game. | Realism, if realism ever makes a cut feel mushy or unresponsive. |
| **P2** | **Realistic wood removal** | Material is removed continuously and believably; hardness, grain, and tool sharpness matter; you cannot un-cut. | Arcade "magnet-to-target" assists at higher difficulties. |
| **P3** | **Relaxing & stress-relieving** | No timers that kill you, no permadeath, no aggressive monetization. Time pressure is opt-in and only ever affects score, never survival. | Difficulty spikes and punishing failure screens. |
| **P4** | **High replayability** | Procedural order variation, daily/weekly content, leaderboards, and a scoring system that always leaves "5 more points" on the table. | Hand-authored-only content with a finite end. |
| **P5** | **Strong progression** | Hundreds of hours of tools, woods, workshop tiers, reputation, and collection goals with a tuned XP curve. | Front-loading all content; everything is earned. |
| **P6** | **Short mobile sessions** | A satisfying order completes in 90–240 seconds. The game saves mid-carve. Great in a 3-minute queue, great for a 2-hour evening. | Mandatory long sessions or un-pausable orders. |
| **P7** | **Visually impressive transformations** | The before/after delta is dramatic and screenshot-worthy; the finished piece looks genuinely premium. | Over-busy UI that competes with the wood. |
| **P8** | **"One more order" feeling** | The loop resolves with a reward, a tease of the next unlock, and a fresh order already queued. | Dead-end screens that make the player decide to stop. |

**Tension note:** P1 (satisfaction) and P2 (realism) occasionally conflict. **Recommendation:** when they conflict, P1 wins. Realism is a flavor that serves satisfaction, never a master that overrides it.

---

## 2. Core Gameplay Loop

### 2.1 The Macro Loop

```
Receive Order → Select Wood → Mount Log → Carve (rough → refine) →
Match Target → Sand & Finish → Score & Rewards → Unlock → (next Order queued)
```

Target session: **one order = 90–240s**. The loop is designed so the player almost always sees the next reward before they put the phone down.

### 2.2 Step-by-Step

**1. Receive Order.** A customer card slides in: object name, a 3D preview of the target, the recommended wood, the reward range, and any modifiers (e.g., "Rush: +20% reward if under 90s," "Heirloom: Finishing weighted ×2"). The player can accept, reroll (costs a small fee or a free daily reroll), or browse the order board (career) / pick freely (workshop).

**2. Select Wood.** The player chooses a blank from inventory. Wood choice is a real decision: harder woods are slower and less forgiving but worth more and look better; softer woods are fast and forgiving but lower value. A "recommended" tag nudges newcomers.

**3. Mount Log.** A quick, satisfying mount animation: the blank drops into the lathe, clamps engage, the motor spins up with a rising whir. The target's ghost profile (a translucent overlay of the goal silhouette) appears around the spinning blank, controlled by a difficulty-dependent assist setting.

**4. Carve.** The heart of the game (see [§3](#3-material-removal-system)). The player selects a tool and presses it against the spinning log. On touch: drag along the log's length (the X axis) to choose contact position; the tool's pressure scales with how hard/long it's held (a held press deepens the cut). Material falls away as shavings; the visible profile shrinks in real time toward (or, if careless, past) the target. The natural rhythm is **rough out the bulk fast, then refine with precision tools, then micro-correct.**

**5. Match Target.** A live "fit" meter shows aggregate deviation from the target profile, plus per-zone heat coloring on the ghost (red = too much material remains, blue = over-carved). The player chases green.

**6. Sand & Finish.** Switch to sanding (smooths the high-frequency roughness the cutting introduced) and then finishing (oil/wax/lacquer — a swipe-to-apply mini-step that boosts Finishing Quality and changes the final sheen).

**7. Score & Rewards.** A six-metric breakdown animates in (see [§7](#7-scoring-system)), resolving to a 1–5 star rating, currency, XP, and reputation. Confetti of wood-dust; the finished piece rotates on a turntable beside its target.

**8. Unlock & Re-queue.** Any unlock that crossed a threshold pops here. The next order is already visible. The "Continue" button is large and inviting — **P8** in action.

### 2.3 Moment-to-Moment Carving Feel

The feel target is *"hot knife through butter, but the butter fights back a little."* Concretely:

- **Latency:** contact-to-feedback under one frame (16 ms). Shavings, sound, and profile change must feel simultaneous with touch.
- **Haptics (iOS):** a continuous Core Haptics texture whose intensity tracks removal rate; a soft "catch" transient when crossing a grain line; a distinct "alert" buzz the instant the profile dips below target (over-carve warning).
- **Audio:** pitch and grain of the cutting sound rise with pressure and rotation speed (see [§12](#12-audio-design)).
- **Camera:** subtle dolly-in on contact, a slight chromatic warmth; particles catch a key light so shavings glint.
- **Reward of restraint:** the *best* players ease off pressure as they approach target — the game rewards a decelerating, controlled cut, not button-mashing.

---

## 3. Material Removal System

### 3.1 Conceptual Model — Surface of Revolution

A lathe blank is rotationally symmetric: at any moment the spinning log is fully described by its **radius as a function of position along its length**. We exploit this. The blank is represented as a 1-D array of radii sampled along the log's axis:

```
r[i]   for i = 0 … N-1      // current radius at slice i
t[i]   for i = 0 … N-1      // target radius at slice i
```

with `N` typically 256–512 slices for mobile (the prototype uses 256). The visible 3-D mesh is generated each frame by revolving this radius profile around the axis ([§15](#15-technical-design)). This is the same model the shipping web prototype uses.

This reduces "deforming a 3-D solid" to "editing a 1-D array," which is what makes the game cheap enough to run buttery-smooth on a phone and what makes scoring a clean array comparison.

**Why this model (vs. alternatives):**

| Model | Pros | Cons | Verdict |
|-------|------|------|---------|
| **Surface of revolution (radius profile)** | Trivially cheap; perfect fit for lathe work; clean scoring; deterministic | Cannot represent off-axis features (e.g., a handle sticking out, asymmetric carving) | **Chosen** — lathe work is rotationally symmetric by definition |
| Voxel / marching cubes | Fully general 3-D carving | 10–100× the memory and CPU; meshing cost; overkill for a lathe | Reserved for a future "free-carve" mode only |
| Heightfield on a cylinder (2-D map of radius vs. angle & length) | Allows asymmetric detail | More cost; complicates scoring & symmetry metric | Future "fluting/off-center" feature |

**Recommendation:** ship on the radius-profile model. It is not a limitation of the prototype — it is the correct representation for turned objects, and it is what lets the game feel instant.

### 3.2 The Contact Event

When the tool touches the blank, the game computes how much radius to remove at each affected slice this frame. Five inputs drive it:

| Input | Symbol | Range | Effect |
|-------|--------|-------|--------|
| **Contact position** | `x` | slice index, 0…N-1 | Center of the affected zone |
| **Tool footprint** | `w` | slices | Width of effect (narrow detail tool vs. wide scraper) |
| **Tool pressure** | `p` | 0…1 | How hard the player presses (touch force / hold time) |
| **Contact duration** | `Δt` | seconds | Frame time × frames held |
| **Wood hardness** | `H` | 0.4…2.5 | Material resistance (see [§5](#5-wood-types)) |
| **Tool power** | `P_tool` | 0.5…4.0 | Base aggressiveness of the tool/upgrade level |

### 3.3 Removal-Rate Formula

The removal applied to slice `i` in a given frame:

```
// Spatial falloff: a normalized Gaussian-ish kernel centered on contact x,
// with half-width = w/2. k(i) is 1 at center, ~0 at the footprint edge.
k(i) = exp( -((i - x)^2) / (2 * (w/2)^2) )

// Base removal rate (radius units per second) at the contact center:
removalRate = (P_tool * pressureCurve(p) * sharpness) / H

// pressureCurve emphasizes control: gentle at low p, ramps near full press
pressureCurve(p) = p^1.5

// Per-frame radius reduction at slice i:
Δr[i] = removalRate * k(i) * grainFactor(i) * Δt

// Apply, clamping so radius never goes below the lathe spindle minimum:
r[i] = max( r[i] - Δr[i], R_min )
```

Where:

- `sharpness ∈ [0.3, 1.0]` decays as the tool dulls during a cut and resets on sharpening (a light upkeep mechanic, off by default in Relax mode).
- `grainFactor(i) ∈ [0.85, 1.15]` is a per-wood, per-slice multiplier baked from the blank's grain pattern. Cutting "with the grain" is smooth; hitting a knot or cross-grain band momentarily resists (a small `<1` dip) then can "catch" and tear out (a small `>1` spike). This is the texture that makes hardwoods feel different from pine.

**Worked example.** Curved Gouge Lv2 (`P_tool = 1.8`), full press (`p = 1.0 → pressureCurve = 1.0`), fresh edge (`sharpness = 1.0`), oak (`H = 1.6`), `Δt = 1/60 s`, at the contact center (`k = 1`, `grainFactor = 1.0`):

```
removalRate = (1.8 * 1.0 * 1.0) / 1.6 = 1.125 radius-units/sec
Δr_center   = 1.125 * 1 * 1.0 * (1/60) ≈ 0.0188 units/frame
```

So a one-second held cut on oak removes ~1.1 units of radius at the center — fast enough to feel powerful, slow enough to control. The same cut on pine (`H = 0.6`) removes ~3.0 units/sec — visibly faster, which is exactly why beginners start on pine and why pine punishes a heavy hand.

### 3.4 Over-Carving — The Core Skill Risk

There is no undo on material. The defining risk-reward of WoodForm:

- The target radius `t[i]` is the floor you are aiming *for*. The fun is removing material **quickly** to save time and look skillful.
- But cut **past** `t[i]` and that material is gone. `r[i] < t[i]` is an **over-carve**, and it is the only true mistake in the game.
- Over-carving is penalized hard by **Shape Accuracy** and **Material Efficiency** ([§7](#7-scoring-system)) because, unlike leaving extra material (which you can still remove), removing too much is unrecoverable — at best you salvage by re-cutting the *whole* piece down to the over-carved radius (ruining proportions) or accept the hit.
- The skill curve: novices cut timidly (slow, safe, leaves material → loses Time & a little Shape), experts cut aggressively into the "safe band" then feather the last 5% (fast and accurate). Mastery is learning *exactly* how hard you can push each wood before it bites.

**Safety affordances (difficulty-scaled):**

| Assist | Relax / Beginner | Standard | Master |
|--------|------------------|----------|--------|
| Ghost target overlay | Bright, always on | Faint | Off (one peek button) |
| Over-carve warning | Haptic + visual + soft auto-lift of tool | Haptic + visual | Visual flash only |
| Heat-map fit coloring | On | On | Off |
| Removal "soft floor" near target | Removal rate ×0.3 within 1 unit of target | ×0.6 | None |

---

## 4. Tool Types & Upgrades

Every tool has **Purpose**, a **Footprint/behavior**, a **Power** value (`P_tool` base, feeds the removal formula), and a **Precision** rating (inverse of footprint jitter — high precision = smaller, more controllable footprint). Each tool has a 3-tier upgrade path. Costs are in **Sawdust Coins (SC)**, the game currency ([§10](#10-economy)).

### 4.1 Tool Roster

#### Beginner Tools (owned from start)

| Tool | Purpose | Footprint / Behavior | Base Power | Base Precision |
|------|---------|----------------------|-----------|----------------|
| **Basic Chisel** | General roughing & shaping | Medium footprint (`w≈14`), steady removal | 1.0 | Medium |
| **Flat Scraper** | Flatten faces, clean cylinders | Wide footprint (`w≈22`), low depth, smooths | 0.7 | Low |
| **Sanding Block** | Surface smoothing (no shape change) | Wide; reduces roughness, raises sand coverage | n/a (sand) | Medium |

#### Intermediate Tools (unlocked via level/reputation)

| Tool | Purpose | Footprint / Behavior | Base Power | Base Precision |
|------|---------|----------------------|-----------|----------------|
| **Curved Gouge** | Carve concave curves (bowls, coves) | Round profile, medium `w≈12`, follows curves cleanly | 1.4 | Medium-High |
| **Precision Cutter** | Fine shaping near target | Narrow (`w≈6`), low power, very controllable | 0.8 | High |
| **Detail Carver** | Beads, rings, fine features | Very narrow (`w≈3`), surgical | 0.6 | Very High |

#### Advanced Tools (late-game/reputation/premium-cosmetic-only-skins)

| Tool | Purpose | Footprint / Behavior | Base Power | Base Precision |
|------|---------|----------------------|-----------|----------------|
| **Powered Rotary Cutter** | Fast bulk roughing | Wide (`w≈18`), high power, mild auto-smoothing | 3.0 | Medium |
| **Laser Measurement Tool** | Reveal exact deviation per slice | No removal; overlays numeric error & "stop" line | n/a | Utility |
| **Shape Guide Projector** | Project target silhouette onto blank | No removal; brightens/stabilizes ghost, snap-guides | n/a | Utility |
| **Auto-Sanding Tool** | One-pass full-length sanding | Full-length; high sand coverage fast | n/a (sand) | High |

### 4.2 Upgrade Paths (Lv1 → Lv2 → Lv3)

Stat deltas are relative to the tool's Lv1 baseline. "Pwr" = `P_tool`. "Prec" = footprint width `w` (lower = more precise). "Wear" = how fast `sharpness` decays (lower = better). Utility tools upgrade their utility stat instead.

| Tool | Lv1 (base) | Lv2 (cost) | Lv3 (cost) |
|------|-----------|------------|------------|
| **Basic Chisel** | Pwr 1.0 · w14 · Wear 1.0 | Pwr 1.3 · w12 · Wear 0.8 — **120 SC** | Pwr 1.6 · w11 · Wear 0.6 — **600 SC** |
| **Flat Scraper** | Pwr 0.7 · w22 · smooth ×1.0 | Pwr 0.9 · w20 · smooth ×1.3 — **150 SC** | Pwr 1.1 · w18 · smooth ×1.6 — **750 SC** |
| **Sanding Block** | coverage 1.0/s · w16 | coverage 1.4/s · w18 — **100 SC** | coverage 1.9/s · w20 — **500 SC** |
| **Curved Gouge** | Pwr 1.4 · w12 · curve-follow ×1.0 | Pwr 1.8 · w11 · curve-follow ×1.3 — **400 SC** | Pwr 2.2 · w10 · curve-follow ×1.6 — **1,800 SC** |
| **Precision Cutter** | Pwr 0.8 · w6 · Prec 1.0 | Pwr 1.0 · w5 · Prec 1.3 — **450 SC** | Pwr 1.2 · w4 · Prec 1.6 — **2,000 SC** |
| **Detail Carver** | Pwr 0.6 · w3 · Prec 1.0 | Pwr 0.7 · w2.5 · Prec 1.4 — **500 SC** | Pwr 0.85 · w2 · Prec 1.8 — **2,200 SC** |
| **Powered Rotary Cutter** | Pwr 3.0 · w18 · Wear 1.4 | Pwr 3.5 · w17 · Wear 1.1 — **1,200 SC** | Pwr 4.0 · w16 · Wear 0.9 + auto-smooth — **5,000 SC** |
| **Laser Measurement Tool** | shows ±0.5u error | ±0.25u + per-zone callouts — **900 SC** | ±0.1u + auto-stop line — **3,500 SC** |
| **Shape Guide Projector** | ghost ×1.0 clarity | ghost ×1.4 + soft snap — **1,000 SC** | ghost ×1.8 + symmetry mirror guide — **4,000 SC** |
| **Auto-Sanding Tool** | coverage 2.5/s full-length | coverage 3.5/s — **1,500 SC** | coverage 4.5/s + edge-polish — **6,000 SC** |

**Design intent on power tools:** advanced tools speed up *bulk* removal and *measurement*, but never the final accuracy — you still feather the last 5% by hand. This protects **P2/P3**: power tools reduce tedium, not skill. A maxed loadout shaves ~30% off completion time and lifts the score ceiling, but a player using only beginner tools can still 5-star a Tier-1 order. **Recommended:** keep the highest-tier tools as *quality-of-life*, never as *gatekeepers*.

---

## 5. Wood Types

Wood is the primary risk/reward dial at order start. Harder woods feed a larger `H` into the removal formula (slower, less forgiving) but carry a higher **Value multiplier** and look more premium. Grain pattern modulates `grainFactor(i)` — figured woods are gorgeous but have more catchy spots.

| Wood | Value × | Hardness `H` | Carving speed | Appearance / color | Grain pattern | Durability (over-carve forgiveness) |
|------|---------|--------------|---------------|--------------------|--------------|--------------------------------------|
| **Pine** | 1.0× | 0.6 (soft) | Very fast | Pale cream, light amber | Straight, mild knots | High — forgiving "soft floor" |
| **Cedar** | 1.2× | 0.8 | Fast | Reddish-honey, aromatic | Straight, occasional knot | High |
| **Oak** | 1.6× | 1.6 | Medium | Golden tan, prominent rings | Coarse open grain | Medium |
| **Walnut** | 2.2× | 1.9 | Medium-slow | Rich chocolate brown | Wavy, dark streaks | Medium |
| **Maple** | 2.4× | 2.0 | Slow | Bright blonde, creamy | Tight; figured variants (curly/birdseye) | Medium-low |
| **Ebony** | 4.0× | 2.5 (hardest) | Very slow | Deep black, fine | Very fine, dense | Low — bites hard, unforgiving |
| **Purpleheart** (Exotic) | 4.5× | 2.3 | Slow | Vivid purple → ages deeper | Straight, dramatic color | Low-medium |
| **Zebrawood** (Exotic) | 5.0× | 2.1 | Slow | Golden with bold dark stripes | Strong striped figure (high `grainFactor` variance) | Low |
| **Spalted Tamarind** (Exotic) | 6.0× | 1.8 | Medium-slow | Cream with black "spalt" lines | Chaotic, marbled; unpredictable catch points | Low — fragile near spalt lines |

### 5.1 How Hardness Drives the Formula

Hardness enters as the denominator of `removalRate = (P_tool · pressureCurve(p) · sharpness) / H`. Practical consequences:

- **Soft (Pine, H=0.6):** ~4× the removal rate of ebony. Fast and satisfying but easy to over-carve; great for learning, low value. The "soft floor" assist is strongest here.
- **Hard (Ebony, H=2.5):** slow, deliberate, premium. Each cut is small, so the player has fine control near target — *but* low durability means a slip still gouges, and the high value means the stakes are higher. High-skill, high-reward.
- **Figured/Exotic:** `grainFactor` variance is the real challenge — Zebrawood and Spalted Tamarind have catchy bands that can tear out (`grainFactor` spike), so experts ease pressure across figure. The payoff is the highest Value multipliers and the most beautiful finished pieces (screenshot bait, supporting **P7**).

**Tuning rule of thumb:** completion time scales roughly linearly with `H`. We balance reward so that *reward per minute* is broadly flat across woods, then let Value multiplier reward the *skill and risk* of harder woods on top. This keeps soft and hard woods both viable rather than forcing a meta.

---

## 6. Object Categories

Four tiers, gating by difficulty, required tools, and recommended woods. Reward ranges are base SC at 3 stars before wood multiplier and modifiers ([§10](#10-economy)). Each tier lists **20+** example objects.

### Tier 1 — Apprentice (simple revolutions, gentle curves)

**Difficulty:** Easy · **Required tools:** Basic Chisel, Flat Scraper, Sanding Block · **Recommended woods:** Pine, Cedar, Oak · **Reward range:** 30–90 SC

1. Drinking Cup
2. Cereal Bowl
3. Rolling Pin
4. Tool Handle (hammer/file)
5. Egg Cup
6. Honey Dipper
7. Spinning Top
8. Tealight / Tea-light Holder
9. Napkin Ring
10. Wooden Tumbler
11. Mortar & Pestle (pestle)
12. Salt Cellar
13. Door Knob
14. Curtain Finial
15. Drawer Pull / Knob
16. Wooden Whistle
17. Ring Dish
18. Bud Vase (small)
19. Stacking Ring (toy)
20. Coaster Stand / Spindle
21. Wine Stopper
22. Darning Mushroom
23. Bottle Cork Grip
24. Pencil Cup

### Tier 2 — Journeyman (defined profiles, multiple coves & beads)

**Difficulty:** Medium · **Required tools:** + Curved Gouge, Precision Cutter · **Recommended woods:** Oak, Walnut, Maple · **Reward range:** 90–240 SC

1. Chess Pawn
2. Chess Rook
3. Chess Bishop
4. Chess Knight (profile portion)
5. Tall Flower Vase
6. Decorative Lidded Container
7. Candlestick
8. Goblet / Chalice
9. Wooden Mug with Foot
10. Tiered Trinket Box
11. Pepper Grinder Body
12. Lamp Base (turned)
13. Newel Post (stair)
14. Balustrade Spindle
15. Bowl with Pedestal Foot
16. Decorative Urn (small)
17. Wand (tapered, ringed)
18. Spinning Wheel Bobbin
19. Chess Queen
20. Chess King
21. Tea Caddy
22. Ornamental Egg (display)
23. Spice Jar with Finial Lid
24. Captive-Ring Spindle (intro)

### Tier 3 — Artisan (compound forms, fine detail, finishing matters)

**Difficulty:** Hard · **Required tools:** + Detail Carver, Powered Rotary Cutter, Laser Measurement · **Recommended woods:** Walnut, Maple, Ebony, Purpleheart · **Reward range:** 240–600 SC

1. Owl Sculpture
2. Cat Sculpture
3. Rabbit Sculpture
4. Dolphin Sculpture
5. Penguin Sculpture
6. Mushroom Sculpture (detailed)
7. Acorn (oversized decorative)
8. Table Leg (cabriole-style turning)
9. Chair Spindle Set
10. Decorative Statue (abstract figure)
11. Bust (stylized human head)
12. Pinecone Ornament
13. Chess Set Master Piece (full knight)
14. Hourglass Frame Spindles
15. Bird (wren/robin)
16. Fish Sculpture
17. Snail Sculpture
18. Lighthouse Model
19. Toadstool Diorama Piece
20. Decorative Finial (grand, multi-bead)
21. Ballerina Music-Box Spindle
22. Elephant (stylized)
23. Seahorse Sculpture
24. Pawn-to-King Ornamental Tower

### Tier 4 — Master (virtuoso forms, tight tolerance, premium woods)

**Difficulty:** Expert · **Required tools:** Full kit incl. Shape Guide Projector, Auto-Sanding, maxed Detail Carver · **Recommended woods:** Ebony, Maple (figured), Exotics · **Reward range:** 600–2,000+ SC

1. Dragon Sculpture
2. Phoenix Sculpture
3. Griffin Sculpture
4. Unicorn Sculpture
5. Koi-and-Wave Art Piece
6. Nested Captive-Ring Goblet (3 rings)
7. Hollow-Form Vessel (thin-wall)
8. Master Craftsman Heirloom Chalice
9. Intertwined Twist Column (barley twist)
10. Eagle in Flight
11. Mermaid Sculpture
12. Tree of Life Sculpture
13. Pagoda Tower (multi-tier)
14. Lattice Sphere (Chinese puzzle ball style)
15. Wolf Howling Sculpture
16. Ornamental Crown
17. Galleon Ship Figurehead
18. Lotus Bloom Art Piece
19. Serpent Coil Sculpture
20. Master Chess Set (commissioned, scored as a set)
21. Cathedral Spire Model
22. Peacock Display Piece
23. Celestial Orrery Component
24. Grand Heirloom Vase (museum commission)

> **Object count delivered:** Tier 1 = 24, Tier 2 = 24, Tier 3 = 24, Tier 4 = 24 → **96 example objects total**, exceeding the 80+ requirement (20+/tier).

Each in-game object ships with a hand-authored or procedurally-perturbed `t[i]` target profile, a difficulty score, and metadata (required tools, recommended woods, reward range) that the order generator draws from.

---

## 7. Scoring System

After finishing, the carved profile `r[i]` is compared to the target `t[i]` across six metrics, each normalized to **0–100**, then combined into a weighted **Overall** and a **1–5 star** rating. All metrics use `tol`, a per-object **tolerance** in radius units (tighter for higher tiers; e.g., T1 `tol=2.0`, T2 `1.5`, T3 `1.0`, T4 `0.6`).

### 7.1 Per-Metric Formulas

```
// Helpers
err[i]      = r[i] - t[i]                    // signed; >0 leftover, <0 over-carve
absErr[i]   = abs(err[i])
meanAbsErr  = mean(absErr[i])
N           = number of slices
clamp(v)    = max(0, min(100, v))
```

**1) Shape Accuracy** — how close the silhouette is to target, with over-carves punished extra (asymmetric penalty, since they're unrecoverable):

```
penalty[i]  = absErr[i] * (err[i] < 0 ? 1.8 : 1.0)   // over-carve weighted 1.8x
shapeError  = mean(penalty[i])
ShapeAccuracy = clamp( 100 * (1 - shapeError / tol) )
```

**2) Surface Smoothness** — penalizes high-frequency roughness (second derivative of the profile) and rewards sanding coverage:

```
roughness   = mean( | r[i-1] - 2*r[i] + r[i+1] | )   // discrete 2nd derivative
sandCoverage ∈ [0,1]                                 // fraction of length sanded
Smoothness  = clamp( 100 * ( 0.6 * (1 - roughness / roughTol)
                           + 0.4 * sandCoverage ) )
```

**3) Material Efficiency** — penalizes wasted material: leftover above target (didn't finish) *and* over-carving below target (destroyed stock). Over-carve costs more:

```
wasteAbove  = mean( max(0,  err[i]) )      // material you should have removed
wasteBelow  = mean( max(0, -err[i]) )      // material you destroyed
Efficiency  = clamp( 100 * (1 - (wasteAbove + 2.5 * wasteBelow) / wasteTol) )
```

**4) Time Taken** — soft, generous curve; never punitive (protects **P3**). `T_par` is the object's par time:

```
ratio       = timeTaken / T_par
TimeScore   = clamp( 100 * (1.1 - 0.5 * max(0, ratio - 0.8)) )
// At/under 80% of par → ~100. Linear, gentle falloff after. Floor never below ~40 for finishing at all.
```

**5) Symmetry** — compares the left half to the mirrored right half (turned objects should be axially clean; this catches a wobbly hand):

```
M           = floor(N/2)
symErr      = mean over j in [0,M] of | r[j] - r[N-1-j] |
Symmetry    = clamp( 100 * (1 - symErr / symTol) )
```

(For intentionally asymmetric forms, `symTol` is widened or the metric weight is dropped to ~0 in that object's config.)

**6) Finishing Quality** — combines sanding smoothness already achieved, finish coat coverage, and finish type bonus:

```
coatCoverage ∈ [0,1]
finishBonus  ∈ {oil:0.05, wax:0.10, lacquer:0.15}   // chosen finish
Finishing    = clamp( 100 * ( 0.5 * sandCoverage
                            + 0.4 * coatCoverage
                            + finishBonus * 100/100 ) )   // bonus adds up to +15
```

### 7.2 Weighted Overall

```
Overall =  0.35 * ShapeAccuracy
         + 0.15 * Smoothness
         + 0.15 * Efficiency
         + 0.10 * TimeScore
         + 0.15 * Symmetry
         + 0.10 * Finishing
```

Shape Accuracy dominates (it's the point of the game). Per-order **modifiers** can re-weight: e.g., an "Heirloom" order doubles Finishing's weight (and renormalizes), a "Speed Run" daily raises Time to 0.30.

### 7.3 Star Thresholds

| Overall | Stars | Label |
|---------|-------|-------|
| 0–49 | ★ | Rough |
| 50–69 | ★★ | Passable |
| 70–84 | ★★★ | Good |
| 85–94 | ★★★★ | Excellent |
| 95–100 | ★★★★★ | Masterwork |

### 7.4 Balancing Recommendations

- **Keep a floor of fun.** A finished-but-mediocre piece should still pay out and feel okay (≥1★, positive SC). Frustration is the enemy of **P3**.
- **Reward the last 5%.** The gap from 90→100 should require real skill (feathering near target, full sanding, lacquer). This is the "one more point" hook (**P4/P8**).
- **Over-carve is the teacher.** The 1.8× and 2.5× over-carve penalties exist so players *feel* the lesson without a hard fail. Tune these up if testers spam aggressive cuts.
- **Tighten `tol` per tier, not weights.** Difficulty should come from tolerance and tools required, keeping the score breakdown legible and comparable across the game.
- **Telemetry-driven retune:** track the distribution of each metric live; if any metric clusters at 100 (no skill expression) or 0 (too punishing), adjust its `tol`/`roughTol`.

---

## 8. Game Modes

### 8.1 Career Mode (primary)

**Structure:** A progression of customers and an **Order Board**. Player picks orders, completes them, earns SC/XP/reputation, unlocks tools/woods/object tiers, and expands the workshop. Soft narrative spine: rise from a hobbyist garage lathe to a renowned master with a museum commission as the late-game capstone.

- **Goals:** clear order chains, hit reputation milestones, complete the object collection ([§13](#13-retention-features)).
- **Constraints:** orders gated by player level, tools owned, and reputation; harder customers demand higher star floors ("won't accept under 4★").
- **Rewards:** SC, XP, reputation, unlocks; occasional rare-material drops.
- **Pacing:** designed so each ~3-minute order yields a *visible* step (XP bar, an unlock tease). Chapters every ~10 levels introduce a new wood + tool + object tier.

### 8.2 Workshop (Sandbox)

**Structure:** Free play. Any unlocked wood and tool, any unlocked object — or **free-form** mode (no target; carve whatever you like, just for the feel and the ASMR).

- **Goals:** none imposed; self-directed practice, screenshots, relaxation.
- **Constraints:** uses owned inventory; consumes a blank from stock (or unlimited blanks toggle once unlocked).
- **Rewards:** no SC (prevents grind-farming), but XP at a reduced rate and "practice ribbons" cosmetics for personal bests.
- **Pacing:** open-ended; the **P3** relaxation home base. A "Zen toggle" removes all UI and scoring.

### 8.3 Challenge Mode

**Structure:** Curated, hand-authored puzzles with hard constraints — "Carve this vase using only the Detail Carver," "No sanding allowed," "One wood, three objects, shared time budget," "Blind: ghost overlay off."

- **Goals:** beat a target score / complete under a fixed constraint.
- **Constraints:** the gimmick (tool lock, time lock, blind, single-cut).
- **Rewards:** big one-time SC, exclusive cosmetics, achievement badges.
- **Pacing:** bite-sized, replayable for score; feeds leaderboards.

### 8.4 Daily Orders

**Structure:** A new fixed seed each day — same object, same wood, same target for **all players globally** — scored on a leaderboard. Three free attempts; best score counts.

- **Goals:** climb the daily leaderboard; maintain a daily streak.
- **Constraints:** fixed seed (fair comparison), limited attempts.
- **Rewards:** streak bonuses, daily SC, leaderboard-tier cosmetics, gems (premium currency, earnable) for top brackets.
- **Pacing:** the daily habit hook (**retention**); 1 quick session/day.

### 8.5 Master Craftsman Mode (endgame)

**Structure:** Unlocked at high reputation. Multi-stage **commissions** (e.g., a full chess set = 6 distinct pieces scored as an aggregate; a "matched pair" of vases scored on consistency between them). Tight tolerances, premium woods, finishing weighted heavily.

- **Goals:** complete prestige commissions for huge rewards and a permanent "Hall of Masterworks" gallery entry.
- **Constraints:** premium wood cost, multi-piece consistency scoring, high star floors (often 4–5★ required to "deliver").
- **Rewards:** the largest SC payouts, rare/exotic materials, prestige titles, gallery showcases (shareable).
- **Pacing:** the "deep evening" content; one commission can be 15–30 minutes across pieces, savable between pieces.

---

## 9. Progression System

Designed to stay engaging for **hundreds of hours** by layering several independent advancement axes that interleave so something is always close to unlocking.

### 9.1 Player Level & XP

XP is earned per order: `XP = baseXP(object tier) × (stars/3) × woodMultiplier`. The XP curve is gently exponential so early levels are fast (hook) and late levels are long-tail (prestige).

```
XP_to_next(L) = round( 100 * L^1.45 )
```

| Level | XP to next | Cumulative | Roughly unlocks |
|-------|-----------|------------|-----------------|
| 1→2 | 100 | 100 | Cedar wood |
| 2→3 | 273 | 373 | Curved Gouge |
| 5→6 | 1,000 | ~2,300 | Oak; Tier 2 objects |
| 10→11 | 2,818 | ~11,000 | Walnut; Precision Cutter; Workshop Tier 2 |
| 20→21 | 7,742 | ~52,000 | Maple; Tier 3 objects; Powered Rotary Cutter |
| 35→36 | 17,800 | ~190,000 | Ebony; Detail Carver Lv3; Master Mode preview |
| 50→51 | 30,700 | ~510,000 | Exotic woods; Shape Guide Projector |
| 75→76 | 57,100 | ~1.4M | Prestige cosmetics, Master commissions |
| 100 | — | ~2.8M | Grandmaster title; full collection viable |

### 9.2 Advancement Axes

| Axis | What it gates | Driver | Cadence |
|------|---------------|--------|---------|
| **Player Level/XP** | Tools, woods, object tiers | XP from orders | Every order moves the bar |
| **Workshop Upgrades** | Better lathe (rotation speed, larger blanks), more order slots, drying rack, display gallery | SC + level | Every ~5–8 levels |
| **Tool Upgrades** | Power/precision (Lv1→3) | SC | Player-paced |
| **Reputation** | Premium customers, Master Mode, exclusive orders | Stars delivered | Continuous |
| **Customer Satisfaction** | Repeat customers, tip bonuses, fan club | Meeting/beating star floors | Per customer relationship |
| **Special Unlocks** | Finishes (oil→wax→lacquer→exotic), turntable backdrops, lathe skins | Milestones/achievements | Milestone-based |
| **Rare Materials** | One-off premium blanks (Spalted Tamarind, Burl) for special orders | Drops, daily, challenges | Scarcity-paced |

### 9.3 Unlock Cadence Table

| Player Level Band | New Wood | New Tool | Object Tier | Workshop Milestone |
|-------------------|----------|----------|-------------|--------------------|
| 1–5 | Pine, Cedar | Curved Gouge | Tier 1 | 2nd order slot |
| 6–10 | Oak | Precision Cutter | Tier 2 opens | Drying rack |
| 11–20 | Walnut | Detail Carver, Powered Rotary | Tier 2 mastery | Workshop Tier 2, gallery |
| 21–35 | Maple | Laser Measurement | Tier 3 opens | Bigger lathe, 4th slot |
| 36–50 | Ebony | Shape Guide Projector | Tier 3 mastery | Workshop Tier 3 |
| 51–75 | Purpleheart, Zebrawood | Auto-Sanding, all Lv3 | Tier 4 opens | Master studio |
| 76–100 | Spalted Tamarind, Burl | Cosmetic-only | Tier 4 mastery, Master commissions | Museum wing |

**Anti-plateau design:** the seven axes are deliberately out of phase. When XP slows (late game), tool maxing, reputation, collection, and rare materials still progress — there's always a near-term goal (**P5/P8**).

---

## 10. Economy

### 10.1 Currencies

- **Sawdust Coins (SC)** — soft currency, earned from every order. Buys woods, tools, upgrades, workshop expansion.
- **Heartwood Gems** — premium currency. *Earnable* (daily streaks, challenge brackets, achievements) and purchasable. Spends on cosmetics, optional rerolls, blank-stock convenience — **never on power**. See [§14](#14-monetization).

### 10.2 Reward Formula

```
SC_reward = baseReward(object)
          * starMultiplier(stars)
          * woodValueMultiplier
          * orderModifier            // rush bonus, premium customer, etc.

starMultiplier:  1★=0.4, 2★=0.7, 3★=1.0, 4★=1.4, 5★=2.0
woodValueMultiplier: from §5 table (Pine 1.0 … Spalted Tamarind 6.0)
```

**Example:** Tier-2 Vase, base 150 SC, carved in Walnut (2.2×), 4★ (1.4×), no modifier → `150 × 1.4 × 2.2 = 462 SC`.

### 10.3 Cost Curves

**Workshop expansion** (one-time):

```
ExpansionCost(tier T) = round( 800 * 2.3^(T-1) )
// T1 free, T2 = 800, T3 = 1,840, T4 = 4,232, T5 = 9,734, ...
```

**Tool upgrades** follow [§4.2](#42-upgrade-paths-lv1--lv2--lv3) (roughly Lv2 = ~2–4× tool's value, Lv3 = ~5× Lv2). General upgrade cost curve:

```
UpgradeCost(base, level) = round( base * 5^(level-1) )
```

### 10.4 Sample Cost/Earning Table (first ~20 levels)

Assumes ~the recommended wood, mostly 3–4★ play, ~3-min orders.

| Lvl | Typical order reward (SC) | Cumulative earned (SC) | Key purchase this band | Cost (SC) |
|-----|---------------------------|------------------------|------------------------|-----------|
| 1 | 35 | 35 | — (starter kit) | 0 |
| 2 | 45 | ~150 | Chisel Lv2 | 120 |
| 3 | 60 | ~330 | Sanding Block Lv2 | 100 |
| 4 | 75 | ~560 | Cedar stock | 60 |
| 5 | 95 | ~900 | Workshop Tier 2 | 800 |
| 6 | 130 | ~1,400 | Curved Gouge Lv2 | 400 |
| 7 | 150 | ~1,900 | Oak stock | (per blank) 50 |
| 8 | 180 | ~2,500 | Precision Cutter Lv2 | 450 |
| 9 | 210 | ~3,200 | Drying rack | 600 |
| 10 | 250 | ~4,100 | Curved Gouge Lv3 | 1,800 |
| 12 | 300 | ~6,300 | Workshop Tier 3 | 1,840 |
| 14 | 360 | ~9,000 | Detail Carver Lv2 | 500 |
| 16 | 430 | ~12,500 | Powered Rotary Lv1 | 1,200 |
| 18 | 510 | ~16,800 | Walnut stock + Laser Tool | 900 |
| 20 | 600 | ~22,000 | Powered Rotary Lv3 | 5,000 |

The curve keeps the player ~1–2 orders away from their next meaningful purchase through level 20, then widens for prestige pacing.

### 10.5 Endgame Economy & Sinks

Late game, SC inflows are large, so we add **sinks** to keep purchases meaningful:

- **Premium/Exotic blanks** are consumable and expensive — a real per-order cost that makes wood choice strategic.
- **Cosmetic SC sinks:** lathe finishes, workshop décor, turntable backdrops, gallery frames (soft-currency cosmetics distinct from premium ones).
- **Re-roll / expedite** order conveniences cost SC.
- **Tool maintenance** (optional, off in Relax mode): sharpening stones, replacement edges.
- **Prestige commissions** require buying rare materials up front, betting SC on a high-star delivery.

### 10.6 Anti-Grind Recommendations

- **Reward per minute is roughly flat across woods/tiers** (we tune `baseReward` against par time), so no single "grind spot" dominates. Players chase *enjoyment and stars*, not an optimal farm.
- **Sandbox pays no SC** — relaxation stays pure, farming is impossible there.
- **Daily/weekly caps on bonus sources** (streaks, contracts) prevent burnout-farming while rewarding consistency.
- **No energy/stamina system.** Ever. It contradicts **P3/P6**. Play as much or as little as you like.
- **Catch-up generosity:** returning players get a small "the workshop kept earning" stipend, never a punishment for being away.

---

## 11. Visual Style

**Direction:** warm, tactile, premium-mobile realism with a clean modern UI — *cozy workshop meets high-end product render.*

- **Palette:** warm wood tones front and center (cream pine → chocolate walnut → black ebony → vivid exotics), grounded by neutral workshop greys and a single warm accent (amber/sawdust-gold) for UI highlights.
- **Lighting:** soft key light from a workshop window, warm fill, a rim light that makes shavings *glint*. Time-of-day option (morning/golden-hour/evening) for ambience and screenshots.
- **Materials:** physically-based wood shaders with real grain flow along the profile, subtle subsurface warmth, and a finish layer (matte oil → satin wax → glossy lacquer) that visibly changes sheen on finishing.
- **The transformation is the hero.** Camera framing emphasizes the before/after delta; a one-tap "before/after" wipe on the results screen (**P7**, shareable).
- **Particles & shavings:** detailed curled shavings that arc off the tool, settle, and pile; fine dust during sanding catching the light; finish "sheen sweep" on coating. Particle density scales with device tier.
- **UI:** minimal, glanceable, thumb-reachable. Tool wheel, live fit meter, ghost overlay toggle. Diegetic where possible (a real tool rack, a paper order card). Calm motion, soft easing — nothing jittery (**P3**).
- **References:** *PowerWash Simulator* (satisfying reveal & progress), *House Flipper* (cozy craft loop), *Car Mechanic Simulator* (tool/upgrade depth), and real woodturning/ASMR videos (shaving behavior, surface sheen, the rhythm of roughing→refining→finishing).

**Quality bar:** must look like a premium paid app on a flagship phone, and degrade gracefully (fewer particles, lower mesh slice count, simpler shaders) on older devices without losing the core satisfaction.

---

## 12. Audio Design

Audio is not decoration here — it is a **primary driver of the satisfaction loop** (**P1/P3**). Half the "feel" of a cut lives in the sound.

### 12.1 Core Sound Events

| Event | Character | Modulation |
|-------|-----------|------------|
| **Chiseling / cutting** | Layered "shhhk" scrape | Pitch & grain density rise with pressure and rotation speed; timbre shifts per wood hardness (pine = soft/airy, ebony = dense/ringing) |
| **Sanding** | Smooth, granular rub | Brightens as surface gets smoother; volume tracks contact |
| **Wood cutting (power tools)** | Higher whir + bite | Adds motor layer; pitch dips under load (resistance feedback) |
| **Grain catch / knot** | A momentary "grrk" | Triggered by `grainFactor` spikes — an audible warning to ease off |
| **Over-carve alert** | Soft, non-jarring chime + dull thud | Distinct, never alarming (protects **P3**) |
| **Mount / spin-up** | Clamp clunk + rising motor whir | Satisfying "we're starting" cue |
| **Finishing coat** | Wet brush sweep, soft settle | Cue of completion approaching |
| **Completion / reward** | Warm chord, gentle chime cascade, dust-settle | Scales with star count (5★ = fullest flourish) |

### 12.2 Ambience

Layered, loopable workshop bed: distant tools, soft wind/rain at the window, occasional bird, the lathe's idle hum. Adaptive: thins during active cutting (so the cut reads clearly), swells during idle/menus. A **Zen ambience** option swaps in pure relaxation pads.

### 12.3 How Audio Drives Satisfaction

- **Tight coupling:** sound is sample-accurate to contact; the rising pitch under pressure makes a heavy cut *feel* powerful and tells the skilled player exactly when to back off.
- **Per-wood identity:** you can nearly hear which wood you're carving — reinforces material variety (**P2**).
- **Reward crescendo:** the completion stinger is the emotional payoff that powers "one more order" (**P8**).
- **No fatigue:** sounds are softened, low-harshness, and varied (round-robin samples) to stay pleasant over long sessions.

### 12.4 Prototype Note

The shipping web prototype synthesizes all audio at runtime via **WebAudio** (oscillator + filtered noise for the scrape, gain envelopes for transients, a noise bed for ambience) — no audio assets shipped. In Unity, these become authored/recorded samples with the same modulation rules (pressure→pitch/grain, hardness→timbre), giving us premium quality while preserving the prototype's adaptive behavior.

---

## 13. Retention Features

| Feature | Design | Cadence |
|---------|--------|---------|
| **Daily rewards** | Login calendar; escalating SC, blanks, and a Gem on day 7. Streak multiplier. | Daily |
| **Daily Orders** | Global fixed-seed order + leaderboard ([§8.4](#84-daily-orders)) | Daily |
| **Weekly contracts** | A 3–5 order themed contract ("Tea Set Week": 5 cups + a tray) for a big bundled reward | Weekly |
| **Seasonal content** | Themed orders, woods (e.g., "Holly & Cherry" winter), workshop décor, limited cosmetics | Quarterly events |
| **Rare orders** | Low-probability premium commissions appear on the board with exotic woods and huge payouts | Random/scarcity |
| **Achievements** | 150+ goals (carve 100 cups, 5★ in ebony, zero-over-carve order, finish with lacquer 50×). Grant Gems/cosmetics | Continuous |
| **Collection systems** | "Object Codex" (one entry per object type, fills on first 3★+), "Wood Library," "Finish Gallery," "Hall of Masterworks" (best piece per category, shareable) | Long-tail |

**Design principle:** retention rewards are *additive and skippable* — they enrich the loop, never gate it or pressure the player (**P3**). Streaks are forgiving (one grace day per week).

---

## 14. Monetization

**Stance:** ethical, premium-leaning, **strictly no pay-to-win**. WoodForm sells *expression and convenience*, never *power or score*.

| Offer | Type | Suggested price | Notes |
|-------|------|-----------------|-------|
| **WoodForm (base game)** | Premium unlock / paid app | **$4.99–6.99** (or generous F2P with a one-time "Master's Pass" unlock at $6.99 that removes the few ads & gifts cosmetics) | Recommended: **premium** on iOS to match the calm, no-pressure brand |
| **Cosmetic tool skins** | IAP pack | $1.99–2.99 each / $7.99 bundle | Brass/copper/vintage tool finishes — purely visual |
| **Workshop themes** | IAP pack | $2.99–3.99 | Scandinavian, Industrial, Japanese, Cozy Cabin, Seaside workshop backdrops & lighting |
| **Finish & material cosmetics** | IAP | $1.99 | Cosmetic-only special sheens, turntable backdrops, gallery frames |
| **Heartwood Gems** | Premium currency | $0.99–$19.99 tiers | Spends on cosmetics & convenience only; **also fully earnable** in-game |
| **Seasonal cosmetic bundle** | Limited IAP | $4.99 | Per event; vanity only |

**Hard rules (the "ethics fence"):**

1. **No mechanic, tool stat, wood, or score can be bought.** Every gameplay-affecting item is earnable with SC/XP/reputation.
2. **No energy, no timers-to-skip-with-money, no loot boxes** with gameplay power.
3. **Gems are earnable**; purchases are a time-shortcut for *cosmetics/convenience* only.
4. **No interstitial ads** in the premium build. (Optional, rare, opt-in "watch to double a daily reward" in any F2P variant.)
5. Transparency: odds and contents always shown; no dark patterns.

**Recommendation:** ship iOS as **premium ($4.99)** with optional cosmetic IAP. This best fits the relaxing brand and the audience that loves PowerWash/House Flipper-style craft games, and it keeps **P3** sacrosanct. A free-to-try lite (Tier 1, Pine/Cedar) can funnel into the paid unlock.

---

## 15. Technical Design

### 15.1 Engine & Architecture (Unity)

Target engine: **Unity** (URP for mobile, scalable to consoles). High-level architecture:

```
[ OrderService ] → generates/serves orders, seeds, modifiers
[ LatheController ] → owns the radius profile r[], rotation, mount/spin state
[ CarveSystem ] → reads tool + touch, applies removal formula to r[]  (§3)
[ MeshBuilder ] → revolves r[] into a Mesh each frame (incremental)
[ ScoringService ] → compares r[] vs t[], computes 6 metrics + stars  (§7)
[ EconomyService ] → SC/Gems/XP, costs, rewards
[ ProgressionService ] → levels, unlocks, reputation, collections
[ AudioDirector ] → adaptive cutting/ambience/reward audio  (§12)
[ SaveService ] → serialize state incl. mid-carve r[]
[ ContentDB ] → object targets t[], woods, tools (data-driven ScriptableObjects)
```

Data-driven design: objects, woods, tools, and orders are **ScriptableObjects / JSON**, so designers add content without code, and the content pipeline can ingest authored or procedural targets.

### 15.2 Mesh Deformation — Recommended Approach

The core technical decision is how the spinning blank deforms.

| Approach | How | Cost (mobile) | Generality | Verdict |
|----------|-----|---------------|------------|---------|
| **Surface-of-revolution radius profile → mesh** | Store `r[N]`; build a `(N × M)` ring mesh by revolving the profile around the axis (M = radial segments, ~48–64). On carve, update affected `r[i]`, rebuild only affected rings' vertices. | **Very low** — a few hundred verts updated/frame | Lathe-symmetric only | **Recommended** |
| Voxel + Marching Cubes | 3-D voxel grid; remesh on edit | High (mem + remesh) | Full 3-D | Future free-carve only |
| Vertex displacement on a fixed cylinder mesh | Push verts inward via a displacement buffer | Low-med | Limited; harder scoring | Viable alt; less clean |

**Recommendation: radius-profile → mesh.** It is the natural representation for turned objects, makes carving an O(footprint) array edit, makes scoring a clean array comparison, and is the model the web prototype already validates. Vertices: `N` (≤512) × `M` (~56) ≈ 28k verts max — trivial. We rebuild only the rings within the tool footprint each frame (typically <20 rings), so per-frame cost is negligible. Normals recomputed locally on the touched band.

For asymmetric features (handles, off-center motifs) in a *future* mode, we'd graduate the touched region to a heightfield-on-cylinder or a small voxel patch — but that is explicitly out of scope for 1.0, which is a *lathe* game.

### 15.3 Performance Optimization (mobile)

- **Adaptive slice count `N`** and radial segments `M` by device tier (e.g., 512×64 flagship, 256×48 mid, 192×40 low).
- **Incremental remesh:** only rebuild vertices within the tool footprint; cache the rest.
- **Particle budgets** scale with device; pooled shavings, GPU instancing.
- **Fixed-step carve simulation** decoupled from render for deterministic scoring and stable feel.
- **Object pooling** for shavings, UI, audio sources; no per-frame allocations in the carve hot path.
- Target **60 fps** on mid-tier phones during active carving; 120 fps on capable devices.

### 15.4 Save System

- **Local-first**, JSON/binary via `SaveService`; includes economy, progression, collections, settings, and **mid-carve state** (current `r[]`, tool, time elapsed) so a session can be interrupted at any moment (**P6**).
- **Cloud save** (iCloud / platform) for cross-device continuity.
- **Deterministic daily seeds** stored so a daily can be resumed/verified for leaderboards (server-validated final `r[]` to deter cheating).
- Autosave after every order and on backgrounding.

### 15.5 Content Pipeline

- Authored object targets defined as a radius curve in an editor tool (designer draws a profile spline → sampled to `t[N]`), or imported from a silhouette.
- Procedural perturbation generator creates order variants (scale, proportion jitter within tolerance) for replayability.
- Woods/tools/finishes as ScriptableObjects; balancing values in a tunable data sheet hot-reloadable in builds for live tuning.

### 15.6 Web Prototype → Unity Mapping

The companion prototype is built with **Three.js** and validates the entire core:

| Prototype (Three.js / Web) | Unity 1.0 equivalent |
|----------------------------|----------------------|
| Surface-of-revolution lathe mesh, `r[]` updated live | `MeshBuilder` incremental remesh of revolved profile |
| Carve = reduce radius at contact via removal formula | `CarveSystem` with full formula + grain/sharpness |
| Score = compare carved `r[]` to target `t[]` | `ScoringService` six-metric implementation (§7) |
| Synthesized **WebAudio** scrape/ambience | Authored samples in `AudioDirector`, same modulation |
| **localStorage** saves | `SaveService` local + cloud |
| Mouse/touch drag = contact position & pressure | Touch + Core Haptics, force/hold → pressure |

The prototype proves the math, the feel, and the scoring are sound; the Unity build is a fidelity, content, and platform upscale of the *same* validated model — de-risking production significantly.

---

## 16. Roadmap

| Phase | Timeline (indicative) | Scope | Success criteria |
|-------|----------------------|-------|------------------|
| **Prototype** (done) | — | Three.js web build: radius-profile lathe, removal formula, 6-metric scoring, synth audio, localStorage. Validates feel & math. | "Just one more" tested internally; carving feels satisfying |
| **MVP / Vertical Slice** | Months 0–3 | Unity port of core loop; 1 mode (Career), ~15 Tier-1/2 objects, 4 woods, beginner+intermediate tools, scoring, basic economy, haptics, core audio. | 90s order feels great on a real iPhone; testers replay voluntarily |
| **Early Access (PC) / Beta (iOS TestFlight)** | Months 3–9 | All 4 tiers (60+ objects), all woods incl. 2 exotics, full tool tree + upgrades, Career + Workshop + Daily Orders, progression to ~lvl 50, economy v1, monetization scaffolding (cosmetics), cloud save. | D1/D7 retention targets met; economy not exploitable; positive feel feedback |
| **1.0 Launch** | Months 9–12 | Full object set (96), all woods, Challenge + Master Craftsman modes, achievements, collections, leaderboards, full audio/VFX polish, all platforms (iOS lead), localization. Premium $4.99 + cosmetic IAP. | Premium-quality bar met; review-ready; stable 60fps mid-tier |
| **Post-Launch v1.x** | Months 12+ | Seasonal events, weekly contracts, new exotic woods/objects, new cosmetics, balance retunes from telemetry, community challenges, photo-mode/sharing improvements. | Sustained engagement; healthy cosmetic revenue; growing collection chase |
| **Horizon (v2 candidates)** | Future | **Free-carve mode** (asymmetric features via heightfield/voxel patch), multiplayer "carve-off," user-generated target sharing, console-native controls/haptics expansion. | Validated demand; tech spikes pass |

---

### Appendix A — Key Tunable Constants (initial)

| Constant | Value | Where |
|----------|-------|-------|
| `N` (slices) | 256 (mid), 512 (flagship) | §3.1 / §15 |
| `M` (radial segs) | 48–64 | §15.2 |
| `R_min` (spindle floor) | 0.5 units | §3.3 |
| `pressureCurve` exponent | 1.5 | §3.3 |
| Over-carve shape weight | 1.8× | §7.1 |
| Over-carve efficiency weight | 2.5× | §7.1 |
| Tolerance `tol` by tier | 2.0 / 1.5 / 1.0 / 0.6 | §7 |
| XP curve | `100·L^1.45` | §9.1 |
| Expansion cost | `800·2.3^(T-1)` | §10.3 |
| Star multipliers | 0.4 / 0.7 / 1.0 / 1.4 / 2.0 | §10.2 |

*End of document.*
