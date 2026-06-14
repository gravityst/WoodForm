# 🪵 WoodForm

**Carve · Sand · Satisfy.**

WoodForm is a relaxing, skill-based wood-turning game. Mount a spinning log on a
virtual lathe, carve it into shape with a kit of tools, sand it to a glassy
finish, and earn your way from apprentice to master craftsman.

This repository contains a **fully playable web prototype** (built with
[Three.js](https://threejs.org/), no build step) and a complete
[**game design document**](DESIGN.md) covering tools, woods, 96 object designs,
scoring formulas, economy, monetization and the Unity production plan.

### ▶️ Play it now

**https://gravityst.github.io/WoodForm/**

Works on desktop and mobile. Best with sound on.

---

## How to play

1. **Pick a contract and a wood**, then mount the log. It spins on the lathe.
2. **Carve to the green guide.** Drag across the spinning log — the closer you
   aim to the centreline, the deeper you cut. Watch the *target vs. carved*
   profile graph.
3. **Choose the right tool.** A roughing gouge hogs away bulk, a parting tool
   cuts crisp grooves, a detail carver does fine work.
4. **Don't overcut.** Cutting *below* the green line wastes wood and can't be
   undone — that's the skill.
5. **Sand it smooth** with the sanding block for a high finish score.
6. **Finish & get scored** on shape, smoothness, symmetry, efficiency, finishing
   and time. Earn coins, level up, and unlock new tools, woods and harder orders.

Progress (coins, level, unlocks) is saved to your browser via `localStorage`.

## Features

- 🪚 **Real lathe carving** — the log is a surface of revolution; tools remove
  material live and the mesh deforms in real time.
- 🌳 **8 woods** with distinct hardness, carve speed, value and grain (Pine →
  Spalted Maple), and **9 tools** from a basic chisel to a powered rotary cutter.
- 🎯 **20 carving orders** across 4 tiers — goblets, vases, chess pieces,
  candlesticks, a stylised bird, a master spire and more.
- 📈 **Six-axis scoring**, coins, XP, levels, a shop and unlock progression.
- 🎮 **Game modes**: Career, Workshop (free carve), and a deterministic Daily Order.
- 🔊 **Fully synthesised audio** (WebAudio) — carving scrape, sanding swish,
  lathe drone and a completion chime. No audio assets needed.
- ✨ Wood-shaving particles, warm workshop lighting, clean responsive UI.

## Run locally

It's a static site — no build, no dependencies to install. Just serve the folder:

```bash
# any static server works; pick one
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly won't work because ES modules require `http://`.)

## Project structure

```
index.html          # shell, UI, Three.js import map
css/style.css        # all styling
js/
  main.js            # scene, render loop, carving input, UI flow
  lathe.js           # the Log: surface-of-revolution model + live mesh
  tools.js woods.js  # tool & wood definitions and tuning
  orders.js          # target-shape profiles for every order
  scoring.js         # the six scoring metrics + rewards
  particles.js       # wood-shaving pool
  audio.js           # synthesised sound engine
  ui.js save.js config.js
DESIGN.md            # full game design document (96 objects, formulas, economy…)
```

## Tech

- **Three.js r160** via CDN import map (no bundler).
- Custom `BufferGeometry` lathe mesh with analytic normals, updated per-frame
  only over the dirty range for performance.
- WebAudio synthesis, Canvas-generated wood-grain texture, `localStorage` saves.

## Roadmap

See [DESIGN.md §16](DESIGN.md#16-roadmap). The prototype targets the core loop;
the design doc lays out the path to a Unity-built iOS release with seasonal
content, daily/weekly contracts and a cosmetic-only monetization model.

## License

MIT — see [LICENSE](LICENSE).

---

*Designed and built as an indie game prototype. Reference inspirations:
PowerWash Simulator, House Flipper, Car Mechanic Simulator, and woodturning /
ASMR craft videos.*
