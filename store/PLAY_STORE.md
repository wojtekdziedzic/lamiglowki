# Google Play: listing and console answers

Ready-to-paste texts and form answers for Play Console. Keep in sync with the app when games change.

## App details

- App name (max 30): `Łamigłówki`
- Package name: `cloud.dziedzic.lamiglowki` (permanent after first upload)
- Default language: Polish (pl-PL); add English (en-US) translation
- Category: Games > Puzzle
- Tags: Logic, Sudoku, Brain games, Offline
- Contact email: wojciech@dziedzic.cloud
- Website: https://dziedzic.cloud/lamiglowki
- Privacy policy URL: https://dziedzic.cloud/lamiglowki/prywatnosc (see `privacy-policy.html`)

## Short description (max 80)

PL: `11 łamigłówek logicznych offline: Sudoku, Królowe, Saper bez zgadywania i więcej`

EN: `11 offline logic puzzles: Sudoku, Queens, no-guess Minesweeper and more`

## Full description (PL)

```
Jedenaście łamigłówek logicznych w jednej aplikacji. Bez reklam, bez kont, bez internetu.

W zestawie:
• Sortuj kulki: ułóż kolory w probówkach
• Sudoku 9x9 i Sudoku 6x6 na szybką partię
• Królowe: jedna w rzędzie, kolumnie i kolorze
• Słońca i księżyce: po trzy w rzędzie, znaki = i ×
• Wieżowce: ile budynków widać z brzegu?
• Namioty: namiot przy każdym drzewie
• Saper bez zgadywania: każdą planszę przejdziesz samą logiką
• Dwa kolory (Binairo): po równo, bez trzech w rzędzie
• Zgaś światła: każde kliknięcie przełącza sąsiadów
• Piętnastka: przesuwaj kafelki po kolei

Codzienna łamigłówka: każdego dnia jedna plansza na grę, taka sama dla wszystkich. Buduj serię dni z rzędu.

Uczciwe plansze: każdy poziom sprawdza solver, zanim go zobaczysz. Sudoku i pozostałe gry mają dokładnie jedno rozwiązanie, a Saper nigdy nie zmusza do zgadywania.

Statystyki: czas rozwiązania, rekordy dla każdego rozmiaru planszy i średnia z ostatnich partii.

Prywatność: aplikacja nie zbiera żadnych danych i działa w pełni offline. Postęp zostaje na Twoim telefonie.
```

## Full description (EN)

```
Eleven logic puzzles in one app. No ads, no accounts, no internet needed.

Included:
• Ball Sort: sort the colors into tubes
• Sudoku 9x9, plus Sudoku 6x6 for a quick game
• Queens: one per row, column and color
• Suns and Moons: three of each per row, = and × clues
• Skyscrapers: how many buildings can you see from the edge?
• Tents: a tent next to every tree
• No-guess Minesweeper: every board can be cleared by logic alone
• Binairo: equal counts, never three in a row
• Lights Out: every tap toggles the neighbors
• 15 Puzzle: slide the tiles into order

Daily puzzle: one board per game each day, the same for everyone. Keep your streak going.

Fair boards: a solver checks every level before you see it. Sudoku and the other grids have exactly one solution, and Minesweeper never makes you guess.

Stats: solve times, best times per board size and your recent average.

Privacy: the app collects no data and works fully offline. Your progress stays on your phone.
```

## Graphics checklist

- [ ] App icon 512x512 PNG (32-bit, no transparency needed), max 1 MB
- [ ] Feature graphic 1024x500 PNG/JPG, no text near edges
- [ ] Phone screenshots: 4-8, 9:16, min 1080px on the short side (menu, 3-4 games, daily, stats)
- [ ] Optional: 7" and 10" tablet screenshots (app is portrait-only)

## App content (Policy > App content)

- Privacy policy: URL above
- Ads: **No, the app does not contain ads**
- App access: **All functionality is available without special access**
- Content rating (IARC questionnaire): category "Puzzle / Game"; answer **No** to violence, sexuality, language, controlled substances, gambling, user interaction/communication, sharing location, digital purchases. Expected result: PEGI 3 / Everyone.
- Target audience: **13+** (e.g. 13-15, 16-17, 18+). Choosing under-13 age groups puts the app under the Families policy and extra review; possible later, not needed now.
- News app: No
- Government app: No
- Financial features: None
- Health: None
- Data safety:
  - Does your app collect or share any of the required user data types? **No**
  - (Progress and stats live in WebView localStorage on the device and never leave it; Android Auto Backup is handled by Google, not by the developer, and is not "collection".)
  - Is all user data encrypted in transit? not asked when nothing is collected
  - Account deletion: not applicable (no accounts)

## Release

- Build: `pnpm build && pnpm exec cap sync android`, then in `android/`: `./gradlew bundleRelease`
- Output: `android/app/build/outputs/bundle/release/app-release.aab`
- Play App Signing: upload `app-release.aab`; the keystore from `keystore.properties` becomes the **upload key**. Back it up in two places.
- Release notes (PL, max 500): `Pierwsze wydanie w Google Play: 11 łamigłówek, codzienna plansza i statystyki.`
