const endpoint = process.env.EXPO_PUBLIC_MEAL_ANALYSIS_URL;

const demoResults = {
  meal: { name: 'Vegetable grain bowl', calories: 486, protein: 24, carbs: 61, fat: 16, confidence: 82, ingredients: ['Whole grains', 'Mixed vegetables', 'Plant protein', 'Herb dressing'] },
  product: { name: 'Nutrition shake', calories: 218, protein: 18, carbs: 24, fat: 6, confidence: 78, ingredients: ['Protein blend', 'Milk or water', 'Nutrition mix'] },
};

const pause = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

export async function analyzeMealPhoto({ uri, category = 'meal', token }) {
  if (endpoint) {
    try {
      const form = new FormData();
      form.append('category', category);
      form.append('image', { uri, name: 'meal.jpg', type: 'image/jpeg' });
      const response = await fetch(endpoint, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
      if (!response.ok) throw new Error(`Analysis failed (${response.status})`);
      const result = await response.json();
      return { ...result, source: 'live' };
    } catch (error) {
      await pause(900);
      return { ...demoResults[category], source: 'fallback', warning: error.message };
    }
  }

  await pause(1600);
  return { ...demoResults[category], source: 'demo' };
}
