// Fachkonfiguration der Fachunterlagen. Ein Fach = ein Ordner im Repo-Stamm (<id>/inhalt, <id>/assets/<id>.css|js).
// Aufruf: bun tools/lernplan/build.ts <fach>   ·   bun tools/lernplan/pruefe.ts <fach>

export interface Fach {
  id: string;                 // Ordnername und URL-Pfad, z. B. "physik" -> /physik/
  name: string;               // "Physik"
  marke: string;              // Symbol in der Kopfzeile
  praxisTitel: string;        // Abschnittstitel der Praxisbeispiele
  praxisDahinter: string;     // Aufklapptext unter einem Praxisbeispiel
  startKicker: string;
  startH1: string;
  startBeschreibung: string;
  glossarBeispiel: string;    // Platzhalter im Suchfeld
  videoPflicht: boolean;      // pruefe.ts verlangt je Schritt mindestens ein Video
}

export const FAECHER: Record<string, Fach> = {
  physik: {
    id: "physik",
    name: "Physik",
    marke: "⚡",
    praxisTitel: "Physik in echt",
    praxisDahinter: "Physik dahinter",
    startKicker: "Oskars Physik",
    startH1: "Alles, was du in Physik schon gecheckt hast.",
    startBeschreibung: "Oskars eigene Physik-Fachunterlage mit Theorie, Praxis, Videos und Lernkarten.",
    glossarBeispiel: "z. B. Influenz",
    videoPflicht: true,
  },
  latein: {
    id: "latein",
    name: "Latein",
    marke: "🏛️",
    praxisTitel: "Latein in echt",
    praxisDahinter: "So hängt es zusammen",
    startKicker: "Oskars Latein",
    startH1: "Alles, was du in Latein schon gecheckt hast.",
    startBeschreibung: "Oskars eigene Latein-Fachunterlage mit Grammatik, Realien, Übungen und Lernkarten.",
    glossarBeispiel: "z. B. Druide",
    videoPflicht: false,
  },
};

export function fachAusArgs(): Fach {
  const id = process.argv[2] ?? "physik";
  const f = FAECHER[id];
  if (!f) { console.error(`Unbekanntes Fach "${id}". Bekannt: ${Object.keys(FAECHER).join(", ")}`); process.exit(2); }
  return f;
}
