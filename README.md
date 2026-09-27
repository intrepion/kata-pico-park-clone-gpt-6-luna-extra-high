# Keys Together

A small, local multiplayer platform puzzle game about doing things together. Build no dependencies: open `index.html` in a modern browser, pick a crew size, and play. You can also serve this directory with any static file server.

## How to play

- Move, jump, and explore the room to find its golden key.
- Some doors need a teammate to hold a floor switch while someone else slips through. Later rooms ask two players to stand on separate switches at the same time.
- Once the exit lights up, bring the whole crew to the doorway.
- Choose 2–4 players before starting. The game is designed for one keyboard shared by everyone.

## Keyboard controls

| Player | Move | Jump |
| --- | --- | --- |
| 1 | A / D | W (or Space) |
| 2 | ← / → | ↑ |
| 3 | J / L | I |
| 4 | F / H | T |

Press **R** during a room to restart it. Use **Esc** to return to the title screen.

## Project

This is a dependency-free HTML, CSS, and Canvas game. The levels, physics, drawing, and keyboard input live in `game.js`; the page layout is in `index.html` and `style.css`.
