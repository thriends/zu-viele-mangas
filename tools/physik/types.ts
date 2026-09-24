// Datenformat der Physik-Fachunterlage. Eine Lernsequenz = eine JSON-Datei in physik/inhalt/.
// Textfelder dürfen **fett** und *kursiv* enthalten, sonst reiner Text (kein HTML).

export type Stufe = "einfach" | "mittel" | "schwer";

export interface Sequenz {
  id: string;                 // z. B. "elektrostatik" -> physik/elektrostatik.html
  titel: string;              // "Elektrostatik"
  klasse: number;             // 7
  zeitraum: string;           // "Herbst 2026"
  untertitel: string;         // ein Teenager-tauglicher Satz
  ziel: string;               // "Das kann ich am Ende der Lernsequenz" wörtlich aus dem Lernplan
  buchquellen: string[];      // nur Verweise, z. B. "Cornelsen S. 392–397"
  schritte: Schritt[];
}

export interface Schritt {
  id: string;                 // "s0" … "s6", stabil, wird Ankername
  nr: number;
  titel: string;              // Lernschritt aus dem Lernplan
  leitfrage: string;          // wörtlich aus dem Lernplan
  ichKann: string;            // wörtlich aus dem Lernplan, ohne die drei Punkte
  aufgabenImUnterricht: string[]; // z. B. ["AB 1"]
  buchseiten: string[];       // z. B. ["Cornelsen S. 392–393"]
  einstieg: string;           // 2–3 Sätze, Hook, darf Jugendsprache-Akzent haben
  theorie: Absatz[];          // eigene Formulierung, fachlich exakt, KEINE Jugendsprache
  merke: string[];            // 1–3 Merksätze, exakt, KEINE Jugendsprache
  skizzen: Skizze[];          // 0–2 SVG-Skizzen
  interaktiv?: "coulomb";     // optionales Widget
  falle: Falle[];             // ≥1 Fehlvorstellung
  videos: Video[];
  links: Link[];
  versuch?: Versuch;
  praxis: Praxis[];           // ≥1 je Stufe
  training: Training[];       // ≥1 je Stufe; mind. eine "im Stil von AB n", wenn aufgabenImUnterricht ein AB nennt
  kurzfassung: string[];      // höchstens 5 Sätze
  begriffe: Begriff[];        // Fachbegriffe dieses Schritts (werden Glossar + Lernkarten)
  warumKarten: Frage[];       // Erklärkarten "Warum …?"
  quiz: Quiz[];               // ≥1
}

export interface Absatz { ueberschrift?: string; text: string; }
export interface Skizze { titel: string; svg: string; alt: string; }
export interface Falle { falsch: string; richtig: string; warum: string; }
export interface Video {
  youtubeId: string; titel: string; kanal: string; dauer: string;
  herkunft: "Lernplan" | "Zusatz";
  wozu: string;                           // ein Satz: was man danach verstanden hat
  zusammenfassung: { zeit: string; text: string }[]; // eigene Worte, KEIN Volltranskript
  hinweis?: string;                       // z. B. fachliche Einordnung
}
export interface Link { titel: string; url: string; typ: "Simulation" | "Artikel" | "Buch-Webcode"; auftrag: string; }
export interface Versuch { titel: string; frage: string; material: string[]; durchfuehrung: string[]; beobachtung: string; erklaerung: string; sicherheit?: string; }
export interface Praxis { stufe: Stufe; titel: string; phaenomen: string; erklaerung: string; }
export interface Training {
  stufe: Stufe; afb: "I" | "II" | "III"; operator: string; stilVon?: string;
  aufgabe: string; tipp1: string; tipp2: string; loesung: string;
}
export interface Begriff { begriff: string; definition: string; beispiel: string; }
export interface Frage { frage: string; antwort: string; }
export interface Quiz { frage: string; optionen: string[]; richtig: number; begruendung: string; }
