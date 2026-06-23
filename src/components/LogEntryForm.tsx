import React, { useState, useEffect, useMemo, FormEvent } from "react";
import { LogEntry } from "../types";
import { 
  PROVINCES, 
  MUNICIPALITIES_BY_PROVINCE, 
  BARANGAYS_BY_MUNICIPALITY, 
  TEAMS, 
  generateId,
  getAllowedMunicipalitiesForTeam
} from "../data";
import { Clock, Plus, Users, MapPin, CheckCircle, ArrowRight, User } from "lucide-react";

interface LogEntryFormProps {
  onAddLog: (entry: Omit<LogEntry, "id" | "createdAt">) => void;
  todayLogs: LogEntry[];
  onQuickLogOut: (id: string, time: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export default function LogEntryForm({ 
  onAddLog, 
  todayLogs, 
  onQuickLogOut,
  selectedDate,
  setSelectedDate
}: LogEntryFormProps) {
  // Form fields
  const [name, setName] = useState("");
  const [team, setTeam] = useState(TEAMS[0] || "");

  const [province, setProvince] = useState(PROVINCES[0] || "");
  const [municipality, setMunicipality] = useState("");
  const [barangay, setBarangay] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [purpose, setPurpose] = useState(" ");
  const [customPurpose, setCustomPurpose] = useState("");

  type LocationMode = "municipality" | "sk" | "barangay" | "others";
  const [locationMode, setLocationMode] = useState<LocationMode>("municipality");

  const [easyMode, setEasyMode] = useState(true);

  const [timeIn, setTimeIn] = useState("");



  // Status messages
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Determine if selected team has location specifics
  const hasLocationSpecifics = useMemo(() => {
    return !team.startsWith("Team 1 ") && !team.startsWith("Team 9 ");
  }, [team]);

  // Allowed municipalities for current team
  const allowedMunicipalities = useMemo(() => {
    // Special case: Office of the Supervising Auditor should see all municipalities/cities
    if (team.trim() === "Office of the Supervising Auditor") {
      return Object.values(MUNICIPALITIES_BY_PROVINCE).flat();
    }

    if (!hasLocationSpecifics) return [];
    return getAllowedMunicipalitiesForTeam(team);
  }, [team, hasLocationSpecifics]);

  // Sync municipalities and barangays immediately on team change
  useEffect(() => {
    if (!hasLocationSpecifics) {
      setProvince("");
      setMunicipality("");
      setBarangay("");
      setLocationMode("municipality");
      return;
    }

    setProvince("Ilocos Norte");

    let allowed = getAllowedMunicipalitiesForTeam(team);
    if (team.trim() === "Office of the Supervising Auditor") {
      allowed = Object.values(MUNICIPALITIES_BY_PROVINCE).flat();
    }
    const defaultMuni = allowed.length > 0 ? allowed[0] : "";

    // Only auto-set enabled fields based on current locationMode
    if (locationMode === "municipality") {
      setMunicipality(defaultMuni);
      const brgys = defaultMuni ? BARANGAYS_BY_MUNICIPALITY[defaultMuni] || [] : [];
      setBarangay(brgys[0] || "");
    } else if (locationMode === "sk") {
      // Keep municipality selection; just clear barangay helper
      setBarangay("");
    } else if (locationMode === "barangay") {
      // barangay enabled; keep municipality selection
      setBarangay(prev => (prev ? prev : ""));
    } else {
      // others: allow arbitrary text typing in barangay field
      setBarangay(prev => (prev ? prev : ""));
    }
  }, [team, hasLocationSpecifics, locationMode]);


  // When municipality is active, update barangay helper default (if barangay currently empty)
  useEffect(() => {
    if (!hasLocationSpecifics) return;
    if (locationMode !== "municipality") return;

    const brgys = BARANGAYS_BY_MUNICIPALITY[municipality] || [];
    setBarangay(prev => {
      if (prev && prev.trim().length > 0) return prev;
      return brgys[0] || "";
    });
  }, [municipality, hasLocationSpecifics, locationMode]);

  // Enforce disabling/clearing rules when locationMode changes
  useEffect(() => {
    if (!hasLocationSpecifics) return;

    if (locationMode === "municipality") {
      // Municipality enabled; Barangay should be enabled
      return;
    }

    if (locationMode === "sk") {
      // SK: keep municipality enabled/selection; barangay will be handled below
      return;
    }

    if (locationMode === "barangay") {
      // Barangay: keep municipality enabled/selection
      return;
    }

    if (locationMode === "others") {
      // Others: keep municipality selection optional
    }
  }, [locationMode, hasLocationSpecifics]);



  // Quick fill times
  // (Removed manual Time-In input; Time-In is auto set on submit)



  const handleSubmit = (e: FormEvent) => {

    e.preventDefault();

    // Auto-set Time-In to current system time (no manual input required)
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const autoTimeIn = `${hh}:${mm}`;


    if (!name.trim()) {
      setNotification({ message: "Please enter agent name", type: "error" });
      return;
    }

    if (hasLocationSpecifics) {
      // Requirements depend on selected radio choice
      if (locationMode === "municipality") {
        if (!municipality) {
          setNotification({ message: "Please select a municipality", type: "error" });
          return;
        }
        // Barangay is not required when Municipality/City is selected
      } else if (locationMode === "others") {
        if (!barangay.trim()) {
          setNotification({ message: "Please enter other location details", type: "error" });
          return;
        }
      } else {
        // SK and Barangay require Barangay value
        if (!barangay.trim()) {
          setNotification({ message: "Please enter or select a barangay", type: "error" });
          return;
        }
      }
    }


    if (!contactNumber.trim()) {
      setNotification({ message: "Please enter contact number", type: "error" });
      return;
    }

    if (contactNumber.trim().length !== 11) {
      setNotification({ message: "Contact number must be exactly 11 digits (e.g., 09XXXXXXXXX)", type: "error" });
      return;
    }

    const finalPurpose = purpose === "Others" ? customPurpose.trim() : purpose.trim();

    if (!finalPurpose) {
      setNotification({ message: "Please select or specify a purpose of visit", type: "error" });
      return;
    }

    if (!selectedDate) {
      setNotification({ message: "Please select a log date", type: "error" });
      return;
    }



    // Set timeIn explicitly for the submitted record
    setTimeIn(autoTimeIn);

    // Dynamic categorization of the location spec in the brgy column
    let finalBrgy = "";
    if (hasLocationSpecifics) {
      if (locationMode === "municipality") {
        finalBrgy = "";
      } else if (locationMode === "sk") {
        const cleaned = barangay.trim();
        if (cleaned && !cleaned.toLowerCase().includes("sk")) {
          finalBrgy = `${cleaned} (SK)`;
        } else {
          finalBrgy = cleaned;
        }
      } else if (locationMode === "others") {
        const cleaned = barangay.trim();
        if (cleaned && !cleaned.toLowerCase().includes("others") && !cleaned.toLowerCase().includes("(others)")) {
          finalBrgy = `${cleaned} (Others)`;
        } else {
          finalBrgy = cleaned;
        }
      } else {
        finalBrgy = barangay.trim();
      }
    }

    onAddLog({
      name: name.trim(),
      team,
      brgy: finalBrgy,
      municipality: hasLocationSpecifics ? municipality : "",
      province: hasLocationSpecifics ? province : "",
      contactNumber: contactNumber.trim(),
      purpose: finalPurpose,
      timeIn: autoTimeIn,
      timeOut: "",
      date: selectedDate
    });




    // Success notify
    setNotification({ 
      message: `Successfully logged ${name.trim()}!`, 
      type: "success" 
    });

    // Reset part of form
    setName("");
    setTimeIn("");
    setCustomPurpose("");


    // Auto-clear notification after 3s
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  return (
      <div id="logbook_entry_panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Logger Input Form Column */}
       <div className="lg:col-span-8 bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-8 transition-all hover:shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-2 rounded-lg">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-slate-950">New Attendance Log</h2>
              <p className="text-xs text-slate-500 font-sans">Complete values to check-in/out personnel</p>
            </div>
          </div>
          
          {/* Quick Date Picker */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-medium text-slate-500 font-sans">Log Date:</span>
            <input 
              type="date"
              id="log_date_selector"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950 font-mono"
            />
          </div>
        </div>

        {/* Compact vs Simple Mode Switcher */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl mb-6 items-center border border-slate-200/60 auto-cols-fr">
          <button
            type="button"
            onClick={() => setEasyMode(true)}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              easyMode 
                ? "bg-white text-slate-900 shadow-xs border border-slate-200" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span className="text-base"></span>
            <span>Simple Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setEasyMode(false)}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !easyMode 
                ? "bg-white text-slate-900 shadow-xs border border-slate-200" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span className="text-base"></span>
            <span>Standard Mode</span>
          </button>
        </div>

        {notification && (
          <div 
            id="notification_banner"
            className={`p-4 mb-6 rounded-xl border text-sm flex items-center gap-3 transition-all ${
              notification.type === "success" 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}
          >
            <CheckCircle className={`w-5 h-5 shrink-0 ${notification.type === "success" ? "text-emerald-600" : "text-rose-600"}`} />
            <span className="font-sans font-medium">{notification.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {easyMode ? (
            /* --- EASY/SIMPLE MODE (USER FRIENDLY FOR ALL AUDIENCES OF ALL AGES) --- */
            <div className="space-y-6 animate-fade-in">
              {/* Step 1: Who are you? */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-900 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">1</span>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Your Personal Details</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="easy_agent_name" className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <span>Full Name</span> <span className="text-rose-500 text-sm">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        id="easy_agent_name"
                        placeholder="Write your first and last name (e.g. Juan Dela Cruz)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 placeholder:text-slate-400 font-medium"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Please write your complete name so the personnel can identify you easily.</p>
                  </div>

                  <div>
                    <label htmlFor="easy_agent_contact" className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <span>Contact Number (Cellphone)</span> <span className="text-rose-500 text-sm">*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      id="easy_agent_contact"
                      value={contactNumber}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
                        setContactNumber(digitsOnly);
                      }}
                      placeholder="e.g. 09171234567"
                      required
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 placeholder:text-slate-400 font-mono font-medium"
                      pattern="09[0-9]{9}"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Must be an 11-digit mobile number starting with 09.</p>
                  </div>
                </div>
              </div>

              {/* Step 2: What is your team assignment? */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-900 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">2</span>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Your Assigned Team</h3>
                </div>

                <div>
                  <label htmlFor="easy_agent_team" className="block text-sm font-bold text-slate-700 mb-1.5">
                    Select your Group or Team
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                      id="easy_agent_team"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-slate-800 cursor-pointer appearance-none font-medium text-slate-800"
                    >
                      {TEAMS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Select which audit team or office division contains your assignment.</p>
                </div>
              </div>

              {/* Step 3: Location Specifics (if required) */}
              {hasLocationSpecifics && (
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">3</span>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Specifics</h3>
                  </div>

                  {/* HUGE TAP CARDS for Location Mode */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLocationMode("municipality")}
                      className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        locationMode === "municipality"
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-350"
                      }`}
                    >
                      <span className="block text-lg mb-1">🏛️</span>
                      <span className="text-xs sm:text-sm font-bold block">Municipality/City</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLocationMode("barangay")}
                      className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        locationMode === "barangay"
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-350"
                      }`}
                    >
                      <span className="block text-lg mb-1">🏡</span>
                      <span className="text-xs sm:text-sm font-bold block">Barangay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLocationMode("sk")}
                      className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        locationMode === "sk"
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-350"
                      }`}
                    >
                      <span className="block text-lg mb-1">⚡</span>
                      <span className="text-xs sm:text-sm font-bold block">Brgy SK</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLocationMode("others")}
                      className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        locationMode === "others"
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-350"
                      }`}
                    >
                      <span className="block text-lg mb-1">✨</span>
                      <span className="text-xs sm:text-sm font-bold block">Others</span>
                      <span className="text-[9px] opacity-75 hidden sm:block">Unlisted Location</span>
                    </button>
                  </div>

                  {/* Child inputs with spacious layouts */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-4">
                    <div>
                      <label htmlFor="easy_agent_muni" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Select Municipality/City <span className="text-rose-500">{locationMode === "municipality" ? "*" : ""}</span>
                      </label>
                      <div className="relative">
                        <select
                          id="easy_agent_muni"
                          value={municipality}
                          onChange={(e) => setMunicipality(e.target.value)}
                          required={locationMode === "municipality"}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-850 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-800"
                        >
                          {locationMode === "others" && (
                            <option value="">N/A - Others / Unlisted</option>
                          )}
                          {allowedMunicipalities.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {locationMode !== "municipality" && (
                      <div>
                        <label htmlFor="easy_agent_brgy" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          {locationMode === "others" ? "Other Location Details" : "Name of Barangay"} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="easy_agent_brgy"
                          value={barangay}
                          onChange={(e) => setBarangay(e.target.value)}
                          placeholder={locationMode === "others" ? "e.g. Multi-barangay, Provincial Hall, Main Depot" : "e.g. Barangay 5, San Francisco"}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-850 focus:outline-none focus:ring-1 focus:ring-slate-800"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Purpose of Check-in */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-900 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                    {hasLocationSpecifics ? "4" : "3"}
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Purpose of Visit</h3>
                </div>

                <div>
                  <label htmlFor="easy_agent_purpose" className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <span>What is your assignment or purpose?</span> <span className="text-rose-500 text-sm">*</span>
                  </label>
                  
                  <div className="relative">
                    <select
                      id="easy_agent_purpose"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-medium cursor-pointer appearance-none"
                    >
                        <option value="Submission of documents for audit">Submission of documents for audit</option>
                        <option value="Follow-up of submitted documents">Follow-up of submitted documents</option>
                        <option value="Request for audit clearance">Request for audit clearance</option>
                        <option value="Verification of audit findings">Verification of audit findings</option>
                        <option value="Inquiry regarding audit requirements">Inquiry regarding audit requirements</option>
                        <option value="Coordination on finnancial or accounting matters">Coordination on finnancial or accounting matters</option>
                        <option value="Submission of liquidation reports">Submission of liquidation reports</option>
                        <option value="Retrieval of approved documents">Retrieval of approved documents</option>
                        <option value="Attendance at a scheduled meeting or conference">Attendance at a scheduled meeting or conference</option>
                        <option value="Compliance with COA requirements">Compliance with COA requirements</option>
                        <option value="Request for certification or official records">Request for certification or official records</option>
                        <option value="Request for certification or official records">Consultation regarding government fund utilization</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-sm">▼</div>
                  </div>

                  {purpose === "Others" && (
                    <div className="mt-3 animate-fade-in">
                      <label htmlFor="easy_custom_purpose" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <span>Please Specify Purpose Details</span> <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="easy_custom_purpose"
                        value={customPurpose}
                        onChange={(e) => setCustomPurpose(e.target.value)}
                        placeholder="e.g. System inspection, emergency check, equipment repair"
                        required
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-slate-300 placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  )}

                  {/* EMOJI QUICK TAGS - Absolute Lifesaver for All Ages! */}

                </div>
              </div>
            </div>
          ) : (
            /* --- ORIGINAL/COMPACT STANDARD MODE FOR ADVANCED OR BATCH ENTRY --- */
            <div className="space-y-5 animate-fade-in">
              {/* Personnel Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="agent_name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      id="agent_name"
                      placeholder="e.g. Maria Clara"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="agent_team" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select assigned Team
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      id="agent_team"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 appearance-none cursor-pointer"
                    >
                      {TEAMS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Location Stack */}
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-4">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  LOCATION SPECIFICS
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hasLocationSpecifics ? (
                    <>
                      <div className="sm:col-span-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${
                            locationMode === "municipality"
                              ? "bg-white border-slate-205"
                              : "bg-slate-50 border-slate-200"
                          }`}>
                            <input
                              type="radio"
                              name="locationMode"
                              value="municipality"
                              checked={locationMode === "municipality"}
                              onChange={() => setLocationMode("municipality")}
                              className="accent-slate-950"
                            />
                            <span className="font-bold text-slate-700">Muni/City</span>
                          </label>

                          <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${
                            locationMode === "sk"
                              ? "bg-white border-slate-205"
                              : "bg-slate-50 border-slate-200"
                          }`}>
                            <input
                              type="radio"
                              name="locationMode"
                              value="sk"
                              checked={locationMode === "sk"}
                              onChange={() => setLocationMode("sk")}
                              className="accent-slate-950"
                            />
                            <span className="font-bold text-slate-700">SK</span>
                          </label>

                          <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${
                            locationMode === "barangay"
                              ? "bg-white border-slate-205"
                              : "bg-slate-50 border-slate-200"
                          }`}>
                            <input
                              type="radio"
                              name="locationMode"
                              value="barangay"
                              checked={locationMode === "barangay"}
                              onChange={() => setLocationMode("barangay")}
                              className="accent-slate-950"
                            />
                            <span className="font-bold text-slate-700">Barangay</span>
                          </label>

                          <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${
                            locationMode === "others"
                              ? "bg-white border-slate-205"
                              : "bg-slate-50 border-slate-200"
                          }`}>
                            <input
                              type="radio"
                              name="locationMode"
                              value="others"
                              checked={locationMode === "others"}
                              onChange={() => setLocationMode("others")}
                              className="accent-slate-950"
                            />
                            <span className="font-bold text-slate-700">Others</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="agent_municipality" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Municipality <span className="text-rose-500">{locationMode === "municipality" ? "*" : ""}</span>
                        </label>
                        <select
                          id="agent_municipality"
                          value={municipality}
                          onChange={(e) => setMunicipality(e.target.value)}
                          required={locationMode === "municipality"}
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 cursor-pointer border bg-white border-slate-200"
                        >
                          {locationMode === "others" && (
                            <option value="">N/A - Others</option>
                          )}
                          {allowedMunicipalities.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="agent_brgy" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {locationMode === "others" ? "Other Location Details" : "Barangay (Brgy)"} <span className="text-rose-500">{locationMode !== "municipality" ? "*" : ""}</span>
                        </label>
                        <input
                          type="text"
                          id="agent_brgy"
                          value={barangay}
                          onChange={(e) => setBarangay(e.target.value)}
                          placeholder={locationMode === "others" ? "e.g. Multi-barangay, provincial office, etc." : "e.g. Brgy. 1, San Francisco"}
                          required={locationMode !== "municipality"}
                          disabled={locationMode === "municipality"}
                          className={`w-full rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 border ${
                            locationMode === "municipality"
                              ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-white border-slate-200"
                          }`}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 bg-slate-100/50 border border-dashed border-slate-200 rounded-xl p-3 flex items-center justify-center text-center text-xs text-slate-500 font-sans">
                      Location specifics are not required or applicable for Team 1 / Team 9
                    </div>
                  )}

                  <div>
                    <label htmlFor="agent_contact" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Contact Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      id="agent_contact"
                      value={contactNumber}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
                        setContactNumber(digitsOnly);
                      }}
                      placeholder="e.g. 09XXXXXXXXX"
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950"
                      pattern="09[0-9]{9}"
                    />
                  </div>

                   <div>
                    <label htmlFor="agent_purpose" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Purpose <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="agent_purpose"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 cursor-pointer appearance-none"
                      >
                        <option value="Submission of documents for audit">Submission of documents for audit</option>
                        <option value="Follow-up of submitted documents">Follow-up of submitted documents</option>
                        <option value="Request for audit clearance">Request for audit clearance</option>
                        <option value="Verification of audit findings">Verification of audit findings</option>
                        <option value="Inquiry regarding audit requirements">Inquiry regarding audit requirements</option>
                        <option value="Coordination on finnancial or accounting matters">Coordination on finnancial or accounting matters</option>
                        <option value="Submission of liquidation reports">Submission of liquidation reports</option>
                        <option value="Retrieval of approved documents">Retrieval of approved documents</option>
                        <option value="Attendance at a scheduled meeting or conference">Attendance at a scheduled meeting or conference</option>
                        <option value="Compliance with COA requirements">Compliance with COA requirements</option>
                        <option value="Request for certification or official records">Request for certification or official records</option>
                        <option value="Request for certification or official records">Consultation regarding government fund utilization</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
                    </div>

                    {purpose === "Others" && (
                      <div className="mt-2 animate-fade-in">
                        <input
                          type="text"
                          id="agent_custom_purpose"
                          value={customPurpose}
                          onChange={(e) => setCustomPurpose(e.target.value)}
                          placeholder="Specify custom purpose details"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 font-sans"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            id="btn_submit_attendance"
            className="w-full bg-slate-950 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer focus:outline-none font-sans mt-4 text-sm sm:text-base active:scale-[0.99] border border-transparent"
          >
            <Plus className="w-5 h-5" />
            <span>Submit Attendance Check-In 📝</span>
          </button>
        </form>
      </div>

      {/* Summary Today table Column, corresponding to rightmost part of Left Sketch */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-xs border border-slate-100 p-4 flex flex-col justify-between self-stretch">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-base font-display font-semibold text-slate-950">Logged Today</h3>
              <p className="text-xs text-slate-500 font-sans">Active personnel records on {selectedDate}</p>
            </div>
            <span className="bg-slate-100 text-slate-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
              {todayLogs.length} Records
            </span>
          </div>

          {todayLogs.length === 0 ? (
            <div id="empty_today_notice" className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-slate-100 rounded-xl px-4 my-4">
              <Users className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-sans font-medium">No logs for today yet.</p>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">Fill out the left form to check-in your first agent!</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 max-h-[520px] overflow-y-auto p-3">
              <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                <span className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider">Active records</span>
                <span className="text-[10.5px] text-slate-500 font-mono">Showing {Math.min(todayLogs.length, 15)} of {todayLogs.length}</span>
              </div>

              <div className="space-y-3">
                {todayLogs.slice(0, 15).map((log) => {
                  const isActive = !log.timeOut;
                  return (
                    <div
                      key={log.id}
                      className="bg-white border border-slate-100 rounded-lg p-2.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <Users className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-950 truncate max-w-[180px] text-[13px]">{log.name}</div>
                              <span className="text-[9px] text-slate-600 bg-slate-100 rounded-md px-1.5 py-0.5 font-medium inline-flex mt-1">{log.team}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
                              <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">In</div>
                              <div className="text-[13px] font-mono font-semibold text-emerald-800">{log.timeIn}</div>
                            </div>

                            <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Out</div>
                              <div className="text-[13px] font-mono font-semibold text-slate-800">
                                {log.timeOut ? log.timeOut : "—"}
                              </div>
                            </div>
                          </div>

                          {isActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                const now = new Date();
                                const hh = String(now.getHours()).padStart(2, '0');
                                const mm = String(now.getMinutes()).padStart(2, '0');
                                onQuickLogOut(log.id, `${hh}:${mm}`);
                              }}
                              aria-label={`Quick log out for ${log.name}`}
                              className="bg-sky-50 text-sky-900 border border-sky-200 text-[10px] px-3 py-1.5 rounded-lg font-extrabold hover:bg-sky-100 active:bg-sky-200 transition-colors cursor-pointer shadow-xs"
                              title="Quick log out with current system time"
                            >
                              LOG OUT
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg">
                              Checked out
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-4">
          <p className="text-[10px] text-amber-800 leading-relaxed font-sans font-medium flex items-start gap-1.5">
            <span className="inline-block bg-amber-200 text-amber-900 w-4 h-4 rounded-full text-center text-[9px] font-bold shrink-0 mt-0.5">i</span>
            <span>Clicking <strong>LOG OUT</strong> sets an agent's check-out time to this moment automatically. Access the monthly dashboard with the diamond selector to edit earlier historical entries.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
