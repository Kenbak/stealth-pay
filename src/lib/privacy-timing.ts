/**
 * Privacy Timing Module
 *
 * SECURITY: Prevents timing correlation attacks
 *
 * When executing payroll:
 * - Deposit happens at T0
 * - Without delays: 4 transfers in 30 seconds = obvious correlation
 * - With delays: Transfers spread over hours, harder to correlate
 */

/**
 * Configuration for timing randomization
 */
export interface TimingConfig {
  /** Minimum delay between transfers in milliseconds */
  minDelayMs: number;
  /** Maximum delay between transfers in milliseconds */
  maxDelayMs: number;
  /** Whether to shuffle the order of transfers */
  shuffleOrder: boolean;
  /** Whether to add jitter to the timing */
  addJitter: boolean;
}

/**
 * Default timing configs for different scenarios
 */
export const TIMING_CONFIGS = {
  // Development: Fast for testing
  development: {
    minDelayMs: 1000, // 1 second
    maxDelayMs: 3000, // 3 seconds
    shuffleOrder: true,
    addJitter: true,
  },

  // Production: Real privacy protection
  production: {
    minDelayMs: 30 * 1000, // 30 seconds
    maxDelayMs: 5 * 60 * 1000, // 5 minutes
    shuffleOrder: true,
    addJitter: true,
  },

  // Maximum privacy: For high-value payrolls
  maxPrivacy: {
    minDelayMs: 5 * 60 * 1000, // 5 minutes
    maxDelayMs: 30 * 60 * 1000, // 30 minutes
    shuffleOrder: true,
    addJitter: true,
  },
} as const;

/**
 * Get random delay within configured range
 */
export function getRandomDelay(config: TimingConfig): number {
  const range = config.maxDelayMs - config.minDelayMs;
  let delay = config.minDelayMs + Math.random() * range;

  // Add jitter: ±10% randomization
  if (config.addJitter) {
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    delay += jitter;
  }

  return Math.round(delay);
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a schedule for private transfers
 * Returns array of { item, delayMs } pairs
 */
export interface ScheduledTransfer<T> {
  item: T;
  delayMs: number;
  scheduledAt: number; // Unix timestamp when this should execute
}

export function generateTransferSchedule<T>(
  items: T[],
  config: TimingConfig,
  startTime: number = Date.now()
): ScheduledTransfer<T>[] {
  // Optionally shuffle order
  const orderedItems = config.shuffleOrder ? shuffleArray(items) : items;

  let currentTime = startTime;
  const schedule: ScheduledTransfer<T>[] = [];

  for (const item of orderedItems) {
    const delay = getRandomDelay(config);
    currentTime += delay;

    schedule.push({
      item,
      delayMs: delay,
      scheduledAt: currentTime,
    });
  }

  return schedule;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute transfers with privacy-preserving timing
 */
export async function executeWithPrivacyTiming<T, R>(
  items: T[],
  executor: (item: T) => Promise<R>,
  config: TimingConfig,
  onProgress?: (completed: number, total: number, result: R) => void
): Promise<R[]> {
  const schedule = generateTransferSchedule(items, config);
  const results: R[] = [];

  for (let i = 0; i < schedule.length; i++) {
    const { item, delayMs } = schedule[i];

    // Wait before executing (except for the first one)
    if (i > 0) {
      await sleep(delayMs);
    }

    // Execute the transfer
    const result = await executor(item);
    results.push(result);

    // Report progress
    if (onProgress) {
      onProgress(i + 1, schedule.length, result);
    }
  }

  return results;
}

/**
 * Calculate estimated completion time for a payroll
 */
export function estimateCompletionTime(
  employeeCount: number,
  config: TimingConfig
): {
  minMinutes: number;
  maxMinutes: number;
  avgMinutes: number;
} {
  const avgDelayMs = (config.minDelayMs + config.maxDelayMs) / 2;
  const minTotalMs = employeeCount * config.minDelayMs;
  const maxTotalMs = employeeCount * config.maxDelayMs;
  const avgTotalMs = employeeCount * avgDelayMs;

  return {
    minMinutes: Math.ceil(minTotalMs / 60000),
    maxMinutes: Math.ceil(maxTotalMs / 60000),
    avgMinutes: Math.ceil(avgTotalMs / 60000),
  };
}

/**
 * Get appropriate timing config based on environment
 */
export function getTimingConfig(): TimingConfig {
  if (process.env.NODE_ENV === "development") {
    return TIMING_CONFIGS.development;
  }

  // Check for max privacy mode (could be a user preference)
  if (process.env.MAX_PRIVACY_MODE === "true") {
    return TIMING_CONFIGS.maxPrivacy;
  }

  return TIMING_CONFIGS.production;
}
