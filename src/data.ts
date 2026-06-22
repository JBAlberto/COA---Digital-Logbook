import { LogEntry, MonthData } from "./types";

export const PROVINCES = [
  "Bulacan",
  "Rizal",
  "Cavite",
  "Laguna",
  "Pampanga"
];

export const MUNICIPALITIES_BY_PROVINCE: Record<string, string[]> = {
  Bulacan: ["Malolos", "Meycauayan", "Marilao", "Santa Maria", "Baliuag"],
  Rizal: ["Antipolo", "Cainta", "Taytay", "Binangonan", "San Mateo"],
  Cavite: ["Bacoor", "Imus", "Dasmarinas", "Silang", "Tagaytay"],
  Laguna: ["Calamba", "Santa Rosa", "San Pedro", "Biñan", "Los Baños"],
  Pampanga: ["San Fernando", "Angeles", "Mabalacat", "Guagua", "Lubao"]
};

export const BARANGAYS_BY_MUNICIPALITY: Record<string, string[]> = {
  // Bulacan
  Malolos: ["San Vicente", "Barihan", "Catmon", "Ligas", "Mabolo"],
  Meycauayan: ["Bancal", "Calvario", "Hulo", "Saluysoy", "Pandayan"],
  Marilao: ["Abangan Norte", "Abangan Sur", "Loma de Gato", "Ibayo", "Patubig"],
  "Santa Maria": ["Poblacion", "Cay Pombo", "Pulong Buhangin", "San Jose Patag"],
  Baliuag: ["Poblacion", "Subic", "Concepcion", "Tarcan", "Pagala"],

  // Rizal
  Antipolo: ["Dela Paz", "San Jose", "Beverly Hills", "Cupang", "Mambugan"],
  Cainta: ["San Andres", "San Juan", "Santo Domingo", "Santo Niño"],
  Taytay: ["San Juan", "Dolores", "San Isidro", "Santa Ana"],
  Binangonan: ["Calumpang", "Layunan", "Libid", "Pila Pila"],
  "San Mateo": ["Ampid I", "Dulong Bayan I", "Guitnang Bayan I", "Maly"],

  // Cavite
  Bacoor: ["Molino I", "Molino III", "Ligas I", "Bayanan", "Mambog I"],
  Imus: ["Anabu I-A", "Bayan Luma I", "Poblacion I-A", "Tanzang Luma"],
  Dasmarinas: ["Salawag", "Paliparan III", "Langkaan I", "Burol I"],
  Silang: ["Biga I", "Bulihan", "Lalaan I", "Munting Ilog"],
  Tagaytay: ["Mendez Crossing East", "Maharlika East", "Kaybagal South"],

  // Laguna
  Calamba: ["Parian", "Barandal", "Canlubang", "Pansol", "Real"],
  "Santa Rosa": ["Balibago", "Don Jose", "Macabling", "Sinalhan", "Tagapo"],
  "San Pedro": ["Landayan", "Pacita I", "San Antonio", "Nueva"],
  Biñan: ["Malaban", "Platero", "San Antonio", "Santo Tomas"],
  "Los Baños": ["Anos", "Batong Malake", "Maahas", "Tuntungin-Putho"],

  // Pampanga
  "San Fernando": ["Baliti", "Calulut", "Dolores", "Sindalan", "Telebastagan"],
  Angeles: ["Balibago", "Cutcut", "Pulung Maragul", "Santo Cristo"],
  Mabalacat: ["Dau", "Camachiles", "Mabiga", "San Francisco"],
  Guagua: ["San Roque", "San Pedro", "Santa Filomena", "Beto"],
  Lubao: ["Concepcion", "San Roque", "Santa Cruz", "Prado Siongco"]
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

