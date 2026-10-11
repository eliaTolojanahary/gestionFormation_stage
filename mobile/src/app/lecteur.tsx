// app/lecteur.tsx
// Lecteur sécurisé des supports : le fichier s'affiche DANS l'app (WebView) au lieu
// du navigateur externe, où l'étudiant pouvait le télécharger et le partager.
// - captures d'écran et enregistrements bloqués (Android : écran noir ; iOS 13+ : bloqué)
// - pas de téléchargement, pas d'appui long « Enregistrer l'image », pas de navigation ailleurs
// - le serveur ajoute un filigrane au nom de l'étudiant (voir backend utils/filigrane.js)
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { DetailHeader } from '@/components/detail-header';
import { useSettings } from '@/context/SettingsContext';
import { getFileKind, getFileUrl } from '@/utils/format';

// pdf.js (Mozilla) : la WebView Android ne sait pas afficher un PDF toute seule
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

// Empêche sélection, appui long (menu « Enregistrer ») et clic droit.
// fond = couleur autour du document : suit le thème clair / sombre de l'app
const styleCommun = (fond: string) => `
  * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  html, body { margin: 0; padding: 0; background: ${fond}; }
  img, canvas { display: block; width: 100%; height: auto; margin: 0 auto 8px; pointer-events: none; background: #fff; }
`;

// Prévient l'écran : WebView native (Android / iOS) ou <iframe> (version navigateur d'Expo)
const SCRIPT_ENVOYER = `<script>
  function envoyer(m) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m);
    else window.parent.postMessage('lecteur:' + m, '*');
  }
</script>`;

// Page HTML affichant une image ; prévient l'écran quand elle est chargée ou en erreur
function pageImage(url: string, fond: string) {
  return `<!doctype html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
    <style>${styleCommun(fond)}</style>${SCRIPT_ENVOYER}</head>
    <body oncontextmenu="return false">
      <img src=${JSON.stringify(url)} alt=""
        onload="envoyer('ok')"
        onerror="envoyer('erreur')">
    </body></html>`;
}

// Page HTML qui dessine chaque page du PDF dans un <canvas> avec pdf.js,
// à la largeur de l'écran (× densité de pixels pour rester net)
function pagePdf(url: string, fond: string) {
  return `<!doctype html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
    <style>${styleCommun(fond)}</style>${SCRIPT_ENVOYER}
    <script src="${PDFJS}/pdf.min.js"></script></head>
    <body oncontextmenu="return false">
      <div id="pages"></div>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS}/pdf.worker.min.js';
        (async () => {
          try {
            const pdf = await pdfjsLib.getDocument(${JSON.stringify(url)}).promise;
            const largeur = document.body.clientWidth;
            const ratio = window.devicePixelRatio || 1;
            for (let n = 1; n <= pdf.numPages; n++) {
              const page = await pdf.getPage(n);
              const base = page.getViewport({ scale: 1 });
              const vue = page.getViewport({ scale: (largeur / base.width) * ratio });
              const canvas = document.createElement('canvas');
              canvas.width = vue.width;
              canvas.height = vue.height;
              document.getElementById('pages').appendChild(canvas);
              await page.render({ canvasContext: canvas.getContext('2d'), viewport: vue }).promise;
              if (n === 1) envoyer('ok');
            }
          } catch (e) {
            envoyer('erreur');
          }
        })();
      </script>
    </body></html>`;
}

// Écran lecteur : reçoit le chemin du fichier et son titre en paramètres de navigation
export default function LecteurScreen() {
  // Captures et enregistrements bloqués tant que le lecteur est ouvert (Android / iOS ;
  // impossible dans un navigateur, d'où le test sur la plateforme)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    preventScreenCaptureAsync('lecteur').catch(() => {});
    return () => {
      allowScreenCaptureAsync('lecteur').catch(() => {});
    };
  }, []);

  const router = useRouter();
  const { palette } = useSettings();
  const { chemin, titre } = useLocalSearchParams<{ chemin?: string; titre?: string }>();
  const [etat, setEtat] = useState<'chargement' | 'ok' | 'erreur'>('chargement');

  const kind = getFileKind(chemin);
  const url = getFileUrl(chemin);
  // Origine de l'API (http://192.168.x.x:3000) : la page est chargée « depuis » cette origine
  const origine = url?.match(/^https?:\/\/[^/]+/)?.[0];

  const html = useMemo(() => {
    if (!url) return null;
    if (kind === 'pdf') return pagePdf(url, palette.pageBg);
    if (kind === 'image') return pageImage(url, palette.pageBg);
    return null;
  }, [url, kind, palette.pageBg]);

  // Version navigateur (Expo web) : react-native-webview n'y existe pas, on passe par une <iframe>
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function recevoir(e: MessageEvent) {
      if (e.data === 'lecteur:ok') setEtat('ok');
      if (e.data === 'lecteur:erreur') setEtat('erreur');
    }
    window.addEventListener('message', recevoir);
    return () => window.removeEventListener('message', recevoir);
  }, []);

  const message =
    etat === 'erreur'
      ? "Le fichier n'a pas pu être affiché. Vérifiez votre connexion."
      : !html
        ? "Ce type de fichier ne peut pas être affiché dans l'application."
        : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.pageBg }} edges={['top']}>
      <DetailHeader title={titre || 'Support'} onBack={() => router.back()} />

      {html && etat !== 'erreur' && Platform.OS === 'web' && (
        // srcDoc sans sandbox : l'iframe garde l'origine de l'app, le PDF est chargé normalement.
        // (Dans un navigateur, les captures d'écran ne peuvent pas être bloquées : seul le filigrane protège.)
        <iframe
          srcDoc={html}
          title={titre || 'Support'}
          style={{ flex: 1, width: '100%', height: '100%', border: 'none', backgroundColor: palette.pageBg }}
        />
      )}

      {html && etat !== 'erreur' && Platform.OS !== 'web' && (
        <WebView
          // baseUrl = adresse de l'API : le PDF est chargé depuis la même origine
          source={{ html, baseUrl: origine }}
          originWhitelist={['*']}
          onMessage={(e) => setEtat(e.nativeEvent.data === 'ok' ? 'ok' : 'erreur')}
          onError={() => setEtat('erreur')}
          // Aucune navigation ni téléchargement : seul le document affiché est autorisé
          onShouldStartLoadWithRequest={(req) =>
            req.url.startsWith('about:') || req.url.startsWith('data:') || (!!origine && req.url.replace(/\/$/, '') === origine)
          }
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          allowFileAccess={false}
          cacheEnabled={false}
          incognito
          style={{ flex: 1, backgroundColor: palette.pageBg }}
        />
      )}

      {etat === 'chargement' && html && (
        <View style={{ position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center' }}>
          <ActivityIndicator color={palette.accent} />
        </View>
      )}

      {message && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: palette.textMuted, textAlign: 'center' }}>{message}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
