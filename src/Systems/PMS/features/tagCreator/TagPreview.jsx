import React from 'react';

// Renders one already-rasterized PDF page (see pdfPreviewRenderer.js), so
// the preview is pixel-identical to the downloaded file — not a separate
// re-implementation of the layout that can drift from it.
//
// Sized via CSS (object-contain + max-w/h-full) rather than a fixed pixel
// size, so it shrinks to fit whatever space is available instead of forcing
// the container to scroll to see the whole tag. Mixed-size batches keep their
// relative proportions because each image's natural size scales with its
// physical size.
export function TagPreview({ src, widthMm, heightMm, label }) {
  return (
    <img
      src={src}
      alt={label || 'Tag preview'}
      title={label}
      className="bg-white border border-slate-200 rounded-sm shadow-sm max-w-full max-h-full w-auto h-auto object-contain"
      style={{ aspectRatio: `${widthMm} / ${heightMm}` }}
    />
  );
}
