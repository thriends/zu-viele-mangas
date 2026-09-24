// Einmalig: fügt die Teildateien der Inhaltsautoren zu physik/inhalt/elektrostatik.json zusammen.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const I = join(import.meta.dir, "..", "..", "physik", "inhalt");
const lies = (f: string) => JSON.parse(readFileSync(join(I, f), "utf8"));
const teile = ["_teil-a.json", "_teil-b.json", "_teil-c.json"].map(lies);
const videos = existsSync(join(I, "_videos.json")) ? lies("_videos.json") : {};
const schritte = teile.flatMap((t: any) => t.schritte).sort((a: any, b: any) => a.nr - b.nr);
for (const s of schritte) s.videos = [...(s.videos ?? []), ...((videos as any)[s.id] ?? [])];
const seq = {
  id: "elektrostatik",
  titel: "Elektrostatik",
  klasse: 7,
  zeitraum: "Herbst 2026",
  untertitel: "Warum dir nach dem Pulli die Haare zu Berge stehen und warum ein Auto dich vor dem Blitz rettet.",
  ziel: "Ich kann elektrostatische Phänomene im Alltag beobachten, mithilfe des Teilchen- und Ladungsmodells erklären, in einfachen Versuchen untersuchen und meine Ergebnisse fachgerecht darstellen.",
  buchquellen: ["Cornelsen Universum Physik, S. 392 bis 397", "Klett, S. 276 bis 279"],
  schritte,
  faktencheck: teile.flatMap((t: any) => t.faktencheck ?? []),
};
writeFileSync(join(I, "elektrostatik.json"), JSON.stringify(seq, null, 2) + "\n");
if (existsSync(join(I, "_operatoren.json"))) writeFileSync(join(I, "operatoren.json"), JSON.stringify(lies("_operatoren.json"), null, 2) + "\n");
console.log(`merge: ${schritte.length} Schritte, ${seq.faktencheck.length} Fakten, Videos: ${schritte.map((s: any) => s.id + "=" + s.videos.length).join(" ")}`);
