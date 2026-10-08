import { manualMealAnalysis } from '../../utils/mealAnalysis';

export async function analyzeCapturedMeal({ meal }) {
  return manualMealAnalysis(meal);
}
