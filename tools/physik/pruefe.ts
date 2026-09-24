// Prüft jede Lernsequenz gegen die Mindeststandards der Fachunterlage. Aufruf: bun tools/physik/pruefe.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Sequenz } from "./types";

const ROOT = join(import.meta.dir, "..", "..");
const I = join(ROOT, "physik", "inhalt");
const fehler: string[] = [];
const JUGEND = /\b(lowkey|no cap|aura|wild|sus|safe|glow-?up|main-?character|power-?up|plot-?twist|boss|cringe|slay|digga|krass|flex|goat|bro)\b/i;
const STRICH = /[–—]/;

for (const f of readdirSync(I).filter(f => f.endsWith(".json") && !f.startsWith("_") && !["quellen.json", "operatoren.json"].includes(f))) {
  const seq: Sequenz = JSON.parse(readFileSync(join(I, f), "utf8"));
  const roh = readFileSync(join(I, f), "utf8");
  if (STRICH.test(roh)) fehler.push(`${f}: langer Strich im Inhalt (${(roh.match(/[–—]/g) || []).length}x)`);
  for (const s of seq.schritte) {
    const p = `${seq.id}/${s.id}`;
    for (const st of ["einfach", "mittel", "schwer"]) {
      if (!s.praxis.some(x => x.stufe === st)) fehler.push(`${p}: Praxis ${st} fehlt`);
      if (!s.training.some(x => x.stufe === st)) fehler.push(`${p}: Training ${st} fehlt`);
    }
    for (const t of s.training) if (!t.tipp1 || !t.tipp2 || !t.loesung) fehler.push(`${p}: Training ohne Tipp/Lösung`);
    const ab = s.aufgabenImUnterricht.find(a => /^AB \d/.test(a));
    if (ab && !s.training.some(t => t.stilVon && t.stilVon.startsWith(ab.slice(0, 4)))) fehler.push(`${p}: keine Trainingsaufgabe im Stil von ${ab}`);
    if (!s.falle.length) fehler.push(`${p}: keine Falle`);
    if (s.kurzfassung.length > 5 || !s.kurzfassung.length) fehler.push(`${p}: Kurzfassung ${s.kurzfassung.length} Sätze`);
    if (!s.quiz.length) fehler.push(`${p}: kein Quiz`);
    for (const q of s.quiz) if (q.richtig < 0 || q.richtig >= q.optionen.length) fehler.push(`${p}: Quiz-Index ungültig: ${q.frage}`);
    if (!s.begriffe.length) fehler.push(`${p}: keine Begriffe`);
    if (!s.warumKarten.length) fehler.push(`${p}: keine Warum-Karten`);
    if (!s.videos.length) fehler.push(`${p}: kein Video`);
    for (const v of s.videos) if (!v.zusammenfassung.length) fehler.push(`${p}: Video ohne Zusammenfassung`);
    const exakt = [...s.theorie.map(t => t.text), ...s.merke, ...s.begriffe.map(b => b.definition), ...s.falle.map(x => x.richtig), ...s.training.map(t => t.loesung)];
    for (const t of exakt) { const m = t.match(JUGEND); if (m) fehler.push(`${p}: Jugendwort "${m[0]}" in exaktem Feld: ${t.slice(0, 60)}`); }
    for (const k of s.skizzen) if (!/viewBox/.test(k.svg) || /<script/i.test(k.svg)) fehler.push(`${p}: Skizze ungültig (${k.titel})`);
  }
  console.log(`${seq.id}: ${seq.schritte.length} Schritte · ${seq.schritte.reduce((n, s) => n + s.praxis.length, 0)} Praxis · ${seq.schritte.reduce((n, s) => n + s.training.length, 0)} Training · ${seq.schritte.reduce((n, s) => n + s.begriffe.length, 0)} Begriffe · ${seq.schritte.reduce((n, s) => n + s.quiz.length, 0)} Quiz · ${seq.schritte.reduce((n, s) => n + s.videos.length, 0)} Videos`);
}
if (fehler.length) { console.log(fehler.map(f => "✗ " + f).join("\n")); process.exit(1); }
console.log("✓ alle Prüfungen bestanden");
