// Désactivation / réactivation des étudiants, formations, inscriptions, échéances et paiements
// (règles dans services/etatService.js).
const etatService = require('../services/etatService');

// Fabrique un handler : appelle `action(req.params.id)` puis renvoie `message`
const handler = (action, message) => async (req, res) => {
  await action(req.params.id);
  res.json({ status: 'success', message });
};

module.exports = {
  reactiverEtudiant: handler(etatService.reactiverEtudiant, 'Étudiant réactivé.'),
  reactiverFormation: handler(etatService.reactiverFormation, 'Formation réactivée.'),
  reactiverInscription: handler(etatService.reactiverInscription, 'Inscription réactivée.'),
  desactiverEcheance: handler(etatService.desactiverEcheance, 'Échéance désactivée.'),
  reactiverEcheance: handler(etatService.reactiverEcheance, 'Échéance réactivée.'),
  desactiverPaiement: handler(etatService.desactiverPaiement, 'Paiement désactivé.'),
  reactiverPaiement: handler(etatService.reactiverPaiement, 'Paiement réactivé.'),
  reactiverDocument: handler(etatService.reactiverDocument, 'Document réactivé.'),
  reactiverUtilisateur: handler(etatService.reactiverUtilisateur, 'Compte réactivé.'),
  reactiverSupport: async (req, res) => {
    await etatService.reactiverSupport(req.params.id, req.user);
    res.json({ status: 'success', message: 'Support réactivé.' });
  },
};
