# Schuldtypen: Erkennungssignal und wirtschaftliche Wirkung

Ordne jeden Registereintrag genau einem Typ zu. Der Typ bestimmt, wie du die Wirkung formulierst – und ob Handeln überhaupt lohnt.

Die entscheidende Unterscheidung zieht sich durch alle Typen: **Schuld kostet erst dann, wenn sie berührt wird.** Ein Modul, das seit zwei Jahren unverändert läuft, kostet nichts, egal wie schlecht es aussieht. Deshalb ist Churn in jedem Typ ein Multiplikator, nicht nur ein Nebenwert.

---

## 1. Änderungskosten-Schuld

**Signal**: hoher Hotspot-Score. Häufig geänderte Datei mit großem Umfang.

**Wirkung**: Jede Änderung in diesem Bereich dauert länger als in vergleichbaren Bereichen. Der Aufschlag fällt nicht einmal an, sondern bei jeder Anforderung, die dort landet.

**Formulierung**: „Der Bereich X wird häufig geändert (N Commits in M Monaten) und ist mit L Zeilen der umfangreichste Einzelbaustein. Änderungen dort brauchen erkennbar länger, weil jede Anpassung den gesamten Kontext berücksichtigen muss."

**Gegenmaßnahme, die realistisch ist**: den *nächsten* geplanten Change dort nutzen, um einen abgrenzbaren Teil herauszulösen. Nicht: „Modul neu schreiben".

**Wann nicht handeln**: Wenn der Bereich in den nächsten Quartalen nachweislich nicht mehr angefasst wird.

---

## 2. Test-Schuld

**Signal**: Hotspot ohne zugeordnete Testdatei. Oder: gar keine Testinfrastruktur im Projekt.

**Wirkung**: Änderungen sind nicht überprüfbar. Fehler werden erst in Produktion oder durch manuelles Testen gefunden. Das verlängert nicht die Entwicklung, sondern die **Zeit bis zur Freigabe** – und genau die interessiert Stakeholder.

**Formulierung**: „Änderungen an X können vor dem Release nur manuell geprüft werden. Bei jeder Anpassung entsteht dadurch entweder zusätzlicher Testaufwand oder ein bewusst eingegangenes Risiko."

**Gegenmaßnahme**: Tests für die **risikoreichsten Pfade** des Hotspots, nicht Abdeckung als Zielwert. Eine Prozentzahl als Ziel erzeugt Tests für triviale Getter.

**Wichtig**: Wenn das Projekt gar keine Tests hat, ist das *ein* Eintrag („keine Testinfrastruktur"), nicht dreißig. Die kleinste wirksame Maßnahme ist dann: Testrunner einrichten und die drei kritischsten Funktionen abdecken, um den Anfangswiderstand zu beseitigen.

---

## 3. Wissens-Schuld (Bus-Faktor)

**Signal**: hoher Churn, ein einziger Autor über den gesamten Zeitraum.

**Wirkung**: Ausfall oder Weggang dieser Person verlängert jede Änderung in dem Bereich erheblich. Das ist ein Personalrisiko, das sich als technisches Risiko tarnt.

**Formulierung**: „Alle N Änderungen an X in den letzten M Monaten kommen von einer Person. Ohne diese Person ist der Bereich nur mit erheblichem Einarbeitungsaufwand änderbar."

**Gegenmaßnahme**: Nicht „Dokumentation schreiben" – das wird nicht gelesen. Wirksam ist, den nächsten Change in dem Bereich bewusst mit einer zweiten Person zu besetzen.

**Nicht anwendbar** in Ein-Personen-Projekten. Dort ist der Bus-Faktor eine Eigenschaft des Projekts und kein Befund. Schreibe ihn nicht ins Register.

---

## 4. Struktur-Schuld (fehlende Abstraktion)

**Signal**: Änderungskopplung. Zwei oder mehr Dateien werden regelmäßig gemeinsam geändert, obwohl sie in unterschiedlichen Modulen liegen.

**Wirkung**: Eine fachliche Änderung erfordert mehrere technische Änderungen an verschiedenen Stellen. Das erhöht die Fehlerwahrscheinlichkeit, weil eine Stelle vergessen werden kann – und die vergessene Stelle fällt oft erst in Produktion auf.

**Formulierung**: „Änderung am Feature Y erfordert in der Praxis Anpassungen an N Stellen (Belege: gemeinsame Änderung in K von L Commits). Wird eine Stelle vergessen, entsteht ein inkonsistenter Zustand."

**Gegenmaßnahme**: die geteilte Verantwortung an einer Stelle bündeln. Das ist der Typ, bei dem Entwickler den größten Nutzen sehen und Stakeholder am wenigsten – formuliere hier besonders sorgfältig über Fehlerwahrscheinlichkeit statt über Eleganz.

**Achtung vor falsch positiven Treffern**: Eine Komponente und ihre Stylesheet-Datei, ein Interface und seine Implementierung, ein Handler und sein Schema – diese Paare *sollen* gemeinsam geändert werden. Kopplung innerhalb desselben Verzeichnisses ist meist erwartbar. Interessant ist Kopplung über Modulgrenzen hinweg.

---

## 5. Abhängigkeits-Schuld

**Signal**: Major-Versionen im Rückstand, Pakete ohne Wartung, bekannte Schwachstellen in produktiven Abhängigkeiten.

**Wirkung**: Zwei getrennte Effekte, die nicht vermischt werden dürfen:
- **Sicherheit**: erreichbare Schwachstelle – akutes Risiko, gehört eskaliert und nicht in ein Quartalsregister.
- **Aufschub**: je länger der Rückstand, desto teurer das Update, weil Breaking Changes sich stapeln. Das ist der Zinseszins-Effekt, der bei technischen Schulden am ehesten wörtlich stimmt.

**Formulierung**: „Abhängigkeit Z liegt N Major-Versionen zurück. Das Update wird mit jeder ausgelassenen Version aufwendiger, weil sich Breaking Changes summieren."

**Nicht berichten**: Patch- und Minor-Rückstände. Ein `npm outdated` mit 200 Zeilen ist kein Befund, sondern Normalzustand.

---

## 6. Toter Code

**Signal**: nicht geändert im Zeitfenster, keine Referenz im Repository, kein Konventions-Einstiegspunkt.

**Wirkung**: gering, aber real – jeder Leser muss entscheiden, ob der Code relevant ist. Bei KI-Agenten wirkt toter Code zusätzlich als Störsignal, weil er als Vorbild für neue Implementierungen dienen kann.

**Formulierung**: „N Dateien sind im Beobachtungszeitraum unverändert und werden nirgendwo referenziert. Kandidaten für Entfernung."

**Gegenmaßnahme**: löschen. Das ist der einzige Typ mit hohem Nutzen bei minimalem Aufwand – deshalb gehört er als Quick Win in jedes Register, auch wenn er unspektakulär ist.

**Vorsicht**: Reflection, dynamische Importe, Konventions-Loader und öffentliche API-Exporte machen Referenzsuchen unzuverlässig. Formuliere immer als Kandidat, nie als Feststellung.

---

## 7. Feedback-Schuld

**Signal**: lange Build- oder Testlaufzeiten, manuelle Deployment-Schritte, fehlende lokale Entwicklungsumgebung.

**Wirkung**: Jedes Teammitglied zahlt jeden Tag. Das ist die Schuld mit der breitesten Wirkung und der besten Vermittelbarkeit, weil sie sich in Wartezeit statt in Codequalität ausdrückt.

**Formulierung**: „Ein vollständiger Durchlauf dauert N Minuten. Bei M Durchläufen pro Tag und Person ist das der größte einzelne Zeitverlust im Entwicklungsprozess."

Hier darfst du multiplizieren – aber nur mit Zahlen, die der Nutzer geliefert hat oder die aus CI-Logs stammen. Nicht mit geschätzter Teamgröße.

---

## Typen, die kein Registereintrag sind

Diese Dinge werden häufig als technische Schuld bezeichnet und gehören trotzdem nicht in dieses Register:

- **Stilfragen** (Formatierung, Namenskonventionen, Ordnerstruktur nach Geschmack). Gehören in ein Linter-Regelwerk, nicht in eine Priorisierung.
- **Fehlende Features.** Eine nicht gebaute Funktion ist keine Schuld, sondern offener Scope.
- **Bekannte Bugs.** Gehören ins Bugtracking. Ein Bug hat einen Fehlerzustand, eine Schuld hat einen Kostenaufschlag.
- **Technologieentscheidungen, die jemand anders getroffen hätte.** „Wir hätten Framework A statt B nehmen sollen" ist keine Schuld, solange B funktioniert. Nur wenn belegbare Kosten anfallen, wird es ein Eintrag – und dann heißt der Eintrag nach den Kosten, nicht nach dem Framework.
