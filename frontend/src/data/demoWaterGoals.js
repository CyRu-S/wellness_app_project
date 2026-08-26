import { storage } from '../services/storage/asyncStorage';

const STORAGE_KEY = 'wellnest.demo.water-goals.v1';
const defaults = { 1: 2500, 2: 2250, 3: 2750, 4: 2000, 5: 3000 };

async function readGoals() {
  const stored = await storage.get(STORAGE_KEY);
  if (!stored) return { ...defaults };
  try {
    return { ...defaults, ...(typeof stored === 'string' ? JSON.parse(stored) : stored) };
  } catch {
    return { ...defaults };
  }
}

export async function getDemoWaterGoal(memberId) {
  const goals = await readGoals();
  return Number(goals[String(memberId)] || goals[memberId] || 2000);
}

export async function setDemoWaterGoal(memberId, waterGoalMl) {
  const goals = await readGoals();
  goals[String(memberId)] = waterGoalMl;
  await storage.set(STORAGE_KEY, goals);
  return waterGoalMl;
}
