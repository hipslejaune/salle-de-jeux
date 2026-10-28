/* Fichier commun aux jeux : accès réservé, enfant qui joue, bandeau « Bienvenue », progression et historique en base.
   Utilisation dans un jeu :
     <script src="https://hipslejaune.github.io/salle-de-jeux/salle-jeu.js"></script>
     SalleJeu.demarrer('nom-du-jeu', function (etat) { ...le jeu démarre ici ; etat = progression enregistrée ou null... });
     SalleJeu.sauver(etat);                      // enregistre la progression (regroupé, réessayé si hors connexion)
     SalleJeu.partie({ score: 10, details: {} }); // ajoute une partie terminée à l'historique */
(function () {
  var BASE = window.SALLE_BASE || 'https://hipslejaune.github.io/salle-de-jeux/';
  var racine = document.documentElement;
  racine.style.visibility = 'hidden';        // rien ne s'affiche tant que l'accès n'est pas vérifié

  var jeu = null, client = null, enfant = null;
  var progAttente = null, progMinuterie = null, retour = null, parties = [], envoiEnCours = false;

  function charger(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { ko(new Error(src)); };
      document.head.appendChild(s);
    });
  }
  function el(tag, attrs, texte) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (texte) n.textContent = texte;
    return n;
  }
  function versSalle() { location.replace(BASE); }

  var CSS =
    "@font-face{font-family:'DM Sans';font-weight:500;font-display:swap;src:url(" + BASE + "fonts/dm-sans-latin-500-normal.woff2) format('woff2')}" +
    "@font-face{font-family:'DM Sans';font-weight:700;font-display:swap;src:url(" + BASE + "fonts/dm-sans-latin-700-normal.woff2) format('woff2')}" +
    ".sj-barre{position:relative;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;" +
    "padding:calc(8px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) 8px max(12px,env(safe-area-inset-left,0px));" +
    "background:linear-gradient(180deg,#0E1240,#0A0D2E);border-bottom:1px solid rgba(255,255,255,.09);" +
    "font:500 14px/1.2 'DM Sans',system-ui,sans-serif;color:#F2F4FF;box-shadow:0 4px 24px rgba(10,13,46,.45)}" +
    ".sj-barre a{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 16px;border-radius:999px;color:#fff;text-decoration:none;font-weight:700;" +
    "background:linear-gradient(135deg,#FF8A4C,#FF3D8B);box-shadow:0 4px 16px rgba(255,61,139,.35)}" +
    ".sj-barre a:focus-visible{outline:3px solid #4FD1FF;outline-offset:3px}" +
    ".sj-etat{color:#B6BDE6;font-size:12.5px}.sj-etat.sj-alerte{color:#FF9CB8}" +
    ".sj-bienvenue{margin:6px 0 2px;font:700 1.05rem/1.3 'DM Sans',system-ui,sans-serif}.sj-bienvenue b{color:#FF3D8B}" +
    ".sj-msg{max-width:440px;margin:18vh auto 0;padding:22px;text-align:center;border-radius:20px;color:#F2F4FF;" +
    "background:#141A4A;border:1px solid rgba(255,255,255,.12);font:500 16px/1.4 'DM Sans',system-ui,sans-serif}" +
    ".sj-msg button,.sj-msg a{display:inline-block;margin-top:14px;height:42px;line-height:42px;padding:0 20px;border:0;border-radius:999px;cursor:pointer;" +
    "color:#fff;text-decoration:none;font:700 15px/42px 'DM Sans',system-ui,sans-serif;background:linear-gradient(135deg,#FF8A4C,#FF3D8B)}";

  function ajouterStyle() { document.head.appendChild(el('style', {}, CSS)); }

  function ecranMessage(texte, bouton, action, lien) {
    ajouterStyle();
    document.body.textContent = '';
    document.body.style.background = '#0A0D2E';
    var c = el('div', { 'class': 'sj-msg', role: 'alert' });
    c.appendChild(el('div', {}, texte));
    if (bouton) { var b = el('button', { type: 'button' }, bouton); b.onclick = action; c.appendChild(b); }
    if (lien) { c.appendChild(document.createElement('br')); c.appendChild(el('a', { href: BASE }, lien)); }
    document.body.appendChild(c);
    racine.style.visibility = 'visible';
  }

  var etatBarre = null;
  function afficherEtat(texte, alerte) {
    if (!etatBarre) return;
    etatBarre.textContent = texte || '';
    etatBarre.className = 'sj-etat' + (alerte ? ' sj-alerte' : '');
  }

  function poserBandeau() {
    ajouterStyle();
    var barre = el('div', { 'class': 'sj-barre' });
    var lien = el('a', { href: BASE }, '← Salle de jeux');
    etatBarre = el('span', { 'class': 'sj-etat', 'aria-live': 'polite' });
    barre.appendChild(lien); barre.appendChild(etatBarre);
    document.body.insertBefore(barre, document.body.firstChild);
    var titre = document.querySelector('h1');
    var p = el('p', { 'class': 'sj-bienvenue' });
    p.appendChild(document.createTextNode('Bienvenue '));
    p.appendChild(el('b', {}, enfant.prenom));
    if (titre && titre.parentNode) {
      var parent = titre.parentNode, mode = getComputedStyle(parent).display;
      if (/flex|grid/.test(mode)) {          // le titre est dans une rangée : on le groupe avec la mention pour qu'elle reste dessous
        var groupe = el('div', { 'class': 'sj-titre' });
        parent.insertBefore(groupe, titre); groupe.appendChild(titre); groupe.appendChild(p);
      } else { parent.insertBefore(p, titre.nextSibling); }
    }
    else barre.insertAdjacentElement('afterend', p);
  }

  /* ---- Enregistrement : regroupé, et réessayé tant que la base ne répond pas ---- */
  async function viderProgression() {
    if (!progAttente || !client || !enfant) return;
    var etat = progAttente; progAttente = null;
    var ok = false;
    try {
      var r = await client.from('progression').upsert(
        { enfant_id: enfant.id, jeu: jeu, etat: etat, updated_at: new Date().toISOString() },
        { onConflict: 'enfant_id,jeu' });
      ok = !r.error;
    } catch (e) { ok = false; }
    if (!ok) { if (!progAttente) progAttente = etat; planifierRetour(); }
    else if (!parties.length && !progAttente) afficherEtat('Enregistré', false);
  }
  async function viderParties() {
    if (envoiEnCours || !parties.length || !client || !enfant) return;
    envoiEnCours = true;
    try {
      while (parties.length) {
        var p = parties[0];
        var r = await client.from('parties').insert({ enfant_id: enfant.id, jeu: jeu, score: p.score, details: p.details || {} });
        if (r.error) throw r.error;
        parties.shift();
      }
      if (!progAttente) afficherEtat('Enregistré', false);
    } catch (e) { planifierRetour(); }
    envoiEnCours = false;
  }
  function planifierRetour() {
    afficherEtat('Hors connexion : sera enregistré dès que possible', true);
    if (retour) return;
    retour = setTimeout(function () { retour = null; viderProgression(); viderParties(); }, 15000);
  }
  function tout() { clearTimeout(progMinuterie); return Promise.all([viderProgression(), viderParties()]); }

  function sauver(etat) {
    try { progAttente = JSON.parse(JSON.stringify(etat)); } catch (e) { return; }
    clearTimeout(progMinuterie);
    progMinuterie = setTimeout(viderProgression, 800);
  }
  function partie(p) {
    parties.push({ score: Math.round(Number(p && p.score) || 0), details: (p && p.details) || {} });
    viderParties();
  }

  /* ---- Démarrage ---- */
  async function demarrer(nomJeu, quandPret) {
    jeu = nomJeu;
    try {
      await charger(BASE + 'vendor/supabase.js');
      await charger(BASE + 'salle.js');
    } catch (e) {
      return ecranMessage('Impossible de joindre la salle de jeux. Vérifie ta connexion internet.', 'Réessayer', function () { location.reload(); }, 'Retour à la salle de jeux');
    }
    client = window.Salle.client;

    var s;
    try { s = (await client.auth.getSession()).data.session; } catch (e) { s = null; }
    var choisi = window.Salle.enfantCourant();
    if (!s || !choisi || !choisi.id) return versSalle();

    async function verifier() {
      var r = await client.from('enfants').select('id,prenom,niveau').eq('id', choisi.id).maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) { window.Salle.choisirEnfant(null); versSalle(); return null; }
      enfant = r.data;
      var p = await client.from('progression').select('etat').eq('enfant_id', enfant.id).eq('jeu', jeu).maybeSingle();
      if (p.error) throw p.error;
      return p.data ? p.data.etat : null;
    }
    var etat;
    try {
      etat = await verifier();
      if (!enfant) return;
    } catch (e) {
      // On ne lance pas le jeu sans avoir lu la progression : on risquerait d'écraser celle de l'enfant.
      return ecranMessage('La salle de jeux ne répond pas pour le moment. Ta progression n\'est pas perdue.', 'Réessayer', function () { location.reload(); }, 'Retour à la salle de jeux');
    }

    client.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') setTimeout(versSalle, 0); });
    window.Salle.choisirEnfant(enfant);   // garde le prénom/niveau à jour
    poserBandeau();
    document.addEventListener('visibilitychange', function () { if (document.hidden) tout(); });
    window.addEventListener('pagehide', tout);
    racine.style.visibility = 'visible';
    quandPret(etat || null, { id: enfant.id, prenom: enfant.prenom, niveau: enfant.niveau || null });
  }

  window.SalleJeu = { demarrer: demarrer, sauver: sauver, partie: partie };
})();
