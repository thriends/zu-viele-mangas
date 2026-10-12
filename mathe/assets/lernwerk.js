// lernwerk: Interaktion. Speicher nur im Browser, jede Seite funktioniert auch ohne.
// Alle Schlüssel unter dem Präfix "lernwerk:"; Einträge darin tragen "klasse-<n>/<fach>/<sequenz>".
(function () {
  "use strict";

  var speicher = {
    lies: function (k, standard) {
      try { var v = window.localStorage.getItem("lernwerk:" + k); return v === null ? standard : JSON.parse(v); }
      catch (e) { return standard; }
    },
    schreib: function (k, v) {
      try { window.localStorage.setItem("lernwerk:" + k, JSON.stringify(v)); } catch (e) { /* ohne Speicher weiter */ }
    }
  };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var params = new URLSearchParams(location.search);
  document.documentElement.classList.add("js");

  // ---------- Wiederholungsquiz: Fragen bei jedem Laden neu mischen ----------
  $$("[data-mischen]").forEach(function (quiz) {
    var fragen = $$(".quizfrage", quiz);
    for (var i = fragen.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = fragen[i]; fragen[i] = fragen[j]; fragen[j] = t;
    }
    var stand = quiz.querySelector(".quiz-stand");
    // data-max: je Durchgang nur so viele Fragen (Fachrückblick gemischt); der Rest fällt bis zum nächsten Laden weg
    var max = +quiz.getAttribute("data-max") || 0;
    if (max && fragen.length > max) { fragen.slice(max).forEach(function (f) { f.remove(); }); fragen = fragen.slice(0, max); }
    fragen.forEach(function (f, n) {
      quiz.insertBefore(f, stand);
      var lg = f.querySelector("legend");
      if (lg) lg.innerHTML = lg.innerHTML.replace(/^\d+\./, (n + 1) + ".");
    });
  });

  // ---------- Ich-kann-Häkchen und Fortschritt ----------
  var ichkann = speicher.lies("ichkann", {});
  function fortschrittZeigen() {
    $$("[data-fortschritt]").forEach(function (el) {
      var seq = el.getAttribute("data-fortschritt");
      var gesamt = +el.getAttribute("data-gesamt");
      // seq ist eine Sequenz ("klasse-7/fach/seq") oder ein Fach ("klasse-7/fach")
      var n = Object.keys(ichkann).filter(function (k) { return ichkann[k] && (k.indexOf(seq + ":") === 0 || k.indexOf(seq + "/") === 0); }).length;
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

  // Häkchen in Schrittliste und Übersicht
  function hakenZeigen() {
    $$("[data-haken]").forEach(function (h) { h.classList.toggle("ist-fertig", !!ichkann[h.getAttribute("data-haken")]); });
    // "Weiter lernen": erster Schritt, der noch nicht abgehakt ist
    $$("[data-weiter-lernen]").forEach(function (a) {
      var seq = a.getAttribute("data-weiter-lernen");
      var offen = $$(".schritt-karte").map(function (k) { return k; }).filter(function (k) {
        var h = k.querySelector("[data-haken]"); return h && !ichkann[h.getAttribute("data-haken")];
      })[0];
      var alleFertig = !offen && $$(".schritt-karte").length;
      if (offen) {
        var fertige = $$(".schritt-karte [data-haken]").filter(function (h) { return ichkann[h.getAttribute("data-haken")]; }).length;
        a.href = offen.getAttribute("href");
        a.textContent = (fertige ? "Weiter mit Schritt " : "Los geht's mit Schritt ") + offen.querySelector(".nr").textContent;
      } else if (alleFertig) { a.href = "#selbstcheck"; a.textContent = "Alles abgehakt: ab zum Boss-Fight"; }
    });
  }
  hakenZeigen();
  $$("[data-ichkann]").forEach(function (box) { box.addEventListener("change", hakenZeigen); });

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
      var sicher = 0, sicherRichtig = 0;
      fragen.forEach(function (f) { if (f.dataset.antwort && f.dataset.gewaehltSicher === "s") { sicher++; if (f.dataset.antwort === "r") sicherRichtig++; } });
      stand.textContent = richtig + " von " + fragen.length + " richtig" +
        (beantwortet === fragen.length ? (richtig === fragen.length ? ". Flawless." : ". Schau dir die Begründungen an und probier's morgen nochmal.") : ".") +
        (sicher ? " Du warst bei " + sicher + (sicher === 1 ? " Frage" : " Fragen") + " sicher, " + sicherRichtig + " davon richtig." : "");
    }
    fragen.forEach(function (f) {
      // Vor dem Antworten: sicher oder unsicher (optional, nichts vorausgewählt). Mit der ersten Antwort festgelegt.
      var sKnoepfe = $$("[data-sicher]", f);
      sKnoepfe.forEach(function (k) {
        k.addEventListener("click", function () {
          if (f.dataset.antwort) return;
          var an = k.getAttribute("aria-pressed") !== "true";
          sKnoepfe.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          k.setAttribute("aria-pressed", an ? "true" : "false");
          f.dataset.sicher = an ? k.getAttribute("data-sicher") : "";
        });
      });
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
          if (!f.dataset.antwort) { f.dataset.gewaehltSicher = f.dataset.sicher || ""; sKnoepfe.forEach(function (x) { x.disabled = true; }); }
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

  // ---------- Schrittliste als Blatt (Handy/Tablet) ----------
  var auf = document.querySelector("[data-schrittliste-auf]");
  if (auf) {
    var hintergrund = null;
    var zu = function () {
      document.body.classList.remove("liste-offen");
      auf.setAttribute("aria-expanded", "false");
      if (hintergrund) { hintergrund.remove(); hintergrund = null; }
      auf.focus();
    };
    auf.addEventListener("click", function () {
      document.body.classList.add("liste-offen");
      auf.setAttribute("aria-expanded", "true");
      hintergrund = document.createElement("div");
      hintergrund.className = "blatt-hintergrund";
      hintergrund.addEventListener("click", zu);
      document.body.appendChild(hintergrund);
      var akt = document.querySelector('.schrittliste a[aria-current="page"]');
      if (akt) akt.focus();
    });
    $$("[data-schrittliste-zu]").forEach(function (b) { b.addEventListener("click", zu); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("liste-offen")) zu(); });
  }

  // ---------- Sprungleiste folgt beim Scrollen ----------
  var chips = $$(".abschnitt-nav .chip");
  if (chips.length && "IntersectionObserver" in window) {
    var leiste = document.querySelector(".abschnitt-scroll");
    var markiere = function (id) {
      chips.forEach(function (c) {
        var an = c.getAttribute("href") === "#" + id;
        if (an) { c.setAttribute("aria-current", "true"); leiste.scrollLeft = c.offsetLeft - (leiste.clientWidth - c.offsetWidth) / 2; }
        else c.removeAttribute("aria-current");
      });
    };
    var sichtbar = {};
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { sichtbar[e.target.id] = e.isIntersecting; });
      var erster = $$(".abschnitt").filter(function (s) { return sichtbar[s.id]; })[0];
      if (erster) markiere(erster.id);
    }, { rootMargin: "-120px 0px -55% 0px" });
    $$(".abschnitt").forEach(function (s) { io.observe(s); });
  }

  // ---------- Glossar: Suche und Fach-Filter ----------
  var suche = document.querySelector("[data-glossar-suche]");
  var gFach = document.querySelector("[data-glossar-fach]");
  function glossarFiltern() {
    var t = suche ? suche.value.trim().toLowerCase() : "";
    var f = gFach ? gFach.value : "";
    $$(".glossar-eintrag").forEach(function (e) {
      e.hidden = (t && e.getAttribute("data-such").indexOf(t) < 0) || (f && e.getAttribute("data-fach") !== f);
    });
  }
  if (gFach && params.get("fach")) gFach.value = params.get("fach");
  if (suche) suche.addEventListener("input", glossarFiltern);
  if (gFach) { gFach.addEventListener("change", glossarFiltern); glossarFiltern(); }

  // ---------- Lernkarten (Leitner, 5 Fächer, mit Relearning in der Runde) ----------
  // Eine Runde enthält jede Karte der Auswahl einmal, Fach 1 zuerst. "Nochmal" legt die Karte in derselben
  // Runde nach drei anderen Karten wieder hinein (oder ans Ende), bis sie einmal gewusst ist.
  $$("[data-karten]").forEach(function (box) {
    var datenEl = document.getElementById("karten-daten");
    if (!datenEl) return;
    var alle = JSON.parse(datenEl.textContent);
    var fach = speicher.lies("leitner", {});
    var leer = { value: "" };
    var fKlasse = box.querySelector("[data-f-klasse]") || leer, fFach = box.querySelector("[data-f-fach]") || leer;
    var fSeq = box.querySelector("[data-f-seq]") || leer, fTyp = box.querySelector("[data-f-typ]") || leer;
    var karte = box.querySelector("[data-karte]");
    var rundeEl = box.querySelector("[data-runde]");
    var aktuell = null, runde = [], rundeFertig = false;
    if (fSeq !== leer && params.get("seq")) fSeq.value = params.get("seq");
    if (fFach !== leer && params.get("fach")) fFach.value = params.get("fach");
    if (fKlasse !== leer && params.get("klasse")) fKlasse.value = params.get("klasse");
    if (fTyp !== leer && params.get("typ")) fTyp.value = params.get("typ");

    function auswahl() {
      return alle.filter(function (k) {
        return (!fKlasse.value || k.klasse === fKlasse.value) && (!fFach.value || k.fach === fFach.value) &&
          (!fSeq.value || k.seq === fSeq.value) && (!fTyp.value || k.typ === fTyp.value);
      });
    }
    function fachVon(k) { return fach[k.id] || 1; }
    function faecherZeigen(liste) {
      var z = [0, 0, 0, 0, 0];
      liste.forEach(function (k) { z[fachVon(k) - 1]++; });
      box.querySelector("[data-faecher]").textContent = "Fach 1: " + z[0] + " · Fach 2: " + z[1] + " · Fach 3: " + z[2] + " · Fach 4: " + z[3] + " · Fach 5: " + z[4] + (z[4] === liste.length && liste.length ? " · Alles in Fach 5, stark!" : "");
    }
    function neueRunde(liste) {
      // niedriges Fach zuerst, innerhalb eines Fachs zufällig
      runde = liste.map(function (k) { return { id: k.id, r: fachVon(k) + Math.random() }; })
        .sort(function (a, b) { return a.r - b.r; }).map(function (x) { return x.id; });
    }
    function rundeZeigen() {
      if (!rundeEl) return;
      var n = runde.length + (aktuell ? 1 : 0);
      rundeEl.textContent = (rundeFertig ? "Runde geschafft, neue Runde gestartet. " : "") + "Noch " + n + (n === 1 ? " Karte" : " Karten") + " in dieser Runde.";
    }
    function naechste() {
      var liste = auswahl();
      faecherZeigen(liste);
      aktuell = null;
      if (!liste.length) { runde = []; box.querySelector("[data-k-vorne]").textContent = "Keine Karten in dieser Auswahl."; if (rundeEl) rundeEl.textContent = ""; return; }
      rundeFertig = false;
      while (!aktuell) {
        if (!runde.length) { neueRunde(liste); }
        var id = runde.shift();
        aktuell = liste.filter(function (k) { return k.id === id; })[0] || null;
      }
      karte.classList.remove("umgedreht");
      box.querySelector("[data-k-typ]").textContent = ({ Warum: "Warum-Frage", Vokabel: "Vokabel" }[aktuell.typ] || "Begriff") + " · Fach " + fachVon(aktuell);
      box.querySelector("[data-k-vorne]").textContent = aktuell.vorne;
      box.querySelector("[data-k-hinten]").textContent = aktuell.hinten;
      box.querySelector("[data-k-extra]").textContent = aktuell.extra ? (aktuell.extraLabel || "Beispiel: ") + aktuell.extra : "";
      box.querySelector("[data-k-herkunft]").textContent = aktuell.fachName + ", " + aktuell.seqTitel + ", Lernschritt " + aktuell.schritt;
      rundeZeigen();
    }
    function weiter(nachRunde) {
      var war = runde.length;
      naechste();
      if (nachRunde && !war && aktuell) { rundeFertig = true; rundeZeigen(); rundeFertig = false; }
    }
    function umdrehen() { if (aktuell) karte.classList.toggle("umgedreht"); }
    karte.addEventListener("click", umdrehen);
    karte.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); umdrehen(); } });
    box.querySelector("[data-gewusst]").addEventListener("click", function () {
      if (!aktuell) return; fach[aktuell.id] = Math.min(5, fachVon(aktuell) + 1); speicher.schreib("leitner", fach); weiter(true);
    });
    box.querySelector("[data-nochmal]").addEventListener("click", function () {
      if (!aktuell) return;
      fach[aktuell.id] = 1; speicher.schreib("leitner", fach);
      runde.splice(Math.min(3, runde.length), 0, aktuell.id);
      weiter(false);
    });
    box.querySelector("[data-reset]").addEventListener("click", function () {
      auswahl().forEach(function (k) { delete fach[k.id]; }); speicher.schreib("leitner", fach); runde = []; naechste();
    });
    [fKlasse, fFach, fSeq, fTyp].forEach(function (s) { if (s !== leer) s.addEventListener("change", function () { runde = []; naechste(); }); });
    document.addEventListener("keydown", function (e) {
      if (box.offsetParent === null) return; // Karten gerade nicht sichtbar (anderer Reiter)
      if (e.target && /INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY/.test(e.target.tagName) && e.target !== karte) return;
      if (e.key === "ArrowRight") { e.preventDefault(); box.querySelector("[data-gewusst]").click(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); box.querySelector("[data-nochmal]").click(); }
      else if (e.key === " " && e.target === document.body) { e.preventDefault(); umdrehen(); }
    });
    var startX = null, startY = null;
    karte.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
    karte.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX, dy = e.changedTouches[0].clientY - startY;
      startX = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && karte.classList.contains("umgedreht")) {
        box.querySelector(dx > 0 ? "[data-gewusst]" : "[data-nochmal]").click();
      }
    });
    naechste();
  });

  // ---------- Zahleneingabe mit Rückmeldung zu typischen Fehlwerten ----------
  function alsZahl(s) {
    var t = String(s).trim().replace(/\s+/g, "").replace(",", ".");
    return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(t) ? parseFloat(t) : NaN;
  }
  // Gleichwertige Schreibweisen einer Einheit: "Minuten" zählt wie "min", "Prozent" wie "%", "Euro" wie "€"
  var EINHEIT_GLEICH = { minute: "min", minuten: "min", "min.": "min", stunde: "h", stunden: "h", std: "h", "std.": "h", sekunde: "s", sekunden: "s", sek: "s", "sek.": "s", tag: "d", tage: "d", prozent: "%", euro: "€", eur: "€", cent: "ct", meter: "m", kilometer: "km", zentimeter: "cm", millimeter: "mm", gramm: "g", kilogramm: "kg", kilo: "kg", tonne: "t", tonnen: "t", liter: "l", milliliter: "ml", quadratmeter: "m2", qm: "m2", kubikmeter: "m3" };
  function alsEinheit(s) { var e = String(s).toLowerCase().replace(/\s+/g, "").replace(/²/g, "2").replace(/³/g, "3").replace(/\^/g, ""); return EINHEIT_GLEICH[e] || e; }
  $$("[data-eingabe]").forEach(function (box) {
    var key = "eingabe:" + box.getAttribute("data-eingabe");
    var antwort = +box.getAttribute("data-antwort"), tol = +box.getAttribute("data-toleranz") || 0;
    var einheit = box.getAttribute("data-einheit");
    var fehlwerte = [];
    try { fehlwerte = JSON.parse(box.getAttribute("data-fehlwerte") || "[]"); } catch (e) { fehlwerte = []; }
    var wIn = box.querySelector("[data-wert]"), eIn = box.querySelector("[data-einh]");
    var rueck = box.querySelector("[data-rueck]"), weg = box.querySelector("[data-weg]");
    function nah(w, x) { return Math.abs(w - x) <= tol + 1e-9; }
    function pruefen(speichern) {
      box.classList.remove("ist-richtig", "ist-falsch");
      var w = alsZahl(wIn.value);
      if (isNaN(w)) { rueck.textContent = wIn.value.trim() ? "Das ist keine Zahl. Schreib zum Beispiel 3,5." : ""; return; }
      var ok = false, text;
      if (nah(w, antwort)) {
        if (einheit && alsEinheit(eIn ? eIn.value : "") !== alsEinheit(einheit)) text = "Die Zahl stimmt, aber die Einheit nicht. Welche Einheit hat das Ergebnis?";
        else { ok = true; text = "Richtig!"; }
      } else {
        var treffer = fehlwerte.filter(function (f) { return nah(w, f.w); })[0];
        text = treffer ? treffer.h : "Noch nicht, prüf deinen Rechenweg.";
      }
      rueck.textContent = text;
      box.classList.add(ok ? "ist-richtig" : "ist-falsch");
      if (weg && !ok) weg.classList.add("ist-angeboten");
      if (speichern) speicher.schreib(key, { w: wIn.value, e: eIn ? eIn.value : "", ok: ok });
    }
    box.querySelector("[data-pruefen]").addEventListener("click", function () { pruefen(true); });
    [wIn, eIn].forEach(function (inp) {
      if (inp) inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); pruefen(true); } });
    });
    var alt = speicher.lies(key, null);
    if (alt && alt.w) { wIn.value = alt.w; if (eIn) eIn.value = alt.e || ""; pruefen(false); }
  });

  // ---------- Reiter (Arbeit-Seite): ohne JavaScript stehen beide Teile untereinander ----------
  $$("[data-reiter]").forEach(function (leiste) {
    var knoepfe = $$("a", leiste);
    var teile = knoepfe.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    function zeige(i) {
      knoepfe.forEach(function (a, j) {
        a.setAttribute("aria-selected", i === j ? "true" : "false");
        if (teile[j]) teile[j].hidden = i !== j;
      });
    }
    knoepfe.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        e.preventDefault(); zeige(i);
        try { history.replaceState(null, "", a.getAttribute("href")); } catch (x) { /* egal */ }
      });
    });
    var start = knoepfe.map(function (a) { return a.getAttribute("href"); }).indexOf(location.hash);
    zeige(start < 0 ? 0 : start);
  });

  // ---------- Scroll-Spy der Seitenleiste (Arbeit-Seite) ----------
  var spyLinks = $$("[data-spy] a[href^='#']");
  var spyZiele = $$("[data-spy-ziel]");
  if (spyLinks.length && spyZiele.length && "IntersectionObserver" in window) {
    var spySichtbar = {};
    var spyMarkiere = function (id) {
      spyLinks.forEach(function (a) {
        var an = a.getAttribute("href") === "#" + id;
        if (an) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
      // Block des aktuellen Abschnitts zusätzlich hervorheben
      var block = id.split("-")[0];
      spyLinks.forEach(function (a) { a.classList.toggle("im-block", a.classList.contains("nav-block") && a.getAttribute("href") === "#" + block); });
    };
    var spy = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { spySichtbar[e.target.id] = e.isIntersecting; });
      var schritt = spyZiele.filter(function (z) { return spySichtbar[z.id] && z.classList.contains("arbeit-schritt"); })[0];
      var ziel = schritt || spyZiele.filter(function (z) { return spySichtbar[z.id]; })[0];
      if (ziel) spyMarkiere(ziel.id);
    }, { rootMargin: "-90px 0px -60% 0px" });
    spyZiele.forEach(function (z) { spy.observe(z); });
    // Mobil: nach Klick auf einen Eintrag das Inhaltsverzeichnis wieder einklappen
    $$(".arbeit-nav-mobil a").forEach(function (a) { a.addEventListener("click", function () { var d = a.closest("details"); if (d) d.open = false; }); });
  }

  // ---------- Merkkarten drucken ----------
  $$("[data-merkkarten-drucken]").forEach(function (k) {
    k.addEventListener("click", function () {
      document.body.classList.add("nur-merkkarten");
      var weg = function () { document.body.classList.remove("nur-merkkarten"); window.removeEventListener("afterprint", weg); };
      window.addEventListener("afterprint", weg);
      window.print();
    });
  });

  // ---------- Runde 2/3: weitere Aufgabentypen ----------
  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  // Neu mischen (Fachrückblick)
  $$("[data-neu-mischen]").forEach(function (k) { k.addEventListener("click", function () { location.reload(); }); });

  // Sprungziel in einem zugeklappten Bereich ("Tiefer und schwerer"): Bereich öffnen
  function zielOeffnen() {
    if (!location.hash || location.hash.length < 2) return;
    var el = null;
    try { el = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { el = null; }
    for (var d = el; d; d = d.parentElement) if (d.tagName === "DETAILS") d.open = true;
    if (el && el.tagName !== "DETAILS" && el.closest("details")) el.scrollIntoView();
  }
  zielOeffnen();
  window.addEventListener("hashchange", zielOeffnen);
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function () {
      var el = document.getElementById(a.getAttribute("href").slice(1));
      for (var d = el; d; d = d.parentElement) if (d.tagName === "DETAILS") d.open = true;
    });
  });

  // Vorhersage: erst wählen, dann Erklärung. Die erste Wahl zählt und bleibt gespeichert.
  $$("[data-vorhersage]").forEach(function (box) {
    var key = "vorhersage:" + box.getAttribute("data-vorhersage");
    var r = +box.getAttribute("data-richtig");
    var auf = $("[data-vh-aufloesung]", box), rueck = $("[data-vh-rueck]", box);
    var radios = $$("input[type=radio]", box);
    function zeige(w) {
      radios.forEach(function (x, i) {
        x.checked = i === w; x.disabled = true;
        var l = x.closest("label");
        l.classList.toggle("ist-richtig", i === r); l.classList.toggle("ist-falsch", i === w && w !== r);
      });
      rueck.textContent = w === r ? "Deine Vorhersage war richtig." : "Deine Vorhersage war falsch. Kein Problem: Gerade dann merkst du dir die Erklärung besser.";
      box.classList.add(w === r ? "vh-richtig" : "vh-falsch");
      auf.classList.add("frei"); auf.open = true;
    }
    radios.forEach(function (x) {
      x.addEventListener("change", function () { var w = +x.value; speicher.schreib(key, w); zeige(w); });
    });
    var alt = speicher.lies(key, null);
    if (alt !== null && radios[alt]) zeige(alt);
  });

  // Zuordnung: je Zeile richtig/falsch markieren
  $$("[data-zuordnung]").forEach(function (box) {
    var zeilen = $$("[data-z-zeile]", box), rueck = $("[data-z-rueck]", box);
    $("[data-z-pruefen]", box).addEventListener("click", function () {
      var ok = 0, leer = 0;
      zeilen.forEach(function (z) {
        var s = $("[data-z-wahl]", z), m = $("[data-z-mark]", z);
        z.classList.remove("ist-richtig", "ist-falsch");
        if (!s.value) { leer++; m.textContent = ""; return; }
        var gut = s.value === s.getAttribute("data-richtig");
        if (gut) ok++;
        z.classList.add(gut ? "ist-richtig" : "ist-falsch");
        m.textContent = gut ? "✓" : "✗";
      });
      rueck.textContent = ok + " von " + zeilen.length + " richtig" + (leer ? ", " + leer + " noch offen." : ok === zeilen.length ? ". Alles zugeordnet!" : ". Die falschen nochmal ändern und erneut prüfen.");
    });
    $$("[data-z-wahl]", box).forEach(function (s) { s.addEventListener("change", function () { s.closest("tr").classList.remove("ist-richtig", "ist-falsch"); $("[data-z-mark]", s.closest("tr")).textContent = ""; }); });
  });

  // Reihenfolge: im Browser neu mischen (nie schon richtig), Hoch/Runter, Prüfen
  $$("[data-reihenfolge]").forEach(function (box) {
    var liste = $("[data-rf-liste]", box), rueck = $("[data-rf-rueck]", box);
    var lis = $$("li", liste);
    if (lis.length > 1) {
      do {
        for (var i = lis.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = lis[i]; lis[i] = lis[j]; lis[j] = t; }
      } while (lis.every(function (li, k) { return +li.getAttribute("data-pos") === k; }));
      lis.forEach(function (li) { liste.appendChild(li); });
    }
    function zuruecksetzen() { rueck.textContent = ""; $$("li", liste).forEach(function (li) { li.classList.remove("ist-richtig", "ist-falsch"); }); }
    liste.addEventListener("click", function (e) {
      var k = e.target.closest("button"); if (!k) return;
      var li = k.closest("li");
      if (k.hasAttribute("data-hoch") && li.previousElementSibling) liste.insertBefore(li, li.previousElementSibling);
      else if (k.hasAttribute("data-runter") && li.nextElementSibling) liste.insertBefore(li.nextElementSibling, li);
      zuruecksetzen();
      k.focus();
    });
    $("[data-rf-pruefen]", box).addEventListener("click", function () {
      var akt = $$("li", liste), ok = 0;
      akt.forEach(function (li, k) {
        var gut = +li.getAttribute("data-pos") === k;
        if (gut) ok++;
        li.classList.toggle("ist-richtig", gut); li.classList.toggle("ist-falsch", !gut);
      });
      rueck.textContent = ok === akt.length ? "Alles in der richtigen Reihenfolge!" : ok + " von " + akt.length + " an der richtigen Stelle. Verschieb die roten und prüf nochmal.";
    });
  });

  // Offene Aufgabe und Übersetzung: Text und Checkliste nur im Browser speichern
  $$("[data-text-key]").forEach(function (box) {
    var key = box.getAttribute("data-text-key");
    var feld = $("[data-text]", box);
    if (feld) {
      feld.value = speicher.lies(key, "") || "";
      feld.addEventListener("input", function () { speicher.schreib(key, feld.value); });
    }
    var haken = speicher.lies(key + ":check", {});
    $$("[data-check]", box).forEach(function (c) {
      var i = c.getAttribute("data-check");
      c.checked = !!haken[i];
      c.addEventListener("change", function () { haken[i] = c.checked; speicher.schreib(key + ":check", haken); });
    });
  });

  // Satzanalyse: Schritt für Schritt aufdecken und einfärben
  $$("[data-satzanalyse]").forEach(function (box) {
    var n = +box.getAttribute("data-schritte");
    var weiter = $("[data-sa-weiter]", box), neu = $("[data-sa-neu]", box);
    var stand = -1;
    box.classList.add("sa-aktiv");
    function zeige() {
      $$("[data-sa-schritt]", box).forEach(function (li) { li.classList.toggle("offen", +li.getAttribute("data-sa-schritt") <= stand); li.classList.toggle("jetzt", +li.getAttribute("data-sa-schritt") === stand); });
      $$("[data-sa-ab]", box).forEach(function (el) { el.classList.toggle("offen", +el.getAttribute("data-sa-ab") <= stand); });
      weiter.disabled = stand >= n;
      weiter.textContent = stand < 0 ? "Los: erster Schritt" : stand >= n - 1 ? (stand >= n ? "Fertig" : "Übersetzung zeigen") : "Nächster Schritt";
    }
    weiter.addEventListener("click", function () { if (stand < n) stand++; zeige(); });
    neu.addEventListener("click", function () { stand = -1; zeige(); });
    zeige();
  });
})();
