// Pure logic for "when should the next daily reminder fire?"
// Separated from expo-notifications wiring so we can unit-test without mocks.

export interface NextReminderInput {
  now: Date;
  reminderHHMM: string;
  lastPlayDate: string | null;
}

export interface NextReminder {
  fireAt: Date;
  skippedToday: boolean;
}

function parseHHMM(s: string): { hours: number; minutes: number } {
  const [hRaw, mRaw] = s.split(':');
  const hours = Math.max(0, Math.min(23, parseInt(hRaw, 10) || 0));
  const minutes = Math.max(0, Math.min(59, parseInt(mRaw, 10) || 0));
  return { hours, minutes };
}

function todayLocalISO(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeNextReminder(input: NextReminderInput): NextReminder {
  const { now, reminderHHMM, lastPlayDate } = input;
  const { hours, minutes } = parseHHMM(reminderHHMM);

  const today = todayLocalISO(now);
  const playedToday = lastPlayDate === today;

  const todaySlot = new Date(now);
  todaySlot.setHours(hours, minutes, 0, 0);

  if (playedToday) {
    const tomorrow = new Date(todaySlot);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { fireAt: tomorrow, skippedToday: true };
  }

  if (todaySlot.getTime() > now.getTime()) {
    return { fireAt: todaySlot, skippedToday: false };
  }

  const tomorrow = new Date(todaySlot);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { fireAt: tomorrow, skippedToday: false };
}
