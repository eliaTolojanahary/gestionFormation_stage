
import { useNotification } from './useNotification'

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

  function relancePaiement({ idDestinataire, email, contenuHtml }) {
    return Promise.all([
      envoyerNotifInApp({
        id_destinataire: idDestinataire,
        message: 'Un paiement est à relancer bientôt.',
      }),
      envoyerEmail({
        id_destinataire: idDestinataire,
        email,
        sujet: 'Relance de paiement',
        contenuHtml,
      }),
    ])
  }

  function attestationPrete({ idDestinataire, email, contenuHtml, fichier, nomFichier }) {
    const formData = new FormData()
    formData.append('id_destinataire', idDestinataire)
    formData.append('email', email)
    formData.append('sujet', 'Votre attestation est prête')
    formData.append('contenuHtml', contenuHtml)
    formData.append('piece_jointe', fichier, nomFichier)

    return envoyerEmailPieceJointe(formData)
  }

  return {
    nouveauSupport,
    nouveauCommentaire,
    mentionCommentaire,
    confirmationInscription,
    facturePaiement,
    relancePaiement,
    attestationPrete,
  }
}
