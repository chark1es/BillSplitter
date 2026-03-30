const MAX_BYTES = 100 * 1024;
const MAX_DIM = 1600;

export type ReceiptUploadAsset = {
  blob: Blob;
  fileName: string;
  mimeType: string;
  compressed: boolean;
};

async function bitmapToWebpUnder100k(
  source: ImageBitmap,
  options?: {
    maxDim?: number;
    initialQuality?: number;
    minQuality?: number;
    shrinkStep?: number;
    qualityStep?: number;
  },
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const maxDim = options?.maxDim ?? MAX_DIM;
  const minQuality = options?.minQuality ?? 0.42;
  const qualityStep = options?.qualityStep ?? 0.05;
  const shrinkStep = options?.shrinkStep ?? 0.88;
  let scale = Math.min(1, maxDim / Math.max(source.width, source.height));
  let w = Math.max(1, Math.round(source.width * scale));
  let h = Math.max(1, Math.round(source.height * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unsupported");
  }

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
  };
  draw();

  let quality = options?.initialQuality ?? 0.9;
  for (let attempt = 0; attempt < 40; attempt++) {
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", quality),
    );
    if (blob && blob.size <= MAX_BYTES) {
      return blob;
    }
    quality -= qualityStep;
    if (quality < minQuality) {
      quality = 0.88;
      w = Math.max(1, Math.round(w * shrinkStep));
      h = Math.max(1, Math.round(h * shrinkStep));
      canvas.width = w;
      canvas.height = h;
      draw();
    }
  }

  throw new Error("Could not compress under 100KB — try a smaller or simpler image.");
}

async function heicToBitmap(file: File): Promise<ImageBitmap> {
  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return createImageBitmap(blob);
}

async function pdfFirstPageToBitmap(file: File): Promise<ImageBitmap> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, MAX_DIM / Math.max(baseViewport.width, baseViewport.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unsupported");
  }
  await page.render({ canvas, viewport }).promise;
  return createImageBitmap(canvas);
}

const IMAGE_TYPES =
  /^image\/(png|jpeg|jpg|webp|gif|bmp|tiff|avif|svg\+xml|heic|heif)/i;

export async function convertReceiptFileToWebp(file: File): Promise<ReceiptUploadAsset> {
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  let bitmap: ImageBitmap | null = null;

  try {
    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      bitmap = await pdfFirstPageToBitmap(file);
    } else if (
      mime.includes("heic") ||
      mime.includes("heif") ||
      name.endsWith(".heic") ||
      name.endsWith(".heif")
    ) {
      bitmap = await heicToBitmap(file);
    } else if (IMAGE_TYPES.test(mime) || /\.(png|jpe?g|webp|gif|bmp|tiff?|avif)$/i.test(name)) {
      bitmap = await createImageBitmap(file);
    } else {
      bitmap = await createImageBitmap(file);
    }
    try {
      const firstPass = await bitmapToWebpUnder100k(bitmap);
      return {
        blob: firstPass,
        fileName: `${file.name.replace(/\.[^.]+$/, "")}.webp`,
        mimeType: "image/webp",
        compressed: true,
      };
    } catch {
      // Second pass: smaller max dimension and slightly more aggressive quality decay.
      const secondPass = await bitmapToWebpUnder100k(bitmap, {
        maxDim: 1280,
        initialQuality: 0.86,
        minQuality: 0.35,
        shrinkStep: 0.84,
        qualityStep: 0.06,
      }).catch(() => null);

      if (secondPass && secondPass.size <= MAX_BYTES) {
        return {
          blob: secondPass,
          fileName: `${file.name.replace(/\.[^.]+$/, "")}.webp`,
          mimeType: "image/webp",
          compressed: true,
        };
      }

      return {
        blob: file,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        compressed: false,
      };
    }
  } finally {
    bitmap?.close();
  }
}
