import React, { useState, useEffect } from "react";
import { LogEntry } from "../types";
import { 
  PROVINCES, 
  MUNICIPALITIES_BY_PROVINCE, 
  BARANGAYS_BY_MUNICIPALITY, 
  TEAMS, 
  generateId 
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
  const [purpose, setPurpose] = useState("");


  const disableMunicipalityFields = false;





  
  const [timeIn, setTimeIn] = useState("08:00");
  const [timeOut, setTimeOut] = useState("");
  const [hasTimeOut, setHasTimeOut] = useState(false);

  // Status messages
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Sync municipalities on province change
  useEffect(() => {
    const munis = MUNICIPALITIES_BY_PROVINCE[province] || [];
    if (munis.length > 0) {
      setMunicipality(munis[0]);
    } else {
      setMunicipality("");
    }
  }, [province]);

  // Sync barangays on municipality change
  useEffect(() => {
    const brgys = BARANGAYS_BY_MUNICIPALITY[municipality] || [];
    if (brgys.length > 0) {
      setBarangay(brgys[0]);
    } else {
      setBarangay("");
    }
  }, [municipality]);

  // Quick fill times
  const handleSetTimeInNow = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setTimeIn(`${hh}:${mm}`);
  };

  const handleSetTimeOutNow = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setTimeOut(`${hh}:${mm}`);
    setHasTimeOut(true);
  };

  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    if (!name.trim()) {
      setNotification({ message: "Please enter agent name", type: "error" });
      return;
    }

    if (!selectedDate) {
      setNotification({ message: "Please select a log date", type: "error" });
      return;
    }

    if (!timeIn) {
      setNotification({ message: "Please provide Time-In", type: "error" });
      return;
    }

    if (hasTimeOut && timeOut && timeOut < timeIn) {

      setNotification({ message: "Time-Out cannot be prior to Time-In", type: "error" });
      return;
    }

    onAddLog({
      name: name.trim(),
      team,
      brgy: barangay,
      municipality,
      province,
      contactNumber: contactNumber.trim(),
      purpose: purpose.trim(),
      timeIn,

      timeOut: hasTimeOut ? timeOut : "",
      date: selectedDate
    });




    // Success notify
    setNotification({ 
      message: `Successfully logged ${name.trim()}!`, 
      type: "success" 
    });

    // Reset part of form
    setName("");
    const defaultTime = "08:00";
    setTimeIn(defaultTime);
    setTimeOut("");
    setHasTimeOut(false);

    // Auto-clear notification after 3s
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  return (
    <div id="logbook_entry_panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Logger Input Form Column */}
      <div className="lg:col-span-7 bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-8 transition-all hover:shadow-sm">
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

        {notification && (
          <div 
            id="notification_banner"
            className={`p-3.5 mb-5 rounded-xl border text-sm flex items-center gap-2.5 transition-all ${
              notification.type === "success" 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}
          >
            <CheckCircle className={`w-4 h-4 shrink-0 ${notification.type === "success" ? "text-emerald-600" : "text-rose-600"}`} />
            <span className="font-sans font-medium">{notification.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
                Assigned Team
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


              <div>

                <label htmlFor="agent_municipality" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Municipality
                </label>
                <select
                  id="agent_municipality"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  disabled={disableMunicipalityFields}
                  className={`w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 cursor-pointer ${
                    disableMunicipalityFields ? "opacity-40 border-slate-200 cursor-not-allowed" : ""
                  }`}

                >
                  {(MUNICIPALITIES_BY_PROVINCE[province] || []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="agent_brgy" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Barangay (Brgy)
                </label>
                <input
                  type="text"
                  id="agent_brgy"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  disabled={disableMunicipalityFields}
                  placeholder="Type barangay"
                  className={`w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 ${
                    disableMunicipalityFields ? "opacity-40 border-slate-200 cursor-not-allowed" : ""
                  }`}

                />

              </div>

              <div>
                <label htmlFor="agent_contact" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Contact Number
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  id="agent_contact"
                  value={contactNumber}
                  onChange={(e) => {
                    // Keep only digits and limit to 11 (e.g., 09XXXXXXXXX)
                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setContactNumber(digitsOnly);
                  }}
                  placeholder="e.g. 09XXXXXXXXX"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950"
                  pattern="09[0-9]{9}"
                />
              </div>

              <div>
                <label htmlFor="agent_purpose" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Purpose
                </label>
                <input
                  type="text"
                  id="agent_purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Community visit"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950"
                />
              </div>


            </div>
          </div>


          {/* Time Tracking Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="time_in_picker" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Check-In time (In)
                </label>
                <button
                  type="button"
                  onClick={handleSetTimeInNow}
                  className="text-[10px] font-semibold text-slate-900 bg-slate-200 hover:bg-slate-300 transition-all rounded px-2 py-0.5"
                >
                  SET TO NOW
                </button>
              </div>
              <input
                type="time"
                id="time_in_picker"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950 font-mono text-center"
                required
              />
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="has_timeout_checkbox"
                    checked={hasTimeOut}
                    onChange={(e) => setHasTimeOut(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-950 accent-slate-950"
                  />
                  <label htmlFor="has_timeout_checkbox" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide cursor-pointer select-none">
                    Provide Out Time
                  </label>
                </div>
                {hasTimeOut && (
                  <button
                    type="button"
                    onClick={handleSetTimeOutNow}
                    className="text-[10px] font-semibold text-slate-900 bg-slate-200 hover:bg-slate-300 transition-all rounded px-2 py-0.5"
                  >
                    SET TO NOW
                  </button>
                )}
              </div>
              <input
                type="time"
                id="time_out_picker"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                disabled={!hasTimeOut}
                className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950 font-mono text-center ${
                  !hasTimeOut ? "opacity-40 border-slate-200" : "border-slate-300"
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            id="btn_submit_attendance"
            className="w-full bg-slate-950 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer focus:outline-none font-sans mt-3 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Enter attendance record</span>
          </button>
        </form>
      </div>

      {/* Summary Today table Column, corresponding to rightmost part of Left Sketch */}
      <div className="lg:col-span-5 bg-white rounded-2xl shadow-xs border border-slate-100 p-6 flex flex-col justify-between self-stretch">
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
            <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[380px] overflow-y-auto">
              <table id="today_quick_summary_table" className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th scope="col" className="px-3.5 py-2.5">Name</th>
                    <th scope="col" className="px-2.5 py-2.5 text-center">In</th>
                    <th scope="col" className="px-2.5 py-2.5 text-center">Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayLogs.slice(0, 15).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-900 truncate max-w-[130px]">{log.name}</div>
                        <span className="text-[9px] text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5 font-medium">{log.team}</span>
                      </td>
                      <td className="px-2.5 py-2.5 text-center font-mono font-medium text-emerald-700">
                        {log.timeIn}
                      </td>
                      <td className="px-2.5 py-2.5 text-center font-mono">
                        {log.timeOut ? (
                          <span className="text-slate-700 font-medium">{log.timeOut}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              const hh = String(now.getHours()).padStart(2, '0');
                              const mm = String(now.getMinutes()).padStart(2, '0');
                              onQuickLogOut(log.id, `${hh}:${mm}`);
                            }}
                            className="bg-sky-50 text-sky-800 border border-sky-200 text-[9px] px-2 py-0.5 rounded font-bold hover:bg-sky-100 active:bg-sky-200 transition-colors cursor-pointer"
                            title="Quick log out with current system time"
                          >
                            LOG OUT
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
