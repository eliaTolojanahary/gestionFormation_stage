// Fichiers des données de démonstration (donneesTest.sql) :
//   - photos de profil téléchargées sur randomuser.me      -> uploads/utilisateurs/demo-*.jpg
//   - pièces du dossier étudiant (photo, CIN, résidence)    -> uploads/etudiants/demo-*
//   - supports de cours (PDF générés, une image)            -> uploads/supports/demo-*
// Usage : node scripts/fichiersDemo.js   (relançable : les fichiers déjà présents sont gardés)
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');

const UPLOADS = path.join(__dirname, '..', 'uploads');
const dossier = (nom) => {
  const chemin = path.join(UPLOADS, nom);
  fs.mkdirSync(chemin, { recursive: true });
  return chemin;
};

// slug -> portrait randomuser.me (genre/numéro) ; etudiant = pièces du dossier à créer
const PERSONNES = [
  { slug: 'elia', nom: 'Elia Nantenaina', portrait: 'men/3', existante: 'utilisateurs/1789646473109-elia.jpg' },
  { slug: 'hanitra', nom: 'Hanitra Rasoanaivo', portrait: 'women/65' },
  { slug: 'mamy', nom: 'Mamy Andriamanana', portrait: 'men/32' },
  { slug: 'tiana', nom: 'Tiana Randrianarisoa', portrait: 'men/75' },
  { slug: 'voahangy', nom: 'Voahangy Rakotomalala', portrait: 'women/68' },
  { slug: 'hery', nom: 'Hery Rajaonarison', portrait: 'men/52' },
  { slug: 'lalaina', nom: 'Lalaina Razafindrabe', portrait: 'women/90' },
  { slug: 'andry', nom: 'Andry Rakotoarisoa', portrait: 'men/11', etudiant: true },
  { slug: 'miora', nom: 'Miora Randriamampionona', portrait: 'women/21', etudiant: true },
  { slug: 'fitiavana', nom: 'Fitiavana Rasolofo', portrait: 'women/33', etudiant: true },
  { slug: 'toky', nom: 'Toky Ravelojaona', portrait: 'men/22', etudiant: true },
  { slug: 'nomena', nom: 'Nomena Andrianjafy', portrait: 'women/45', etudiant: true },
  { slug: 'sitraka', nom: 'Sitraka Rakotondrabe', portrait: 'men/41', etudiant: true },
  { slug: 'onja', nom: 'Onja Raharimanana', portrait: 'women/57', etudiant: true },
  { slug: 'fano', nom: 'Fanomezantsoa Rabe', portrait: 'men/60', etudiant: true },
  { slug: 'nyaina', nom: 'Ny Aina Ramanantsoa', portrait: 'women/79', etudiant: true },
  { slug: 'haja', nom: 'Haja Randrianasolo', portrait: 'men/85', etudiant: true },
  { slug: 'tsiory', nom: 'Tsiory Razanakoto', portrait: 'women/12', etudiant: true },
  // Inscrit en ligne : pièces du dossier pas encore fournies (complétées par l'Accueil)
  { slug: 'mahery', nom: 'Mahery Rabemananjara', portrait: 'men/18' },
];

// Supports PDF : titre, puis sections (titre, paragraphes)
const SUPPORTS_PDF = [
  {
    fichier: 'demo-introduction-html.pdf',
    formation: 'Développement web',
    titre: 'Introduction au HTML',
    sections: [
      ['Qu\'est-ce que le HTML ?', [
        'Le HTML (HyperText Markup Language) décrit la structure d\'une page web. Il n\'est pas un langage de programmation : il indique au navigateur ce qu\'est chaque élément (titre, paragraphe, image, lien...).',
        'Un document HTML est composé de balises. La plupart vont par paire : une balise ouvrante <p> et une balise fermante </p>.',
      ]],
      ['Structure d\'une page', [
        '<!DOCTYPE html> indique la version du HTML. La balise <html> contient tout le document ; <head> regroupe les informations sur la page (titre, encodage) ; <body> contient ce qui est affiché.',
        'Exercice : créez un fichier index.html avec un titre <h1>, deux paragraphes et une liste <ul> de trois éléments.',
      ]],
      ['Liens et images', [
        'Un lien s\'écrit <a href="contact.html">Contact</a>. Une image s\'écrit <img src="logo.png" alt="Logo">. L\'attribut alt décrit l\'image pour les personnes malvoyantes et s\'affiche si l\'image ne charge pas.',
      ]],
    ],
  },
  {
    fichier: 'demo-mise-en-page-css.pdf',
    formation: 'Développement web',
    titre: 'Mise en page avec CSS',
    sections: [
      ['Sélecteurs et propriétés', [
        'Le CSS décrit l\'apparence des éléments HTML. Une règle associe un sélecteur (h1, .carte, #menu) à des propriétés : color, font-size, background...',
      ]],
      ['Le modèle de boîte', [
        'Chaque élément est une boîte : le contenu, puis le padding (espace intérieur), la bordure, et enfin le margin (espace extérieur).',
        'Astuce : box-sizing: border-box inclut le padding et la bordure dans la largeur, ce qui simplifie les calculs.',
      ]],
      ['Flexbox', [
        'display: flex aligne les enfants sur une ligne. justify-content règle l\'alignement horizontal, align-items l\'alignement vertical, gap l\'espace entre les éléments.',
        'Exercice : réalisez une barre de navigation avec le logo à gauche et trois liens à droite.',
      ]],
    ],
  },
  {
    fichier: 'demo-bases-javascript.pdf',
    formation: 'Développement web',
    titre: 'Les bases de JavaScript',
    sections: [
      ['Variables', [
        'const déclare une valeur qui ne sera pas réaffectée, let une variable modifiable. Évitez var.',
      ]],
      ['Fonctions et événements', [
        'Une fonction regroupe des instructions réutilisables : function saluer(nom) { return "Bonjour " + nom; }',
        'addEventListener("click", ...) exécute une fonction quand l\'utilisateur clique sur un élément.',
      ]],
      ['Manipuler la page', [
        'document.querySelector(".titre") récupère un élément ; element.textContent modifie son texte.',
        'Exercice : un bouton qui affiche le nombre de clics.',
      ]],
    ],
  },
  {
    fichier: 'demo-projet-site-vitrine.pdf',
    formation: 'Développement web',
    titre: 'Projet : site vitrine',
    sections: [
      ['Objectif', [
        'Réaliser le site vitrine d\'une petite entreprise : accueil, services, galerie et formulaire de contact.',
      ]],
      ['Critères d\'évaluation', [
        'Structure HTML correcte, mise en page responsive avec Flexbox, au moins une interaction en JavaScript, code lisible et commenté.',
      ]],
    ],
  },
  {
    fichier: 'demo-word-mise-en-forme.pdf',
    formation: 'Bureautique',
    titre: 'Word : mise en forme d\'un document',
    sections: [
      ['Les styles', [
        'Utilisez les styles Titre 1, Titre 2 et Normal plutôt qu\'une mise en forme manuelle : la table des matières se crée ensuite automatiquement.',
      ]],
      ['Mise en page', [
        'Onglet Mise en page : marges, orientation, sauts de page et de section. Insérez les numéros de page depuis l\'onglet Insertion.',
        'Exercice : mettez en forme un rapport de 3 pages avec une table des matières.',
      ]],
    ],
  },
  {
    fichier: 'demo-excel-formules.pdf',
    formation: 'Bureautique',
    titre: 'Excel : formules de base',
    sections: [
      ['Références de cellules', [
        'A1 est une référence relative : elle change quand on recopie la formule. $A$1 est absolue : elle reste fixe.',
      ]],
      ['Fonctions essentielles', [
        'SOMME(A1:A10), MOYENNE(B2:B20), MAX, MIN, NB. SI(C2>=10;"Admis";"Ajourné") renvoie une valeur selon une condition.',
        'Exercice : calculez la moyenne de chaque étudiant et affichez Admis ou Ajourné.',
      ]],
    ],
  },
  {
    fichier: 'demo-modele-osi.pdf',
    formation: 'Réseaux informatiques',
    titre: 'Le modèle OSI',
    sections: [
      ['Les sept couches', [
        '1 Physique, 2 Liaison, 3 Réseau, 4 Transport, 5 Session, 6 Présentation, 7 Application.',
        'Chaque couche rend un service à la couche du dessus et utilise celle du dessous.',
      ]],
      ['Exemples', [
        'Câble et Wi-Fi (couche 1), adresse MAC et commutateur (couche 2), adresse IP et routeur (couche 3), TCP et UDP (couche 4), HTTP et DNS (couche 7).',
      ]],
    ],
  },
  {
    fichier: 'demo-adressage-ip.pdf',
    formation: 'Réseaux informatiques',
    titre: 'Adressage IP et sous-réseaux',
    sections: [
      ['Adresse IPv4', [
        'Une adresse IPv4 compte 4 octets, par exemple 192.168.1.10. Le masque (255.255.255.0 ou /24) sépare la partie réseau de la partie hôte.',
      ]],
      ['Découper un réseau', [
        'Un /26 donne 4 sous-réseaux de 64 adresses, dont 62 utilisables (on retire l\'adresse du réseau et celle de diffusion).',
        'Exercice : découpez 192.168.10.0/24 en 4 sous-réseaux et donnez la plage de chacun.',
      ]],
    ],
  },
  {
    fichier: 'demo-illustrator-outils.pdf',
    formation: 'Infographie',
    titre: 'Illustrator : outils de base',
    sections: [
      ['Vectoriel ou matriciel', [
        'Illustrator crée des images vectorielles : elles restent nettes à toutes les tailles, idéales pour les logos.',
      ]],
      ['Outils essentiels', [
        'Plume (tracés), formes, Pathfinder (fusion et découpe), texte. Exercice : redessinez un logo simple à partir d\'un croquis.',
      ]],
    ],
  },
  {
    fichier: 'demo-python-variables.pdf',
    formation: 'Python pour débutants',
    titre: 'Variables et types en Python',
    sections: [
      ['Les types de base', [
        'int (entier), float (nombre à virgule), str (texte), bool (True ou False). type(x) donne le type d\'une valeur.',
      ]],
      ['Entrées et sorties', [
        'input() lit une saisie (toujours un texte), int() la convertit en entier, print() affiche.',
        'Exercice : demandez deux nombres et affichez leur somme et leur moyenne.',
      ]],
    ],
  },
];

async function telecharger(url, destination) {
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`${url} : HTTP ${reponse.status}`);
  fs.writeFileSync(destination, Buffer.from(await reponse.arrayBuffer()));
}

// Pièce du dossier factice (CIN, certificat de résidence) : image avec le nom de l'étudiant
async function pieceFactice(destination, titre, nom, couleur) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
    <rect width="640" height="400" rx="18" fill="#f7f7f2" stroke="${couleur}" stroke-width="8"/>
    <rect x="0" y="0" width="640" height="70" rx="18" fill="${couleur}"/>
    <text x="32" y="46" font-family="Arial" font-size="28" font-weight="bold" fill="#fff">${titre}</text>
    <text x="32" y="150" font-family="Arial" font-size="22" fill="#333">Nom : ${nom}</text>
    <text x="32" y="195" font-family="Arial" font-size="22" fill="#333">Antananarivo, Madagascar</text>
    <text x="32" y="360" font-family="Arial" font-size="18" fill="#999">DOCUMENT FICTIF - DONNÉES DE DÉMONSTRATION</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(destination);
}

function supportPdf(destination, { formation, titre, sections }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const flux = fs.createWriteStream(destination);
    flux.on('finish', resolve);
    flux.on('error', reject);
    doc.pipe(flux);

    doc.fontSize(10).fillColor('#888').text(`IMTECH INFO - ${formation}`);
    doc.moveDown(0.5).fontSize(24).fillColor('#1d3557').text(titre);
    doc.moveDown(1);
    sections.forEach(([sousTitre, paragraphes], index) => {
      if (index > 0) doc.addPage();
      doc.fontSize(16).fillColor('#1d3557').text(`${index + 1}. ${sousTitre}`);
      doc.moveDown(0.6);
      paragraphes.forEach((paragraphe) => {
        doc.fontSize(12).fillColor('#222').text(paragraphe, { align: 'justify', lineGap: 4 });
        doc.moveDown(0.8);
      });
    });
    doc.end();
  });
}

// Support image : palette de couleurs (cours d'infographie)
async function supportPalette(destination) {
  const couleurs = ['#1d3557', '#457b9d', '#a8dadc', '#f1faee', '#e63946', '#f4a261'];
  const cases = couleurs.map((c, i) => `
    <rect x="${40 + i * 150}" y="120" width="130" height="200" rx="10" fill="${c}" stroke="#ccc"/>
    <text x="${105 + i * 150}" y="350" font-family="Arial" font-size="20" text-anchor="middle" fill="#333">${c}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="420">
    <rect width="960" height="420" fill="#fff"/>
    <text x="40" y="70" font-family="Arial" font-size="34" font-weight="bold" fill="#1d3557">Palette de couleurs - charte graphique</text>
    ${cases}
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(destination);
}

async function main() {
  const utilisateurs = dossier('utilisateurs');
  const etudiants = dossier('etudiants');
  const supports = dossier('supports');
  let crees = 0;

  for (const p of PERSONNES) {
    const photo = path.join(utilisateurs, `demo-${p.slug}.jpg`);
    if (!fs.existsSync(photo)) {
      const existante = p.existante && path.join(UPLOADS, p.existante);
      if (existante && fs.existsSync(existante)) fs.copyFileSync(existante, photo);
      else await telecharger(`https://randomuser.me/api/portraits/${p.portrait}.jpg`, photo);
      crees++;
    }
    if (!p.etudiant) continue;

    const photoDossier = path.join(etudiants, `demo-${p.slug}-photo.jpg`);
    if (!fs.existsSync(photoDossier)) { fs.copyFileSync(photo, photoDossier); crees++; }
    const cin = path.join(etudiants, `demo-${p.slug}-cin.png`);
    if (!fs.existsSync(cin)) { await pieceFactice(cin, "CARTE D'IDENTITÉ NATIONALE", p.nom, '#2a9d8f'); crees++; }
    const residence = path.join(etudiants, `demo-${p.slug}-residence.png`);
    if (!fs.existsSync(residence)) { await pieceFactice(residence, 'CERTIFICAT DE RÉSIDENCE', p.nom, '#e76f51'); crees++; }
  }

  for (const support of SUPPORTS_PDF) {
    const destination = path.join(supports, support.fichier);
    if (!fs.existsSync(destination)) { await supportPdf(destination, support); crees++; }
  }
  const palette = path.join(supports, 'demo-palette-couleurs.png');
  if (!fs.existsSync(palette)) { await supportPalette(palette); crees++; }

  console.log(`Fichiers de démonstration prêts (${crees} créé(s)) dans ${UPLOADS}`);
}

main().catch((erreur) => {
  console.error('Échec :', erreur.message);
  process.exit(1);
});
