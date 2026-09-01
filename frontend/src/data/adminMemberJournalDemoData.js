import { adminMemberMealPostHistory, adminMembers } from './adminDemoData';
import { getDemoMemberTodaySnapshot } from './memberAccessDemoData';
import { getDemoWaterGoal } from './demoWaterGoals';

const demoMealPhoto = require('../../assets/shake.png');

const profiles = {
  1: { heightCm: 175, weightKg: 72.5, waistCm: 84, bodyFatPercent: 19.2, dietaryPreferences: 'Vegetarian', lastBodyMetricsUpdatedAt: '2026-08-20T08:30:00.000Z' },
  2: { heightCm: 167, weightKg: 65, waistCm: 74, bodyFatPercent: 18, dietaryPreferences: 'Vegetarian · high protein', lastBodyMetricsUpdatedAt: '2026-08-18T09:10:00.000Z' },
  3: { heightCm: 170, weightKg: 69, waistCm: 78, bodyFatPercent: 19, dietaryPreferences: 'No dietary restrictions', lastBodyMetricsUpdatedAt: '2026-08-17T07:45:00.000Z' },
  4: { heightCm: 173, weightKg: 73, waistCm: 80, bodyFatPercent: 20, dietaryPreferences: 'Vegetarian · low spice', lastBodyMetricsUpdatedAt: '2026-08-16T11:25:00.000Z' },
  5: { heightCm: 176, weightKg: 77, waistCm: 83, bodyFatPercent: 21, dietaryPreferences: 'Balanced diet', lastBodyMetricsUpdatedAt: '2026-08-15T06:55:00.000Z' },
};

const bmiFor = ({ heightCm, weightKg }) => Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1));

export async function getDemoAdminMemberJournal(memberId) {
  const numericMemberId = Number(memberId);
  const member = adminMembers.find((item) => item.id === numericMemberId);
  if (!member) {
    const error = new Error('Member not found');
    error.status = 404;
    throw error;
  }

  const profile = profiles[numericMemberId];
  const waterGoalMl = await getDemoWaterGoal(numericMemberId);
  const today = await getDemoMemberTodaySnapshot(numericMemberId);
  const grouped = new Map();
  (adminMemberMealPostHistory[numericMemberId] || []).forEach((post, index) => {
    const date = new Date(post.postedAt).toISOString().slice(0, 10);
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date).push({
      postId: post.id,
      type: post.type,
      name: post.name,
      postedAt: post.postedAt,
      imageUrl: demoMealPhoto,
      nutrition: {
        calories: 390 + index * 45,
        proteinGrams: 22 + index * 3,
        carbsGrams: 48 + index * 4,
        fatGrams: 12 + index,
      },
    });
  });

  return {
    member: {
      id: member.id,
      name: member.name,
      email: member.email,
      status: member.status,
      goal: member.goal,
      ...profile,
      waterGoalMl,
      bmi: bmiFor(profile),
    },
    today,
    history: [...grouped.entries()].map(([date, posts]) => ({ date, posts })),
    retentionDays: 21,
  };
}
