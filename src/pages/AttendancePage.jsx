import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, Td, Th } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QueryState } from "@/components/ui/QueryState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttendanceMarkModal } from "@/components/attendance/AttendanceMarkModal";
import { attendanceApi, staffApi } from "@/services/modules";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/utils/permissions";
import { cn } from "@/utils/cn";

export function AttendancePage() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();

  const isManager = hasPermission(PERMISSIONS.ATTENDANCE_MANAGE, PERMISSIONS.OWNER);
  const canMark = hasPermission(PERMISSIONS.ATTENDANCE_MARK);

  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Fetch Daily Attendance Logs
  const { data: attendanceData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["attendance-daily", targetDate],
    queryFn: () => attendanceApi.dailyLogs({ date: targetDate }),
  });

  // Fetch Staff List for manager manual selection
  const { data: staffData } = useQuery({
    queryKey: ["staff-list"],
    queryFn: () => staffApi.list(),
    enabled: isManager,
  });

  const staffList = staffData?.staff || [];
  const records = attendanceData?.records || [];
  const stats = attendanceData?.stats || {
    totalStaff: 0,
    presentCount: 0,
    checkedInCount: 0,
    checkedOutCount: 0,
    absentCount: 0,
    onTimeRate: 0,
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        r.staffName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.dept?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance-daily"] });
    refetch();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Attendance Tracking"
        description="Biometric-grade daily attendance logs with live WebRTC camera and GPS canvas watermarking"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex items-center">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              title="Refresh logs"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>

            {canMark && (
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
                onClick={() => setModalOpen(true)}
              >
                <Camera className="mr-2 h-4 w-4" />
                Punch Attendance
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Total Staff</p>
              <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{stats.totalStaff}</p>
            </div>
            <Users className="h-8 w-8 text-slate-400 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Checked IN
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.checkedInCount}</p>
            </div>
            <Sparkles className="h-8 w-8 text-emerald-500 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Checked OUT
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.checkedOutCount}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-amber-500 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Absent / Pending
              </p>
              <p className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-300">{stats.absentCount}</p>
            </div>
            <UserX className="h-8 w-8 text-rose-500 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-blue-50/20 dark:bg-blue-950/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Presence Rate
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.onTimeRate}%</p>
            </div>
            <UserCheck className="h-8 w-8 text-blue-500 opacity-60" />
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search by staff name, department, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-4 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs font-medium">
          {["ALL", "IN", "OUT", "ABSENT"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all",
                statusFilter === st
                  ? "bg-emerald-600 text-white font-semibold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              {st === "ALL" ? "All Staff" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Log Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            Daily Attendance Register ({targetDate})
          </CardTitle>
          <span className="text-xs text-[var(--muted)]">Showing {filteredRecords.length} records</span>
        </CardHeader>
        <CardContent className="p-0">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            data={records}
            emptyMessage="No staff members found for the selected branch & date."
          >
            {filteredRecords.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={Calendar}
                  title="No matching records"
                  description="Try adjusting your date or search filters."
                />
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Staff Member</Th>
                    <Th>Branch</Th>
                    <Th>Status</Th>
                    <Th>Check-IN Time</Th>
                    <Th>Check-OUT Time</Th>
                    <Th>GPS Proof</Th>
                    <Th>Photo Watermark</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => {
                    const formatTime = (t) => {
                      if (!t) return "—";
                      return new Date(t).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      });
                    };

                    return (
                      <tr key={r.staffId} className="hover:bg-[var(--muted-surface)]/50 transition-colors">
                        <Td>
                          <div>
                            <p className="font-semibold text-sm text-[var(--foreground)]">{r.staffName}</p>
                            <p className="text-xs text-[var(--muted)]">{r.dept} • {r.role}</p>
                          </div>
                        </Td>
                        <Td>
                          <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[var(--foreground)]">
                            {r.branchName || "Main"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                              r.status === "IN"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : r.status === "OUT"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                r.status === "IN"
                                  ? "bg-emerald-500 animate-pulse"
                                  : r.status === "OUT"
                                  ? "bg-amber-500"
                                  : "bg-slate-400"
                              )}
                            />
                            {r.status === "IN" ? "Checked IN" : r.status === "OUT" ? "Checked OUT" : "Absent"}
                          </span>
                        </Td>
                        <Td>
                          <span className={cn("text-xs font-mono", r.inTime ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
                            {formatTime(r.inTime)}
                          </span>
                        </Td>
                        <Td>
                          <span className={cn("text-xs font-mono", r.outTime ? "font-bold text-amber-600 dark:text-amber-400" : "text-slate-400")}>
                            {formatTime(r.outTime)}
                          </span>
                        </Td>
                        <Td>
                          {r.location ? (
                            <div className="flex items-center gap-1 text-xs text-[var(--foreground)]">
                              <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span className="font-mono text-[11px]">
                                {r.location.lat?.toFixed(4)}, {r.location.lng?.toFixed(4)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </Td>
                        <Td>
                          {r.facePhotoUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPhoto({
                                  url: r.facePhotoUrl,
                                  name: r.staffName,
                                  time: formatTime(r.inTime),
                                  coords: r.location,
                                })
                              }
                              className="group relative h-9 w-14 overflow-hidden rounded-md border border-[var(--border)] bg-black transition-all hover:ring-2 hover:ring-emerald-500"
                            >
                              <img
                                src={r.facePhotoUrl}
                                alt={`Face photo of ${r.staffName}`}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="h-3.5 w-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </QueryState>
        </CardContent>
      </Card>

      {/* Watermarked Snapshot Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-xl w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span className="font-bold text-sm">Watermarked Biometric Capture Proof</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-black aspect-[4/3] flex items-center justify-center">
              <img
                src={selectedPhoto.url}
                alt="Stamped Attendance Snapshot"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
              <div>
                Staff: <span className="font-semibold text-white">{selectedPhoto.name}</span>
              </div>
              <div>
                Check-IN: <span className="font-semibold text-emerald-400">{selectedPhoto.time}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Punch Attendance Modal */}
      <AttendanceMarkModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleRefresh}
        staffList={staffList}
        currentStaff={user}
        isManager={isManager}
      />
    </div>
  );
}
