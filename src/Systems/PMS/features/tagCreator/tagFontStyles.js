import {
  VERDANA_BASE64,
  GILL_SANS_BASE64,
  PLUS_JAKARTA_LIGHT_BASE64,
  PLUS_JAKARTA_REGULAR_BASE64,
} from './fonts/tagFontsData';

// Each style bundles a title font (used above the divider) and a
// description font (used below it). `embed` is omitted for jsPDF's built-in
// fonts (helvetica/times/courier), which need no VFS registration.
export const FONT_STYLES = [
  {
    id: 'classic',
    label: 'Classic',
    sublabel: 'Verdana & Gill Sans MT',
    title: { family: 'Verdana', style: 'normal', embed: { fileName: 'Verdana.ttf', base64: VERDANA_BASE64 } },
    desc: { family: 'GillSansMT', style: 'normal', embed: { fileName: 'GillSansMT.ttf', base64: GILL_SANS_BASE64 } },
  },
  {
    id: 'modern',
    label: 'Modern',
    sublabel: 'Plus Jakarta Sans',
    title: {
      family: 'PlusJakartaSans-Light',
      style: 'normal',
      embed: { fileName: 'PlusJakartaSans-Light.ttf', base64: PLUS_JAKARTA_LIGHT_BASE64 },
    },
    desc: {
      family: 'PlusJakartaSans-Regular',
      style: 'normal',
      embed: { fileName: 'PlusJakartaSans-Regular.ttf', base64: PLUS_JAKARTA_REGULAR_BASE64 },
    },
  },
  {
    id: 'elegant',
    label: 'Elegant',
    sublabel: 'Times (serif)',
    title: { family: 'times', style: 'normal' },
    desc: { family: 'times', style: 'normal' },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    sublabel: 'Helvetica',
    title: { family: 'helvetica', style: 'normal' },
    desc: { family: 'helvetica', style: 'normal' },
  },
];

export function getFontStyle(id) {
  return FONT_STYLES.find((f) => f.id === id) || FONT_STYLES[0];
}
