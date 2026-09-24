// Physik-Fachunterlage: Interaktion. Speicher nur im Browser, jede Seite funktioniert auch ohne.
(function () {
  "use strict";

  var speicher = {
    lies: function (k, standard) {
      try { var v = window.localStorage.getItem("physik:" + k); return v === null ? standard : JSON.parse(v); }
      catch (e) { return standard; }
    },
    schreib: function (k, v) {
      try { window.localStorage.setItem("physik:" + k, JSON.stringify(v)); } catch (e) { /* ohne Speicher weiter */ }
    }
  };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---------- Ich-kann-Häkchen und Fortschritt ----------
  var ichkann = speicher.lies("ichkann", {});
  function fortschrittZeigen() {
    $$("[data-fortschritt]").forEach(function (el) {
      var seq = el.getAttribute("data-fortschritt");
      var gesamt = +el.getAttribute("data-gesamt");
      var n = Object.keys(ichkann).filter(function (k) { return ichkann[k] && k.indexOf(seq + ":") === 0; }).length;
      el.textContent = n === 0 ? "Noch nichts abgehakt. Los geht's." :
        n >= gesamt ? "Alle " + gesamt + " Lernschritte abgehakt. GG!" :
        n + " von " + gesamt + " Lernschritten abgehakt.";
    });
  }
  $$("[data-ichkann]").forEach(function (box) {
    var k = box.getAttribute("data-ichkann");
    box.checked = !!ichkann[k];
    box.addEventListener("change", function () {
      ichkann[k] = box.checked;
      speicher.schreib("ichkann", ichkann);
      $$('[data-ichkann="' + k + '"]').forEach(function (b) { b.checked = box.checked; });
      fortschrittZeigen();
    });
  });
  fortschrittZeigen();

  // ---------- Video erst nach Klick (youtube-nocookie) ----------
  $$(".video-rahmen").forEach(function (r) {
    var knopf = r.querySelector(".video-start");
    if (!knopf) return;
    knopf.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(r.getAttribute("data-yt")) + "?autoplay=1&rel=0";
      f.title = r.getAttribute("data-titel") || "Video";
      f.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      f.referrerPolicy = "strict-origin-when-cross-origin";
      r.innerHTML = "";
      r.appendChild(f);
    });
  });

  // ---------- Quiz ----------
  $$(".quiz").forEach(function (quiz) {
    var fragen = $$(".quizfrage", quiz);
    var stand = quiz.querySelector(".quiz-stand");
    function zaehlen() {
      var beantwortet = 0, richtig = 0;
      fragen.forEach(function (f) { if (f.dataset.antwort) { beantwortet++; if (f.dataset.antwort === "r") richtig++; } });
      if (!beantwortet) { stand.textContent = ""; return; }
      stand.textContent = richtig + " von " + fragen.length + " richtig" +
        (beantwortet === fragen.length ? (richtig === fragen.length ? ". Flawless." : ". Schau dir die Begründungen an und probier's morgen nochmal.") : ".");
    }
    fragen.forEach(function (f) {
      var r = +f.getAttribute("data-richtig");
      var fb = f.querySelector(".quiz-feedback");
      $$("input", f).forEach(function (inp) {
        inp.addEventListener("change", function () {
          var gewaehlt = +inp.value;
          $$("label", f).forEach(function (l, i) {
            l.classList.remove("ist-richtig", "ist-falsch");
            if (i === r) l.classList.add("ist-richtig");
            else if (i === gewaehlt) l.classList.add("ist-falsch");
          });
          fb.hidden = false;
          fb.innerHTML = (gewaehlt === r ? "<strong>Richtig.</strong> " : "<strong>Nicht ganz.</strong> ") + fb.getAttribute("data-begruendung");
          f.dataset.antwort = gewaehlt === r ? "r" : "f";
          zaehlen();
        });
      });
    });
  });

  // ---------- Coulomb-Regler (qualitativ: F ~ q / r²) ----------
  $$("[data-coulomb]").forEach(function (box) {
    var rIn = box.querySelector("[data-r]"), qIn = box.querySelector("[data-q]");
    var kl = box.querySelector("[data-kugel-l]"), kr = box.querySelector("[data-kugel-r]");
    var tl = box.querySelector("[data-t-l]"), tr = box.querySelector("[data-t-r]");
    var pl = box.querySelector("[data-pfeil-l]"), pr = box.querySelector("[data-pfeil-r]");
    var erg = box.querySelector("[data-ergebnis]");
    var START = 1 / 4; // Abstand 2, Ladung 1
    function zeichne() {
      var r = +rIn.value, q = +qIn.value;
      var mitte = 200, halb = 30 + r * 30;
      var xl = mitte - halb, xr = mitte + halb;
      kl.setAttribute("cx", xl); tl.setAttribute("x", xl);
      kr.setAttribute("cx", xr); tr.setAttribute("x", xr);
      kl.setAttribute("r", 16 + q * 4);
      var f = q / (r * r), faktor = f / START;
      var laenge = Math.min(8 + faktor * 14, halb - 30);
      pl.setAttribute("x1", xl + 24); pl.setAttribute("x2", xl + 24 + laenge);
      pr.setAttribute("x1", xr - 24); pr.setAttribute("x2", xr - 24 - laenge);
      box.querySelector("[data-r-out]").textContent = r + (r === 1 ? " Kästchen" : " Kästchen");
      box.querySelector("[data-q-out]").textContent = q + "-fach";
      var txt = faktor === 1 ? "Kraft wie am Anfang." :
        faktor > 1 ? "Kraft " + (Math.round(faktor * 100) / 100).toString().replace(".", ",") + "-mal so stark wie am Anfang." :
        "Kraft nur noch " + (Math.round(faktor * 100) / 100).toString().replace(".", ",") + " so stark wie am Anfang.";
      erg.textContent = txt;
    }
    rIn.addEventListener("input", zeichne); qIn.addEventListener("input", zeichne);
    zeichne();
  });

  // ---------- Glossar-Suche ----------
  var suche = document.querySelector("[data-glossar-suche]");
  if (suche) suche.addEventListener("input", function () {
    var t = suche.value.trim().toLowerCase();
    $$(".glossar-eintrag").forEach(function (e) { e.hidden = t && e.getAttribute("data-such").indexOf(t) < 0; });
  });

  // ---------- Lernkarten (Leitner, 5 Fächer) ----------
  var box = document.querySelector("[data-karten]");
  var datenEl = document.getElementById("karten-daten");
  if (box && datenEl) {
    var alle = JSON.parse(datenEl.textContent);
    var fach = speicher.lies("leitner", {});
    var fSeq = box.querySelector("[data-f-seq]"), fTyp = box.querySelector("[data-f-typ]");
    var karte = box.querySelector("[data-karte]");
    var aktuell = null, zuletzt = null;
    var q = new URLSearchParams(location.search);
    if (q.get("seq")) fSeq.value = q.get("seq");

    function auswahl() {
      return alle.filter(function (k) { return (!fSeq.value || k.seq === fSeq.value) && (!fTyp.value || k.typ === fTyp.value); });
    }
    function fachVon(k) { return fach[k.id] || 1; }
    function faecherZeigen(liste) {
      var z = [0, 0, 0, 0, 0];
      liste.forEach(function (k) { z[fachVon(k) - 1]++; });
      box.querySelector("[data-faecher]").textContent = "Fach 1: " + z[0] + " · Fach 2: " + z[1] + " · Fach 3: " + z[2] + " · Fach 4: " + z[3] + " · Fach 5: " + z[4] + (z[4] === liste.length && liste.length ? " · Alles in Fach 5, stark!" : "");
    }
    function naechste() {
      var liste = auswahl();
      faecherZeigen(liste);
      if (!liste.length) { aktuell = null; box.querySelector("[data-k-vorne]").textContent = "Keine Karten in dieser Auswahl."; return; }
      // Gewichtung: Fach 1 fünfmal so oft wie Fach 5
      var topf = [];
      liste.forEach(function (k) { if (liste.length > 1 && zuletzt && k.id === zuletzt) return; for (var i = 0; i < 6 - fachVon(k); i++) topf.push(k); });
      if (!topf.length) topf = liste;
      aktuell = topf[Math.floor(Math.random() * topf.length)];
      zuletzt = aktuell.id;
      karte.classList.remove("umgedreht");
      box.querySelector("[data-k-typ]").textContent = aktuell.typ === "Warum" ? "Warum-Frage · Fach " + fachVon(aktuell) : "Begriff · Fach " + fachVon(aktuell);
      box.querySelector("[data-k-vorne]").textContent = aktuell.vorne;
      box.querySelector("[data-k-hinten]").textContent = aktuell.hinten;
      box.querySelector("[data-k-extra]").textContent = aktuell.extra ? "Beispiel: " + aktuell.extra : "";
      box.querySelector("[data-k-herkunft]").textContent = aktuell.seqTitel + ", Lernschritt " + aktuell.schritt;
    }
    function umdrehen() { if (aktuell) karte.classList.toggle("umgedreht"); }
    karte.addEventListener("click", umdrehen);
    karte.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); umdrehen(); } });
    box.querySelector("[data-gewusst]").addEventListener("click", function () {
      if (!aktuell) return; fach[aktuell.id] = Math.min(5, fachVon(aktuell) + 1); speicher.schreib("leitner", fach); naechste();
    });
    box.querySelector("[data-nochmal]").addEventListener("click", function () {
      if (!aktuell) return; fach[aktuell.id] = 1; speicher.schreib("leitner", fach); naechste();
    });
    box.querySelector("[data-reset]").addEventListener("click", function () {
      auswahl().forEach(function (k) { delete fach[k.id]; }); speicher.schreib("leitner", fach); naechste();
    });
    fSeq.addEventListener("change", naechste); fTyp.addEventListener("change", naechste);
    naechste();
  }
})();
