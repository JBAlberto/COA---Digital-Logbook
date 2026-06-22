import React, { useState, useEffect, useMemo } from "react";
import { LogEntry, ViewState, MonthData } from "./types";
import { MONTHS, generateId } from "./data";
import LogEntryForm from "./components/LogEntryForm";
import DashboardView from "./components/DashboardView";
import MonthSpreadsheet from "./components/MonthSpreadsheet";
import { AnimatePresence, motion } from "motion/react";
import { 
  Diamond, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  ArrowLeft, 
  Download, 
  Trash2, 
  Activity, 
  CheckCircle,
  TrendingUp,
  FileText
} from "lucide-react";

export default function App() {
  // State Initialization
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>("entry");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Selected date for manual log entries
  const [selectedDate, setSelectedDate] = useState<string>("");


  // Load logs on mount (purge all logs for dashboard/entry)
  useEffect(() => {
    // Hard reset: remove existing saved logs so dashboard grid is empty.
    localStorage.removeItem("digital_logbook_data");
    setLogs([]);
  }, []);



  // Sync state to local storage
  const saveLogs = (updatedLogs: LogEntry[]) => {
    setLogs(updatedLogs);
    localStorage.setItem("digital_logbook_data", JSON.stringify(updatedLogs));
  };

  // Add Log Entry callback
  const handleAddLog = (newEntry: Omit<LogEntry, "id" | "createdAt">) => {
    const entry: LogEntry = {
      ...newEntry,
      id: generateId(),
      createdAt: Date.now()
    };
    saveLogs([entry, ...logs]);
  };

  // Edit/Update Log callback
  const handleUpdateLog = (updated: LogEntry) => {
    const index = logs.findIndex(l => l.id === updated.id);
    if (index !== -1) {
      const copy = [...logs];
      copy[index] = { ...updated };
      saveLogs(copy);
    }
  };

  // Delete Log callback
  const handleDeleteLog = (id: string) => {
    saveLogs(logs.filter(l => l.id !== id));
  };

  // Import Log list backup callback
  const handleImportLogs = (importedList: LogEntry[]) => {
    saveLogs(importedList);
  };

  // Quick Action: Time out from Today's active log summary widget
  const handleQuickLogOut = (id: string, outTime: string) => {
    const match = logs.find(l => l.id === id);
    if (match) {
      const updated = { ...match, timeOut: outTime };
      handleUpdateLog(updated);
    }
  };

  // Seed sample data spanning the selected month (kept for manual generation)
  const handleSeedMonthData = (monthKey: string) => {

    // Generate about 10-15 random logs for this month
    const customSampleLogs: LogEntry[] = [];
    const names = [
      "Ernesto G.", "Carla de Leon", "Sandro M.", "Ismael Santos", 
      "Vicky Roxas", "Paolo Alcantara", "Dante Perez", "Gwen Tan"
    ];
    const targetMonth = MONTHS.find(m => m.key === monthKey) || MONTHS[0];

    for (let d = 1; d <= targetMonth.daysCount; d++) {
      // randomly select some days to log (e.g., weekdays)
      if (Math.random() > 0.4) {
        const dayStr = String(d).padStart(2, "0");
        const dateStr = `${selectedYear}-${monthKey}-${dayStr}`;
        const name = names[Math.floor(Math.random() * names.length)];
        const inHour = 8;
        const outHour = 17;

        customSampleLogs.push({
          id: generateId(),
          name,
          team: "Alpha Team",
          brgy: "San Jose",
          municipality: "Antipolo",
          province: "Rizal",
          timeIn: `0${inHour}:00`,
          timeOut: `${outHour}:00`,
          date: dateStr,
          createdAt: new Date(`${dateStr}T08:00:00`).getTime()
        });
      }
    }

    const compiled = [...customSampleLogs, ...logs];
    saveLogs(compiled);
  };

  // Full calendar year seeder (disabled: no mock/pre-filled generation)
  const handleSeedFullYear = () => {
    // intentionally left blank
  };


  // Clear all database logs
  const handleClearAllRecords = () => {
    if (confirm("🚨 WARNING: This will permanently delete all logged entries for all years from local memory. Do you wish to proceed?")) {
      saveLogs([]);
    }
  };

  // Filter logs specifically logged today based on user selected Date Picker
  const todayLogs = useMemo(() => {
    return logs.filter(log => log.date === selectedDate);
  }, [logs, selectedDate]);

  // General App Summary Metrics for stats line
  const stats = useMemo(() => {
    const activeCheckedIn = logs.filter(log => log.timeOut === "").length;
    const totalLogsCount = logs.length;
    const distinctBrgys = new Set(logs.map(log => log.brgy)).size;
    const activeTeamsCount = new Set(logs.map(log => log.team)).size;

    return {
      activeCheckedIn,
      totalLogsCount,
      distinctBrgys,
      activeTeamsCount
    };
  }, [logs]);

  // Find month metadata
  const currentMonthData = useMemo(() => {
    return MONTHS.find(m => m.key === selectedMonthKey) || MONTHS[0];
  }, [selectedMonthKey]);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-slate-950 selection:text-white pb-16">
      
      {/* Top Professional App Navigation Banner */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-3xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Title Block & View Switch (Left & Middle Header Layout) */}
            <div className="flex items-center gap-4">
              {/* Back actions representing arrows in hand-drawn drawing */}
              {(currentView === "dashboard" || currentView === "spreadsheet") && (
                <button
                  type="button"
                  id="header_back_btn"
                  onClick={() => {
                    if (currentView === "spreadsheet") {
                      setCurrentView("dashboard");
                    } else if (currentView === "dashboard") {
                      setCurrentView("entry");
                    }
                  }}
                  className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer font-sans font-semibold text-xs"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-900" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-display font-black text-slate-950 uppercase tracking-widest">
                  COA Monitoring
                </span>
                <span className="text-xs font-mono font-medium text-slate-450 uppercase tracking-wider hidden sm:inline-block">
                  | Digital Logbook
                </span>
              </div>
            </div>

            {/* Current View Label Indicator */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold text-slate-600 uppercase">
              <Activity className="w-3 h-3 text-slate-500 animate-pulse" />
              <span>Workspace: {currentView}</span>
            </div>

            {/* Rightmost Diamond Icon - EXACTLY matches the wireframe layout links */}
            <div id="navigation_diamond_container" className="flex items-center gap-4">
              {currentView === "entry" ? (
                <button
                  type="button"
                  id="main_diamond_to_dashboard"
                  onClick={() => setCurrentView("dashboard")}
                  className="group flex items-center gap-2 bg-slate-950 text-white hover:bg-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-sm cursor-pointer"
                  title="Open Month & Calendar Dashboard Grid"
                >
                  <span>Admin Panel</span>
                  <div className="bg-white/10 p-1 rounded-md text-white transition-transform group-hover:rotate-45">
                    {/* Diamond Icon representing the diamond button in the hand-drawn logbook form header */}
                    <Diamond className="w-3.5 h-3.5 fill-white" />
                  </div>
                </button>
              ) : currentView === "dashboard" ? (
                <button
                  type="button"
                  id="dashboard_diamond_to_main"
                  onClick={() => setCurrentView("entry")}
                  className="group flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-slate-200"
                  title="Return to check-in sheet form"
                >
                  <div className="bg-slate-950 text-white p-1 rounded-md transition-transform group-hover:rotate-45">
                    <Diamond className="w-3.5 h-3.5 fill-white" />
                  </div>
                  <span>Logbook</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="spreadsheet_diamond_to_dashboard"
                  onClick={() => setCurrentView("dashboard")}
                  className="group flex items-center gap-2 bg-slate-150 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-slate-200"
                  title="Return to calendar dashboard grid"
                >
                  <div className="bg-slate-950 text-white p-1 rounded-md transition-transform group-hover:-rotate-45">
                    <Diamond className="w-3.5 h-3.5 fill-white" />
                  </div>
                  <span>Admin Panel</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Global Status/Analytics Strip (High End Visual Polish) */}
      <div className="bg-slate-950 text-white border-y border-slate-800 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 divide-x divide-slate-800 text-center md:text-left">
          
          <div className="px-2">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">CURRENTLY IN FIELD</span>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-xl font-display font-bold text-sky-400">{stats.activeCheckedIn}</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 rounded px-1 text-center font-mono font-medium">Checked-In</span>
            </div>
          </div>

          <div className="px-2">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">TOTAL LOGSHEETS REGISTERED</span>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-xl font-display font-bold text-emerald-400">{stats.totalLogsCount}</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 rounded px-1 text-center font-mono font-medium">Logs</span>
            </div>
          </div>

          <div className="px-2">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">COVERED BARANGAYS</span>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-xl font-display font-bold text-indigo-400">{stats.distinctBrgys}</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 rounded px-1 text-center font-mono font-medium">Districts</span>
            </div>
          </div>

          <div className="px-2">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">ACTIVE TEAMS</span>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-xl font-display font-bold text-purple-400">{stats.activeTeamsCount}</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 rounded px-1 text-center font-mono font-medium">Squads</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Workspace Frame Container (Dynamic Animations) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <AnimatePresence mode="wait">
          {currentView === "entry" && (
            <motion.div
              key="entry-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22 }}
            >
              <LogEntryForm 
                onAddLog={handleAddLog}
                todayLogs={todayLogs}
                onQuickLogOut={handleQuickLogOut}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
            </motion.div>
          )}

          {currentView === "dashboard" && (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22 }}
            >
              <DashboardView 
                logs={logs}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                onSelectMonth={(monthKey) => {
                  setSelectedMonthKey(monthKey);
                  setCurrentView("spreadsheet"); // Downward arrow target
                }}
                onSeedData={handleSeedFullYear}
              />
            </motion.div>
          )}

          {currentView === "spreadsheet" && (
            <motion.div
              key="spreadsheet-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22 }}
            >
              <MonthSpreadsheet 
                logs={logs}
                month={currentMonthData}
                year={selectedYear}
                onUpdateLog={handleUpdateLog}
                onDeleteLog={handleDeleteLog}
                onAddLog={handleAddLog}
                onSeedMonthData={handleSeedMonthData}
                onImportLogs={handleImportLogs}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Utility Footer Drawer - purging option & self declaration details */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 border-t border-slate-200 pt-6 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-550 font-sans font-medium">
          <div className="text-left">
            <span className="font-semibold text-slate-800">Digital Logbook System v1.1</span> — Designed using high precision display standards.
            <p className="text-[10px] text-slate-400 mt-0.5">Auto-saves to browser local persistence space asynchronously.</p>
          </div>
          
            <div className="flex items-center gap-3">
              {logs.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleClearAllRecords}
                    className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 border border-transparent text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    title="Clears all logged entries for all years from local memory"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear All Logs
                  </button>

                </>
              )}
            </div>

        </div>
      </footer>

    </div>
  );
}

