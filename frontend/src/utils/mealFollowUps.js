// The workspace returns one entry per alert, while this list displays members.
export function groupMealFollowUps(alerts = []) {
  const members = new Map();
  for (const alert of alerts) {
    if (!alert || alert.memberId == null) continue;
    const key = String(alert.memberId);
    if (!members.has(key)) members.set(key, { ...alert, details: new Set() });
    const member = members.get(key);
    if (alert.detail) member.details.add(alert.detail);
    if (alert.severity === 'HIGH') member.severity = 'HIGH';
  }
  return Array.from(members.values(), ({ details, ...member }) => ({
    ...member,
    detail: Array.from(details).join('; '),
  }));
}
