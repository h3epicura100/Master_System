import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tags, Download, Loader2, CheckCircle2, Type } from 'lucide-react';
import { toast } from 'sonner';
import {
  TAG_SIZES,
  CUSTOM_SIZE_ID,
  DEFAULT_SIZE_CHOICE,
  getTagSize,
  buildCustomSize,
  isValidCustomDimensions,
  resolveSizeChoice,
} from './tagSizes';
import { FONT_STYLES } from './tagFontStyles';
import { generateTagsPdf, downloadTagsPdf } from './tagPdfGenerator';
import { renderPdfPagesToDataUrls } from './pdfPreviewRenderer';
import { TagPreview } from './TagPreview';
import { SizeSelector } from './SizeSelector';
import { SmartPasteBox } from './SmartPasteBox';
import { DishList } from './DishList';

const PREVIEW_DEBOUNCE_MS = 400;

let dishIdCounter = 0;
const makeDish = ({ title = '', description = '' } = {}) => ({
  id: `dish-${++dishIdCounter}`,
  title,
  description,
  sizeId: DEFAULT_SIZE_CHOICE,
});

export function TagCreatorPage() {
  const [sizeId, setSizeId] = useState(TAG_SIZES[0].id);
  const [custom, setCustom] = useState({ width: '150', height: '100', unit: 'mm' });
  const [fontStyleId, setFontStyleId] = useState(FONT_STYLES[0].id);
  const [dishes, setDishes] = useState([]);
  const [focusDishId, setFocusDishId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewPages, setPreviewPages] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const dishListRef = useRef(null);

  // --- Sizes -------------------------------------------------------------
  const isCustomValid = isValidCustomDimensions(custom);
  const customSize = useMemo(
    () => (isCustomValid ? buildCustomSize(custom) : null),
    [isCustomValid, custom.width, custom.height, custom.unit]
  );
  const defaultSize = useMemo(
    () => (sizeId === CUSTOM_SIZE_ID ? customSize : getTagSize(sizeId)),
    [sizeId, customSize]
  );
  const showCustomFields = sizeId === CUSTOM_SIZE_ID || dishes.some((d) => d.sizeId === CUSTOM_SIZE_ID);

  // --- Dish list ---------------------------------------------------------
  const addDetectedDishes = (detected) => {
    setDishes((prev) => [...prev, ...detected.map(makeDish)]);
    // Bring the new rows into view once they have rendered.
    requestAnimationFrame(() => {
      dishListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const addBlankDish = () => {
    const dish = makeDish();
    setFocusDishId(dish.id);
    setDishes((prev) => [...prev, dish]);
  };

  const updateDish = (id, patch) =>
    setDishes((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const removeDish = (id) => setDishes((prev) => prev.filter((d) => d.id !== id));

  const clearDishes = () => {
    if (window.confirm('Remove all dishes from the list?')) setDishes([]);
  };

  // Tags that will actually be printed: rows with a name, each with its resolved size.
  const printable = useMemo(
    () =>
      dishes
        .filter((d) => d.title.trim())
        .map((d) => ({
          title: d.title.trim(),
          description: d.description.trim(),
          size: resolveSizeChoice(d.sizeId, { defaultSize, customSize }),
        })),
    [dishes, defaultSize, customSize]
  );
  const hasInvalidSize = printable.some((d) => !d.size);
  const readyDishes = useMemo(() => (hasInvalidSize ? [] : printable), [hasInvalidSize, printable]);

  // --- Live preview ------------------------------------------------------
  // The preview renders the real generated PDF (via pdf.js) rather than a
  // separate re-implementation of the layout, so it's always pixel-identical
  // to what gets downloaded.
  useEffect(() => {
    if (readyDishes.length === 0) {
      setPreviewPages([]);
      setIsPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setIsPreviewLoading(true);

    const timer = setTimeout(async () => {
      try {
        const doc = await generateTagsPdf({ dishes: readyDishes, fontStyleId });
        const pages = await renderPdfPagesToDataUrls(doc);
        if (!cancelled) {
          setPreviewPages(
            pages.map((page, i) => ({
              ...page,
              label: `${readyDishes[i].size.label} · ${readyDishes[i].size.sublabel}`,
            }))
          );
        }
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
  }, [readyDishes, fontStyleId]);

  // --- Download ----------------------------------------------------------
  const handleGenerate = async () => {
    if (printable.length === 0) {
      toast.error('Add at least one dish with a name to generate tags.');
      return;
    }
    if (hasInvalidSize) {
      toast.error('Enter a valid custom width and height first.');
      return;
    }

    setIsGenerating(true);
    try {
      await downloadTagsPdf({ dishes: readyDishes, fontStyleId });
      toast.success(`Generated ${readyDishes.length} tag${readyDishes.length > 1 ? 's' : ''} in one PDF.`);
    } catch (err) {
      console.error('Tag PDF generation failed:', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = !isGenerating && readyDishes.length > 0;

  const sizeSummary = useMemo(() => {
    const unique = new Map(readyDishes.map((d) => [`${d.size.label}|${d.size.sublabel}`, d.size]));
    if (unique.size === 1) {
      const only = [...unique.values()][0];
      return { title: only.label, detail: only.sublabel };
    }
    return { title: 'Mixed sizes', detail: `${unique.size} sizes` };
  }, [readyDishes]);

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
          {isGenerating
            ? 'Generating...'
            : `Download PDF (${printable.length} tag${printable.length === 1 ? '' : 's'})`}
        </button>
      </div>

      {/* Body — fills remaining height. On lg+, each section scrolls independently
          and the page itself never grows a scrollbar; on small screens it falls
          back to one natural page scroll. */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* Section 1: Tag Settings */}
        <section className="lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3 px-1">
            1. Tag Settings
          </h2>
          <div className="space-y-5 pb-4">
            <SizeSelector
              sizeId={sizeId}
              onSizeChange={setSizeId}
              custom={custom}
              onCustomChange={setCustom}
              isCustomValid={isCustomValid}
              showCustomFields={showCustomFields}
            />

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Font Style</label>
              <div className="grid grid-cols-2 gap-2">
                {FONT_STYLES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontStyleId(f.id)}
                    className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors ${
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

            <SmartPasteBox onDishesDetected={addDetectedDishes} />

            <div ref={dishListRef}>
              <DishList
                dishes={dishes}
                defaultSize={defaultSize}
                customSize={customSize}
                focusDishId={focusDishId}
                onChange={updateDish}
                onRemove={removeDish}
                onAdd={addBlankDish}
                onClear={clearDishes}
              />
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
            {readyDishes.length > 0 && (
              <div className="flex items-center justify-between mb-4 text-xs text-slate-500 shrink-0">
                <span className="font-medium text-slate-600">{sizeSummary.title}</span>
                <span>
                  {sizeSummary.detail} &middot; {readyDishes.length} tag{readyDishes.length === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {printable.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-sm text-slate-400 py-20 px-6">
                Paste your menu and click &ldquo;Analyze with AI&rdquo;, or add a dish manually, to see a live preview.
              </div>
            ) : hasInvalidSize ? (
              <div className="flex-1 flex items-center justify-center text-center text-sm text-slate-400 py-20 px-6">
                Enter a valid custom width and height to see a preview.
              </div>
            ) : isPreviewLoading && previewPages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 py-20 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Rendering preview...
              </div>
            ) : (
              <div
                className={`flex-1 min-h-0 flex flex-wrap gap-6 items-center justify-center overflow-auto ${
                  isPreviewLoading ? 'opacity-60' : ''
                }`}
              >
                {previewPages.map((page, idx) => (
                  <TagPreview
                    key={idx}
                    src={page.src}
                    widthMm={page.widthMm}
                    heightMm={page.heightMm}
                    label={page.label}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
