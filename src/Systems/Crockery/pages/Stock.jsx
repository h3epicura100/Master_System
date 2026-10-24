"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PlusCircle,
  Search,
  Loader2,
  Database,
  Trash2,
  Hash,
  X,
  ChevronDown,
  Eye,
  EyeOff,
  Calendar,
  UploadCloud,
  ArrowUpRight,
  CheckCircle2,
  ShoppingCart,
  Settings2,
  FileText,
  Edit3
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import Pagination from "../components/Pagination";
import SearchableSelect from "../components/SearchableSelect";
import { formatDate, parseRowDate, formatIndianAmount, normalizeForMatch } from "../utils/helpers";
import { supabase } from "../utils/supabaseClient";
import { uploadImage } from "../utils/supabaseStorage";
import { loadImageAsBase64, loadImagesBatched } from "../utils/imageBase64";
import { TABLES, COLUMNS, ENUMS, DROPDOWN_CATEGORY, withItemMaster } from "../utils/dbSchema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_SIZE = 50;

export default function Stock() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showFullTotal, setShowFullTotal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('purchase'); // 'purchase' or 'repurchase'

  // Data State — items = item_master (the catalog); stockRows/rePurchaseRows
  // = stock_transactions rows for that source, flattened with their joined
  // item_master fields for display.
  const [items, setItems] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [rePurchaseRows, setRePurchaseRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOptions, setDropdownOptions] = useState({
    inventoryTypeOptions: [],
    departmentOptions: [],
    unitOptions: []
  });

  const [selectedIds, setSelectedIds] = useState(new Set());

  // Table Filters State
  const [filterType, setFilterType] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    type: true,
    dept: true,
    item: true,
    vendor: true,
    balance: true,
    unit: true,
    image: true,
    perUnit: true,
    costPrice: true,
    remarks: true
  });

  const columnConfig = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'dept', label: 'Department' },
    { key: 'item', label: 'Item Name' },
    { key: 'vendor', label: 'Vendor Name' },
    { key: 'balance', label: 'Quantity' },
    { key: 'unit', label: 'Unit' },
    { key: 'perUnit', label: 'Per Unit (₹)' },
    { key: 'costPrice', label: 'Estimated Cost (₹)' },
    { key: 'image', label: 'Image' },
    { key: 'remarks', label: 'Remarks' }
  ];

  const [showPurchaseItemDropdown, setShowPurchaseItemDropdown] = useState(false);

  // Form State — Add Stock. Items are created exclusively in Master > Items;
  // this form only records a stock_transactions row for an EXISTING item,
  // selected via strict dropdowns (Inventory Type / Department / Unit are
  // admin-managed lists — see dropdown_options / Master > Dropdowns).
  const [form, setForm] = useState({
    itemId: '',
    inventoryType: '',
    department: '',
    itemsName: '',
    vendorName: '',
    openingBalance: '',
    perUnit: '',
    unit: '',
    remarks: '',
    imageUrl: ''
  });

  // Form State — Re-Purchase (existing item only; itemId identifies which
  // item_master row this stock_transactions row belongs to).
  const [purchaseForm, setPurchaseForm] = useState({
    itemId: '',
    inventoryType: '',
    department: '',
    itemsName: '',
    vendorName: '',
    openingBalance: '',
    perUnit: '',
    unit: '',
    remarks: '',
    imageUrl: ''
  });

  // Form State — Edit Stock / Re-Purchase
  const [editForm, setEditForm] = useState({
    itemId: '',
    inventoryType: '',
    department: '',
    itemsName: '',
    vendorName: '',
    openingBalance: '',
    perUnit: '',
    unit: '',
    remarks: '',
    imageUrl: '',
    date: ''
  });
  const [editSelectedImage, setEditSelectedImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  function getDisplayableImageUrl(url) {
    if (!url) return null;
    try {
      // Legacy Drive-hosted images (pre-Supabase-cutover) render better as a
      // thumbnail transform; Supabase Storage URLs are used as-is.
      const directMatch = url.match(/file\/d\/([a-zA-Z0-9\-_]+)/);
      if (directMatch && directMatch[1]) return `https://drive.google.com/thumbnail?id=${directMatch[1]}&sz=w200`;
      const ucMatch = url.match(/[?&]id=([a-zA-Z0-9\-_]+)/);
      if (ucMatch && ucMatch[1]) return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w200`;
      return url;
    } catch { return url; }
  }

  const toggleRowSelection = (row) => {
    const id = row.id;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (filteredRows) => {
    if (selectedIds.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map(r => r.id)));
    }
  };

  const handleOpenEditModal = (row) => {
    setEditingRecord(row);
    const formattedDate = row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '';
    setEditForm({
      itemId: row.item_id || '',
      inventoryType: row.inventory_type || '',
      department: row.department || '',
      itemsName: row.item_name || '',
      vendorName: row.vendor_name || '',
      openingBalance: row.qty ?? '',
      perUnit: row.per_unit ?? '',
      unit: row.unit || '',
      remarks: row.remarks || '',
      imageUrl: row.image_url || '',
      date: formattedDate
    });
    setEditSelectedImage(null);
    setEditImagePreview(row.image_url || null);
    setIsEditModalOpen(true);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected record(s)?`)) return;

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of selectedIds) {
        const { error } = await supabase.from(TABLES.STOCK_TRANSACTIONS).delete().eq(COLUMNS.STOCK_TRANSACTIONS.ID, id);
        if (error) failCount++; else successCount++;
      }

      if (successCount > 0) showToast(`Successfully deleted ${successCount} record(s)`);
      if (failCount > 0) showToast(`Failed to delete ${failCount} record(s)`, 'error');

      setSelectedIds(new Set());
      fetchStockData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchItems = async () => {
    let all = [];
    const pageSize = 1000;
    for (let page = 0; ; page++) {
      const { data, error } = await supabase
        .from(TABLES.ITEM_MASTER)
        .select('*')
        .order(COLUMNS.ITEM_MASTER.ITEM_NAME, { ascending: true })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error) { showToast(error.message, 'error'); break; }
      all = all.concat(data || []);
      if (!data || data.length < pageSize) break;
    }
    setItems(all);
  };

  // Strict, admin-managed dropdown lists (Master > Dropdowns) — Inventory
  // Type/Department/Unit are selected from here, not typed freely.
  const fetchDropdowns = async () => {
    const { data, error } = await supabase
      .from(TABLES.DROPDOWN_OPTIONS)
      .select('*')
      .order(COLUMNS.DROPDOWN_OPTIONS.VALUE, { ascending: true });
    if (error) { showToast(error.message, 'error'); return; }
    const rows = data || [];
    setDropdownOptions({
      inventoryTypeOptions: rows.filter(r => r.category === DROPDOWN_CATEGORY.INVENTORY_TYPE).map(r => r.value),
      departmentOptions: rows.filter(r => r.category === DROPDOWN_CATEGORY.DEPARTMENT).map(r => r.value),
      unitOptions: rows.filter(r => r.category === DROPDOWN_CATEGORY.UNIT).map(r => r.value)
    });
  };

  const [purchasePage, setPurchasePage] = useState(1);
  const [repurchasePage, setRepurchasePage] = useState(1);

  const fetchStockData = async () => {
    setIsTableLoading(true);
    try {
      let all = [];
      const pageSize = 1000;
      for (let page = 0; ; page++) {
        const { data, error } = await supabase
          .from(TABLES.STOCK_TRANSACTIONS)
          .select(`*, ${withItemMaster('item_name, inventory_type, department')}`)
          .order(COLUMNS.STOCK_TRANSACTIONS.CREATED_AT, { ascending: false })
          .range(page * pageSize, page * pageSize + pageSize - 1);
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < pageSize) break;
      }

      const formatted = (all || []).map(row => ({
        id: row.id,
        serial_no: row.serial_no,
        created_at: row.created_at,
        item_id: row.item_id,
        inventory_type: row.item_master?.inventory_type,
        department: row.item_master?.department,
        item_name: row.item_master?.item_name,
        vendor_name: row.vendor_name,
        qty: row.qty,
        unit: row.unit,
        per_unit: row.per_unit,
        total_cost: row.total_cost,
        image_url: row.image_url,
        remarks: row.remarks,
        source: row.source
      }));

      setStockRows(formatted.filter(r => r.source === ENUMS.STOCK_SOURCE.ADD_STOCK));
      setRePurchaseRows(formatted.filter(r => r.source === ENUMS.STOCK_SOURCE.RE_PURCHASE));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchDropdowns();
    fetchStockData();
  }, []);

  useEffect(() => {
    setPurchasePage(1);
    setRepurchasePage(1);
  }, [filterType, filterDept, filterItem, startDate, endDate, searchTerm, activeTab]);

  const historyToDisplay = useMemo(() => {
    return activeTab === 'purchase' ? stockRows : rePurchaseRows;
  }, [activeTab, stockRows, rePurchaseRows]);

  const typeOptions = useMemo(() => {
    const s = normalizeForMatch(searchTerm);
    const filtered = historyToDisplay.filter(i => {
      const matchesSearch = !s || (
        normalizeForMatch(i.item_name).includes(s) ||
        normalizeForMatch(i.vendor_name).includes(s) ||
        normalizeForMatch(i.serial_no).includes(s) ||
        normalizeForMatch(i.inventory_type).includes(s) ||
        normalizeForMatch(i.department).includes(s)
      );
      const matchesDept = !filterDept || i.department === filterDept;
      const matchesItem = !filterItem || i.item_name === filterItem;
      return matchesSearch && matchesDept && matchesItem;
    });
    return [...new Set(filtered.map(i => i.inventory_type).filter(Boolean))].sort();
  }, [historyToDisplay, searchTerm, filterDept, filterItem]);

  const deptOptions = useMemo(() => {
    const s = normalizeForMatch(searchTerm);
    const filtered = historyToDisplay.filter(i => {
      const matchesSearch = !s || (
        normalizeForMatch(i.item_name).includes(s) ||
        normalizeForMatch(i.vendor_name).includes(s) ||
        normalizeForMatch(i.serial_no).includes(s) ||
        normalizeForMatch(i.inventory_type).includes(s) ||
        normalizeForMatch(i.department).includes(s)
      );
      const matchesType = !filterType || i.inventory_type === filterType;
      const matchesItem = !filterItem || i.item_name === filterItem;
      return matchesSearch && matchesType && matchesItem;
    });
    return [...new Set(filtered.map(i => i.department).filter(Boolean))].sort();
  }, [historyToDisplay, searchTerm, filterType, filterItem]);

  const itemOptions = useMemo(() => {
    const s = normalizeForMatch(searchTerm);
    const filtered = historyToDisplay.filter(i => {
      const matchesSearch = !s || (
        normalizeForMatch(i.item_name).includes(s) ||
        normalizeForMatch(i.vendor_name).includes(s) ||
        normalizeForMatch(i.serial_no).includes(s) ||
        normalizeForMatch(i.inventory_type).includes(s) ||
        normalizeForMatch(i.department).includes(s)
      );
      const matchesType = !filterType || i.inventory_type === filterType;
      const matchesDept = !filterDept || i.department === filterDept;
      return matchesSearch && matchesType && matchesDept;
    });
    return [...new Set(filtered.map(i => i.item_name).filter(Boolean))].sort();
  }, [historyToDisplay, searchTerm, filterType, filterDept]);

  const filteredStockRows = useMemo(() => {
    const s = normalizeForMatch(searchTerm);
    return historyToDisplay.filter(row => {
      const matchesSearch = !s || (
        normalizeForMatch(row.item_name).includes(s) ||
        normalizeForMatch(row.vendor_name).includes(s) ||
        normalizeForMatch(row.serial_no).includes(s) ||
        normalizeForMatch(row.inventory_type).includes(s) ||
        normalizeForMatch(row.department).includes(s)
      );
      const matchesType = !filterType || row.inventory_type === filterType;
      const matchesDept = !filterDept || row.department === filterDept;
      const matchesItem = !filterItem || row.item_name === filterItem;

      let matchesDate = true;
      if (startDate || endDate) {
        const rowDate = parseRowDate(row.created_at);
        if (rowDate && !isNaN(rowDate)) {
          if (startDate && rowDate < new Date(startDate)) matchesDate = false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (rowDate > end) matchesDate = false;
          }
        }
      }
      return matchesSearch && matchesType && matchesDept && matchesItem && matchesDate;
    });
  }, [historyToDisplay, searchTerm, filterType, filterDept, filterItem, startDate, endDate]);

  const paginatedStockRows = useMemo(() => {
    const currentPage = activeTab === 'purchase' ? purchasePage : repurchasePage;
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredStockRows.slice(start, start + PAGE_SIZE);
  }, [filteredStockRows, activeTab, purchasePage, repurchasePage]);

  const totalStockCost = useMemo(() => {
    return filteredStockRows.reduce((acc, row) => {
      const c = row.total_cost ?? ((parseFloat(row.qty) || 0) * (parseFloat(row.per_unit) || 0));
      const val = parseFloat(c || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [filteredStockRows]);

  const [isReportGenerating, setIsReportGenerating] = useState(false);

  const handleDownloadReport = async () => {
    setIsReportGenerating(true);

    try {
      const allExportRows = filteredStockRows;

      if (allExportRows.length === 0) {
        showToast('No records to export', 'info');
        setIsReportGenerating(false);
        return;
      }

      const isPurchase = activeTab === 'purchase';
      const titlePrefix = isPurchase ? 'PURCHASE' : 'RE-PURCHASE';

      const getItemImage = (row) => {
        if (row.image_url && row.image_url !== 'No Image') return row.image_url;
        const match = items.find(i => i.id === row.item_id || i.item_name === row.item_name);
        return match?.image_url && match.image_url !== 'No Image' ? match.image_url : null;
      };

      let imageMap = {};
      if (visibleColumns.image) {
        const rawUrls = allExportRows.map(row => getItemImage(row)).filter(Boolean);
        const displayUrls = rawUrls.map(u => getDisplayableImageUrl(u));
        imageMap = await loadImagesBatched(displayUrls, 12);
      }

      // Proportional column weights calibrated for A4 Portrait (198mm usable width)
      const colWeights = {
        sNo: 0.85,
        date: 1.35,
        type: 1.35,
        dept: 1.65,
        item: 3.5,
        vendor: 2.65,
        balance: 1.2,
        unit: 0.85,
        perUnit: 1.45,
        costPrice: 1.75,
        image: 0.8,
        remarks: 1.1
      };

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageMargin = 6;
      const availableWidth = pageWidth - (pageMargin * 2);

      // Group rows by Inventory Type (e.g. Grocery, Crockery, Disposal, etc.)
      const typeGroups = {};
      allExportRows.forEach(row => {
        const typeKey = String(row.inventory_type || 'Other').trim();
        if (!typeGroups[typeKey]) typeGroups[typeKey] = [];
        typeGroups[typeKey].push(row);
      });

      const distinctTypes = Object.keys(typeGroups);

      for (let tIdx = 0; tIdx < distinctTypes.length; tIdx++) {
        const currentType = distinctTypes[tIdx];
        const typeRows = typeGroups[currentType];

        // Check if visibleColumns.image is enabled AND at least one row in this specific type has an image
        const hasImageInType = visibleColumns.image && typeRows.some(row => Boolean(getItemImage(row)));

        // Column selection: suppress redundant 'type' column, and suppress 'image' column if no rows in this type have an image
        const columnsToInclude = columnConfig.filter(col => {
          if (visibleColumns[col.key] === false) return false;
          if (col.key === 'type') return false;
          if (col.key === 'image' && !hasImageInType) return false;
          return true;
        });

        const typeReportColumns = [
          { header: 'S. No.', dataKey: 'sNo' },
          ...columnsToInclude.map(col => ({
            header: col.key === 'perUnit' ? 'Per Unit Price' : col.key === 'costPrice' ? 'Estimated Cost' : col.label,
            dataKey: col.key
          }))
        ];

        const hasImage = typeReportColumns.some(c => c.dataKey === 'image');
        const imageCellWidth = 11.0;
        const nonImageWidth = hasImage ? availableWidth - imageCellWidth : availableWidth;
        const nonImageTotalWeight = typeReportColumns
          .filter(c => c.dataKey !== 'image')
          .reduce((sum, col) => sum + (colWeights[col.dataKey] || 1.0), 0);

        const typeColStyles = {};
        typeReportColumns.forEach(col => {
          if (col.dataKey === 'image') {
            typeColStyles[col.dataKey] = {
              cellWidth: imageCellWidth,
              halign: 'center'
            };
          } else {
            const weight = colWeights[col.dataKey] || 1.0;
            typeColStyles[col.dataKey] = {
              cellWidth: (nonImageWidth / nonImageTotalWeight) * weight,
              halign: ['item', 'vendor', 'dept', 'remarks'].includes(col.dataKey)
                ? 'left'
                : ['balance', 'perUnit', 'costPrice'].includes(col.dataKey)
                ? 'right'
                : 'center'
            };
          }
        });

        const typeImageUrlMap = {};
        const body = typeRows.map((row, index) => {
          const rowData = { sNo: index + 1 };
          columnsToInclude.forEach(col => {
            if (col.key === 'image') {
              typeImageUrlMap[index] = getItemImage(row) || '';
              rowData[col.key] = '';
            } else if (col.key === 'date') {
              rowData[col.key] = formatDate(row.created_at);
            } else if (col.key === 'perUnit') {
              rowData[col.key] = Number(row.per_unit) > 0 ? `Rs ${parseFloat(row.per_unit).toFixed(2)}` : '-';
            } else if (col.key === 'costPrice') {
              const cPrice = row.total_cost ?? ((parseFloat(row.qty) || 0) * (parseFloat(row.per_unit) || 0));
              rowData[col.key] = `Rs ${parseFloat(cPrice || 0).toFixed(2)}`;
            } else if (col.key === 'balance') {
              rowData[col.key] = row.qty != null ? String(row.qty) : '0';
            } else if (col.key === 'unit') {
              rowData[col.key] = row.unit || '-';
            } else if (col.key === 'dept') {
              rowData[col.key] = row.department || '-';
            } else if (col.key === 'item') {
              rowData[col.key] = row.item_name || '-';
            } else if (col.key === 'vendor') {
              rowData[col.key] = row.vendor_name || '-';
            } else if (col.key === 'remarks') {
              rowData[col.key] = row.remarks || '-';
            } else {
              rowData[col.key] = row[col.key] || '-';
            }
          });
          return rowData;
        });

        const typeCostSum = typeRows.reduce((sum, row) => {
          const c = row.total_cost ?? ((parseFloat(row.qty) || 0) * (parseFloat(row.per_unit) || 0));
          return sum + (parseFloat(c) || 0);
        }, 0);
        const typeQtySum = typeRows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);
        const allSameUnit = typeRows.every(r => r.unit === typeRows[0]?.unit);
        const commonUnit = typeRows[0]?.unit || '';

        const footRow = {};
        typeReportColumns.forEach(col => {
          if (col.dataKey === 'sNo') {
            footRow[col.dataKey] = 'Total';
          } else if (col.dataKey === 'costPrice') {
            footRow[col.dataKey] = `Rs ${typeCostSum.toFixed(2)}`;
          } else if (col.dataKey === 'balance') {
            footRow[col.dataKey] = String(Math.round(typeQtySum * 100) / 100);
          } else if (col.dataKey === 'unit' && allSameUnit) {
            footRow[col.dataKey] = commonUnit;
          } else {
            footRow[col.dataKey] = '';
          }
        });

        // Determine Y position for header and table
        let headerTopY;
        let isNewPageForType = false;
        if (tIdx === 0) {
          headerTopY = 9;
          isNewPageForType = true;
        } else {
          const lastBottomY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 0;
          const remainingSpace = doc.internal.pageSize.height - 18 - lastBottomY;
          if (remainingSpace < 35) {
            doc.addPage();
            headerTopY = 9;
            isNewPageForType = true;
          } else {
            headerTopY = lastBottomY + 7;
            isNewPageForType = false;
          }
        }

        const title = `${titlePrefix} HISTORY REPORT - ${currentType}`;
        const countText = `(${body.length})`;

        doc.setFontSize(13);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(title, pageMargin, headerTopY);

        const titleWidth = doc.getTextWidth(title);
        doc.setFontSize(8.5);
        doc.setTextColor(150, 150, 150);
        doc.setFont(undefined, 'normal');
        doc.text(countText, pageMargin + titleWidth + 2, headerTopY);

        if (isNewPageForType) {
          doc.setFontSize(6.5);
          doc.setTextColor(100, 100, 100);
          doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - pageMargin, headerTopY, { align: 'right' });
        }

        // Subheader metadata line
        doc.setFontSize(7.5);
        doc.setTextColor(60, 60, 60);
        doc.setFont(undefined, 'bold');

        const totalCostStr = `Total Cost: Rs ${typeCostSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const dateRangeStr = (startDate || endDate) ? `Date Range: ${startDate || '...'} to ${endDate || '...'}` : 'Date Range: All Time';
        const filterDetails = [
          filterDept && `Dept: ${filterDept}`,
          filterItem && `Item: ${filterItem}`,
          searchTerm && `Search: "${searchTerm}"`
        ].filter(Boolean).join('    ');

        const metaLine = [totalCostStr, dateRangeStr, filterDetails].filter(Boolean).join('    |    ');
        doc.text(metaLine, pageMargin, headerTopY + 5.5);

        // Yield slightly so UI updates
        await new Promise(r => setTimeout(r, 20));

        autoTable(doc, {
          startY: headerTopY + 8.5,
          columns: typeReportColumns,
          body: body,
          foot: [footRow],
          showFoot: 'lastPage',
          theme: 'grid',
          columnStyles: typeColStyles,
          headStyles: {
            fillColor: [109, 40, 217],
            textColor: 255,
            fontSize: 7.2,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: { top: 1.8, bottom: 1.8, left: 0.5, right: 0.5 },
            overflow: 'linebreak'
          },
          footStyles: {
            fillColor: [237, 233, 254],
            textColor: [88, 28, 135],
            fontSize: 7.2,
            fontStyle: 'bold',
            valign: 'middle',
            cellPadding: { top: 1.6, bottom: 1.6, left: 0.6, right: 0.6 }
          },
          styles: {
            fontSize: 7.2,
            cellPadding: { top: 1.0, bottom: 1.0, left: 0.8, right: 0.8 },
            valign: 'middle',
            overflow: 'linebreak',
            minCellHeight: 5.5
          },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          rowPageBreak: 'avoid',
          margin: { top: 12, right: pageMargin, bottom: 14, left: pageMargin },
          didParseCell: (data) => {
            if (data.section === 'foot') {
              if (['balance', 'perUnit', 'costPrice'].includes(data.column.dataKey)) {
                data.cell.styles.halign = 'right';
              } else if (data.column.dataKey === 'sNo') {
                data.cell.styles.halign = 'center';
              }
            }
          },
          willDrawCell: (data) => {
            if (data.column.dataKey === 'image' && data.cell.section === 'body') data.cell.text = [];
          },
          didDrawCell: (data) => {
            if (data.column.dataKey === 'image' && data.cell.section === 'body') {
              const url = typeImageUrlMap[data.row.index];
              if (!url) return;
              const dispUrl = getDisplayableImageUrl(url);
              const b64 = imageMap[dispUrl] || imageMap[url];
              if (b64) {
                const padding = 0.8;
                const imgSize = Math.min(data.cell.width - padding * 2, data.cell.height - padding * 2, 5.2);
                const x = data.cell.x + (data.cell.width - imgSize) / 2;
                const y = data.cell.y + (data.cell.height - imgSize) / 2;
                try {
                  doc.addImage(b64, 'JPEG', x, y, imgSize, imgSize);
                } catch {
                  try { doc.addImage(b64, x, y, imgSize, imgSize); } catch {}
                }
              }
            }
          }
        });
      }

      // Draw page footer numbers cleanly across all generated pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7.5);
        doc.setTextColor(120);
        doc.text(
          `Page ${p} of ${totalPages}`,
          doc.internal.pageSize.width - pageMargin,
          doc.internal.pageSize.height - 5,
          { align: 'right' }
        );
      }

      if (typeof doc.putTotalPages === 'function') doc.putTotalPages('{total_pages_count_string}');

      let filterSuffix = '';
      if (filterType) filterSuffix += `_${filterType.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (filterDept) filterSuffix += `_${filterDept.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (filterItem) filterSuffix += `_${filterItem.replace(/[^a-zA-Z0-9]/g, '_')}`;

      doc.save(`${isPurchase ? 'Purchase' : 'Re-Purchase'}_History${filterSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Report generated successfully');
    } catch (err) {
      console.error("Stock PDF Generation Error:", err);
      showToast('Failed to generate report', 'error');
    } finally {
      setIsReportGenerating(false);
    }
  };

  // Items eligible for the Add Stock item picker: existing catalog items
  // matching whichever Inventory Type / Department filters are selected.
  const addStockItemOptions = useMemo(() => {
    return items.filter(i =>
      (!form.inventoryType || i.inventory_type === form.inventoryType) &&
      (!form.department || i.department === form.department)
    );
  }, [items, form.inventoryType, form.department]);

  // Department is a global, independent admin-managed list (Master >
  // Dropdowns) — most departments only ever get used with ONE inventory
  // type in practice (e.g. "Arcylic" only exists under Disposal, not
  // Crockery). Scoping the dropdown to departments that actually have items
  // under the chosen type avoids picking a combination with zero matches.
  const addStockDepartmentOptions = useMemo(() => {
    if (!form.inventoryType) return dropdownOptions.departmentOptions;
    const scoped = [...new Set(items.filter(i => i.inventory_type === form.inventoryType).map(i => i.department).filter(Boolean))];
    return scoped.length > 0 ? scoped.sort() : dropdownOptions.departmentOptions;
  }, [items, form.inventoryType, dropdownOptions.departmentOptions]);

  const editDepartmentOptions = useMemo(() => {
    if (!editForm.inventoryType) return dropdownOptions.departmentOptions;
    const scoped = [...new Set(items.filter(i => i.inventory_type === editForm.inventoryType).map(i => i.department).filter(Boolean))];
    return scoped.length > 0 ? scoped.sort() : dropdownOptions.departmentOptions;
  }, [items, editForm.inventoryType, dropdownOptions.departmentOptions]);

  const editItemOptions = useMemo(() => {
    return items.filter(i =>
      (!editForm.inventoryType || i.inventory_type === editForm.inventoryType) &&
      (!editForm.department || i.department === editForm.department)
    );
  }, [items, editForm.inventoryType, editForm.department]);

  const handleSelectEditItem = (item) => {
    setEditForm(prev => ({
      ...prev,
      itemId: item.id,
      itemsName: item.item_name,
      inventoryType: item.inventory_type || prev.inventoryType,
      department: item.department || prev.department,
      unit: item.unit || prev.unit,
      perUnit: item.damage_price != null ? String(item.damage_price) : prev.perUnit,
      imageUrl: item.image_url || prev.imageUrl
    }));
    if (item.image_url && !editSelectedImage) {
      setEditImagePreview(item.image_url);
    }
  };

  const handleEditSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!editForm.itemId) {
      showToast('Select an item first.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const finalImageUrl = editSelectedImage ? await uploadImage(editSelectedImage) : (editForm.imageUrl || null);

      const payload = {
        item_id: editForm.itemId,
        vendor_name: editForm.vendorName?.trim() || null,
        qty: parseFloat(editForm.openingBalance) || 0,
        unit: editForm.unit?.trim() || null,
        per_unit: parseFloat(editForm.perUnit) || 0,
        remarks: editForm.remarks?.trim() || null,
        image_url: finalImageUrl
      };

      if (editForm.date) {
        const origDate = editingRecord.created_at ? new Date(editingRecord.created_at) : new Date();
        const [year, month, day] = editForm.date.split('-').map(Number);
        origDate.setFullYear(year, month - 1, day);
        payload.created_at = origDate.toISOString();
      }

      const { error: updateError } = await supabase
        .from(TABLES.STOCK_TRANSACTIONS)
        .update(payload)
        .eq(COLUMNS.STOCK_TRANSACTIONS.ID, editingRecord.id);

      if (updateError) throw updateError;

      // Sync unit, price & photo back to item_master as single source of truth
      await supabase.from(TABLES.ITEM_MASTER)
        .update({
          unit: editForm.unit?.trim() || null,
          damage_price: parseFloat(editForm.perUnit) || 0,
          image_url: finalImageUrl || undefined
        })
        .eq(COLUMNS.ITEM_MASTER.ID, editForm.itemId);

      showToast('Stock record updated successfully');
      setIsEditModalOpen(false);
      setEditingRecord(null);
      fetchStockData();
      fetchItems();
    } catch (err) {
      showToast(err.message || 'Failed to update record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSelectAddStockItem = (item) => {
    setForm(prev => ({
      ...prev,
      itemId: item.id,
      itemsName: item.item_name,
      unit: item.unit || prev.unit,
      // damage_price doubles as the "last known per-unit purchase cost"
      // default suggestion — same business rule Re-Purchase already uses.
      perUnit: item.damage_price != null ? String(item.damage_price) : prev.perUnit,
      // Default to the item's existing photo — only a genuinely new upload
      // (below) replaces it, avoiding a duplicate copy of the same image.
      imageUrl: item.image_url || ''
    }));
    setImagePreview(item.image_url ? getDisplayableImageUrl(item.image_url) : null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.itemId) {
      showToast('Select an item first.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const imageUrl = selectedImage ? await uploadImage(selectedImage) : (form.imageUrl || null);

      const { error: txnError } = await supabase.from(TABLES.STOCK_TRANSACTIONS).insert({
        source: ENUMS.STOCK_SOURCE.ADD_STOCK,
        item_id: form.itemId,
        vendor_name: form.vendorName.trim() || null,
        qty: parseFloat(form.openingBalance) || 0,
        unit: form.unit.trim() || null,
        per_unit: parseFloat(form.perUnit) || 0,
        image_url: imageUrl,
        remarks: form.remarks.trim() || null
      });
      if (txnError) throw new Error(txnError.message);

      // item_master is the single source of truth for this item's current
      // unit/price/photo — sync all three back so the NEXT Add Stock/
      // Re-Purchase fetch sees this transaction's values as the new
      // defaults, and so stock_transactions.image_url always matches
      // item_master.image_url exactly (never a second, divergent copy).
      await supabase.from(TABLES.ITEM_MASTER)
        .update({
          unit: form.unit.trim() || null,
          damage_price: parseFloat(form.perUnit) || 0,
          image_url: imageUrl
        })
        .eq(COLUMNS.ITEM_MASTER.ID, form.itemId);

      showToast('Stock registered successfully');
      setForm({ itemId: '', inventoryType: '', department: '', itemsName: '', vendorName: '', openingBalance: '', perUnit: '', unit: '', remarks: '', imageUrl: '' });
      setImagePreview(null);
      setSelectedImage(null);
      setIsModalOpen(false);
    } catch (err) {
      showToast(err?.message || 'Failed to save record', 'error');
    } finally {
      fetchItems();
      fetchStockData();
      setIsSubmitting(false);
    }
  };

  const handlePurchaseSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!purchaseForm.itemId) {
      showToast('Select an item first.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const finalImageUrl = selectedImage ? await uploadImage(selectedImage) : (purchaseForm.imageUrl || null);

      const { error: txnError } = await supabase.from(TABLES.STOCK_TRANSACTIONS).insert({
        source: ENUMS.STOCK_SOURCE.RE_PURCHASE,
        item_id: purchaseForm.itemId,
        vendor_name: purchaseForm.vendorName.trim() || null,
        qty: parseFloat(purchaseForm.openingBalance) || 0,
        unit: purchaseForm.unit.trim() || null,
        per_unit: parseFloat(purchaseForm.perUnit) || 0,
        image_url: finalImageUrl,
        remarks: purchaseForm.remarks.trim() || null
      });
      if (txnError) throw new Error(txnError.message);

      // item_master stays the single source of truth — sync unit/price/photo
      // back so the next Add Stock/Re-Purchase fetch sees these as current,
      // and stock_transactions.image_url always matches item_master exactly.
      await supabase.from(TABLES.ITEM_MASTER)
        .update({
          unit: purchaseForm.unit.trim() || null,
          damage_price: parseFloat(purchaseForm.perUnit) || 0,
          image_url: finalImageUrl
        })
        .eq(COLUMNS.ITEM_MASTER.ID, purchaseForm.itemId);

      showToast('Re-Purchase recorded successfully');
      setPurchaseForm({ itemId: '', inventoryType: '', department: '', itemsName: '', vendorName: '', openingBalance: '', perUnit: '', unit: '', remarks: '', imageUrl: '' });
      setImagePreview(null);
      setSelectedImage(null);
      setIsPurchaseModalOpen(false);
    } catch (err) {
      showToast(err?.message || 'Failed to record purchase', 'error');
    } finally {
      fetchItems();
      fetchStockData();
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full flex flex-col space-y-4">

        {/* Toast */}
        {toast.show && (
          <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-3xl shadow-2xl transition-all duration-300 transform animate-in slide-in-from-right-8 z-[100] ${toast.type === "success"
            ? "bg-violet-600 text-white shadow-violet-200"
            : "bg-red-600 text-white shadow-red-200"
            }`}>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
            </div>
          </div>
        )}

        {/* ── Page-level top bar ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Stock Management</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isSubmitting}
                className="h-10 px-4 sm:px-6 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-bold transition-all shadow-lg animate-in fade-in zoom-in-95 bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100/50 active:scale-95 disabled:opacity-55"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete ({selectedIds.size})
              </button>
            )}
            <div
              onClick={() => setShowFullTotal(!showFullTotal)}
              className="flex items-center h-10 px-3 sm:px-4 bg-emerald-600 text-white rounded-lg shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 cursor-pointer hover:bg-emerald-700 transition-all select-none"
              title={showFullTotal ? "Click to see short format" : "Click to see exact amount"}
            >
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mr-2 sm:mr-3">{activeTab === 'purchase' ? 'Purchase Total:' : 'Re-Purchase Total:'}</span>
              <span className="text-xs sm:text-sm font-bold text-white">
                ₹{showFullTotal
                   ? totalStockCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                   : formatIndianAmount(totalStockCost)
                 }
              </span>
            </div>
            <button
              onClick={() => { setIsModalOpen(true); setImagePreview(null); setSelectedImage(null); }}
              className="h-10 px-3.5 sm:px-5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-lg flex items-center gap-2 text-xs sm:text-sm font-semibold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-violet-100"
            >
              <PlusCircle className="h-4 w-4" />
              Add Stock
            </button>
            <button
              onClick={() => { setIsPurchaseModalOpen(true); setImagePreview(null); setSelectedImage(null); }}
              className="h-10 px-3.5 sm:px-5 bg-white border border-violet-200 text-violet-600 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-semibold hover:bg-violet-50 transition-all active:scale-95 shadow-sm"
            >
              <ShoppingCart className="h-4 w-4 text-violet-400" />
              Re-Purchase
            </button>
            <button
              onClick={handleDownloadReport}
              disabled={isReportGenerating || filteredStockRows.length === 0}
              className="h-10 px-3.5 sm:px-5 bg-violet-600 text-white rounded-lg flex items-center gap-2 text-xs sm:text-sm font-semibold hover:bg-violet-700 transition-all active:scale-95 shadow-md shadow-violet-200 disabled:opacity-50"
            >
              {isReportGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              <span>Download Report</span>
            </button>
          </div>
        </div>

        {/* ── White card wrapping title + filters + table ── */}
        <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col flex-1 min-h-0 relative">

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-3.5 border-b border-slate-100/80 rounded-t-2xl">
            <div className="inline-flex p-1 bg-slate-100/80 rounded-xl self-start lg:self-auto">
              <button
                onClick={() => setActiveTab('purchase')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'purchase' ? 'bg-white text-violet-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Purchase History
              </button>
              <button
                onClick={() => setActiveTab('repurchase')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'repurchase' ? 'bg-white text-violet-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Re-Purchase History
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="relative group w-full sm:w-48">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search items..."
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:bg-white w-full transition-all"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-100 max-w-full">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-8 pl-2 pr-6 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 appearance-none cursor-pointer hover:border-violet-300 transition-all max-w-[95px] truncate"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '12px' }}
                  >
                    <option value="">All Types</option>
                    {typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>

                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="h-8 pl-2 pr-6 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 appearance-none cursor-pointer hover:border-violet-300 transition-all max-w-[105px] truncate"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '12px' }}
                  >
                    <option value="">All Depts</option>
                    {deptOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>

                  <select
                    value={filterItem}
                    onChange={(e) => setFilterItem(e.target.value)}
                    className="h-8 pl-2 pr-6 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 appearance-none cursor-pointer hover:border-violet-300 transition-all max-w-[95px] truncate"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '12px' }}
                  >
                    <option value="">All Items</option>
                    {itemOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>

                  <div className="relative border-l border-slate-200 ml-0.5 pl-1">
                    <button
                      onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                      className={`h-8 px-2.5 sm:px-3 rounded-xl border border-slate-100 flex items-center gap-1.5 text-[10px] font-bold tracking-wider transition-all ${isDateMenuOpen || startDate || endDate ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' : 'bg-slate-50 text-slate-600 hover:bg-white'}`}
                    >
                      <Calendar className={`h-3 w-3 ${isDateMenuOpen || startDate || endDate ? 'text-white' : 'text-slate-400'}`} />
                      <span>{startDate || endDate ? `${startDate || '...'} - ${endDate || '...'}` : 'DATE'}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isDateMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDateMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[90]"
                          onClick={() => setIsDateMenuOpen(false)}
                        />
                        <div className="absolute top-10 right-0 z-[100] w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Date Range</p>
                            {(startDate || endDate) && (
                              <button
                                onClick={() => { setStartDate(""); setEndDate(""); }}
                                className="text-[9px] font-bold text-red-500 hover:text-red-600 uppercase tracking-tighter"
                              >
                                Clear Dates
                              </button>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">From</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                <input
                                  type="date"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">To</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                <input
                                  type="date"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                  className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setIsDateMenuOpen(false)}
                            className="w-full mt-4 py-2 bg-violet-600 text-white text-[10px] font-bold rounded-xl shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all uppercase tracking-widest"
                          >
                            Apply Filter
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {(startDate || endDate || filterType || filterDept || filterItem) && (
                    <button
                      onClick={() => {
                        setFilterType(""); setFilterDept(""); setFilterItem(""); setStartDate(""); setEndDate("");
                      }}
                      className="p-1 ml-1 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition-colors border-l border-slate-100 pl-2"
                      title="Clear All Filters"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                  className={`h-8 px-3 rounded-xl border border-slate-100 flex items-center gap-2 text-[10px] font-bold tracking-wider transition-all ${isColMenuOpen ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' : 'bg-slate-50 text-slate-600 hover:bg-white'}`}
                >
                  <Settings2 className={`h-3 w-3 ${isColMenuOpen ? 'text-white' : 'text-slate-400'}`} />
                  <span>COLUMNS</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isColMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isColMenuOpen && (
                  <div className="absolute top-12 right-0 z-[100] w-52 bg-white border border-slate-100 rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visibility</p>
                      <button onClick={() => setIsColMenuOpen(false)} className="text-slate-300 hover:text-slate-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-violet-100">
                      {columnConfig.map(col => (
                        <button
                          key={col.key}
                          onClick={() => toggleColumn(col.key)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all text-xs font-semibold ${visibleColumns[col.key] ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          <span>{col.label}</span>
                          {visibleColumns[col.key] ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[65vh] overflow-x-auto overflow-y-auto relative custom-scrollbar">
            <table className="w-full text-center border-collapse border-separate border-spacing-0 min-w-[650px]">
              <thead className="sticky top-0 z-20 bg-violet-50">
                <tr className="bg-violet-50">
                  <th className="px-3 py-4 w-14 text-center bg-violet-50 border-b border-violet-100 text-[10px] font-bold text-violet-600 uppercase tracking-[0.15em]">
                    Action
                  </th>
                  <th className="px-4 py-4 w-12 text-center bg-violet-50 border-b border-violet-100">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      checked={filteredStockRows.length > 0 && selectedIds.size === filteredStockRows.length}
                      onChange={() => handleSelectAll(filteredStockRows)}
                    />
                  </th>
                  {columnConfig.map(col => visibleColumns[col.key] && (
                    <th key={col.key} className="px-6 py-4 text-[10px] font-bold text-violet-600 whitespace-nowrap uppercase tracking-[0.15em] text-center bg-violet-50 border-b border-violet-100">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isTableLoading ? (
                  <tr>
                    <td colSpan={columnConfig.filter(c => visibleColumns[c.key]).length + 2} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Loading records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredStockRows.length === 0 ? (
                  <tr>
                    <td colSpan={columnConfig.filter(c => visibleColumns[c.key]).length + 2} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="h-8 w-8 text-slate-200" />
                        <p className="text-sm font-semibold text-slate-400">No records found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStockRows.map((row) => {
                    const isSelected = selectedIds.has(row.id);
                    const costPrice = (parseFloat(row.qty || 0) * parseFloat(row.per_unit || 0));

                    return (
                      <tr key={row.id} className={`transition-colors duration-100 border-b border-slate-50 last:border-0 ${isSelected ? 'bg-violet-50/50' : 'hover:bg-slate-50/70'}`}>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-700 hover:bg-violet-100 transition-colors inline-flex items-center justify-center"
                            title="Edit Record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(row)}
                          />
                        </td>
                        {columnConfig.map(col => visibleColumns[col.key] && (
                          <td key={col.key} className="px-4 py-3 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] text-center">
                            {col.key === 'balance' ? (
                              <span className="font-bold text-slate-700">{row.qty}</span>
                            ) : col.key === 'costPrice' ? (
                              <span className="font-bold text-slate-700">
                                ₹{costPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : col.key === 'date' ? (
                              <span className="text-slate-500 font-medium">{formatDate(row.created_at)}</span>
                            ) : col.key === 'image' ? (
                              row.image_url ? (
                                <div className="flex justify-center">
                                  <a href={row.image_url} target="_blank" rel="noopener noreferrer" className="group relative">
                                    <img
                                      src={getDisplayableImageUrl(row.image_url)}
                                      alt="Preview"
                                      className="h-10 w-10 min-w-[40px] rounded-lg object-cover border border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-200"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://placehold.co/40x40?text=IMG';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                                      <ArrowUpRight className="h-3 w-3 text-white" />
                                    </div>
                                  </a>
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[10px]">No Image</span>
                              )
                            ) : col.key === 'item' ? (
                              <span className="font-bold text-slate-800">{row.item_name}</span>
                            ) : col.key === 'type' ? (
                              <span className="text-slate-600">{row.inventory_type}</span>
                            ) : col.key === 'dept' ? (
                              <span className="text-slate-600">{row.department}</span>
                            ) : col.key === 'vendor' ? (
                              <span className="text-slate-600">{row.vendor_name || '—'}</span>
                            ) : col.key === 'unit' ? (
                              <span className="text-slate-600">{row.unit || '—'}</span>
                            ) : col.key === 'perUnit' ? (
                              <span className="font-bold text-blue-600 whitespace-nowrap">₹{parseFloat(row.per_unit || 0).toFixed(2)}</span>
                            ) : col.key === 'remarks' ? (
                              <span className="text-slate-600">{row.remarks || '—'}</span>
                            ) : (
                              <span className="text-slate-600">{row[col.key] || '—'}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={activeTab === 'purchase' ? purchasePage : repurchasePage}
            totalCount={filteredStockRows.length}
            pageSize={PAGE_SIZE}
            onPageChange={activeTab === 'purchase' ? setPurchasePage : setRepurchasePage}
            isLoading={isTableLoading}
          />
        </div>

        {/* RE-PURCHASE MODAL */}
        {isPurchaseModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 backdrop-blur-[2px] overflow-y-auto">
            <div
              className="absolute inset-0 bg-slate-900/30 animate-in fade-in duration-200"
              onClick={() => !isSubmitting && setIsPurchaseModalOpen(false)}
            />

            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden my-auto">
              <div className="px-4 sm:px-7 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-slate-800">Re-Purchase Item</h3>
                <button
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handlePurchaseSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="px-4 sm:px-7 py-5 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Inventory Type</label>
                      <SearchableSelect
                        value={purchaseForm.inventoryType}
                        onChange={(val) => {
                          setPurchaseForm(prev => ({
                            ...prev,
                            inventoryType: val,
                            itemsName: '',
                            itemId: '',
                            department: '',
                            unit: '',
                            perUnit: ''
                          }));
                          setImagePreview(null);
                        }}
                        options={dropdownOptions.inventoryTypeOptions || []}
                        placeholder="Select type..."
                        searchPlaceholder="Search type..."
                        size="form"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name</label>
                      <SearchableSelect
                        value={purchaseForm.itemId}
                        onChange={(val) => {
                          const item = items.find(i => String(i.id) === String(val));
                          if (item) {
                            setPurchaseForm(prev => ({
                              ...prev,
                              itemId: item.id,
                              department: item.department,
                              itemsName: item.item_name,
                              unit: item.unit,
                              perUnit: item.damage_price != null ? String(item.damage_price) : '',
                              vendorName: '',
                              imageUrl: item.image_url || '',
                              openingBalance: '',
                              remarks: ''
                            }));
                            setImagePreview(item.image_url ? getDisplayableImageUrl(item.image_url) : null);
                          } else {
                            setPurchaseForm(prev => ({
                              ...prev,
                              itemId: '',
                              itemsName: '',
                              department: '',
                              unit: '',
                              perUnit: '',
                              imageUrl: ''
                            }));
                            setImagePreview(null);
                          }
                        }}
                        options={items
                          .filter(item => {
                            const rowType = String(item.inventory_type || '').trim().toLowerCase();
                            const selectedType = String(purchaseForm.inventoryType || '').trim().toLowerCase();
                            return rowType === selectedType;
                          })
                          .map(item => ({
                            id: item.id,
                            value: item.id,
                            label: item.item_name
                          }))
                        }
                        disabled={!purchaseForm.inventoryType}
                        placeholder={purchaseForm.inventoryType ? "Select item..." : "Select type first..."}
                        searchPlaceholder="Search item..."
                        emptyMessage="No items found for this type"
                        size="form"
                      />
                    </div>
                  </div>

                <div className="space-y-4 sm:space-y-5 animate-in slide-in-from-top-4 duration-500">
                  {purchaseForm.itemId && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</span>
                          <span className="text-sm font-semibold text-slate-700">{purchaseForm.department}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit Type</span>
                          <span className="text-sm font-semibold text-slate-700">{purchaseForm.unit}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Vendor Name</label>
                      <input
                        type="text"
                        value={purchaseForm.vendorName}
                        onChange={(e) => setPurchaseForm(prev => ({ ...prev, vendorName: e.target.value }))}
                        required
                        placeholder="Update vendor..."
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-violet-600 uppercase tracking-wide">Quantity</label>
                      <input
                        type="number"
                        onWheel={(e) => e.target.blur()}
                        value={purchaseForm.openingBalance}
                        onChange={(e) => setPurchaseForm(prev => ({ ...prev, openingBalance: e.target.value }))}
                        required
                        placeholder="Qty..."
                        className="w-full h-11 px-4 rounded-lg border border-violet-100 focus:border-violet-500 outline-none text-sm font-bold text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Per Unit Price (₹)</label>
                      <input
                        type="number"
                        onWheel={(e) => e.target.blur()}
                        step="0.01"
                        value={purchaseForm.perUnit}
                        onChange={(e) => setPurchaseForm(prev => ({ ...prev, perUnit: e.target.value }))}
                        required
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Total Cost</label>
                      <div className="w-full h-11 px-4 rounded-lg border border-emerald-100 bg-emerald-50/30 flex items-center text-sm font-bold text-emerald-700">
                        ₹{(Number(purchaseForm.openingBalance || 0) * Number(purchaseForm.perUnit || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item-Image</label>
                      <div className="h-11">
                        <input type="file" id="purchase-upload" onChange={handleImageChange} className="hidden" accept="image/*" />
                        <label htmlFor="purchase-upload" className="flex items-center justify-between px-3 h-full rounded-lg border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all cursor-pointer overflow-hidden bg-white">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <UploadCloud className="h-4 w-4 text-slate-300 shrink-0" />
                            <span className="text-xs font-semibold text-slate-500 truncate">
                              {selectedImage ? "New File Selected" : (purchaseForm.imageUrl ? "Keep Original" : "Attach Image")}
                            </span>
                          </div>
                          <div className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Browse</div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {imagePreview && (
                    <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm animate-in zoom-in-95 duration-300">
                      <div className="relative group rounded-lg overflow-hidden bg-slate-50 border border-slate-200 h-48">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 right-2">
                          <button
                            type="button"
                            onClick={() => { setImagePreview(null); setSelectedImage(null); setPurchaseForm(p => ({ ...p, imageUrl: '' })); }}
                            className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-all"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Remarks (Optional)</label>
                    <textarea
                      value={purchaseForm.remarks}
                      onChange={(e) => setPurchaseForm(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Add purchase notes..."
                      rows="2"
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 resize-none font-sans"
                    />
                  </div>
                  </div>
                </div>

                <div className="px-4 sm:px-7 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button type="button" onClick={() => setIsPurchaseModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all font-sans">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 font-sans">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Processing..." : "Confirm Purchase"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD STOCK MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 backdrop-blur-[2px] overflow-y-auto">
            <div className="absolute inset-0 bg-slate-900/30 animate-in fade-in duration-200" onClick={() => !isSubmitting && setIsModalOpen(false)} />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden my-auto">
              <div className="px-4 sm:px-7 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-slate-800">Add Stock Item</h3>
                <button onClick={() => setIsModalOpen(false)} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all font-sans"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="px-4 sm:px-7 py-5 space-y-4 max-h-[72vh] overflow-y-auto custom-scrollbar font-sans flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Inventory Type</label>
                      <SearchableSelect
                        value={form.inventoryType}
                        onChange={(val) => setForm(prev => ({ ...prev, inventoryType: val, department: '', itemsName: '', itemId: '' }))}
                        options={dropdownOptions.inventoryTypeOptions || []}
                        placeholder="Select type..."
                        searchPlaceholder="Search type..."
                        size="form"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Department</label>
                      <SearchableSelect
                        value={form.department}
                        onChange={(val) => setForm(prev => ({ ...prev, department: val, itemsName: '', itemId: '' }))}
                        options={addStockDepartmentOptions || []}
                        placeholder="Select department..."
                        searchPlaceholder="Search department..."
                        size="form"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name</label>
                    <SearchableSelect
                      value={form.itemId}
                      onChange={(val) => {
                        const item = addStockItemOptions.find(i => String(i.id) === String(val));
                        if (item) handleSelectAddStockItem(item);
                      }}
                      options={addStockItemOptions.map(item => ({
                        id: item.id,
                        value: item.id,
                        label: item.item_name
                      }))}
                      disabled={!form.inventoryType || !form.department}
                      placeholder={form.inventoryType && form.department ? "Select item..." : "Select type & department first"}
                      searchPlaceholder="Search item..."
                      emptyMessage="No items found — create it in Master > Items first."
                      size="form"
                    />
                    {form.inventoryType && form.department && addStockItemOptions.length === 0 && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1.5 px-1">No items found — create it in Master &gt; Items first.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Vendor Name</label>
                      <input type="text" name="vendorName" value={form.vendorName} onChange={handleChange} required placeholder="Enter vendor name" className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Unit</label>
                      <SearchableSelect
                        value={form.unit}
                        onChange={(val) => setForm(prev => ({ ...prev, unit: val }))}
                        options={dropdownOptions.unitOptions || []}
                        placeholder="Select unit..."
                        searchPlaceholder="Search unit..."
                        size="form"
                      />
                    </div>
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Opening Balance</label>
                    <input type="number" onWheel={(e) => e.target.blur()} name="openingBalance" value={form.openingBalance} onChange={handleChange} required placeholder="e.g. 100" className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Per Unit Price (₹)</label>
                    <input type="number" step="0.01" onWheel={(e) => e.target.blur()} name="perUnit" value={form.perUnit} onChange={handleChange} required placeholder="e.g. 25" className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Total Cost</label>
                  <div className="w-full h-11 px-4 rounded-lg border border-emerald-100 bg-emerald-50/30 flex items-center text-sm font-bold text-emerald-700">₹{(Number(form.openingBalance || 0) * Number(form.perUnit || 0)).toFixed(2)}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Attachment (Image)</label>
                  <div className="h-11">
                    <input type="file" id="modal-upload" onChange={handleImageChange} className="hidden" accept="image/*" />
                    <label htmlFor="modal-upload" className="flex items-center justify-between px-3 h-full rounded-lg border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all cursor-pointer bg-white">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <UploadCloud className="h-4 w-4 text-slate-300 shrink-0" />
                        <span className="text-xs font-semibold text-slate-500 truncate">{selectedImage ? "New File Selected" : (form.imageUrl ? "Keep Item's Existing Photo" : "Click to upload image")}</span>
                      </div>
                      <div className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Browse</div>
                    </label>
                  </div>
                </div>
                {imagePreview && (
                  <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <div className="relative group rounded-lg overflow-hidden bg-slate-50 border border-slate-200 h-48">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      <div className="absolute top-2 right-2"><button type="button" onClick={() => { setImagePreview(null); setSelectedImage(null); setForm(p => ({ ...p, imageUrl: '' })); }} className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-all"><X className="h-3.5 w-3.5" /></button></div>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Remarks (Optional)</label>
                  <textarea name="remarks" value={form.remarks} onChange={handleChange} placeholder="Add any notes..." rows="2" className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 resize-none font-sans" />
                </div>
              </div>

              <div className="px-4 sm:px-7 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all font-sans">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 font-sans font-sans">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Saving..." : "Add Stock"}
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        {/* EDIT STOCK RECORD MODAL */}
        {isEditModalOpen && editingRecord && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 backdrop-blur-[2px] overflow-y-auto">
            <div
              className="absolute inset-0 bg-slate-900/30 animate-in fade-in duration-200"
              onClick={() => !isSubmitting && setIsEditModalOpen(false)}
            />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden my-auto">
              <div className="px-4 sm:px-7 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Edit {editingRecord.source === ENUMS.STOCK_SOURCE.RE_PURCHASE ? 'Re-Purchase' : 'Stock'} Record
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {editingRecord.serial_no ? `Serial: #${editingRecord.serial_no}` : `ID: ${editingRecord.id.slice(0, 8)}...`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmitting}
                  className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all font-sans"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="px-4 sm:px-7 py-5 space-y-4 max-h-[72vh] overflow-y-auto custom-scrollbar font-sans flex-1">
                  
                  {/* Transaction Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Transaction Date
                    </label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                      className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans"
                    />
                  </div>

                  {/* Catalog Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Inventory Type</label>
                      <SearchableSelect
                        value={editForm.inventoryType}
                        onChange={(val) => setEditForm(prev => ({ ...prev, inventoryType: val, department: '', itemsName: '', itemId: '' }))}
                        options={dropdownOptions.inventoryTypeOptions || []}
                        placeholder="Select type..."
                        searchPlaceholder="Search type..."
                        size="form"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Department</label>
                      <SearchableSelect
                        value={editForm.department}
                        onChange={(val) => setEditForm(prev => ({ ...prev, department: val, itemsName: '', itemId: '' }))}
                        options={editDepartmentOptions || []}
                        placeholder="Select department..."
                        searchPlaceholder="Search department..."
                        size="form"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name</label>
                    <SearchableSelect
                      value={editForm.itemId}
                      onChange={(val) => {
                        const item = editItemOptions.find(i => String(i.id) === String(val));
                        if (item) handleSelectEditItem(item);
                      }}
                      options={editItemOptions.map(item => ({
                        id: item.id,
                        value: item.id,
                        label: item.item_name
                      }))}
                      disabled={!editForm.inventoryType || !editForm.department}
                      placeholder={editForm.inventoryType && editForm.department ? "Select item..." : "Select type & department first"}
                      searchPlaceholder="Search item..."
                      emptyMessage="No items found."
                      size="form"
                    />
                  </div>

                  {/* Vendor & Unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Vendor Name</label>
                      <input
                        type="text"
                        name="vendorName"
                        value={editForm.vendorName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, vendorName: e.target.value }))}
                        required
                        placeholder="Enter vendor name"
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Unit</label>
                      <SearchableSelect
                        value={editForm.unit}
                        onChange={(val) => setEditForm(prev => ({ ...prev, unit: val }))}
                        options={dropdownOptions.unitOptions || []}
                        placeholder="Select unit..."
                        searchPlaceholder="Search unit..."
                        size="form"
                      />
                    </div>
                  </div>

                  {/* Quantity & Per Unit Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Quantity</label>
                      <input
                        type="number"
                        step="any"
                        onWheel={(e) => e.target.blur()}
                        name="openingBalance"
                        value={editForm.openingBalance}
                        onChange={(e) => setEditForm(prev => ({ ...prev, openingBalance: e.target.value }))}
                        required
                        placeholder="e.g. 100"
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Per Unit Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        onWheel={(e) => e.target.blur()}
                        name="perUnit"
                        value={editForm.perUnit}
                        onChange={(e) => setEditForm(prev => ({ ...prev, perUnit: e.target.value }))}
                        required
                        placeholder="e.g. 25"
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans"
                      />
                    </div>
                  </div>

                  {/* Live Total Cost Card */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Total Cost</label>
                    <div className="w-full h-11 px-4 rounded-lg border border-emerald-100 bg-emerald-50/40 flex items-center text-sm font-bold text-emerald-700">
                      ₹{(Number(editForm.openingBalance || 0) * Number(editForm.perUnit || 0)).toFixed(2)}
                    </div>
                  </div>

                  {/* Attachment / Image */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Attachment (Image)</label>
                    <div className="h-11">
                      <input type="file" id="edit-modal-upload" onChange={handleEditImageChange} className="hidden" accept="image/*" />
                      <label htmlFor="edit-modal-upload" className="flex items-center justify-between px-3 h-full rounded-lg border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all cursor-pointer bg-white">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <UploadCloud className="h-4 w-4 text-slate-300 shrink-0" />
                          <span className="text-xs font-semibold text-slate-500 truncate">
                            {editSelectedImage ? "New File Selected" : (editImagePreview ? "Change Existing Photo" : "Click to upload image")}
                          </span>
                        </div>
                        <div className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Browse</div>
                      </label>
                    </div>
                  </div>

                  {editImagePreview && (
                    <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <div className="relative group rounded-lg overflow-hidden bg-slate-50 border border-slate-200 h-44">
                        <img src={getDisplayableImageUrl(editImagePreview)} alt="Preview" className="w-full h-full object-contain" />
                        <div className="absolute top-2 right-2">
                          <button
                            type="button"
                            onClick={() => { setEditImagePreview(null); setEditSelectedImage(null); setEditForm(p => ({ ...p, imageUrl: '' })); }}
                            className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-all"
                            title="Remove Photo"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Remarks (Optional)</label>
                    <textarea
                      name="remarks"
                      value={editForm.remarks}
                      onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Add any notes..."
                      rows="2"
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 resize-none font-sans"
                    />
                  </div>
                </div>

                <div className="px-4 sm:px-7 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-all flex items-center gap-2 font-sans shadow-md shadow-violet-200 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </AdminLayout>
  );
}
