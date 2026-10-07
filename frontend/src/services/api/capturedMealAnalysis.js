import { analyzeMealPhoto } from './mealAnalysisApi';
import { isManualProduct, manualMealAnalysis, withPortionInputs } from '../../utils/mealAnalysis';

export async function analyzeCapturedMeal({ uri, meal, category = 'meal', token }) {
  if (isManualProduct(meal) || isManualProduct(category)) return manualMealAnalysis(meal);
  try {
    return withPortionInputs(await analyzeMealPhoto({ uri, category, token }));
  } catch (error) {
    return manualMealAnalysis(meal, `${error.message || 'Photo recognition is unavailable.'} Enter or correct the meal details below.`);
  }
}
