import React, { useEffect, useMemo, useState } from 'react';
import { Tags, Download, Info, Loader2, CheckCircle2, Ruler, X, Type } from 'lucide-react';
import { toast } from 'sonner';
import { TAG_SIZES, CUSTOM_SIZE_ID, getTagSize, buildCustomSize, isValidCustomDimensions } from './tagSizes';
import { FONT_STYLES } from './tagFontStyles';
import { parseDishPairs } from './tagParser';
import { generateTagsPdf, downloadTagsPdf } from './tagPdfGenerator';
import { renderPdfPagesToDataUrls } from './pdfPreviewRenderer';
import { TagPreview } from './TagPreview';

const PREVIEW_PX_PER_MM = 3.5;
const PREVIEW_DEBOUNCE_MS = 400;
const UNITS = ['mm', 'cm', 'in'];

export function TagCreatorPage() {
  const [sizeId, setSizeId] = useState(TAG_SIZES[0].id);
  const [fontStyleId, setFontStyleId] = useState(FONT_STYLES[0].id);
  const [customWidth, setCustomWidth] = useState('150');
  const [customHeight, setCustomHeight] = useState('100');
  const [customUnit, setCustomUnit] = useState('mm');
  const [titlesInput, setTitlesInput] = useState('');
  const [descriptionsInput, setDescriptionsInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewPages, setPreviewPages] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const isCustomSelected = sizeId === CUSTOM_SIZE_ID;
  const customDims = { width: customWidth, height: customHeight, unit: customUnit };
  const isCustomValid = !isCustomSelected || isValidCustomDimensions(customDims);

  const size = useMemo(() => {
    if (isCustomSelected) {
      return isValidCustomDimensions(customDims) ? buildCustomSize(customDims) : null;
    }
    return getTagSize(sizeId);
  }, [sizeId, isCustomSelected, customWidth, customHeight, customUnit]);

  const dishes = useMemo(
    () => parseDishPairs(titlesInput, descriptionsInput),
    [titlesInput, descriptionsInput]
  );

  // The preview renders the real generated PDF (via pdf.js) rather than a
  // separate re-implementation of the layout, so it's always pixel-identical
  // to what gets downloaded.
  useEffect(() => {
    if (dishes.length === 0 || !size) {
      setPreviewPages([]);
      setIsPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setIsPreviewLoading(true);

    const timer = setTimeout(async () => {
      try {
        const doc = await generateTagsPdf({ dishes, size, fontStyleId });
        const pages = await renderPdfPagesToDataUrls(doc, { widthMm: size.widthMm });
        if (!cancelled) setPreviewPages(pages);
      } catch (err) {
        console.error('Tag preview render failed:', err);
        if (!cancelled) setPreviewPages([]);
      } finally {
        if (!cancelled) setIsPreviewLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dishes, size, fontStyleId]);

  const handleGenerate = async () => {
    if (dishes.length === 0) {
      toast.error('Enter at least one dish name to generate tags.');
      return;
    }
    if (!size) {
      toast.error('Enter a valid custom width and height first.');
      return;
    }

    setIsGenerating(true);
    try {
      await downloadTagsPdf({ dishes, size, fontStyleId });
      toast.success(`Generated ${dishes.length} tag${dishes.length > 1 ? 's' : ''} as PDF.`);
    } catch (err) {
      console.error('Tag PDF generation failed:', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const previewWidthPx = size ? size.widthMm * PREVIEW_PX_PER_MM : 0;
  const previewHeightPx = size ? size.heightMm * PREVIEW_PX_PER_MM : 0;
  const canGenerate = !isGenerating && dishes.length > 0 && !!size;

  return (
    <div className="h-full min-h-0 flex flex-col w-full min-w-0 max-w-[1400px] mx-auto p-4 lg:p-8">
      {/* Header — fixed, never scrolls */}
      <div className="shrink-0 flex items-center justify-between gap-4 flex-wrap pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0a4a87]/10 flex items-center justify-center shrink-0">
            <Tags className="w-5 h-5 text-[#0a4a87]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Tag Creator</h1>
            <p className="text-sm text-slate-500">Generate print-ready dish tags in exact physical sizes.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex items-center justify-center gap-2 bg-[#0a4a87] hover:bg-[#083d70] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          {isGenerating ? 'Generating...' : `Download PDF (${dishes.length} tag${dishes.length === 1 ? '' : 's'})`}
        </button>
      </div>

      {/* Body — fills remaining height. On lg+, each section scrolls independently
          and the page itself never grows a scrollbar; on small screens it falls
          back to one natural page scroll. */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Section 1: Tag Settings */}
        <section className="lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3 px-1">
            1. Tag Settings
          </h2>
          <div className="space-y-5 pb-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Tag Size</label>
                <div className="grid grid-cols-1 gap-2">
                  {TAG_SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSizeId(s.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        sizeId === s.id
                          ? 'border-[#0a4a87] bg-[#0a4a87]/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {sizeId === s.id && <CheckCircle2 className="w-4 h-4 text-[#0a4a87] shrink-0" />}
                        <span className={`text-sm font-medium ${sizeId === s.id ? 'text-[#0a4a87]' : 'text-slate-700'}`}>
                          {s.label}
                        </span>
                      </span>
                      <span className="text-xs text-slate-400">{s.sublabel}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setSizeId(CUSTOM_SIZE_ID)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      isCustomSelected
                        ? 'border-[#0a4a87] bg-[#0a4a87]/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isCustomSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-[#0a4a87] shrink-0" />
                      ) : (
                        <Ruler className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${isCustomSelected ? 'text-[#0a4a87]' : 'text-slate-700'}`}>
                        Custom Size
                      </span>
                    </span>
                  </button>
                </div>

                {isCustomSelected && (
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Width</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0a4a87]/30 focus:border-[#0a4a87]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Height</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0a4a87]/30 focus:border-[#0a4a87]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Unit</label>
                      <select
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0a4a87]/30 focus:border-[#0a4a87]"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    {!isCustomValid && (
                      <p className="col-span-3 text-xs text-red-500 mt-0.5">Enter a width and height greater than 0.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Font Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_STYLES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontStyleId(f.id)}
                      className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        fontStyleId === f.id
                          ? 'border-[#0a4a87] bg-[#0a4a87]/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {fontStyleId === f.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0a4a87] shrink-0" />
                        ) : (
                          <Type className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className={`text-sm font-medium ${fontStyleId === f.id ? 'text-[#0a4a87]' : 'text-slate-700'}`}>
                          {f.label}
                        </span>
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5">{f.sublabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Upper Text (Dish Names)</label>
                  {titlesInput && (
                    <button
                      type="button"
                      onClick={() => setTitlesInput('')}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={titlesInput}
                  onChange={(e) => setTitlesInput(e.target.value)}
                  placeholder={'PANI PURI\n\nWELCOME DRINK'}
                  rows={6}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a4a87]/30 focus:border-[#0a4a87] resize-y"
                />
                <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-400">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    This is the bold text shown above the divider line. Separate dishes with a blank line —
                    a long name will wrap automatically, so you don't need to break it onto a new line yourself.
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Lower Text (Description)</label>
                  {descriptionsInput && (
                    <button
                      type="button"
                      onClick={() => setDescriptionsInput('')}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={descriptionsInput}
                  onChange={(e) => setDescriptionsInput(e.target.value)}
                  placeholder={'In Bombay style with silbatta pani ragda\n\nThai basil twist chilly guava masala cold drink'}
                  rows={6}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a4a87]/30 focus:border-[#0a4a87] resize-y"
                />
                <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-400">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    Optional, shown below the divider line. Matches dish names by order — the 1st block goes
                    with the 1st dish name, and so on. A description can span multiple lines; separate dishes
                    with a blank line. Leave empty for a dish with no description.
                  </span>
                </div>
              </div>
            </div>
          </section>

        {/* Section 2: Live Preview — fills the full height of its column so the tag is as
            large and visible as possible; only scrolls internally if there are many tags. */}
        <section className="lg:h-full lg:min-h-0 flex flex-col">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3 px-1 shrink-0">
            2. Live Preview
          </h2>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex-1 min-h-[400px] lg:min-h-0 flex flex-col overflow-hidden">
            {size && dishes.length > 0 && (
              <div className="flex items-center justify-between mb-4 text-xs text-slate-500 shrink-0">
                <span className="font-medium text-slate-600">
                  {TAG_SIZES.find((s) => s.id === sizeId)?.label || 'Custom Tag'}
                </span>
                <span>{size.sublabel} &middot; {dishes.length} tag{dishes.length === 1 ? '' : 's'}</span>
              </div>
            )}

            {dishes.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 py-20">
                Enter dish names to see a live preview.
              </div>
            ) : !size ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 py-20">
                Enter a valid custom width and height to see a preview.
              </div>
            ) : isPreviewLoading && previewPages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 py-20 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Rendering preview...
              </div>
            ) : (
              <div className={`flex-1 min-h-0 flex flex-wrap gap-6 items-center justify-center overflow-auto ${isPreviewLoading ? 'opacity-60' : ''}`}>
                {previewPages.map((src, idx) => (
                  <TagPreview key={idx} src={src} widthPx={previewWidthPx} heightPx={previewHeightPx} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
