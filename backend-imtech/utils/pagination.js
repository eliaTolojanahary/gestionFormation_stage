// Pagination et recherche des listes (étudiants, paiements, inscriptions, échéances, supports, commentaires).
//
// Sans `?page=` (application mobile, export CSV), une route renvoie la liste entière, plafonnée à
// LIMITE_EXPORT lignes : au-delà, `tronque: true` (le navigateur ne peut pas tout charger, et Excel
// s'arrête de toute façon vers un million de lignes) :
//   { status, data: [...], tronque?: true, limite_export?: 10000 }
// Avec `?page=2&limite=10`, elle renvoie une page et le total :
//   { status, data: [...], pagination: { page, limite, total, pages } }
//
// Listes qu'on fait défiler (supports, commentaires) : curseur `?limite=5&avant=<id>`. On demande
// les éléments plus anciens que le dernier reçu ; rien ne se décale quand un élément est ajouté :
//   { status, data: [...], curseur: { limite, suivant, total } }   (suivant = null : fin de la liste)

const LIMITE_DEFAUT = 10;
const LIMITE_MAX = 100;
const LIMITE_EXPORT = 10000;

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

// Fin de requête SQL : " LIMIT ? OFFSET ?" ; liste non paginée : LIMITE_EXPORT + 1 lignes au plus
// (la ligne en trop indique seulement que la liste est tronquée, voir reponseListe)
function clauseLimite(pagination) {
  return pagination
    ? { sql: ' LIMIT ? OFFSET ?', params: [pagination.limite, pagination.offset] }
    : { sql: ' LIMIT ?', params: [LIMITE_EXPORT + 1] };
}

// Corps de réponse d'une liste non paginée (lue avec clauseLimite(null))
function reponseListe(lignes) {
  if (lignes.length <= LIMITE_EXPORT) return { status: 'success', data: lignes };
  return { status: 'success', data: lignes.slice(0, LIMITE_EXPORT), tronque: true, limite_export: LIMITE_EXPORT };
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

// { limite, avant } depuis la query string, ou null sans ?limite ni ?avant (toute la liste)
function lireCurseur(query = {}) {
  if (query.limite === undefined && query.avant === undefined) return null;
  const limite = Math.min(LIMITE_MAX, Math.max(1, Number.parseInt(query.limite, 10) || LIMITE_DEFAUT));
  const avant = Number.parseInt(query.avant, 10);
  return { limite, avant: avant > 0 ? avant : null };
}

// Fin de requête SQL pour un curseur, liste triée par (date, id) décroissants :
// éléments plus anciens que la ligne `avant`, puis `limite + 1` lignes (la ligne en trop
// indique seulement qu'il reste une suite). Sans curseur : rien (toute la liste).
function clauseCurseur(curseur, { table, alias, date, id }) {
  if (!curseur) return { where: '', whereParams: [], limite: '', limiteParams: [] };
  return {
    where: curseur.avant
      ? ` AND (${alias}.${date}, ${alias}.${id}) < (SELECT ${date}, ${id} FROM ${table} WHERE ${id} = ?)`
      : '',
    whereParams: curseur.avant ? [curseur.avant] : [],
    limite: ' LIMIT ?',
    limiteParams: [curseur.limite + 1],
  };
}

// Corps de réponse d'une liste lue au curseur ; `cle` = colonne id qui sert de curseur
function reponseCurseur({ lignes, total, ...extra }, curseur, cle) {
  const page = lignes.slice(0, curseur.limite);
  return {
    status: 'success',
    data: page,
    curseur: {
      limite: curseur.limite,
      suivant: lignes.length > curseur.limite ? page[page.length - 1][cle] : null,
      total,
    },
    ...extra,
  };
}

module.exports = {
  lirePagination, motifLike, texteRecherche, clauseLimite, reponsePaginee, reponseListe,
  lireCurseur, clauseCurseur, reponseCurseur, LIMITE_DEFAUT, LIMITE_MAX, LIMITE_EXPORT,
};
