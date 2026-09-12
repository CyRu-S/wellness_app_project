export function normalizeActivity(session) {
  const rates = { run: 10, cycling: 8, strength: 6, yoga: 3.5 };
  const seconds = Math.max(0, Number(session.durationSeconds) || 0);
  return {
    ...session,
    minutes: Math.floor(seconds / 60),
    calories: Math.round(seconds / 60 * (rates[String(session.activity).toLowerCase()] || 4.5)),
    when: new Date(session.startedAt).toLocaleString(),
  };
}

export function activityTotals(history) {
  const recent = history.filter((row) => new Date(row.startedAt).getTime() >= Date.now() - 7 * 86400000);
  return { sessions: recent.length, weeklyMinutes: recent.reduce((sum, row) => sum + row.minutes, 0) };
}
