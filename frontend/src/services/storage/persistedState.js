import * as Crypto from 'expo-crypto';
import { readEncryptedJson, writeEncryptedJson } from './encryptedStorage';

const PREFIX = 'mr-care.snapshot.v1:';
let timer;
let generation = 0;
let pendingSave = Promise.resolve();
let persistenceReady = false;

export function beginPersistedStateWrites() { persistenceReady = true; }

async function snapshotKey(token) {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token);
  return `${PREFIX}${hash}`;
}

function snapshotData(state) {
  const { dashboard, meals, activity, plan, notifications, admin, profile, memberAccess, adminMemberJournal } = state;
  return {
    dashboard: { completion: dashboard.completion, waterGlasses: dashboard.waterGlasses, waterTarget: dashboard.waterTarget,
      waterGoalMl: dashboard.waterGoalMl, streak: dashboard.streak, calories: dashboard.calories, protein: dashboard.protein,
      activeMinutes: dashboard.activeMinutes, activeCalories: dashboard.activeCalories, lastMeal: dashboard.lastMeal, lastActivity: dashboard.lastActivity },
    meals: { planName: meals.planName, consultant: meals.consultant, items: meals.items,
      uploads: meals.uploads, postHistory: meals.postHistory, status: meals.items.length ? 'succeeded' : 'idle' },
    activity: { weeklyMinutes: activity.weeklyMinutes, sessions: activity.sessions, history: activity.history },
    plan: { title: plan.title, daysRemaining: plan.daysRemaining, tasks: plan.tasks },
    notifications: { items: notifications.items, timelineRemindersEnabled: notifications.timelineRemindersEnabled,
      coachNudgesEnabled: notifications.coachNudgesEnabled, preferencesLoaded: notifications.preferencesLoaded,
      pushAvailable: notifications.pushAvailable, signupAlerts: notifications.signupAlerts, deadlineAlerts: notifications.deadlineAlerts,
      dailyDigest: notifications.dailyDigest, memberUpdates: notifications.memberUpdates, accountUpdates: notifications.accountUpdates },
    admin: { summary: admin.summary, members: admin.members, approvals: admin.approvals, attention: admin.attention,
      memberMealPlans: admin.memberMealPlans, memberMealPostHistory: admin.memberMealPostHistory, mealInsights: admin.mealInsights,
      preferences: admin.preferences, membersStatus: admin.members.length ? 'succeeded' : 'idle' },
    profile: { name: profile.name, email: profile.email, goal: profile.goal, dietaryPreferences: profile.dietaryPreferences,
      profileImageUrl: profile.profileImageUrl, profileImageVersion: profile.profileImageVersion,
      bodyMetrics: profile.bodyMetrics, lastBodyMetricsUpdatedAt: profile.lastBodyMetricsUpdatedAt,
      phone: profile.phone, clubName: profile.clubName },
    memberAccess: { overview: memberAccess.overview, shared: memberAccess.shared, sharedMembers: memberAccess.sharedMembers,
      todayByMemberId: memberAccess.todayByMemberId, source: memberAccess.source },
    adminMemberJournal: { byMemberId: adminMemberJournal.byMemberId },
  };
}

export async function readPersistedState(token, userId) {
  if (!token || !userId) return null;
  try {
    const snapshot = await readEncryptedJson(await snapshotKey(token));
    if (String(snapshot?.userId) !== String(userId) || !snapshot?.data) return null;
    if (snapshot.savedOn === new Date().toDateString()) return snapshot.data;
    // Yesterday's completion and meal schedule must never masquerade as today's.
    return {
      profile: snapshot.data.profile,
      notifications: snapshot.data.notifications,
    };
  } catch { return null; }
}

export function schedulePersistedState(state) {
  if (!persistenceReady) return;
  const token = state.auth.token;
  const userId = state.auth.user?.id;
  if (!token || !userId || state.dashboard.optimistic.water || state.meals.pendingPost || state.activity.pendingSession ||
      Object.keys(state.admin.writes).length || Object.keys(state.profile.writes).length) return;
  const snapshot = { userId, savedOn: new Date().toDateString(), data: snapshotData(state) };
  const started = generation;
  clearTimeout(timer);
  timer = setTimeout(() => {
    pendingSave = pendingSave.then(async () => {
      if (started !== generation) return;
      await writeEncryptedJson(await snapshotKey(token), snapshot);
    }).catch(() => {});
  }, 500);
}

export async function cancelPersistedState() {
  generation += 1;
  clearTimeout(timer);
  await pendingSave;
}
