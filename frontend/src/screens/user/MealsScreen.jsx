import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import MealRow from '../../components/meal/MealRow';
import Screen from '../../components/common/Screen';
import { colors, radius, type } from '../../theme';

export default function MealsScreen({ navigation }) {
  const meals = useSelector((state) => state.meals.items);
  return <Screen><View style={styles.head}><Text style={styles.kicker}>SATURDAY · 15 AUG</Text><Text style={styles.title}>Meals</Text><Text style={styles.body}>A balanced day with room to swap ingredients.</Text></View><View style={styles.total}><Text style={styles.totalValue}>1,590</Text><Text style={styles.totalLabel}>PLANNED KCAL</Text><View style={styles.rule} /><Text style={styles.macro}><Text style={styles.bold}>90g</Text>{'\n'}protein</Text><Text style={styles.macro}><Text style={styles.bold}>194g</Text>{'\n'}carbs</Text></View><View style={styles.list}>{meals.map((meal) => <MealRow key={meal.id} meal={meal} onPress={() => navigation.navigate('MealDetails', { mealId: meal.id })} />)}</View></Screen>;
}
const styles = StyleSheet.create({ head: { marginTop: 18 }, kicker: { ...type.label, color: colors.moss }, title: { ...type.display, color: colors.ink, marginTop: 7 }, body: { ...type.body, color: colors.muted, marginTop: 6 }, total: { minHeight: 124, backgroundColor: colors.ink, borderRadius: radius.lg, marginTop: 26, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }, totalValue: { color: colors.white, fontSize: 34, fontWeight: '800' }, totalLabel: { ...type.label, color: '#B9C8C0', width: 55 }, rule: { width: 1, height: 53, backgroundColor: '#46625A' }, macro: { color: '#B9C8C0', fontSize: 12, lineHeight: 18 }, bold: { color: colors.accent, fontWeight: '800', fontSize: 16 }, list: { marginTop: 12 } });

