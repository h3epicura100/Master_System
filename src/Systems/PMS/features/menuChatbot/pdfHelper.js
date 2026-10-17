import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for Vite/modern browser
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn('Could not set pdfjs workerSrc:', e);
}

/**
 * Converts a PDF (from base64 or ArrayBuffer) into an array of image data URLs (JPEG)
 * and extracted text, up to maxPages.
 * This enables OpenAI Vision to inspect PDF menus visually (scans, tables, fonts)
 * as well as reading the extracted text.
 * 
 * @param {string} base64Data - Raw base64 string of the PDF
 * Converts a base64 PDF into an array of page images (JPEG data URLs) and extracted text lines.
 * Uses pdfjs-dist. Renders all pages with no arbitrary limit.
 *
 * @param {string} base64Data - Base64 encoded PDF string
 * @returns {Promise<{ images: string[], text: string, totalPages: number, renderedPages: number } | null>}
 */
export async function convertPdfToImagesAndText(base64Data) {
  if (!base64Data) return null;

  try {
    const rawData = atob(base64Data);
    const uint8Array = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      uint8Array[i] = rawData.charCodeAt(i);
    }

    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    const images = [];
    const textLines = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);

      // Extract text content
      try {
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        if (pageText.trim()) {
          textLines.push(`--- Page ${pageNum} ---\n${pageText}`);
        }
      } catch (tErr) {
        console.warn(`Could not extract text from page ${pageNum}:`, tErr);
      }

      // Render page to canvas image for OpenAI Vision
      try {
        if (typeof document !== 'undefined') {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          images.push(dataUrl);
        }
      } catch (rErr) {
        console.warn(`Could not render page ${pageNum} to canvas:`, rErr);
      }
    }

    return {
      images,
      text: textLines.join('\n\n'),
      totalPages: pdfDoc.numPages,
      renderedPages: numPages,
    };
  } catch (err) {
    console.error('Failed to convert PDF:', err);
    return null;
  }
}
