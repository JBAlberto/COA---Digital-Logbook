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
    "Bnagui", // support the typo in Team 2 label
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
  Adams: ["Poblacion"],
  Bacarra: ["Poblacion I", "Poblacion II", "San Andres", "Sangil", "Bani"],
  Badoc: ["Poblacion I", "Poblacion II", "Alogoog", "Ar parenting", "Camanga"],
  Bangui: ["Poblacion", "Manayon", "Abaca", "Bacsil", "Lanao"],
  Bnagui: ["Poblacion", "Manayon", "Abaca", "Bacsil", "Lanao"],
  Banna: ["Poblacion I", "Poblacion II", "Barangobong", "Bomitog", "Carusipan"],
  "Batac City": ["Poblacion", "Washington", "Suarez", "Valdez", "Billoca"],
  Burgos: ["Poblacion", "Tanap", "Buduan", "Bobon", "Naguillan"],
  Carasi: ["Poblacion", "Angset", "Barbaques"],
  Curimao: ["Poblacion", "Pias", "Salugan", "Torre", "Lioes"],
  Dingras: ["Poblacion", "Madamba", "Suyo", "San Francisco", "Bariquir"],
  Dumalneg: ["Poblacion", "Cabaritan", "Kalaw"],
  "Laoag City": ["San Jose", "Nuestra Señora de Soledad", "Santa Angela", "Sanquiat", "Zamboanga"],
  Marcos: ["Poblacion", "Pacifico", "Cacafean", "Imelda", "Santiago"],
  "Nueva Era": ["Poblacion", "Cabittauran", "Caray", "Garnaden", "Barikir"],
  Paoay: ["Poblacion", "Sumbilla", "Nangalisan", "Suba", "Bacsil"],
  Pasuquin: ["Poblacion", "Badaio", "Caruan", "Davila", "Prado"],
  Piddig: ["Poblacion", "Ab-abut", "Boyboy", "Cabaroan", "Estancia"],
  Pinili: ["Poblacion", "Badio", "Cabaroan", "Darayday", "Puzol"],
  "San Nicolas": ["Poblacion", "San Francisco", "San Jose", "San Miguel", "San Agustin"],
  Sarrat: ["Poblacion", "San Joaquin", "San Roque", "San Francisco", "Santa Maria"],
  Solsona: ["Poblacion", "Laureta", "Darayday", "Talugtog", "Manalpac"],
  Vintar: ["Poblacion", "San Jose", "San Nicolas", "Salsalamagui", "Visaya"],
  PGIN: ["Poblacion", "Capitol"],
  "District Hostpital": ["Poblacion", "Hospital Ground"],
  Pagudpud: ["Poblacion", "Baduang", "Balaoi", "Caparispisan", "Pancian", "Saud"]
};

export const TEAMS = [
  "Team 1 (PGIN, District Hostpital)",
  "Team 2 (Pagudpud, Bnagui, Burgos, Pasuquin)",
  "Team 3 (Sarrat, Vintar, Carasi, Nueva Era)",
  "Team 4 (Bacarra, San Nicolas, Adams, Dumalneg)",
  "Team 5 (Badoc, Pinili, Piddig, Paoay)",
  "Team 6 (Marcos, Dingras, Solsona, Banna)",
  "Team 7 (Batac City, Curimao)",
  "Team 8 (Laoag City)",
  "Team 9 (Office of the Supervising Auditor)"
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

