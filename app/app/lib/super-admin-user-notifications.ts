import {
  sendSuperAdminAccountChangeEmail,
  sendSuperAdminAccountRemovedEmail,
  sendSuperAdminEmailChangedAlertToOldAddress,
  sendSuperAdminWorksiteAccessEmail,
} from './email-service';
import { formatRoleLabel, normalizeRole } from './roles';

export type UserNotifySnapshot = {
  name: string | null;
  email: string | null;
  role: string;
  companyId: string | null;
  worksiteId: string | null;
  isActivated: boolean;
  approved: boolean;
  company: { name: string } | null;
  worksite: { name: string } | null;
};

function displayCompany(u: UserNotifySnapshot): string {
  return u.company?.name?.trim() || (u.companyId ? '(Company assigned)' : 'None');
}

function displayWorksite(u: UserNotifySnapshot): string {
  return u.worksite?.name?.trim() || (u.worksiteId ? '(Worksite assigned)' : 'None');
}

function accountStatus(u: Pick<UserNotifySnapshot, 'approved' | 'isActivated'>): string {
  if (u.approved && u.isActivated) return 'Active';
  if (!u.approved) return 'Suspended / not approved';
  if (!u.isActivated) return 'Deactivated';
  return 'Restricted';
}

/** Fire-and-forget: emails user about Super Admin edits (does not throw). */
export function queueSuperAdminUserPatchNotification(
  before: UserNotifySnapshot,
  after: UserNotifySnapshot,
  passwordSet: boolean
): void {
  const rows: { label: string; before: string; after: string }[] = [];

  const nBefore = (before.name ?? '').trim();
  const nAfter = (after.name ?? '').trim();
  if (nBefore !== nAfter) {
    rows.push({ label: 'Name', before: nBefore || '—', after: nAfter || '—' });
  }

  const eBefore = (before.email ?? '').trim();
  const eAfter = (after.email ?? '').trim();
  if (eBefore !== eAfter) {
    rows.push({ label: 'Email', before: eBefore || '—', after: eAfter || '—' });
  }

  if (normalizeRole(before.role) !== normalizeRole(after.role)) {
    rows.push({
      label: 'Platform role',
      before: formatRoleLabel(before.role),
      after: formatRoleLabel(after.role),
    });
  }

  if (before.companyId !== after.companyId) {
    rows.push({
      label: 'Primary company',
      before: displayCompany(before),
      after: displayCompany(after),
    });
  }

  if (before.worksiteId !== after.worksiteId) {
    rows.push({
      label: 'Primary worksite',
      before: displayWorksite(before),
      after: displayWorksite(after),
    });
  }

  if (before.approved !== after.approved || before.isActivated !== after.isActivated) {
    rows.push({
      label: 'Account status',
      before: accountStatus(before),
      after: accountStatus(after),
    });
  }

  if (passwordSet) {
    rows.push({
      label: 'Password',
      before: '—',
      after: 'Updated by platform administrator',
    });
  }

  if (rows.length === 0) return;

  const primary = (after.email ?? '').trim();
  if (!primary) {
    console.warn('[super-admin] skip notify: user has no email', { id: after });
    return;
  }

  void sendSuperAdminAccountChangeEmail({
    to: primary,
    recipientName: after.name,
    rows,
  }).catch((err) => console.error('[super-admin] account change email failed', err));

  if (eBefore && eAfter && eBefore !== eAfter) {
    void sendSuperAdminEmailChangedAlertToOldAddress({
      to: eBefore,
      newEmail: eAfter,
      recipientName: before.name,
    }).catch((err) => console.error('[super-admin] old-address email alert failed', err));
  }
}

export function queueSuperAdminAccountDeletedNotification(email: string | null, name: string | null): void {
  const to = (email ?? '').trim();
  if (!to) return;
  void sendSuperAdminAccountRemovedEmail({ to, recipientName: name }).catch((err) =>
    console.error('[super-admin] account removed email failed', err)
  );
}

export function queueSuperAdminWorksiteAccessNotification(options: {
  userEmail: string | null;
  userName: string | null;
  lines: string[];
}): void {
  const to = (options.userEmail ?? '').trim();
  if (!to || options.lines.length === 0) return;
  void sendSuperAdminWorksiteAccessEmail({
    to,
    recipientName: options.userName,
    summaryLines: options.lines,
  }).catch((err) => console.error('[super-admin] worksite access email failed', err));
}
