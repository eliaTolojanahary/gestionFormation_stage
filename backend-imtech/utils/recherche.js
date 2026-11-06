// Recherche dans les listes avec les index FULLTEXT de MariaDB (au lieu de LIKE '%texte%', qui
// relit toute la table à chaque recherche).
//
// Chaque mot tapé doit COMMENCER un mot du champ : « jean rab » trouve « Jean Rabe »,
// « rabe@gm » trouve « jean.rabe@gmail.com », sans tenir compte des accents ni des majuscules.
// Limites de MariaDB : un morceau au milieu d'un mot n'est pas trouvé (« arisoa » ne trouve pas
// « Randrianarisoa ») ; les mots de moins de 3 lettres et quelques mots très courants (« com »,
// « de ») ne sont pas indexés : ils ne sont donc pas exigés (ils servent seulement au classement).

// innodb_ft_min_token_size : mots plus courts absents de l'index
const LONGUEUR_MOT_MIN = 3;

// Mots vides InnoDB par défaut (information_schema.INNODB_FT_DEFAULT_STOPWORD)
const MOTS_VIDES = new Set([
  'a', 'about', 'an', 'are', 'as', 'at', 'be', 'by', 'com', 'de', 'en', 'for', 'from', 'how', 'i', 'in',
  'is', 'it', 'la', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what', 'when', 'where', 'who',
  'will', 'with', 'und', 'www',
]);

// Texte tapé -> requête booléenne MATCH ... AGAINST : 'jean rab' -> '+jean* +rab*'.
// Seuls les lettres et chiffres sont gardés (les opérateurs + - " ( ) ~ < > tapés ne passent pas).
// null si le texte ne contient aucun mot.
function motifPleinTexte(texte) {
  const mots = String(texte ?? '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 10);
  if (mots.length === 0) return null;
  return mots
    .map((mot) => (mot.length >= LONGUEUR_MOT_MIN && !MOTS_VIDES.has(mot) ? `+${mot}*` : `${mot}*`))
    .join(' ');
}

// Condition SQL « le compte `colonneIdUtilisateur` correspond à la recherche » (nom, prénom, e-mail,
// téléphone), par l'index ft_utilisateur. { sql, params } ; sql = '1 = 0' si rien à chercher.
function conditionUtilisateur(colonneIdUtilisateur, texte) {
  const motif = motifPleinTexte(texte);
  if (!motif) return { sql: '1 = 0', params: [] };
  return {
    sql: `${colonneIdUtilisateur} IN (SELECT ru.id_utilisateur FROM utilisateur ru
            WHERE MATCH(ru.nom, ru.prenom, ru.email, ru.telephone) AGAINST (? IN BOOLEAN MODE))`,
    params: [motif],
  };
}

// Même chose pour un étudiant (colonne id_etudiant)
function conditionEtudiant(colonneIdEtudiant, texte) {
  const motif = motifPleinTexte(texte);
  if (!motif) return { sql: '1 = 0', params: [] };
  return {
    sql: `${colonneIdEtudiant} IN (SELECT re.id_etudiant FROM etudiant re
            JOIN utilisateur ru ON ru.id_utilisateur = re.id_utilisateur
            WHERE MATCH(ru.nom, ru.prenom, ru.email, ru.telephone) AGAINST (? IN BOOLEAN MODE))`,
    params: [motif],
  };
}

// Formation dont le nom contient le texte (la table formation reste petite : LIKE suffit)
function conditionFormation(colonneIdFormation, texte) {
  const motif = `%${String(texte).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return {
    sql: `${colonneIdFormation} IN (SELECT rf.id_formation FROM formation rf WHERE rf.nom LIKE ?)`,
    params: [motif],
  };
}

// « étudiant OU formation » : recherche des listes d'inscriptions, de paiements et d'échéances
function conditionEtudiantOuFormation(colonneIdEtudiant, colonneIdFormation, texte) {
  const etudiant = conditionEtudiant(colonneIdEtudiant, texte);
  const formation = conditionFormation(colonneIdFormation, texte);
  return { sql: `(${etudiant.sql} OR ${formation.sql})`, params: [...etudiant.params, ...formation.params] };
}

module.exports = {
  motifPleinTexte, conditionUtilisateur, conditionEtudiant, conditionFormation, conditionEtudiantOuFormation,
};
