# Brief: kolekcja gier logicznych

Data: 2026-09-29   Route: E (popyt = właściciel jest użytkownikiem)   Werdykt SKEPTIC: SURVIVES przy A-1

## Założenia (Intake)
- A-1: odbiorca = właściciel i rodzina, nie Google Play. Jeśli nieprawda: przed publikacją krótki Discovery (MKT + SKEPTIC), rynek zbiorów łamigłówek jest zatłoczony.
- A-2: sygnał sukcesu = właściciel regularnie gra (słaby sygnał, wystarczający dla hobby).
- A-3: ograniczenia = obecny stack (Vite + TS + Capacitor 8), jeden plik web publikowany jako artefakt, zero backendu.

## Problem / JTBD
"Gdy mam kilka minut, chcę wybrać jedną z kilku łamigłówek w jednej apce, żeby nie przełączać się między aplikacjami pełnymi reklam."

## Zakres v1 (kolejność Delivery)
1. Menu gier: ekran wyboru, poziom per gra, wspólny dźwięk/wibracje/wyciszenie, wspólna karta wygranej, przycisk wstecz Androida.
2. Lights Out: plansza 3x3 do 6x6, układ z losowych kliknięć (zawsze rozwiązywalny).
3. Piętnastka: 3x3 do 5x5, tasowanie legalnymi ruchami (zawsze rozwiązywalna), przesuwanie całego rzędu.
4. Sudoku: generator z gwarancją jednego rozwiązania, trudność = liczba podpowiedzi, notatki, gumka, cofanie, zapis stanu w trakcie.
5. Binairo: 6x6 do 10x10, jedno rozwiązanie, podświetlanie błędów, cofanie.

## v1.1 (2026-09-29, Route E, akcept PO)
Stan wyjściowy: 7 gier LIVE na dziedzic.cloud/lamiglowki. A-1 nieaktualne (apka publiczna);
nowy sygnał sukcesu: liczba pobrań APK z logów serwera.
1. Sudoku 6x6 (wariant silnika Sudoku, parametr rozmiaru i bloków 2x3).
2. Słońca i księżyce: 6x6, po równo w wierszu/kolumnie, max 2 obok siebie, znaki "=" i "×" między polami; jedno rozwiązanie.
3. Zagadka dnia: jedna plansza dziennie z każdej gry (ziarno = data), seria dni, bez wpływu na poziomy.
4. Wieżowce: kwadrat łaciński NxN z podpowiedziami widoczności na brzegach; jedno rozwiązanie.
SKEPTIC: nowe gry WEAK (brak sygnału znudzenia), zagadka dnia jako główna dźwignia powrotów.

## Poza zakresem v1
Reklamy/IAP, Play Store, konta, rankingi, Królowe, Saper, nonogramy, Połącz kropki.

## Guardrails
- Nazwy ogólne, bez znaków towarowych (Flow, Queens, Tango).
- Każda gra deterministyczna per numer poziomu (ziarno), testy Vitest na generator i unikalność rozwiązania.
- Kod i komentarze po angielsku, UI po polsku.

## Definition of Done
Testy zielone, build jednoplikowy, podgląd w przeglądarce (mobile 375px) przechodzi poziom każdej gry, APK zainstalowany na telefonie, artefakt zaktualizowany.
