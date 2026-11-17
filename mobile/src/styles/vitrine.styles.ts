// styles/vitrine.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

// Couvertures des formations (façon Wattpad) : une couleur par carte, en boucle
export const COULEURS_COUVERTURE = ['#072E4C', '#0F766E', '#7C3AED', '#B45309', '#BE185D', '#1D4ED8'];

// Texte secondaire de la vitrine : la couleur du texte principal un peu atténuée, plus lisible que
// palette.textMuted (gris pâle, peu contrasté sur fond blanc). Couleur non hexadécimale : textMuted.
function attenuer(couleur: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(couleur) ? `${couleur}C2` : fallback;
}


// Interligne confortable : 1,45 fois la taille du texte
const interligne = (taille: number) => Math.round(taille * 1.45);

/** Styles de la vitrine publique et de l'inscription en ligne */
export const createVitrineStyles = ({ palette: t, fonts: f, density: d }: ThemeTokens) => {
  const secondaire = attenuer(t.textMain, t.textMuted);
  const titreSection = f.xl - 3;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.pageBg },
    scroll: { paddingBottom: 120 },
    centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

    // ─── Bandeau d'accueil ───
    // Bandeau « Découvrir » : image de neurones + voile bleu nuit pour garder le texte lisible.
    // Il passe sous la barre d'état : paddingTop = insets.top + 18 (calculé dans decouvrir.tsx)
    hero: {
      backgroundColor: '#04142A',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 30,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
    },
    // Voile un peu plus sombre qu'avant : le texte blanc reste lisible sur n'importe quelle photo
    heroVoile: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(4, 20, 42, 0.66)' },
    heroEtiquette: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      marginTop: 26,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(125, 211, 252, 0.5)',
      backgroundColor: 'rgba(125, 211, 252, 0.14)',
    },
    heroEtiquetteTexte: { color: '#E0F2FE', fontSize: f.sm, fontWeight: '700' },
    heroTitre: {
      color: '#FFFFFF',
      fontSize: 40,
      fontWeight: '900',
      letterSpacing: 0.5,
      marginTop: 10,
      textShadowColor: 'rgba(56, 189, 248, 0.55)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 18,
    },
    heroHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroMarque: { flexDirection: 'row', alignItems: 'center' },
    heroLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFFFFF', marginRight: 10 },
    heroNom: { color: '#FFFFFF', fontSize: f.lg, fontWeight: '800', letterSpacing: 0.3 },
    heroConnexion: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.7)',
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    heroConnexionTexte: { color: '#FFFFFF', fontSize: f.sm, fontWeight: '700' },
    heroSlogan: { color: '#FFFFFF', fontSize: f.xl - 2, lineHeight: interligne(f.xl - 2), fontWeight: '800', marginTop: 6 },
    heroDescription: { color: '#E2E8F0', fontSize: f.md, lineHeight: interligne(f.md), marginTop: 8 },
    heroChiffres: { flexDirection: 'row', gap: 10, marginTop: 20 },
    // Chiffres clés : une pastille de couleur chacune (bleu : formations, vert : formateurs reconnus)
    heroChiffre: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
    },
    heroChiffreFormations: { backgroundColor: '#0284C7' },
    heroChiffreFormateurs: { backgroundColor: '#15803D' },
    heroChiffreValeur: { color: '#FFFFFF', fontSize: f.xl - 2, fontWeight: '800' },
    heroChiffreLabel: { color: '#FFFFFF', fontSize: f.sm, fontWeight: '600', marginTop: 1 },

    // ─── Sections ───
    section: { marginTop: 30 },
    sectionTitre: {
      fontSize: titreSection,
      lineHeight: interligne(titreSection),
      fontWeight: '800',
      color: t.heading,
      paddingHorizontal: 20,
      letterSpacing: -0.2,
    },
    sectionSousTitre: {
      fontSize: f.sm,
      lineHeight: interligne(f.sm),
      color: secondaire,
      paddingHorizontal: 20,
      marginTop: 2,
    },
    // paddingBottom : place pour l'ombre des cartes
    carrousel: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, gap: 14 },
    // Indicateur en bout de carrousel pendant le chargement des suivants
    carrouselSuite: { width: 48, alignSelf: 'center' },

    // ─── Couverture d'une formation ───
    couverture: { width: 164 },
    couvertureImage: {
      height: 218,
      borderRadius: 16,
      padding: 12,
      justifyContent: 'space-between',
      overflow: 'hidden',
    },
    couvertureImageFond: { borderRadius: 16 },
    // Voile sombre sur la photo : le nom de la formation reste lisible
    couvertureVoile: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(4, 20, 42, 0.48)' },
    couvertureTarif: {
      alignSelf: 'flex-start',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    couvertureTarifTexte: { color: '#072E4C', fontSize: f.sm, fontWeight: '800' },
    couvertureDuree: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    couvertureDureeTexte: { color: '#FFFFFF', fontSize: f.sm, fontWeight: '600' },
    couvertureInitiales: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', opacity: 0.9 },
    couvertureNomImage: {
      color: '#FFFFFF',
      fontSize: f.md + 1,
      lineHeight: interligne(f.md + 1),
      fontWeight: '800',
      textShadowColor: 'rgba(0, 0, 0, 0.55)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    couvertureSelection: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(7, 46, 76, 0.15)',
    },
    couvertureTitre: { fontSize: f.md, fontWeight: '800', color: t.heading, marginTop: 10 },
    couvertureMeta: { fontSize: f.sm, color: secondaire, marginTop: 3 },
    couvertureBadgeLigne: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    couvertureBadge: { fontSize: f.sm, color: t.success, fontWeight: '700' },

    // ─── Formateurs compétents ───
    formateurCarte: {
      width: 176,
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: d.pad + 4,
      borderWidth: 1,
      borderColor: t.line,
    },
    formateurAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    formateurInitiales: { color: t.accent, fontWeight: '800', fontSize: f.lg },
    formateurNom: { fontSize: f.md, fontWeight: '800', color: t.heading },
    formateurTaux: { fontSize: f.sm, color: t.success, fontWeight: '700', marginTop: 3 },
    formateurFormations: { fontSize: f.sm, lineHeight: interligne(f.sm), color: secondaire, marginTop: 6 },

    // ─── Engagement et contacts ───
    carte: {
      marginHorizontal: 20,
      marginTop: 14,
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: d.pad + 6,
      borderWidth: 1,
      borderColor: t.line,
    },
    engagementLigne: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    // Pastille de couleur autour de chaque icône d'engagement
    engagementIcone: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    engagementTexte: { flex: 1, fontSize: f.md, lineHeight: interligne(f.md), color: t.textMain, marginLeft: 12 },
    contactsLigne: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 14 },
    contactBouton: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: t.line,
    },
    contactTexte: { fontSize: f.sm, fontWeight: '700', color: t.heading, marginTop: 6 },
    contactInfo: {
      fontSize: f.sm,
      lineHeight: interligne(f.sm),
      color: secondaire,
      paddingHorizontal: 20,
      marginTop: 12,
      textAlign: 'center',
    },

    // ─── Barre de sélection ───
    barreSelection: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.heading,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      elevation: 6,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
    barreTexte: { color: t.pageBg, fontSize: f.md, fontWeight: '700', flex: 1, marginRight: 10 },
    barreBouton: { backgroundColor: t.warning, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
    barreBoutonTexte: { color: '#1F2937', fontWeight: '800', fontSize: f.md },

    // ─── Fenêtres (détail, inscription) ───
    modalFond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalFeuille: {
      maxHeight: '92%',
      backgroundColor: t.pageBg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 10,
    },
    modalPoignee: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: t.line,
      marginBottom: 10,
    },
    modalEntete: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.line,
    },
    modalTitre: { fontSize: f.xl - 3, fontWeight: '800', color: t.heading, flex: 1, marginRight: 10 },
    modalContenu: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 },
    detailBandeau: {
      height: 170,
      borderRadius: 16,
      padding: 14,
      justifyContent: 'flex-end',
      marginBottom: 16,
      overflow: 'hidden',
    },
    detailBandeauTexte: { color: '#FFFFFF', fontSize: f.xl - 3, fontWeight: '800' },
    // Bloc des informations clés (formateur, durée, tarif) : une carte, séparée de la description
    detailInfos: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 4,
    },
    detailLigne: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    detailTexte: { fontSize: f.md, lineHeight: interligne(f.md), color: t.textMain, marginLeft: 10, flex: 1 },
    detailTitre: { fontSize: f.lg, fontWeight: '800', color: t.heading, marginTop: 20, marginBottom: 8 },
    detailParagraphe: { fontSize: f.md, lineHeight: interligne(f.md) + 2, color: t.textMain },
    detailBoutons: { flexDirection: 'row', gap: 10, marginTop: 24 },

    // ─── Formulaire d'inscription ───
    etape: { fontSize: f.lg, fontWeight: '800', color: t.heading, marginTop: 22, marginBottom: 10 },
    choixCarte: {
      backgroundColor: t.surface,
      borderRadius: 14,
      padding: d.pad + 2,
      borderWidth: 1,
      borderColor: t.line,
      marginBottom: 10,
    },
    choixHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    choixNom: { fontSize: f.md, fontWeight: '800', color: t.heading, flex: 1, marginRight: 8 },
    choixMeta: { fontSize: f.sm, lineHeight: interligne(f.sm), color: secondaire, marginTop: 4 },
    puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    puce: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      backgroundColor: t.surfaceAlt,
    },
    puceActive: { borderColor: t.accent, backgroundColor: t.accentSoft },
    puceTexte: { fontSize: f.sm, fontWeight: '700', color: secondaire },
    puceTexteActive: { color: t.accent },
    champLabel: { fontSize: f.sm, fontWeight: '700', color: t.textMain, marginBottom: 6, marginTop: 12 },
    champ: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: f.md,
      color: t.textMain,
    },
    champMdp: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 12,
      paddingHorizontal: 14,
      gap: 8,
    },
    champMdpTexte: { flex: 1, paddingVertical: 12, fontSize: f.md, color: t.textMain },
    champErreur: { borderColor: t.danger },
    champErreurTexte: { color: t.danger, fontSize: f.sm, marginTop: 5 },
    total: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: t.accentSoft,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginTop: 6,
    },
    totalLabel: { fontSize: f.md, color: t.accent, fontWeight: '700' },
    totalValeur: { fontSize: f.lg, color: t.accent, fontWeight: '800' },
    aide: { fontSize: f.sm, color: secondaire, marginTop: 8, lineHeight: interligne(f.sm) },
    erreur: { color: t.danger, fontSize: f.md, marginTop: 14, textAlign: 'center', paddingHorizontal: 20 },

    // Case « J'accepte les conditions »
    caseLigne: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 20,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      backgroundColor: t.surface,
    },
    caseTexte: { flex: 1, marginLeft: 10, fontSize: f.md, color: t.textMain, lineHeight: interligne(f.md) },
    caseLien: { color: t.accent, fontWeight: '700', textDecorationLine: 'underline' },
    conditionsFeuille: { flex: 1, backgroundColor: t.pageBg, marginTop: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
    conditionsBoutons: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.surface },

    // ─── Boutons ───
    boutonPrincipal: {
      flex: 1,
      backgroundColor: t.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    boutonPrincipalTexte: { color: t.onAccent, fontWeight: '800', fontSize: f.md },
    boutonSecondaire: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: t.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: t.surface,
    },
    boutonSecondaireTexte: { color: t.accent, fontWeight: '800', fontSize: f.md },
    boutonDesactive: { opacity: 0.55 },

    // ─── Succès ───
    succesIcone: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: t.successSoft,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginTop: 10,
    },
    succesTitre: { fontSize: f.xl, fontWeight: '800', color: t.heading, textAlign: 'center', marginTop: 16 },
    succesTexte: { fontSize: f.md, color: t.textMain, textAlign: 'center', marginTop: 8, lineHeight: interligne(f.md) },
    texteMuet: { fontSize: f.md, color: secondaire, textAlign: 'center' },
  });
};
