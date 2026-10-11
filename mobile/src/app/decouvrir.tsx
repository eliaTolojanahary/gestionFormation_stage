// app/decouvrir.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ImageNette } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { BadgeCheck, CalendarClock, Check, Clock, Mail, MessageCircle, ShieldCheck, Sparkles, Users } from 'lucide-react-native';
import { FormationPublique, useVitrine } from '@/hooks/use-vitrine';
import { COULEURS_COUVERTURE, createVitrineStyles } from '@/styles/vitrine.styles';
import { useThemedStyles } from '@/context/SettingsContext';
import { FormationDetailModal } from '@/components/vitrine/formation-detail-modal';
import { InscriptionModal } from '@/components/vitrine/inscription-modal';
import { formatAriary, initialesFormation } from '@/components/vitrine/format-vitrine';
import { alerte } from '@/utils/alert';
import { getFileUrl } from '@/utils/format';

// Fond du bandeau par défaut : réseau de neurones (image du domaine public, Wikimedia Commons).
// Le Super Admin peut le remplacer depuis le web (Paramètres > Apparence) : presentation.fond.
const FOND_DECOUVRIR = require('../../assets/images/fond-decouvrir.jpg');

// Vitrine pour une personne non inscrite (façon Wattpad) : formations en couvertures,
// formateurs compétents, engagement d'IMTECH INFO et contacts. Bandeau « Découvrir » sur fond de
// réseau de neurones ; chaque formation a sa photo de couverture (formation.image). Une formation qui intéresse
// ouvre sa fiche puis l'inscription ; plusieurs formations peuvent être choisies d'un coup.
export default function DecouvrirScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createVitrineStyles);
  const insets = useSafeAreaInsets();
  const { vitrine, chargement, erreur, chargerVitrine } = useVitrine();

  const [formationOuverte, setFormationOuverte] = useState<FormationPublique | null>(null);
  const [selection, setSelection] = useState<number[]>([]);
  const [inscriptionOuverte, setInscriptionOuverte] = useState(false);

  useEffect(() => {
    chargerVitrine();
  }, [chargerVitrine]);

  const formations = useMemo(() => vitrine?.formations ?? [], [vitrine]);
  const couleurDe = (id: number) =>
    COULEURS_COUVERTURE[Math.max(formations.findIndex((f) => f.id_formation === id), 0) % COULEURS_COUVERTURE.length];
  const formationsChoisies = formations.filter((f) => selection.includes(f.id_formation));

  function basculerSelection(id: number) {
    setSelection((actuelle) => (actuelle.includes(id) ? actuelle.filter((x) => x !== id) : [...actuelle, id]));
  }

  // « S'inscrire » depuis une fiche : la formation est ajoutée à la sélection, puis l'inscription s'ouvre
  function inscrireDepuisFiche(formation: FormationPublique) {
    setSelection((actuelle) => (actuelle.includes(formation.id_formation) ? actuelle : [...actuelle, formation.id_formation]));
    setFormationOuverte(null);
    setInscriptionOuverte(true);
  }

  function allerConnexion(email?: string) {
    setInscriptionOuverte(false);
    router.replace({ pathname: '/login', params: email ? { email } : {} } as any);
  }

  async function ouvrirLien(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      alerte('Lien indisponible', "Impossible d'ouvrir ce contact sur cet appareil.");
    }
  }

  if (chargement && !vitrine) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color="#072E4C" />
        </View>
      </SafeAreaView>
    );
  }

  const contacts = vitrine?.contacts;
  const fondChoisi = getFileUrl(vitrine?.presentation.fond);
  const competents = vitrine?.formateurs_competents ?? [];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Texte clair sur le bandeau sombre, qui passe sous la barre d'état */}
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={chargement} onRefresh={chargerVitrine} />}
      >
        {/* ─── Bandeau ─── */}
        <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          {/* expo-image : mise à l'échelle lissée, l'image couvre tout le bandeau (barre d'état comprise) */}
          <ImageNette
            source={fondChoisi ? { uri: fondChoisi } : FOND_DECOUVRIR}
            placeholder={FOND_DECOUVRIR}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="center"
            transition={200}
          />
          <View style={styles.heroVoile} />
          <View style={styles.heroHaut}>
            <View style={styles.heroMarque}>
              <Image source={require('../../assets/logoImtech.png')} style={styles.heroLogo} resizeMode="contain" />
              <Text style={styles.heroNom}>IMTECH INFO</Text>
            </View>
            <TouchableOpacity style={styles.heroConnexion} onPress={() => allerConnexion()}>
              <Text style={styles.heroConnexionTexte}>Se connecter</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroEtiquette}>
            <Sparkles size={13} color="#7DD3FC" />
            <Text style={styles.heroEtiquetteTexte}>Centre de formation en informatique</Text>
          </View>
          <Text style={styles.heroTitre}>Découvrir</Text>
          <Text style={styles.heroSlogan}>{vitrine?.presentation.slogan}</Text>
          <Text style={styles.heroDescription}>{vitrine?.presentation.description}</Text>
          <View style={styles.heroChiffres}>
            <View style={styles.heroChiffre}>
              <Text style={styles.heroChiffreValeur}>{formations.length}</Text>
              <Text style={styles.heroChiffreLabel}>formations</Text>
            </View>
            <View style={styles.heroChiffre}>
              <Text style={styles.heroChiffreValeur}>{competents.length}</Text>
              <Text style={styles.heroChiffreLabel}>formateurs reconnus</Text>
            </View>
          </View>
        </View>

        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

        {/* ─── Formations disponibles (couvertures) ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Formations disponibles</Text>
          <Text style={styles.sectionSousTitre}>Touchez une formation pour la découvrir, ou cochez-en plusieurs.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrousel}>
            {formations.map((f) => {
              const choisie = selection.includes(f.id_formation);
              return (
                <TouchableOpacity
                  key={f.id_formation}
                  style={styles.couverture}
                  activeOpacity={0.85}
                  onPress={() => setFormationOuverte(f)}
                >
                  {/* Photo de couverture ; sans image, couleur + initiales */}
                  <ImageBackground
                    source={f.image ? { uri: getFileUrl(f.image) || undefined } : undefined}
                    style={[styles.couvertureImage, { backgroundColor: couleurDe(f.id_formation) }]}
                    imageStyle={styles.couvertureImageFond}
                    resizeMode="cover"
                  >
                    {f.image ? <View style={styles.couvertureVoile} /> : null}
                    {f.image ? (
                      <View style={styles.couvertureTarif}>
                        <Text style={styles.couvertureTarifTexte}>{formatAriary(f.tarif)}</Text>
                      </View>
                    ) : (
                      <Text style={styles.couvertureInitiales}>{initialesFormation(f.nom)}</Text>
                    )}
                    <View>
                      <Text style={styles.couvertureNomImage} numberOfLines={3}>{f.nom}</Text>
                      <View style={styles.couvertureDuree}>
                        <Clock size={11} color="#FFFFFF" />
                        <Text style={styles.couvertureDureeTexte}>
                          {f.duree ? f.duree : `${f.duree_jours} jours`}
                        </Text>
                      </View>
                    </View>
                  </ImageBackground>
                  <TouchableOpacity
                    style={styles.couvertureSelection}
                    onPress={() => basculerSelection(f.id_formation)}
                    accessibilityLabel={choisie ? `Retirer ${f.nom}` : `Choisir ${f.nom}`}
                  >
                    {choisie ? <Check size={15} color="#2E7D32" /> : <Text style={{ fontWeight: '800' }}>+</Text>}
                  </TouchableOpacity>
                  <Text style={styles.couvertureTitre} numberOfLines={1}>{f.nom}</Text>
                  <Text style={styles.couvertureMeta} numberOfLines={1}>
                    {f.prenom_formateur} {f.nom_formateur}{f.image ? '' : ` · ${formatAriary(f.tarif)}`}
                  </Text>
                  {f.avis_formateur === 'competent' ? (
                    <Text style={styles.couvertureBadge}>★ Formateur compétent</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── Formateurs compétents ─── */}
        {competents.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Nos formateurs les mieux notés</Text>
            <Text style={styles.sectionSousTitre}>Selon les avis des étudiants sur leurs cours.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrousel}>
              {competents.map((f) => (
                <View key={f.id_formateur} style={styles.formateurCarte}>
                  <View style={styles.formateurAvatar}>
                    <Text style={styles.formateurInitiales}>{`${f.prenom[0] || ''}${f.nom[0] || ''}`.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.formateurNom} numberOfLines={1}>{f.prenom} {f.nom}</Text>
                  <Text style={styles.formateurTaux}>{f.taux_positif} % d’avis positifs</Text>
                  <Text style={styles.formateurFormations} numberOfLines={2}>{f.formations.join(', ')}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ─── Engagement ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Notre engagement</Text>
          <View style={styles.carte}>
            <View style={styles.engagementLigne}>
              <CalendarClock size={18} color="#072E4C" />
              <Text style={styles.engagementTexte}>
                Chaque formateur s’engage sur sa disponibilité (détail dans la fiche de chaque formation).
              </Text>
            </View>
            <View style={styles.engagementLigne}>
              <Users size={18} color="#072E4C" />
              <Text style={styles.engagementTexte}>
                Supports de cours, questions et réponses directement dans l’application.
              </Text>
            </View>
            <View style={styles.engagementLigne}>
              <BadgeCheck size={18} color="#072E4C" />
              <Text style={styles.engagementTexte}>Attestation de fin de formation vérifiable par QR code.</Text>
            </View>
            <View style={[styles.engagementLigne, { marginBottom: 0 }]}>
              <ShieldCheck size={18} color="#072E4C" />
              <Text style={styles.engagementTexte}>Paiement en 1 à 4 tranches, chaque paiement vérifié par l’accueil.</Text>
            </View>
          </View>
        </View>

        {/* ─── Contacts ─── */}
        {contacts ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Nous contacter</Text>
            <View style={styles.contactsLigne}>
              <TouchableOpacity style={styles.contactBouton} onPress={() => ouvrirLien(contacts.facebook)}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#1877F2' }}>f</Text>
                <Text style={styles.contactTexte}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactBouton} onPress={() => ouvrirLien(`mailto:${contacts.email}`)}>
                <Mail size={20} color="#072E4C" />
                <Text style={styles.contactTexte}>E-mail</Text>
              </TouchableOpacity>
              {contacts.whatsapp ? (
                <TouchableOpacity
                  style={styles.contactBouton}
                  onPress={() => ouvrirLien(`https://wa.me/${contacts.whatsapp}`)}
                >
                  <MessageCircle size={20} color="#25D366" />
                  <Text style={styles.contactTexte}>WhatsApp</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.contactInfo}>
              {[contacts.email, contacts.telephone, contacts.adresse].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ─── Barre de sélection (inscription multiple) ─── */}
      {selection.length > 0 ? (
        <View style={styles.barreSelection}>
          <Text style={styles.barreTexte} numberOfLines={1}>
            {selection.length} formation(s) choisie(s)
          </Text>
          <TouchableOpacity style={styles.barreBouton} onPress={() => setInscriptionOuverte(true)}>
            <Text style={styles.barreBoutonTexte}>S’inscrire</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FormationDetailModal
        formation={formationOuverte}
        couleur={formationOuverte ? couleurDe(formationOuverte.id_formation) : COULEURS_COUVERTURE[0]}
        selectionnee={!!formationOuverte && selection.includes(formationOuverte.id_formation)}
        onFermer={() => setFormationOuverte(null)}
        onBasculerSelection={() => formationOuverte && basculerSelection(formationOuverte.id_formation)}
        onInscrire={() => formationOuverte && inscrireDepuisFiche(formationOuverte)}
      />

      {inscriptionOuverte && vitrine ? (
        <InscriptionModal
          formations={formationsChoisies}
          modesPaiement={vitrine.modes_paiement}
          onRetirer={basculerSelection}
          onFermer={() => setInscriptionOuverte(false)}
          onConnexion={(email) => allerConnexion(email)}
        />
      ) : null}
    </SafeAreaView>
  );
}
