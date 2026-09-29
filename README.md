# Łamigłówki

Seven logic puzzles in one Android app: ball sort, Sudoku, Queens, no-guess Minesweeper,
Binairo ("Dwa kolory"), Lights Out and the 15-puzzle. No ads, no accounts, works offline.

Download: https://dziedzic.cloud/lamiglowki

## How levels work

Every game generates its levels from a seed (the same level number always gives the same board)
and checks them with a solver before you see them:

- **Ball sort**: DFS solver guarantees solvability; past the full palette, difficulty comes from
  picking harder layouts (solver effort percentile) instead of adding colors.
- **Sudoku, Binairo, Queens**: puzzles are reduced only while the solution stays unique.
- **Minesweeper**: mines are placed after the first tap and the board is re-rolled until a pure
  deduction solver can clear it, so no guessing is ever needed.
- **Lights Out, 15-puzzle**: scrambled from the solved state with legal moves.

## Stack

Vite + TypeScript (no framework), one self-contained `dist/index.html`, wrapped with Capacitor 8.

```bash
pnpm install
pnpm dev        # http://localhost:4295
pnpm test       # generator and rules tests (Vitest)
pnpm build      # dist/index.html
pnpm exec cap sync android
```

Android builds need JDK 21. Release signing reads `android/keystore.properties`
(not in the repo): `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.

A project of [dziedzic.cloud](https://dziedzic.cloud).
