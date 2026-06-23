import React, { useState, useMemo, FormEvent, ChangeEvent, useEffect } from "react";
import { LogEntry, MonthData } from "../types";
import { 
  PROVINCES, 
  BARANGAYS_BY_MUNICIPALITY, 
  TEAMS,
  getAllowedMunicipalitiesForTeam,
  MUNICIPALITIES_BY_PROVINCE,
  getTeamDisplayLabel
} from "../data";
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  Download, 
  Upload, 
  Check, 
  X, 
  Plus, 
  Calendar, 
  HelpCircle,
  Database,
  Grid
} from "lucide-react";

interface MonthSpreadsheetProps {
  logs: LogEntry[];
  month: MonthData;
  year: number;
  onUpdateLog: (updated: LogEntry) => void;
  onDeleteLog: (id: string) => void;
  onAddLog: (entry: Omit<LogEntry, "id" | "createdAt">) => void;
  onSeedMonthData: (monthKey: string) => void;
  onImportLogs: (imported: LogEntry[]) => void;
  teamLocations?: Record<string, string[]>;
}

export default function MonthSpreadsheet({
  logs,
  month,
  year,
  onUpdateLog,
  onDeleteLog,
  onAddLog,
  onSeedMonthData,
  onImportLogs,
  teamLocations
}: MonthSpreadsheetProps) {
  // Filtering & Search state
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState("");
  const [selectedMuniFilter, setSelectedMuniFilter] = useState("");

  // Clear municipality filter option when team changes
  useEffect(() => {
    setSelectedMuniFilter("");
  }, [selectedTeam]);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LogEntry>>({});

  // Inline adding state for spreadsheet
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickTeam, setQuickTeam] = useState(TEAMS[0] || "");
  const [quickProvince, setQuickProvince] = useState(PROVINCES[0] || "");
  const [quickMunicipality, setQuickMunicipality] = useState("");
  const [quickBarangay, setQuickBarangay] = useState("");
  const [quickDay, setQuickDay] = useState("01");
  const [quickTimeIn, setQuickTimeIn] = useState("08:00");
  const [quickTimeOut, setQuickTimeOut] = useState("");
  const [quickContactNumber, setQuickContactNumber] = useState("");
  const [quickPurpose, setQuickPurpose] = useState("");

  const [sheetNotification, setSheetNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const triggerNotification = (message: string, type: "success" | "error") => {
    setSheetNotification({ message, type });
    setTimeout(() => {
      setSheetNotification(null);
    }, 4500);
  };


  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter logs specifically belonging to this month and year
  const filteredMonthLogs = useMemo(() => {
    return logs.filter(log => {
      const parts = log.date.split("-");
      const logYear = parseInt(parts[0] || "0");
      const logMonth = parts[1]; // "01", "02", ...
      return logYear === year && logMonth === month.key;
    });
  }, [logs, year, month]);

  // Determine if quickTeam selection has location specifics
  const quickHasLocationSpecifics = useMemo(() => {
    return !quickTeam.startsWith("Team 1 ") && !quickTeam.startsWith("Team 9 ");
  }, [quickTeam]);

  // Dynamic allowed municipalities list for quick-add form
  const quickAllowedMunicipalities = useMemo(() => {
    if (quickTeam.trim() === "Office of the Supervising Auditor") {
      return Object.values(MUNICIPALITIES_BY_PROVINCE).flat() as string[];
    }
    if (!quickHasLocationSpecifics) return [];
    if (teamLocations && teamLocations[quickTeam]) {
      return teamLocations[quickTeam];
    }
    return getAllowedMunicipalitiesForTeam(quickTeam);
  }, [quickTeam, quickHasLocationSpecifics, teamLocations]);

  // Sync quick municipality and barangay immediately on team change
  React.useEffect(() => {
    if (!quickHasLocationSpecifics) {
      setQuickProvince("");
      setQuickMunicipality("");
      setQuickBarangay("");
    } else {
      setQuickProvince("Ilocos Norte");
      let allowed = teamLocations && teamLocations[quickTeam] ? teamLocations[quickTeam] : getAllowedMunicipalitiesForTeam(quickTeam);
      if (quickTeam.trim() === "Office of the Supervising Auditor") {
        allowed = Object.values(MUNICIPALITIES_BY_PROVINCE).flat() as string[];
      }
      if (allowed.length > 0) {
        const defaultMuni = allowed[0];
        setQuickMunicipality(defaultMuni);
        const brgys = BARANGAYS_BY_MUNICIPALITY[defaultMuni] || [];
        setQuickBarangay(brgys[0] || "");
      } else {
        setQuickMunicipality("");
        setQuickBarangay("");
      }
    }
  }, [quickTeam, quickHasLocationSpecifics, teamLocations]);

  // Sync quick barangay immediately when municipality changes manually (but allow manual typing overwrite)
  React.useEffect(() => {
    if (!quickHasLocationSpecifics) return;
    const brgys = BARANGAYS_BY_MUNICIPALITY[quickMunicipality] || [];
    setQuickBarangay(brgys[0] || "");
  }, [quickMunicipality, quickHasLocationSpecifics]);

  // Get all unique municipalities with data recorded for this month
  const uniqueMunicipalities = useMemo(() => {
    return Array.from(new Set(filteredMonthLogs.map(l => l.municipality).filter(Boolean))).sort();
  }, [filteredMonthLogs]);

  // Dynamic municipalities allowed in filter depending on selected team & reshuffled settings
  const filterAllowedMunicipalities = useMemo(() => {
    if (selectedTeam) {
      if (selectedTeam.trim() === "Office of the Supervising Auditor") {
        return Object.values(MUNICIPALITIES_BY_PROVINCE).flat();
      }
      return teamLocations && teamLocations[selectedTeam]
        ? teamLocations[selectedTeam]
        : getAllowedMunicipalitiesForTeam(selectedTeam);
    }
    // No team chosen: show unique municipalities that recorded logs this month
    return uniqueMunicipalities.length > 0
      ? uniqueMunicipalities
      : (Object.values(MUNICIPALITIES_BY_PROVINCE).flat() as string[]);
  }, [selectedTeam, teamLocations, uniqueMunicipalities]);

  // Get all unique barangays with data recorded for this month
  const uniqueBarangays = useMemo(() => {
    return Array.from(new Set(filteredMonthLogs.map(l => l.brgy).filter(Boolean))).sort();
  }, [filteredMonthLogs]);

  // Filtered array based on Search and Selected criteria
  const finalDisplayLogs = useMemo(() => {
    return filteredMonthLogs.filter(log => {
      const matchesSearch = log.name.toLowerCase().includes(search.toLowerCase()) || 
                            log.brgy.toLowerCase().includes(search.toLowerCase()) ||
                            log.municipality.toLowerCase().includes(search.toLowerCase());
      
      const matchesTeam = selectedTeam === "" || log.team === selectedTeam;

      const matchesMuni = selectedMuniFilter === "" || log.municipality === selectedMuniFilter;

      let matchesLocationValue = true;
      if (selectedLocationFilter) {
        const isProvinceOnly = log.province && (!log.municipality || log.municipality.trim() === "") && (!log.brgy || log.brgy.trim() === "");
        const isMuniOnly = log.municipality && (!log.brgy || log.brgy.trim() === "");
        const isSK = log.brgy && log.brgy.toLowerCase().includes("sk");
        const isOthers = log.brgy && log.brgy.toLowerCase().includes("others");
        const isBrgyOnly = log.municipality && log.brgy && log.brgy.trim() !== "" && !log.brgy.toLowerCase().includes("sk") && !log.brgy.toLowerCase().includes("others");

        if (selectedLocationFilter === "province") {
          matchesLocationValue = !!isProvinceOnly;
        } else if (selectedLocationFilter === "municipality") {
          matchesLocationValue = !!isMuniOnly;
        } else if (selectedLocationFilter === "barangay") {
          matchesLocationValue = !!isBrgyOnly;
        } else if (selectedLocationFilter === "sk") {
          matchesLocationValue = !!isSK;
        } else if (selectedLocationFilter === "others") {
          matchesLocationValue = !!isOthers;
        }
      }

      return (
        matchesSearch &&
        matchesTeam &&
        matchesMuni &&
        matchesLocationValue
      );
    }).sort((a, b) => b.date.localeCompare(a.date) || b.timeIn.localeCompare(a.timeIn));
  }, [filteredMonthLogs, search, selectedTeam, selectedMuniFilter, selectedLocationFilter]);

  // Paginated display
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return finalDisplayLogs.slice(startIndex, startIndex + rowsPerPage);
  }, [finalDisplayLogs, currentPage]);

  const totalPages = Math.ceil(finalDisplayLogs.length / rowsPerPage) || 1;

  // Sync pagination index if filtered array shrinks
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Export functions
  const handleExportCSV = () => {
    if (filteredMonthLogs.length === 0) return;
    
    const headers = ["Name", "Team", "Barangay", "Municipality", "Province", "Date", "Time In", "Time Out"];
    const rows = filteredMonthLogs.map(log => [
      `"${log.name.replace(/"/g, '""')}"`,
      `"${log.team}"`,
      `"${log.brgy.replace(/"/g, '""')}"`,
      `"${log.municipality.replace(/"/g, '""')}"`,
      `"${log.province.replace(/"/g, '""')}"`,
      log.date,
      log.timeIn,
      log.timeOut || "N/A"
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `logbook_${month.fullName.toLowerCase()}_${year}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `all_digital_logbooks_backup.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON handler
  const handleImportJSON = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          // Rudimentary check for correct attributes
          const isValidFormat = parsed.every(item => 
            typeof item.name === "string" && 
            typeof item.team === "string" && 
            typeof item.date === "string"
          );
          if (isValidFormat) {
            onImportLogs(parsed);
            triggerNotification(`Logbook loaded successfully! Integrated ${parsed.length} items.`, "success");
          } else {
            triggerNotification("File schema is invalid. Missing critical attributes.", "error");
          }
        } else {
          triggerNotification("Selected file does not contain a valid JSON Array.", "error");
        }
      } catch (err) {
        triggerNotification("Failed to parse JSON file. Ensure file is correctly formatted.", "error");
      }
    };
  };

  // Inline entry save
  const handleStartEdit = (log: LogEntry) => {
    setEditingId(log.id);
    setEditForm({ ...log });
  };

  const handleSaveEdit = () => {
    if (!editForm.name?.trim()) {
      triggerNotification("Name is required.", "error");
      return;
    }
    const hasLoc = editForm.team ? (!editForm.team.startsWith("Team 1 ") && !editForm.team.startsWith("Team 9 ")) : false;
    if (hasLoc) {
      const isProvinceOnlyEdit = editForm.province && (!editForm.municipality || editForm.municipality.trim() === "") && (!editForm.brgy || editForm.brgy.trim() === "");
      if (!isProvinceOnlyEdit) {
        if (!editForm.municipality?.trim()) {
          triggerNotification("Municipality is required.", "error");
          return;
        }
        if (!editForm.brgy?.trim()) {
          triggerNotification("Barangay is required.", "error");
          return;
        }
      }
    }
    if (!editForm.contactNumber?.trim()) {
      triggerNotification("Contact Number is required.", "error");
      return;
    }
    if (editForm.contactNumber.trim().length !== 11) {
      triggerNotification("Contact Number must be exactly 11 digits (e.g. 09XXXXXXXXX).", "error");
      return;
    }
    if (!editForm.purpose?.trim()) {
      triggerNotification("Purpose of visit is required.", "error");
      return;
    }
    if (!editForm.timeIn) {
      triggerNotification("Time-In is required.", "error");
      return;
    }
    if (editForm.timeOut && editForm.timeOut < editForm.timeIn) {
      triggerNotification("Time-Out cannot be prior to Time-In.", "error");
      return;
    }

    if (editingId) {
      onUpdateLog(editForm as LogEntry);
      setEditingId(null);
      triggerNotification("Record updated successfully!", "success");
    }
  };


  const handleAddQuickLog = (e: FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      triggerNotification("Agent Name is required.", "error");
      return;
    }
    if (quickHasLocationSpecifics) {
      if (!quickMunicipality) {
        triggerNotification("Municipality occupies a required state.", "error");
        return;
      }
      if (!quickBarangay) {
        triggerNotification("Barangay occupies a required state.", "error");
        return;
      }
    }
    if (!quickContactNumber.trim()) {
      triggerNotification("Contact number is required.", "error");
      return;
    }
    if (quickContactNumber.trim().length !== 11) {
      triggerNotification("Contact number must be exactly 11 digits (e.g., 09XXXXXXXXX).", "error");
      return;
    }
    if (!quickPurpose.trim()) {
      triggerNotification("Purpose is required.", "error");
      return;
    }
    if (!quickTimeIn) {
      triggerNotification("Time-In is required.", "error");
      return;
    }
    if (quickTimeOut && quickTimeOut < quickTimeIn) {
      triggerNotification("Time-Out cannot be prior to Time-In.", "error");
      return;
    }

    const dayPad = quickDay.padStart(2, "0");
    const fullDate = `${year}-${month.key}-${dayPad}`;

    onAddLog({
      name: quickName.trim(),
      team: quickTeam,
      brgy: quickBarangay,
      municipality: quickMunicipality,
      province: quickProvince,
      contactNumber: quickContactNumber.trim(),
      purpose: quickPurpose.trim(),
      timeIn: quickTimeIn,
      timeOut: quickTimeOut,
      date: fullDate
    });


    // Reset inputs
    setQuickName("");
    setQuickTimeIn("08:00");
    setQuickTimeOut("");
    setQuickContactNumber("");
    setQuickPurpose("");
    setShowQuickAdd(false);
    triggerNotification("Successfully inserted attendance log record!", "success");
  };

  return (
    <div id="month_spreadsheet_wrapper" className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-8 space-y-6">
      
      {sheetNotification && (
        <div 
          id="sheet_notification_banner"
          className={`p-3.5 rounded-xl border text-sm flex items-center gap-2.5 transition-all ${
            sheetNotification.type === "success" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-800 animate-slide-in" 
              : "bg-rose-50 border-rose-100 text-rose-800 animate-shake"
          }`}
        >
          <div className="flex-1 flex items-center gap-2">
            <span className="font-sans font-semibold">
              {sheetNotification.type === "success" ? "✓ SUCCESS:" : "⚠ ERROR:"}
            </span>
            <span className="font-sans text-slate-700">{sheetNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSheetNotification(null)}
            className="text-slate-400 hover:text-slate-650 cursor-pointer p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Header bar mirroring hand-drawn design: Title with selected month info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          {/* Sizable month-days indicator (e.g. January 1-31) */}
          <h2 className="text-xl font-display font-semibold text-slate-950 flex items-center gap-1.5 capitalize">
            <span className="text-slate-500">Historical Journal:</span> 
            {month.fullName} 1-{month.daysCount}
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Total of {filteredMonthLogs.length} attendance sheets captured for the month of {month.fullName}, {year}
          </p>
        </div>

        {/* Action Controls: Export CSV, Export JSON, Import backup */}
        <div className="flex flex-wrap items-center gap-2">
          {filteredMonthLogs.length > 0 && (
            <button
              onClick={handleExportCSV}
              type="button"
              className="bg-slate-50 hover:bg-slate-150 text-slate-800 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download filtered CSV record spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={handleExportJSON}
            type="button"
            className="bg-slate-50 hover:bg-slate-150 text-slate-800 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            title="Download full logbook backup as a portable JSON database file"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup Logbook</span>
          </button>

          {/* Hidden file input for import */}
          <label className="bg-slate-50 hover:bg-slate-150 text-slate-800 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportJSON} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {/* Spreadsheet Operations Panel: Search / Filters / Quick Add */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Search */}
        <div className="lg:col-span-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by agent name, barangay..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 font-sans"
          />
        </div>

        {/* Filters Grid */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {/* Team Filter - Separated */}
          <div className="relative">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 text-left appearance-none cursor-pointer font-sans truncate pr-4"
            >
              <option value="">Team: All</option>
              {TEAMS.map(team => (
                <option key={team} value={team}>{getTeamDisplayLabel(team, teamLocations)}</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
          </div>

          {/* Dynamic Municipality Filter based on chosen team or active reshuffle logs */}
          <div className="relative">
            <select
              value={selectedMuniFilter}
              onChange={(e) => setSelectedMuniFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 text-left appearance-none cursor-pointer font-sans truncate pr-4"
            >
              <option value="">Municipality: All</option>
              {filterAllowedMunicipalities.map(muni => (
                <option key={muni} value={muni}>{muni}</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
          </div>

          {/* Unified Location Filter (Combines Municipality, Barangay, and SK) */}
          <div className="relative">
            <select
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 text-left appearance-none cursor-pointer font-sans truncate pr-4"
            >
              <option value="">Filter by: All</option>
              <option value="province">by Province Level</option>
              <option value="municipality">by Municipality/City</option>
              <option value="barangay">Barangay</option>
              <option value="sk">Brgy SK</option>
              <option value="others">Others</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
          </div>
        </div>

        {/* Quick Add Toggle and Seeder */}
        <div className="lg:col-span-3 flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="bg-slate-950 font-semibold hover:bg-slate-800 text-white text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer w-full justify-center md:w-auto"
          >
            {showQuickAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showQuickAdd ? "Cancel Add" : "Insert Log Row"}</span>
          </button>
        </div>
      </div>

      {/* Quick Add Form Row (Inline Expansion) */}
      {showQuickAdd && (
        <form onSubmit={handleAddQuickLog} className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-10 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Day</label>
            <select
              value={quickDay}
              onChange={(e) => setQuickDay(e.target.value)}
              className="w-full bg-white border border-slate-250 text-xs rounded-lg p-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {Array.from({ length: month.daysCount }, (_, i) => String(i + 1).padStart(2, "0")).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Agent Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              placeholder="e.g. Juan dela Cruz"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              required
              className="w-full bg-white border border-slate-250 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Team</label>
            <select
              value={quickTeam}
              onChange={(e) => setQuickTeam(e.target.value)}
              className="w-full bg-white border border-slate-250 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              {TEAMS.map(t => (
                <option key={t} value={t}>{getTeamDisplayLabel(t, teamLocations)}</option>
              ))}
            </select>
          </div>

          {quickHasLocationSpecifics ? (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Province</label>
                <select
                  value={quickProvince}
                  onChange={(e) => setQuickProvince(e.target.value)}
                  className="w-full bg-white border border-slate-250 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  {PROVINCES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Municipality <span className="text-rose-500">*</span></label>
                <select
                  value={quickMunicipality}
                  onChange={(e) => setQuickMunicipality(e.target.value)}
                  className="w-full bg-white border border-slate-250 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  {quickAllowedMunicipalities.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Barangay <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco"
                  value={quickBarangay}
                  onChange={(e) => setQuickBarangay(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-250 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </>
          ) : (
            <div className="sm:col-span-3 pb-1 md:pb-0">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Location Details</label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-500 font-sans text-center font-medium">
                Not applicable (Team 1 / 9)
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Contact No. <span className="text-rose-500">*</span></label>
            <input
              type="tel"
              inputMode="tel"
              placeholder="e.g. 09XXXXXXXXX"
              value={quickContactNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                setQuickContactNumber(digits);
              }}
              required
              pattern="09[0-9]{9}"
              className="w-full bg-white border border-slate-250 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Purpose <span className="text-rose-500">*</span></label>
            <input
              type="text"
              placeholder="e.g. Field visit"
              value={quickPurpose}
              onChange={(e) => setQuickPurpose(e.target.value)}
              required
              className="w-full bg-white border border-slate-250 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Time In <span className="text-rose-500">*</span></label>
            <input
              type="time"
              value={quickTimeIn}
              onChange={(e) => setQuickTimeIn(e.target.value)}
              required
              className="w-full bg-white border border-slate-250 text-xs rounded-lg p-1 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900 text-center"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Time Out (Opt)</label>
            <div className="flex gap-1.5 items-center">
              <input
                type="time"
                value={quickTimeOut}
                onChange={(e) => setQuickTimeOut(e.target.value)}
                className="w-full bg-white border border-slate-250 text-xs rounded-lg p-1 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900 text-center"
              />
              <button
                type="submit"
                className="bg-slate-950 text-white rounded-lg p-2.5 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Substantial attendance sheet table. Identical column listing to bottom-left box of wireframe sketch */}
      {finalDisplayLogs.length === 0 ? (
        <div id="spreadsheet_empty_state" className="flex flex-col items-center justify-center py-16 border border-slate-100 rounded-2xl bg-slate-50 text-center px-4">
          <Calendar className="w-12 h-12 text-slate-300 mb-2 shrink-0 animate-pulse" />
          <p className="text-sm font-semibold text-slate-900 font-sans">No records found for {month.fullName}, {year}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans mb-4">
            Try adjusting filters, searching, inserting a direct log row, or pre-populate this specific month with realistic sample logs!
          </p>
          
          <button
            type="button"
            onClick={() => onSeedMonthData(month.key)}
            className="bg-slate-950 font-semibold text-white hover:bg-slate-800 text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Generate month logs database</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table id="monthly_spreadsheet_master" className="w-full text-left font-sans text-xs border-collapse">
              <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Date</th>
                  <th scope="col" className="px-4 py-3.5">Name</th>
                  <th scope="col" className="px-4 py-3.5">Team</th>
                  <th scope="col" className="px-4 py-3.5">Brgy</th>
                  <th scope="col" className="px-4 py-3.5">Muni</th>
                  <th scope="col" className="px-4 py-3.5">Prov.</th>
                  <th scope="col" className="px-4 py-3.5">Contact</th>
                  <th scope="col" className="px-4 py-3.5">Purpose</th>
                  <th scope="col" className="px-4 py-3.5 text-center">In</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Out</th>

                  <th scope="col" className="px-4 py-3.5 text-center w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedLogs.map((log) => {
                  const isEditing = editingId === log.id;
                  
                  if (isEditing) {
                    return (
                      <tr key={log.id} className="bg-amber-50/55 text-xs transition-colors">
                        <td className="px-4 py-2 font-mono">
                          <input
                            type="date"
                            value={editForm.date || ""}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="bg-white border border-slate-300 rounded p-1 text-[11px] w-full"
                          />
                        </td>
                        <td className="px-4 py-2 font-semibold">
                          <input
                            type="text"
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="bg-white border border-slate-300 rounded p-1 text-[11px] w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.team || ""}
                            onChange={(e) => {
                              const selected = e.target.value;
                              const isNoLoc = selected.startsWith("Team 1 ") || selected.startsWith("Team 9 ");
                              const allowed = teamLocations && teamLocations[selected] ? teamLocations[selected] : getAllowedMunicipalitiesForTeam(selected);
                              const defaultMuni = allowed.length > 0 ? allowed[0] : "";
                              const brgys = BARANGAYS_BY_MUNICIPALITY[defaultMuni] || [];
                              const defaultBrgy = brgys.length > 0 ? brgys[0] : "";
                              setEditForm({
                                ...editForm,
                                team: selected,
                                province: isNoLoc ? "" : "Ilocos Norte",
                                municipality: isNoLoc ? "" : defaultMuni,
                                brgy: isNoLoc ? "" : defaultBrgy
                              });
                            }}
                            className="bg-white border border-slate-300 rounded p-1 text-[11px] w-full"
                          >
                            {TEAMS.map(team => (
                              <option key={team} value={team}>{getTeamDisplayLabel(team, teamLocations)}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          {/* Manual typing in spreadsheet row for total flexibility */}
                          <input
                            type="text"
                            value={editForm.brgy || ""}
                            onChange={(e) => setEditForm({ ...editForm, brgy: e.target.value })}
                            className="bg-white border border-slate-300 rounded p-1 text-[11px] w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.municipality || ""}
                            onChange={(e) => setEditForm({ ...editForm, municipality: e.target.value })}
                            className="bg-white border border-slate-300 rounded p-1 text-[11px] w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.province || ""}
                            onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                            className="bg-white border border-slate-300 rounded p-1 text-[11px] w-full"
                          >
                            {PROVINCES.map(prov => (
                              <option key={prov} value={prov}>{prov}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.contactNumber || ""}
                            onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                            className="bg-white border border-slate-300 rounded p-1 text-[11px] w-full"
                            placeholder="Contact number"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.purpose || ""}
                            onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                            className="bg-white border border-slate-300 rounded p-1 text-[11px] w-full"
                            placeholder="Purpose"
                          />
                        </td>

                        <td className="px-4 py-2 text-center font-mono">
                          <input
                            type="time"
                            value={editForm.timeIn || ""}
                            onChange={(e) => setEditForm({ ...editForm, timeIn: e.target.value })}
                            className="bg-white border border-slate-300 rounded p-1 text-[11px] w-full text-center"
                          />
                        </td>
                        <td className="px-4 py-2 text-center font-mono">
                          <input
                            type="time"
                            value={editForm.timeOut || ""}
                            onChange={(e) => setEditForm({ ...editForm, timeOut: e.target.value })}
                            className="bg-white border border-slate-300 rounded p-1 text-[11px] w-full text-center"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="p-1 px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer transition-colors"
                              title="Save Changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 px-1.5 bg-slate-400 hover:bg-slate-500 text-white rounded font-bold cursor-pointer transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-medium text-slate-500 whitespace-nowrap">
                        {log.date}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-950">
                        {log.name}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                          {log.team}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{log.brgy}</td>
                      <td className="px-4 py-3.5 text-slate-600">{log.municipality}</td>
                      <td className="px-4 py-3.5 text-slate-600">{log.province}</td>
                      <td className="px-4 py-3.5 text-slate-600">{log.contactNumber || ""}</td>
                      <td className="px-4 py-3.5 text-slate-600">{log.purpose || ""}</td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-emerald-800">{log.timeIn}</td>

                      <td className="px-4 py-3.5 text-center font-mono">
                        {log.timeOut ? (
                          <span className="font-semibold text-slate-800">{log.timeOut}</span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse select-none">
                            ACTIVE (IN)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {deleteConfirmId === log.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteLog(log.id);
                                setDeleteConfirmId(null);
                                triggerNotification(`Successfully deleted log for ${log.name}!`, "success");
                              }}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                              title="Confirm row deletion"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                              title="Cancel deletion"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(log)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 p-1.5 rounded transition-all cursor-pointer"
                              title="Edit row details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(log.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 p-1.5 rounded transition-all cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <span className="text-[11px] font-medium text-slate-500 font-sans">
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> — filtered <strong>{finalDisplayLogs.length}</strong> of {filteredMonthLogs.length} logs
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                className="bg-white border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-800 rounded px-2.5 py-1 text-[11px] font-bold cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                className="bg-white border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-800 rounded px-2.5 py-1 text-[11px] font-bold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
