import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Banknote,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Download,
  Edit2,
  FileText,
  History,
  Layers,
  Loader2,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Save,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, Td, Th } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QueryState } from "@/components/ui/QueryState";
import { EmptyState } from "@/components/ui/EmptyState";
import { payrollApi, staffApi } from "@/services/modules";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/utils/permissions";
import { cn } from "@/utils/cn";

export function PayrollPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { user, hasPermission } = useAuth();

  const isManager = hasPermission(PERMISSIONS.SALARY_MANAGE, PERMISSIONS.OWNER);

  const [monthStr, setMonthStr] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [activeTab, setActiveTab] = useState("register"); // 'register' | 'overtime' | 'advances' | 'settings'

  // Modals state
  const [payslipRecord, setPayslipRecord] = useState(null);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [otModalOpen, setOtModalOpen] = useState(false);
  const [salaryEditStaff, setSalaryEditStaff] = useState(null);
  const [deductionsLogModal, setDeductionsLogModal] = useState(null);

  // Queries
  const { data: payrollData, isLoading: payrollLoading, isError: payrollError, error: payrollErr, refetch: refetchPayroll, isFetching: payrollFetching } = useQuery({
    queryKey: ["payroll-calculate", monthStr],
    queryFn: () => payrollApi.calculate({ month: monthStr }),
  });

  const { data: advancesData, isLoading: advancesLoading, refetch: refetchAdvances } = useQuery({
    queryKey: ["payroll-advances"],
    queryFn: () => payrollApi.listAdvances(),
  });

  const { data: otData, isLoading: otLoading, refetch: refetchOt } = useQuery({
    queryKey: ["payroll-ot", monthStr],
    queryFn: () => payrollApi.listOvertime({ month: monthStr }),
  });

  const { data: staffData, refetch: refetchStaff } = useQuery({
    queryKey: ["staff-list"],
    queryFn: () => staffApi.list(),
  });

  const payrollRecords = payrollData?.payroll || [];
  const summary = payrollData?.summary || {
    staffCount: 0,
    totalGross: 0,
    totalOtPay: 0,
    totalAdvances: 0,
    totalNet: 0,
    paidCount: 0,
    draftCount: 0,
  };
  const advances = advancesData?.data || advancesData || [];
  const otRequests = otData?.data || otData || [];
  const staffList = staffData?.staff || [];

  // Mutations
  const savePayrollMutation = useMutation({
    mutationFn: () => payrollApi.save({ month: monthStr, records: payrollRecords }),
    onSuccess: () => {
      showSuccess(`Monthly payroll register for ${monthStr} saved`);
      queryClient.invalidateQueries({ queryKey: ["payroll-calculate", monthStr] });
    },
    onError: (err) => {
      showError(err.response?.data?.message || err.message || "Failed to save payroll");
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (payrollId) => payrollApi.markPaid(payrollId, { paidAt: new Date().toISOString() }),
    onSuccess: () => {
      showSuccess("Salary disbursed and advance loan settled");
      queryClient.invalidateQueries({ queryKey: ["payroll-calculate", monthStr] });
      queryClient.invalidateQueries({ queryKey: ["payroll-advances"] });
    },
    onError: (err) => {
      showError(err.response?.data?.message || err.message || "Failed to disburse salary");
    },
  });

  const updateAdvanceStatusMutation = useMutation({
    mutationFn: ({ id, status, approvedAmount, emi }) =>
      payrollApi.updateAdvanceStatus(id, { status, approvedAmount, emi }),
    onSuccess: () => {
      showSuccess("Advance loan status updated");
      queryClient.invalidateQueries({ queryKey: ["payroll-advances"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-calculate", monthStr] });
    },
    onError: (err) => {
      showError(err.response?.data?.message || err.message || "Failed to update advance");
    },
  });

  const updateOtStatusMutation = useMutation({
    mutationFn: ({ id, status }) => payrollApi.updateOvertimeStatus(id, { status }),
    onSuccess: () => {
      showSuccess("Overtime status updated");
      queryClient.invalidateQueries({ queryKey: ["payroll-ot", monthStr] });
      queryClient.invalidateQueries({ queryKey: ["payroll-calculate", monthStr] });
    },
    onError: (err) => {
      showError(err.response?.data?.message || err.message || "Failed to update overtime");
    },
  });

  const updateStaffSalaryMutation = useMutation({
    mutationFn: ({ staffId, salary, salaryType, dept }) =>
      payrollApi.updateStaffSalary(staffId, { salary, salaryType, dept }),
    onSuccess: () => {
      showSuccess("Staff salary profile updated");
      setSalaryEditStaff(null);
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-calculate", monthStr] });
    },
    onError: (err) => {
      showError(err.response?.data?.message || err.message || "Failed to update salary");
    },
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Payroll & Salary Register"
        description="Comprehensive salary disbursement engine with 1.5x overtime and loan deductions"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Month:</span>
              <input
                type="month"
                value={monthStr}
                onChange={(e) => setMonthStr(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetchPayroll()}
              disabled={payrollFetching}
              title="Recalculate"
            >
              <RefreshCw className={cn("h-4 w-4", payrollFetching && "animate-spin")} />
            </Button>

            {isManager && activeTab === "register" && (
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
                onClick={() => savePayrollMutation.mutate()}
                disabled={savePayrollMutation.isPending || payrollRecords.length === 0}
              >
                {savePayrollMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Payroll Register
              </Button>
            )}
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Total Net Payout
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                ₹{summary.totalNet?.toLocaleString("en-IN")}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-emerald-600 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Gross Pay</p>
              <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                ₹{summary.totalGross?.toLocaleString("en-IN")}
              </p>
            </div>
            <Banknote className="h-8 w-8 text-blue-500 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Overtime (1.5x Pay)</p>
              <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                ₹{summary.totalOtPay?.toLocaleString("en-IN")}
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Loan Deductions</p>
              <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
                -₹{summary.totalAdvances?.toLocaleString("en-IN")}
              </p>
            </div>
            <Coins className="h-8 w-8 text-purple-500 opacity-60" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[var(--border)]">
        {[
          { id: "register", label: "Payroll Register", icon: Receipt, badge: payrollRecords.length },
          { id: "overtime", label: "Overtime Requests", icon: Clock, badge: otRequests.filter((o) => o.status === "PENDING").length },
          { id: "advances", label: "Salary Advances & Loans", icon: Coins, badge: advances.filter((a) => a.status === "PENDING").length },
          { id: "settings", label: "Salary Settings", icon: Layers, badge: staffList.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all",
                isActive
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-[var(--card)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {Boolean(tab.badge) && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950" : "bg-slate-100 text-slate-700 dark:bg-slate-800"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PAYROLL REGISTER */}
      {activeTab === "register" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">Monthly Salary Register ({monthStr})</CardTitle>
              <p className="text-xs text-[var(--muted)]">Calculated on standard 26-day basis with 1.5x overtime multiplier</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {summary.paidCount} Paid
              </span>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {summary.draftCount} Draft
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <QueryState
              isLoading={payrollLoading}
              isError={payrollError}
              error={payrollErr}
              data={payrollRecords}
              emptyMessage="No staff records available to calculate payroll."
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Staff Member</Th>
                    <Th>Branch</Th>
                    <Th>Salary Type</Th>
                    <Th>Base Salary</Th>
                    <Th className="text-center">Present (Full)</Th>
                    <Th className="text-center">Half Days</Th>
                    <Th className="text-center">Payable Days</Th>
                    <Th>Gross Pay</Th>
                    <Th>Overtime</Th>
                    <Th>Advance EMI</Th>
                    <Th>Net Pay</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRecords.map((r) => (
                    <tr key={r.staffId} className="hover:bg-[var(--muted-surface)]/50 transition-colors">
                      <Td>
                        <div>
                          <p className="font-semibold text-sm text-[var(--foreground)]">{r.staffName}</p>
                          <p className="text-xs text-[var(--muted)]">{r.dept}</p>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[var(--foreground)]">
                          {r.branchName || "Main Branch"}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                          {r.salaryType}
                        </span>
                      </Td>
                      <Td className="font-mono text-xs font-medium">₹{r.baseSalary?.toLocaleString("en-IN")}</Td>
                      <Td className="text-center">
                        <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {r.fullDays ?? r.presentDays}
                        </span>
                      </Td>
                      <Td className="text-center">
                        <span className={cn("font-bold text-xs", (r.halfDays || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400")}>
                          {r.halfDays ?? 0}
                        </span>
                      </Td>
                      <Td className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center font-black text-xs text-[var(--foreground)] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {r.presentDays} / {r.totalDays || r.workingDays || 30}
                          </span>
                          <span className="text-[10px] text-[var(--muted)] mt-0.5">
                            ({r.fullDays ?? r.presentDays}F + {r.halfDays ?? 0}H)
                          </span>
                        </div>
                      </Td>
                      <Td className="font-mono text-xs font-semibold text-[var(--foreground)]">
                        ₹{r.grossPay?.toLocaleString("en-IN")}
                      </Td>
                      <Td>
                        {r.otHours > 0 ? (
                          <div className="text-xs">
                            <span className="font-bold text-amber-600 dark:text-amber-400">+{r.otHours}h</span>
                            <span className="text-[var(--muted)] ml-1 font-mono">(₹{r.otPay})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">0h</span>
                        )}
                      </Td>
                      <Td>
                        {r.advanceDeduction > 0 ? (
                          <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                            -₹{r.advanceDeduction?.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </Td>
                      <Td>
                        <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                          ₹{r.netPay?.toLocaleString("en-IN")}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold",
                            r.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          )}
                        >
                          {r.status}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => setPayslipRecord(r)}
                            title="View Payslip"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1" />
                            Slip
                          </Button>

                          {isManager && r.status !== "PAID" && r.payrollId && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2"
                              disabled={markPaidMutation.isPending}
                              onClick={() => markPaidMutation.mutate(r.payrollId)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </QueryState>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: OVERTIME REQUESTS */}
      {activeTab === "overtime" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">Overtime Requests ({monthStr})</CardTitle>
              <p className="text-xs text-[var(--muted)]">Approved hours are automatically multiplied by 1.5x in payroll</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setOtModalOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Log Overtime
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {otRequests.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={Clock}
                  title="No overtime requests"
                  description="No overtime entries found for the selected month."
                />
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Staff Member</Th>
                    <Th>Branch</Th>
                    <Th>Date</Th>
                    <Th>OT Hours</Th>
                    <Th>Reason / Remarks</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {otRequests.map((ot) => (
                    <tr key={ot.id} className="hover:bg-[var(--muted-surface)]/50 transition-colors">
                      <Td className="font-semibold text-sm">{ot.staff?.fullName || "Staff"}</Td>
                      <Td className="text-xs">{ot.branch?.name || "Main"}</Td>
                      <Td className="text-xs font-mono">{ot.date ? new Date(ot.date).toLocaleDateString("en-IN") : "—"}</Td>
                      <Td className="text-xs font-bold text-amber-600 dark:text-amber-400">{ot.otHours} Hours</Td>
                      <Td className="text-xs text-[var(--muted)] max-w-xs truncate">{ot.reason || "—"}</Td>
                      <Td>
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold",
                            ot.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : ot.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          )}
                        >
                          {ot.status}
                        </span>
                      </Td>
                      <Td className="text-right">
                        {isManager && ot.status === "PENDING" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs h-7 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                              onClick={() => updateOtStatusMutation.mutate({ id: ot.id, status: "APPROVED" })}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs h-7 text-rose-700 hover:bg-rose-50 border-rose-300"
                              onClick={() => updateOtStatusMutation.mutate({ id: ot.id, status: "REJECTED" })}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: SALARY ADVANCES & LOANS */}
      {activeTab === "advances" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">Salary Advances & Loan Register</CardTitle>
              <p className="text-xs text-[var(--muted)]">Active loans are automatically deducted as monthly EMIs during payroll</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setAdvanceModalOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Request Advance
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {advances.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={Coins}
                  title="No advance requests"
                  description="No salary loans or advances recorded."
                />
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Staff Member</Th>
                    <Th>Branch</Th>
                    <Th>Principal Borrowed</Th>
                    <Th>Monthly EMI</Th>
                    <Th>Unpaid Balance</Th>
                    <Th>Status</Th>
                    <Th>Deductions Log</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-[var(--muted-surface)]/50 transition-colors">
                      <Td className="font-semibold text-sm">{adv.staff?.fullName}</Td>
                      <Td className="text-xs">{adv.branch?.name || "Main"}</Td>
                      <Td className="text-xs font-mono font-medium">₹{Number(adv.amount)?.toLocaleString("en-IN")}</Td>
                      <Td className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                        ₹{Number(adv.emi)?.toLocaleString("en-IN")}/mo
                      </Td>
                      <Td className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                        ₹{Number(adv.balance)?.toLocaleString("en-IN")}
                      </Td>
                      <Td>
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold",
                            adv.status === "SETTLED"
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : adv.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : adv.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          )}
                        >
                          {adv.status}
                        </span>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => setDeductionsLogModal(adv)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <History className="h-3.5 w-3.5" />
                          {Array.isArray(adv.deductionsLog) ? `${adv.deductionsLog.length} payments` : "0 logs"}
                        </button>
                      </Td>
                      <Td className="text-right">
                        {isManager && adv.status === "PENDING" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs h-7 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                              onClick={() =>
                                updateAdvanceStatusMutation.mutate({
                                  id: adv.id,
                                  status: "APPROVED",
                                  approvedAmount: adv.amount,
                                  emi: adv.emi,
                                })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs h-7 text-rose-700 hover:bg-rose-50 border-rose-300"
                              onClick={() => updateAdvanceStatusMutation.mutate({ id: adv.id, status: "REJECTED" })}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: SALARY CONFIGURATION */}
      {activeTab === "settings" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Staff Salary Profiles</CardTitle>
            <p className="text-xs text-[var(--muted)]">Configure salary type (Monthly, Daily, Hourly) and base compensation rate</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>Staff Member</Th>
                  <Th>Branch</Th>
                  <Th>Role</Th>
                  <Th>Department</Th>
                  <Th>Salary Type</Th>
                  <Th>Base Salary (₹)</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-[var(--muted-surface)]/50 transition-colors">
                    <Td className="font-semibold text-sm">{staff.fullName}</Td>
                    <Td className="text-xs">{staff.branch?.name || "Main Branch"}</Td>
                    <Td className="text-xs font-semibold">{staff.role}</Td>
                    <Td className="text-xs text-[var(--muted)]">{staff.dept || "General"}</Td>
                    <Td>
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {staff.salaryType || "MONTHLY"}
                      </span>
                    </Td>
                    <Td className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(staff.salary || 0).toLocaleString("en-IN")}
                    </Td>
                    <Td className="text-right">
                      {isManager && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setSalaryEditStaff(staff)}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Configure
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* MODAL: PRINT / VIEW PAYSLIP */}
      {payslipRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl text-[var(--foreground)]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-bold">Salary Pay Slip — {payslipRecord.monthStr}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPayslipRecord(null)}
                className="rounded-lg p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Employee Name:</span>
                <span className="font-bold">{payslipRecord.staffName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Department & Branch:</span>
                <span className="font-medium">{payslipRecord.dept} • {payslipRecord.branchName || "Main"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Salary Basis:</span>
                <span className="font-medium">{payslipRecord.salaryType} (₹{payslipRecord.baseSalary?.toLocaleString("en-IN")})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Days Present:</span>
                <span className="font-bold text-emerald-600">
                  {payslipRecord.presentDays} of {payslipRecord.totalDays || payslipRecord.workingDays || 30} days
                  {payslipRecord.halfDays !== undefined && (
                    <span className="text-xs font-normal text-[var(--muted)] ml-1">
                      ({payslipRecord.fullDays ?? payslipRecord.presentDays} Full, {payslipRecord.halfDays} Half)
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4 text-sm">
              <div className="flex justify-between">
                <span>Base Earned Gross:</span>
                <span className="font-mono font-semibold">₹{payslipRecord.grossPay?.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Approved Overtime ({payslipRecord.otHours}h @ 1.5x):</span>
                <span className="font-mono font-semibold">+₹{payslipRecord.otPay?.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-purple-600 dark:text-purple-400">
                <span>Salary Advance EMI Deduction:</span>
                <span className="font-mono font-semibold">-₹{payslipRecord.advanceDeduction?.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-black text-emerald-600 dark:text-emerald-400">
                <span>Total Net Disbursed:</span>
                <span className="font-mono text-lg">₹{payslipRecord.netPay?.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPayslipRecord(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => window.print()}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Payslip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SALARY SETTINGS */}
      {salaryEditStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-base">Configure Salary: {salaryEditStaff.fullName}</h3>
              <button
                type="button"
                onClick={() => setSalaryEditStaff(null)}
                className="rounded-lg p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.target);
                updateStaffSalaryMutation.mutate({
                  staffId: salaryEditStaff.id,
                  salary: form.get("salary"),
                  salaryType: form.get("salaryType"),
                  dept: form.get("dept"),
                });
              }}
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Salary Type
                </label>
                <select
                  name="salaryType"
                  defaultValue={salaryEditStaff.salaryType || "MONTHLY"}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  <option value="MONTHLY">Monthly (Calendar Month Days)</option>
                  <option value="DAILY">Daily Wage</option>
                  <option value="HOURLY">Hourly Wage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Base Salary (₹)
                </label>
                <input
                  type="number"
                  name="salary"
                  defaultValue={Number(salaryEditStaff.salary || 0)}
                  min="0"
                  step="100"
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Department
                </label>
                <input
                  type="text"
                  name="dept"
                  defaultValue={salaryEditStaff.dept || "General"}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setSalaryEditStaff(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  disabled={updateStaffSalaryMutation.isPending}
                >
                  {updateStaffSalaryMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST ADVANCE */}
      {advanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-base">Issue Salary Advance / Loan</h3>
              <button
                type="button"
                onClick={() => setAdvanceModalOpen(false)}
                className="rounded-lg p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.target);
                try {
                  await payrollApi.requestAdvance({
                    staffId: form.get("staffId"),
                    amount: form.get("amount"),
                    emi: form.get("emi"),
                    reason: form.get("reason"),
                  });
                  showSuccess("Advance loan created successfully");
                  setAdvanceModalOpen(false);
                  refetchAdvances();
                } catch (err) {
                  showError(err.response?.data?.message || err.message);
                }
              }}
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Staff Member
                </label>
                <select
                  name="staffId"
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.branch?.name || "Main"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Principal Amount (₹)
                </label>
                <input
                  type="number"
                  name="amount"
                  min="500"
                  step="500"
                  required
                  placeholder="e.g. 10000"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Monthly EMI Installment (₹)
                </label>
                <input
                  type="number"
                  name="emi"
                  min="500"
                  step="500"
                  required
                  placeholder="e.g. 2500"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Reason / Loan Notes
                </label>
                <textarea
                  name="reason"
                  rows={2}
                  placeholder="e.g. Emergency family expenditure"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setAdvanceModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Issue Advance
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG OVERTIME */}
      {otModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-base">Log Overtime Hours</h3>
              <button
                type="button"
                onClick={() => setOtModalOpen(false)}
                className="rounded-lg p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.target);
                try {
                  await payrollApi.requestOvertime({
                    staffId: form.get("staffId"),
                    date: form.get("date"),
                    otHours: form.get("otHours"),
                    reason: form.get("reason"),
                  });
                  showSuccess("Overtime entry recorded");
                  setOtModalOpen(false);
                  refetchOt();
                  refetchPayroll();
                } catch (err) {
                  showError(err.response?.data?.message || err.message);
                }
              }}
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Staff Member
                </label>
                <select
                  name="staffId"
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.branch?.name || "Main"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Overtime Hours
                </label>
                <input
                  type="number"
                  name="otHours"
                  min="0.5"
                  step="0.5"
                  max="16"
                  required
                  placeholder="e.g. 2.5"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Job / Task Reason
                </label>
                <input
                  type="text"
                  name="reason"
                  placeholder="e.g. Completed late motherboard soldering"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOtModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Submit Overtime
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEDUCTIONS HISTORY LOG */}
      {deductionsLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-base">Loan Deduction History: {deductionsLogModal.staff?.fullName}</h3>
              <button
                type="button"
                onClick={() => setDeductionsLogModal(null)}
                className="rounded-lg p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              {!Array.isArray(deductionsLogModal.deductionsLog) || deductionsLogModal.deductionsLog.length === 0 ? (
                <p className="text-sm text-[var(--muted)] text-center py-6">No EMI deductions logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {deductionsLogModal.deductionsLog.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-slate-50 dark:bg-slate-900/50 text-xs"
                    >
                      <div>
                        <span className="font-bold text-[var(--foreground)]">Month {log.month}</span>
                        <p className="text-slate-400 mt-0.5">
                          {log.date ? new Date(log.date).toLocaleDateString("en-IN") : "—"}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        -₹{Number(log.amount)?.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setDeductionsLogModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
