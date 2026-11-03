/* Plume, le panda roux compagnon des jeux : toujours en bas à droite de l'écran, il parle avec SA voix (voix 05).
   Chargé automatiquement par salle-jeu.js. Aucune voix du navigateur : speechSynthesis est coupé dans toute la page.

   API (window.Plume) :
     Plume.dire(son, opts)    son = clé d'une réplique commune ('bravo-1'...), URL d'un mp3, ArrayBuffer ou AudioBuffer,
                              ou tableau de sons joués à la suite. Bouche, bras et queue bougent pendant qu'il parle.
                              opts.anim = 'bravo' | 'danse' | 'oui' | 'non' | 'montrer' | 'saut'  ; opts.cible = élément à montrer.
                              Renvoie une promesse résolue à la fin de la phrase.
     Plume.taire()            coupe la phrase en cours.
     Plume.reussite()         petite réaction de joie (réplique « bravo » + saut ou oui de la tête).
     Plume.erreur()           encouragement (réplique « encore » + non de la tête).
     Plume.fin()              fin de partie : « Bravo, tu as fini ! » + danse de la joie.
     Plume.saluer(jeu)        salut d'arrivée dans un jeu.
     Plume.montrer(el|{x,y})  montre du doigt un élément ou un point de l'écran.
     Plume.bravo() .danse() .saut() .oui() .non() .boule() .reveil() .chatouilles()  animations seules.
     Plume.prenom('Kaliana')  choisit les répliques avec prénom (Kaliana, Kaël) ou génériques.
     Plume.muet(true|false)   coupe / remet sa voix (les animations continuent).
     Plume.cacher(true|false) cache Plume (par ex. pendant une vidéo plein écran). */
(function () {
  if (window.Plume && window.Plume.version) return;
  var CAL = __CAL__;
  var VISAGE = __VISAGE__;
  var SCRIPT = document.currentScript;
  var BASE = (window.PLUME_BASE || (SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^\/]*$/, '') : 'https://hipslejaune.github.io/salle-de-jeux/plume/'));
  var VOIX = BASE + 'voix/';

  /* ---------- 1. Plus jamais de voix du navigateur ---------- */
  try {
    if (window.speechSynthesis) {
      var ss = window.speechSynthesis;
      ss.speak = function () {}; ss.getVoices = function () { return []; };
    }
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  } catch (e) {}

  /* ---------- 2. Montage ---------- */
  var OX = 40, W = 680, H = 850;
  var CSS =
    '#plumeCompagnon{position:fixed;right:max(6px,env(safe-area-inset-right,0px));bottom:max(4px,env(safe-area-inset-bottom,0px));' +
    'width:calc(var(--pc-h) * .8);height:var(--pc-h);z-index:2147483000;pointer-events:none;--pc-h:150px;transition:opacity .4s,transform .4s}' +
    '@media (max-width:700px),(max-height:560px){#plumeCompagnon{--pc-h:100px}}' +
    '#plumeCompagnon.pc-cache{opacity:0;transform:translateY(40%)}' +
    '#plumeCompagnon .pc-rig{position:absolute;left:0;top:0;width:680px;height:850px;transform-origin:0 0}' +
    '#plumeCompagnon .pc-rig img,#plumeCompagnon .pc-g{position:absolute}' +
    '#plumeCompagnon .pc-g{left:0;top:0;width:680px;height:850px}' +
    '#plumeCompagnon img{pointer-events:none;-webkit-user-drag:none;user-select:none;max-width:none}' +
    '#plumeCompagnon .pc-touche{position:absolute;left:110px;top:60px;width:520px;height:740px;border-radius:40%;cursor:pointer;pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
    '#plumeCompagnon .pc-ombre{position:absolute;left:110px;top:752px;width:460px;height:70px;border-radius:50%;background:radial-gradient(closest-side,rgba(10,15,5,.45),rgba(10,15,5,0))}' +
    '#plumeCompagnon .pc-oeil,#plumeCompagnon .pc-paup{position:absolute;overflow:hidden}' +
    '#plumeCompagnon .pc-paup img{filter:brightness(.8) saturate(1.05)}' +
    '#plumeCompagnon svg.pc-visage{position:absolute;left:0;top:0;width:680px;height:850px;overflow:visible;pointer-events:none}' +
    '#plumeCompagnon .pc-fx{position:absolute;left:0;top:0;width:680px;height:850px;pointer-events:none;overflow:visible}' +
    '#plumeCompagnon .pc-etoile{position:absolute;width:60px;height:60px;margin:-30px 0 0 -30px}' +
    '#plumeCompagnon .pc-zzz{position:absolute;font:700 80px/1 ui-rounded,system-ui,sans-serif;color:#fff;text-shadow:0 3px 8px rgba(0,0,0,.45)}' +
    '#plumeCompagnon .pc-note{position:absolute;font:700 90px/1 system-ui,sans-serif;color:#FFD447;text-shadow:0 3px 8px rgba(0,0,0,.4)}';
  var HTML =
    '<div class="pc-rig"><div class="pc-ombre"></div>' +
    '<div class="pc-g" data-p="plume">' +
      '<div class="pc-g" data-p="queue"></div>' +
      '<div class="pc-g" data-p="buste"></div><div class="pc-g" data-p="jambes"></div>' +
      '<div class="pc-g" data-p="brasG"></div><div class="pc-g" data-p="brasD"></div>' +
      '<div class="pc-g" data-p="tete"><div class="pc-g" data-p="oreG"></div><div class="pc-g" data-p="oreD"></div>' +
        '<div class="pc-g" data-p="teteImg"></div><div class="pc-g" data-p="sourcils"></div>' +
        '<div class="pc-oeil" data-p="oeilG"></div><div class="pc-oeil" data-p="oeilD"></div>' +
        '<div class="pc-paup" data-p="paupG"></div><div class="pc-paup" data-p="paupD"></div>' +
        '<div class="pc-g" data-p="cils"></div>' + VISAGE + '</div>' +
      '<div class="pc-g" data-p="queueDevant"></div>' +
    '</div><div class="pc-fx"></div></div>' +
    '<div class="pc-touche" role="button" tabindex="0" aria-label="Plume le panda roux"></div>';

  var root, rig, P = {}, A, paups = [], yeux = [];
  var M = CAL.meta, IMG = CAL.img, R = CAL.R;
  function monter() {
    if (root) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'plumeCompagnon'; root.innerHTML = HTML;
    document.body.appendChild(root);
    rig = root.querySelector('.pc-rig');
    root.querySelectorAll('[data-p]').forEach(function (n) { P[n.getAttribute('data-p')] = n; });
    function calque(par, nom) {
      var m = M[nom], im = new Image(); im.src = IMG[nom]; im.alt = '';
      im.style.left = (m.x + OX) + 'px'; im.style.top = m.y + 'px'; im.style.width = m.w + 'px'; im.style.height = m.h + 'px';
      par.appendChild(im); return im;
    }
    calque(P.queue, 'queue'); calque(P.queueDevant, 'queue'); calque(P.buste, 'corps'); calque(P.jambes, 'jambes');
    calque(P.brasG, 'brasG'); calque(P.brasD, 'brasD'); calque(P.oreG, 'oreilleG'); calque(P.oreD, 'oreilleD');
    calque(P.teteImg, 'tete'); calque(P.sourcils, 'sourcils'); calque(P.cils, 'cils');
    var BOX = R * 2.6;
    CAL.eyes.forEach(function (c, i) {
      var o = i ? P.oeilD : P.oeilG, p = i ? P.paupD : P.paupG;
      [o, p].forEach(function (el) {
        el.style.left = (c[0] + OX - BOX / 2) + 'px'; el.style.top = (c[1] - BOX / 2) + 'px'; el.style.width = BOX + 'px'; el.style.height = BOX + 'px';
        el.style.clipPath = el.style.webkitClipPath = 'ellipse(' + R + 'px ' + (R * 1.04) + 'px at 50% 50%)';
      });
      var im = new Image(); im.src = IMG.oeil; im.alt = ''; im.style.left = 0; im.style.top = 0; im.style.width = BOX + 'px'; im.style.height = BOX + 'px';
      o.appendChild(im); yeux.push(im);
      var pm = M[i ? 'paupiereD' : 'paupiereG'], pi = new Image(); pi.src = IMG[i ? 'paupiereD' : 'paupiereG']; pi.alt = '';
      pi.style.left = (BOX - pm.w) / 2 + 'px'; pi.style.top = (BOX - pm.h) / 2 + 'px'; pi.style.width = pm.w + 'px'; pi.style.height = pm.h + 'px';
      p.appendChild(pi); paups.push([pi, pm.h]);
    });
    function piv(el, x, y) { el.style.transformOrigin = (x + OX) + 'px ' + y + 'px'; }
    piv(P.plume, 300, 790); piv(P.buste, 300, 770); piv(P.queue, 470, 720); piv(P.queueDevant, 470, 720);
    piv(P.brasG, 192, 442); piv(P.brasD, 408, 442); piv(P.tete, 300, 425); piv(P.oreG, 160, 170); piv(P.oreD, 440, 170);
    P.queueDevant.style.opacity = 0;
    P.bouche = root.querySelector('.pc-boucheOuverte'); P.levres = root.querySelector('.pc-levres');
    P.heureux = root.querySelector('.pc-yeuxHeureux'); P.fermes = root.querySelector('.pc-yeuxFermes');
    P.fx = root.querySelector('.pc-fx'); P.ombre = root.querySelector('.pc-ombre');
    echelle(); addEventListener('resize', echelle);
    var t = root.querySelector('.pc-touche');
    t.addEventListener('pointerdown', function (e) { e.stopPropagation(); debloquer(); toucher(e); });
    t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); debloquer(); toucher(null); } });
    requestAnimationFrame(boucle);
  }
  function echelle() { var h = root.getBoundingClientRect().height || 150; rig.style.transform = 'translateX(' + (-(110) * h / H) + 'px) scale(' + (h / H) + ')'; }

  /* ---------- 3. Animation (valeurs interpolées) ---------- */
  A = { corpsY: 0, corpsX: 0, corpsRot: 0, corpsSX: 1, corpsSY: 1, teteRot: 0, teteX: 0, teteY: 0, teteSY: 1, brasG: 0, brasD: 0,
    oreG: 0, oreD: 0, queue: 0, queueVite: 0, sourcil: 0, paup: 0, bouche: 0, heureux: 0, regardX: null, regardY: null,
    souffle: 1, rythme: 1, coucou: 0, tortille: 0, boule: 0, danse: 0, nonTete: 0, gestes: 1 };
  var reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ease = { lin: function (t) { return t; }, out: function (t) { return 1 - Math.pow(1 - t, 3); }, inn: function (t) { return t * t * t; },
    io: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    back: function (t) { var c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
  var jetons = {};
  function tw(cle, vers, ms, f) {
    ms = ms || 400; f = f || ease.io;
    var de = A[cle] == null ? 0 : A[cle], t0 = performance.now(), j = jetons[cle] = (jetons[cle] || 0) + 1;
    return new Promise(function (res) {
      (function pas(now) {
        if (jetons[cle] !== j) return res();
        var k = Math.min(1, (now - t0) / ms); A[cle] = de + (vers - de) * f(k);
        k < 1 ? requestAnimationFrame(pas) : res();
      })(t0);
    });
  }
  function att(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function tous() { return Promise.all([].slice.call(arguments)); }

  var pointeur = { x: 0, y: 0 }, regard = { x: 0, y: 0 };
  addEventListener('pointermove', function (e) {
    if (!rig) return;
    var r = rig.getBoundingClientRect(), k = r.width / W, ex = r.left + (300 + OX) * k, ey = r.top + 266 * k;
    pointeur.x = Math.max(-1, Math.min(1, (e.clientX - ex) / (Math.max(200, innerWidth * .4))));
    pointeur.y = Math.max(-1, Math.min(1, (e.clientY - ey) / (Math.max(200, innerHeight * .4))));
  }, { passive: true });

  var cligne = 0, proCligne = 1500, ore = { g: 0, d: 0 }, proOreille = 4000, endormi = false, occupe = false;
  function clignement(double) {
    return new Promise(function (r) { var t0 = performance.now(); (function p(n) { var k = (n - t0) / 90; cligne = Math.min(1, k); k < 1 ? requestAnimationFrame(p) : r(); })(t0); })
      .then(function () { return att(40); })
      .then(function () { return new Promise(function (r) { var t0 = performance.now(); (function p(n) { var k = (n - t0) / 110; cligne = Math.max(0, 1 - k); k < 1 ? requestAnimationFrame(p) : r(); })(t0); }); })
      .then(function () { if (double) return att(120).then(function () { return clignement(false); }); });
  }

  var tPrec = performance.now(), niveau = 0, tampon = new Float32Array(1024);
  function boucle(now) {
    var t = now / 1000, dt = Math.min(.05, (now - tPrec) / 1000); tPrec = now;
    var cible = 0;
    if (analyseur && sources.length) { analyseur.getFloatTimeDomainData(tampon); var s = 0; for (var i = 0; i < tampon.length; i++) s += tampon[i] * tampon[i]; cible = Math.min(1, Math.sqrt(s / tampon.length) * 7.5); }
    niveau += (cible - niveau) * (cible > niveau ? .55 : .25);
    var parle = niveau, enParole = sources.length > 0 ? 1 : 0;
    var gx = A.regardX == null ? pointeur.x : A.regardX, gy = A.regardY == null ? pointeur.y : A.regardY;
    regard.x += (gx - regard.x) * Math.min(1, dt * 6); regard.y += (gy - regard.y) * Math.min(1, dt * 6);
    if (!endormi && !occupe && now > proCligne) { proCligne = now + 2200 + Math.random() * 3800; clignement(Math.random() < .2); }
    if (!endormi && now > proOreille) { proOreille = now + 3500 + Math.random() * 6000; if (Math.random() < .5) ore.g = 1; else ore.d = 1; }
    ore.g *= Math.pow(.02, dt); ore.d *= Math.pow(.02, dt);
    var amp = reduit ? .4 : 1, souffle = Math.sin(t * 2 * Math.PI * A.rythme / 3.4) * A.souffle, tort = A.tortille * amp;
    var b = A.boule, d = A.danse * amp;
    // danse : balancement gauche-droite + rebond
    var dRot = d * 9 * Math.sin(t * 7.2), dY = -d * 26 * Math.abs(Math.sin(t * 7.2)), dX = d * 18 * Math.sin(t * 3.6);
    // en boule : tout le corps s'écrase et descend, la tête se pose sur les pattes, la queue passe devant
    P.plume.style.transform = 'translate(' + (A.corpsX + dX) + 'px,' + (A.corpsY + dY + b * 60) + 'px) rotate(' + (A.corpsRot + dRot + Math.sin(t * 38) * 5 * tort) + 'deg) scale(' + (A.corpsSX * (1 + b * .08)) + ',' + (A.corpsSY * (1 - b * .2)) + ')';
    P.ombre.style.transform = 'scale(' + (1 + (A.corpsY + dY) / 400 + b * .1) + ')';
    P.buste.style.transform = 'scale(' + (1 + .006 * souffle * (1 + b)) + ',' + (1 + .014 * souffle * (1 + b)) + ')';
    // queue : fouette quand il parle, tourne autour de lui en boule
    var qBase = A.queue + 3.5 * Math.sin(t * 1.6) * amp + A.queueVite * 9 * Math.sin(t * 16) + enParole * (4 + parle * 8) * Math.sin(t * 5.5) * amp + d * 14 * Math.sin(t * 7.2 + 1);
    P.queue.style.transform = 'rotate(' + qBase + 'deg)';
    var qD = -96 * b + 2 * Math.sin(t * 1.1) * b;
    P.queueDevant.style.transform = 'translate(' + (-8 * b) + 'px,' + (-40 * b) + 'px) rotate(' + qD + 'deg) scale(' + (1 + .12 * b) + ')';
    P.queueDevant.style.opacity = b > .35 ? Math.min(1, (b - .35) / .3) : 0;
    P.queue.style.opacity = b > .35 ? Math.max(0, 1 - (b - .35) / .3) : 1;
    // bras : gestes pendant la parole, danse bras en l'air
    var gesteG = enParole * A.gestes * amp * (6 * Math.sin(t * 3.1) + parle * 14 * Math.sin(t * 6.3 + .5));
    var gesteD = enParole * A.gestes * amp * (-6 * Math.sin(t * 2.7 + 1) - parle * 14 * Math.sin(t * 5.7));
    P.brasG.style.transform = 'rotate(' + (A.brasG + gesteG + d * (60 + 25 * Math.sin(t * 7.2)) + b * 20) + 'deg)';
    P.brasD.style.transform = 'rotate(' + (A.brasD + gesteD - d * (60 - 25 * Math.sin(t * 7.2)) - b * 20 + A.coucou * 16 * Math.sin(t * 11)) + 'deg)';
    var hoch = parle * 2.2 * Math.sin(t * 9), non = A.nonTete * 14 * Math.sin(t * 13);
    P.tete.style.transform = 'translate(' + (A.teteX + regard.x * 5 * (1 - b) + non * .6 - b * 20) + 'px,' + (A.teteY - 2.4 * souffle + parle * 2 + b * 175) + 'px) rotate(' +
      (A.teteRot + regard.x * 3.5 * (1 - b) + hoch + non + Math.sin(t * 30) * 3 * tort + d * 6 * Math.sin(t * 7.2 + .8) - b * 14) + 'deg) scale(1,' + A.teteSY + ')';
    P.oreG.style.transform = 'rotate(' + (A.oreG - 14 * ore.g * Math.sin(t * 40) + b * 14) + 'deg)';
    P.oreD.style.transform = 'rotate(' + (A.oreD + 14 * ore.d * Math.sin(t * 40) - b * 14) + 'deg)';
    P.sourcils.style.transform = 'translateY(' + (-A.sourcil * 9 - parle * 4) + 'px)';
    for (var y = 0; y < yeux.length; y++) yeux[y].style.transform = 'translate(' + regard.x * 7 + 'px,' + regard.y * 5 + 'px)';
    var p = Math.max(cligne, A.paup, A.heureux, b);
    for (var q = 0; q < paups.length; q++) paups[q][0].style.transform = 'translateY(' + (-(1 - p) * paups[q][1] * 1.02) + 'px)';
    P.heureux.setAttribute('opacity', A.heureux.toFixed(2));
    P.fermes.setAttribute('opacity', (Math.max(0, (p - .85) / .15) * (1 - A.heureux)).toFixed(2));
    var ouv = Math.min(2.2, parle * 1.15 + A.bouche);
    P.bouche.setAttribute('transform', 'translate(300 376) scale(' + (1 + Math.max(0, ouv - 1) * .25).toFixed(3) + ' ' + ouv.toFixed(3) + ') translate(-300 -376)');
    P.levres.setAttribute('transform', 'translate(0 ' + (-Math.min(1, ouv) * 1.5).toFixed(2) + ')');
    requestAnimationFrame(boucle);
  }

  /* ---------- 4. Voix ---------- */
  var chargement = 0, ctx = null, analyseur = null, sources = [], cache = {}, muet = false, prefixe = 'gen', jeton = 0;
  function audio() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); analyseur = ctx.createAnalyser(); analyseur.fftSize = 1024; analyseur.connect(ctx.destination); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  function debloquer() { audio(); }
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) { document.addEventListener(ev, debloquer, { passive: true, capture: true }); });
  function charger(son) {
    if (!son) return Promise.resolve(null);
    if (typeof AudioBuffer !== 'undefined' && son instanceof AudioBuffer) return Promise.resolve(son);
    var c = audio(); if (!c) return Promise.resolve(null);
    if (son instanceof ArrayBuffer) return new Promise(function (ok) { c.decodeAudioData(son.slice(0), ok, function () { ok(null); }); });
    var url = son;
    if (!/[\/.:]/.test(son)) { var k = COMMUN[son + '_' + prefixe] ? son + '_' + prefixe : son; url = VOIX + k + '.mp3'; }
    if (!cache[url]) cache[url] = fetch(url).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (ok) { c.decodeAudioData(ab, ok, function () { ok(null); }); }); })
      .catch(function () { delete cache[url]; return null; });
    return cache[url];
  }
  function taire() { jeton++; sources.forEach(function (s) { try { s.onended = null; s.stop(); } catch (e) {} }); sources = []; }
  function jouer(liste) {
    liste = Array.isArray(liste) ? liste : [liste];
    taire(); var mon = jeton;
    if (muet) return Promise.resolve(false);
    chargement = mon;
    return Promise.all(liste.map(charger)).then(function (bufs) {
      if (chargement === mon) chargement = 0;
      if (mon !== jeton) return false;
      var c = audio(); if (!c) return false;
      bufs = bufs.filter(Boolean); if (!bufs.length) return false;
      var t = c.currentTime + .05, fin;
      bufs.forEach(function (b, i) {
        var s = c.createBufferSource(); s.buffer = b; s.connect(analyseur); s.start(t); t += b.duration + .22; sources.push(s);
        if (i === bufs.length - 1) fin = new Promise(function (r) { s.onended = function () { sources = sources.filter(function (x) { return x !== s; }); r(true); }; });
        else s.onended = function () { sources = sources.filter(function (x) { return x !== s; }); };
      });
      activite();
      return fin;
    });
  }
  // Répliques communes disponibles dans plume/voix/ (variantes _kaliana, _kael, _gen)
  var COMMUN = __COMMUN__;
  var ROT = {};
  function au_hasard(prefixeSit) {
    var ids = Object.keys(COMMUN).map(function (k) { return k.replace(/_(kaliana|kael|gen)$/, ''); })
      .filter(function (k, i, a) { return k.indexOf(prefixeSit + '-') === 0 && a.indexOf(k) === i; });
    if (!ids.length) return null;
    var r; do { r = ids[Math.floor(Math.random() * ids.length)]; } while (ids.length > 1 && r === ROT[prefixeSit]);
    ROT[prefixeSit] = r; return r;
  }

  /* ---------- 5. Animations ---------- */
  function action(fn) {
    if (endormi) reveilRapide();
    occupe = true; activite();
    return Promise.resolve().then(fn).catch(function () {}).then(function () { occupe = false; activite(); });
  }
  function etoiles(n) {
    for (var i = 0; i < n; i++) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '-10 -10 20 20'); s.setAttribute('class', 'pc-etoile');
      s.innerHTML = '<path d="M0 -9 L2.6 -2.8 L9 -2.8 L3.8 1.2 L5.6 8 L0 4 L-5.6 8 L-3.8 1.2 L-9 -2.8 L-2.6 -2.8 Z" fill="' + ['#ffd447', '#ffef9a', '#ff9f43'][i % 3] + '" stroke="#fff" stroke-width=".8"/>';
      s.style.left = (340 + (Math.random() - .5) * 120) + 'px'; s.style.top = '300px'; P.fx.appendChild(s);
      var dx = -Math.random() * 700 + 120, dy = -200 - Math.random() * 300;
      var an = s.animate([{ transform: 'translate(0,0) scale(.3)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.2) rotate(' + ((Math.random() - .5) * 400) + 'deg)', opacity: 1, offset: .7 },
        { transform: 'translate(' + dx * 1.1 + 'px,' + (dy + 160) + 'px) scale(.8)', opacity: 0 }], { duration: 1600 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.3,1)' });
      an.onfinish = (function (x) { return function () { x.remove(); }; })(s);
    }
  }
  function notes() {
    for (var i = 0; i < 3; i++) (function (i) {
      setTimeout(function () {
        var d = document.createElement('div'); d.className = 'pc-note'; d.textContent = i % 2 ? '♫' : '♪';
        d.style.left = (i % 2 ? 520 : 120) + 'px'; d.style.top = '160px'; P.fx.appendChild(d);
        d.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: 'translate(' + (i % 2 ? 60 : -60) + 'px,-220px) scale(1.2) rotate(' + (i % 2 ? 20 : -20) + 'deg)', opacity: 0 }], { duration: 1800, easing: 'ease-out' }).onfinish = function () { d.remove(); };
      }, i * 450);
    })(i);
  }
  function saut(h) {
    h = h || 70;
    return tous(tw('corpsSY', .9, 120), tw('corpsSX', 1.06, 120))
      .then(function () { return tous(tw('corpsY', -h, 260, ease.out), tw('corpsSY', 1.05, 200), tw('corpsSX', .97, 200), tw('brasG', 40, 250), tw('brasD', -40, 250)); })
      .then(function () { return tous(tw('corpsY', 0, 240, ease.inn), tw('corpsSY', 1, 240), tw('corpsSX', 1, 240), tw('brasG', 0, 240), tw('brasD', 0, 240)); })
      .then(function () { return tous(tw('corpsSY', .93, 90), tw('corpsSX', 1.05, 90)); })
      .then(function () { return tous(tw('corpsSY', 1, 160), tw('corpsSX', 1, 160)); });
  }
  function joie(on) { return tous(tw('heureux', on ? 1 : 0, on ? 200 : 300), tw('sourcil', on ? 1 : 0, 250)); }
  function bravo() { joie(1); etoiles(14); return saut(80).then(function () { etoiles(8); return saut(60); }).then(function () { return joie(0); }); }
  function sautJoie() { joie(1); etoiles(8); return saut(90).then(function () { return joie(0); }); }
  function danse(ms) {
    joie(1); notes(); A.queueVite = .6;
    var n = setInterval(notes, 1500);
    return tw('danse', 1, 300).then(function () { return att(ms || 3200); }).then(function () { clearInterval(n); A.queueVite = 0; return tous(tw('danse', 0, 400), joie(0)); });
  }
  function oui() {
    tw('sourcil', .7, 200);
    var a = function () { return tous(tw('teteY', 14, 160), tw('teteSY', .96, 160), tw('teteRot', 2, 160)).then(function () { return tous(tw('teteY', -4, 170), tw('teteSY', 1.01, 170), tw('teteRot', 0, 170)); }); };
    return a().then(a).then(a).then(function () { return tous(tw('teteY', 0, 150), tw('teteSY', 1, 150), tw('sourcil', 0, 300)); });
  }
  function non() {
    tw('sourcil', -.3, 200);
    return tw('nonTete', 1, 150).then(function () { return att(900); }).then(function () { return tous(tw('nonTete', 0, 250), tw('sourcil', 0, 300)); });
  }
  // Montre du doigt un élément de la page (ou un point {x,y}) : il tend le bras le plus proche et regarde dans la même direction.
  function montrer(cible, ms) {
    var x, y;
    if (cible && cible.getBoundingClientRect) { var r = cible.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    else if (cible && cible.x != null) { x = cible.x; y = cible.y; }
    else { x = innerWidth * .4; y = innerHeight * .4; }
    var rr = rig.getBoundingClientRect(), k = rr.width / W;
    var gauche = x < rr.left + (300 + OX) * k, ex = rr.left + ((gauche ? 192 : 408) + OX) * k, ey = rr.top + 442 * k;
    var ang = Math.atan2(y - ey, x - ex) * 180 / Math.PI - 90;
    while (ang > 180) ang -= 360; while (ang < -180) ang += 360;
    var bras = gauche ? 'brasG' : 'brasD', autre = gauche ? 'brasD' : 'brasG';
    var vx = Math.max(-1, Math.min(1, (x - ex) / 300)), vy = Math.max(-1, Math.min(1, (y - ey) / 300));
    tw('sourcil', .6, 300);
    return tous(tw(bras, ang, 450, ease.back), tw(autre, 0, 300), tw('teteRot', vx * 8, 400), tw('regardX', vx, 300), tw('regardY', vy, 300), tw('corpsRot', vx * 3, 400))
      .then(function () { return att(ms || 1600); })
      .then(function () { return tous(tw(bras, 0, 500), tw('teteRot', 0, 400), tw('corpsRot', 0, 400), tw('sourcil', 0, 300)); })
      .then(function () { A.regardX = null; A.regardY = null; });
  }
  function coucou(ms) { return tw('brasD', -150, 380, ease.out).then(function () { A.coucou = 1; return att(ms || 1800); }).then(function () { A.coucou = 0; return tw('brasD', 0, 420); }); }
  function chatouilles() {
    tw('heureux', 1, 150); tw('sourcil', .7, 200); tw('bouche', .35, 200); A.tortille = 1; A.queueVite = 1; ore.g = ore.d = 1;
    var v = jouer(au_hasard('chatouilles'));
    var t0 = performance.now();
    var boucleT = setInterval(function () { var kk = (performance.now() - t0) / 1800; A.tortille = Math.max(0, .25 + .75 * (1 - kk)); A.queueVite = Math.max(0, 1 - kk); }, 50);
    return Promise.all([v, att(1800)]).then(function () { clearInterval(boucleT); A.tortille = 0; A.queueVite = 0; return tous(tw('heureux', 0, 300), tw('sourcil', 0, 300), tw('bouche', 0, 300)); });
  }
  var zzzT = null;
  function zzz() {
    var d = document.createElement('div'); d.className = 'pc-zzz'; d.textContent = 'z'; d.style.left = '460px'; d.style.top = '260px'; P.fx.appendChild(d);
    d.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: 'translate(140px,-200px) scale(1.4)', opacity: 0 }], { duration: 2600, easing: 'ease-out' }).onfinish = function () { d.remove(); };
  }
  // S'allonge en boule comme un chat, caché dans sa queue, et s'endort.
  function boule() {
    if (endormi) return Promise.resolve();
    var jb = jetons.boule;
    return tous(tw('bouche', 1.6, 450), tw('paup', .6, 450), tw('teteY', -8, 500)).then(function () { return att(500); })
      .then(function () { return tous(tw('bouche', 0, 400), tw('paup', 0, 300), tw('teteY', 0, 400)); })
      .then(function () { return tous(tw('boule', 1, 1500, ease.io), tw('souffle', 2.2, 1500), tw('rythme', .5, 1500)); })
      .then(function () { if (A.boule < .95) return; endormi = true; zzz(); clearInterval(zzzT); zzzT = setInterval(zzz, 1500); });
  }
  function reveilRapide() { clearInterval(zzzT); endormi = false; tw('boule', 0, 500, ease.out); tw('souffle', 1, 600); tw('rythme', 1, 600); }
  function reveil() {
    clearInterval(zzzT); endormi = false;
    var v = jouer(au_hasard('reveil'));
    return tous(tw('boule', 0, 700, ease.back), tw('souffle', 1, 800), tw('rythme', 1, 800), tw('sourcil', 1, 250))
      .then(function () { return tous(tw('brasG', 45, 350, ease.out), tw('brasD', -45, 350, ease.out), tw('corpsSY', 1.04, 350)); })
      .then(function () { return tous(tw('brasG', 0, 400), tw('brasD', 0, 400), tw('corpsSY', 1, 400), tw('sourcil', 0, 400)); })
      .then(function () { return v; });
  }
  function toucher(e) {
    if (endormi) { occupe = true; reveil().then(function () { occupe = false; activite(); }); return; }
    if (occupe) return;
    action(chatouilles);
  }
  var ANIM = { bravo: bravo, danse: danse, oui: oui, non: non, saut: sautJoie, montrer: null, coucou: coucou };
  function dire(son, opts) {
    opts = opts || {};
    if (!root) monter();
    if (endormi) reveilRapide();
    var v = jouer(son);
    var anim = opts.anim === 'montrer' ? function () { return montrer(opts.cible); } : ANIM[opts.anim];
    if (anim) { occupe = true; Promise.all([v, anim()]).then(function () { occupe = false; activite(); }); }
    return v;
  }

  /* ---------- 6. Ennui puis sieste en boule si personne ne joue ---------- */
  var derniere = performance.now(), ennuye = false;
  function activite() { derniere = performance.now(); ennuye = false; }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function (e) {
    if (root && root.contains(e.target)) return; activite(); if (endormi) { occupe = true; reveil().then(function () { occupe = false; }); } }, { passive: true, capture: true }); });
  setInterval(function () {
    if (!root || occupe || endormi || sources.length || document.hidden) return;
    var calme = performance.now() - derniere;
    if (calme > 45000 && !ennuye) { ennuye = true; action(function () { return Promise.all([jouer(au_hasard('ennui')), tous(tw('regardX', -1, 500), tw('teteRot', -6, 600)).then(function () { return att(700); }).then(function () { return tous(tw('regardX', 1, 700), tw('teteRot', 6, 800)); }).then(function () { return tous(tw('regardX', 0, 400), tw('teteRot', 0, 400)); }).then(function () { A.regardX = null; })]); }).then(function () { ennuye = true; derniere = performance.now() - 45000; }); }
    else if (calme > 90000) { occupe = true; jouer(au_hasard('dodo')).then(function () { return boule(); }).then(function () { occupe = false; }); }
  }, 1000);

  /* ---------- 7. API ---------- */
  window.Plume = {
    version: 1,
    dire: dire, taire: taire, parle: function () { return sources.length > 0 || !!chargement; },
    reussite: function () { return dire(au_hasard('bravo'), { anim: Math.random() < .5 ? 'saut' : 'oui' }); },
    erreur: function () { return dire(au_hasard('encore'), { anim: 'non' }); },
    serie: function () { return dire(au_hasard('serie'), { anim: 'bravo' }); },
    fin: function () { return dire(au_hasard('fin'), { anim: 'danse' }); },
    saluer: function (jeu) { if (!root) monter(); var cle = 'salut-' + jeu; return dire(COMMUN[cle + '_gen'] ? cle : VOIX + cle + '_' + prefixe + '.mp3', { anim: 'coucou' }); },
    montrer: function (c, ms) { return action(function () { return montrer(c, ms); }); },
    bravo: function () { return action(bravo); }, danse: function (ms) { return action(function () { return danse(ms); }); },
    saut: function () { return action(sautJoie); }, oui: function () { return action(oui); }, non: function () { return action(non); },
    coucou: function () { return action(coucou); }, chatouilles: function () { return action(chatouilles); },
    boule: function () { occupe = true; return boule().then(function () { occupe = false; }); },
    reveil: function () { return (endormi || A.boule > .05) ? reveil() : Promise.resolve(); },
    prenom: function (n) { var p = String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); prefixe = (p === 'kaliana' || p === 'kael') ? p : 'gen'; },
    muet: function (m) { muet = !!m; if (muet) taire(); },
    cacher: function (c) { if (root) root.classList.toggle('pc-cache', !!c); },
    monter: monter, audio: audio
  };
  if (document.body) monter(); else document.addEventListener('DOMContentLoaded', monter);
})();
