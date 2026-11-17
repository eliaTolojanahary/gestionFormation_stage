// constants/conditions.ts
//
// Texte des Conditions d'utilisation et de la Politique de confidentialité de l'app mobile.
// Les règles reprennent celles du serveur (classementService.js, attestationService.js,
// paiementService.js) : si une règle change côté serveur, mettre ce texte à jour ET
// augmenter VERSION_CONDITIONS pour redemander l'accord à tout le monde.

/** Version du texte : la changer redemande l'accord à chaque utilisateur */
export const VERSION_CONDITIONS = '2';

/** Date affichée en tête du texte */
export const DATE_CONDITIONS = '12 novembre 2026';

export interface SectionConditions {
  titre: string;
  /** Paragraphes ; une ligne qui commence par « • » est affichée comme puce */
  lignes: string[];
}

export const CONDITIONS_UTILISATION: SectionConditions[] = [
  {
    titre: '1. Objet',
    lignes: [
      "L'application IMTECH INFO vous permet de suivre vos formations, vos supports de cours, vos échéances et paiements, votre dossier et votre attestation.",
      "En acceptant, vous vous engagez à respecter les règles ci-dessous, en particulier celles sur la présence, le paiement, la note de formation et l'attestation.",
    ],
  },
  {
    titre: '2. Votre compte',
    lignes: [
      'Votre compte est personnel : ne communiquez jamais votre mot de passe.',
      "Vous pouvez voir vos sessions ouvertes et déconnecter les autres appareils depuis Paramètres > Sécurité.",
      "Un compte peut être désactivé par l'administration ; il n'est alors plus utilisable.",
    ],
  },
  {
    titre: '3. Présence',
    lignes: [
      "La présence est enregistrée automatiquement : un jour compte comme présence quand vous ouvrez un cours (texte, PDF, image, audio ou vidéo), y réagissez ou le commentez (une seule fois par jour).",
      "Ouvrir seulement l'application, votre profil, vos paiements ou l'assistance ne compte pas comme présence.",
      'Les jours de cours sont les jours du lundi au vendredi, du début de la formation jusqu\'à aujourd\'hui.',
      'Votre taux de présence retire des points à votre note de formation :',
      '• 90 % ou plus : aucun point retiré',
      '• de 75 % à 90 % : −1 point',
      '• de 50 % à 75 % : −2 points',
      '• moins de 50 % : −4 points',
    ],
  },
  {
    titre: '4. Paiement',
    lignes: [
      "Le prix de la formation est divisé en échéances (tranches) fixées à l'inscription. Le montant à payer est toujours calculé par le serveur : c'est le reste à payer de l'échéance.",
      "Un seul paiement peut être en attente par échéance. Il est ensuite validé ou refusé par l'Accueil.",
      "C'est la date de votre paiement (Mvola ou guichet) qui compte, pas la date de validation. Un paiement refusé n'est pas pris en compte.",
      'Le retard de paiement retire des points à votre note de formation :',
      "• échéance payée au plus tard le jour prévu : aucun point retiré",
      '• échéance payée le lendemain : −1 point',
      "• échéance non réglée le lendemain (même si elle est payée plus tard) : −2 points",
      '• au total, le paiement retire au plus 4 points',
      "L'Accueil peut vous envoyer un rappel (notification et e-mail) avant une échéance. Un paiement déjà facturé ne peut plus être modifié : toute erreur se règle avec l'Accueil.",
    ],
  },
  {
    titre: '5. Note de formation (sur 20)',
    lignes: [
      'Votre note de formation est composée de deux parties :',
      "• la note système sur 10 : vous partez de 10, puis on retire les points de présence et de paiement (jamais en dessous de 0) ;",
      '• la note de présentation sur 10, attribuée par votre formateur.',
      'Exemple : présence de 80 % (−1) et une échéance payée en retard (−1) donnent 8/10 ; avec 7/10 en présentation, la note est 15/20.',
      "La note est recalculée juste avant l'attestation. Une fois l'attestation délivrée, elle ne change plus.",
    ],
  },
  {
    titre: '6. Attestation',
    lignes: [
      "L'attestation est délivrée à la fin de la formation, seulement quand ces trois conditions sont remplies :",
      '• la note de présentation a été attribuée par le formateur ;',
      "• vous avez écrit votre commentaire sur le formateur dans l'application (ouvert 2 jours avant la fin ; tant qu'il n'est pas écrit, l'attestation reste en attente) ;",
      '• il ne reste rien à payer sur votre inscription.',
      "Une seule attestation est délivrée par inscription. Vous la recevez dans l'application et par e-mail (PDF) ; votre inscription passe alors « Réussie ».",
      "L'attestation porte un QR code : n'importe qui peut le scanner pour vérifier qu'elle est authentique.",
    ],
  },
  {
    titre: '7. Supports, commentaires et réactions',
    lignes: [
      'Les supports de cours sont réservés à votre usage personnel : ne les diffusez pas.',
      'Vos commentaires et réactions doivent rester respectueux.',
    ],
  },
  {
    titre: '8. Modification des conditions',
    lignes: [
      "Si ces conditions changent, l'application vous demandera de les accepter à nouveau.",
    ],
  },
];

export const POLITIQUE_CONFIDENTIALITE: SectionConditions[] = [
  {
    titre: '1. Données collectées',
    lignes: [
      '• Identité : nom, prénom, e-mail, téléphone, photo de profil ;',
      '• Dossier : pièces que vous déposez ;',
      '• Formation : inscriptions, échéances, paiements (mode, référence Mvola), notes ;',
      '• Présence : les jours où vous ouvrez un cours, y réagissez ou le commentez ;',
      '• Activité : commentaires, réactions, demandes d\'assistance ;',
      '• Sécurité : sessions ouvertes (appareil, système) et date de dernière connexion.',
    ],
  },
  {
    titre: '2. Pourquoi nous les utilisons',
    lignes: [
      '• gérer votre inscription et votre dossier ;',
      '• suivre vos échéances et valider vos paiements ;',
      '• calculer votre présence et votre note de formation ;',
      "• vous accompagner pendant la formation : l'équipe suit votre activité et peut vous contacter si vous semblez en difficulté ;",
      '• préparer et envoyer votre attestation ;',
      '• vous envoyer des notifications et des e-mails (rappels, validations, attestation).',
    ],
  },
  {
    titre: '3. Qui peut les voir',
    lignes: [
      "• le personnel d'IMTECH INFO (Accueil et administrateurs) ;",
      '• votre formateur voit le classement de sa formation et attribue la note de présentation ; il ne voit pas votre commentaire sur lui ;',
      "• toute personne qui scanne le QR code de votre attestation voit les informations imprimées sur l'attestation.",
      "Vos données ne sont ni vendues ni transmises à d'autres organismes.",
    ],
  },
  {
    titre: '4. Sécurité et conservation',
    lignes: [
      'Votre mot de passe est enregistré chiffré. Vous pouvez fermer vos sessions à distance.',
      "Les données sont conservées pour le suivi de votre formation et de votre attestation. Un élément supprimé par l'administration est désactivé (et peut être réactivé), pas effacé.",
    ],
  },
  {
    titre: '5. Sur votre téléphone',
    lignes: [
      "L'application garde sur le téléphone votre jeton de connexion, vos préférences d'affichage et votre accord à ces conditions. Ils sont effacés à la déconnexion (sauf les préférences et l'accord).",
    ],
  },
  {
    titre: '6. Vos droits',
    lignes: [
      "Vous pouvez consulter et corriger vos informations depuis votre Profil. Pour toute autre demande (accès, correction, suppression), écrivez-nous depuis la page Assistance.",
    ],
  },
];
