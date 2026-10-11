// Pagination et recherche des listes (étudiants, paiements, inscriptions, échéances).
//
// Rétrocompatible : sans `?page=`, une route renvoie toute la liste comme avant (application
// mobile, tableau de bord). Avec `?page=2&limite=20`, elle renvoie une page et le total :
//   { status, data: [...], pagination: { page, limite, total, pages } }

const LIMITE_DEFAUT = 20;
const LIMITE_MAX = 100;

// { page, limite, offset } depuis la query string, ou null si la liste n'est pas paginée
function lirePagination(query = {}) {
  if (query.page === undefined) return null;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limite = Math.min(LIMITE_MAX, Math.max(1, Number.parseInt(query.limite, 10) || LIMITE_DEFAUT));
  return { page, limite, offset: (page - 1) * limite };
}

// "%texte%" pour LIKE ; % et _ tapés par l'utilisateur sont cherchés tels quels
function motifLike(texte) {
  return `%${String(texte).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// Texte de recherche nettoyé (100 caractères max), ou null s'il est vide
function texteRecherche(valeur) {
  const texte = String(valeur ?? '').trim().slice(0, 100);
  return texte || null;
}

// Fin de requête SQL : " LIMIT ? OFFSET ?" (ou rien si la liste n'est pas paginée)
function clauseLimite(pagination) {
  return pagination
    ? { sql: ' LIMIT ? OFFSET ?', params: [pagination.limite, pagination.offset] }
    : { sql: '', params: [] };
}

// Corps de réponse d'une liste paginée ; `extra` = champs en plus (ex. compteurs)
function reponsePaginee({ lignes, total, ...extra }, pagination) {
  return {
    status: 'success',
    data: lignes,
    pagination: {
      page: pagination.page,
      limite: pagination.limite,
      total,
      pages: Math.max(1, Math.ceil(total / pagination.limite)),
    },
    ...extra,
  };
}

module.exports = { lirePagination, motifLike, texteRecherche, clauseLimite, reponsePaginee, LIMITE_DEFAUT, LIMITE_MAX };
