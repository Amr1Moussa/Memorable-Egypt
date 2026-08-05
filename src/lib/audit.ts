import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Json } from "@/lib/supabase/types";

/**
 * Audit event logging.
 *
 * `audit_log` is admin-read-only with no public write policy (migration 0007),
 * so inserts go through the service-role client. This is intentional: a user
 * must never be able to forge an audit entry (docs 17, 21).
 *
 * Auth events tracked (per Phase 2.2 requirements):
 *   USER_REGISTERED, EMAIL_VERIFIED, LOGIN_SUCCESS, LOGIN_FAILED,
 *   PASSWORD_RESET_REQUESTED, PASSWORD_CHANGED, ROLE_CHANGED, ADMIN_LOGIN.
 *
 * Failures are logged but never thrown — an audit write must not break the
 * user-facing operation it's recording.
 *
 * Source: docs 17 (Moderation — Audit Log), 18 (Admin — Audit Log),
 *         21 (Security — Logging).
 */

export const AUDIT_ACTIONS = {
  USER_REGISTERED: "user.registered",
  EMAIL_VERIFIED: "user.email_verified",
  LOGIN_SUCCESS: "auth.login_success",
  LOGIN_FAILED: "auth.login_failed",
  PASSWORD_RESET_REQUESTED: "auth.password_reset_requested",
  PASSWORD_CHANGED: "auth.password_changed",
  ROLE_CHANGED: "user.role_changed",
  ADMIN_LOGIN: "auth.admin_login",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditInput {
  /** The user performing/affected by the action (may be null for failed login). */
  actorId?: string | null;
  action: AuditAction;
  /** Entity type — usually "user" for auth events. */
  entityType?: string;
  entityId?: string | null;
  /** Optional structured metadata. Never put secrets/PII here. */
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(input: AuditInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType ?? "user",
      entity_id: input.entityId ?? input.actorId ?? null,
      metadata: (input.metadata ?? null) as Json,
    });
  } catch (error) {
    // Audit failure must never break the operation it recorded.
    logger.error("Failed to write audit log entry", error, {
      action: input.action,
    });
  }
}
