// components/doc/texte-riche.tsx
// Affiche le texte mis en forme d'un support (HTML écrit par le formateur dans l'éditeur web).
// Le serveur n'enregistre qu'une liste fermée de balises (backend utils/contenuRiche.js) :
// p, br, strong, em, u, s, h2, h3, ul, ol, li, blockquote, a. On les convertit ici en
// composants natifs (<Text>, <View>) : pas de WebView, et tout autre balise est ignorée.
import React from 'react';
import { Linking, Text, View } from 'react-native';
import { createTexteRicheStyles } from '@/styles/components/texte-riche.styles';
import { useThemedStyles } from '@/context/SettingsContext';

type Noeud = string | { balise: string; href?: string; enfants: Noeud[] };

const ENTITES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

// "&eacute;" n'arrive pas (le serveur envoie de l'UTF-8) ; restent &amp; &nbsp; &#39; ...
function decoder(texte: string): string {
  return texte.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (tout, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isNaN(n) ? tout : String.fromCodePoint(n);
    }
    return ENTITES[code.toLowerCase()] ?? tout;
  });
}

// HTML (déjà propre et bien formé) -> arbre de nœuds
function analyser(html: string): Noeud[] {
  const racine: Noeud = { balise: 'racine', enfants: [] };
  const pile = [racine];
  const motif = /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let m: RegExpExecArray | null;

  while ((m = motif.exec(html))) {
    const parent = pile[pile.length - 1] as Exclude<Noeud, string>;
    if (m[4] !== undefined) {
      parent.enfants.push(decoder(m[4]));
      continue;
    }
    const balise = m[2].toLowerCase();
    if (m[1]) {
      // Balise fermante : on remonte jusqu'à la balise ouverte correspondante
      const index = pile.map((n) => (n as Exclude<Noeud, string>).balise).lastIndexOf(balise);
      if (index > 0) pile.length = index;
      continue;
    }
    if (balise === 'br') {
      parent.enfants.push('\n');
      continue;
    }
    const href = /href="([^"]*)"/i.exec(m[3])?.[1];
    const noeud: Noeud = { balise, href: href ? decoder(href) : undefined, enfants: [] };
    parent.enfants.push(noeud);
    pile.push(noeud);
  }
  return (racine as Exclude<Noeud, string>).enfants;
}

// Seuls les liens web et e-mail s'ouvrent (comme côté serveur)
function ouvrirLien(href?: string) {
  if (href && /^(https?:|mailto:)/i.test(href)) Linking.openURL(href).catch(() => {});
}

const BLOCS = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote']);

export function TexteRiche({ html }: { html?: string | null }) {
  const styles = useThemedStyles(createTexteRicheStyles);
  if (!html) return null;

  // Texte en ligne (gras, italique, lien...) : des <Text> imbriqués
  function enLigne(noeud: Noeud, cle: string | number): React.ReactNode {
    if (typeof noeud === 'string') return noeud;
    const enfants = noeud.enfants.map((e, i) => enLigne(e, `${cle}-${i}`));
    switch (noeud.balise) {
      case 'strong': return <Text key={cle} style={styles.gras}>{enfants}</Text>;
      case 'em': return <Text key={cle} style={styles.italique}>{enfants}</Text>;
      case 'u': return <Text key={cle} style={styles.souligne}>{enfants}</Text>;
      case 's': return <Text key={cle} style={styles.barre}>{enfants}</Text>;
      case 'a':
        return (
          <Text key={cle} style={styles.lien} onPress={() => ouvrirLien(noeud.href)}>
            {enfants}
          </Text>
        );
      default: return <React.Fragment key={cle}>{enfants}</React.Fragment>;
    }
  }

  // Paragraphe, titre, liste, citation : des <View> qui contiennent du texte en ligne
  function bloc(noeud: Noeud, cle: string | number): React.ReactNode {
    if (typeof noeud === 'string') {
      return noeud.trim() ? <Text key={cle} style={styles.paragraphe}>{noeud}</Text> : null;
    }
    const enfants = noeud.enfants;
    switch (noeud.balise) {
      case 'h2': return <Text key={cle} style={styles.titre}>{enfants.map((e, i) => enLigne(e, i))}</Text>;
      case 'h3': return <Text key={cle} style={styles.sousTitre}>{enfants.map((e, i) => enLigne(e, i))}</Text>;
      case 'blockquote':
        return (
          <View key={cle} style={styles.citation}>
            {regrouper(enfants).map((e, i) => bloc(e, `${cle}-${i}`))}
          </View>
        );
      case 'ul':
      case 'ol': {
        const items = enfants.filter((e): e is Exclude<Noeud, string> => typeof e !== 'string');
        return (
          <View key={cle} style={styles.liste}>
            {items.map((item, i) => (
              <View key={i} style={styles.element}>
                <Text style={styles.puce}>{noeud.balise === 'ol' ? `${i + 1}.` : '•'}</Text>
                <Text style={styles.elementTexte}>{item.enfants.map((e, j) => enLigne(e, j))}</Text>
              </View>
            ))}
          </View>
        );
      }
      default:
        return <Text key={cle} style={styles.paragraphe}>{enfants.map((e, i) => enLigne(e, i))}</Text>;
    }
  }

  // Texte en ligne qui traîne entre deux blocs : regroupé dans un paragraphe
  function regrouper(noeuds: Noeud[]): Noeud[] {
    const resultat: Noeud[] = [];
    let enCours: Noeud[] = [];
    const vider = () => {
      if (enCours.length) resultat.push({ balise: 'p', enfants: enCours });
      enCours = [];
    };
    noeuds.forEach((n) => {
      if (typeof n !== 'string' && BLOCS.has(n.balise)) {
        vider();
        resultat.push(n);
      } else if (typeof n !== 'string' || n.trim()) {
        enCours.push(n);
      }
    });
    vider();
    return resultat;
  }

  return <View style={styles.conteneur}>{regrouper(analyser(html)).map((n, i) => bloc(n, i))}</View>;
}

// Texte brut (sans balises) : aperçu d'un support dans une liste
export function texteBrut(html?: string | null): string {
  if (!html) return '';
  return decoder(html.replace(/<br\s*\/?>/gi, ' ').replace(/<\/(p|h2|h3|li|blockquote)>/gi, ' ').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}
