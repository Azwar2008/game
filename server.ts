import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily or safely
let ai: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return ai;
}

// API Routes
app.post("/api/coach", async (req, res) => {
  try {
    const { motorcycle, track, tuning } = req.body;
    
    const client = getGeminiClient();
    if (!client) {
      // Return a very clean default fallback in Indonesian when GEMINI_API_KEY is not configured.
      return res.json({
        success: true,
        coachRemark: `⚠️ **Catatan Kepala Mekanik**: Kunci API Gemini tidak terdeteksi di Secrets panel. Berikut skenario panduan mekanik standar untuk Anda:

- **Saran Trek ${track.name}**: Karena trek ini memiliki karakter *${track.character}*, setelan gir **${tuning.gearRatio === "Merapat" ? "Akselerasi (Merapat)" : tuning.gearRatio === "Lebar" ? "Top Speed (Lebar)" : "Balance (Medium)"}** Anda sudah cukup menarik. 
- **Rekomendasi Ban**: Ban tipe **${tuning.tireCompound}** memberikan grip optimal di aspal sirkuit ini. Jika Anda melaju di ${track.name}, usahakan mengambil *racing line* yang rapi untuk menghemat ban belakang pada putaran-putaran akhir. Knalpot tipe *${tuning.exhaust}* berpadu dengan rem ECU *${tuning.ecuMode}* memberikan tenaga putaran mesin yang responsif saat keluar tikungan (*exit corner*).`
      });
    }

    const prompt = `Anda adalah Kepala Mekanik & Coach Balap Motor profesional di Indonesia yang ahli dalam balapan lokal dan internasional (seperti Superbike, Road Race bebek 150cc, dan MotoGP di Mandalika/Sentul).
Analisis spesifikasi berikut untuk memberikan analisis taktis balapan dan modifikasi mesin (tuning) yang sangat realistis, detail, dan mendalam.

Spesifikasi Motor:
- Nama Motor: ${motorcycle.displayName}
- Jenis Motor: ${motorcycle.name} (${motorcycle.class})
- Tenaga: ${motorcycle.power} HP
- Torsi: ${motorcycle.torque} Nm
- Berat: ${motorcycle.weight} kg

Sirkuit Pilihan:
- Nama Sirkuit: ${track.name}
- Karakter: ${track.character}
- Panjang Lintasan: ${track.length} meter
- Jumlah Tikungan: ${track.turns} Belokan (Kiri: ${track.leftTurns}, Kanan: ${track.rightTurns})

Konfigurasi Tuning Pengguna:
1. Bore Up / ECU Tuning: Mode ${tuning.ecuMode}
2. Exhaust / Knalpot: ${tuning.exhaust}
3. Tipe Ban: ${tuning.tireCompound}
4. Rasio Gear transmisi: ${tuning.gearRatio} (Fokus: ${tuning.gearRatio === "Merapat" ? "Akselerasi Cepat" : tuning.gearRatio === "Lebar" ? "Top Speed Trek Lurus" : "Seimbang"})

Tolong buat respon dalam format bahasa Indonesia yang seru, penuh jargon balap otomotif Indonesia & dunia (seperti 'late braking', 'apex', 'cornering speed', 'bore up', 'limiter', 'putaran bawah', 'power-to-weight ratio', 'riding line', 'slipstream', 'high-side'). Buatlah sangat mendidik, bersemangat, dan berbobot.

Berikan masukan terperinci dalam 3 poin:
1. 🛠️ **Analisis Efektivitas Tuning**: Evaluasi apakah setelan ECU/Bore up, knalpot, jenis ban, dan rasio gir ini sudah maksimal untuk melahap ${track.turns} tikungan di Sirkuit ${track.name}.
2. 🏁 **Tips Riding Line & Strategi Tikungan**: Berikan rahasia mengemudi di sirkuit ini berdasarkan karakter tikungannya dengan setelan motor saat ini.
3. 💡 **Rekomendasi Penyempurnaan**: Berikan satu kombinasi setelan ideal alternatif untuk memangkas lap time lebih banyak lagi di ${track.name}!

Sajikan dalam format Markdown yang dikemas dengan rapi dan asyik dibaca.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      coachRemark: response.text,
    });
  } catch (error: any) {
    console.error("Gemini coach error:", error);
    res.json({
      success: false,
      error: error.message,
      coachRemark: "🔧 Maaf bro, mekanik utama AI sedang sibuk di pitstop menyetel kompresi piston. Coba ganti ban Anda ke Soft untuk tikungan tajam dan jaga RPM mesin tetap di zona hijau!"
    });
  }
});

// Vite Middleware & Static Serving Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
