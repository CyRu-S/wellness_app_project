import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/common/Screen';
import { colors, fonts, type } from '../../theme';

const content = {
  requests: { eyebrow: 'MEMBERSHIP', title: 'User requests', items: [['Anika Rao', 'Goal: improve energy'], ['Dev Kapoor', 'Goal: weight management'], ['Mina Shah', 'Goal: balanced nutrition']] },
  users: { eyebrow: 'MEMBERS', title: 'All users', items: [['Aarav Mehta', 'Active · Balanced energy'], ['Kavya Menon', 'Active · Metabolic reset'], ['Rohan Das', 'Paused · Strength support']] },
  plans: { eyebrow: 'PROGRAMS', title: 'Diet plans', items: [['Balanced energy', '48 active members'], ['Metabolic reset', '35 active members'], ['Strength support', '29 active members']] },
  products: { eyebrow: 'CATALOGUE', title: 'Products', items: [['Protein blend', 'In stock · 340 units'], ['Herbal tea concentrate', 'Low stock · 18 units'], ['Fibre complex', 'In stock · 126 units']] },
  alerts: { eyebrow: 'ATTENTION', title: 'Missed items', items: [['Lunch reminders', '8 missed today'], ['Hydration target', '4 missed today'], ['Evening activity', '2 missed today']] },
  reports: { eyebrow: 'INSIGHTS', title: 'Reports', items: [['Weekly adherence', '82% average completion'], ['Nutrition summary', '1,720 kcal daily average'], ['Activity trends', '+12% active minutes']] },
  settings: { eyebrow: 'AUTOMATION', title: 'Reminder rules', items: [['Meal reminders', '30 minutes before'], ['Missed item alert', 'After 45 minutes'], ['Weekly summary', 'Monday at 9:00 AM']] },
};

export default function AdminListScreen({ kind = 'users', navigation }) {
  const page = content[kind];
  return <Screen><Text style={styles.eyebrow}>{page.eyebrow}</Text><Text style={styles.title}>{page.title}</Text><Text style={styles.context}>{page.items.length} items shown · Updated now</Text><View style={styles.list}>{page.items.map(([title, meta], index) => <Pressable key={title} onPress={() => kind === 'users' && navigation.navigate('UserDetails', { name: title })} style={styles.row}><Text style={styles.index}>0{index + 1}</Text><View style={styles.copy}><Text style={styles.itemTitle}>{title}</Text><Text style={styles.meta}>{meta}</Text></View><Ionicons name="arrow-forward" size={20} color={colors.ink} /></Pressable>)}</View></Screen>;
}
const styles = StyleSheet.create({ eyebrow: { ...type.label, color: colors.moss, marginTop: 20 }, title: { ...type.display, color: colors.ink, marginTop: 6 }, context: { color: colors.muted, fontFamily: fonts.regular, marginTop: 8 }, list: { marginTop: 30, borderTopWidth: 1, borderColor: colors.ink }, row: { minHeight: 83, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, index: { color: colors.moss, fontFamily: fonts.semibold, width: 42 }, copy: { flex: 1 }, itemTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 17 }, meta: { color: colors.muted, fontFamily: fonts.regular, marginTop: 5 } });
