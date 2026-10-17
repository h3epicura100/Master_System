import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { H3_TERMS_AND_CONDITIONS } from './chatbotPrompts.js';

// Brand colors
const NAVY = [30, 58, 138]; // #1E3A8A
const GOLD = [180, 83, 9];  // #B45309
const DARK_SLATE = [15, 23, 42]; // #0F172A
const MUTED_SLATE = [71, 85, 105]; // #475569
const LIGHT_BG = [248, 250, 252]; // #F8FAFC
const BORDER_COLOR = [226, 232, 240]; // #E2E8F0

export const menuPdfService = {
  _watermarkCache: null,

  /**
   * Pre-loads H3-logo.svg, strips out solid background, and rasterizes to a PNG Data URL
   * with 9% opacity on a transparent canvas.
   * @returns {Promise<string|null>}
   */
  async loadWatermarkImage() {
    if (this._watermarkCache) return this._watermarkCache;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null;
    }

    try {
      const response = await fetch('/H3-logo.svg');
      if (!response.ok) {
        throw new Error(`Failed to fetch SVG: ${response.status}`);
      }
      let svgText = await response.text();
      // Remove solid white background box so watermark has a transparent background
      svgText = svgText.replace(/<path[^>]*d="M0 0 C495 0 990 0 1500 0[^"]*"[^>]*\/>/i, '');

      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      const dataUrl = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const size = 600;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.globalAlpha = 0.09; // 9% opacity transparent overlay
            ctx.drawImage(img, 0, 0, size, size);
            URL.revokeObjectURL(blobUrl);
            resolve(canvas.toDataURL('image/png'));
          } catch (e) {
            URL.revokeObjectURL(blobUrl);
            resolve(null);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(null);
        };
        img.src = blobUrl;
      });

      if (dataUrl) {
        this._watermarkCache = dataUrl;
        return dataUrl;
      }
    } catch (err) {
      console.warn('Could not load watermark via SVG fetch, falling back to direct Image load:', err);
    }

    // Direct fallback if fetch/blob failed
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const size = 600;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.globalAlpha = 0.09; // 9% opacity transparent overlay
            ctx.drawImage(img, 0, 0, size, size);
            const dataUrl = canvas.toDataURL('image/png');
            this._watermarkCache = dataUrl;
            resolve(dataUrl);
          } catch (e) {
            resolve(null);
          }
        };
        img.onerror = () => {
          console.warn('Direct watermark image load failed.');
          resolve(null);
        };
        img.src = '/H3-logo.svg';
      } catch (e) {
        resolve(null);
      }
    });
  },

  /**
   * Generates a jsPDF document instance from structured menu data.
   * Precise vertical coordinate system preventing overlaps, clipping, and dead white spaces.
   * @param {Object} menuData
   * @returns {Promise<jsPDF>}
   */
  async generatePdf(menuData) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const bottomSafeMargin = pageHeight - 16; // space for footer
    const topContentY = 28; // safe start Y on a new page (below 20mm header bar)

    // Load watermark asset for final overlay pass
    const watermarkDataUrl = await this.loadWatermarkImage();

    const clientName = menuData.clientName || 'Valued Client';
    const eventName = menuData.eventName || 'Wedding & Banquet Catering Menu';
    const dates = menuData.dates || 'Upcoming Event Dates';
    const city = menuData.city || 'India';
    const venue = menuData.venue || 'Luxury Banquet & Lawns';

    // Helper: Draw Header Bar
    const drawPageHeader = (title = 'H3 CATERING & HOSPITALITY — MASTER BANQUET MENU') => {
      doc.setFillColor(...NAVY);
      doc.rect(margin, 8, contentWidth, 11, 'F');

      doc.setFillColor(...GOLD);
      doc.rect(margin, 19, contentWidth, 1.2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('H3 CATERING & HOSPITALITY', margin + 5, 14.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(230, 235, 255);
      doc.text(title, pageWidth - margin - 5, 14.5, { align: 'right' });
    };

    // Helper: Draw Footer
    const drawPageFooter = (pageNum, totalPages) => {
      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED_SLATE);
      doc.text('H3 Catering & Hospitality | Luxury Banquets & Destination Weddings', margin, pageHeight - 6.5);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
    };

    // Track vertical position
    let currentY = topContentY;

    // Helper: Ensure page space, create new page if needed
    const ensureSpace = (requiredHeight, nextHeaderTitle = 'CATERING & BANQUET MENU') => {
      if (currentY + requiredHeight > bottomSafeMargin) {
        doc.addPage();
        drawPageHeader(nextHeaderTitle);
        currentY = topContentY;
        return true;
      }
      return false;
    };

    // ==========================================
    // COVER / EVENT OVERVIEW BLOCK
    // ==========================================
    drawPageHeader('MASTER EVENT ITINERARY & OVERVIEW');

    // Event summary box
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, contentWidth, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(eventName.toUpperCase(), margin + 5, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_SLATE);
    doc.text('Client: ', margin + 5, currentY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_SLATE);
    doc.text(clientName, margin + 17, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED_SLATE);
    doc.text('Dates: ', margin + 70, currentY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_SLATE);
    doc.text(dates, margin + 82, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED_SLATE);
    doc.text('Venue: ', margin + 5, currentY + 17.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_SLATE);
    doc.text(venue, margin + 17, currentY + 17.5);

    currentY += 26;

    // ==========================================
    // SECTION 1: SESSIONS SCHEDULE TABLE
    // ==========================================
    const sessions = menuData.sessions || [];
    if (sessions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...NAVY);
      doc.text('1. EVENT SESSIONS & SERVICE SCHEDULE', margin, currentY);
      currentY += 3.5;

      const sessionsTableRows = sessions.map((s, idx) => [
        s.date || `Day ${idx + 1}`,
        s.name || 'Session',
        s.timings || 'TBD',
        s.pax ? `${s.pax} Pax` : 'TBD',
        s.venue || venue,
        s.notes || '-'
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Date', 'Session Name', 'Timings', 'Pax', 'Venue / Gate Setup', 'Special Notes']],
        body: sessionsTableRows,
        theme: 'grid',
        headStyles: {
          fillColor: NAVY,
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          cellPadding: 2,
        },
        styles: {
          fontSize: 7.5,
          textColor: DARK_SLATE,
          cellPadding: 2,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' },
          1: { cellWidth: 36, fontStyle: 'bold' },
          2: { cellWidth: 26 },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 40 },
          5: { cellWidth: 'auto' },
        },
      });

      currentY = doc.lastAutoTable.finalY + 6;
    }

    // ==========================================
    // SECTION 2: STAFF MEAL COUNT TABLE
    // ==========================================
    const staffMeals = menuData.staffMeals || [];
    if (staffMeals.length > 0) {
      ensureSpace(32, 'STAFF MEALS & OPERATIONAL RULES');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...NAVY);
      doc.text('2. STAFF & CREW MEAL ALLOCATION', margin, currentY);
      currentY += 3.5;

      const staffRows = staffMeals.map(sm => [
        sm.date || 'Day',
        sm.breakfast || '0',
        sm.lunch || '0',
        sm.hiTea || '0',
        sm.dinner || '0',
        (Number(sm.breakfast || 0) + Number(sm.lunch || 0) + Number(sm.hiTea || 0) + Number(sm.dinner || 0)).toString(),
        sm.notes || '-'
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Date', 'Breakfast', 'Lunch', 'Hi-Tea', 'Dinner', 'Daily Total', 'Remarks']],
        body: staffRows,
        theme: 'grid',
        headStyles: {
          fillColor: [47, 79, 79],
          textColor: 255,
          fontSize: 7.5,
          fontStyle: 'bold',
          cellPadding: 1.8,
        },
        styles: {
          fontSize: 7.5,
          textColor: DARK_SLATE,
          cellPadding: 1.8,
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 28 },
          6: { halign: 'left', cellWidth: 'auto' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        }
      });

      currentY = doc.lastAutoTable.finalY + 6;
    }

    // ==========================================
    // SECTION 3: OPERATIONAL RULES
    // ==========================================
    const rules = menuData.rules && menuData.rules.length > 0
      ? menuData.rules
      : [
          'NO TENT | HOTEL | EVENT | OR ANY OTHER STAFF FOOD IS ALLOWED AT OUR PART',
          '10% OF GUEST INCREMENT CAN BE MANAGEABLE BY H3 CATERING',
          '125 KVA DG POWER BACKUP MANDATORY AT KITCHEN YARD'
        ];

    // Compute rule heights cleanly
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const parsedRules = rules.map((r) => {
      const splitLines = doc.splitTextToSize(r, contentWidth - 24);
      const height = (splitLines.length * 3.4) + 1.8;
      return { splitLines, height };
    });

    const totalRulesHeight = parsedRules.reduce((acc, curr) => acc + curr.height, 0) + 4;
    ensureSpace(totalRulesHeight + 10, 'OPERATIONAL GUIDELINES & RULES');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text('3. OPERATIONAL RULES & INFRASTRUCTURE MANDATES', margin, currentY);
    currentY += 3.5;

    // Draw background rectangle ONCE
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, currentY, contentWidth, totalRulesHeight, 1.5, 1.5, 'FD');

    let ruleRenderY = currentY + 4;
    parsedRules.forEach((item, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...GOLD);
      doc.text(`RULE #${idx + 1}:`, margin + 3.5, ruleRenderY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK_SLATE);
      doc.text(item.splitLines, margin + 20, ruleRenderY);
      ruleRenderY += item.height;
    });

    currentY += totalRulesHeight + 8;

    // ==========================================
    // CONTINUOUS SESSION MENUS
    // ==========================================
    let lastRenderedDate = null;
    sessions.forEach((session, sIdx) => {
      const sessionDate = session.date?.trim() || null;
      if (sessionDate && sessionDate !== lastRenderedDate) {
        lastRenderedDate = sessionDate;
        ensureSpace(45, `DAY ITINERARY: ${sessionDate.toUpperCase()}`);

        // Date-change divider banner
        doc.setFillColor(238, 242, 255); // Indigo-50 soft accent
        doc.setDrawColor(...NAVY);
        doc.setLineWidth(0.4);
        doc.roundedRect(margin, currentY, contentWidth, 7.5, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...NAVY);
        doc.text(`SCHEDULE FOR: ${sessionDate.toUpperCase()}`, margin + 4, currentY + 5);

        currentY += 10.5;
      }

      const categories = session.categories || [];
      const totalSessionDishes = categories.reduce(
        (acc, cat) => acc + (cat.items?.length || 0),
        0
      );

      // Require at least 42mm for session banner + first category
      ensureSpace(42, `SESSION MENU: ${session.name?.toUpperCase() || 'SESSION'}`);

      // Session Header Banner (height = 12mm)
      const bannerHeight = 12;
      doc.setFillColor(...NAVY);
      doc.roundedRect(margin, currentY, contentWidth, bannerHeight, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      const sessionTitle = `${session.date ? session.date + ' — ' : ''}${session.name || 'SESSION'}`.toUpperCase();
      doc.text(sessionTitle, margin + 5, currentY + 5);

      if (totalSessionDishes > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...GOLD);
        doc.text(`${totalSessionDishes} ITEMS`, pageWidth - margin - 5, currentY + 5, { align: 'right' });
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(220, 230, 255);
      const subInfo = `Timings: ${session.timings || 'TBD'}  |  Pax: ${session.pax ? session.pax + ' Pax' : 'TBD'}  |  Venue: ${session.venue || venue}`;
      doc.text(subInfo, margin + 5, currentY + 9.5);

      currentY += bannerHeight + 3; // Advance past banner with 3mm gap

      // Setup notes (if any)
      if (session.notes) {
        const notesBoxHeight = 6.5;
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, currentY, contentWidth, notesBoxHeight, 1, 1, 'F');

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED_SLATE);
        doc.text(`Special Setup Notes: ${session.notes}`, margin + 3.5, currentY + 4.5);

        currentY += notesBoxHeight + 3;
      }

      if (categories.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED_SLATE);
        doc.text('No items specified for this session.', margin + 4, currentY + 4);
        currentY += 8;
      } else {
        categories.forEach((cat) => {
          const isLive = cat.isLiveCounter || cat.name?.toUpperCase().includes('LIVE') || cat.name?.toUpperCase().includes('CHAAT');
          const items = cat.items || [];

          // Require at least 22mm for category header + 1 item
          ensureSpace(22, `SESSION MENU: ${session.name?.toUpperCase() || 'SESSION'}`);

          // Category Header Strip (height = 6.5mm)
          const catHeaderHeight = 6.5;

          if (isLive) {
            doc.setFillColor(254, 243, 199); // Amber-100
            doc.setDrawColor(...GOLD);
            doc.setLineWidth(0.35);
            doc.roundedRect(margin, currentY, contentWidth, catHeaderHeight, 1, 1, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...GOLD);
            doc.text(cat.name?.toUpperCase() || 'LIVE COUNTER', margin + 4, currentY + 4.6);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.text('[ LIVE CHEF STATION ]', pageWidth - margin - 4, currentY + 4.6, { align: 'right' });
          } else {
            doc.setFillColor(241, 245, 249); // Slate-100
            doc.setDrawColor(...BORDER_COLOR);
            doc.setLineWidth(0.25);
            doc.roundedRect(margin, currentY, contentWidth, catHeaderHeight, 1, 1, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...NAVY);
            doc.text(cat.name?.toUpperCase() || 'CATEGORY', margin + 4, currentY + 4.6);
          }

          // Advance past category header with a 4.5mm gap before the first item text baseline
          currentY += catHeaderHeight + 4.5;

          // Dishes in category
          items.forEach((item) => {
            const hasDesc = Boolean(item.description && item.description.trim());
            const splitDesc = hasDesc ? doc.splitTextToSize(item.description, contentWidth - 14) : [];
            const itemTotalHeight = 4.2 + (hasDesc ? (splitDesc.length * 3.2) + 2 : 2.2);

            // Ensure space for the full item
            if (currentY + itemTotalHeight > bottomSafeMargin) {
              doc.addPage();
              drawPageHeader(`SESSION MENU: ${session.name?.toUpperCase() || 'SESSION'} (CONT.)`);
              currentY = topContentY + 2;
            }

            // Bullet dot (placed visually at the center of the item title line)
            doc.setFillColor(...NAVY);
            doc.circle(margin + 3.5, currentY - 1.1, 0.65, 'F');

            // Item Name (Baseline at currentY)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.8);
            doc.setTextColor(...DARK_SLATE);
            doc.text(item.name || 'Dish Item', margin + 7, currentY);

            currentY += 4.2; // Advance past title line for clean line height

            // Description (if any)
            if (hasDesc) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(6.8);
              doc.setTextColor(...MUTED_SLATE);
              doc.text(splitDesc, margin + 7, currentY);
              currentY += (splitDesc.length * 3.0) + 2.2;
            } else {
              currentY += 1.8;
            }
          });

          currentY += 4; // Gap between categories
        });
      }

      currentY += 8; // Gap between sessions
    });

    // ==========================================
    // TERMS & CONDITIONS & SIGNATURES
    // ==========================================
    ensureSpace(40, 'STANDARD TERMS & CONDITIONS');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text('STANDARD BANQUET & CATERING TERMS', margin, currentY);
    currentY += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_SLATE);
    doc.text('Governed under Chhattisgarh Caterers Association standard regulations.', margin, currentY);
    currentY += 4.5;

    H3_TERMS_AND_CONDITIONS.forEach((term, idx) => {
      ensureSpace(11, 'STANDARD TERMS & CONDITIONS');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...NAVY);
      doc.text(`${idx + 1}.`, margin + 1.5, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...DARK_SLATE);
      const splitTerm = doc.splitTextToSize(term, contentWidth - 8);
      doc.text(splitTerm, margin + 6, currentY);
      currentY += (splitTerm.length * 3.2) + 1.2;
    });

    currentY += 3;

    // Payment Milestone Box
    ensureSpace(28, 'PAYMENT TERMS & ACCEPTANCE');

    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, contentWidth, 13, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...NAVY);
    doc.text('PAYMENT MILESTONE SCHEDULE', margin + 4, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...DARK_SLATE);
    doc.text('• 30% Advance at Booking Confirmation   |   • 50% 7 Days Prior to Event   |   • 20% On Final Event Conclusion', margin + 4, currentY + 9.5);

    currentY += 14;

    // ==========================================
    // ADD WATERMARKS & RUNNING FOOTERS (FINAL OVERLAY PASS)
    // ==========================================
    const totalPages = doc.getNumberOfPages();
    const wmSize = 105; // 105mm x 105mm centered
    const wmX = (pageWidth - wmSize) / 2;
    const wmY = (pageHeight - wmSize) / 2;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // 1. Draw watermark as transparent overlay ON TOP of tables, badges, and text
      if (watermarkDataUrl) {
        doc.addImage(watermarkDataUrl, 'PNG', wmX, wmY, wmSize, wmSize);
      }

      // 2. Draw page footer on top
      drawPageFooter(i, totalPages);
    }

    return doc;
  },

  /**
   * Downloads the generated PDF to user's computer.
   * @param {Object} menuData
   */
  async downloadPdf(menuData) {
    const doc = await this.generatePdf(menuData);
    const cleanName = (menuData.eventName || 'H3_Catering_Menu').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`${cleanName}_Menu.pdf`);
  },

  /**
   * Converts the generated PDF to a File object for uploading to Supabase Storage.
   * @param {Object} menuData
   * @returns {Promise<File>}
   */
  async getPdfFile(menuData) {
    const doc = await this.generatePdf(menuData);
    const cleanName = (menuData.eventName || 'H3_Catering_Menu').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanName}_Final_Menu.pdf`;
    const blob = doc.output('blob');
    return new File([blob], fileName, { type: 'application/pdf' });
  },

  /**
   * Returns a Data URL or Blob URL for in-browser PDF preview.
   * @param {Object} menuData
   * @returns {Promise<string>}
   */
  async getPdfBlobUrl(menuData) {
    const doc = await this.generatePdf(menuData);
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  }
};
