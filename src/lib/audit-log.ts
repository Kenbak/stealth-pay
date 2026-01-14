/**
 * Audit logging for security and compliance
 *
 * Security recommendation: Log all sensitive operations
 * NEVER log sensitive data (passwords, salaries, private keys)
 * Only log metadata about actions
 */

export type AuditAction =
  | "AUTH_CHALLENGE_CREATED"
  | "AUTH_CHALLENGE_VERIFIED"
  | "AUTH_CHALLENGE_FAILED"
  | "AUTH_TOKEN_CREATED"
  | "ORG_CREATED"
  | "ORG_UPDATED"
  | "EMPLOYEE_CREATED"
  | "EMPLOYEE_UPDATED"
  | "EMPLOYEE_DELETED"
  | "PAYROLL_CREATED"
  | "PAYROLL_PREPARED"
  | "PAYROLL_EXECUTED"
  | "PAYROLL_CANCELLED"
  | "PAYROLL_FAILED"
  | "DEPOSIT_INITIATED"
  | "DEPOSIT_COMPLETED"
  | "SETTINGS_UPDATED"
  | "EXPORT_GENERATED";

export interface AuditLogEntry {
  timestamp: Date;
  action: AuditAction;
  actorWallet: string | null;
  organizationId: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, string | number | boolean>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

// In-memory store for dev, use proper logging service in production
const auditLogs: AuditLogEntry[] = [];

/**
 * Log an audit event
 *
 * IMPORTANT: Never include sensitive data in metadata!
 * OK: { employeeCount: 5, tokenMint: "USDC" }
 * BAD: { salary: 5000, employeeName: "John" }
 */
export async function logAudit(entry: Omit<AuditLogEntry, "timestamp">): Promise<void> {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date(),
  };

  // In development, log to console
  if (process.env.NODE_ENV === "development") {
    const emoji = entry.success ? "✅" : "❌";
    console.log(
      `${emoji} AUDIT [${entry.action}] wallet=${entry.actorWallet || "anonymous"} org=${entry.organizationId || "none"}`,
      entry.metadata || {}
    );
  }

  // Store in memory (in production, send to logging service)
  auditLogs.push(logEntry);

  // Keep only last 1000 entries in memory
  if (auditLogs.length > 1000) {
    auditLogs.shift();
  }

  // TODO: In production, send to:
  // - Supabase table
  // - External logging service (Datadog, LogTail, etc.)
  // - SIEM system
}

/**
 * Get recent audit logs for an organization
 */
export async function getAuditLogs(
  organizationId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  return auditLogs
    .filter((log) => log.organizationId === organizationId)
    .slice(-limit)
    .reverse();
}

/**
 * Get audit logs for compliance export
 */
export async function exportAuditLogs(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<AuditLogEntry[]> {
  return auditLogs.filter(
    (log) =>
      log.organizationId === organizationId &&
      log.timestamp >= startDate &&
      log.timestamp <= endDate
  );
}

/**
 * Helper to create audit context from request
 */
export function createAuditContext(
  headers: Headers
): Pick<AuditLogEntry, "ipAddress" | "userAgent"> {
  return {
    ipAddress:
      headers.get("x-real-ip") ||
      headers.get("x-forwarded-for")?.split(",")[0] ||
      undefined,
    userAgent: headers.get("user-agent") || undefined,
  };
}

/**
 * Security alert for suspicious activity
 */
export async function securityAlert(
  type: "BRUTE_FORCE" | "RATE_LIMIT_EXCEEDED" | "INVALID_SIGNATURE" | "SUSPICIOUS_ACTIVITY",
  details: Record<string, unknown>
): Promise<void> {
  console.error(`🚨 SECURITY ALERT [${type}]`, details);

  // TODO: In production:
  // - Send to Slack/Discord
  // - Send email to security team
  // - Trigger automated response (block IP, etc.)
}
