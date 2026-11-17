// Page web ouverte en scannant le QR code d'une attestation (GET /api/verification/:uuid depuis un
// navigateur) : un employeur voit tout de suite si le document est authentique, et pour qui.
// Page autonome : styles en ligne, logo intégré (pas de fichier à servir), lisible sur téléphone,
// mode clair ou sombre selon l'appareil. Les appels sans navigateur reçoivent toujours du JSON.
const fs = require('fs');
const path = require('path');

// Logo lu une seule fois au démarrage ; absent : la page s'affiche sans
let logo = '';
try {
  const contenu = fs.readFileSync(path.join(__dirname, '..', 'assets', 'logoImtech.png'));
  logo = `data:image/png;base64,${contenu.toString('base64')}`;
} catch {
  logo = '';
}

// Les noms viennent de la base : on les échappe avant de les mettre dans le HTML
function echapperHtml(texte) {
  return String(texte ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// « 9 novembre 2026 » (date locale du serveur, comme sur le PDF)
function dateLongue(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Nom avec majuscule initiale pour le prénom, NOM en capitales (comme sur l'attestation)
function nomEtudiant(prenom, nom) {
  const p = String(prenom ?? '').trim().toLowerCase().replace(/(^|[\s-])\p{L}/gu, (l) => l.toUpperCase());
  return `${p} ${String(nom ?? '').trim().toUpperCase()}`.trim();
}

const ICONES = {
  // cercle + coche
  valide: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  // cercle + croix
  invalide: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
};

function icone(nom) {
  return `<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nom]}</svg>`;
}

const STYLES = `
  :root {
    --fond: #eef2f6; --carte: #ffffff; --texte: #0f172a; --doux: #475569; --ligne: #e2e8f0;
    --bleu: #063a5c; --ok: #15803d; --ok-fond: #dcfce7; --ko: #b91c1c; --ko-fond: #fee2e2;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --fond: #0b1220; --carte: #111a2b; --texte: #e2e8f0; --doux: #94a3b8; --ligne: #1e293b;
      --bleu: #7cc0ea; --ok: #4ade80; --ok-fond: #12301f; --ko: #f87171; --ko-fond: #3a1515;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; background: var(--fond); color: var(--texte);
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    display: flex; align-items: center; justify-content: center; padding: 24px 16px;
  }
  main {
    width: 100%; max-width: 460px; background: var(--carte); border: 1px solid var(--ligne);
    border-radius: 16px; overflow: hidden;
  }
  header {
    display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--ligne);
  }
  header img { width: 40px; height: 40px; object-fit: contain; }
  header strong { display: block; letter-spacing: 2px; color: var(--bleu); }
  header span { font-size: 13px; color: var(--doux); }
  .statut { display: flex; align-items: center; gap: 14px; padding: 20px; }
  .statut.ok { background: var(--ok-fond); color: var(--ok); }
  .statut.ko { background: var(--ko-fond); color: var(--ko); }
  .icone { width: 40px; height: 40px; flex-shrink: 0; }
  .statut h1 { margin: 0; font-size: 20px; line-height: 1.25; }
  .statut p { margin: 2px 0 0; font-size: 14px; color: var(--texte); opacity: .85; }
  dl { margin: 0; padding: 8px 20px 4px; }
  dl div { padding: 12px 0; border-bottom: 1px solid var(--ligne); }
  dl div:last-child { border-bottom: 0; }
  dt { font-size: 13px; color: var(--doux); }
  dd { margin: 2px 0 0; font-size: 17px; font-weight: 600; overflow-wrap: anywhere; }
  .explication { margin: 0; padding: 16px 20px 20px; font-size: 14px; line-height: 1.55; color: var(--doux); }
  footer {
    padding: 14px 20px; border-top: 1px solid var(--ligne); font-size: 12px; color: var(--doux);
    overflow-wrap: anywhere;
  }
`;

function page({ titre, contenu }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${echapperHtml(titre)}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
  <header>
    ${logo ? `<img src="${logo}" alt="">` : ''}
    <div><strong>IMTECH INFO</strong><span>Vérification d'attestation</span></div>
  </header>
  ${contenu}
</main>
</body>
</html>`;
}

// Attestation trouvée : authentique, avec ce qu'il faut comparer au document papier
function pageAuthentique(attestation, uuid) {
  const lignes = [
    ['Délivrée à', nomEtudiant(attestation.prenom, attestation.nom)],
    ['Formation', attestation.formation_nom],
    attestation.duree ? ['Durée', attestation.duree] : null,
    ['Date de délivrance', dateLongue(attestation.date_delivrance)],
  ].filter(Boolean);

  return page({
    titre: 'Attestation authentique',
    contenu: `
  <section class="statut ok">
    ${icone('valide')}
    <div><h1>Attestation authentique</h1><p>Ce document a bien été délivré par IMTECH INFO.</p></div>
  </section>
  <dl>
    ${lignes.map(([libelle, valeur]) => `<div><dt>${libelle}</dt><dd>${echapperHtml(valeur)}</dd></div>`).join('\n    ')}
  </dl>
  <p class="explication">Vérifiez que ces informations correspondent à celles du document présenté.
  En cas de différence, le document a pu être modifié : contactez IMTECH INFO.</p>
  <footer>Référence : ${echapperHtml(uuid)}</footer>`,
  });
}

// QR code inconnu : faux document, ou lien recopié avec une erreur
function pageNonReconnue() {
  return page({
    titre: 'Document non reconnu',
    contenu: `
  <section class="statut ko">
    ${icone('invalide')}
    <div><h1>Document non reconnu</h1><p>Aucune attestation IMTECH INFO ne correspond à ce QR code.</p></div>
  </section>
  <p class="explication">Ce document n'a pas été délivré par IMTECH INFO, ou son lien a été modifié.
  Pour toute question, contactez directement IMTECH INFO.</p>`,
  });
}

module.exports = { pageAuthentique, pageNonReconnue, echapperHtml, nomEtudiant, dateLongue };
