export const adminSummary = {
  pendingApprovals: 5,
  mealLogsToday: 284,
  mealComparison: 18,
  missedItems: 6,
  activeUsers: 146,
  totalMembers: 164,
  averageAdherence: 82,
  onTrackPercentage: 86,
  activePlans: 128,
  products: 23,
};

export const adminMembers = [
  {
    id: 1,
    name: 'Aarav Mehta',
    initials: 'AM',
    email: 'aarav.mehta@example.com',
    status: 'ACTIVE',
    lastActiveAt: 'Active now',
    plan: 'Balanced energy',
    goal: 'Build a consistent eating rhythm',
    adherence: 92,
    meals: 3,
    hydration: 88,
    streak: 8,
    attentionLevel: 'NONE',
    attentionReason: '',
  },
  {
    id: 2,
    name: 'Kavya Menon',
    initials: 'KM',
    email: 'kavya.menon@example.com',
    status: 'ACTIVE',
    lastActiveAt: 'Active now',
    plan: 'Metabolic reset',
    goal: 'Improve energy through the workday',
    adherence: 86,
    meals: 4,
    hydration: 76,
    streak: 12,
    attentionLevel: 'WATCH',
    attentionReason: 'Hydration trending down',
  },
  {
    id: 3,
    name: 'Rohan Das',
    initials: 'RD',
    email: 'rohan.das@example.com',
    status: 'ACTIVE',
    lastActiveAt: '18 min ago',
    plan: 'Strength support',
    goal: 'Fuel training without afternoon fatigue',
    adherence: 78,
    meals: 2,
    hydration: 71,
    streak: 5,
    attentionLevel: 'NONE',
    attentionReason: '',
  },
  {
    id: 4,
    name: 'Anika Nair',
    initials: 'AN',
    email: 'anika.nair@example.com',
    status: 'AWAY',
    lastActiveAt: '2 hours ago',
    plan: 'Balanced energy',
    goal: 'Create an easy routine around shifts',
    adherence: 61,
    meals: 1,
    hydration: 54,
    streak: 2,
    attentionLevel: 'NEEDS_ATTENTION',
    attentionReason: 'Two meals missed today',
  },
  {
    id: 5,
    name: 'Vihaan Shah',
    initials: 'VS',
    email: 'vihaan.shah@example.com',
    status: 'AWAY',
    lastActiveAt: 'Yesterday',
    plan: 'Metabolic reset',
    goal: 'Return to a sustainable weekly rhythm',
    adherence: 48,
    meals: 0,
    hydration: 43,
    streak: 0,
    attentionLevel: 'NEEDS_ATTENTION',
    attentionReason: 'No check-in since yesterday',
  },
];

const defaultDailyMeals = [
  { id: 1, hour: 8, time: '8:00 AM', type: 'Breakfast', name: 'Oats, berries & seed crunch', calories: 410, protein: 24, ingredients: ['Rolled oats', 'Greek yoghurt', 'Seasonal berries', 'Pumpkin seeds'] },
  { id: 2, hour: 13, time: '1:00 PM', type: 'Lunch', name: 'Green grain power bowl', calories: 520, protein: 31, ingredients: ['Brown rice', 'Roasted chickpeas', 'Greens', 'Lemon tahini'] },
  { id: 3, hour: 16.5, time: '4:30 PM', type: 'Snack', name: 'Apple with almond butter', calories: 190, protein: 6, ingredients: ['Apple', 'Almond butter'] },
  { id: 4, hour: 19.5, time: '7:30 PM', type: 'Dinner', name: 'Ginger tofu & vegetables', calories: 470, protein: 29, ingredients: ['Tofu', 'Broccoli', 'Carrot', 'Ginger tamari'] },
];

export const adminMemberMealPlans = Object.fromEntries(adminMembers.map((member) => [
  member.id,
  {
    memberId: member.id,
    planName: `${member.plan} daily plan`,
    consultant: 'Coach Arpan',
    updatedAt: 'Today',
    items: defaultDailyMeals.map((meal, index) => ({
      ...meal,
      id: member.id * 100 + meal.id,
      consumed: index < member.meals,
      uploadedAt: index < member.meals ? ['8:12 AM', '1:08 PM', '4:36 PM', '7:42 PM'][index] : null,
      imageUri: null,
    })),
  },
]));

const mealPostDate = (daysBack, hour) => {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  date.setHours(hour, 10, 0, 0);
  return date.toISOString();
};

export const adminMemberMealPostHistory = Object.fromEntries(adminMembers.map((member) => [
  member.id,
  [
    { id: `${member.id}-history-1`, type: 'Breakfast', name: defaultDailyMeals[0].name, imageUri: null, loggedAt: '8:10 AM', postedAt: mealPostDate(2, 8) },
    { id: `${member.id}-history-2`, type: 'Dinner', name: defaultDailyMeals[3].name, imageUri: null, loggedAt: '7:40 PM', postedAt: mealPostDate(6, 19) },
    { id: `${member.id}-history-3`, type: 'Lunch', name: defaultDailyMeals[1].name, imageUri: null, loggedAt: '1:10 PM', postedAt: mealPostDate(13, 13) },
  ],
]));

export const adminApprovals = [
  { id: 101, initials: 'NR', name: 'Nikhil Rao', email: 'nikhil.rao@example.com', requestedAt: '18 min ago', goal: 'Build an active daily routine', recommendedPlan: 'Active foundation' },
  { id: 102, initials: 'SI', name: 'Sara Iqbal', email: 'sara.iqbal@example.com', requestedAt: '1 hour ago', goal: 'Improve weight and energy balance', recommendedPlan: 'Metabolic reset' },
  { id: 103, initials: 'VD', name: 'Vikram D.', email: 'vikram.d@example.com', requestedAt: '2 hours ago', goal: 'Make nutrition work around travel', recommendedPlan: 'Flexible fuel' },
  { id: 104, initials: 'TB', name: 'Tanya Bose', email: 'tanya.bose@example.com', requestedAt: '3 hours ago', goal: 'Build strength and better recovery', recommendedPlan: 'Strength support' },
  { id: 105, initials: 'IS', name: 'Imran Shah', email: 'imran.shah@example.com', requestedAt: '5 hours ago', goal: 'Create consistent meal timing', recommendedPlan: 'Balanced energy' },
];

export const adminMealInsights = {
  selectedRange: '7D',
  ranges: {
    TODAY: { label: 'Today', totalLogs: 284, completionRate: 86, comparison: 18, series: [{ label: '6a', value: 18 }, { label: '9a', value: 46 }, { label: '12p', value: 72 }, { label: '3p', value: 55 }, { label: '6p', value: 68 }, { label: 'Now', value: 25 }] },
    '7D': { label: '7 Days', totalLogs: 1842, completionRate: 82, comparison: 6, series: [{ label: 'M', value: 73 }, { label: 'T', value: 81 }, { label: 'W', value: 76 }, { label: 'T', value: 88 }, { label: 'F', value: 92 }, { label: 'S', value: 69 }, { label: 'S', value: 84 }] },
    '30D': { label: '30 Days', totalLogs: 7630, completionRate: 79, comparison: 4, series: [{ label: 'W1', value: 74 }, { label: 'W2', value: 77 }, { label: 'W3', value: 83 }, { label: 'W4', value: 79 }] },
  },
  mealTypes: [
    { id: 'breakfast', label: 'Breakfast', completion: 91, logged: 149 },
    { id: 'lunch', label: 'Lunch', completion: 86, logged: 141 },
    { id: 'snack', label: 'Snack', completion: 74, logged: 121 },
    { id: 'dinner', label: 'Dinner', completion: 82, logged: 136 },
  ],
  missingMembers: [
    { memberId: 5, name: 'Vihaan Shah', initials: 'VS', detail: 'Breakfast and lunch missing', severity: 'HIGH' },
    { memberId: 4, name: 'Anika Nair', initials: 'AN', detail: 'Lunch not logged', severity: 'MEDIUM' },
    { memberId: 3, name: 'Rohan Das', initials: 'RD', detail: 'Dinner running late', severity: 'LOW' },
  ],
};

export const adminAttention = [
  { id: 201, memberId: 5, memberName: 'Vihaan Shah', initials: 'VS', category: 'Meals', title: 'Breakfast and lunch are missing', missedAt: '3 hr 20 min ago', severity: 'HIGH', status: 'OPEN' },
  { id: 202, memberId: 4, memberName: 'Anika Nair', initials: 'AN', category: 'Hydration', title: 'Morning water goal was missed', missedAt: '2 hr 10 min ago', severity: 'HIGH', status: 'OPEN' },
  { id: 203, memberId: 2, memberName: 'Kavya Menon', initials: 'KM', category: 'Supplements', title: 'Daily supplement check-in is late', missedAt: '1 hr 5 min ago', severity: 'MEDIUM', status: 'OPEN' },
  { id: 204, memberId: 3, memberName: 'Rohan Das', initials: 'RD', category: 'Activity', title: 'Midday movement break is overdue', missedAt: '48 min ago', severity: 'MEDIUM', status: 'OPEN' },
  { id: 205, memberId: 1, memberName: 'Aarav Mehta', initials: 'AM', category: 'Meals', title: 'Afternoon snack is running late', missedAt: '32 min ago', severity: 'LOW', status: 'OPEN' },
  { id: 206, memberId: 2, memberName: 'Kavya Menon', initials: 'KM', category: 'Hydration', title: 'Afternoon hydration is behind plan', missedAt: '20 min ago', severity: 'LOW', status: 'OPEN' },
];

export const adminPreferences = {
  signupAlerts: true,
  deadlineAlerts: true,
  dailyDigest: false,
};

export const memberAdherence = [72, 84, 78, 91, 88, 96, 92];

export const memberTimeline = [
  { id: 'morning', time: '07:30', title: 'Morning check-in', detail: 'Energy noted as steady', status: 'DONE' },
  { id: 'breakfast', time: '08:15', title: 'Breakfast', detail: 'Oats, fruit and yoghurt', status: 'DONE' },
  { id: 'hydration', time: '11:00', title: 'Hydration', detail: '1.4 L of 2.5 L', status: 'IN_PROGRESS' },
  { id: 'dinner', time: '19:30', title: 'Dinner', detail: 'Planned for this evening', status: 'UPCOMING' },
];

export const memberHistory = [
  { id: 'h1', date: 'Today', title: 'On track', detail: '3 meals logged · 88% hydration' },
  { id: 'h2', date: 'Yesterday', title: 'Strong day', detail: 'All habits complete · 94% adherence' },
  { id: 'h3', date: '12 Aug', title: 'Coach follow-up', detail: 'Hydration reminder acknowledged' },
];
