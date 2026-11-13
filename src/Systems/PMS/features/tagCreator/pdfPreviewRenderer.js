import * as pdfjsLib from 'pdfjs-dist';

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn('Could not set pdfjs workerSrc:', e);
}

const PT_PER_MM = 72 / 25.4;

/**
 * Rasterizes every page of a jsPDF document to a PNG data URL, so the preview
 * shown on screen is pixel-identical to the file that gets downloaded — same
 * renderer, same fonts, same layout, no separate approximation.
 *
 * Each page is measured individually, so a PDF that mixes tag sizes renders
 * every page at the correct scale for its own physical size.
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {{ displayPxPerMm?: number, pixelDensity?: number }} [opts]
 * @returns {Promise<Array<{ src: string, widthMm: number, heightMm: number }>>}
 */
export async function renderPdfPagesToDataUrls(doc, { displayPxPerMm = 3.5, pixelDensity = 2 } = {}) {
  const arrayBuffer = doc.output('arraybuffer');
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // Page size in PDF points, read from the page itself rather than assumed.
    const unscaled = page.getViewport({ scale: 1 });
    const widthMm = unscaled.width / PT_PER_MM;
    const heightMm = unscaled.height / PT_PER_MM;

    const scale = (widthMm * displayPxPerMm * pixelDensity) / unscaled.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');

    await page.render({ canvasContext: context, viewport }).promise;
    pages.push({ src: canvas.toDataURL('image/png'), widthMm, heightMm });
  }

  return pages;
}
