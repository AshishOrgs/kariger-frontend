import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/utils/permissions";

const Assignments = lazy(() => import("@/pages/Assignments").then((module) => ({ default: module.Assignments })));
const AssignedRepairs = lazy(() => import("@/pages/AssignedRepairs").then((module) => ({ default: module.AssignedRepairs })));
const TechnicianInventory = lazy(() => import("@/pages/AssignedRepairs").then((module) => ({ default: module.TechnicianInventory })));
const Billing = lazy(() => import("@/pages/Billing").then((module) => ({ default: module.Billing })));
const BranchManagement = lazy(() => import("@/pages/BranchManagement").then((module) => ({ default: module.BranchManagement })));
const BusinessProfile = lazy(() => import("@/pages/BusinessProfile").then((module) => ({ default: module.BusinessProfile })));
const InvoiceDetails = lazy(() => import("@/pages/Billing").then((module) => ({ default: module.InvoiceDetails })));
const CustomerDetails = lazy(() => import("@/pages/Customers").then((module) => ({ default: module.CustomerDetails })));
const Customers = lazy(() => import("@/pages/Customers").then((module) => ({ default: module.Customers })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const EstimateDetails = lazy(() => import("@/pages/Estimates").then((module) => ({ default: module.EstimateDetails })));
const Estimates = lazy(() => import("@/pages/Estimates").then((module) => ({ default: module.Estimates })));
const Handover = lazy(() => import("@/pages/Handover").then((module) => ({ default: module.Handover })));
const Inventory = lazy(() => import("@/pages/Inventory").then((module) => ({ default: module.Inventory })));
const InventoryDetails = lazy(() => import("@/pages/Inventory").then((module) => ({ default: module.InventoryDetails })));
const Login = lazy(() => import("@/pages/Login").then((module) => ({ default: module.Login })));
const Signup = lazy(() => import("@/pages/Signup").then((module) => ({ default: module.Signup })));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword").then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import("@/pages/ResetPassword").then((module) => ({ default: module.ResetPassword })));
const PlanSelection = lazy(() => import("@/pages/PlanSelection").then((module) => ({ default: module.PlanSelection })));
const CreateRepair = lazy(() => import("@/pages/Repair").then((module) => ({ default: module.CreateRepair })));
const Repair = lazy(() => import("@/pages/Repair").then((module) => ({ default: module.Repair })));
const RepairDetails = lazy(() => import("@/pages/Repair").then((module) => ({ default: module.RepairDetails })));
const AdminWorkflow = lazy(() => import("@/pages/AdminWorkflow").then((module) => ({ default: module.AdminWorkflow })));
const BranchPortal = lazy(() => import("@/pages/BranchPortal").then((module) => ({ default: module.BranchPortal })));
const BranchDetails = lazy(() => import("@/pages/BranchDetails").then((module) => ({ default: module.BranchDetails })));
const LandingPage = lazy(() => import("@/pages/PublicPage/LandingPage").then((module) => ({ default: module.LandingPage })));
const ContactPage = lazy(() => import("@/pages/PublicPage/ContactPage").then((module) => ({ default: module.ContactPage })));
const LegalPage = lazy(() => import("@/pages/PublicPage/LegalPage").then((module) => ({ default: module.LegalPage })));
const StaffManagement = lazy(() => import("@/pages/StaffManagement").then((module) => ({ default: module.StaffManagement })));
const Subscription = lazy(() => import("@/pages/Subscription").then((module) => ({ default: module.Subscription })));
const SuperAdminBusinesses = lazy(() => import("@/pages/SuperAdminBusinesses").then((module) => ({ default: module.SuperAdminBusinesses })));
const SuperAdminBusinessDetails = lazy(() => import("@/pages/SuperAdminBusinesses").then((module) => ({ default: module.SuperAdminBusinessDetails })));
const SuperAdminDashboard = lazy(() => import("@/pages/SuperAdminDashboard").then((module) => ({ default: module.SuperAdminDashboard })));
const SuperAdminContacts = lazy(() => import("@/pages/SuperAdminContacts").then((module) => ({ default: module.SuperAdminContacts })));
const Vendors = lazy(() => import("@/pages/Vendors").then((module) => ({ default: module.Vendors })));
const NotFoundPage = lazy(() => import("@/pages/ErrorPages").then((module) => ({ default: module.NotFoundPage })));
const UnauthorizedPage = lazy(() => import("@/pages/ErrorPages").then((module) => ({ default: module.UnauthorizedPage })));

function RepairDetailsRoute() {
  const { id } = useParams();
  return <RepairDetails id={id} />;
}

function EstimateDetailsRoute() {
  const { id } = useParams();
  return <EstimateDetails id={id} />;
}

function CustomerDetailsRoute() {
  const { id } = useParams();
  return <CustomerDetails id={id} />;
}

function InvoiceDetailsRoute() {
  const { id } = useParams();
  return <InvoiceDetails id={id} />;
}

function InventoryDetailsRoute() {
  const { id } = useParams();
  return <InventoryDetails id={id} />;
}

function SuperAdminBusinessDetailsRoute() {
  const { id } = useParams();
  return <SuperAdminBusinessDetails id={id} />;
}

function RequirePermission({ anyOf = [], allOf = [], children }) {
  const { hasPermission, hasAllPermissions } = useAuth();
  const hasAnyRequiredPermission = anyOf.length === 0 || hasPermission(...anyOf);
  const hasEveryRequiredPermission = allOf.length === 0 || hasAllPermissions(...allOf);

  if (!hasAnyRequiredPermission || !hasEveryRequiredPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

const dashboardPermissions = [
  PERMISSIONS.SUPER_ADMIN_MANAGE,
  PERMISSIONS.REPAIR_INTAKE,
  PERMISSIONS.REPAIR_JOBS_VIEW,
  PERMISSIONS.REPAIR_WORK,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.BILLING_VIEW,
  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.BRANCH_VIEW,
  PERMISSIONS.STAFF_VIEW,
  PERMISSIONS.SUBSCRIPTION_MANAGE,
];
const branchPortalPermissions = [PERMISSIONS.REPAIR_INTAKE, PERMISSIONS.SUBSCRIPTION_MANAGE];
const subscriptionPermissions = [PERMISSIONS.SUBSCRIPTION_MANAGE];
const branchViewPermissions = [PERMISSIONS.BRANCH_VIEW, PERMISSIONS.BRANCH_MANAGE];
const branchManagePermissions = [PERMISSIONS.BRANCH_MANAGE];
const businessPermissions = [PERMISSIONS.BUSINESS_MANAGE];
const staffPermissions = [PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_MANAGE];
const repairViewPermissions = [PERMISSIONS.REPAIR_JOBS_VIEW];
const repairIntakePermissions = [PERMISSIONS.REPAIR_INTAKE];
const estimatePermissions = [PERMISSIONS.REPAIR_ESTIMATE, PERMISSIONS.ESTIMATE_CREATE];
const assignmentPermissions = [PERMISSIONS.REPAIR_ASSIGN];
const inventoryPermissions = [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.INVENTORY_CONSUME];
const billingPermissions = [PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_CREATE, PERMISSIONS.PAYMENT_COLLECT];
const handoverPermissions = [PERMISSIONS.HANDOVER_VIEW, PERMISSIONS.HANDOVER_MANAGE];
const vendorPermissions = [PERMISSIONS.VENDOR_VIEW, PERMISSIONS.VENDOR_MANAGE, PERMISSIONS.VENDOR_JOB_UPDATE];
const repairWorkPermissions = [PERMISSIONS.REPAIR_WORK];
const superAdminPermissions = [PERMISSIONS.SUPER_ADMIN_MANAGE];

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Loading screen...</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy-policy" element={<LegalPage type="privacy-policy" />} />
        <Route path="/terms-and-conditions" element={<LegalPage type="terms-and-conditions" />} />
        <Route path="/cookie-policy" element={<LegalPage type="cookie-policy" />} />
        <Route path="/refund-policy" element={<LegalPage type="refund-policy" />} />
        <Route path="/security-policy" element={<LegalPage type="security-policy" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute />} >
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<RequirePermission anyOf={dashboardPermissions}><Dashboard /></RequirePermission>} />
            <Route path="/branch/portal" element={<RequirePermission anyOf={branchPortalPermissions}><BranchPortal /></RequirePermission>} />
            <Route path="/plans" element={<RequirePermission anyOf={subscriptionPermissions}><PlanSelection /></RequirePermission>} />
            <Route path="/branches/:id" element={<RequirePermission anyOf={branchViewPermissions}><BranchDetails /></RequirePermission>} />
            <Route path="/admin/workflow" element={<RequirePermission anyOf={branchPortalPermissions}><AdminWorkflow /></RequirePermission>} />
            <Route path="/assignments" element={<RequirePermission anyOf={assignmentPermissions}><Assignments /></RequirePermission>} />
            <Route path="/billing" element={<RequirePermission anyOf={billingPermissions}><Billing /></RequirePermission>} />
            <Route path="/billing/invoices/:id" element={<RequirePermission anyOf={billingPermissions}><InvoiceDetailsRoute /></RequirePermission>} />
            <Route path="/branches" element={<RequirePermission anyOf={branchManagePermissions}><BranchManagement /></RequirePermission>} />
            <Route path="/business" element={<RequirePermission anyOf={businessPermissions}><BusinessProfile /></RequirePermission>} />
            <Route path="/customers" element={<RequirePermission anyOf={repairViewPermissions}><Customers /></RequirePermission>} />
            <Route path="/customers/:id" element={<RequirePermission anyOf={repairViewPermissions}><CustomerDetailsRoute /></RequirePermission>} />
            <Route path="/handover" element={<RequirePermission anyOf={handoverPermissions}><Handover /></RequirePermission>} />
            <Route path="/inventory" element={<RequirePermission anyOf={inventoryPermissions}><Inventory /></RequirePermission>} />
            <Route path="/inventory/:id" element={<RequirePermission anyOf={inventoryPermissions}><InventoryDetailsRoute /></RequirePermission>} />
            <Route path="/repair" element={<RequirePermission anyOf={repairViewPermissions}><Repair /></RequirePermission>} />
            <Route path="/repair/new" element={<RequirePermission anyOf={repairIntakePermissions}><CreateRepair /></RequirePermission>} />
            <Route path="/repair/estimates" element={<RequirePermission anyOf={estimatePermissions}><Estimates /></RequirePermission>} />
            <Route path="/repair/estimates/:id" element={<RequirePermission anyOf={estimatePermissions}><EstimateDetailsRoute /></RequirePermission>} />
            <Route path="/repair/:id" element={<RequirePermission anyOf={repairViewPermissions}><RepairDetailsRoute /></RequirePermission>} />
            <Route path="/staff" element={<RequirePermission anyOf={staffPermissions}><StaffManagement /></RequirePermission>} />
            <Route path="/subscription" element={<RequirePermission anyOf={subscriptionPermissions}><Subscription /></RequirePermission>} />
            <Route path="/super-admin/dashboard" element={<RequirePermission anyOf={superAdminPermissions}><SuperAdminDashboard /></RequirePermission>} />
            <Route path="/super-admin/businesses" element={<RequirePermission anyOf={superAdminPermissions}><SuperAdminBusinesses /></RequirePermission>} />
            <Route path="/super-admin/businesses/:id" element={<RequirePermission anyOf={superAdminPermissions}><SuperAdminBusinessDetailsRoute /></RequirePermission>} />
            <Route path="/super-admin/contacts" element={<RequirePermission anyOf={superAdminPermissions}><SuperAdminContacts /></RequirePermission>} />
            <Route path="/technician/repairs" element={<RequirePermission anyOf={repairWorkPermissions}><AssignedRepairs /></RequirePermission>} />
            <Route path="/technician/inventory" element={<RequirePermission anyOf={inventoryPermissions}><TechnicianInventory /></RequirePermission>} />
            <Route path="/vendors" element={<RequirePermission anyOf={vendorPermissions}><Vendors /></RequirePermission>} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
