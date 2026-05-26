export interface Motorcycle {
  id: string;
  name: string;
  displayName: string;
  class: string;
  basePower: number; // in HP
  baseTorque: number; // in Nm
  baseWeight: number; // in kg
  baseTopSpeed: number; // in km/h
  baseAcceleration: number; // 0-100 score (1-10)
  baseHandling: number; // cornering score (1-10)
  description: string;
  color: string;
  engineSoundFreq: number; // sound frequency factor
}

export interface Track {
  id: string;
  name: string;
  location: string;
  character: string;
  length: number; // in meters
  turns: number;
  leftTurns: number;
  rightTurns: number;
  bestTimeSec: number;
  difficulty: "Mudah" | "Sedang" | "Sulit";
  color: string;
}

export interface TuningConfig {
  ecuMode: "Standar" | "Racing Remap" | "Bore Up Extreme";
  exhaust: "Knalpot Standar" | "Knalpot Racing Slip-On" | "Full-System Carbon Racing";
  tireCompound: "Hard (Awet)" | "Medium (Seimbang)" | "Soft Slick (Grip Maksimal)";
  gearRatio: "Lebar (Fokus Top Speed)" | "Medium (Seimbang)" | "Merapat (Fokus Akselerasi)";
}

export interface RaceScore {
  id: string;
  riderName: string;
  motorcycleName: string;
  trackName: string;
  lapTime: number; // in seconds
  score: number;
  date: string;
}

export const MOTORCYCLES: Motorcycle[] = [
  {
    id: "bebek-150",
    name: "Underbone 150cc",
    displayName: "Yamaha MX King Road Race",
    class: "Bebek Balap Super",
    basePower: 26,
    baseTorque: 19,
    baseWeight: 98,
    baseTopSpeed: 145,
    baseAcceleration: 6,
    baseHandling: 9,
    description: "Rajanya balapan sirkuit pendek di Indonesia. Enteng banget dicumi-cumi (disalip) di tikungan tajam!",
    color: "#0284c7", // Sky blue
    engineSoundFreq: 110
  },
  {
    id: " Vespa-2t",
    name: "Retro Scooter Racing",
    displayName: "Vespa PX 150 2-Stroke Racing",
    class: "Classic Scooter 2T",
    basePower: 22,
    baseTorque: 21,
    baseWeight: 104,
    baseTopSpeed: 130,
    baseAcceleration: 5,
    baseHandling: 6,
    description: "Bau oli samping legendaris dengan modifikasi kopling manual balap. Handling unik nan asyik bergaya retro!",
    color: "#e11d48", // Rose Red
    engineSoundFreq: 90
  },
  {
    id: "sport-250",
    name: "Sport 250cc",
    displayName: "Honda CBR250RR Racing Spec",
    class: "Sport 2-Cylinder",
    basePower: 45,
    baseTorque: 27,
    baseWeight: 154,
    baseTopSpeed: 185,
    baseAcceleration: 7.5,
    baseHandling: 8,
    description: "Suara gahar 2-silinder teriakan RPM tinggi. Sangat stabil di sirkuit nasional berskala sedang.",
    color: "#f97316", // Orange
    engineSoundFreq: 150
  },
  {
    id: "superbike-1000",
    name: "Superbike 1000cc",
    displayName: "Ducati Panigale V4 R",
    class: "Superbike V4",
    basePower: 218,
    baseTorque: 112,
    baseWeight: 172,
    baseTopSpeed: 310,
    baseAcceleration: 10,
    baseHandling: 7.5,
    description: "Monster lintasan lurus dengan tenaga luar biasa. Butuh konsentrasi penuh dan timing pengereman yang akurat!",
    color: "#dc2626", // Ducati Red
    engineSoundFreq: 80
  }
];

export const TRACKS: Track[] = [
  {
    id: "mandalika",
    name: "Sirkuit Internasional Mandalika",
    location: "Lombok, Nusa Tenggara Barat",
    character: "Cepat & Mengalir (Fast & Flowing) dengan aspal berkualitas tinggi",
    length: 4310,
    turns: 17,
    leftTurns: 6,
    rightTurns: 11,
    bestTimeSec: 91.01, // MotoGP record ~1:31
    difficulty: "Sedang",
    color: "#10b981" // Emerald Green
  },
  {
    id: "sentul",
    name: "Sirkuit Internasional Sentul",
    location: "Bogor, Jawa Barat",
    character: "Klasik & Teknis dengan aspal bervariasi dan bumpy",
    length: 3965,
    turns: 11,
    leftTurns: 3,
    rightTurns: 8,
    bestTimeSec: 102.5, // National record
    difficulty: "Sulit",
    color: "#f59e0b" // Amber yellow
  },
  {
    id: "subang",
    name: "Sirkuit Bukit Peusar",
    location: "Tasikmalaya, Jawa Barat",
    character: "Trek Teknis Pendek (Tight & Technical Cornering)",
    length: 1300,
    turns: 13,
    leftTurns: 7,
    rightTurns: 6,
    bestTimeSec: 57.2, // Underbone record
    difficulty: "Sulit",
    color: "#6366f1" // Indigo Blue
  }
];
