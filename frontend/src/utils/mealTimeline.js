const OUTSIDE_FOOD = 'Outside food';

const clockParts = (date, timeZone) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
}).formatToParts(date).map(({ type, value }) => [type, value]));
const dayKey = ({ year, month, day }) => `${year}-${month}-${day}`;

// Keep outside posts separate from assigned meals and merge them only for display.
export function buildMealTimeline(plannedMeals, posts, now = new Date(), timeZone = 'Asia/Kolkata') {
  const today = dayKey(clockParts(now, timeZone));
  const outside = posts.flatMap((post) => {
    if (String(post.mealType || post.type).trim().toLowerCase() !== 'outside food') return [];
    const date = new Date(post.postedAt);
    if (Number.isNaN(date.getTime())) return [];
    const parts = clockParts(date, timeZone);
    if (dayKey(parts) !== today) return [];
    const time = date.toLocaleTimeString('en-IN', { timeZone, hour: 'numeric', minute: '2-digit' });
    return [{ ...post, id: `outside-${post.id}`, postId: post.id, outsideFood: true,
      type: OUTSIDE_FOOD, name: post.name || post.mealName, consumed: true,
      hour: Number(parts.hour) + Number(parts.minute) / 60 + Number(parts.second) / 3600, time, uploadedAt: time }];
  });
  return [...plannedMeals, ...outside].sort((first, second) => first.hour - second.hour
    || Number(!!first.outsideFood) - Number(!!second.outsideFood));
}
