import { jsPDF } from 'jspdf';
import { loadLogoImage } from './tagLogo';
import { getFontStyle } from './tagFontStyles';
import {
  MARGIN_RATIO,
  TITLE_MAX_PT,
  TITLE_MIN_PT,
  DESC_MAX_PT,
  DESC_MIN_PT,
  LINE_HEIGHT_FACTOR,
  LOGO_TOP_RATIO,
  LOGO_HEIGHT_RATIO,
  LOGO_GAP_RATIO,
  TITLE_AREA_HEIGHT_RATIO,
  DIVIDER_GAP_RATIO,
  DIVIDER_WIDTH_RATIO,
  DESC_GAP_RATIO,
  DESC_BOTTOM_MARGIN_RATIO,
} from './tagLayout';

function registerFont(doc, font) {
  if (!font.embed) return; // built-in jsPDF font (helvetica/times/courier) — nothing to register
  doc.addFileToVFS(font.embed.fileName, font.embed.base64);
  doc.addFont(font.embed.fileName, font.family, font.style);
}

/**
 * Shrinks fontSize (in pt) step by step until the given text, wrapped to
 * maxWidthMm, both (a) fits its lines within maxWidthMm and (b) its total
 * block height fits within maxHeightMm. Returns { fontSize, lines, lineHeightMm }.
 */
function fitText(doc, text, { maxWidthMm, maxHeightMm, maxPt, minPt, font }) {
  doc.setFont(font.family, font.style);

  for (let pt = maxPt; pt >= minPt; pt -= 0.5) {
    doc.setFontSize(pt);
    const lines = doc.splitTextToSize(text, maxWidthMm);
    const lineHeightMm = (pt / 72) * 25.4 * LINE_HEIGHT_FACTOR;
    const blockHeightMm = lines.length * lineHeightMm;

    if (blockHeightMm <= maxHeightMm) {
      return { fontSize: pt, lines, lineHeightMm };
    }
  }

  // Fall back to the minimum size even if it slightly overflows,
  // so text is never silently dropped.
  doc.setFontSize(minPt);
  const lines = doc.splitTextToSize(text, maxWidthMm);
  const lineHeightMm = (minPt / 72) * 25.4 * LINE_HEIGHT_FACTOR;
  return { fontSize: minPt, lines, lineHeightMm };
}

function drawDivider(doc, centerXMm, yMm, widthMm) {
  const halfWidth = widthMm / 2;
  const dotRadiusMm = widthMm * 0.012;

  doc.setDrawColor(10, 74, 135);
  doc.setLineWidth(widthMm * 0.0025);
  doc.line(centerXMm - halfWidth, yMm, centerXMm - dotRadiusMm * 2, yMm);
  doc.line(centerXMm + dotRadiusMm * 2, yMm, centerXMm + halfWidth, yMm);

  doc.setFillColor(10, 74, 135);
  doc.circle(centerXMm, yMm, dotRadiusMm, 'F');
}

function drawLogo(doc, logo, centerXMm, topMm, maxHeightMm) {
  if (!logo) return 0;
  const heightMm = maxHeightMm;
  const widthMm = heightMm * logo.aspect;
  doc.addImage(logo.dataUrl, 'PNG', centerXMm - widthMm / 2, topMm, widthMm, heightMm);
  return heightMm;
}

function drawTag(doc, { title, description }, { widthMm, heightMm }, logo, fontStyle) {
  const marginMm = widthMm * MARGIN_RATIO;
  const contentWidthMm = widthMm - marginMm * 2;
  const centerXMm = widthMm / 2;
  const textColor = [10, 74, 135]; // matches the reference tags' navy blue

  doc.setTextColor(...textColor);

  // Logo sits centered at the top of the tag.
  const logoTopMm = heightMm * LOGO_TOP_RATIO;
  const logoHeightMm = drawLogo(doc, logo, centerXMm, logoTopMm, heightMm * LOGO_HEIGHT_RATIO);

  // Title block, vertically centered in a fixed-height band below the logo.
  // Uppercased to match every reference tag's print style, regardless of input case.
  const titleAreaTopMm = logoTopMm + logoHeightMm + (logoHeightMm ? heightMm * LOGO_GAP_RATIO : heightMm * 0.1);
  const titleAreaHeightMm = heightMm * TITLE_AREA_HEIGHT_RATIO;
  const { fontSize: titleFontSize, lines: titleLines, lineHeightMm: titleLineHeightMm } = fitText(
    doc,
    title.toUpperCase(),
    {
      maxWidthMm: contentWidthMm,
      maxHeightMm: titleAreaHeightMm,
      maxPt: TITLE_MAX_PT,
      minPt: TITLE_MIN_PT,
      font: fontStyle.title,
    }
  );

  doc.setFontSize(titleFontSize);
  const titleBlockHeightMm = titleLines.length * titleLineHeightMm;
  let cursorYMm = titleAreaTopMm + (titleAreaHeightMm - titleBlockHeightMm) / 2 + titleLineHeightMm * 0.75;
  titleLines.forEach((line) => {
    doc.text(line, centerXMm, cursorYMm, { align: 'center' });
    cursorYMm += titleLineHeightMm;
  });

  // Divider sits just below the title area.
  const dividerYMm = titleAreaTopMm + titleAreaHeightMm + heightMm * DIVIDER_GAP_RATIO;
  drawDivider(doc, centerXMm, dividerYMm, widthMm * DIVIDER_WIDTH_RATIO);

  // Description block below the divider.
  if (description && description.trim()) {
    const descAreaTopMm = dividerYMm + heightMm * DESC_GAP_RATIO;
    const descAreaHeightMm = heightMm - descAreaTopMm - heightMm * DESC_BOTTOM_MARGIN_RATIO;
    const { fontSize: descFontSize, lines: descLines, lineHeightMm: descLineHeightMm } = fitText(
      doc,
      description.toUpperCase(),
      {
        maxWidthMm: contentWidthMm,
        maxHeightMm: Math.max(descAreaHeightMm, 0),
        maxPt: DESC_MAX_PT,
        minPt: DESC_MIN_PT,
        font: fontStyle.desc,
      }
    );

    doc.setFontSize(descFontSize);
    let descCursorYMm = descAreaTopMm + descLineHeightMm * 0.75;
    descLines.forEach((line) => {
      doc.text(line, centerXMm, descCursorYMm, { align: 'center' });
      descCursorYMm += descLineHeightMm;
    });
  }
}

const orientationFor = ({ widthMm, heightMm }) => (widthMm >= heightMm ? 'landscape' : 'portrait');

/**
 * Builds one multi-page, print-ready PDF — one page per dish. Every dish
 * carries its own `size` ({ widthMm, heightMm }), so a single PDF can mix tag
 * sizes; each page is cut to the exact physical dimensions of its own tag.
 *
 * @param {{ dishes: Array<{ title: string, description?: string, size: { widthMm: number, heightMm: number } }>, fontStyleId?: string }} opts
 */
export async function generateTagsPdf({ dishes, fontStyleId }) {
  if (!dishes || dishes.length === 0) {
    throw new Error('At least one dish is required to generate tags.');
  }

  const fontStyle = getFontStyle(fontStyleId);

  let logo = null;
  try {
    logo = await loadLogoImage();
  } catch (err) {
    console.warn('Tag logo failed to load; generating tags without it.', err);
  }

  // jsPDF needs an initial page format; the first dish's size is used for it.
  const first = dishes[0].size;
  const doc = new jsPDF({
    orientation: orientationFor(first),
    unit: 'mm',
    format: [first.widthMm, first.heightMm],
    compress: true,
  });
  registerFont(doc, fontStyle.title);
  registerFont(doc, fontStyle.desc);

  dishes.forEach((dish, index) => {
    const { widthMm, heightMm } = dish.size;
    if (index > 0) {
      doc.addPage([widthMm, heightMm], orientationFor(dish.size));
    }
    drawTag(doc, dish, { widthMm, heightMm }, logo, fontStyle);
  });

  return doc;
}

function pdfFileName(dishes) {
  const labels = new Set(dishes.map((d) => d.size.label));
  const sizePart = labels.size === 1 ? [...labels][0].replace(/\s+/g, '') : 'MixedSizes';
  const datePart = new Date().toISOString().slice(0, 10);
  return `Tags_${sizePart}_${datePart}.pdf`;
}

export async function downloadTagsPdf({ dishes, fontStyleId }) {
  const doc = await generateTagsPdf({ dishes, fontStyleId });
  doc.save(pdfFileName(dishes));
}
