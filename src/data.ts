import { LogEntry, MonthData } from "./types";

export const PROVINCES = [
  "Ilocos Norte"
];

export const MUNICIPALITIES_BY_PROVINCE: Record<string, string[]> = {
  "Ilocos Norte": [
    "Adams",
    "Bacarra",
    "Badoc",
    "Bangui",
    "Banna",
    "Batac City",
    "Burgos", 
    "Carasi",
    "Curimao",
    "Dingras",
    "Dumalneg",
    "Laoag City",
    "Marcos", 
    "Nueva Era",
    "Paoay",
    "Pasuquin",
    "Piddig",
    "Pinili",
    "San Nicolas", 
    "Sarrat",
    "Solsona",
    "Vintar",
    "PGIN",
    "District Hostpital",
    "Pagudpud"
  ]
};

export const BARANGAYS_BY_MUNICIPALITY: Record<string, string[]> = {

};

export const TEAMS = [
  " Office of the Supervising Auditor ",
  "Team 1 (PGIN, District Hostpital)",
  "Team 2 (Pagudpud, Bangui, Burgos, Pasuquin)",
  "Team 3 (Sarrat, Vintar, Carasi, Nueva Era)",
  "Team 4 (Bacarra, San Nicolas, Adams, Dumalneg)",
  "Team 5 (Badoc, Pinili, Piddig, Paoay)",
  "Team 6 (Marcos, Dingras, Solsona, Banna)",
  "Team 7 (Batac City, Curimao)",
  "Team 8 (Laoag City)"
];


export type TeamLocationRules = {
  provinces: string[];
  municipalities: string[];
  barangays: string[];
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function parseTeamsParenthesisLocations(teamLabel: string): string[] {
  const match = teamLabel.match(/\(([^)]*)\)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

const TEAM_TO_RAW_LOCATIONS: Record<string, string[]> = Object.fromEntries(
  TEAMS.map(t => [t, parseTeamsParenthesisLocations(t)])
);

// Best-effort mapping into the available dataset.
// - Treat raw entries as municipalities first.
// - If a raw municipality exists in MUNICIPALITIES_BY_PROVINCE, then include its province.
// - If a raw municipality exists, include its barangays.
// - If raw entries are not found in the dataset, they are ignored (empty rules).
export const TEAM_LOCATION_RULES: Record<string, TeamLocationRules> = Object.fromEntries(
  TEAMS.map(team => {
    const raw = TEAM_TO_RAW_LOCATIONS[team] || [];
    const allowedMunicipalities = raw.filter(m =>
      Object.values(MUNICIPALITIES_BY_PROVINCE).some(list => list.includes(m))
    );

    const allowedProvinces = uniq(
      allowedMunicipalities.map(m => {
        const province = Object.entries(MUNICIPALITIES_BY_PROVINCE).find(([, list]) => list.includes(m))?.[0];
        return province || "";
      })
    );

    const allowedBarangays = uniq(
      allowedMunicipalities.flatMap(m => (BARANGAYS_BY_MUNICIPALITY[m] || []))
    );

    return [team, { provinces: allowedProvinces, municipalities: allowedMunicipalities, barangays: allowedBarangays }];
  })
);

export const DEFAULT_TEAM_LOCATIONS: Record<string, string[]> = Object.fromEntries(
  TEAMS.map(team => [team, TEAM_LOCATION_RULES[team]?.municipalities ?? []])
);

export function getTeamBaseName(team: string): string {
  const idx = team.indexOf("(");
  if (idx !== -1) {
    return team.substring(0, idx).trim();
  }
  return team.trim();
}

export function getTeamDisplayLabel(team: string, teamLocations?: Record<string, string[]>): string {
  if (!team) return team;
  const baseName = getTeamBaseName(team);
  
  if (!team.includes("(")) {
    return team;
  }

  // Get locations for this team from teamLocations or fall back to default
  const locations = teamLocations && teamLocations[team] 
    ? teamLocations[team] 
    : (DEFAULT_TEAM_LOCATIONS[team] || []);

  if (locations.length === 0) {
    return `${baseName} (No Locations)`;
  }

  return `${baseName} (${locations.join(", ")})`;
}

export function getAllowedProvincesForTeam(team: string): string[] {
  return TEAM_LOCATION_RULES[team]?.provinces ?? [];
}

export function getAllowedMunicipalitiesForTeam(team: string): string[] {
  return TEAM_LOCATION_RULES[team]?.municipalities ?? [];
}

export function getAllowedBarangaysForTeam(team: string): string[] {
  return TEAM_LOCATION_RULES[team]?.barangays ?? [];
}

export function isLocationAllowedForTeam(params: {
  team: string;
  province: string;
  municipality: string;
  barangay: string;
}): boolean {
  const { team, province, municipality, barangay } = params;
  const rules = TEAM_LOCATION_RULES[team];
  if (!rules) return false;

  const provinceOk = rules.provinces.length === 0 ? true : rules.provinces.includes(province);
  const muniOk = rules.municipalities.length === 0 ? true : rules.municipalities.includes(municipality);
  const brgyOk = rules.barangays.length === 0 ? true : rules.barangays.includes(barangay);

  // If rules exist, require hierarchical match where possible.
  if (!provinceOk || !muniOk || !brgyOk) return false;
  return true;
}


export const MONTHS: MonthData[] = [
  { key: "01", shortName: "jan", fullName: "January", daysCount: 31 },
  { key: "02", shortName: "feb", fullName: "February", daysCount: 28 }, // 2026 is non-leap
  { key: "03", shortName: "mar", fullName: "March", daysCount: 31 },
  { key: "04", shortName: "apr", fullName: "April", daysCount: 30 },
  { key: "05", shortName: "may", fullName: "May", daysCount: 31 },
  { key: "06", shortName: "jun", fullName: "jun", daysCount: 30 },
  { key: "07", shortName: "jul", fullName: "July", daysCount: 31 },
  { key: "08", shortName: "aug", fullName: "August", daysCount: 31 },
  { key: "09", shortName: "set", fullName: "September", daysCount: 30 },
  { key: "10", shortName: "oct", fullName: "October", daysCount: 31 },
  { key: "11", shortName: "nov", fullName: "November", daysCount: 30 },
  { key: "12", shortName: "dec", fullName: "December", daysCount: 31 }
];

// Helper to generate a unique random ID
export function generateId(): string {
  return "log_" + Math.random().toString(36).substr(2, 9);
}

