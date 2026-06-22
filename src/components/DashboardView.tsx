import React, { useState, useMemo } from "react";
import { LogEntry, MonthData } from "../types";
import { MONTHS } from "../data";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CalendarDays, BarChart2, PieChart as PieIcon, ListFilter, Sliders, Database, ArrowLeftRight } from "lucide-react";

interface DashboardViewProps {
  logs: LogEntry[];
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  onSelectMonth: (monthKey: string) => void;
  onSeedData: () => void;
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
  onSeedData
}: DashboardViewProps) {
  const [chartMetric, setChartMetric] = useState<
    "team" | "brgy" | "municipality" | "province"
  >("team");



  // Keep logs of selected year
  const yearLogs = useMemo(() => {
    return logs.filter(log => {
      const year = new Date(log.date).getFullYear();
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
      name,
      value: counts[name]
    }));

    // Sort by descending count
    return list.sort((a, b) => b.value - a.value).slice(0, 8);
  }, [yearLogs, chartMetric]);

  const totalLogsInYear = yearLogs.length;

  return (
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
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Year:</span>
            <select
              id="year_picker"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2027}>2027</option>
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
                  .map((log) => new Date(log.date).getFullYear());

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
  );
}
