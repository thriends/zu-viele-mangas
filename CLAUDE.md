# zu-viele-mangas

## Arbeiten mit Linear

Linear steuert, GitHub hält den Datensatz. Jede Aufgabe entsteht in Linear und wird über die GitHub-Integration in diesem Repo gespiegelt, damit GitHub auch ohne Linear vollständig bleibt.

- **Linear ist die führende Quelle für Aufgaben.** Team `ZVM`, Workspace `noorder`.
- **Branch-Namen enthalten die Linear-ID**, klein geschrieben: `zvm-12-kurzbeschreibung`.
- **PR-Titel beginnen mit der Linear-ID:** `ZVM-12: Kurzbeschreibung`. Die Integration verknüpft den PR darüber mit dem Issue und setzt den Status (PR offen: In Progress, Review angefragt: In Review, Merge: Done).
- **Nach der Arbeit an einem Issue:** ein kurzer Statuskommentar im Linear-Issue (was geändert, wie geprüft, was offen ist).
- **Nie direkt auf `main`.** Jede Änderung läuft über einen PR.

Ablauf bei „bau ZVM-12": Issue in Linear lesen, Branch `zvm-12-…` anlegen, umsetzen, PR `ZVM-12: …` öffnen, Linear-Issue kommentieren.
