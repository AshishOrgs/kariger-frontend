// ==============================================================================
// CLIENT-SIDE CANVAS WATERMARKING ENGINE
// Conforms to ATTENDANCE_AND_SALARY_SYSTEM_SPEC.md (Section 3)
// Stamps non-tamperable visual proof onto live webcam frames
// ==============================================================================

/**
 * Captures a raw frame from an active HTML5 <video> stream and stamps
 * an indelible visual proof badge (Employee Name, Action, Timestamp, GPS Coords).
 *
 * @param {Object} payload
 * @param {HTMLVideoElement} payload.videoElement
 * @param {string} payload.employeeName
 * @param {'IN' | 'OUT'} payload.action
 * @param {{ lat: number, lng: number } | null} payload.coords
 * @returns {Promise<Blob>} JPEG Blob of the watermarked frame
 */
export function captureAndWatermarkFrame({
  videoElement,
  employeeName = "Staff",
  action = "IN",
  coords = null,
}) {
  return new Promise((resolve, reject) => {
    try {
      if (!videoElement) {
        throw new Error("Video element is required for frame capture");
      }

      const canvas = document.createElement("canvas");
      const w = videoElement.videoWidth || 640;
      const h = videoElement.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas 2D context unavailable");
      }

      // 1. Draw raw camera frame
      ctx.drawImage(videoElement, 0, 0, w, h);

      // 2. Prepare metadata string
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      const locStr = coords && typeof coords.lat === "number" && typeof coords.lng === "number"
        ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}${coords.city ? ` [${coords.city}]` : coords.source === "IP_NETWORK" ? " [Network]" : ""}`
        : "GPS: Location Unavailable";

      const line1 = `STAFF: ${employeeName.toUpperCase()} [${action}]`;
      const line2 = `TIME: ${dateStr} ${timeStr}`;
      const line3 = locStr;

      // 3. Render watermark badge background (Bottom Left corner)
      const badgeWidth = Math.min(380, w * 0.75);
      const badgeHeight = 72;
      const badgeX = 14;
      const badgeY = h - badgeHeight - 14;

      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.78)"; // High-contrast translucent dark backdrop
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8);
        ctx.fill();
      } else {
        ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
      }

      // Subtle accent indicator bar on the left of badge
      ctx.fillStyle = action === "IN" ? "#10B981" : "#F59E0B"; // Green for IN, Amber for OUT
      ctx.fillRect(badgeX, badgeY, 5, badgeHeight);

      // 4. Burn textual watermark
      ctx.fillStyle = "#FFFFFF";
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(line1, badgeX + 14, badgeY + 22);

      ctx.fillStyle = "#D1D5DB";
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText(line2, badgeX + 14, badgeY + 42);
      ctx.fillText(line3, badgeX + 14, badgeY + 60);
      ctx.restore();

      // 5. Convert to JPEG Blob (quality 0.88)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to generate watermarked blob from canvas"));
        },
        "image/jpeg",
        0.88
      );
    } catch (err) {
      reject(err);
    }
  });
}
