import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field, Input } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { inventoryApi } from "@/services/modules";
import { formatCurrency, unwrapArray } from "@/utils/cn";
import { firstObject } from "@/utils/data";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { useToast } from "@/contexts/ToastContext";
import { Boxes, PackagePlus, Plus, Sparkles, X } from "lucide-react";

export function Inventory() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [comingSoonModalOpen, setComingSoonModalOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["inventory", search],
    queryFn: () => inventoryApi.list({ search: search || undefined, limit: 100 }),
  });
  const items = unwrapArray(data, ["items"]);

  const createMutation = useNotifyMutation({
    mutationFn: inventoryApi.create,
    successMessage: "Inventory item created successfully.",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setAddModalOpen(false);
    },
  });

  const handleBulkClick = () => {
    toast.info("Bulk Add Inventory (Category-wise format) — Feature coming soon!");
    setComingSoonModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock management for available repair parts and current quantity."
      />

      {/* TOP HORIZONTAL ACTION BUTTONS */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          size="sm"
          className="h-10 px-4 text-xs font-bold gap-2 bg-[#1769aa] text-white hover:bg-[#125388] shadow-sm"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Inventory Item
        </Button>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-10 px-4 text-xs font-semibold gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={handleBulkClick}
        >
          <PackagePlus className="h-4 w-4 text-emerald-600" />
          Bulk Add Inventory
        </Button>
      </div>

      {/* INVENTORY HISTORY / DIRECTORY TABLE BELOW */}
      <Card className="border border-slate-200/80 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-[#1769aa]" />
            <CardTitle className="text-lg font-bold text-slate-900">Inventory Directory</CardTitle>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {items.length} item{items.length === 1 ? "" : "s"} in stock
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Input
            placeholder="Search inventory by name, SKU, category, or barcode..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-md bg-slate-50"
          />
          <DataTable
            rows={items}
            searchable={false}
            emptyTitle="No inventory items found"
            columns={[
              {
                key: "partName",
                header: "Item Name",
                render: (item) => (
                  <Link className="font-bold text-[#1769aa] hover:underline" to={`/inventory/${item.id}`}>
                    {item.partName}
                  </Link>
                ),
              },
              { key: "category", header: "Category", render: (item) => item.category || "Not set" },
              { key: "sku", header: "SKU" },
              { key: "stockQuantity", header: "Current Stock", render: (item) => String(item.stockQuantity) },
              { key: "unitCost", header: "Unit Cost", render: (item) => formatCurrency(item.unitCost) },
              {
                key: "status",
                header: "Status",
                render: (item) => <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />,
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* ADD SINGLE INVENTORY ITEM MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/50 p-4 grid place-items-center overflow-y-auto">
          <Card className="w-full max-w-lg bg-white shadow-2xl rounded-2xl overflow-hidden my-8 border border-white/80">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-[#1769aa]" />
                  Add Inventory Item
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">Register a new repair part or stock item</p>
              </div>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                onClick={() => setAddModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-6">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  createMutation.mutate({
                    sku: form.get("sku"),
                    partName: form.get("partName"),
                    category: form.get("category"),
                    stockQuantity: Number(form.get("stockQuantity") || 0),
                    unitCost: Number(form.get("unitCost") || 0),
                  });
                }}
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Item Information</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Item Name">
                      <Input name="partName" placeholder="e.g. iPhone 13 Screen" required />
                    </Field>
                    <Field label="Category">
                      <Input name="category" placeholder="e.g. Display" />
                    </Field>
                    <Field label="SKU">
                      <Input name="sku" placeholder="e.g. DISP-IP13" required />
                    </Field>
                    <Field label="Current Stock">
                      <Input name="stockQuantity" type="number" defaultValue="0" min="0" required />
                    </Field>
                  </div>
                  <Field label="Unit Cost (₹)">
                    <Input name="unitCost" type="number" defaultValue="0" min="0" required />
                  </Field>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="secondary" onClick={() => setAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adding..." : "Add Item"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FEATURE COMING SOON MODAL FOR BULK ADD */}
      {comingSoonModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/50 p-4 grid place-items-center overflow-y-auto">
          <Card className="w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden my-8 border border-white/80">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Feature Available Soon
                </CardTitle>
              </div>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                onClick={() => setComingSoonModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 text-amber-600 grid place-items-center">
                <PackagePlus className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-base">Bulk Add Inventory</h4>
                <p className="text-xs text-slate-500">
                  Category-wise bulk upload & CSV format import option will be available in the upcoming update.
                </p>
              </div>
              <div className="pt-2">
                <Button type="button" className="w-full" onClick={() => setComingSoonModalOpen(false)}>
                  Got it
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export function InventoryDetails({ id }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["inventory", id], queryFn: () => inventoryApi.get(id), enabled: Boolean(id) });
  const item = firstObject(data, ["item"]);
  const movements = item?.movements || item?.stockMovements || item?.inventoryMovements || [];
  const update = useNotifyMutation({
    mutationFn: (payload) => inventoryApi.update(id, payload),
    successMessage: "Inventory item updated.",
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory", id] }),
  });

  if (!item?.id) return <p className="text-sm text-[var(--muted)]">Loading inventory item...</p>;

  return (
    <div className="space-y-6">
      <PageHeader title={item.partName} description="Current stock, item quantity adjustment, and stock movement history." />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Part Name</p><p className="mt-2 text-xl font-bold">{item.partName}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Category</p><p className="mt-2 text-xl font-bold">{item.category || "Not set"}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Current Stock</p><p className="mt-2 text-xl font-bold">{String(item.stockQuantity)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Unit Cost</p><p className="mt-2 text-xl font-bold">{formatCurrency(item.unitCost)}</p></CardContent></Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card><CardHeader><CardTitle>Stock Movement History</CardTitle></CardHeader><CardContent className="p-0"><Table><thead><tr><Th>Type</Th><Th>Before</Th><Th>Change</Th><Th>After</Th><Th>Date</Th></tr></thead><tbody>{movements.map((movement, index) => <tr key={movement.id || index}><Td>{movement.type || movement.movementType}</Td><Td>{String(movement.quantityBefore ?? "")}</Td><Td>{String(movement.quantityChanged ?? movement.quantity ?? "")}</Td><Td>{String(movement.quantityAfter ?? "")}</Td><Td>{movement.createdAt}</Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle>Edit Quantity</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); update.mutate({ partName: form.get("partName"), category: form.get("category"), stockQuantity: Number(form.get("stockQuantity") || item.stockQuantity), unitCost: Number(form.get("unitCost") || item.unitCost || 0) }); }}><Input name="partName" defaultValue={item.partName} /><Input name="category" defaultValue={item.category || ""} /><Input name="stockQuantity" type="number" defaultValue={item.stockQuantity} /><Input name="unitCost" type="number" defaultValue={item.unitCost || 0} /><Button className="w-full" disabled={update.isPending}>Save Inventory Item</Button></form></CardContent></Card>
      </div>
    </div>
  );
}
