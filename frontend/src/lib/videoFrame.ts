// Toma un fotograma de un video local (en el navegador) y lo regresa como JPEG.
// Sirve de portada para los contadores con video: la imagen de historia y la vista
// previa al compartir (Open Graph) no pueden usar el video directamente.
// Si el navegador no puede decodificar el video (ej. HEVC en Chrome), regresa null.

const MAX_SIDE = 1920;
const TIMEOUT_MS = 10000;

export function captureVideoFrame(file: File, atSeconds = 1): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let done = false;

    const finish = (blob: Blob | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve(blob);
    };
    const timer = setTimeout(() => finish(null), TIMEOUT_MS);

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.addEventListener("loadedmetadata", () => {
      // En videos muy cortos, tomar la mitad para no caer en un fotograma negro del final
      const t = Number.isFinite(video.duration) ? Math.min(atSeconds, video.duration / 2) : 0;
      video.currentTime = t;
    });

    video.addEventListener("seeked", () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return finish(null);
      const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return finish(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.9);
    });

    video.addEventListener("error", () => finish(null));
    video.src = url;
  });
}
