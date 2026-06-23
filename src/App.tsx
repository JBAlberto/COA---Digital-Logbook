import React, { useState, useEffect, useMemo } from "react";
import { LogEntry, ViewState, MonthData } from "./types";
import { MONTHS, generateId, DEFAULT_TEAM_LOCATIONS } from "./data";
import LogEntryForm from "./components/LogEntryForm";
import DashboardView from "./components/DashboardView";
import MonthSpreadsheet from "./components/MonthSpreadsheet";
import AdminLogin from "./components/AdminLogin";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "./supabaseClient";
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
  FileText,
  Database,
  AlertTriangle,
  RefreshCw,
  Key
} from "lucide-react";

export default function App() {
  // State Initialization
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [teamLocations, setTeamLocations] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("digital_logbook_team_locations");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return { ...DEFAULT_TEAM_LOCATIONS, ...parsed };
        }
      }
    } catch (e) {
      console.warn("localStorage team locations load failed", e);
    }
    return DEFAULT_TEAM_LOCATIONS;
  });
  const [currentView, setCurrentView] = useState<ViewState>("entry");

  // Supabase Integration States
  const [supabaseStatus, setSupabaseStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string | null>(null);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState<boolean>(true);

  // Password Changing Modal States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState<boolean>(false);
  const [currPassword, setCurrPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState<string>("");

  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("digital_logbook_admin_unlocked") === "1";
    } catch {
      return false;
    }
  });
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Selected date for manual log entries (initialize to today's date formatted as YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });


  // Fetch logs from Supabase
  const fetchLogs = async () => {
    setIsLoadingSupabase(true);
    setSupabaseStatus("connecting");
    try {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .order("createdAt", { ascending: false });

      if (error) throw error;

      if (data) {
        setLogs(data as LogEntry[]);
        try {
          localStorage.setItem("digital_logbook_data", JSON.stringify(data));
        } catch (e) {
          console.warn("LocalStorage caching disabled inside iframe sandbox:", e);
        }
        setSupabaseStatus("connected");
        setSupabaseErrorMsg(null);
      }
    } catch (error: any) {
      console.error("Supabase error fetching logs:", error);
      setSupabaseStatus("error");
      setSupabaseErrorMsg(error?.message || "Could not connect to Supabase");
      
      // Fallback to local storage if offline
      try {
        const stored = localStorage.getItem("digital_logbook_data");
        if (stored) {
          setLogs(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Local storage fallback error:", e);
      }
    } finally {
      setIsLoadingSupabase(false);
    }
  };

  // Fetch team locations from Supabase
  const fetchTeamLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "team_locations")
        .maybeSingle();

      if (error) throw error;

      if (data && data.value) {
        const parsed = JSON.parse(data.value);
        if (parsed && typeof parsed === "object") {
          const merged = { ...DEFAULT_TEAM_LOCATIONS, ...parsed };
          setTeamLocations(merged);
          try {
            localStorage.setItem("digital_logbook_team_locations", JSON.stringify(merged));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Could not retrieve custom team location rules:", err);
    }
  };

  const handleUpdateTeamLocations = async (updated: Record<string, string[]>) => {
    setTeamLocations(updated);
    try {
      localStorage.setItem("digital_logbook_team_locations", JSON.stringify(updated));
    } catch (e) {}

    // Find if any existing logs need their team field updated to match the reshuffled location rules
    const updatedLogs = logs.map(log => {
      if (log.municipality && log.municipality.trim() !== "") {
        // Find which team currently contains this municipality
        const newTeam = Object.keys(updated).find(teamKey => 
          (updated[teamKey] || []).includes(log.municipality)
        );
        const isLocationalTeam = log.team && !log.team.startsWith("Team 1 ") && !log.team.startsWith("Team 9 ");
        if (newTeam && isLocationalTeam && log.team !== newTeam) {
          return { ...log, team: newTeam };
        }
      }
      return log;
    });

    const changedLogs = updatedLogs.filter((log, idx) => log.team !== logs[idx].team);
    if (changedLogs.length > 0) {
      saveLogsLocally(updatedLogs);
      // Bulk update changes in Supabase
      try {
        const { error: bulkError } = await supabase
          .from("attendance_logs")
          .upsert(changedLogs);
        if (bulkError) throw bulkError;
      } catch (dbErr) {
        console.error("Error updating team assignments for logs in Supabase:", dbErr);
      }
    }

    try {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({ key: "team_locations", value: JSON.stringify(updated) });
      if (error) throw error;
    } catch (err) {
      console.error("Error saving team locations to Supabase:", err);
    }
  };

  // Load logs on mount
  useEffect(() => {
    // Initial load from local storage to keep it responsive (Offline-first / cached)
    try {
      const stored = localStorage.getItem("digital_logbook_data");
      if (stored) {
        setLogs(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Local cache initial load error:", e);
    }

    fetchLogs();
    fetchTeamLocations();
  }, []);

  // Sync state to local storage (As backup / helper)
  const saveLogsLocally = (updatedLogs: LogEntry[]) => {
    setLogs(updatedLogs);
    try {
      localStorage.setItem("digital_logbook_data", JSON.stringify(updatedLogs));
    } catch (e) {
      console.warn("LocalStorage saving disabled inside iframe sandbox:", e);
    }
  };

  // Add Log Entry callback
  const handleAddLog = async (newEntry: Omit<LogEntry, "id" | "createdAt">) => {
    const entry: LogEntry = {
      ...newEntry,
      id: generateId(),
      createdAt: Date.now()
    };
    
    // Optimistic Update
    const updated = [entry, ...logs];
    saveLogsLocally(updated);

    try {
      const { error } = await supabase
        .from("attendance_logs")
        .insert([entry]);

      if (error) throw error;
      setSupabaseStatus("connected");
    } catch (err: any) {
      console.error("Supabase Add Log Error:", err);
      setSupabaseStatus("error");
      setSupabaseErrorMsg(err?.message || "Failed to insert record into Supabase");
    }
  };

  // Edit/Update Log callback
  const handleUpdateLog = async (updated: LogEntry) => {
    // Optimistic Update
    const index = logs.findIndex(l => l.id === updated.id);
    if (index !== -1) {
      const copy = [...logs];
      copy[index] = { ...updated };
      saveLogsLocally(copy);
    }

    try {
      const { error } = await supabase
        .from("attendance_logs")
        .update({
          name: updated.name,
          team: updated.team,
          brgy: updated.brgy,
          municipality: updated.municipality,
          province: updated.province,
          contactNumber: updated.contactNumber,
          purpose: updated.purpose,
          timeIn: updated.timeIn,
          timeOut: updated.timeOut,
          date: updated.date,
          createdAt: updated.createdAt
        })
        .eq("id", updated.id);

      if (error) throw error;
      setSupabaseStatus("connected");
    } catch (err: any) {
      console.error("Supabase Update Log Error:", err);
      setSupabaseStatus("error");
      setSupabaseErrorMsg(err?.message || "Failed to update record in Supabase");
    }
  };

  // Delete Log callback
  const handleDeleteLog = async (id: string) => {
    // Optimistic Update
    const filtered = logs.filter(l => l.id !== id);
    saveLogsLocally(filtered);

    try {
      const { error } = await supabase
        .from("attendance_logs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setSupabaseStatus("connected");
    } catch (err: any) {
      console.error("Supabase Delete Log Error:", err);
      setSupabaseStatus("error");
      setSupabaseErrorMsg(err?.message || "Failed to delete record from Supabase");
    }
  };

  // Import Log list backup callback
  const handleImportLogs = async (importedList: LogEntry[]) => {
    if (importedList.length === 0) return;
    saveLogsLocally(importedList);

    try {
      setIsLoadingSupabase(true);
      const { error } = await supabase
        .from("attendance_logs")
        .upsert(importedList);

      if (error) throw error;
      setSupabaseStatus("connected");
      setSupabaseErrorMsg(null);
    } catch (err: any) {
      console.error("Supabase Import Logs Error:", err);
      setSupabaseStatus("error");
      setSupabaseErrorMsg(err?.message || "Failed to sync imported data to Supabase");
    } finally {
      setIsLoadingSupabase(false);
    }
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
  const handleSeedMonthData = async (monthKey: string) => {
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
          team: "Team 8 (Laoag City)",
          brgy: "San Jose",
          municipality: "Laoag City",
          province: "Ilocos Norte",
          contactNumber: "09171234567",
          purpose: "COA Field Audit",
          timeIn: `0${inHour}:00`,
          timeOut: `${outHour}:00`,
          date: dateStr,
          createdAt: new Date(`${dateStr}T12:00:00`).getTime()
        });
      }
    }

    const compiled = [...customSampleLogs, ...logs];
    saveLogsLocally(compiled);

    try {
      setIsLoadingSupabase(true);
      const { error } = await supabase
        .from("attendance_logs")
        .upsert(customSampleLogs);

      if (error) throw error;
      setSupabaseStatus("connected");
      setSupabaseErrorMsg(null);
    } catch (err: any) {
      console.error("Supabase Seed Error:", err);
      setSupabaseStatus("error");
      setSupabaseErrorMsg(err?.message || "Failed to push sample data to Supabase");
    } finally {
      setIsLoadingSupabase(false);
    }
  };

  // Full calendar year seeder (disabled: no mock/pre-filled generation)
  const handleSeedFullYear = () => {
    // intentionally left blank
  };

  // Clear all database logs (ADMIN ONLY)
  const handleClearAllRecords = () => {
    if (!adminUnlocked) {
      // Do not open destructive modal for non-admin users.
      return;
    }
    setShowClearConfirm(true);
  };

  // Change Admin Password in Supabase Settings
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    const cp = currPassword.trim();
    const np = newPassword.trim();
    const npc = newPasswordConfirm.trim();

    if (!cp || !np || !npc) {
      setChangePasswordError("All password fields are required.");
      return;
    }

    if (np !== npc) {
      setChangePasswordError("New passwords do not match.");
      return;
    }

    setChangePasswordLoading(true);

    try {
      // Fetch currently stored password
      const { data, error: dbError } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "admin_password")
        .maybeSingle();

      const actualCurrent = data ? data.value : " ";

      if (dbError) {
        console.warn("Could not retrieve existing key for validation :", dbError.message);
      }

      if (cp !== actualCurrent) {
        setChangePasswordError("The current password you entered is incorrect.");
        setChangePasswordLoading(false);
        return;
      }

      // Upsert new password in Supabase admin_settings
      const { error: updateError } = await supabase
        .from("admin_settings")
        .upsert({ key: "admin_password", value: np });

      if (updateError) {
        throw new Error(`Failed to update password in database. Please verify if 'admin_settings' table exists with columns 'key' and 'value'. Original error: ${updateError.message}`);
      }

      setChangePasswordSuccess("Admin password was successfully updated in your live Supabase database!");
      setCurrPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (err: any) {
      console.error("Change Password error:", err);
      setChangePasswordError(err?.message || "Failed to edit admin password.");
    } finally {
      setChangePasswordLoading(false);
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

  const requireAdmin = (nextView: ViewState) => {
    if (nextView === "entry") {
      setCurrentView("entry");
      return;
    }

    if (!adminUnlocked) {
      setCurrentView("entry");
      // Login component is shown when attempting to open dashboard/spreadsheet.
      // We will switch to it via `adminUnlockedGateView`.
      setAdminUnlocked(false);
    } else {
      setCurrentView(nextView);
    }
  };

  const lockAdmin = () => {
    setAdminUnlocked(false);
    try {
      sessionStorage.removeItem("digital_logbook_admin_unlocked");
    } catch {
      // ignore
    }
    setCurrentView("entry");
  };

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
                      lockAdmin();
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
                  Attendance Monitoring
                </span>
                <span className="text-xs font-mono font-medium text-slate-450 uppercase tracking-wider hidden sm:inline-block">
                  | Digital Logbook
                </span>
              </div>
            </div>

            {/* Current View Label Indicator & Database status */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold text-slate-600 uppercase">
                <Activity className="w-3 h-3 text-slate-500 animate-pulse" />
                <span>Workspace: {currentView}</span>
              </div>

              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase transition-all ${
                supabaseStatus === "connected"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : supabaseStatus === "connecting"
                  ? "bg-sky-50 text-sky-100 text-sky-700 border border-sky-100"
                  : "bg-amber-50 text-amber-100 text-amber-700 border border-amber-100"
              }`}>
                {supabaseStatus === "connecting" && (
                  <>
                    <RefreshCw className="w-3 h-3 text-sky-500 animate-spin" />
                    <span>Connecting Database</span>
                  </>
                )}
                {supabaseStatus === "connected" && (
                  <>
                    <Database className="w-3 h-3 text-emerald-500" />
                    <span>Supabase Live</span>
                  </>
                )}
                {supabaseStatus === "error" && (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" />
                    <span>Offline Cache</span>
                  </>
                )}
              </div>

              {adminUnlocked && currentView !== "entry" && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrPassword("");
                    setNewPassword("");
                    setNewPasswordConfirm("");
                    setChangePasswordError(null);
                    setChangePasswordSuccess(null);
                    setShowChangePasswordModal(true);
                  }}
                  className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold text-indigo-700 uppercase cursor-pointer transition-all"
                  title="Change database admin password"
                >
                  <Key className="w-3 h-3 text-indigo-500" />
                  <span className="hidden sm:inline">Change Password</span>
                  <span className="inline sm:hidden">Key</span>
                </button>
              )}
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
                  onClick={() => lockAdmin()}
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

      {/* Global Status/Analytics Strip (High End Visual Polish) - Admin only */}
      {adminUnlocked && currentView !== "entry" && (
        <div className="bg-slate-950 text-white border-y border-slate-800 py-3.5 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 divide-x divide-slate-800 text-center md:text-left">
            <div className="px-2">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">CURRENTLY IN OFFICE</span>
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
              <span className="text-[10px] bg-slate-800 text-slate-300 rounded px-1 text-center font-mono font-medium">Total</span>
            </div>
          </div>

          <div className="px-2">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">ACTIVE TEAMS</span>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-xl font-display font-bold text-purple-400">{stats.activeTeamsCount}</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 rounded px-1 text-center font-mono font-medium">Team/s</span>
            </div>
          </div>

        </div>
      </div>
      )}
      
      {supabaseStatus === "error" && (
        <div id="supabase_setup_callout" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 font-sans">
                  Digital Logbook Real-time Sync Setup Required
                </h4>
                <p className="text-xs text-slate-650 mt-1 font-sans leading-relaxed">
                  Your application is successfully loaded and mapped to the Supabase backend at <strong className="font-mono text-slate-800">apwrqyyxufwngtzbfbnj</strong>. However, the connection returned an error: <code className="font-mono bg-amber-100/60 px-1.5 py-0.5 rounded text-[11px] text-amber-900">{supabaseErrorMsg}</code>. This usually means your database does not contain the <code className="font-mono bg-amber-100/60 px-1.5 py-0.5 rounded font-semibold">attendance_logs</code> table.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4.5 overflow-hidden relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-sky-400" />
                  SQL Setup Query
                </span>
                <span className="text-[9px] bg-sky-950 text-sky-300 border border-sky-900 px-2 py-0.5 rounded font-mono font-bold uppercase">
                  Run inside Supabase SQL Editor
                </span>
              </div>
              
              <pre className="text-[10px] sm:text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre p-0.5 max-h-48 select-all scrollbar-thin">

              </pre>
            </div>

            <p className="text-[11px] text-slate-550 font-sans flex items-center gap-1.5 pt-0.5 border-t border-amber-200/50">
              <span className="text-sm shrink-0">💡</span> 
              <span>
                To configure this: open your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-slate-800 font-bold underline hover:text-slate-950">Supabase Console</a>, navigate to the <strong>SQL Editor</strong>, open a new query block, paste the script above, and click <strong>Run</strong>. The logbook will immediately connect and sync live data!
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Main Workspace Frame Container (Dynamic Animations) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
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
                teamLocations={teamLocations}
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
              {!adminUnlocked ? (
                <AdminLogin onSuccess={() => {
                  setAdminUnlocked(true);
                  try {
                    sessionStorage.setItem("digital_logbook_admin_unlocked", "1");
                  } catch (e) {}
                }} />
              ) : (
                <DashboardView 
                  logs={logs}
                  selectedYear={selectedYear}
                  setSelectedYear={setSelectedYear}
                  onSelectMonth={(monthKey) => {
                    setSelectedMonthKey(monthKey);
                    setCurrentView("spreadsheet"); // Downward arrow target
                  }}
                  onSeedData={handleSeedFullYear}
                  teamLocations={teamLocations}
                  onUpdateTeamLocations={handleUpdateTeamLocations}
                />
              )}
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
              {!adminUnlocked ? (
                <AdminLogin onSuccess={() => {
                  setAdminUnlocked(true);
                  try {
                    sessionStorage.setItem("digital_logbook_admin_unlocked", "1");
                  } catch (e) {}
                }} />
              ) : (
                <MonthSpreadsheet 
                  logs={logs}
                  month={currentMonthData}
                  year={selectedYear}
                  onUpdateLog={handleUpdateLog}
                  onDeleteLog={handleDeleteLog}
                  onAddLog={handleAddLog}
                  onSeedMonthData={handleSeedMonthData}
                  onImportLogs={handleImportLogs}
                  teamLocations={teamLocations}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Utility Footer Drawer - purging option & self declaration details */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 border-t border-slate-200 pt-6 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-550 font-sans font-medium">
          <div className="text-left">
            <span className="font-semibold text-slate-800">Digital Logbook System v1.1</span> — CS 2026.
            <p className="text-[10px] text-slate-400 mt-0.5">Digital logbook for office use</p>
          </div>
          
            <div className="flex items-center gap-3">
              {adminUnlocked && logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllRecords}
                  className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 border border-transparent text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  title="Clears all logged entries for all years from local memory"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All Logs
                </button>
              )}
            </div>

        </div>
      </footer>

      {showClearConfirm && adminUnlocked && (
        <div id="clear_all_confirm_modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="bg-rose-50 p-2.5 rounded-full">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-display font-bold text-slate-900">Clear All Logs?</h3>
            </div>
            <p className="text-xs text-slate-550 font-sans">
              Are you sure you want to permanently delete all logged entries for all years? This action is irreversible.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Runtime guard: do nothing unless admin is unlocked.
                  if (!adminUnlocked) return;

                  saveLogsLocally([]);
                  setShowClearConfirm(false);
                  try {
                    const { error } = await supabase
                      .from("attendance_logs")
                      .delete()
                      .neq("id", "");
                    if (error) throw error;
                    setSupabaseStatus("connected");
                  } catch (err: any) {
                    console.error("Supabase clear error:", err);
                    setSupabaseStatus("error");
                    setSupabaseErrorMsg(err?.message || "Failed to clear records on Supabase");
                  }
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangePasswordModal && (
        <div id="change_password_modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-indigo-600 border-b border-slate-100 pb-3">
              <div className="bg-indigo-50 p-2.5 rounded-full">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-slate-900">Change Admin Password</h3>
                <p className="text-[10px] text-slate-450 font-sans">Will update record settings inside your remote Supabase database</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currPassword}
                  onChange={(e) => setCurrPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter custom new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="Repeat custom password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {changePasswordError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold">
                  {changePasswordError}
                </div>
              )}

              {changePasswordSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold">
                  {changePasswordSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={changePasswordLoading}
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-55 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {changePasswordLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

