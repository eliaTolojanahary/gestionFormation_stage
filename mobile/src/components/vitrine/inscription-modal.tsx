// components/vitrine/inscription-modal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CircleCheck, Trash2, X } from 'lucide-react-native';
import { FormationPublique, ResultatInscription, useVitrine, Vitrine } from '@/hooks/use-vitrine';
import { createVitrineStyles } from '@/styles/vitrine.styles';
import { useThemedStyles } from '@/context/SettingsContext';
import { formatAriary, premierPaiementEstime } from './format-vitrine';

const TRANCHES = [1, 2, 3, 4];

interface Props {
  formations: FormationPublique[];
  modesPaiement: Vitrine['modes_paiement'];
  onRetirer: (idFormation: number) => void;
  onFermer: () => void;
  onConnexion: (email: string) => void;
}

// Inscription en ligne à une ou plusieurs formations, comme à l'accueil :
//   1. formations choisies + nombre de tranches pour chacune ;
//   2. informations personnelles et mot de passe (le compte est créé tout de suite) ;
//   3. premier paiement déclaré (mode + référence), en attente de validation par l'Accueil.
export function InscriptionModal({ formations, modesPaiement, onRetirer, onFermer, onConnexion }: Props) {
  const styles = useThemedStyles(createVitrineStyles);
  const { inscrire } = useVitrine();

  const [tranches, setTranches] = useState<Record<number, number>>({});
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [idModePaiement, setIdModePaiement] = useState<number | null>(modesPaiement[0]?.id_mode_paiement ?? null);
  const [reference, setReference] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [resultat, setResultat] = useState<ResultatInscription | null>(null);

  const nombreTranches = (id: number) => tranches[id] || 1;
  const totalEstime = formations.reduce(
    (total, f) => total + premierPaiementEstime(f.tarif, nombreTranches(f.id_formation)),
    0
  );
  const complet =
    formations.length > 0 && nom.trim() && prenom.trim() && email.trim() && telephone.trim() &&
    motDePasse.length >= 8 && idModePaiement;

  async function envoyer() {
    if (!complet || envoi) return;
    setEnvoi(true);
    setErreur('');
    try {
      setResultat(await inscrire({
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
        mot_de_passe: motDePasse,
        formations: formations.map((f) => ({ id_formation: f.id_formation, nombre_tranches: nombreTranches(f.id_formation) })),
        id_mode_paiement: idModePaiement as number,
        reference_virement: reference.trim() || undefined,
      }));
    } catch (requestError: any) {
      setErreur(requestError.message || "L'inscription n'a pas pu être envoyée.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onFermer}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalFond}>
          <View style={styles.modalFeuille}>
            <View style={styles.modalPoignee} />
            <View style={styles.modalEntete}>
              <Text style={styles.modalTitre}>{resultat ? 'Inscription envoyée' : 'Inscription'}</Text>
              <TouchableOpacity onPress={onFermer} accessibilityLabel="Fermer">
                <X size={22} color="#5A6E85" />
              </TouchableOpacity>
            </View>

            {resultat ? (
              // ─── Confirmation ───
              <ScrollView contentContainerStyle={styles.modalContenu}>
                <View style={styles.succesIcone}>
                  <CircleCheck size={34} color="#2E7D32" />
                </View>
                <Text style={styles.succesTitre}>Merci {prenom.trim()} !</Text>
                <Text style={styles.succesTexte}>
                  Votre inscription à {resultat.inscriptions.length} formation(s) est en attente de validation
                  par l’accueil, qui va vérifier votre premier paiement de {formatAriary(resultat.total_premier_paiement)}.
                </Text>
                <Text style={styles.succesTexte}>
                  Votre compte est déjà créé : connectez-vous avec {resultat.email} pour suivre la validation.
                  Vos cours seront accessibles dès que l’inscription sera validée.
                </Text>
                <View style={styles.detailBoutons}>
                  <TouchableOpacity style={styles.boutonPrincipal} onPress={() => onConnexion(resultat.email)}>
                    <Text style={styles.boutonPrincipalTexte}>Se connecter</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <ScrollView contentContainerStyle={styles.modalContenu} keyboardShouldPersistTaps="handled">
                {/* 1. Formations */}
                <Text style={styles.etape}>1. Vos formations ({formations.length})</Text>
                {formations.length === 0 ? (
                  <Text style={styles.texteMuet}>Aucune formation choisie : fermez et ajoutez-en une.</Text>
                ) : (
                  formations.map((f) => {
                    const n = nombreTranches(f.id_formation);
                    return (
                      <View key={f.id_formation} style={styles.choixCarte}>
                        <View style={styles.choixHaut}>
                          <Text style={styles.choixNom} numberOfLines={1}>{f.nom}</Text>
                          <TouchableOpacity onPress={() => onRetirer(f.id_formation)} accessibilityLabel={`Retirer ${f.nom}`}>
                            <Trash2 size={17} color="#C62828" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.choixMeta}>
                          {formatAriary(f.tarif)} · 1er paiement ≈ {formatAriary(premierPaiementEstime(f.tarif, n))}
                        </Text>
                        <View style={styles.puces}>
                          {TRANCHES.map((t) => (
                            <TouchableOpacity
                              key={t}
                              style={[styles.puce, n === t && styles.puceActive]}
                              onPress={() => setTranches((actuel) => ({ ...actuel, [f.id_formation]: t }))}
                            >
                              <Text style={[styles.puceTexte, n === t && styles.puceTexteActive]}>
                                {t === 1 ? 'Comptant' : `${t} tranches`}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })
                )}

                {/* 2. Informations */}
                <Text style={styles.etape}>2. Vos informations</Text>
                <Text style={styles.champLabel}>Nom</Text>
                <TextInput style={styles.champ} value={nom} onChangeText={setNom} placeholder="Rakoto" placeholderTextColor="#A0AAB8" />
                <Text style={styles.champLabel}>Prénom</Text>
                <TextInput style={styles.champ} value={prenom} onChangeText={setPrenom} placeholder="Jean" placeholderTextColor="#A0AAB8" />
                <Text style={styles.champLabel}>Adresse e-mail (pour vous connecter)</Text>
                <TextInput
                  style={styles.champ}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="exemple@mail.com"
                  placeholderTextColor="#A0AAB8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={styles.champLabel}>Téléphone</Text>
                <TextInput
                  style={styles.champ}
                  value={telephone}
                  onChangeText={setTelephone}
                  placeholder="034 00 000 00"
                  placeholderTextColor="#A0AAB8"
                  keyboardType="phone-pad"
                />
                <Text style={styles.champLabel}>Mot de passe (8 caractères minimum)</Text>
                <TextInput
                  style={styles.champ}
                  value={motDePasse}
                  onChangeText={setMotDePasse}
                  placeholder="••••••••"
                  placeholderTextColor="#A0AAB8"
                  secureTextEntry
                  autoCapitalize="none"
                />

                {/* 3. Premier paiement */}
                <Text style={styles.etape}>3. Premier paiement</Text>
                <View style={styles.total}>
                  <Text style={styles.totalLabel}>À payer maintenant (≈)</Text>
                  <Text style={styles.totalValeur}>{formatAriary(totalEstime)}</Text>
                </View>
                <Text style={styles.champLabel}>Mode de paiement</Text>
                <View style={styles.puces}>
                  {modesPaiement.map((mode) => {
                    const actif = idModePaiement === mode.id_mode_paiement;
                    return (
                      <TouchableOpacity
                        key={mode.id_mode_paiement}
                        style={[styles.puce, actif && styles.puceActive]}
                        onPress={() => setIdModePaiement(mode.id_mode_paiement)}
                      >
                        <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>{mode.nom}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.champLabel}>Référence du paiement (virement, reçu…)</Text>
                <TextInput
                  style={styles.champ}
                  value={reference}
                  onChangeText={setReference}
                  placeholder="Ex. VIR-2026-0042"
                  placeholderTextColor="#A0AAB8"
                  autoCapitalize="characters"
                />
                <Text style={styles.aide}>
                  Votre paiement sera vérifié par l’accueil avant la validation de chaque inscription.
                  En espèces, payez au centre puis indiquez le numéro du reçu.
                </Text>

                {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

                <View style={styles.detailBoutons}>
                  <TouchableOpacity
                    style={[styles.boutonPrincipal, (!complet || envoi) && styles.boutonDesactive]}
                    onPress={envoyer}
                    disabled={!complet || envoi}
                  >
                    {envoi ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.boutonPrincipalTexte}>
                        Envoyer mon inscription ({formations.length})
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
