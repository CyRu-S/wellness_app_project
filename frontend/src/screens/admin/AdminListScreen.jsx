import React from 'react';
import { useSelector } from 'react-redux';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/common/Screen';
import { type } from '../../theme';

// Preserve this legacy admin destination's original palette while the
// development branch refreshes the user-facing theme.
const colors = {
  paper: '#F4F8F7',
  ink: '#002E36',
  muted: '#698387',
  line: '#D9E8E9',
  moss: '#007077',
};



export default function AdminListScreen({ kind = 'users', navigation }) {
  const plans = useSelector((state) => state.admin.memberMealPlans);
  const products = useSelector((state) => state.admin.products);
  const error = useSelector((state) => kind === 'plans' ? state.admin.membersError : state.admin.productsError);
  const loading = useSelector((state) => kind === 'plans' ? state.admin.membersStatus === 'loading' : !!state.admin.pageReads.products);
  const page = kind === 'plans'
    ? { eyebrow: 'PROGRAMS', title: 'Diet plans', items: Object.values(plans).filter((p) => p.items.length).map((p) => ({
      id: p.memberId, title: p.planName, meta: `${p.items.length} daily meals`, memberId: p.memberId,
    })) }
    : { eyebrow: 'CATALOGUE', title: 'Products', items: products.map((p) => ({
      id: p.id, title: p.name, meta: `${p.sku} · ₹${p.price} · ${p.stockQuantity} in stock`,
    })) };
  return <Screen style={styles.screen}>
    <Text style={styles.eyebrow}>{page.eyebrow}</Text><Text style={styles.title}>{page.title}</Text>
    <Text style={styles.context}>{loading ? 'Loading…' : `${page.items.length} items shown`}</Text>
    {error ? <Text accessibilityRole="alert" style={styles.context}>{error}</Text> : null}
    {!loading && !error && !page.items.length ? <Text style={styles.context}>{kind === 'plans' ? 'No diet plans assigned yet.' : 'No active products yet.'}</Text> : null}
    <View style={styles.list}>{page.items.map((item, index) => <Pressable key={item.id}
      accessibilityRole={item.memberId ? 'button' : undefined} disabled={!item.memberId}
      onPress={() => navigation.navigate('UserDetails', { id: item.memberId })} style={styles.row}>
      <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={styles.copy}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.meta}>{item.meta}</Text></View>
      {item.memberId ? <Ionicons name="arrow-forward" size={20} color={colors.ink} /> : null}
    </Pressable>)}</View>
  </Screen>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: colors.paper }, eyebrow: { ...type.label, color: colors.moss, marginTop: 20 }, title: { ...type.display, color: colors.ink, marginTop: 6 }, context: { color: colors.muted, marginTop: 8 }, list: { marginTop: 30, borderTopWidth: 1, borderColor: colors.ink }, row: { minHeight: 83, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, index: { color: colors.moss, fontWeight: '800', width: 42 }, copy: { flex: 1 }, itemTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, meta: { color: colors.muted, marginTop: 5 } });
