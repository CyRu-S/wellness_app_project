import {
  adminMemberMealPlans,
  adminMembers,
} from './adminDemoData';
import { storage } from '../services/storage/asyncStorage';

const demoMealPhoto = require('../../assets/shake.png');

export const MEMBER_ACCESS_DEMO_STORAGE_KEY = 'wellnest.demo.member-access.v1';

const defaultDemoAccess = {
  assignments: {
    1: [2, 4],
    3: [5],
  },
  grantedAt: {
    1: '2026-08-21T10:30:00.000Z',
    3: '2026-08-20T08:15:00.000Z',
  },
};

const cloneDefaultAccess = () => ({
  assignments: Object.fromEntries(
    Object.entries(defaultDemoAccess.assignments).map(([viewerId, memberIds]) => [viewerId, [...memberIds]]),
  ),
  grantedAt: { ...defaultDemoAccess.grantedAt },
});

const parseStoredAccess = (stored) => {
  if (!stored) return null;
  if (typeof stored === 'string') {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return stored;
};

const readDemoAccess = async () => {
  const stored = parseStoredAccess(await storage.get(MEMBER_ACCESS_DEMO_STORAGE_KEY));
  if (!stored?.assignments) return cloneDefaultAccess();
  return {
    assignments: stored.assignments,
    grantedAt: stored.grantedAt || {},
  };
};

const writeDemoAccess = (access) => storage.set(MEMBER_ACCESS_DEMO_STORAGE_KEY, JSON.stringify(access));

const initialsFor = (name = '') => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('');

const eligibleMembers = () => adminMembers.map((member) => ({
  id: member.id,
  name: member.name,
  initials: member.initials || initialsFor(member.name),
}));

const getAssignedIds = (access, viewerId) => (
  (access.assignments[String(viewerId)] || access.assignments[viewerId] || [])
    .map(Number)
    .filter(Number.isFinite)
);

const memberSummary = (member) => {
  const plan = adminMemberMealPlans[member.id];
  const meals = plan?.items || [];
  const completedMeals = meals.filter((meal) => meal.consumed);

  return {
    id: member.id,
    name: member.name,
    plannedMeals: meals.length,
    completedMeals: completedMeals.length,
    mealPosts: completedMeals.length,
    calories: completedMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
    proteinGrams: completedMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
    hydrationMl: Math.round((member.hydration / 100) * 2500),
    activityMinutes: Math.max(0, Math.round(member.adherence * 0.42)),
  };
};

const todayAt = (hour, minute = 0) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const isoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export async function getDemoAdminMemberAccess() {
  const access = await readDemoAccess();
  const members = eligibleMembers();
  const viewers = members.map((viewer) => {
    const assignedIds = getAssignedIds(access, viewer.id).filter((memberId) => memberId !== viewer.id);
    const assignedMembers = assignedIds
      .map((memberId) => members.find((member) => member.id === memberId))
      .filter(Boolean)
      .map(({ id, name }) => ({ id, name }));

    return {
      id: viewer.id,
      name: viewer.name,
      assignedCount: assignedMembers.length,
      assignedMembers,
      lastGrantedAt: access.grantedAt[String(viewer.id)] || access.grantedAt[viewer.id] || null,
    };
  });

  return {
    totalGrants: viewers.reduce((sum, viewer) => sum + viewer.assignedCount, 0),
    viewersWithAccess: viewers.filter((viewer) => viewer.assignedCount > 0).length,
    viewers,
  };
}

export async function replaceDemoMemberAccess(viewerId, memberIds) {
  const numericViewerId = Number(viewerId);
  const validIds = new Set(adminMembers.map((member) => member.id));
  if (!validIds.has(numericViewerId)) {
    const error = new Error('Member not found');
    error.status = 404;
    throw error;
  }

  const uniqueMemberIds = [...new Set(memberIds.map(Number))]
    .filter((memberId) => validIds.has(memberId) && memberId !== numericViewerId);
  const access = await readDemoAccess();
  access.assignments[String(numericViewerId)] = uniqueMemberIds;
  if (uniqueMemberIds.length) access.grantedAt[String(numericViewerId)] = new Date().toISOString();
  else delete access.grantedAt[String(numericViewerId)];
  await writeDemoAccess(access);
  return getDemoAdminMemberAccess();
}

export async function getDemoSharedMembers(viewerId) {
  const access = await readDemoAccess();
  const assignedIds = getAssignedIds(access, viewerId);
  const members = assignedIds
    .map((memberId) => adminMembers.find((member) => member.id === memberId))
    .filter(Boolean)
    .map(memberSummary);
  return { total: members.length, members };
}

export async function getDemoSharedMemberToday(viewerId, memberId) {
  const access = await readDemoAccess();
  const numericMemberId = Number(memberId);
  if (!getAssignedIds(access, viewerId).includes(numericMemberId)) {
    const error = new Error('Shared member not found');
    error.status = 404;
    throw error;
  }

  return getDemoMemberTodaySnapshot(numericMemberId);
}

export async function getDemoMemberTodaySnapshot(memberId) {
  const numericMemberId = Number(memberId);

  const member = adminMembers.find((item) => item.id === numericMemberId);
  const plan = adminMemberMealPlans[numericMemberId];
  if (!member || !plan) {
    const error = new Error('Shared member not found');
    error.status = 404;
    throw error;
  }

  const summary = memberSummary(member);
  const meals = plan.items.map((meal) => ({
    plannedMealId: meal.id,
    postId: meal.consumed ? numericMemberId * 1000 + meal.id : null,
    type: meal.type,
    name: meal.name,
    scheduledTime: meal.time,
    postedAt: meal.consumed ? todayAt(Math.floor(meal.hour), meal.hour % 1 ? 36 : 12) : null,
    completed: Boolean(meal.consumed),
    imageUrl: meal.imageUri || (meal.consumed ? demoMealPhoto : null),
    nutrition: meal.consumed ? {
      calories: meal.calories || 0,
      proteinGrams: meal.protein || 0,
      carbsGrams: Math.round((meal.calories || 0) * 0.11),
      fatGrams: Math.round((meal.calories || 0) * 0.035),
    } : null,
  }));

  const hydrationMl = summary.hydrationMl;
  const firstWater = Math.min(750, hydrationMl);
  const secondWater = Math.max(0, hydrationMl - firstWater);
  const waterLogs = [
    firstWater ? { id: numericMemberId * 10 + 1, amountMl: firstWater, loggedAt: todayAt(9, 5) } : null,
    secondWater ? { id: numericMemberId * 10 + 2, amountMl: secondWater, loggedAt: todayAt(14, 20) } : null,
  ].filter(Boolean);

  const activities = summary.activityMinutes ? [{
    id: numericMemberId * 10 + 3,
    activity: 'Daily movement',
    durationMinutes: summary.activityMinutes,
    distanceKm: Number((summary.activityMinutes * 0.075).toFixed(1)),
    startedAt: todayAt(7, 10),
  }] : [];

  return {
    member: { id: member.id, name: member.name },
    date: isoDate(),
    timeZone: 'Asia/Kolkata',
    summary,
    meals,
    waterLogs,
    activities,
  };
}

export async function resetDemoMemberAccess() {
  await storage.remove(MEMBER_ACCESS_DEMO_STORAGE_KEY);
}
