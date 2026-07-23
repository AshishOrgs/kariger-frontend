import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, Field } from "@/components/ui/Form";
import { Table, Td, Th } from "@/components/ui/Table";
import { assignmentsApi, repairApi, inventoryApi } from "@/services/modules";
import { cn, formatDate, formatCurrency, unwrapArray } from "@/utils/cn";
import { ticketLabel } from "@/utils/ticketLabel";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import {
  Save,
  Plus,
  X,
  Phone,
  User,
  Mail,
  Trash2,
  Package,
  ShoppingCart,
  ClipboardList,
} from "lucide-react";

function getTicket(assignment) {
  return assignment.ticket || assignment.repairTicket || assignment.repair || assignment;
}

function getLatestEstimate(ticket) {
  return ticket?.latestEstimate || ticket?.estimates?.[0] || null;
}

export function AssignedRepairs() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = ["assigned", "active", "completed"].includes(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "assigned";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedTicketId, setSelectedTicketId] = useState(searchParams.get("ticketId") || null);

  // 1. Fetch technician's assignment queue based on tab
  const queueQuery = useQuery({
    queryKey: ["technician-assigned-repairs", activeTab],
    queryFn: () => assignmentsApi.queue({ statusGroup: activeTab, page: 1, limit: 50, sort: "priority" }),
  });
  const assignments = queueQuery.data?.data?.assignments || [];

  // 2. Fetch selected ticket's complete execution details
  const ticketDetailQuery = useQuery({
    queryKey: ["repair-ticket-detail", selectedTicketId],
    queryFn: () => repairApi.get(selectedTicketId),
    enabled: Boolean(selectedTicketId),
  });
  const ticket = ticketDetailQuery.data?.data?.ticket || ticketDetailQuery.data?.data || null;

  // 3. Fetch selected ticket's consumed inventory history
  const partsUsageQuery = useQuery({
    queryKey: ["repair-ticket-parts-usage", selectedTicketId],
    queryFn: () => repairApi.partsUsage(selectedTicketId),
    enabled: Boolean(selectedTicketId),
  });
  const partsUsages = unwrapArray(partsUsageQuery.data, ["partsUsage", "usages", "usage"]);

  // Form states for execution details
  const [formState, setFormState] = useState({
    diagnosis: "",
    extraCost: "",
    extraCostReason: "",
    estimatedCompletionTime: "",
  });

  // Automatically update form fields when selected ticket details load
  useEffect(() => {
    if (ticket) {
      setFormState({
        diagnosis: ticket.diagnosis || ticket.workPerformed || ticket.repairNotes || "",
        extraCost: ticket.extraCost ? String(ticket.extraCost) : "",
        extraCostReason: ticket.extraCostReason || "",
        estimatedCompletionTime: ticket.estimatedCompletionTime
          ? new Date(ticket.estimatedCompletionTime).toISOString().slice(0, 16)
          : "",
      });
    }
  }, [ticket]);

  // Mutation: Save technician report and send it to Admin review.
  const submitReportMutation = useNotifyMutation({
    mutationFn: async (payload) => {
      await repairApi.updateExecution(selectedTicketId, payload);

      if (["READY_FOR_REVIEW", "READY_FOR_DELIVERY"].includes(ticket?.status)) {
        return null;
      }

      if (["DIAGNOSING", "APPROVED", "WAITING_PARTS"].includes(ticket?.status)) {
        await repairApi.updateStatus(selectedTicketId, {
          status: "IN_REPAIR",
          reason: "Technician submitted final repair report.",
        });
      }

      if (["DIAGNOSING", "APPROVED", "WAITING_PARTS", "IN_REPAIR", "SENT_TO_VENDOR"].includes(ticket?.status)) {
        await repairApi.updateStatus(selectedTicketId, {
          status: "READY_FOR_REVIEW",
          reason: "Technician submitted final repair report for admin review.",
        });
      }

      return null;
    },
    successMessage: "Technician report submitted for admin review.",
    onSuccess: () => {
      setActiveTab("completed");
      queryClient.invalidateQueries({ queryKey: ["repair-ticket-detail", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["repair-ticket-parts-usage", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["technician-assigned-repairs"] });
      navigate(`/repair?ticketId=${selectedTicketId}`);
    },
  });

  const handleSubmitReport = (e) => {
    e.preventDefault();
    submitReportMutation.mutate({
      diagnosis: formState.diagnosis || null,
      extraCost: formState.extraCost === "" ? 0 : Number(formState.extraCost),
      extraCostReason: formState.extraCostReason || null,
      estimatedCompletionTime: formState.estimatedCompletionTime
        ? new Date(formState.estimatedCompletionTime).toISOString()
        : null,
    });
  };

  const tabs = [
    { id: "assigned", name: "Assigned" },
    { id: "active", name: "Active" },
    { id: "completed", name: "Completed" },
  ];

  return (
    <div>
      <PageHeader
        title="Technician Workspace"
        description="Manage assigned repairs, log diagnostics, consume parts, and submit the final repair report."
      />

      {/* Tab Header Navigation */}
      <div className="flex border-b border-[var(--border)] mb-6 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedTicketId(null);
            }}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors",
              activeTab === tab.id
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className={selectedTicketId ? "grid grid-cols-1 lg:grid-cols-12 gap-6" : "space-y-6"}>
        {/* Left Side: DataTable List of Assignments */}
        <div className={selectedTicketId ? "lg:col-span-6" : "w-full"}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Repairs Queue ({tabs.find((t) => t.id === activeTab)?.name})</CardTitle>
            </CardHeader>
            <DataTable
              rows={assignments}
              isLoading={queueQuery.isLoading}
              error={queueQuery.error}
              onRetry={queueQuery.refetch}
              searchable
              emptyTitle="No repairs found"
              emptyDescription={`There are currently no tickets matching "${tabs.find((t) => t.id === activeTab)?.name}" queue status.`}
              columns={[
                {
                  key: "repair",
                  header: "Repair",
                  render: (assignment) => {
                    const ticket = getTicket(assignment);
                    return (
                      <div>
                        <p className="font-semibold">{ticketLabel(ticket)}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{ticket.title}</p>
                      </div>
                    );
                  },
                },
                {
                  key: "status",
                  header: "Status",
                  render: (assignment) => <StatusBadge status={getTicket(assignment).status} />,
                },
                {
                  key: "priority",
                  header: "Priority",
                  render: (assignment) => {
                    const priority = getTicket(assignment).priority || "NORMAL";
                    return (
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                          priority === "URGENT" && "bg-red-100 text-red-800",
                          priority === "HIGH" && "bg-amber-100 text-amber-800",
                          priority === "NORMAL" && "bg-slate-100 text-slate-800",
                          priority === "LOW" && "bg-green-100 text-green-800"
                        )}
                      >
                        {priority}
                      </span>
                    );
                  },
                },
                {
                  key: "assignedAt",
                  header: "Assigned",
                  render: (assignment) => formatDate(assignment.assignedAt || assignment.createdAt),
                },
                {
                  key: "actions",
                  header: "Action",
                  render: (assignment) => {
                    const ticket = getTicket(assignment);
                    const isCurrent = selectedTicketId === ticket.id;
                    return (
                      <Button
                        size="sm"
                        variant={isCurrent ? "secondary" : "primary"}
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        {isCurrent ? "Active" : "Ticket"}
                      </Button>
                    );
                  },
                },
              ]}
            />
          </Card>
        </div>

        {/* Right Side: Execution Detail Workspace Panel */}
        {selectedTicketId && (
          <div className="lg:col-span-6 space-y-6">
            {ticketDetailQuery.isLoading ? (
              <Card>
                <CardContent className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
                  <p className="text-sm text-slate-500">Loading execution panel...</p>
                </CardContent>
              </Card>
            ) : !ticket ? (
              <Card>
                <CardContent className="py-6 text-center text-slate-500">
                  Failed to fetch ticket detail. Select another ticket.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6 border border-[var(--border)] rounded-xl bg-white p-6 shadow-sm max-h-[85vh] overflow-y-auto sticky top-6">
                {/* Header Section */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900">{ticketLabel(ticket)}</h2>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{ticket.title}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTicketId(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Device and Customer Context Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Customer Context</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        <span>{ticket.customer?.fullName}</span>
                      </div>
                      {ticket.customer?.phone && (
                        <div className="flex items-center gap-1.5 text-slate-600 hover:text-[var(--primary)]">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          <a href={`tel:${ticket.customer.phone}`}>{ticket.customer.phone}</a>
                        </div>
                      )}
                      {ticket.customer?.email && (
                        <div className="flex items-center gap-1.5 text-slate-600 hover:text-[var(--primary)]">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                          <a href={`mailto:${ticket.customer.email}`}>{ticket.customer.email}</a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Device Details</p>
                    <div className="space-y-1">
                      {ticket.items && ticket.items[0] ? (
                        <>
                          <p className="font-semibold text-slate-800">
                            {ticket.items[0].brand} {ticket.items[0].model} ({ticket.items[0].itemType})
                          </p>
                          {(ticket.items[0].serialNumber || ticket.items[0].imei) && (
                            <p className="text-xs text-slate-500">
                              SN/IMEI: {ticket.items[0].serialNumber || ticket.items[0].imei}
                            </p>
                          )}
                          {ticket.items[0].condition && (
                            <p className="text-xs text-slate-500">Condition: {ticket.items[0].condition}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-500 italic">No device item set</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Summary Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-100 p-4 rounded-lg">
                  <div className="bg-slate-50 p-2.5 rounded text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Estimated Labor Cost</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{formatCurrency(getLatestEstimate(ticket)?.laborAmount)}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Estimated Parts Cost</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{formatCurrency(getLatestEstimate(ticket)?.partsAmount)}</p>
                  </div>
                  <div className="bg-indigo-50 p-2.5 rounded text-center">
                    <p className="text-[10px] uppercase font-bold text-indigo-500">Estimate Total</p>
                    <p className="text-sm font-bold text-indigo-700 mt-1">{formatCurrency(getLatestEstimate(ticket)?.totalAmount)}</p>
                  </div>
                </div>

                <ConsumedInventorySummary
                  ticket={ticket}
                  partsUsages={partsUsages}
                />

                {/* Execution Details Form */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-700">
                      <Save className="h-4 w-4" />
                      Technician Repair Form
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitReport} className="space-y-4">
                      <Field label="Diagnosis & Issue Findings">
                        <Textarea
                          placeholder="Write diagnosis, repair work, observations, and completion remarks..."
                          value={formState.diagnosis}
                          onChange={(e) => setFormState({ ...formState, diagnosis: e.target.value })}
                        />
                      </Field>

                      <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                        <Field label="Extra Cost">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={formState.extraCost}
                            onChange={(e) => setFormState({ ...formState, extraCost: e.target.value })}
                          />
                        </Field>
                        <Field label="Why Extra Cost?">
                          <Input
                            placeholder="Example: Extra display fitting work, connector repair, urgent service..."
                            value={formState.extraCostReason}
                            onChange={(e) => setFormState({ ...formState, extraCostReason: e.target.value })}
                          />
                        </Field>
                      </div>

                      <ClearDateTimePicker
                        value={formState.estimatedCompletionTime}
                        onChange={(value) => setFormState({ ...formState, estimatedCompletionTime: value })}
                      />

                      <Button
                        type="submit"
                        disabled={submitReportMutation.isPending}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        {submitReportMutation.isPending ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Submit Final Repair Report
                          </>
                        )}
                      </Button>
                      {partsUsages.length === 0 ? (
                        <p className="text-center text-xs text-slate-500">
                          No item parts used for this repair. You can still submit the technician report.
                        </p>
                      ) : null}
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TechnicianInventory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ticketIdFromUrl = searchParams.get("ticketId") || "";
  const isRepairUsageMode = Boolean(ticketIdFromUrl);
  const [selectedTicketId, setSelectedTicketId] = useState(ticketIdFromUrl);
  const [partInput, setPartInput] = useState({
    inventoryItemId: "",
    quantity: 1,
    notes: "",
  });
  const [selectedParts, setSelectedParts] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const queueQueries = useQueries({
    queries: ["assigned", "active"].map((statusGroup) => ({
      queryKey: ["technician-assigned-repairs", statusGroup],
      queryFn: () => assignmentsApi.queue({ statusGroup, page: 1, limit: 50, sort: "priority" }),
    })),
  });
  const tickets = uniqueTickets(
    queueQueries.flatMap((query) => query.data?.data?.assignments || []).map(getTicket)
  );
  const activeTicketId = selectedTicketId || "";
  const ticketDetailQuery = useQuery({
    queryKey: ["repair-ticket-detail", activeTicketId],
    queryFn: () => repairApi.get(activeTicketId),
    enabled: Boolean(activeTicketId),
  });
  const ticket = ticketDetailQuery.data?.data?.ticket || ticketDetailQuery.data?.data || tickets.find((item) => item.id === activeTicketId) || null;
  const itemsQuery = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryApi.list(),
  });
  const items = unwrapArray(itemsQuery.data, ["items"]);
  const visibleItems = items.filter((item) => {
    const value = inventorySearch.trim().toLowerCase();
    if (!value) return true;
    return [item.partName, item.sku, item.category, item.barcode]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(value));
  });
  const partsUsageQuery = useQuery({
    queryKey: ["repair-ticket-parts-usage", activeTicketId],
    queryFn: () => repairApi.partsUsage(activeTicketId),
    enabled: Boolean(activeTicketId),
  });
  const partsUsages = unwrapArray(partsUsageQuery.data, ["partsUsage", "usages", "usage"]);

  useEffect(() => {
    if (items.length > 0 && !partInput.inventoryItemId) {
      setPartInput((prev) => ({ ...prev, inventoryItemId: items[0].id }));
    }
  }, [items, partInput.inventoryItemId]);

  const consumePartsMutation = useNotifyMutation({
    mutationFn: (payload) => repairApi.consumeParts(activeTicketId, payload),
    successMessage: "Inventory parts used successfully.",
    onSuccess: () => {
      setPartInput((prev) => ({ ...prev, quantity: 1, notes: "" }));
      setSelectedParts([]);
      queryClient.invalidateQueries({ queryKey: ["repair-ticket-parts-usage", activeTicketId] });
      queryClient.invalidateQueries({ queryKey: ["repair-ticket-detail", activeTicketId] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["technician-assigned-repairs"] });
      navigate(`/technician/repairs?tab=active&ticketId=${activeTicketId}`);
    },
  });

  const handleAddPart = (event) => {
    event.preventDefault();
    if (!partInput.inventoryItemId) return;
    const item = items.find((entry) => entry.id === partInput.inventoryItemId);
    if (!item) return;
    const quantity = Number(partInput.quantity || 0);
    if (quantity <= 0) return;
    setSelectedParts((current) => [
      ...current,
      {
        key: `${item.id}-${Date.now()}-${current.length}`,
        inventoryItemId: item.id,
        partName: item.partName,
        sku: item.sku,
        stockQuantity: item.stockQuantity,
        unitCost: item.unitCost,
        quantity,
        notes: partInput.notes,
      },
    ]);
    setPartInput({ inventoryItemId: item.id, quantity: 1, notes: "" });
  };

  const handleRemovePart = (key) => {
    setSelectedParts((current) => current.filter((part) => part.key !== key));
  };

  const handleUseSelectedParts = () => {
    if (!activeTicketId || selectedParts.length === 0) return;
    consumePartsMutation.mutate({
      parts: selectedParts.map((part) => ({
        inventoryItemId: part.inventoryItemId,
        quantity: Number(part.quantity),
        notes: part.notes || undefined,
      })),
    });
  };

  return (
    <div className="space-y-5">
      {isRepairUsageMode ? (
        <>
          <PageHeader
            title="Use Item Parts"
            description="Select parts from inventory and attach them to the selected repair ticket."
          />
          <Card className="border-l-4 border-l-[var(--primary)]">
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">Repair Ticket</p>
                  <h2 className="text-lg font-bold text-slate-950">Parts Used For This Repair</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Every item used here will be saved against this ticket and shown in the technician report.
                  </p>
                </div>
                {ticket ? (
                  <div className="rounded-lg bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase text-slate-500">Selected Repair</p>
                    <p className="text-sm font-bold text-slate-900">{ticketLabel(ticket)}</p>
                    <p className="text-xs text-slate-500">{ticket.customer?.fullName || ticket.title || "Customer not set"}</p>
                  </div>
                ) : null}
              </div>
              <Field label="Repair Ticket">
                <Select value={activeTicketId} onChange={(event) => setSelectedTicketId(event.target.value)} disabled={!tickets.length}>
                  <option value="" disabled>-- Select Repair Ticket --</option>
                  {tickets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {ticketLabel(item)}
                    </option>
                  ))}
                </Select>
              </Field>
              {!tickets.length ? (
                <p className="text-sm text-[var(--muted)]">No assigned repair is ready for parts usage.</p>
              ) : null}
            </CardContent>
          </Card>
          <TechnicianInventoryUsePanel
            ticket={ticket}
            items={visibleItems}
            inventorySearch={inventorySearch}
            setInventorySearch={setInventorySearch}
            partsUsages={partsUsages}
            partInput={partInput}
            setPartInput={setPartInput}
            selectedParts={selectedParts}
            onAddPart={handleAddPart}
            onRemovePart={handleRemovePart}
            onUseSelectedParts={handleUseSelectedParts}
            isConsuming={consumePartsMutation.isPending}
          />
        </>
      ) : (
        <TechnicianInventoryCatalog
          items={visibleItems}
          inventorySearch={inventorySearch}
          setInventorySearch={setInventorySearch}
        />
      )}
    </div>
  );
}

function TechnicianInventoryCatalog({ items, inventorySearch, setInventorySearch }) {
  return (
    <>
      <PageHeader
        title="Inventory"
        description="View available branch inventory. To use parts for a repair, open the repair from My Repairs."
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-[var(--primary)]" />
            Available Inventory
          </CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            This page is read-only for technicians. It is only for checking stock availability.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Search Inventory">
            <Input
              placeholder="Search by item name, SKU, category, or barcode"
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
            />
          </Field>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table>
              <thead>
                <tr className="bg-slate-50">
                  <Th>Item</Th>
                  <Th>SKU</Th>
                  <Th>Category</Th>
                  <Th>Available Stock</Th>
                  <Th>Unit Cost</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <Td>
                      <div className="font-semibold text-slate-900">{item.partName}</div>
                      {item.barcode ? <div className="text-xs text-slate-500">Barcode: {item.barcode}</div> : null}
                    </Td>
                    <Td>{item.sku || "Not set"}</Td>
                    <Td>{item.category || "General"}</Td>
                    <Td>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                        {String(item.stockQuantity)}
                      </span>
                    </Td>
                    <Td>{formatCurrency(item.unitCost)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!items.length ? (
              <div className="p-8 text-center">
                <Package className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No inventory found.</p>
                <p className="mt-1 text-xs text-slate-500">Try another search or contact Admin.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ConsumedInventorySummary({ ticket, partsUsages }) {
  const partsTotal = partsUsages.reduce((sum, usage) => sum + Number(usage.totalCost || Number(usage.quantity || 0) * Number(usage.unitCost || 0)), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-700">
          <Plus className="h-4 w-4 text-[var(--primary)]" />
          Consumed Inventory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Need inventory parts for this repair?</p>
          <p className="mt-1 text-xs text-slate-500">
            Open Inventory to select available stock. The repair will store consumed parts and inventory stock will update automatically.
          </p>
          <Link to={`/technician/inventory?ticketId=${ticket?.id || ""}`}>
            <Button type="button" className="mt-3 w-full" disabled={!ticket?.id}>
              Use Item Parts
            </Button>
          </Link>
        </div>
        <ConsumedPartsTable partsUsages={partsUsages} total={partsTotal} emptyText="No inventory parts have been consumed for this repair yet." />
      </CardContent>
    </Card>
  );
}

function TechnicianInventoryUsePanel({
  ticket,
  items,
  inventorySearch,
  setInventorySearch,
  partsUsages,
  partInput,
  setPartInput,
  selectedParts,
  onAddPart,
  onRemovePart,
  onUseSelectedParts,
  isConsuming,
}) {
  const selectedTotal = selectedParts.reduce((sum, part) => sum + Number(part.quantity || 0) * Number(part.unitCost || 0), 0);
  const partsTotal = partsUsages.reduce((sum, usage) => sum + Number(usage.totalCost || Number(usage.quantity || 0) * Number(usage.unitCost || 0)), 0);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-[var(--primary)]" />
            Select Used Item Parts
          </CardTitle>
          <p className="mt-1 text-sm text-slate-500">Search stock and choose parts used for this repair ticket.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Search Available Parts">
            <Input
              placeholder="Search by item name, SKU, category, or barcode"
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
            />
          </Field>

          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
            <Table>
              <thead>
                <tr className="bg-slate-50">
                  <Th>Available Part</Th>
                  <Th>Stock</Th>
                  <Th>Unit Cost</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={partInput.inventoryItemId === item.id ? "bg-blue-50/70" : ""}>
                    <Td>
                      <div className="font-semibold text-slate-900">{item.partName}</div>
                      <div className="text-xs text-slate-500">{item.sku || "No SKU"}{item.category ? ` · ${item.category}` : ""}</div>
                    </Td>
                    <Td>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                        {String(item.stockQuantity)}
                      </span>
                    </Td>
                    <Td>{formatCurrency(item.unitCost)}</Td>
                    <Td>
                      <Button
                        type="button"
                        size="sm"
                        variant={partInput.inventoryItemId === item.id ? "primary" : "secondary"}
                        disabled={!ticket?.id}
                        onClick={() => setPartInput({ ...partInput, inventoryItemId: item.id })}
                      >
                        {partInput.inventoryItemId === item.id ? "Selected" : "Select"}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!items.length ? <p className="p-4 text-sm text-slate-500">No available inventory parts found.</p> : null}
          </div>

          <form onSubmit={onAddPart} className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-[var(--primary)]" />
              <p className="text-sm font-bold text-slate-900">Add Selected Part To Cart</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <Field label="Selected Inventory Part">
                  <Select
                    value={partInput.inventoryItemId}
                    onChange={(event) => setPartInput({ ...partInput, inventoryItemId: event.target.value })}
                    disabled={!ticket?.id || !items.length}
                  >
                    <option value="" disabled>-- Select Part --</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} · {item.partName} ({item.stockQuantity} available)
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="sm:col-span-5">
                <Field label="Quantity Used">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={partInput.quantity}
                    disabled={!ticket?.id}
                    onChange={(event) => setPartInput({ ...partInput, quantity: event.target.value })}
                  />
                </Field>
              </div>

              <div className="sm:col-span-12">
                <Field label="Usage Note (Optional)">
                  <Input
                    placeholder="Example: Replaced damaged display connector"
                    value={partInput.notes}
                    disabled={!ticket?.id}
                    onChange={(event) => setPartInput({ ...partInput, notes: event.target.value })}
                  />
                </Field>
              </div>

              <div className="sm:col-span-12">
                <Button
                  type="submit"
                  disabled={!partInput.inventoryItemId || !ticket?.id}
                  className="w-full"
                >
                  <Plus className="h-4 w-4" />
                  Add To Cart
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="sticky top-5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-5 w-5 text-[var(--primary)]" />
              Review Parts For This Ticket
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              These parts will be consumed against {ticket ? ticketLabel(ticket) : "the selected repair"}.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">Cart Items</p>
                  <p className="text-xs text-slate-500">Remove wrong items before confirming.</p>
                </div>
                <p className="text-sm font-black text-slate-950">{formatCurrency(selectedTotal)}</p>
              </div>
              {selectedParts.length ? (
                <div className="divide-y divide-slate-100">
                  {selectedParts.map((part) => (
                    <div key={part.key} className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{part.partName}</p>
                        <p className="text-xs text-slate-500">{part.sku} · Qty {part.quantity} · {formatCurrency(Number(part.quantity || 0) * Number(part.unitCost || 0))}</p>
                        {part.notes ? <p className="mt-1 text-xs italic text-slate-500">Note: {part.notes}</p> : null}
                      </div>
                      <Button type="button" size="sm" variant="secondary" onClick={() => onRemovePart(part.key)}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center">
                  <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">No parts in cart yet.</p>
                  <p className="mt-1 text-xs text-slate-500">Select a part from the left and add it here.</p>
                </div>
              )}
              <div className="border-t border-slate-200 p-3">
                <Button
                  type="button"
                  disabled={isConsuming || !ticket?.id || selectedParts.length === 0}
                  className="w-full"
                  onClick={onUseSelectedParts}
                >
                  {isConsuming ? "Saving Used Parts..." : "Save Used Parts To Ticket"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5 text-slate-500" />
              Repair Consumption History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConsumedPartsTable partsUsages={partsUsages} total={partsTotal || ticket?.partsCost} emptyText="No inventory consumption recorded yet." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConsumedPartsTable({ partsUsages, total, emptyText }) {
  if (partsUsages.length === 0) {
    return (
      <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded text-center">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="border border-slate-100 rounded-md overflow-hidden">
      <Table>
        <thead>
          <tr className="bg-slate-50">
            <Th className="py-2 text-[11px]">Inventory Item</Th>
            <Th className="py-2 text-[11px] text-right">Qty</Th>
            <Th className="py-2 text-[11px] text-right">Unit Cost</Th>
            <Th className="py-2 text-[11px] text-right">Total</Th>
          </tr>
        </thead>
        <tbody>
          {partsUsages.map((usage, index) => (
            <tr key={usage.id || index} className="border-t border-slate-100">
              <Td className="py-2 text-xs font-medium">
                <div>
                  {usage.inventoryItem?.partName || usage.partName}
                  {usage.notes ? (
                    <span className="block text-[10px] text-slate-500 font-normal italic">
                      Note: {usage.notes}
                    </span>
                  ) : null}
                </div>
              </Td>
              <Td className="py-2 text-xs text-right text-slate-600">
                {String(usage.quantity)}
              </Td>
              <Td className="py-2 text-xs text-right text-slate-600 font-mono">
                {formatCurrency(usage.unitCost)}
              </Td>
              <Td className="py-2 text-xs text-right font-bold font-mono">
                {formatCurrency(usage.totalCost || Number(usage.quantity) * Number(usage.unitCost))}
              </Td>
            </tr>
          ))}
          <tr className="bg-slate-50/50 border-t border-slate-200">
            <td colSpan={3} className="py-2 px-3 text-xs font-bold text-right text-slate-700">
              Total Parts Cost:
            </td>
            <td className="py-2 px-3 text-xs font-extrabold text-right font-mono text-indigo-700">
              {formatCurrency(total)}
            </td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
}

function ClearDateTimePicker({ value, onChange }) {
  const date = value?.slice(0, 10) || "";
  const hour24 = value ? Number(value.slice(11, 13)) : 12;
  const minute = value?.slice(14, 16) || "00";
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = String(hour24 % 12 || 12).padStart(2, "0");
  const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

  const updateValue = ({ nextDate = date, nextHour = hour12, nextMinute = minute, nextPeriod = period }) => {
    if (!nextDate) {
      onChange("");
      return;
    }
    let nextHour24 = Number(nextHour) % 12;
    if (nextPeriod === "PM") nextHour24 += 12;
    onChange(`${nextDate}T${String(nextHour24).padStart(2, "0")}:${nextMinute}`);
  };

  return (
    <Field label="Estimated Completion Time">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_90px_90px_90px]">
        <Input type="date" value={date} onChange={(event) => updateValue({ nextDate: event.target.value })} />
        <Select value={hour12} onChange={(event) => updateValue({ nextHour: event.target.value })}>
          {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((hour) => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </Select>
        <Select value={minute} onChange={(event) => updateValue({ nextMinute: event.target.value })}>
          {minutes.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </Select>
        <Select value={period} onChange={(event) => updateValue({ nextPeriod: event.target.value })}>
          <option>AM</option>
          <option>PM</option>
        </Select>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">Date · Hour · Minute · AM/PM</p>
    </Field>
  );
}

function uniqueTickets(tickets) {
  const map = new Map();
  for (const ticket of tickets) {
    if (ticket?.id) map.set(ticket.id, ticket);
  }
  return [...map.values()];
}
