// Shared layout constants for the tag template, used by both the PDF
// generator (mm/pt units) and the on-screen preview (px units) so the two
// never drift apart.
export const MARGIN_RATIO = 0.1; // side margin as a fraction of tag width
export const TITLE_MAX_PT = 56;
export const TITLE_MIN_PT = 10;
export const DESC_MAX_PT = 20;
export const DESC_MIN_PT = 7;
export const LINE_HEIGHT_FACTOR = 1.25;

export const LOGO_TOP_RATIO = 0.01;
export const LOGO_HEIGHT_RATIO = 0.34;
export const LOGO_GAP_RATIO = 0.015;
export const TITLE_AREA_HEIGHT_RATIO = 0.32;

export const DIVIDER_GAP_RATIO = 0.04; // gap between title area and divider, as a fraction of tag height
export const DIVIDER_WIDTH_RATIO = 0.85; // divider width as a fraction of tag width
export const DESC_GAP_RATIO = 0.07; // gap between divider and description area
export const DESC_BOTTOM_MARGIN_RATIO = 0.05;
