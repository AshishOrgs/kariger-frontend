import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Crosshair, Loader2, MapPin, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { captureAndWatermarkFrame } from "@/utils/watermark";
import { resolveSmartLocation } from "@/utils/geolocation";
import { attendanceApi } from "@/services/modules";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/utils/cn";

export function AttendanceMarkModal({ isOpen, onClose, onSuccess, staffList = [], currentStaff = null, isManager = false }) {
  const { showSuccess, showError } = useToast();
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [coords, setCoords] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [action, setAction] = useState("IN"); // 'IN' | 'OUT'
  const [selectedStaffId, setSelectedStaffId] = useState(currentStaff?.id || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pick target staff
  const targetStaff = staffList.find((s) => s.id === selectedStaffId) || currentStaff;
  const staffDisplayName = targetStaff?.fullName || targetStaff?.name || "Staff Member";

  const fetchLocation = async () => {
    setGpsLoading(true);
    try {
      const loc = await resolveSmartLocation();
      setLocationData(loc);
      if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
        setCoords({
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
          city: loc.city,
          region: loc.region,
          source: loc.source,
          address: loc.address,
        });
      }
    } catch (err) {
      console.warn("Location resolution error:", err);
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let localStream = null;
    setCameraLoading(true);
    setCameraError(null);

    // 1. Initialize WebRTC Camera
    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      })
      .then((mediaStream) => {
        localStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraLoading(false);
      })
      .catch((err) => {
        console.error("Camera access error:", err);
        setCameraError(err.message || "Failed to access webcam. Please allow camera permissions.");
        setCameraLoading(false);
      });

    // 2. Fetch Geolocation with multi-tier fallback
    fetchLocation();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCaptureAndPunch = async () => {
    if (!videoRef.current && !cameraError) {
      showError("Camera stream not ready");
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl = null;

      // 1. Generate client-side watermarked frame
      if (videoRef.current) {
        const watermarkedBlob = await captureAndWatermarkFrame({
          videoElement: videoRef.current,
          employeeName: staffDisplayName,
          action,
          coords,
        });

        // 2. Upload via backend upload pipeline
        const formData = new FormData();
        formData.append("file", watermarkedBlob, `attendance_${Date.now()}.jpg`);
        formData.append("staffId", targetStaff?.id || "CURRENT");
        formData.append("action", action);

        const uploadRes = await attendanceApi.uploadPhoto(formData);
        photoUrl = uploadRes?.url || null;
      }

      // 3. Punch Attendance (Check-IN or Check-OUT)
      const payload = {
        staffId: targetStaff?.id,
        action,
        photoUrl,
        location: coords ? { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy } : null,
        locationAddress: coords?.address || (coords ? `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}` : null),
        notes: notes.trim() || undefined,
      };

      if (action === "IN") {
        await attendanceApi.checkIn(payload);
        showSuccess(`Check-IN recorded for ${staffDisplayName}`);
      } else {
        await attendanceApi.checkOut(payload);
        showSuccess(`Check-OUT recorded for ${staffDisplayName}`);
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to record attendance";
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-xl text-white", action === "IN" ? "bg-emerald-600" : "bg-amber-600")}>
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Punch Attendance</h2>
              <p className="text-xs text-[var(--muted)]">WebRTC Camera + Geo-Watermarking</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (stream) stream.getTracks().forEach((t) => t.stop());
              onClose();
            }}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted-surface)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Toggle (Check-IN vs Check-OUT) */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setAction("IN")}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all",
              action === "IN"
                ? "bg-emerald-600 text-white shadow"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Check-IN (Arrival)
          </button>
          <button
            type="button"
            onClick={() => setAction("OUT")}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all",
              action === "OUT"
                ? "bg-amber-600 text-white shadow"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            Check-OUT (Departure)
          </button>
        </div>

        {/* Staff Selector (if manager / multi-staff) */}
        {isManager && staffList.length > 1 && (
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
              Select Staff Member
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.fullName} ({staff.role}) {staff.branch?.name ? `— ${staff.branch.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Video / Camera Preview */}
        <div className="mt-4 relative overflow-hidden rounded-xl border border-[var(--border)] bg-black aspect-[4/3] flex items-center justify-center">
          {cameraLoading && (
            <div className="flex flex-col items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <span>Initializing camera stream...</span>
            </div>
          )}

          {cameraError ? (
            <div className="p-4 text-center text-rose-400 text-sm">
              <p className="font-semibold">Camera Access Denied or Unavailable</p>
              <p className="mt-1 text-xs text-slate-400">{cameraError}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: "scaleX(-1)" }}
            />
          )}

          {/* Live Watermark Preview Badge */}
          <div className="absolute bottom-3 left-3 pointer-events-none rounded-lg bg-black/80 px-3 py-2 text-[11px] text-white backdrop-blur-md border-l-4 border-emerald-500 font-mono space-y-0.5 max-w-[85%]">
            <div className="font-bold flex items-center gap-1.5 text-emerald-400">
              <span>STAFF:</span>
              <span className="truncate">{staffDisplayName.toUpperCase()}</span>
              <span>[{action}]</span>
            </div>
            <div className="text-slate-300">
              TIME: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{" "}
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </div>
            <div className="flex items-center gap-1 text-slate-300 text-[10px]">
              <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
              {gpsLoading ? (
                <span>Detecting location...</span>
              ) : coords ? (
                <span>
                  GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  {coords.city ? ` [${coords.city}]` : coords.source === "IP_NETWORK" ? " [Network]" : ""}
                </span>
              ) : (
                <span>GPS: Sensor Unavailable</span>
              )}
            </div>
          </div>
        </div>

        {/* GPS Sensor Badge & Location Controls */}
        <div className="mt-3 flex flex-col gap-2 px-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Crosshair className={cn("h-4 w-4 shrink-0", coords ? "text-emerald-500" : "text-amber-500")} />
              <span className="font-medium text-[var(--foreground)]">
                {gpsLoading
                  ? "Detecting location..."
                  : coords
                  ? coords.source === "GPS"
                    ? `GPS Active (Lat ${coords.lat.toFixed(4)}, Lng ${coords.lng.toFixed(4)})`
                    : coords.source === "WIFI_NETWORK"
                    ? `Wi-Fi Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
                    : `Network Location (${coords.city ? `${coords.city}, ` : ""}${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
                  : "Location sensor not available"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {targetStaff?.branch?.name && (
                <span className="font-medium text-[var(--muted)] text-[11px]">{targetStaff.branch.name}</span>
              )}
              <button
                type="button"
                onClick={fetchLocation}
                disabled={gpsLoading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                title="Retry high-precision GPS detection"
              >
                <RefreshCw className={cn("h-3 w-3", gpsLoading && "animate-spin")} />
                {gpsLoading ? "Detecting..." : "Retry GPS"}
              </button>
            </div>
          </div>

          {locationData?.permissionDenied && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2.5 text-[11px] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="leading-snug">
                <strong>Browser location access is blocked.</strong> Network IP location was used automatically. For high-precision GPS: click the <strong>location icon (📍 or 🔒)</strong> in your Chrome address bar, select <strong>"Always allow"</strong>, then click <strong>"Retry GPS"</strong>.
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={submitting}
            onClick={() => {
              if (stream) stream.getTracks().forEach((t) => t.stop());
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn(
              "flex-1 font-bold text-white shadow-lg",
              action === "IN" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
            )}
            disabled={submitting || cameraLoading}
            onClick={handleCaptureAndPunch}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Stamped Record...
              </>
            ) : (
              `Confirm Check-${action}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
