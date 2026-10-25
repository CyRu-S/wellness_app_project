import { herbalifeMealAnalysis, isManualProduct, manualMealAnalysis, withEstimatedPortions } from '../../utils/mealAnalysis';
import { analyzeMealPhoto } from './mealAnalysisApi';

export async function analyzeCapturedMeal({ uri, meal, category = 'meal', token }) {
  if (isManualProduct(meal) || isManualProduct(category))
    return herbalifeMealAnalysis({ ...meal, type: 'product' });
  try {
    return withEstimatedPortions(await analyzeMealPhoto({ uri, category: meal?.type || category, token }));
  } catch (error) {
    return manualMealAnalysis(meal, `${error.message || 'Food analysis is unavailable.'} Review and edit the manual serving values before saving.`);
  }
}
