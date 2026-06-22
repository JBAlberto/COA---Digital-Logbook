export interface LogEntry {
  id: string;
  name: string;
  team: string;
  brgy: string;
  municipality: string;
  province: string;
  contactNumber: string; // e.g. "+63XXXXXXXXXX" or "09XXXXXXXXX"
  purpose: string; // e.g. "Community visit"
  timeIn: string; // "HH:MM"

  timeOut: string; // "HH:MM" or "" 
  date: string; // "YYYY-MM-DD"
  createdAt: number; // millisecond timestamp

}

export type ViewState = 'entry' | 'dashboard' | 'spreadsheet';

export interface MonthData {
  key: string; // "01", "02", ..., "12"
  shortName: string; // "Jan", "Feb", ...
  fullName: string; // "January", "February", ...
  daysCount: number;
}
