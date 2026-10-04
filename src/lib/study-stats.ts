export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfWindow(days: number) {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

/** Dias seguidos com estudo registrado ou quiz concluído, contando de hoje para trás. */
export function calculateStreak(dates: Date[]) {
  const active = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = startOfToday();
  while (active.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
