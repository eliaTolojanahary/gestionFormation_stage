
import { useNotification } from './useNotification'

// Messages de notification prêts à l'emploi pour les événements courants
// (nouveau support, commentaire, mention, inscription confirmée, facture).
export function useNotifEvent() {
  const {
    envoyerNotifInApp,
    envoyerEmail,
    envoyerEmailPieceJointe,
  } = useNotification()

  function nouveauSupport(idDestinataire, titreSupport) {
    return envoyerNotifInApp({
      id_destinataire: idDestinataire,
      message: `Nouveau support déposé : ${titreSupport}`,
    })
  }

  function nouveauCommentaire(idDestinataire, auteur, titreSupport) {
    return envoyerNotifInApp({
      id_destinataire: idDestinataire,
      message: `${auteur} a ajouté un commentaire sur ${titreSupport}.`,
    })
  }

  function mentionCommentaire(idDestinataire, auteur, contenu) {
    return envoyerNotifInApp({
      id_destinataire: idDestinataire,
      message: `${auteur} vous a mentionné dans un commentaire : ${contenu}`,
    })
  }

  // Notification in-app + e-mail envoyés en parallèle
  function confirmationInscription({ idDestinataire, email, contenuHtml }) {
    return Promise.all([
      envoyerNotifInApp({
        id_destinataire: idDestinataire,
        message: 'Votre inscription a été confirmée.',
      }),
      envoyerEmail({
        id_destinataire: idDestinataire,
        email,
        sujet: 'Confirmation de votre inscription',
        contenuHtml,
      }),
    ])
  }

  // Notification in-app + e-mail avec la facture en pièce jointe (envoi multipart)
  function facturePaiement({ idDestinataire, email, contenuHtml, fichier, nomFichier }) {
    const formData = new FormData()
    formData.append('id_destinataire', idDestinataire)
    formData.append('email', email)
    formData.append('sujet', 'Facture de paiement')
    formData.append('contenuHtml', contenuHtml)
    formData.append('piece_jointe', fichier, nomFichier)

    return Promise.all([
      envoyerNotifInApp({
        id_destinataire: idDestinataire,
        message: 'Votre facture de paiement est prête.',
      }),
      envoyerEmailPieceJointe(formData),
    ])
  }

  return {
    nouveauSupport,
    nouveauCommentaire,
    mentionCommentaire,
    confirmationInscription,
    facturePaiement,
  }
}
