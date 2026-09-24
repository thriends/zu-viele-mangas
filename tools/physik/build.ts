// Baut die Physik-Fachunterlage aus physik/inhalt/*.json nach physik/**/index.html.
// Aufruf: bun run physik:build  (aus dem Repo-Stamm)
// Eine neue Lernsequenz = neue Datei physik/inhalt/<id>.json nach tools/physik/types.ts. Dateien mit "_" am Anfang werden ignoriert.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Sequenz, Schritt, Stufe, Video, Training, Quiz } from "./types";

const ROOT = join(import.meta.dir, "..", "..");
const PHYSIK = join(ROOT, "physik");
const INHALT = join(PHYSIK, "inhalt");

// ---------- Hilfen ----------

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// **fett**, *kursiv*, Zeilenumbruch
const md = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/\n/g, "<br>");

const slug = (s: string) =>
  s.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// SVG aus eigener Quelle, trotzdem Skripte und Event-Attribute entfernen
const cleanSvg = (svg: string) =>
  svg.replace(/<script[\s\S]*?<\/script>/gi, "")
     .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
     .replace(/<svg\b/, '<svg role="img" class="skizze-svg"');

const STUFE: Record<Stufe, { label: string; kurz: string }> = {
  einfach: { label: "Level 1 · einfach", kurz: "Lvl 1" },
  mittel: { label: "Level 2 · mittel", kurz: "Lvl 2" },
  schwer: { label: "Boss-Level · schwer", kurz: "Boss" },
};

interface Quellen {
  webcodes: { schritt: string; code: string; buchseite: string; titel: string; url: string; medien: string[]; auftrag: string }[];
}
interface Fakt { aussage: string; quelle: string; status: string; notiz?: string }
interface SeqDatei extends Sequenz { faktencheck?: Fakt[] }

// ---------- Rahmen ----------

function seite(opts: { titel: string; beschreibung: string; aktiv: string; inhalt: string; daten?: string }) {
  const nav = [
    ["Start", "/physik/", "start"],
    ["Glossar", "/physik/glossar/", "glossar"],
    ["Karten", "/physik/karten/", "karten"],
    ["Operatoren", "/physik/operatoren/", "operatoren"],
  ].map(([t, h, k]) => `<a href="${h}"${k === opts.aktiv ? ' aria-current="page"' : ""}>${t}</a>`).join("");
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(opts.titel)}</title>
<meta name="description" content="${esc(opts.beschreibung)}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="stylesheet" href="/physik/assets/physik.css">
</head>
<body>
<a class="skip" href="#inhalt">Zum Inhalt</a>
<header class="topbar">
  <div class="topbar-inner">
    <a class="marke" href="/physik/"><span class="blitz" aria-hidden="true">⚡</span><span>Physik<span class="dim"> · Oskars Fachunterlage</span></span></a>
    <nav class="hauptnav" aria-label="Physik">${nav}</nav>
  </div>
</header>
<main id="inhalt">
${opts.inhalt}
</main>
<footer class="fuss">
  <p>Selbst geschrieben für Oskar. Buchseiten sind nur Verweise, Videos gehören ihren Kanälen.</p>
  <p><a href="/">zu viele mangas</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></p>
</footer>
${opts.daten ?? ""}
<script src="/physik/assets/physik.js" defer></script>
</body>
</html>
`;
}

// ---------- Bausteine einer Sequenzseite ----------

function videoBlock(v: Video) {
  const zs = v.zusammenfassung.map(z => `<li><span class="zeit">${esc(z.zeit)}</span> ${md(z.text)}</li>`).join("");
  return `<figure class="video">
  <div class="video-rahmen" data-yt="${esc(v.youtubeId)}" data-titel="${esc(v.titel)}">
    <button class="video-start" type="button" aria-label="Video laden und abspielen: ${esc(v.titel)}">
      <span class="play" aria-hidden="true">▶</span>
      <span class="video-titel">${esc(v.titel)}</span>
      <span class="video-meta">${esc(v.kanal)} · ${esc(v.dauer)} · ${v.herkunft === "Lernplan" ? "aus deinem Lernplan" : "Zusatzvideo, geprüft"}</span>
      <span class="video-hinweis">Lädt erst nach Klick von YouTube (ohne Cookies).</span>
    </button>
  </div>
  <figcaption>
    <p class="wozu"><strong>Danach checkst du:</strong> ${md(v.wozu)}</p>
    <details class="zs"><summary>Was im Video passiert (Zusammenfassung mit Zeitmarken)</summary><ol class="zeitmarken">${zs}</ol></details>
    ${v.hinweis ? `<p class="video-einordnung"><strong>Einordnung:</strong> ${md(v.hinweis)}</p>` : ""}
  </figcaption>
</figure>`;
}

function trainingBlock(t: Training, i: number, sid: string) {
  return `<article class="training stufe-${t.stufe}" id="${sid}-t${i + 1}">
  <header><span class="badge stufe-${t.stufe}">${STUFE[t.stufe].label}</span><span class="afb">AFB ${t.afb} · ${esc(t.operator)}</span>${t.stilVon ? `<span class="stil">im Stil von ${esc(t.stilVon)}</span>` : ""}</header>
  <p class="aufgabe">${md(t.aufgabe)}</p>
  <details class="hilfe"><summary>Tipp 1</summary><p>${md(t.tipp1)}</p></details>
  <details class="hilfe"><summary>Tipp 2</summary><p>${md(t.tipp2)}</p></details>
  <details class="hilfe loesung"><summary>Lösungsweg zeigen</summary><p>${md(t.loesung)}</p></details>
</article>`;
}

function quizBlock(q: Quiz[], id: string, titel: string) {
  const fragen = q.map((f, i) => `<fieldset class="quizfrage" data-richtig="${f.richtig}">
  <legend>${i + 1}. ${md(f.frage)}</legend>
  ${f.optionen.map((o, j) => `<label><input type="radio" name="${id}-${i}" value="${j}"> <span>${md(o)}</span></label>`).join("")}
  <p class="quiz-feedback" hidden data-begruendung="${esc(md(f.begruendung))}"></p>
</fieldset>`).join("");
  return `<section class="quiz" id="${id}" aria-label="${esc(titel)}"><h4>${esc(titel)}</h4>${fragen}<p class="quiz-stand" aria-live="polite"></p></section>`;
}

function coulombWidget() {
  return `<div class="coulomb" data-coulomb>
  <p class="coulomb-titel"><strong>Probier's aus:</strong> Stell Abstand und Ladung ein und schau, was mit der Kraft passiert.</p>
  <svg viewBox="0 0 400 130" class="coulomb-svg" role="img" aria-label="Zwei geladene Kugeln mit Kraftpfeilen">
    <defs><marker id="spitze" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="pfeil"/></marker></defs>
    <line data-pfeil-l x1="0" y1="65" x2="0" y2="65" class="kraftpfeil" marker-end="url(#spitze)"/>
    <line data-pfeil-r x1="0" y1="65" x2="0" y2="65" class="kraftpfeil" marker-end="url(#spitze)"/>
    <circle data-kugel-l cx="120" cy="65" r="22" class="plus-kugel"/><text data-t-l x="120" y="71" text-anchor="middle" class="kugeltext">+</text>
    <circle data-kugel-r cx="280" cy="65" r="22" class="minus-kugel"/><text data-t-r x="280" y="71" text-anchor="middle" class="kugeltext">−</text>
  </svg>
  <div class="regler">
    <label>Abstand <input type="range" min="1" max="4" step="1" value="2" data-r> <output data-r-out>2 Kästchen</output></label>
    <label>Ladung der linken Kugel <input type="range" min="1" max="4" step="1" value="1" data-q> <output data-q-out>1-fach</output></label>
  </div>
  <p class="coulomb-ergebnis" aria-live="polite" data-ergebnis></p>
  <p class="klein">Ungleichnamig geladen, also ziehen sich die Kugeln an. Die Pfeile zeigen die Stärke der Anziehung im Vergleich (Modell, nicht maßstabsgetreu gemessen).</p>
</div>`;
}

function schrittSection(seq: Sequenz, s: Schritt, webcodes: Quellen["webcodes"]) {
  const theorie = s.theorie.map(a => `${a.ueberschrift ? `<h4>${md(a.ueberschrift)}</h4>` : ""}<p>${md(a.text)}</p>`).join("");
  const merke = s.merke.length ? `<aside class="merke"><p class="merke-label">Merke</p>${s.merke.map(m => `<p>${md(m)}</p>`).join("")}</aside>` : "";
  const skizzen = s.skizzen.map(k => `<figure class="skizze">${cleanSvg(k.svg).replace('class="skizze-svg"', `class="skizze-svg" aria-label="${esc(k.alt)}"`)}<figcaption>${md(k.titel)}</figcaption></figure>`).join("");
  const falle = s.falle.map(f => `<div class="falle"><p class="falle-label">Achtung, Falle</p><p class="falsch"><span aria-hidden="true">✗</span> ${md(f.falsch)}</p><p class="richtig"><span aria-hidden="true">✓</span> ${md(f.richtig)}</p><p class="warum">${md(f.warum)}</p></div>`).join("");
  const videos = s.videos.map(videoBlock).join("");
  const wc = webcodes.filter(w => w.schritt === s.id);
  const links = [
    ...s.links.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.titel)}</a> <span class="linktyp">${esc(l.typ)}</span><br><span class="auftrag">${md(l.auftrag)}</span></li>`),
    ...wc.map(w => `<li><a href="${esc(w.url)}" target="_blank" rel="noopener">Buch-Webcode ${esc(w.code)}: ${esc(w.titel)}</a> <span class="linktyp">Videos vom Verlag</span><br><span class="auftrag">${md(w.auftrag)}</span><br><span class="klein">Drin: ${esc(w.medien.join(", "))}</span></li>`),
  ];
  const versuch = s.versuch ? `<div class="versuch"><p class="versuch-label">Versuch zum Selbermachen</p><h4>${md(s.versuch.titel)}</h4>
    <p><strong>Frage:</strong> ${md(s.versuch.frage)}</p>
    <p><strong>Material:</strong> ${s.versuch.material.map(md).join(", ")}</p>
    <ol>${s.versuch.durchfuehrung.map(d => `<li>${md(d)}</li>`).join("")}</ol>
    ${s.versuch.sicherheit ? `<p class="klein"><strong>Sicherheit:</strong> ${md(s.versuch.sicherheit)}</p>` : ""}
    <details><summary>Was du beobachten solltest</summary><p>${md(s.versuch.beobachtung)}</p></details>
    <details><summary>Und warum?</summary><p>${md(s.versuch.erklaerung)}</p></details></div>` : "";
  const praxis = (["einfach", "mittel", "schwer"] as Stufe[]).map(st => {
    const ps = s.praxis.filter(p => p.stufe === st);
    if (!ps.length) return "";
    return ps.map(p => `<article class="praxis stufe-${st}"><span class="badge stufe-${st}">${STUFE[st].label}</span><h5>${md(p.titel)}</h5><p>${md(p.phaenomen)}</p><details><summary>Physik dahinter</summary><p>${md(p.erklaerung)}</p></details></article>`).join("");
  }).join("");
  const training = s.training.map((t, i) => trainingBlock(t, i, s.id)).join("");
  const begriffe = s.begriffe.map(b => `<a class="chip" href="/physik/glossar/#${slug(b.begriff)}">${esc(b.begriff)}</a>`).join("");
  const meta = [
    s.aufgabenImUnterricht.length ? `<span><strong>Im Unterricht:</strong> ${esc(s.aufgabenImUnterricht.join(", "))}</span>` : "",
    s.buchseiten.length ? `<span><strong>Im Buch:</strong> ${esc(s.buchseiten.join("; "))}</span>` : "",
  ].filter(Boolean).join("");

  return `<section class="schritt" id="${s.id}" aria-labelledby="${s.id}-h">
  <header class="schritt-kopf">
    <p class="schritt-nr">Lernschritt ${s.nr}</p>
    <h2 id="${s.id}-h">${md(s.titel)}</h2>
    <p class="leitfrage">${md(s.leitfrage)}</p>
    <label class="ichkann"><input type="checkbox" data-ichkann="${seq.id}:${s.id}"> <span><strong>Ich kann</strong> ${md(s.ichKann)}</span></label>
    ${meta ? `<p class="schritt-meta">${meta}</p>` : ""}
  </header>
  <p class="einstieg">${md(s.einstieg)}</p>
  <div class="theorie">${theorie}</div>
  ${merke}
  ${skizzen ? `<div class="skizzen">${skizzen}</div>` : ""}
  ${s.interaktiv === "coulomb" ? coulombWidget() : ""}
  ${falle ? `<div class="fallen">${falle}</div>` : ""}
  ${videos ? `<h3 class="block-h">Video</h3>${videos}` : ""}
  ${links.length ? `<h3 class="block-h">Zum Weiterklicken</h3><ul class="links">${links.join("")}</ul>` : ""}
  ${versuch}
  ${praxis ? `<h3 class="block-h">Physik in echt</h3><div class="praxis-grid">${praxis}</div>` : ""}
  ${training ? `<h3 class="block-h">Training</h3><p class="klein">Erst selbst probieren, dann Tipp 1, dann Tipp 2. Den Lösungsweg erst ganz zum Schluss.</p><div class="trainings">${training}</div>` : ""}
  <aside class="kurz"><p class="kurz-label">In kurz</p><ul>${s.kurzfassung.map(k => `<li>${md(k)}</li>`).join("")}</ul></aside>
  ${s.quiz.length ? quizBlock(s.quiz, `${s.id}-quiz`, "Schnellcheck") : ""}
  ${begriffe ? `<p class="begriffe"><span class="klein">Begriffe aus diesem Schritt:</span> ${begriffe}</p>` : ""}
</section>`;
}

function sequenzSeite(seq: SeqDatei, quellen: Quellen) {
  const nav = seq.schritte.map(s => `<a class="chip" href="#${s.id}">${s.nr}. ${esc(s.titel)}</a>`).join("");
  const selbstcheck = seq.schritte.map(s => `<li><label class="ichkann"><input type="checkbox" data-ichkann="${seq.id}:${s.id}"> <span>${md(s.ichKann)}</span></label> <a href="#${s.id}" class="klein">zum Schritt</a></li>`).join("");
  const boss = seq.schritte.flatMap(s => s.quiz.slice(0, 1).map(q => ({ ...q, frage: `[${s.nr}] ${q.frage}` })));
  const fakten = (seq.faktencheck ?? []).map(f => `<tr><td>${md(f.aussage)}</td><td>${/^https?:/.test(f.quelle) ? `<a href="${esc(f.quelle)}" target="_blank" rel="noopener">Quelle</a>` : md(f.quelle)}</td><td>${esc(f.status)}</td></tr>`).join("");
  const inhalt = `<section class="hero">
  <p class="kicker">Klasse ${seq.klasse} · ${esc(seq.zeitraum)}</p>
  <h1>${md(seq.titel)}</h1>
  <p class="untertitel">${md(seq.untertitel)}</p>
  <div class="ziel"><p class="ziel-label">Das kann ich am Ende der Lernsequenz</p><p>${md(seq.ziel)}</p></div>
  <p class="fortschritt" data-fortschritt="${seq.id}" data-gesamt="${seq.schritte.length}"></p>
  <nav class="schritt-nav" aria-label="Lernschritte">${nav}</nav>
</section>
${seq.schritte.map(s => schrittSection(seq, s, quellen.webcodes)).join("\n")}
<section class="abschluss" id="selbstcheck">
  <h2>Selbstcheck</h2>
  <p>Hak ab, was du wirklich kannst. Ehrlich, das sieht nur dein Browser.</p>
  <ul class="selbstcheck">${selbstcheck}</ul>
  ${quizBlock(boss, `${seq.id}-boss`, "Boss-Fight: je eine Frage aus jedem Lernschritt")}
  <p><a class="knopf" href="/physik/karten/?seq=${seq.id}">Lernkarten zu ${esc(seq.titel)} üben</a></p>
</section>
${fakten ? `<section class="abschluss" id="faktencheck"><h2>Quellen und Faktencheck</h2><p class="klein">Jede Zahl und jede Jahreszahl auf dieser Seite ist hier mit Quelle geprüft. Im Buch: ${esc(seq.buchquellen.join("; "))}.</p><div class="tabelle"><table><thead><tr><th>Aussage</th><th>Quelle</th><th>Status</th></tr></thead><tbody>${fakten}</tbody></table></div></section>` : ""}`;
  return seite({ titel: `${seq.titel} · Physik · Oskars Fachunterlage`, beschreibung: seq.untertitel, aktiv: "", inhalt });
}

// ---------- Sammelseiten ----------

function startSeite(seqs: SeqDatei[]) {
  const karten = seqs.map(s => `<a class="seq-karte" href="/physik/${s.id}/">
  <span class="kicker">Klasse ${s.klasse} · ${esc(s.zeitraum)}</span>
  <span class="seq-titel">${esc(s.titel)}</span>
  <span class="seq-unter">${esc(s.untertitel)}</span>
  <span class="seq-zahlen">${s.schritte.length} Lernschritte · ${s.schritte.reduce((n, x) => n + x.begriffe.length, 0)} Begriffe · ${s.schritte.reduce((n, x) => n + x.training.length, 0)} Trainingsaufgaben</span>
  <span class="fortschritt" data-fortschritt="${s.id}" data-gesamt="${s.schritte.length}"></span>
</a>`).join("");
  const inhalt = `<section class="hero">
  <p class="kicker">Oskars Physik</p>
  <h1>Alles, was du in Physik schon gecheckt hast.</h1>
  <p class="untertitel">Jede Lernsequenz landet hier. Glossar und Lernkarten wachsen mit, damit du in Klasse 9 noch findest, was du in Klasse 7 gelernt hast.</p>
</section>
<section class="seq-liste" aria-label="Lernsequenzen">${karten}</section>
<section class="abschluss">
  <h2>So nutzt du das</h2>
  <ol class="anleitung">
    <li><strong>Lesen:</strong> Pro Lernschritt erst Einstieg und Theorie, dann das Video.</li>
    <li><strong>Machen:</strong> Trainingsaufgaben selbst lösen. Tipps nur, wenn du festhängst.</li>
    <li><strong>Abrufen:</strong> Jeden Tag ein paar <a href="/physik/karten/">Lernkarten</a>. Das bringt mehr als nochmal lesen.</li>
    <li><strong>Checken:</strong> Am Ende den Selbstcheck und den Boss-Fight.</li>
  </ol>
</section>`;
  return seite({ titel: "Physik · Oskars Fachunterlage", beschreibung: "Oskars eigene Physik-Fachunterlage mit Theorie, Praxis, Videos und Lernkarten.", aktiv: "start", inhalt });
}

function glossarSeite(seqs: SeqDatei[]) {
  const alle = seqs.flatMap(sq => sq.schritte.flatMap(s => s.begriffe.map(b => ({ ...b, seq: sq, schritt: s }))));
  alle.sort((a, b) => a.begriff.localeCompare(b.begriff, "de"));
  const gesehen = new Set<string>();
  const eintraege = alle.map(b => {
    let id = slug(b.begriff);
    if (gesehen.has(id)) id = `${id}-${b.seq.id}`;
    gesehen.add(id);
    return `<div class="glossar-eintrag" id="${id}" data-such="${esc(b.begriff.toLowerCase())}">
  <dt>${esc(b.begriff)}</dt>
  <dd><p>${md(b.definition)}</p><p class="klein"><strong>Beispiel:</strong> ${md(b.beispiel)}</p><p class="klein"><a href="/physik/${b.seq.id}/#${b.schritt.id}">${esc(b.seq.titel)}, Lernschritt ${b.schritt.nr}: ${esc(b.schritt.titel)}</a></p></dd>
</div>`;
  }).join("");
  const inhalt = `<section class="hero"><p class="kicker">Nachschlagen</p><h1>Glossar</h1><p class="untertitel">${alle.length} Fachbegriffe aus allen Lernsequenzen, von A bis Z.</p>
  <label class="suche"><span>Begriff suchen</span><input type="search" data-glossar-suche placeholder="z. B. Influenz"></label></section>
<dl class="glossar">${eintraege}</dl>`;
  return seite({ titel: "Glossar · Physik · Oskars Fachunterlage", beschreibung: "Alle Physik-Fachbegriffe von Oskar an einem Ort.", aktiv: "glossar", inhalt });
}

function kartenSeite(seqs: SeqDatei[]) {
  const karten = seqs.flatMap(sq => sq.schritte.flatMap(s => [
    ...s.begriffe.map((b, i) => ({ id: `${sq.id}:${s.id}:b${i}:${slug(b.begriff)}`, seq: sq.id, seqTitel: sq.titel, schritt: s.nr, typ: "Begriff", vorne: b.begriff, hinten: b.definition, extra: b.beispiel })),
    ...s.warumKarten.map((w, i) => ({ id: `${sq.id}:${s.id}:w${i}`, seq: sq.id, seqTitel: sq.titel, schritt: s.nr, typ: "Warum", vorne: w.frage, hinten: w.antwort, extra: "" })),
  ]));
  const filter = seqs.map(s => `<option value="${s.id}">${esc(s.titel)}</option>`).join("");
  const inhalt = `<section class="hero"><p class="kicker">Abrufen statt Wiederlesen</p><h1>Lernkarten</h1>
  <p class="untertitel">Erst selbst antworten, dann umdrehen. Gewusst wandert ein Fach weiter, nicht gewusst zurück in Fach 1. Fach 1 kommt am häufigsten dran.</p></section>
<section class="kartenbox" data-karten>
  <div class="karten-filter">
    <label>Sequenz <select data-f-seq><option value="">alle</option>${filter}</select></label>
    <label>Art <select data-f-typ><option value="">alle</option><option value="Begriff">Begriffe</option><option value="Warum">Warum-Fragen</option></select></label>
  </div>
  <p class="faecher" data-faecher aria-live="polite"></p>
  <div class="karte" data-karte tabindex="0" role="button" aria-label="Karte umdrehen">
    <div class="karte-innen">
      <div class="karte-vorne"><span class="karte-typ" data-k-typ></span><p data-k-vorne></p><span class="klein">Tippen zum Umdrehen</span></div>
      <div class="karte-hinten"><p data-k-hinten></p><p class="klein" data-k-extra></p><span class="klein" data-k-herkunft></span></div>
    </div>
  </div>
  <div class="karten-knoepfe">
    <button type="button" class="knopf zurueck" data-nochmal>Nochmal</button>
    <button type="button" class="knopf" data-gewusst>Gewusst</button>
  </div>
  <p class="klein"><button type="button" class="linkknopf" data-reset>Fortschritt dieser Auswahl zurücksetzen</button></p>
</section>`;
  const daten = `<script type="application/json" id="karten-daten">${JSON.stringify(karten).replace(/</g, "\\u003c")}</script>`;
  return { html: seite({ titel: "Lernkarten · Physik · Oskars Fachunterlage", beschreibung: "Lernkarten über alle Physik-Sequenzen.", aktiv: "karten", inhalt, daten }), anzahl: karten.length };
}

interface Operator { wort: string; afb: string; bedeutung: string; beispielAufgabe: string; soKlingtEsGut: string; typischerFehler: string }
function operatorenSeite(ops: Operator[]) {
  const reihen = ops.map(o => `<article class="operator" id="${slug(o.wort)}">
  <header><h2>${esc(o.wort)}</h2><span class="badge afb-${o.afb}">AFB ${esc(o.afb)}</span></header>
  <p>${md(o.bedeutung)}</p>
  <p class="klein"><strong>Beispiel:</strong> ${md(o.beispielAufgabe)}</p>
  <details><summary>So klingt eine gute Antwort</summary><p>${md(o.soKlingtEsGut)}</p></details>
  <p class="klein falsch-hinweis"><strong>Typischer Fehler:</strong> ${md(o.typischerFehler)}</p>
</article>`).join("");
  const inhalt = `<section class="hero"><p class="kicker">Aufgaben richtig lesen</p><h1>Operatoren</h1>
  <p class="untertitel">Das erste Wort einer Aufgabe sagt dir, was du liefern musst. „Nenne“ will eine Liste, „beurteile“ will ein Urteil mit Gründen. Wer das verwechselt, verschenkt Punkte.</p>
  <p class="klein">AFB I: wiedergeben · AFB II: anwenden und erklären · AFB III: beurteilen und übertragen</p></section>
<section class="operatoren">${reihen}</section>`;
  return seite({ titel: "Operatoren · Physik · Oskars Fachunterlage", beschreibung: "Was nenne, erkläre, beurteile in Aufgaben bedeuten.", aktiv: "operatoren", inhalt });
}

// ---------- Lauf ----------

function schreibe(rel: string, html: string) {
  const dir = join(PHYSIK, rel);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

const dateien = readdirSync(INHALT).filter(f => f.endsWith(".json") && !f.startsWith("_") && f !== "quellen.json" && f !== "operatoren.json");
const seqs: SeqDatei[] = dateien.map(f => JSON.parse(readFileSync(join(INHALT, f), "utf8")));
seqs.sort((a, b) => a.klasse - b.klasse || a.titel.localeCompare(b.titel, "de"));
const quellen: Quellen = existsSync(join(INHALT, "quellen.json")) ? JSON.parse(readFileSync(join(INHALT, "quellen.json"), "utf8")) : { webcodes: [] };
const ops: Operator[] = existsSync(join(INHALT, "operatoren.json")) ? JSON.parse(readFileSync(join(INHALT, "operatoren.json"), "utf8")).operatoren : [];

// Verwaiste Sequenzordner entfernen (z. B. nach einer Probe-Sequenz)
const bekannt = new Set(["assets", "inhalt", "glossar", "karten", "operatoren", ...seqs.map(s => s.id)]);
for (const d of readdirSync(PHYSIK, { withFileTypes: true })) {
  if (d.isDirectory() && !bekannt.has(d.name) && existsSync(join(PHYSIK, d.name, "index.html"))) rmSync(join(PHYSIK, d.name), { recursive: true });
}

writeFileSync(join(PHYSIK, "index.html"), startSeite(seqs));
for (const s of seqs) schreibe(s.id, sequenzSeite(s, quellen));
schreibe("glossar", glossarSeite(seqs));
const k = kartenSeite(seqs);
schreibe("karten", k.html);
schreibe("operatoren", operatorenSeite(ops));

console.log(`physik:build · ${seqs.length} Sequenz(en): ${seqs.map(s => s.id).join(", ")} · ${k.anzahl} Karten · ${ops.length} Operatoren`);
