import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/contexts/ToastContext";
import { branchesApi, staffApi } from "@/services/modules";
import { cn } from "@/utils/cn";
import {
  Building2,
  GitBranch,
  Pencil,
  Trash2,
  UserRoundCog,
  X,
} from "lucide-react";

export function BranchManagement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Active modal: null | 'create' | 'edit' | 'assign'
  const [activeModal, setActiveModal] = useState(null);
  const [editBranchId, setEditBranchId] = useState("");
  const [assignStaffId, setAssignStaffId] = useState("");
  const [assignBranchId, setAssignBranchId] = useState("");

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: branchesApi.list,
  });

  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: staffApi.list,
  });

  const branches = useMemo(() => branchesQuery.data?.data?.branches || [], [branchesQuery.data]);
  const staff = useMemo(() => staffQuery.data?.data?.staff || [], [staffQuery.data]);
  // All staff who can be assigned to a branch (ADMIN or TECHNICIAN)
  const assignableStaff = useMemo(
    () => staff.filter((member) => member.role === "ADMIN" || member.role === "BRANCH_ADMIN" || member.role === "TECHNICIAN"),
    [staff],
  );
  const editBranch = branches.find((b) => b.id === editBranchId);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["staff"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => {
      if (toast.showRememberedLimit("branches")) {
        const error = new Error("Subscription limit already reached");
        error.__limitGuard = true;
        return Promise.reject(error);
      }
      return branchesApi.create(payload);
    },
    onSuccess: () => {
      refresh();
      setActiveModal(null);
      toast.success("Branch created.");
    },
    onError: (error) => {
      if (error.__limitGuard) return;
      toast.errorFromApi(error, "Unable to create branch.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => branchesApi.update(id, payload),
    onSuccess: () => {
      refresh();
      setActiveModal(null);
      setEditBranchId("");
      toast.success("Branch updated.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to update branch."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }) => (action === "activate" ? branchesApi.activate(id) : branchesApi.deactivate(id)),
    onSuccess: () => {
      refresh();
      toast.success("Branch status updated.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to update branch status."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => branchesApi.delete(id),
    onSuccess: () => {
      refresh();
      toast.success("Branch deleted successfully.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to delete branch."),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, branchId }) => staffApi.assignBranch(id, { branchId }),
    onSuccess: () => {
      refresh();
      setActiveModal(null);
      setAssignStaffId("");
      setAssignBranchId("");
      toast.success("Staff branch assignment updated.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to assign staff to branch."),
  });

  const buildBranchPayload = (form) => ({
    name: String(form.get("name") || "").trim(),
    code: String(form.get("code") || "").trim().toUpperCase() || undefined,
    phone: String(form.get("phone") || "").trim() || undefined,
    email: String(form.get("email") || "").trim() || undefined,
    address: String(form.get("address") || "").trim() || undefined,
  });

  const openEdit = (branchId) => {
    setEditBranchId(branchId);
    setActiveModal("edit");
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditBranchId("");
    setAssignStaffId("");
    setAssignBranchId("");
  };

  // When a staff member is selected for assignment, auto-set their current branch
  const handleStaffSelect = (staffId) => {
    setAssignStaffId(staffId);
    const member = staff.find((s) => s.id === staffId);
    setAssignBranchId(member?.branchId || "");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Management"
        description="Manage shop branches, assign staff, and control branch-level access. ERP data is scoped by branch."
      />

      {/* TOP HORIZONTAL ACTION BUTTONS */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          size="sm"
          className="h-10 px-4 text-xs font-bold gap-2 bg-[#1769aa] text-white hover:bg-[#125388] shadow-sm"
          onClick={() => setActiveModal("create")}
        >
          <Building2 className="h-4 w-4" />
          Create Branch
        </Button>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-10 px-4 text-xs font-semibold gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={() => {
            setEditBranchId(branches[0]?.id || "");
            setActiveModal("edit");
          }}
          disabled={branches.length === 0}
        >
          <Pencil className="h-4 w-4 text-indigo-600" />
          Edit Branch
        </Button>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-10 px-4 text-xs font-semibold gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={() => setActiveModal("assign")}
          disabled={assignableStaff.length === 0 || branches.length === 0}
        >
          <UserRoundCog className="h-4 w-4 text-teal-600" />
          Assign Staff to Branch
        </Button>
      </div>

      {/* BRANCH LIST CARD */}
      <Card className="border border-slate-200/80 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[#1769aa]" />
            <CardTitle className="text-lg font-bold text-slate-900">Branch Directory</CardTitle>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {branches.length} branch{branches.length === 1 ? "" : "es"} registered
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <QueryState
            isLoading={branchesQuery.isLoading}
            error={branchesQuery.error}
            isEmpty={branches.length === 0}
            emptyTitle="No branches yet"
            emptyDescription="Click 'Create Branch' above to add your first branch."
            onRetry={branchesQuery.refetch}
          >
            <Table>
              <thead>
                <tr>
                  <Th>Branch</Th>
                  <Th>Code</Th>
                  <Th>Contact</Th>
                  <Th>Assigned Staff</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => {
                  const branchStaff = staff.filter((s) => s.branchId === branch.id || s.branch?.id === branch.id);
                  return (
                    <tr key={branch.id} className="hover:bg-slate-50/70 transition-colors">
                      <Td>
                        <div>
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            {branch.name}
                            {branch.isMainBranch && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 tracking-wider">
                                MAIN
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {branch.address || "Address not set"}
                          </p>
                        </div>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {branch.code || "—"}
                        </span>
                      </Td>
                      <Td>
                        <p className="text-slate-700 text-sm">{branch.phone || "Not set"}</p>
                        <p className="text-xs text-slate-500">{branch.email || "Not set"}</p>
                      </Td>
                      <Td>
                        {branchStaff.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {branchStaff.map((s) => (
                              <div key={s.id} className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                                    s.role === "ADMIN" || s.role === "BRANCH_ADMIN"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-teal-100 text-teal-700"
                                  )}
                                >
                                  {s.role === "ADMIN" || s.role === "BRANCH_ADMIN" ? "Admin" : "Tech"}
                                </span>
                                <span className="text-xs font-semibold text-slate-800 truncate max-w-[90px]">
                                  {s.fullName}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No staff assigned</span>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={branch.status} />
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/branches/${branch.id}`}>
                            <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs">
                              View
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 px-2.5 text-xs gap-1"
                            onClick={() => openEdit(branch.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <ConfirmAction
                            title={branch.status === "ACTIVE" ? "Deactivate branch?" : "Activate branch?"}
                            description="Branch status controls whether new staff and operational work can use this branch."
                            confirmLabel={branch.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            variant={branch.status === "ACTIVE" ? "danger" : "primary"}
                            disabled={branch.isMainBranch || statusMutation.isPending}
                            onConfirm={() =>
                              statusMutation.mutate({
                                id: branch.id,
                                action: branch.status === "ACTIVE" ? "deactivate" : "activate",
                              })
                            }
                          >
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 px-2.5 text-xs text-amber-700 hover:bg-amber-50"
                              disabled={branch.isMainBranch || statusMutation.isPending}
                            >
                              {branch.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </Button>
                          </ConfirmAction>
                          <ConfirmAction
                            title="Delete branch?"
                            description="Are you sure you want to delete this branch? This action cannot be undone."
                            confirmLabel="Delete"
                            variant="danger"
                            disabled={branch.isMainBranch || deleteMutation.isPending}
                            onConfirm={() => deleteMutation.mutate(branch.id)}
                          >
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              disabled={branch.isMainBranch || deleteMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </ConfirmAction>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>

      {/* 1. CREATE BRANCH MODAL */}
      {activeModal === "create" && (
        <div className="fixed inset-0 z-[70] bg-slate-950/50 p-4 grid place-items-center overflow-y-auto">
          <Card className="w-full max-w-xl bg-white shadow-2xl rounded-2xl overflow-hidden my-8 border border-white/80">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#1769aa]" />
                  Create New Branch
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">Add a new operational branch to your workspace</p>
              </div>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                onClick={closeModal}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-6">
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const payload = buildBranchPayload(new FormData(event.currentTarget));
                  try {
                    await createMutation.mutateAsync(payload);
                    event.currentTarget.reset();
                  } catch {
                    // Error handled by mutation.
                  }
                }}
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Branch Details</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Branch Name">
                      <Input name="name" placeholder="e.g. Main Branch" required />
                    </Field>
                    <Field label="Branch Code (Optional)">
                      <Input name="code" placeholder="e.g. MBR" />
                    </Field>
                    <Field label="Phone">
                      <Input name="phone" placeholder="Contact number" />
                    </Field>
                    <Field label="Email">
                      <Input name="email" type="email" placeholder="branch@shop.com" />
                    </Field>
                  </div>
                  <Field label="Address">
                    <Textarea name="address" placeholder="Full branch address" />
                  </Field>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Branch"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. EDIT BRANCH MODAL */}
      {activeModal === "edit" && (
        <div className="fixed inset-0 z-[70] bg-slate-950/50 p-4 grid place-items-center overflow-y-auto">
          <Card className="w-full max-w-xl bg-white shadow-2xl rounded-2xl overflow-hidden my-8 border border-white/80">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-indigo-600" />
                  Edit Branch
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">Select a branch and update its details</p>
              </div>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                onClick={closeModal}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Branch Selector */}
              <Field label="Select Branch to Edit">
                <Select
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
                >
                  <option value="">-- Select Branch --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.isMainBranch ? "(Main)" : ""}
                    </option>
                  ))}
                </Select>
              </Field>

              {editBranch && (
                <form
                  key={editBranch.id}
                  className="space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const payload = buildBranchPayload(new FormData(event.currentTarget));
                    try {
                      await updateMutation.mutateAsync({ id: editBranch.id, payload });
                    } catch {
                      // Error handled by mutation.
                    }
                  }}
                >
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Branch Details</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Branch Name">
                        <Input name="name" defaultValue={editBranch.name} required />
                      </Field>
                      <Field label="Branch Code">
                        <Input name="code" defaultValue={editBranch.code || ""} />
                      </Field>
                      <Field label="Phone">
                        <Input name="phone" defaultValue={editBranch.phone || ""} />
                      </Field>
                      <Field label="Email">
                        <Input name="email" type="email" defaultValue={editBranch.email || ""} />
                      </Field>
                    </div>
                    <Field label="Address">
                      <Textarea name="address" defaultValue={editBranch.address || ""} />
                    </Field>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button type="button" variant="secondary" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save Branch"}
                    </Button>
                  </div>
                </form>
              )}

              {!editBranch && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-400">
                  Select a branch above to edit its details.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. ASSIGN STAFF TO BRANCH MODAL */}
      {activeModal === "assign" && (
        <div className="fixed inset-0 z-[70] bg-slate-950/50 p-4 grid place-items-center overflow-y-auto">
          <Card className="w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden my-8 border border-white/80">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <UserRoundCog className="h-5 w-5 text-teal-600" />
                  Assign Staff to Branch
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select a staff member and choose which branch to assign them to
                </p>
              </div>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                onClick={closeModal}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-6">
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  try {
                    await assignMutation.mutateAsync({ id: assignStaffId, branchId: assignBranchId });
                  } catch {
                    // Error handled by mutation.
                  }
                }}
              >
                <Field label="Select Staff Member">
                  <Select
                    required
                    value={assignStaffId}
                    onChange={(e) => handleStaffSelect(e.target.value)}
                  >
                    <option value="">-- Select Staff Member --</option>
                    {assignableStaff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName} · {member.role === "ADMIN" || member.role === "BRANCH_ADMIN" ? "Admin" : "Technician"} {member.branch?.name ? `(${member.branch.name})` : "(No branch)"}
                      </option>
                    ))}
                  </Select>
                </Field>

                {assignStaffId && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                    {(() => {
                      const member = staff.find((s) => s.id === assignStaffId);
                      return member ? (
                        <>
                          <p className="font-bold text-sm text-slate-900">{member.fullName}</p>
                          <p>Email: <span className="font-medium">{member.email}</span></p>
                          <p>Current Branch: <span className="font-medium">{member.branch?.name || "Not assigned"}</span></p>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}

                <Field label="Assign to Branch">
                  <Select
                    required
                    value={assignBranchId}
                    onChange={(e) => setAssignBranchId(e.target.value)}
                  >
                    <option value="">-- Select Branch --</option>
                    {branches
                      .filter((b) => b.status === "ACTIVE")
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.isMainBranch ? "(Main)" : ""}
                        </option>
                      ))}
                  </Select>
                </Field>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="secondary" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button disabled={!assignStaffId || !assignBranchId || assignMutation.isPending}>
                    {assignMutation.isPending ? "Assigning..." : "Assign Staff"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
