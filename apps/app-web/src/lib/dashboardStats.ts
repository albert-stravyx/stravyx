import type { Job } from "../stravyx/types";

export const UNSET_METRIC = "—" as const;
export const CASH_OUT_PENDING_DOLLARS = 0;

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface WeeklyEarnPoint {
  day: (typeof WEEKDAY_LABELS)[number];
  amount: number;
}

export interface CustomerDashboardStats {
  totalSpent: number;
  avgRating: typeof UNSET_METRIC;
}

export interface OperatorDashboardStats {
  jobsDone: number;
  todayEarn: number;
  thisWeekEarn: number;
  thisMonthEarn: number;
  weeklyEarnings: WeeklyEarnPoint[];
  rating: typeof UNSET_METRIC;
  avgResponse: typeof UNSET_METRIC;
}

/** Existing operator-earn formula used on the dashboard — do not invent a new projector. */
export function operatorEarn(job: Pick<Job, "flightFee">): number {
  return Math.round(job.flightFee * 0.85);
}

export function formatAudWhole(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-AU")}`;
}

export function customerDashboardStats(
  jobs: ReadonlyArray<Pick<Job, "totalPrice">>,
): CustomerDashboardStats {
  return {
    totalSpent: jobs.reduce((sum, job) => sum + job.totalPrice, 0),
    avgRating: UNSET_METRIC,
  };
}

function startOfWeekMonday(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay();
  const offset = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function completedAt(job: Pick<Job, "completedAt" | "createdAt">): Date {
  return job.completedAt ?? job.createdAt;
}

export function operatorDashboardStats(
  jobs: ReadonlyArray<Pick<Job, "status" | "flightFee" | "completedAt" | "createdAt">>,
  now: Date,
): OperatorDashboardStats {
  const completed = jobs.filter((job) => job.status === "completed");
  const weekStart = startOfWeekMonday(now);

  const weeklyEarnings: WeeklyEarnPoint[] = WEEKDAY_LABELS.map((day, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    const amount = completed
      .filter((job) => isSameLocalDay(completedAt(job), dayDate))
      .reduce((sum, job) => sum + operatorEarn(job), 0);
    return { day, amount };
  });

  const thisWeekEarn = weeklyEarnings.reduce((sum, point) => sum + point.amount, 0);
  const todayEarn = completed
    .filter((job) => isSameLocalDay(completedAt(job), now))
    .reduce((sum, job) => sum + operatorEarn(job), 0);
  const thisMonthEarn = completed
    .filter((job) => {
      const at = completedAt(job);
      return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth();
    })
    .reduce((sum, job) => sum + operatorEarn(job), 0);

  return {
    jobsDone: completed.length,
    todayEarn,
    thisWeekEarn,
    thisMonthEarn,
    weeklyEarnings,
    rating: UNSET_METRIC,
    avgResponse: UNSET_METRIC,
  };
}
