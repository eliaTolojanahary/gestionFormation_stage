// utils/upload.ts
// Ajout d'un fichier local (photo prise ou choisie) à un FormData, comme pour la photo de profil.
import { Platform } from 'react-native';
import { File as FichierLocal } from 'expo-file-system';

export async function ajouterFichier(formData: FormData, champ: string, uri: string) {
  const nomFichier = uri.split('/').pop()?.split('?')[0] || `${champ}.jpg`;

  if (Platform.OS === 'web') {
    // Sur le web, FormData attend un vrai File/Blob
    const blob = await (await fetch(uri)).blob();
    formData.append(champ, new File([blob], nomFichier, { type: blob.type || 'image/jpeg' }));
  } else {
    // Sur iOS / Android : fichier d'expo-file-system (le fetch d'Expo refuse l'objet { uri, name, type })
    formData.append(champ, new FichierLocal(uri) as unknown as Blob, nomFichier);
  }
}
