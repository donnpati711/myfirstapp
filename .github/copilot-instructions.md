# Copilot instructions

## Project structure and architecture

- This is a dependency-free, static browser game. `index.html` provides the Japanese-language page, HUD, start/end overlays, and mobile controls; it loads `style.css` and `game.js` directly.
- `game.js` owns the game state and loop. `worlds`, `itemCatalog`, and `createStage()` define the three themes, ten chest rewards, and five-stage-per-world layouts; `update()` handles movement, collisions, timers, rewards, and boss combat, while drawing functions render the canvas. HUD and message overlays are regular DOM elements.
- The level uses world-space pixel coordinates. `cameraX` scrolls the view; subtract it when drawing world objects, but keep simulation and collision positions in world coordinates.
- Stages advance through `ready` → `playing` → `clear`; `lost` retries the current stage and `complete` marks the end of all 15 stages. Each world's fifth stage is a castle boss fight.
- `style.css` handles page layout, responsive presentation, and touch-control visibility. Keyboard input and mobile pointer controls are both wired in `game.js`.
- `.mcp.json` configures the workspace Playwright MCP server; it uses `npx` and requires Node.js 18 or newer.

## Commands

- There is no package manifest, build step, test runner, or lint configuration.
- Open `index.html` in a browser to run the game. There is no single-test command because no automated tests are configured.
- Check JavaScript syntax with `node --check game.js`.

## Code conventions

- Keep the app dependency-free and use browser APIs directly; there is no framework or bundler.
- Keep level entities in the existing data arrays and use the same world-coordinate convention for platforms, ground, coins, spikes, and the goal.
- Preserve stage progression and keep the HUD, timer, item effects, and canvas state synchronized when changing game behavior.
- Keep keyboard input (`A`/`D` or arrows, Space to jump, `J` sword, `K` bow) and mobile pointer controls consistent with the controls described in `index.html`.
