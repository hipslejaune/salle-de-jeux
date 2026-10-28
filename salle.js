/* Fichier commun de la salle de jeux : connexion Supabase et enfant qui joue.
   La clé ci-dessous est la clé PUBLIQUE (publishable) : elle est faite pour être visible.
   Les données sont protégées par les règles de sécurité (RLS) de la base. */
(function () {
  var URL_SUPABASE = 'https://gjqufcsznhfimnnprion.supabase.co';
  var CLE_PUBLIQUE = 'sb_publishable_q5JqM7-S4GLs9rmH-_DDLA_1Y6RrozB';
  // Clé publique Cloudflare Turnstile (anti-robot). Vide = anti-robot désactivé.
  var CLE_TURNSTILE = '0x4AAAAAAFpT0ixmlHTUwNip';
  // Date de la version de la page de confidentialité acceptée à l'inscription
  var VERSION_CONFIDENTIALITE = '2026-10-28';
  var CLE_ENFANT = 'salle-enfant';

  if (window.Salle && window.Salle.client) return;   // déjà initialisé (page remplacée par jeu.html)

  var client = window.supabase.createClient(URL_SUPABASE, CLE_PUBLIQUE, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  window.Salle = {
    client: client,
    accueil: 'https://hipslejaune.github.io/salle-de-jeux/',
    cleTurnstile: CLE_TURNSTILE,
    versionConfidentialite: VERSION_CONFIDENTIALITE,
    // Enfant choisi sur cet appareil (rien d'autre n'est gardé dans le navigateur)
    enfantCourant: function () {
      try { return JSON.parse(localStorage.getItem(CLE_ENFANT)); } catch (e) { return null; }
    },
    choisirEnfant: function (enfant) {
      try {
        if (enfant) {
          localStorage.setItem(CLE_ENFANT, JSON.stringify({
            id: enfant.id, prenom: enfant.prenom, niveau: enfant.niveau || null
          }));
        } else {
          localStorage.removeItem(CLE_ENFANT);
        }
      } catch (e) { /* stockage indisponible : on continue sans */ }
    }
  };
})();
