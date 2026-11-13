// All dimensions normalized to millimeters (jsPDF's native unit) for exact physical output.
const INCH_TO_MM = 25.4;
const CM_TO_MM = 10;

export const UNIT_TO_MM = {
  mm: 1,
  cm: CM_TO_MM,
  in: INCH_TO_MM,
};

export const CUSTOM_SIZE_ID = 'custom';

export const TAG_SIZES = [
  {
    id: 'oldMedium',
    label: 'Old Medium Tag',
    sublabel: '8 × 6 in',
    widthMm: 8 * INCH_TO_MM,
    heightMm: 6 * INCH_TO_MM,
  },
  {
    id: 'small',
    label: 'Small Tag',
    sublabel: '120 × 83 mm',
    widthMm: 120,
    heightMm: 83,
  },
  {
    id: 'newMedium',
    label: 'New Medium Tag',
    sublabel: '18.2 × 12 cm',
    widthMm: 18.2 * CM_TO_MM,
    heightMm: 12 * CM_TO_MM,
  },
  {
    id: 'newBig',
    label: 'New Big Tag',
    sublabel: '22 × 32 cm',
    widthMm: 22 * CM_TO_MM,
    heightMm: 32 * CM_TO_MM,
  },
];

export function getTagSize(id) {
  return TAG_SIZES.find((s) => s.id === id) || TAG_SIZES[0];
}

/** Builds a size object from user-entered width/height in the given unit. */
export function buildCustomSize({ width, height, unit }) {
  const factor = UNIT_TO_MM[unit] || 1;
  const widthMm = Number(width) * factor;
  const heightMm = Number(height) * factor;

  return {
    id: CUSTOM_SIZE_ID,
    label: 'Custom Tag',
    sublabel: `${width} × ${height} ${unit}`,
    widthMm,
    heightMm,
  };
}

export function isValidCustomDimensions({ width, height }) {
  const w = Number(width);
  const h = Number(height);
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
}
