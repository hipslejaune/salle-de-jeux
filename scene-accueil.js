/* Scène d'accueil de la salle de jeux : sol néon, cinq jeux flottants qui suivent le doigt, reflets au sol, logos animés.
   Aucune ressource externe : tout vient du dossier scene/.
   Utilisation : SceneAccueil.monter(conteneur) puis SceneAccueil.activer(true|false) selon qu'un enfant est choisi. */
(function () {
  'use strict';

  // Géométrie des deux rendus du sol (caméra à 1,2 m, focale en pixels d'image)
  var SOLS = {
    paysage:  { src: 'scene/sol-paysage.webp',  iw: 1920, ih: 1080, hor: 475.2, f: 1493.33 },
    portrait: { src: 'scene/sol-portrait.webp', iw: 1080, ih: 1920, hor: 768.0, f: 840.0 }
  };
  var HC = 1.2;
  // Pour chaque mise en page : centre (sx, sy) et taille de la carte en pixels de l'image du sol.
  // La distance et la hauteur au-dessus du sol sont déduites de ces valeurs.
  var JEUX = [
    { id: 'multiplications', titre: 'Le défi des multiplications', lien: 'tables-multiplication', c: '#FF5CC8',
      paysage: { sx: 610, sy: 610, size: 270 },  portrait: { sx: 250, sy: 540, size: 200 } },
    { id: 'additions', titre: 'Additions et soustractions', lien: 'additions-soustractions', c: '#FFD84A',
      paysage: { sx: 300, sy: 581, size: 240 },  portrait: { sx: 270, sy: 880, size: 230 } },
    { id: 'dizaines', titre: 'Dizaines et unités', lien: 'dizaines-et-unites', c: '#FF9A3C',
      paysage: { sx: 960, sy: 640, size: 300 },  portrait: { sx: 540, sy: 330, size: 190 } },
    { id: 'lecture', titre: 'Lecture Ninjago', lien: 'jeu-lecture-ninjago', c: '#5CFFB0',
      paysage: { sx: 1310, sy: 610, size: 270 }, portrait: { sx: 830, sy: 540, size: 200 } },
    { id: 'horloge', titre: "L'Horloge de Mario", lien: 'horloge-mario', c: '#FF6B6B',
      paysage: { sx: 1620, sy: 581, size: 240 }, portrait: { sx: 810, sy: 880, size: 230 } }
  ];

  var reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOUV = reduit ? 0 : 1;
  var borne = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  function monter(racine) {
    var W = 0, H = 0, g = SOLS.paysage, mode = 'paysage', hor = 0, F = 0, visible = true, enMarche = false;
    var P = { x: 0, y: 0, actif: false, nx: 0, snx: 0, fin: 0 };
    var gyroNx = 0, gyroOn = false, videosOk = false;

    racine.classList.add('scene3d');
    racine.textContent = '';
    function mk(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; (parent || racine).appendChild(e); return e; }
    var sol = mk('img', 's-sol'); sol.alt = ''; sol.decoding = 'async';
    var flaques = mk('div'), reflets = mk('div'), cartes = mk('div'), logos = mk('div', 's-logos');

    var objets = JEUX.map(function (j, i) {
      var a = mk('a', 's-carte s-abs', cartes);
      a.style.setProperty('--c', j.c);
      a.href = 'jeu.html?g=' + j.lien; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', j.titre);
      a.innerHTML = '<div class="s-eclat"><div class="s-vitre"><img alt="" decoding="async" src="scene/jeu-' + j.id + '.webp"></div></div>';
      var r = mk('div', 's-reflet s-abs', reflets); r.style.setProperty('--c', j.c); r.setAttribute('aria-hidden', 'true');
      r.innerHTML = '<div class="s-eclat"><div class="s-vitre"><img alt="" src="scene/jeu-' + j.id + '.webp"></div></div>';
      var f = mk('div', 's-flaque s-abs', flaques); f.style.setProperty('--c', j.c); f.setAttribute('aria-hidden', 'true');
      var v = mk('video', null, logos); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('aria-hidden', 'true'); v.src = 'scene/logo-' + j.id + '.mp4';
      a.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') a.classList.add('touche'); });
      a.addEventListener('pointerleave', function () { a.classList.remove('touche'); });
      return { j: j, a: a, r: r, f: f, v: v, ph: i * 1.7 + .6, ox: 0, oh: 0, tilt: 0, size: 0, pos: null };
    });

    function miseEnPage() {
      W = racine.clientWidth; H = racine.clientHeight;
      if (!W || !H) return;
      mode = (W / H < .9) ? 'portrait' : 'paysage';
      g = SOLS[mode];
      if (sol.getAttribute('src') !== g.src) sol.src = g.src;
      var s = Math.max(W / g.iw, H / g.ih);
      var offX = (W - g.iw * s) / 2, offY = (H - g.ih * s) / 2;
      sol.style.width = g.iw * s + 'px'; sol.style.height = g.ih * s + 'px';
      sol.style.left = offX + 'px'; sol.style.top = offY + 'px';
      hor = offY + g.hor * s; F = g.f * s;
      var vis = Math.min(1, W / (g.iw * s));        // part de la largeur visible (écrans étroits)
      objets.forEach(function (c) {
        var p = c.j[mode], d = g.f / p.size;
        c.pos = { d: d, X: (p.sx - g.iw / 2) * d / g.f * vis, h: HC - (p.sy - g.hor) * d / g.f };
        c.size = F / d;
        c.a.style.width = c.a.style.height = c.r.style.width = c.r.style.height = c.size + 'px';
        c.f.style.width = c.size * 1.3 + 'px'; c.f.style.height = c.size * .26 + 'px';
        c.v.style.width = c.size * 1.3 + 'px';
      });
    }

    function pointeur(e) {
      var r = racine.getBoundingClientRect();
      P.x = e.clientX - r.left; P.y = e.clientY - r.top; P.actif = true;
      P.nx = borne((P.x - W / 2) / (W / 2), -1, 1); P.fin = 0;
    }
    racine.addEventListener('pointermove', pointeur, { passive: true });
    racine.addEventListener('pointerdown', function (e) { pointeur(e); lancerVideos(); demanderGyro(); }, { passive: true });
    function lacher(e) { if (e.pointerType !== 'mouse') P.fin = performance.now() + 900; }
    racine.addEventListener('pointerup', lacher, { passive: true });
    racine.addEventListener('pointercancel', lacher, { passive: true });
    racine.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') P.actif = false; });

    function demanderGyro() {
      if (gyroOn || typeof DeviceOrientationEvent === 'undefined' || !matchMedia('(pointer: coarse)').matches) return;
      function go() { gyroOn = true; addEventListener('deviceorientation', function (ev) {
        if (ev.gamma != null) gyroNx = borne(ev.gamma / 28, -1, 1);
      }, { passive: true }); }
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') go(); }).catch(function () {});
      } else go();
    }

    function lancerVideos() {
      if (reduit || !visible) return;
      objets.forEach(function (c) { var p = c.v.play(); if (p && p.catch) p.catch(function () {}); });
      videosOk = true;
    }
    function pauseVideos() { objets.forEach(function (c) { try { c.v.pause(); } catch (e) {} }); videosOk = false; }

    var t0 = performance.now(), prev = t0;
    function image(now) {
      if (!enMarche) return;
      var dt = Math.min(.05, (now - prev) / 1000); prev = now;
      var t = (now - t0) / 1000;
      if (P.fin && now > P.fin) { P.actif = false; P.fin = 0; }
      var lisse = 1 - Math.pow(.0009, dt);
      P.snx += ((P.actif ? P.nx : gyroNx) - P.snx) * lisse;
      var cam = P.snx * .4 * MOUV;
      if (W) objets.forEach(function (c) {
        var p = c.pos, d = p.d;
        var ix = Math.sin(t * .6 + c.ph) * .06 * MOUV, ih = Math.sin(t * 1.05 + c.ph * 1.7) * .09 * MOUV;
        var tx = 0, th = 0;
        if (P.actif && MOUV) {                      // la carte se laisse attirer vers le doigt
          tx = borne(((P.x - W / 2) * d / F - p.X) * .12, -.4, .4);
          th = borne((HC - (P.y - hor) * d / F - p.h) * .12, -.3, .35);
        }
        c.ox += (tx - c.ox) * lisse * .8; c.oh += (th - c.oh) * lisse * .8;
        var X = p.X + c.ox + ix - cam, h = Math.max(.15, p.h + c.oh + ih);
        var sx = W / 2 + F * X / d, sy = hor + F * (HC - h) / d;
        var syR = hor + F * (HC + h) / d;            // reflet : symétrique par rapport au sol
        var yFloor = hor + F * HC / d;
        var vise = P.actif ? P.x : W / 2 + P.snx * W / 2;
        c.tilt += (borne((sx - vise) / W, -.5, .5) * -26 * MOUV - c.tilt) * lisse;
        var half = c.size / 2, ti = c.tilt.toFixed(2), rz = (Math.sin(t * .8 + c.ph) * 1.4 * MOUV).toFixed(2), fw = c.size * 1.3;
        c.a.style.transform = 'translate3d(' + (sx - half) + 'px,' + (sy - half) + 'px,0) perspective(900px) rotateY(' + ti + 'deg) rotateZ(' + rz + 'deg)';
        c.r.style.transform = 'translate3d(' + (sx - half) + 'px,' + (syR - half) + 'px,0) scaleY(-1) perspective(900px) rotateY(' + ti + 'deg)';
        c.f.style.transform = 'translate3d(' + (sx - fw / 2) + 'px,' + (yFloor - c.size * .13) + 'px,0)';
        c.f.style.opacity = (.7 - borne(h / 4, 0, .45)).toFixed(2);
        c.v.style.transform = 'translate3d(' + (sx - fw / 2) + 'px,' + (sy + half - c.size * .17) + 'px,0) perspective(900px) rotateY(' + ti + 'deg)';
      });
      requestAnimationFrame(image);
    }
    function demarrer() { if (enMarche) return; enMarche = true; prev = performance.now(); requestAnimationFrame(image); if (!videosOk) lancerVideos(); }
    function arreter() { enMarche = false; pauseVideos(); }

    // La scène ne tourne que lorsqu'elle est à l'écran (économie de batterie)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) { miseEnPage(); demarrer(); } else arreter();
      }).observe(racine);
    } else { demarrer(); }
    if ('ResizeObserver' in window) new ResizeObserver(miseEnPage).observe(racine);
    else addEventListener('resize', miseEnPage);
    miseEnPage();

    return {
      // actif = un enfant est choisi : sinon les jeux sont grisés et ne s'ouvrent pas
      activer: function (actif) {
        racine.classList.toggle('sans-enfant', !actif);
        objets.forEach(function (c) { if (actif) c.a.removeAttribute('aria-disabled'); else c.a.setAttribute('aria-disabled', 'true'); });
      },
      remonter: miseEnPage
    };
  }

  window.SceneAccueil = { monter: monter };
})();
