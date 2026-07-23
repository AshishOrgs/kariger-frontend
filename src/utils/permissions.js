export const PERMISSIONS = Object.freeze({
  REPAIR_INTAKE: "repair.intake",
  REPAIR_JOBS_VIEW: "repair.jobs.view",
  REPAIR_ESTIMATE: "repair.estimate",
  ESTIMATE_CREATE: "estimate.create",
  ESTIMATE_APPROVE: "estimate.approve",
  ESTIMATE_REJECT: "estimate.reject",
  REPAIR_ASSIGN: "repair.assign",
  REPAIR_WORK: "repair.work",
  REPAIR_STATUS_UPDATE: "repair.status.update",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_MANAGE: "inventory.manage",
  INVENTORY_CONSUME: "inventory.consume",

  BILLING_VIEW: "billing.view",
  BILLING_CREATE: "billing.create",
  PAYMENT_COLLECT: "payment.collect",

  HANDOVER_VIEW: "handover.view",
  HANDOVER_MANAGE: "handover.manage",

  VENDOR_VIEW: "vendor.view",
  VENDOR_MANAGE: "vendor.manage",
  VENDOR_JOB_UPDATE: "vendor.job.update",

  REPORTS_VIEW: "reports.view",

  STAFF_VIEW: "staff.view",
  STAFF_MANAGE: "staff.manage",
  STAFF_BRANCH_ASSIGN: "staff.branch.assign",

  BRANCH_VIEW: "branch.view",
  BRANCH_MANAGE: "branch.manage",

  BUSINESS_MANAGE: "business.manage",
  SETTINGS_MANAGE: "settings.manage",
  SUBSCRIPTION_MANAGE: "subscription.manage",

  SUPER_ADMIN_MANAGE: "superadmin.manage",
});

export const hasAnyPermission = (permissions = [], requiredPermissions = []) => {
  if (!Array.isArray(permissions) || permissions.length === 0) return false;
  return requiredPermissions.some((permission) => permissions.includes(permission));
};

export const hasAllPermissions = (permissions = [], requiredPermissions = []) => {
  if (!Array.isArray(permissions) || permissions.length === 0) return false;
  return requiredPermissions.every((permission) => permissions.includes(permission));
};
