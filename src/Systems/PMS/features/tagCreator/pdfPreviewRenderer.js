import * as pdfjsLib from 'pdfjs-dist';

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn('Could not set pdfjs workerSrc:', e);
}

const MM_TO_PT = 72 / 25.4;

/**
 * Rasterizes every page of a jsPDF document to PNG data URLs, so the preview
 * shown on screen is pixel-identical to the file that gets downloaded —
 * same renderer, same fonts, same layout, no separate approximation.
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {{ widthMm: number, heightMm: number, displayPxPerMm?: number, pixelDensity?: number }} opts
 */
export async function renderPdfPagesToDataUrls(doc, { widthMm, displayPxPerMm = 3.5, pixelDensity = 2 } = {}) {
  const arrayBuffer = doc.output('arraybuffer');
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageWidthPt = widthMm * MM_TO_PT;
  const targetCanvasWidthPx = widthMm * displayPxPerMm * pixelDensity;
  const scale = targetCanvasWidthPx / pageWidthPt;

  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');

    await page.render({ canvasContext: context, viewport }).promise;
    pages.push(canvas.toDataURL('image/png'));
  }

  return pages;
}
