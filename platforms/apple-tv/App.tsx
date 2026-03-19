import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  PixelRatio,
} from 'react-native';
import {
  configureApi,
  fetchContentsByCategory,
  getCoverImage,
  sizedUrl,
  HERO_RUBRIC_ID,
  CATEGORY_RUBRIC_IDS,
} from 'tv-vod-api';
import type {ContentItem} from 'tv-vod-api';

const dpr = PixelRatio.get();

const CARD_W = 200;
const CARD_H = 280;

function App(): React.JSX.Element {
  const [heroItems, setHeroItems] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<
    {id: string; items: ContentItem[]}[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const hero = await fetchContentsByCategory(HERO_RUBRIC_ID);
        setHeroItems(hero);

        const cats = await Promise.all(
          CATEGORY_RUBRIC_IDS.slice(0, 4).map(async id => {
            const items = await fetchContentsByCategory(id);
            return {id, items};
          }),
        );
        setCategories(cats.filter(c => c.items.length > 0));
      } catch (err) {
        console.error('Failed to load content:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {heroItems[0] && <HeroBanner item={heroItems[0]} />}

      {categories.map(cat => (
        <View key={cat.id} style={styles.rowContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {cat.items.map(item => (
              <ContentCard key={item.content_id} item={item} />
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

function HeroBanner({item}: {item: ContentItem}) {
  const bgUrl = item.assets['art-background']?.[0]?.url;
  const sized = bgUrl ? sizedUrl(bgUrl, 1920, 600, dpr) : null;

  return (
    <View style={styles.hero}>
      {sized && (
        <Image source={{uri: sized}} style={styles.heroBg} resizeMode="cover" />
      )}
      <View style={styles.heroOverlay}>
        <Text style={styles.heroTitle}>{item.title}</Text>
        <Pressable style={({focused}) => [styles.heroBtn, focused && styles.heroBtnFocused]}>
          <Text style={styles.heroBtnText}>Play</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ContentCard({item}: {item: ContentItem}) {
  const coverUrl = getCoverImage(item.assets);
  const sized = coverUrl ? sizedUrl(coverUrl, CARD_W, CARD_H, dpr) : null;

  return (
    <Pressable
      style={({focused}) => [styles.card, focused && styles.cardFocused]}>
      {sized ? (
        <Image
          source={{uri: sized}}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardPlaceholder]} />
      )}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120818',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#120818',
  },
  hero: {
    height: 600,
    position: 'relative',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 80,
    backgroundColor: 'rgba(18,8,24,0.5)',
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  heroBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  heroBtnFocused: {
    backgroundColor: '#fff',
  },
  heroBtnText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  rowContainer: {
    paddingVertical: 24,
    paddingLeft: 60,
  },
  card: {
    width: CARD_W,
    marginRight: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardFocused: {
    transform: [{scale: 1.08}],
    borderColor: '#fff',
    borderWidth: 3,
  },
  cardImage: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 12,
  },
  cardPlaceholder: {
    backgroundColor: '#2a1a3e',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});

export default App;
