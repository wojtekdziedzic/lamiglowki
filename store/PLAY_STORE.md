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
- Privacy policy URL: https://dziedzic.cloud/lamiglowki-prywatnosc (live copy in the dziedzic.cloud repo, `lamiglowki-prywatnosc.html`; `/lamiglowki/prywatnosc` loops in the site's rewrite rules and returns 500)

## Short description (max 80)

PL: `11 łamigłówek logicznych offline: Sudoku, Królowe, Saper bez zgadywania i więcej`

EN: `11 offline logic puzzles: Sudoku, Queens, no-guess Minesweeper and more`

## Full description (PL)

```
Jedenaście łamigłówek logicznych w jednej aplikacji. Bez reklam, bez kont, bez internetu.

Pierwsze 10 poziomów każdej gry i codzienna łamigłówka są za darmo. Pełną wersję odblokowujesz jednym zakupem, bez subskrypcji.

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

The first 10 levels of every game and the daily puzzle are free. Unlock the full version with a single purchase, no subscription.

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

## In-app product

- Type: one-time product (Monetize > Products > One-time products)
- Product ID: `unlock_all` (must match `PRODUCT_ID` in `src/premium.ts`; permanent)
- Name: `Pełna wersja` / `Full version`
- Description: `Wszystkie poziomy we wszystkich grach` / `Every level in every game`
- Price: 9.99 PLN (Google converts for other countries)
- The app restores it on every start (new phone, reinstall) and drops it after a refund.
- Products can be created only after an AAB with the billing permission is uploaded to any track.

## Graphics checklist

All files in `store/graphics/` (sources in `store/graphics/src/`, rendered with headless Edge).

- [x] App icon 512x512: `icon-512.png` (full-bleed square, Play applies the mask)
- [x] Feature graphic 1024x500: `feature-1024x500.png`
- [x] Phone screenshots 1080x1920 (9:16), 8 files `01-menu.png` to `08-binairo.png`, upload in name order.
  Rendered from `dist/index.html` at 540x960 @2x with a helper page that marks rules as seen and sets
  mid-game levels in localStorage. Real phone screenshots may replace them later (must stay 9:16, not 9:20).
- [ ] Optional: 7" and 10" tablet screenshots (app is portrait-only)

## App content (Policy > App content)

- Privacy policy: URL above
- Ads: **No, the app does not contain ads**
- App access: **All functionality is available without special access**
- Content rating (IARC questionnaire): category "Puzzle / Game"; answer **No** to violence, sexuality, language, controlled substances, gambling, user interaction/communication, sharing location; answer **Yes** to digital purchases (one-time unlock). Expected result: PEGI 3 / Everyone.
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
- Current bundle: versionCode 11, versionName 1.5.0 (with billing), built 2026-11-17. Every later upload needs a higher versionCode.

## Play Console steps (owner only)

1. Developer account: an **organization** account (D-U-N-S above) skips the closed-test rule; a **personal**
   account created after Nov 2023 must run a closed test with 12+ testers for 14 days before production.
2. Create app: name, default language pl-PL, Game, Free (the unlock is an in-app product, the app itself stays free).
3. Fill App content from the section above (privacy URL, ads: no, data safety: nothing collected, IARC, audience 13+).
4. Store listing: texts above, graphics from `store/graphics/`.
5. App signing: default (Google-generated app signing key), decided 2026-11-17. The self-hosted APK has
   practically no users, so a signature mismatch with Play builds is acceptable (an APK user would have to
   uninstall first and lose progress). `lamiglowki.jks` becomes the upload key.
6. Release: upload `app-release.aab`, internal test first (install from Play on your own phone), then production.
