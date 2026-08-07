/**
 * Admin view models (Phase 6).
 *
 * Source: doc 18 (Admin Dashboard), Phase 6 requirements.
 */

export interface DashboardMetrics {
  totalUsers: number;
  totalMemories: number;
  publishedMemories: number;
  pendingPayments: number;
  pendingReports: number;
  genesisUsed: number;
  genesisMax: number;
  genesisRemaining: number;
  genesisEnabled: boolean;
  /** Sum of amounts for approved+published payments only (doc 19). */
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
}

export interface ActivityEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  requestId: string | null;
  createdAt: string;
  /** Optional resolved actor name for display. */
  actorName: string | null;
}

export interface AdminPaymentRow {
  id: string;
  reference: string;
  userId: string;
  userName: string | null;
  memoryId: string;
  memoryTitle: string;
  locationName: string | null;
  pinType: string;
  tier: number;
  amount: number;
  method: string | null;
  status: string;
  isGenesis: boolean;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  hasReceipt: boolean;
}

export interface AdminMemoryRow {
  id: string;
  title: string;
  slug: string;
  userId: string;
  userName: string | null;
  locationName: string | null;
  pinType: string;
  visibility: string;
  status: string;
  publicationStatus: string;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  reportCount: number;
}

export interface AdminReportRow {
  id: string;
  reporterId: string;
  reporterName: string | null;
  memoryId: string;
  memoryTitle: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminUserRow {
  id: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  role: string;
  genesisClaimed: boolean;
  createdAt: string;
  memoryCount: number;
  paymentCount: number;
}

export interface AdminLocationRow {
  id: string;
  name: string;
  slug: string;
  governorate: string | null;
  city: string | null;
  tier: number;
  status: string;
  memoryCount: number;
  legacyCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A settings row for the admin UI. */
export interface AdminSettingRow {
  id: string;
  category: string;
  key: string;
  value: string;
  type: string;
  description: string | null;
  updatedAt: string;
  /** Whether this setting is sensitive (masked in the UI). */
  sensitive: boolean;
}
