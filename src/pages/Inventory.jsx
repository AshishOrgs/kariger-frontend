import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { inventoryApi } from "@/services/modules";
import { formatCurrency, unwrapArray } from "@/utils/cn";
import { firstObject } from "@/utils/data";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";

export function Inventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["inventory", search],
    queryFn: () => inventoryApi.list({ search: search || undefined, limit: 100 }),
  });
  const items = unwrapArray(data, ["items"]);
  const mutation = useNotifyMutation({ mutationFn: inventoryApi.create, successMessage: "Inventory item created.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }) });

  return (
    <>
      <PageHeader title="Inventory" description="Stock management for available repair parts and current quantity." />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="space-y-3">
            <Input placeholder="Search inventory by name, SKU, category, or barcode" value={search} onChange={(event) => setSearch(event.target.value)} />
            <DataTable
              rows={items}
              searchable={false}
              emptyTitle="No inventory items"
              columns={[
                { key: "partName", header: "Item Name", render: (item) => <Link className="font-semibold text-[var(--primary)]" to={`/inventory/${item.id}`}>{item.partName}</Link> },
                { key: "category", header: "Category", render: (item) => item.category || "Not set" },
                { key: "sku", header: "SKU" },
                { key: "stockQuantity", header: "Current Stock", render: (item) => String(item.stockQuantity) },
                { key: "unitCost", header: "Unit Cost", render: (item) => formatCurrency(item.unitCost) },
                { key: "status", header: "Status", render: (item) => <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} /> },
              ]}
            />
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Add Inventory Item</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutation.mutate({ sku: form.get("sku"), partName: form.get("partName"), category: form.get("category"), stockQuantity: Number(form.get("stockQuantity") || 0), unitCost: Number(form.get("unitCost") || 0) }); }}><Input name="partName" placeholder="Item Name" required /><Input name="category" placeholder="Category" /><Input name="sku" placeholder="SKU" required /><Input name="stockQuantity" type="number" placeholder="Current Stock" /><Input name="unitCost" type="number" placeholder="Unit Cost" /><Button className="w-full" disabled={mutation.isPending}>Add Item</Button></form></CardContent></Card>
      </div>
    </>
  );
}

export function InventoryDetails({ id }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["inventory", id], queryFn: () => inventoryApi.get(id), enabled: Boolean(id) });
  const item = firstObject(data, ["item"]);
  const movements = item.movements || item.stockMovements || item.inventoryMovements || [];
  const update = useNotifyMutation({ mutationFn: (payload) => inventoryApi.update(id, payload), successMessage: "Inventory item updated.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory", id] }) });

  if (!item?.id) return <p className="text-sm text-[var(--muted)]">Loading inventory item...</p>;

  return (
    <>
      <PageHeader title={item.partName} description="Current stock, item quantity adjustment, and stock movement history." />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Part Name</p><p className="mt-2 text-xl font-bold">{item.partName}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Category</p><p className="mt-2 text-xl font-bold">{item.category || "Not set"}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Current Stock</p><p className="mt-2 text-xl font-bold">{String(item.stockQuantity)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Unit Cost</p><p className="mt-2 text-xl font-bold">{formatCurrency(item.unitCost)}</p></CardContent></Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card><CardHeader><CardTitle>Stock Movement History</CardTitle></CardHeader><CardContent className="p-0"><Table><thead><tr><Th>Type</Th><Th>Before</Th><Th>Change</Th><Th>After</Th><Th>Date</Th></tr></thead><tbody>{movements.map((movement, index) => <tr key={movement.id || index}><Td>{movement.type || movement.movementType}</Td><Td>{String(movement.quantityBefore ?? "")}</Td><Td>{String(movement.quantityChanged ?? movement.quantity ?? "")}</Td><Td>{String(movement.quantityAfter ?? "")}</Td><Td>{movement.createdAt}</Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle>Edit Quantity</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); update.mutate({ partName: form.get("partName"), category: form.get("category"), stockQuantity: Number(form.get("stockQuantity") || item.stockQuantity), unitCost: Number(form.get("unitCost") || item.unitCost || 0) }); }}><Input name="partName" defaultValue={item.partName} /><Input name="category" defaultValue={item.category || ""} /><Input name="stockQuantity" type="number" defaultValue={item.stockQuantity} /><Input name="unitCost" type="number" defaultValue={item.unitCost || 0} /><Button className="w-full" disabled={update.isPending}>Save Inventory Item</Button></form></CardContent></Card>
      </div>
    </>
  );
}
