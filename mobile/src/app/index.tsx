import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Écran de démarrage : attend la relecture de la session stockée (isReady),
// puis redirige vers les onglets si l'utilisateur est connecté, sinon vers la vitrine
// (personne non inscrite : formations, contacts, inscription en ligne ; lien « Se connecter »)
export default function Index() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#072E4C" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href={'/decouvrir' as any} />;
}

