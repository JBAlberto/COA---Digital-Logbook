import React, { useState, useMemo } from "react";
import { LogEntry, MonthData } from "../types";
import { MONTHS, TEAMS, MUNICIPALITIES_BY_PROVINCE, DEFAULT_TEAM_LOCATIONS, getTeamDisplayLabel } from "../data";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CalendarDays, BarChart2, PieChart as PieIcon, ListFilter, Sliders, Database, ArrowLeftRight, Shuffle, Settings2, Check, X, Search, Undo } from "lucide-react";

interface DashboardViewProps {
  logs: LogEntry[];
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  onSelectMonth: (monthKey: string) => void;
  onSeedData: () => void;
  teamLocations?: Record<string, string[]>;
  onUpdateTeamLocations?: (updated: Record<string, string[]>) => void;
}

const COLORS = [
  "#0f172a", // Slate 900
  "#475569", // Slate 600
  "#0284c7", // Sky 600
  "#0ea5e9", // Sky 500
  "#a855f7", // Purple 500
  "#f43f5e", // Rose 500
  "#10b981", // Emerald 500
  "#f59e0b", // Amber 500
  "#6366f1"  // Indigo 500
];

export default function DashboardView({
  logs,
  selectedYear,
  setSelectedYear,
  onSelectMonth,
  onSeedData,
  teamLocations,
  onUpdateTeamLocations
}: DashboardViewProps) {
  const [chartMetric, setChartMetric] = useState<
    "team" | "brgy" | "municipality" | "province"
  >("team");

  // Reshuffle Teams States
  const [showReshuffleModal, setShowReshuffleModal] = useState(false);
  const [activeReshuffleTeam, setActiveReshuffleTeam] = useState<string>(
    TEAMS.find(t => !t.startsWith(" ") && !t.startsWith("Team 1 ")) || TEAMS[1]
  );
  const [tempTeamLocations, setTempTeamLocations] = useState<Record<string, string[]>>({});
  const [searchMuni, setSearchMuni] = useState("");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleToggleMuni = (muni: string) => {
    setTempTeamLocations(prev => {
      const copy = { ...prev };
      const currentList = copy[activeReshuffleTeam] || [];
      const exists = currentList.includes(muni);

      if (exists) {
        copy[activeReshuffleTeam] = currentList.filter(m => m !== muni);
      } else {
        copy[activeReshuffleTeam] = [...currentList, muni];
        // Automatically remove from other teams to keep partitioning mapping clean
        Object.keys(copy).forEach(t => {
          if (t !== activeReshuffleTeam) {
            copy[t] = (copy[t] || []).filter(m => m !== muni);
          }
        });
      }
      return copy;
    });
  };

  // Keep logs of selected year
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    
    // Always include a default set of years
    yearsSet.add(2025);
    yearsSet.add(2026);
    yearsSet.add(2027);
    
    // Also include selectedYear
    yearsSet.add(selectedYear);
    
    // Also include current year
    yearsSet.add(new Date().getFullYear());

    // Extract years from existing logs
    logs.forEach(log => {
      if (log.date) {
        const parts = log.date.split("-");
        const y = parseInt(parts[0], 10);
        if (!isNaN(y)) {
          yearsSet.add(y);
        }
      }
    });

    // Return sorted array from lowest to highest
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [logs, selectedYear]);

  // Keep logs of selected year
  const yearLogs = useMemo(() => {
    return logs.filter(log => {
      if (!log.date) return false;
      const parts = log.date.split("-");
      const year = parseInt(parts[0], 10);
      return year === selectedYear;
    });
  }, [logs, selectedYear]);

  // Aggregate logs count by month key
  const countByMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    MONTHS.forEach(m => {
      counts[m.key] = 0;
    });
    yearLogs.forEach(log => {
      const monthPart = log.date.split("-")[1]; // "01", "02", ...
      if (monthPart && counts[monthPart] !== undefined) {
        counts[monthPart]++;
      }
    });
    return counts;
  }, [yearLogs]);

  // Chart data calculation
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    yearLogs.forEach((log) => {
      const val =
        chartMetric === "team"
          ? log.team
          : chartMetric === "brgy"
            ? log.brgy
            : chartMetric === "municipality"
              ? log.municipality
              : log.province;

      if (val) {

        counts[val] = (counts[val] || 0) + 1;
      }
    });

    const list = Object.keys(counts).map(name => ({
      name: chartMetric === "team" ? getTeamDisplayLabel(name, teamLocations) : name,
      value: counts[name]
    }));

    // Sort by descending count
    return list.sort((a, b) => b.value - a.value).slice(0, 8);
  }, [yearLogs, chartMetric, teamLocations]);

  const totalLogsInYear = yearLogs.length;

  return (
    <>
      <div id="dashboard_view_panel" className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-8">
      {/* Selector and Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-950 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-slate-700" />
            Annual Attendance Grid ({selectedYear})
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Select months below or view statistical records breakdown
          </p>
        </div>

        {/* Year configuration & Seeding button */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => {
              setTempTeamLocations({ ...DEFAULT_TEAM_LOCATIONS, ...teamLocations });
              setShowReshuffleModal(true);
            }}
            type="button"
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            title="Spatially assign and reshuffle municipalities among COA Teams"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Reshuffle Teams</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Year:</span>
            <select
              id="year_picker"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {logs.length === 0 && (
            <button
              onClick={onSeedData}
              type="button"
              className="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              Seed Demo Logs
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout to match hand drawn sketch */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Months grid (12 cards) */}
        <div className="xl:col-span-7">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {MONTHS.map((m) => {
              const yearLogsForMonth = logs.filter((log) => {
                const [y, mm] = log.date.split("-");
                return String(mm) === m.key && Number(y) === selectedYear;
              });

              const count = yearLogsForMonth.length;

              // If no logs for selectedYear, show the most recent year that exists for this month
              const latestYearForMonth = (() => {
                const years = logs
                  .filter((log) => {
                    const [, mm] = log.date.split("-");
                    return mm === m.key;
                  })
                  .map((log) => {
                    if (!log.date) return 0;
                    const parts = log.date.split("-");
                    return parseInt(parts[0], 10);
                  });

                return years.length > 0 ? Math.max(...years) : selectedYear;
              })();

              return (
                <button
                  key={m.key}
                  id={`month_tile_${m.shortName}`}
                  onClick={() => onSelectMonth(m.key)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center group cursor-pointer relative overflow-hidden ${
                    count > 0
                      ? "bg-slate-950 text-white border-slate-950 hover:bg-slate-800 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-400"
                  }`}
                >
                  {/* Subtle decorative background light inside the active month cards */}
                  {count > 0 && (
                    <span className="absolute -right-2 -bottom-2 bg-white/10 w-8 h-8 rounded-full translate-x-2 translate-y-2 pointer-events-none transition-transform group-hover:scale-150 duration-500"></span>
                  )}

                  {/* Month short name exactly as hand-drawn (e.g. jan, feb) */}
                  <span className="font-display font-semibold text-lg uppercase tracking-wider mb-1">
                    {m.shortName}
                  </span>

                  {/* Year label for this month based on logs */}
                  <div className="text-[10px] font-mono text-slate-200/90">
                    {latestYearForMonth}
                  </div>

                  {/* Count badge indicator */}
                  <div
                    className={`mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                      count > 0
                        ? "bg-white/20 text-white font-bold"
                        : "bg-slate-200/60 text-slate-500"
                    }`}
                  >
                    {count} logs
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <h4 className="text-xs font-semibold text-slate-900 mb-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
              How to view month details:
            </h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
              Click on any of the month cards above to load the detailed spreadsheet list. Dynamic months can have any level of attendance. Blue/Black cards identify populated months. 
            </p>
          </div>
        </div>

        {/* Statistics Pie Chart representation (rightmost part of top-right sketch) */}
        <div id="dashboard_pie_chart_panel" className="xl:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col justify-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-display font-semibold text-slate-950 flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-slate-600" />
                Distribution Summary
              </h3>
              <p className="text-[10px] text-slate-500 font-sans">Total: {totalLogsInYear} entries in {selectedYear}</p>
            </div>

            {/* Toggle metric buttons */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs self-start sm:self-auto">

              <button
                type="button"
                onClick={() => setChartMetric("team")}
                className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all uppercase cursor-pointer ${
                  chartMetric === "team" ? "bg-slate-950 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Team
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("brgy")}
                className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all uppercase cursor-pointer ${
                  chartMetric === "brgy" ? "bg-slate-950 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Brgy
              </button>

              <button
                type="button"
                onClick={() => setChartMetric("municipality")}
                className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all uppercase cursor-pointer ${
                  chartMetric === "municipality"
                    ? "bg-slate-950 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                City
              </button>

              <button
                type="button"
                onClick={() => setChartMetric("province")}
                className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all uppercase cursor-pointer ${
                  chartMetric === "province"
                    ? "bg-slate-950 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Province
              </button>
            </div>

          </div>

          {/* Recharts Pie rendering */}
          {yearLogs.length === 0 ? (
            <div id="chart_empty_state" className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-150 h-[220px]">
              <Sliders className="w-8 h-8 text-slate-300 mb-2 shrink-0 animate-bounce" />
              <p className="text-xs text-slate-500 font-medium font-sans">No chart metrics available</p>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">Please check-in an agent or seed sample logs above to activate dashboard charts.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shrink-0 transition-all">
              <div className="h-[180px] w-full flex items-center justify-center focus:outline-none">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', borderRadius: '8px' }}
                      itemStyle={{ fontWeight: "semibold" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Pie legend listings */}
              <div id="pie_legend_list" className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 border-t border-slate-100 pt-3">
                {chartData.map((d, index) => (
                  <div key={d.name} className="flex items-center gap-1.5 font-sans">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></span>
                    <span className="text-[10px] font-medium text-slate-600 truncate max-w-[110px]" title={d.name}>
                      {d.name}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 font-mono">({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {showReshuffleModal && (
      <div id="reshuffle_modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-100 shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3 text-indigo-650">
              <div className="bg-indigo-50 p-2.5 rounded-full">
                <Shuffle className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-slate-900">Reshuffle Team Location Assignments</h3>
                <p className="text-[11px] text-slate-500 font-sans">
                  Manually edit which municipalities belong to which COA team. Changes instantly propagate to logs, filters, and fields.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowReshuffleModal(false)}
              className="text-slate-450 hover:text-slate-750 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Split Panel */}
          <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-hidden">
            {/* Left panel: Teams */}
            <div className="w-full md:w-1/3 p-4 overflow-y-auto bg-slate-50/50 flex flex-col gap-2">
              <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2 mb-1">
                Select COA Team
              </span>
              <div className="space-y-1.5">
                {TEAMS.map((teamString) => {
                  const assignedCount = (tempTeamLocations[teamString] || []).length;
                  const isActive = activeReshuffleTeam === teamString;
                  return (
                    <button
                      key={teamString}
                      type="button"
                      onClick={() => setActiveReshuffleTeam(teamString)}
                      className={`w-full text-left rounded-xl p-3 transition-all text-xs font-semibold flex items-center justify-between cursor-pointer ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white hover:bg-slate-100 border border-slate-200/60 text-slate-700 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate pr-2">{teamString}</span>
                      <span className={`text-[10px] rounded-full px-2 py-0.5 shrink-0 font-mono ${
                        isActive ? "bg-white/25 text-white" : "bg-slate-150 text-slate-600 font-medium"
                      }`}>
                        {assignedCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right panel: Municipalities Checklist */}
            <div className="w-full md:w-2/3 p-5 flex flex-col overflow-hidden">
              <div className="border-b border-slate-100 pb-3 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    Active Team Settings
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 truncate" title={activeReshuffleTeam}>
                    {activeReshuffleTeam}
                  </h4>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-xs w-full shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search municipality..."
                    value={searchMuni}
                    onChange={(e) => setSearchMuni(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-905 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Checkbox Grid */}
              <div className="flex-1 overflow-y-auto pr-1 min-h-[220px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
                  {(MUNICIPALITIES_BY_PROVINCE["Ilocos Norte"] || [])
                    .filter(muni => muni.toLowerCase().includes(searchMuni.toLowerCase()))
                    .map(muni => {
                      const isChecked = (tempTeamLocations[activeReshuffleTeam] || []).includes(muni);
                      const assignedOtherTeam = Object.keys(tempTeamLocations).find(t => 
                        t !== activeReshuffleTeam && (tempTeamLocations[t] || []).includes(muni)
                      );

                      return (
                        <button
                          key={muni}
                          type="button"
                          onClick={() => handleToggleMuni(muni)}
                          className={`text-left border transition-all p-2.5 rounded-xl text-xs flex justify-between items-start cursor-pointer font-sans h-full select-none ${
                            isChecked
                              ? "bg-indigo-50/60 border-indigo-250 text-indigo-950 ring-1 ring-indigo-200"
                              : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 py-0.5 rounded flex items-center justify-center border text-[10px] select-none ${
                              isChecked 
                                ? "bg-indigo-650 border-indigo-650 text-white" 
                                : "bg-white border-slate-300 text-transparent"
                            }`}>
                              ✓
                            </div>
                            <div>
                              <span className="font-semibold text-slate-800">{muni}</span>
                              {assignedOtherTeam && (
                                <span className="block text-[8px] text-amber-600 font-sans mt-0.5 truncate max-w-[170px]" title={`Currently assigned to: ${assignedOtherTeam}`}>
                                  ⚠️ {assignedOtherTeam.split("(")[0].trim()}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-2xl">
            {/* Revert / restore default mechanism */}
            <div>
              {showRestoreConfirm ? (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-[11px] text-amber-805">
                  <span className="font-semibold">Revert to default assignments?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempTeamLocations({ ...DEFAULT_TEAM_LOCATIONS });
                      setShowRestoreConfirm(false);
                    }}
                    className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded hover:bg-amber-700 text-[10px] cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRestoreConfirm(false)}
                    className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded hover:bg-slate-300 text-[10px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRestoreConfirm(true)}
                  className="text-slate-500 hover:text-rose-600 text-[11px] font-bold py-1.5 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Undo className="w-3.5 h-3.5" />
                  Restore Defaults
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowReshuffleModal(false)}
                type="button"
                className="bg-white border border-slate-250 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onUpdateTeamLocations) {
                    onUpdateTeamLocations(tempTeamLocations);
                  }
                  setShowReshuffleModal(false);
                }}
                type="button"
                className="bg-indigo-650 hover:bg-indigo-750 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
