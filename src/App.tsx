import { useState, useEffect, useRef } from "react";
import { 
  Wrench, 
  Flame, 
  HelpCircle, 
  Play, 
  RotateCcw, 
  Cpu, 
  Gauge, 
  Award, 
  Navigation, 
  TrendingUp, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Info,
  Timer
} from "lucide-react";
import { MOTORCYCLES, TRACKS, Motorcycle, Track, TuningConfig, RaceScore } from "./types";

// Dynamic Web Audio Engine Sound Generator for extreme racing feedback
class AudioEngine {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private mainVolume: GainNode | null = null;
  private active: boolean = false;

  start(baseFreq: number) {
    try {
      if (this.active) return;
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Node initialization
      this.osc1 = this.ctx.createOscillator();
      this.osc2 = this.ctx.createOscillator();
      this.filter = this.ctx.createBiquadFilter();
      this.mainVolume = this.ctx.createGain();

      // Configure frequencies for rich racing engine exhaust rattle
      this.osc1.type = "sawtooth";
      this.osc1.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

      this.osc2.type = "triangle";
      this.osc2.frequency.setValueAtTime(baseFreq * 0.5, this.ctx.currentTime);

      // Sound filter (lowpass to sound like realistic dual-exhaust cylinder rumble)
      this.filter.type = "lowpass";
      this.filter.frequency.setValueAtTime(550, this.ctx.currentTime);

      // Connect
      this.osc1.connect(this.filter);
      this.osc2.connect(this.filter);
      this.filter.connect(this.mainVolume);
      this.mainVolume.connect(this.ctx.destination);

      // Low volume to keep it pleasant and safe
      this.mainVolume.gain.setValueAtTime(0.015, this.ctx.currentTime);

      this.osc1.start();
      this.osc2.start();
      this.active = true;
    } catch (e) {
      console.error("Audio Web API initialization failed", e);
    }
  }

  updateRPM(rpmRatio: number, baseFreq: number) {
    if (!this.active || !this.ctx || !this.osc1 || !this.osc2 || !this.mainVolume) return;
    try {
      // Scale dynamic sound pitch and compression with RPM limits
      const targetMain = baseFreq + (rpmRatio * 420);
      const targetSub = (baseFreq * 0.5) + (rpmRatio * 210);

      this.osc1.frequency.setTargetAtTime(targetMain, this.ctx.currentTime, 0.04);
      this.osc2.frequency.setTargetAtTime(targetSub, this.ctx.currentTime, 0.04);

      // Squeeze filter frequency upwards as the exhaust screams at redline RPM
      if (this.filter) {
        const filterCorner = 450 + (rpmRatio * 1200);
        this.filter.frequency.setTargetAtTime(filterCorner, this.ctx.currentTime, 0.06);
      }

      // Slightly louder at high speeds representing wind/throttle load
      const volume = 0.01 + (rpmRatio * 0.035);
      this.mainVolume.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.04);
    } catch (e) {}
  }

  stop() {
    try {
      if (this.osc1) {
        this.osc1.stop();
        this.osc1.disconnect();
      }
      if (this.osc2) {
        this.osc2.stop();
        this.osc2.disconnect();
      }
      if (this.ctx) {
        this.ctx.close();
      }
    } catch (e) {}
    this.osc1 = null;
    this.osc2 = null;
    this.filter = null;
    this.mainVolume = null;
    this.ctx = null;
    this.active = false;
  }
}

export default function App() {
  // Navigation tabs: "PITSTOP" | "SIMULASI" | "LEADERBOARD"
  const [activeTab, setActiveTab ] = useState<"PITSTOP" | "SIMULASI" | "LEADERBOARD">("PITSTOP");

  // Motor & Track selections
  const [selectedMotor, setSelectedMotor] = useState<Motorcycle>(MOTORCYCLES[0]);
  const [selectedTrack, setSelectedTrack] = useState<Track>(TRACKS[0]);

  // Audio status
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());

  // Tuning Configuration State
  const [tuning, setTuning] = useState<TuningConfig>({
    ecuMode: "Standar",
    exhaust: "Knalpot Standar",
    tireCompound: "Medium (Seimbang)",
    gearRatio: "Medium (Seimbang)"
  });

  // Rider Profile
  const [riderName, setRiderName] = useState<string>("Pembalap Nusantara");

  // Local Leaderboards Persistent Storage
  const [leaderboard, setLeaderboard] = useState<RaceScore[]>(() => {
    const saved = localStorage.getItem("racing_scores_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Set standard default records as initial leaderboard
    const defaultScores: RaceScore[] = [
      { id: "def-1", riderName: "Sena 'The Jet' Sulaiman", motorcycleName: "Ducati Panigale V4 R", trackName: "Sirkuit Internasional Mandalika", lapTime: 92.14, score: 980, date: "26-05-2026" },
      { id: "def-2", riderName: "Azwar 'Slebew' Pratama", motorcycleName: "Yamaha MX King Road Race", trackName: "Sirkuit Bukit Peusar", lapTime: 58.42, score: 910, date: "26-05-2026" },
      { id: "def-3", riderName: "Doni Tata", motorcycleName: "Honda CBR250RR Racing Spec", trackName: "Sirkuit Internasional Sentul", lapTime: 104.91, score: 870, date: "26-05-2026" }
    ];
    localStorage.setItem("racing_scores_v1", JSON.stringify(defaultScores));
    return defaultScores;
  });

  // AI Mechanic Coach Remark & Loading Status
  const [coachText, setCoachText] = useState<string>("👋 Halo bro! Pilih motormu, lakukan penyetelan (tuning) di pitstop, lalu klik sirkuit balap untuk mendapatkan taktik & raceline rahasia dariku.");
  const [loadingCoach, setLoadingCoach] = useState<boolean>(false);

  // Live Racing Simulation System State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0); // 0 to 100 percent of the sirkuit lap
  const [simLapTime, setSimLapTime] = useState<number>(0); // in seconds
  const [liveSpeed, setLiveSpeed] = useState<number>(0);
  const [liveGear, setLiveGear] = useState<number>(1);
  const [liveRPM, setLiveRPM] = useState<number>(1000);
  const [liveLeanAngle, setLiveLeanAngle] = useState<number>(0);
  const [leanDirection, setLeanDirection] = useState<"kiri" | "kanan" | "lurus">("lurus");
  const [liveBrake, setLiveBrake] = useState<number>(0); // in percent
  const [liveThrottle, setLiveThrottle] = useState<number>(0); // in percent
  const [trackStageName, setTrackStageName] = useState<string>("Garis Start");
  const [tireTempFront, setTireTempFront] = useState<number>(30); // in degrees
  const [tireTempRear, setTireTempRear] = useState<number>(30); // in degrees
  const [sectorTimes, setSectorTimes] = useState<{ s1: number; s2: number; s3: number }>({ s1: 0, s2: 0, s3: 0 });

  // Finished race modal/result
  const [raceResult, setRaceResult] = useState<{
    lapTime: number;
    score: number;
    performanceRating: string;
    unlockedRecord: boolean;
  } | null>(null);

  // Calculate Adjusted Specifications based on tuning options
  const getTuningAdjustments = () => {
    let powerMultiplier = 1.0;
    let torqueMultiplier = 1.0;
    let weightModifier = 0;
    
    let accelBonus = 0;
    let handlingBonus = 0;
    let topSpeedBonus = 0;

    // 1. ECU & Engine Mode
    if (tuning.ecuMode === "Racing Remap") {
      powerMultiplier += 0.10;
      torqueMultiplier += 0.08;
      weightModifier -= 1.5;
      accelBonus += 1.0;
      topSpeedBonus += 10;
    } else if (tuning.ecuMode === "Bore Up Extreme") {
      powerMultiplier += 0.28;
      torqueMultiplier += 0.25;
      weightModifier += 2.0;
      accelBonus += 2.5;
      topSpeedBonus += 25;
      handlingBonus -= 0.5; // slight heavy feel
    }

    // 2. Exhaust Custom
    if (tuning.exhaust === "Knalpot Racing Slip-On") {
      powerMultiplier += 0.05;
      torqueMultiplier += 0.04;
      weightModifier -= 2.0;
      accelBonus += 0.5;
      topSpeedBonus += 5;
    } else if (tuning.exhaust === "Full-System Carbon Racing") {
      powerMultiplier += 0.12;
      torqueMultiplier += 0.10;
      weightModifier -= 4.5;
      accelBonus += 1.5;
      topSpeedBonus += 14;
      handlingBonus += 0.5; // lighter bike turns better
    }

    // 3. Tire Compound
    if (tuning.tireCompound === "Hard (Awet)") {
      handlingBonus -= 1.0;
      topSpeedBonus += 3; // slightly lower rolling resistance on straights
    } else if (tuning.tireCompound === "Soft Slick (Grip Maksimal)") {
      handlingBonus += 2.5;
      topSpeedBonus -= 4; // sticky tyres hold bike back very slightly in pure straight roads
      accelBonus += 0.5; // better off-the-line launch traction
    }

    // 4. Transmission Gear Ratio
    if (tuning.gearRatio === "Lebar (Fokus Top Speed)") {
      topSpeedBonus += 32;
      accelBonus -= 1.8;
    } else if (tuning.gearRatio === "Merapat (Fokus Akselerasi)") {
      accelBonus += 3.0;
      topSpeedBonus -= 30;
      handlingBonus += 0.2; // better throttle response in corners
    }

    const calculatedPower = parseFloat((selectedMotor.basePower * powerMultiplier).toFixed(1));
    const calculatedTorque = parseFloat((selectedMotor.baseTorque * torqueMultiplier).toFixed(1));
    const calculatedWeight = Math.max(70, selectedMotor.baseWeight + weightModifier);
    
    const finalAccel = Math.min(10, Math.max(1, selectedMotor.baseAcceleration + accelBonus));
    const finalHandling = Math.min(10, Math.max(1, selectedMotor.baseHandling + handlingBonus));
    const finalTopSpeed = Math.round(selectedMotor.baseTopSpeed + topSpeedBonus);

    return {
      power: calculatedPower,
      torque: calculatedTorque,
      weight: calculatedWeight,
      acceleration: parseFloat(finalAccel.toFixed(1)),
      handling: parseFloat(finalHandling.toFixed(1)),
      topSpeed: finalTopSpeed
    };
  };

  const tunedSpecs = getTuningAdjustments();

  // sound dynamic feedback during live tuning changes
  useEffect(() => {
    if (soundEnabled && !isSimulating) {
      audioEngineRef.current.stop();
      audioEngineRef.current.start(selectedMotor.engineSoundFreq);
      // Give a little revving engine response to indicate choice
      audioEngineRef.current.updateRPM(0.7, selectedMotor.engineSoundFreq);
      const timer = setTimeout(() => {
        audioEngineRef.current.updateRPM(0.1, selectedMotor.engineSoundFreq);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedMotor, soundEnabled]);

  // Handle Voice toggle
  const toggleSound = () => {
    if (soundEnabled) {
      audioEngineRef.current.stop();
      setSoundEnabled(false);
    } else {
      setSoundEnabled(true);
      audioEngineRef.current.start(selectedMotor.engineSoundFreq);
      audioEngineRef.current.updateRPM(0.15, selectedMotor.engineSoundFreq);
    }
  };

  // Fetch AI Head Mechanic Coach Strategy
  const fetchCoachAnalysis = async () => {
    setLoadingCoach(true);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motorcycle: {
            name: selectedMotor.name,
            displayName: selectedMotor.displayName,
            class: selectedMotor.class,
            power: tunedSpecs.power,
            torque: tunedSpecs.torque,
            weight: tunedSpecs.weight
          },
          track: selectedTrack,
          tuning: tuning
        })
      });

      const data = await response.json();
      if (data.success && data.coachRemark) {
        setCoachText(data.coachRemark);
      } else {
        setCoachText("🔧 Gagal memanggil koordinator sirkuit di paddock. Periksa koneksi atau kunci API Anda!");
      }
    } catch (e) {
      console.error(e);
      setCoachText("❌ Waduh, sirkuit lagi hujan badai dan sistem telemetri AI terputus. Tetap fokus pada rasio gear Anda!");
    } finally {
      setLoadingCoach(false);
    }
  };

  // Trigger coach analysis optionally on choice or allow button click
  const handleAskCoach = () => {
    fetchCoachAnalysis();
  };

  // Live Simulation Engine Loop Tracker
  const simulationInterval = useRef<any>(null);

  const handleStartSimulation = () => {
    if (isSimulating) {
      // Manual reset/stop
      handleStopSimulation();
      return;
    }

    setRaceResult(null);
    setIsSimulating(true);
    setSimProgress(0);
    setSimLapTime(0);
    setSectorTimes({ s1: 0, s2: 0, s3: 0 });
    setTireTempFront(60);
    setTireTempRear(65);

    // Audio triggers full power exhaust
    if (soundEnabled) {
      audioEngineRef.current.stop();
      audioEngineRef.current.start(selectedMotor.engineSoundFreq);
    }

    // Setup tracks and performance ratio
    // A perfect match of specs to track properties calculates lower Lap Times!
    // Subang is tight & technical: prioritizing high handling and fast acceleration
    // Mandalika is high speed flowing: prioritizing high top speed and medium-soft tires
    // Sentul is buggy & technical: prioritizing high torque, engine reliability, balanced setups
    
    let lapPerformanceRatio = 1.0; 
    
    if (selectedTrack.id === "subang") {
      // Needs Acceleration and Handling
      const deficiency = (10 - tunedSpecs.handling) * 0.05 + (10 - tunedSpecs.acceleration) * 0.05;
      lapPerformanceRatio += deficiency;
      // High-speed gears in short track penalize performance
      if (tuning.gearRatio === "Lebar (Fokus Top Speed)") {
        lapPerformanceRatio += 0.08; // 8% slower
      }
      if (tuning.tireCompound === "Hard (Awet)") {
        lapPerformanceRatio += 0.06;
      }
    } else if (selectedTrack.id === "mandalika") {
      // Needs Top Speed and high speed flowing handling
      const topSpeedDeficiency = (320 - tunedSpecs.topSpeed) * 0.001; 
      lapPerformanceRatio += topSpeedDeficiency;
      if (tuning.gearRatio === "Merapat (Fokus Akselerasi)") {
        lapPerformanceRatio += 0.07; // cannot keep up at straights
      }
    } else { // sentul
      // Balanced setup requested
      if (tuning.ecuMode === "Standar") {
        lapPerformanceRatio += 0.04; 
      }
      if (tuning.tireCompound === "Hard (Awet)") {
        lapPerformanceRatio += 0.04;
      }
    }

    let intervalMs = 150; // visual rate updates
    let stepsCount = 100; // total ticks of simulator
    let counter = 0;

    simulationInterval.current = setInterval(() => {
      counter++;
      const currentProgress = (counter / stepsCount) * 100;
      setSimProgress(currentProgress);

      // Map progress ticks to actual sections of sirkuit
      let currentStage = "";
      let speed = 0;
      let gear = 1;
      let rpm = 1000;
      let angle = 0;
      let dir: "kiri" | "kanan" | "lurus" = "lurus";
      let brake = 0;
      let throttle = 100;

      // Base time tick increment
      const trackBaseLapTime = selectedTrack.bestTimeSec * lapPerformanceRatio;
      const progressDeltaTime = trackBaseLapTime / stepsCount;
      setSimLapTime(prev => parseFloat((prev + progressDeltaTime).toFixed(3)));

      if (currentProgress < 15) {
        // --- SECTION 1: MAIN STRAIGHT (Garis Lurus Utama) ---
        currentStage = "Lintasan Lurus Utama (Full Throttle)";
        // accelerate to full speed cap
        const maxStraightSpeed = tunedSpecs.topSpeed;
        speed = Math.floor(60 + (currentProgress / 15) * (maxStraightSpeed - 60));
        gear = speed > 220 ? 6 : speed > 170 ? 5 : speed > 120 ? 4 : speed > 80 ? 3 : 2;
        rpm = Math.floor(7000 + (speed % 40) * 110);
        angle = Math.floor(Math.sin(counter) * 1.5);
        dir = "lurus";
        brake = 0;
        throttle = 100;
        // warm rear tires under heavy throttle
        setTireTempRear(prev => Math.min(108, prev + 0.4));
      } else if (currentProgress >= 15 && currentProgress < 28) {
        // --- ZONE 2: TIKUNGAN 1 & 2 (Apex & Heavy Braking) ---
        currentStage = "Tikungan 1 S-Kecil (Late Braking & Entry Apex)";
        const minCornerSpeed = Math.max(50, 110 - (10 - tunedSpecs.handling) * 5);
        speed = Math.floor(tunedSpecs.topSpeed - ((currentProgress - 15) / 13) * (tunedSpecs.topSpeed - minCornerSpeed));
        gear = speed > 140 ? 4 : speed > 90 ? 3 : 2;
        rpm = Math.floor(6200 + (speed % 30) * 120);
        angle = Math.floor(38 + (currentProgress - 15) * 1.6); // 38 to 58 lean degree
        dir = "kanan";
        brake = 85; 
        throttle = 15;
        // front tire gets hot under braking
        setTireTempFront(prev => Math.min(95, prev + 0.6));
      } else if (currentProgress >= 28 && currentProgress < 33) {
        // --- SECTOR 1 END ---
        setSectorTimes(prev => {
          if (prev.s1 === 0) {
            return { ...prev, s1: parseFloat((trackBaseLapTime * 0.32).toFixed(3)) };
          }
          return prev;
        });
        currentStage = "Titik Akselerasi Keluar Tikungan";
        speed = Math.floor(100 + (tunedSpecs.acceleration * 10));
        gear = 3;
        rpm = 8800;
        angle = 20;
        dir = "kiri";
        brake = 0;
        throttle = 90;
      } else if (currentProgress >= 33 && currentProgress < 50) {
        // --- ZONE 3: SECTOR 2 FLOWING S-CURVES ---
        currentStage = "Rangkaian Tikungan Mengalir (S-Flowing Curves)";
        const flowingSpeed = Math.floor(110 + (tunedSpecs.handling * 8));
        speed = Math.floor(flowingSpeed + Math.sin(counter) * 15);
        gear = speed > 160 ? 5 : 4;
        rpm = Math.floor(9500 + Math.sin(counter) * 1500);
        angle = Math.floor(35 + Math.abs(Math.sin(counter * 1.2)) * 18);
        dir = counter % 2 === 0 ? "kiri" : "kanan";
        brake = Math.abs(Math.sin(counter)) > 0.7 ? 35 : 0;
        throttle = 75;
      } else if (currentProgress >= 50 && currentProgress < 66) {
        // --- TIKUNGAN TAJAM & PELAN ---
        currentStage = "Hairpin Corner (Gigi Rendah, Rebah Maksimal)";
        const hairpinSpeed = Math.max(38, 70 - (10 - tunedSpecs.handling) * 4);
        speed = Math.floor(hairpinSpeed + Math.sin(counter) * 5);
        gear = 1;
        rpm = Math.floor(5500 + Math.sin(counter) * 1200);
        angle = Math.floor(52 + Math.random() * 6); // Max deep low angle (52° to 58°)
        dir = "kiri";
        brake = 50;
        throttle = 35;
      } else if (currentProgress >= 66 && currentProgress < 75) {
        // --- SECTOR 2 END ---
        setSectorTimes(prev => {
          if (prev.s2 === 0) {
            return { ...prev, s2: parseFloat((trackBaseLapTime * 0.68).toFixed(3)) };
          }
          return prev;
        });
        currentStage = "Zona Akselerasi Keluar Tikungan Gantung";
        speed = Math.floor(120 + (currentProgress - 66) * 12);
        gear = 3;
        rpm = 11000;
        angle = 15;
        dir = "kanan";
        brake = 0;
        throttle = 100;
        setTireTempRear(prev => Math.min(105, prev + 0.5));
      } else if (currentProgress >= 75 && currentProgress < 95) {
        // --- ZONE 5: BACK STRAIGHT (Trek Lurus Belakang) ---
        currentStage = "Lintasan Lurus Belakang (Slipstream Chase)";
        const maxStraightSpeed = Math.floor(tunedSpecs.topSpeed * 0.95);
        speed = Math.floor(160 + ((currentProgress - 75) / 20) * (maxStraightSpeed - 160));
        gear = speed > 210 ? 6 : speed > 160 ? 5 : 4;
        rpm = Math.floor(8200 + (speed % 50) * 90);
        angle = 0;
        dir = "lurus";
        brake = 0;
        throttle = 100;
      } else {
        // --- ZONE 6: LAST CORNER & FINISH SWEEP ---
        currentStage = "Tikungan Terakhir & Tiket Finish!";
        const finalCornerSpeed = Math.max(80, 130 - (10 - tunedSpecs.handling) * 5);
        speed = Math.floor(finalCornerSpeed + ((currentProgress - 95) / 5) * 40);
        gear = 4;
        rpm = 10400;
        angle = Math.floor(30 - (currentProgress - 95) * 6);
        dir = "kanan";
        brake = 10;
        throttle = 90;
      }

      // Constrain RPM between 1000 and redline 14500 RPM
      const rpmRatio = Math.min(14500, Math.max(1000, rpm)) / 14500;

      // Update interactive gauges
      setLiveSpeed(speed);
      setLiveGear(gear);
      setLiveRPM(Math.min(14500, Math.max(1000, rpm)));
      setLiveLeanAngle(angle);
      setLeanDirection(dir);
      setLiveBrake(brake);
      setLiveThrottle(throttle);
      setTrackStageName(currentStage);

      // Sound Engine update
      if (soundEnabled) {
        audioEngineRef.current.updateRPM(rpmRatio, selectedMotor.engineSoundFreq);
      }

      // End of simulation lap reached!
      if (counter >= stepsCount) {
        clearInterval(simulationInterval.current);
        setIsSimulating(false);
        setSimProgress(100);

        // Finalize Lap Time & Sector 3
        const finalLapTime = parseFloat((trackBaseLapTime).toFixed(3));
        setSimLapTime(finalLapTime);
        const s3Time = parseFloat((finalLapTime - sectorTimes.s1 - sectorTimes.s2).toFixed(3));
        setSectorTimes(prev => ({ ...prev, s3: s3Time > 0 ? s3Time : parseFloat((trackBaseLapTime * 0.32).toFixed(3)) }));

        // Sound down
        if (soundEnabled) {
          audioEngineRef.current.updateRPM(0.1, selectedMotor.engineSoundFreq);
        }

        // Compute local racing score calculation (Performance rating index)
        const targetBest = selectedTrack.bestTimeSec;
        const speedPercentDiff = ((targetBest - finalLapTime) / targetBest) * 100;
        let finalScore = Math.floor(1000 + (speedPercentDiff * 105));
        if (finalScore < 100) finalScore = 150; // hard floor

        let rating = "Amatir Cepat";
        if (finalLapTime <= selectedTrack.bestTimeSec) {
          rating = "🏆 LEGENDA BALAP (Dewa Sirkuit)";
        } else if (finalLapTime <= selectedTrack.bestTimeSec * 1.05) {
          rating = "Super Cepat (Spek Pro)";
        } else if (finalLapTime <= selectedTrack.bestTimeSec * 1.15) {
          rating = "Kerap & Kompetitif (Rider Berbakat)";
        } else if (finalLapTime <= selectedTrack.bestTimeSec * 1.30) {
          rating = "Pembalap harian (Belum Optimal)";
        } else {
          rating = "Mekanik Magang (Butuh Bore Up lagi)";
        }

        // Unlocked record (Are they in the top of list?)
        const isNewRecord = finalLapTime <= selectedTrack.bestTimeSec;

        setRaceResult({
          lapTime: finalLapTime,
          score: finalScore,
          performanceRating: rating,
          unlockedRecord: isNewRecord
        });

        // Save Score back to leaderboard array
        const newScoreItem: RaceScore = {
          id: "score-" + Date.now(),
          riderName: riderName.trim() || "Pembalap Misterius",
          motorcycleName: selectedMotor.displayName,
          trackName: selectedTrack.name,
          lapTime: finalLapTime,
          score: finalScore,
          date: new Date().toLocaleDateString("id-ID")
        };

        setLeaderboard(prev => {
          const updated = [newScoreItem, ...prev].sort((a, b) => a.lapTime - b.lapTime).slice(0, 10);
          localStorage.setItem("racing_scores_v1", JSON.stringify(updated));
          return updated;
        });
      }
    }, intervalMs);
  };

  const handleStopSimulation = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }
    setIsSimulating(false);
    if (soundEnabled) {
      audioEngineRef.current.updateRPM(0.05, selectedMotor.engineSoundFreq);
    }
  };

  // Clean-up sounds and timers on unmount
  useEffect(() => {
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
      audioEngineRef.current.stop();
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col antialiased">
      {/* HEADER: SYSTEM TELEMETRY PANEL BANNER */}
      <header className="border-b border-zinc-800 bg-zinc-900/70 backdrop-blur-md px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Left Column: Racing Status Branding */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-red-600/20 px-3 py-1.5 rounded-md border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              <span className="text-[11px] font-black tracking-widest uppercase text-red-500">INDONESIAN RACING HUD</span>
            </div>
            <div className="hidden sm:inline-block h-6 w-[1px] bg-zinc-800"></div>
            <span className="text-xs text-zinc-400 font-mono tracking-wider hidden sm:inline-block">
              SENSORS: ONLINE (GPS 14 SATS LOCK)
            </span>
          </div>

          {/* Center Column: App Name & Moto Racing */}
          <div className="text-center">
            <h1 className="text-lg font-black tracking-tighter text-orange-500 flex items-center justify-center gap-1.5">
              <Flame className="w-5 h-5 text-red-500 animate-pulse fill-red-500" />
              GARASI BALAP INDONESIA
            </h1>
            <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">
              Simulator Setelan Mesin & Analisis Taktik AI
            </p>
          </div>

          {/* Right Column: Interactive Profile & Engine toggle */}
          <div className="flex items-center space-x-3">
            {/* Engine Sound Toggle Icon */}
            <button
              id="sound-opt-toggle"
              onClick={toggleSound}
              className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-mono font-medium ${
                soundEnabled 
                  ? "bg-orange-500/20 text-orange-400 border-orange-500/50" 
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700"
              }`}
              title="Aktifkan simulasi suara knalpot mesin Web Audio API"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-orange-400 animate-bounce" />
                  <span>Suara: ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-zinc-500" />
                  <span>Suara: OFF</span>
                </>
              )}
            </button>

            {/* Rider Username entry */}
            <div className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-md border border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-mono px-1.5">Rider:</span>
              <input
                id="rider-name-input"
                type="text"
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                maxLength={20}
                placeholder="Si Kencang"
                className="bg-zinc-900 border border-zinc-700 text-xs text-orange-400 px-2 py-1 rounded w-28 font-semibold focus:outline-none focus:border-orange-500 text-center"
              />
            </div>
          </div>

        </div>
      </header>

      {/* SUB BAR - Sirkuit & Motor Dashboard Status Indicators */}
      <div className="bg-zinc-950 border-b border-zinc-900 py-2.5 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between text-zinc-400">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-500 text-[10px] uppercase font-mono">Motor Aktif:</span>
            <span className="font-bold text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedMotor.color }}></div>
              {selectedMotor.displayName} ({selectedMotor.class})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-zinc-500 text-[10px] uppercase font-mono">Lokasi Balap:</span>
            <span className="font-bold text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-400">
              {selectedTrack.name}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[10px] font-mono">
            <span className="text-yellow-500">⚠️ STATUS: {isSimulating ? "BALAPAN SEDANG BERLANGSUNG 🏁" : "STANDBY DI PITSTOP 🔧"}</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COMPONENT COLUMN: NAVIGATION & CONTROLS PITSTOP (COL SPAN 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* TAB BAR SELECTOR */}
          <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex">
            <button
              id="tab-btn-pitstop"
              onClick={() => setActiveTab("PITSTOP")}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold tracking-wider uppercase transition-all ${
                activeTab === "PITSTOP"
                  ? "bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Wrench className="w-4 h-4" />
              🛠️ Pit Stop & Tuning
            </button>
            <button
              id="tab-btn-simulasi"
              onClick={() => setActiveTab("SIMULASI")}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold tracking-wider uppercase transition-all ${
                activeTab === "SIMULASI"
                  ? "bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Gauge className="w-4 h-4" />
              🏁 Live Simulasi HUD
            </button>
            <button
              id="tab-btn-leaderboard"
              onClick={() => setActiveTab("LEADERBOARD")}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold tracking-wider uppercase transition-all ${
                activeTab === "LEADERBOARD"
                  ? "bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Award className="w-4 h-4" />
              🏆 Papan Waktu Lap
            </button>
          </div>

          {/* TAB 1 CONTENT: VEHICLE SELECTION AND DETAILED TUNING BENCH */}
          {activeTab === "PITSTOP" && (
            <div className="space-y-6">
              
              {/* MOTOR SELECTION CAROUSEL */}
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <h2 className="text-xs uppercase font-bold tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                  Langkah 1: Pilih Kendaraan Balap Andalan Anda
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MOTORCYCLES.map((motor) => {
                    const isSelected = selectedMotor.id === motor.id;
                    return (
                      <div
                        key={motor.id}
                        id={`motor-select-${motor.id}`}
                        onClick={() => {
                          if (!isSimulating) setSelectedMotor(motor);
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? "bg-zinc-900 border-orange-500 ring-1 ring-orange-500/30"
                            : "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700"
                        } ${isSimulating ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        {/* Selected Indicator badge */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 text-orange-500">
                            <span className="text-[10px] font-bold bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/40">
                              Terpilih
                            </span>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: motor.color }}></span>
                            <h3 className="text-sm font-bold text-white">{motor.displayName}</h3>
                          </div>
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase tracking-wider">
                            {motor.class}
                          </span>
                          <p className="text-xs text-zinc-400 mt-2 italic line-clamp-2">
                            "{motor.description}"
                          </p>
                        </div>

                        {/* Motor Mini spec values */}
                        <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between text-xs text-zinc-400">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Top Speed</span>
                            <span className="font-bold text-white">{motor.baseTopSpeed} km/h</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Berat Base</span>
                            <span className="font-bold text-white">{motor.baseWeight} kg</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Handling</span>
                            <span className="font-bold text-teal-400">{motor.baseHandling}/10</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TUNING MECHANIC BOARD */}
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
                  <h2 className="text-xs uppercase font-bold tracking-widest text-zinc-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                    Langkah 2: Modifikasi Spesifikasi Paddock (Tuning Bench)
                  </h2>
                  <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded uppercase font-mono">
                    Mekanik Indonesia Spec
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Upgrade Customizations Dropdowns */}
                  <div className="space-y-4">
                    
                    {/* ECU Remap upgrade selector */}
                    <div>
                      <label className="text-xs text-zinc-300 block mb-1.5 font-bold flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-orange-500" />
                        Piston Bore-Up & ECU Mapping:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Standar", "Racing Remap", "Bore Up Extreme"] as const).map((mode) => (
                          <button
                            key={mode}
                            id={`ecu-mode-${mode}`}
                            disabled={isSimulating}
                            onClick={() => setTuning(prev => ({ ...prev, ecuMode: mode }))}
                            className={`py-2 px-1 rounded-md text-[11px] font-bold text-center border transition-all ${
                              tuning.ecuMode === mode
                                ? "bg-orange-500/20 border-orange-500 text-orange-400"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 italic">
                        {tuning.ecuMode === "Standar" && "Bawaan pabrik, andal untuk harian."}
                        {tuning.ecuMode === "Racing Remap" && "+10% HP, respon limiter mesin terbuka."}
                        {tuning.ecuMode === "Bore Up Extreme" && "Kompresi ekstrim, +28% Tenaga brutal, bodi berat bertambah!"}
                      </p>
                    </div>

                    {/* Exhaust custom selector */}
                    <div>
                      <label className="text-xs text-zinc-300 block mb-1.5 font-bold flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-zinc-400" />
                        Sistem Pembuangan (Knalpot):
                      </label>
                      <select
                        id="tuning-exhaust-select"
                        disabled={isSimulating}
                        value={tuning.exhaust}
                        onChange={(e) => setTuning(prev => ({ ...prev, exhaust: e.target.value as any }))}
                        className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs font-medium focus:outline-none focus:border-zinc-700 text-white"
                      >
                        <option value="Knalpot Standar">Knalpot Standar Pabrik (Silent)</option>
                        <option value="Knalpot Racing Slip-On">Knalpot Racing Slip-On (+5% HP, Pangkas 2kg)</option>
                        <option value="Full-System Carbon Racing">Full-System Carbon Racing Premium (+12% HP, Bobot -4.5kg)</option>
                      </select>
                    </div>

                    {/* Tire compound selector */}
                    <div>
                      <label className="text-xs text-zinc-300 block mb-1.5 font-bold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        Jenis Ban (Tire Compound):
                      </label>
                      <select
                        id="tuning-tires-select"
                        disabled={isSimulating}
                        value={tuning.tireCompound}
                        onChange={(e) => setTuning(prev => ({ ...prev, tireCompound: e.target.value as any }))}
                        className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs font-medium focus:outline-none focus:border-zinc-700 text-white"
                      >
                        <option value="Hard (Awet)">Keras / Hard Compound (Suhu awet, kurang nge-grip)</option>
                        <option value="Medium (Seimbang)">Sedang / Medium Compound (Aman segala aspal sirkuit)</option>
                        <option value="Soft Slick (Grip Maksimal)">Ban Balap Lunak / Soft Slick (Lekat aspal, rebah maksimal!)</option>
                      </select>
                    </div>

                    {/* Transmission gear ratios */}
                    <div>
                      <label className="text-xs text-zinc-300 block mb-1.5 font-bold flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-amber-500" />
                        Rasio Gigi Transmisi (Final Gear Ratio):
                      </label>
                      <select
                        id="tuning-gear-select"
                        disabled={isSimulating}
                        value={tuning.gearRatio}
                        onChange={(e) => setTuning(prev => ({ ...prev, gearRatio: e.target.value as any }))}
                        className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs font-medium focus:outline-none focus:border-zinc-700 text-white"
                      >
                        <option value="Medium (Seimbang)">Mata Gir Seimbang / Standar</option>
                        <option value="Lebar (Fokus Top Speed)">Gir Lebar / High Speed (+32 km/h top end, akselerasi berkurang)</option>
                        <option value="Merapat (Fokus Akselerasi)">Gir Merapat (Ngejambret bawah, akselerasi nendang di sirkuit pendek!)</option>
                      </select>
                    </div>

                  </div>

                  {/* Tuning SPECIFICATIONS PREVIEW RADIAL/GAUGE INDICATORS */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-3 border-b border-zinc-900 pb-2">
                        📊 Hasil Kalkulasi Simulasi Mesin Saat Ini
                      </h4>

                      <div className="space-y-4">
                        {/* Power output progress bar */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-400">Tenaga (Power / Horsepower)</span>
                            <span className="font-mono text-orange-400 font-bold">{tunedSpecs.power} HP</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-300"
                              style={{ width: `${Math.min(100, (tunedSpecs.power / 280) * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Torque output progress bar */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-400">Torsi (Torque)</span>
                            <span className="font-mono text-white font-bold">{tunedSpecs.torque} Nm</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-zinc-100 transition-all duration-300"
                              style={{ width: `${Math.min(100, (tunedSpecs.torque / 140) * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Weight value bar */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-400">Bobot Motor (Weight)</span>
                            <span className="font-mono text-red-400 font-bold">{tunedSpecs.weight} kg</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                            {/* Lighter weight is better representation (shorter bar is lighter, but let's draw inversely where lighter fills green) */}
                            <div 
                              className="h-full bg-red-500 transition-all duration-300"
                              style={{ width: `${Math.max(15, (tunedSpecs.weight / 200) * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Performance ratings dashboard scale */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="bg-zinc-900 p-2.5 rounded-lg text-center border border-zinc-800">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">Akselerasi Bawah</span>
                            <span className="text-base font-black text-rose-500 tracking-tighter">
                              {tunedSpecs.acceleration} / 10
                            </span>
                          </div>
                          <div className="bg-zinc-900 p-2.5 rounded-lg text-center border border-zinc-800">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">Handling Tikungan</span>
                            <span className="text-base font-black text-teal-400 tracking-tighter">
                              {tunedSpecs.handling} / 10
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center bg-zinc-900/40 p-2 rounded">
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-mono">ESTIMASI TOP SPEED</span>
                        <span className="text-xl font-bold font-mono tracking-tighter text-yellow-500">
                          {tunedSpecs.topSpeed} <span className="text-xs text-zinc-400">km/h</span>
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab("SIMULASI")}
                        className="bg-orange-500 hover:bg-orange-600 text-[11px] uppercase font-black tracking-wider text-black px-3 py-2 rounded-md transition-all flex items-center gap-1"
                      >
                        Bawa Ke Sirkuit
                        <Play className="w-3 h-3 fill-black" />
                      </button>
                    </div>

                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 2 CONTENT: LIVE RACING SIMULATOR HUD TELEMETRY CONTROLS */}
          {activeTab === "SIMULASI" && (
            <div className="space-y-6">
              
              {/* SIRKUIT SELECTION */}
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
                <h2 className="text-xs uppercase font-bold tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                  Langkah 3: Pilih Sirkuit Balap & Selidiki Karakter Trek
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {TRACKS.map((track) => {
                    const isSelected = selectedTrack.id === track.id;
                    return (
                      <button
                        key={track.id}
                        id={`track-select-${track.id}`}
                        disabled={isSimulating}
                        onClick={() => {
                          setSelectedTrack(track);
                          setRaceResult(null);
                        }}
                        className={`p-3.5 rounded-xl text-left border transition-all ${
                          isSelected
                            ? "bg-zinc-900 border-orange-500 ring-1 ring-orange-500/20"
                            : "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700"
                        } disabled:opacity-50`}
                      >
                        <div className="flex items-center gap-2 justify-between">
                          <h4 className="font-bold text-xs text-white">{track.name}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            track.difficulty === "Mudah" ? "bg-green-500/10 text-green-400 border border-green-550/30" :
                            track.difficulty === "Sedang" ? "bg-amber-500/10 text-amber-400 border border-amber-550/30" :
                            "bg-red-500/10 text-red-400 border border-red-550/30"
                          }`}>
                            {track.difficulty}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{track.location}</p>
                        <p className="text-[10px] text-zinc-400 mt-2 italic line-clamp-1">
                          "{track.character}"
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-zinc-800 flex justify-between text-[9px] font-mono text-zinc-500">
                          <span>Distansi: {track.length} m</span>
                          <span>{track.turns} Tikungan</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIVE SIMULATOR TELEMETRY DASH SPECIFICALLY INSPIRED BY THE THEME SPECIFICATION */}
              <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>

                {/* Simulated live status bar */}
                <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-red-600/20 px-3 py-1 rounded-full border border-red-500/30">
                      <div className={`w-2 h-2 ${isSimulating ? "bg-red-500 animate-pulse" : "bg-red-700"} rounded-full`}></div>
                      <span className="text-xs font-bold tracking-widest uppercase text-red-400">
                        {isSimulating ? "SIMULATING LAP" : "READY TO RUN"}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono tracking-wider">
                      RPM LIMIT: 14500 R/MIN
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-base font-black tracking-tighter uppercase text-white">
                      {selectedTrack.name}
                    </span>
                    <span className="text-[9px] text-zinc-500 tracking-[0.3em] uppercase">
                      TELEMETRY SIMULA
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-xs">
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 uppercase">Track Temp</div>
                      <div className="text-sm font-bold text-emerald-400">42°C</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 uppercase">Humid</div>
                      <div className="text-sm font-bold text-white">74%</div>
                    </div>
                  </div>
                </div>

                {/* THE TELEMETRY DISPLAY CLUSTER */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left sub-column: Angles and Tire Temperatures */}
                  <div className="md:col-span-3 space-y-4">
                    
                    {/* LEAN ANGLE HUD ELEMENT */}
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                      <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">
                        Lean Angle (Sudut Rebah)
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-light font-mono text-white">
                          {liveLeanAngle}<span className="text-sm text-zinc-500">°</span>
                        </div>
                        <div className="w-24 h-12 relative overflow-hidden flex items-end justify-center">
                          <div className="absolute inset-0 border-b-2 border-zinc-700"></div>
                          {/* Simulated rotating bike vector line */}
                          <div 
                            className="w-[2px] h-10 bg-orange-500 origin-bottom transition-transform duration-100 shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                            style={{ 
                              transform: `rotate(${leanDirection === "kiri" ? -liveLeanAngle : leanDirection === "kanan" ? liveLeanAngle : 0}deg)` 
                            }}
                          ></div>
                          <span className="absolute bottom-1 right-1 text-[9px] text-zinc-500 uppercase font-mono">
                            {leanDirection}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* TRACTION CONTROL TELEMETRY */}
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                      <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">
                        Kontrol Traksi (TC)
                      </h3>
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((bar) => {
                          const isActive = bar <= (tuning.tireCompound === "Soft Slick (Grip Maksimal)" ? 6 : 4);
                          return (
                            <div 
                              key={bar}
                              className={`h-8 w-2.5 rounded-sm transition-all ${
                                isActive 
                                  ? "bg-gradient-to-t from-orange-600 to-amber-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]" 
                                  : "bg-zinc-800"
                              }`}
                            ></div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center mt-2.5">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">Level Traksi</span>
                        <span className="font-mono text-xs font-bold text-white">
                          LVL {tuning.tireCompound === "Soft Slick (Grip Maksimal)" ? "6 (MAKS)" : "4 (SEIMBANG)"}
                        </span>
                      </div>
                    </div>

                    {/* TYRE TEMPERATURE */}
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl space-y-3">
                      <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest border-b border-zinc-800 pb-1">
                        Suhu Ban Depan/Belakang
                      </h3>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">BAN DEPAN</span>
                          <span className={`font-mono font-bold ${tireTempFront > 85 ? "text-red-400" : "text-green-400"}`}>
                            {tireTempFront.toFixed(1)}°C
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              tireTempFront > 85 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                            }`}
                            style={{ width: `${Math.min(100, (tireTempFront / 120) * 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">BAN BELAKANG</span>
                          <span className={`font-mono font-bold ${tireTempRear > 95 ? "text-orange-400 animate-pulse" : "text-emerald-400"}`}>
                            {tireTempRear.toFixed(1)}°C
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500 rounded-full transition-all shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                            style={{ width: `${Math.min(100, (tireTempRear / 120) * 100)}%` }}
                          ></div>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* Center Column: LCD Speedometer & Gear Box Cluster */}
                  <div className="md:col-span-6 flex flex-col justify-between items-center relative py-2">
                    
                    {/* LIVE TRACK SIMULATION TIMELINE BAR */}
                    <div className="w-full bg-zinc-900/70 p-3 rounded-xl border border-zinc-800 mb-4 text-center">
                      <div className="flex justify-between text-[9px] font-mono text-zinc-500 mb-1">
                        <span>START</span>
                        <span>LAP PROGRESS ({Math.floor(simProgress)}%)</span>
                        <span>FINISH</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-950 rounded-full relative overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-150"
                          style={{ width: `${simProgress}%` }}
                        ></div>
                        {/* Little dot locator */}
                        <div 
                          className="absolute top-0 w-2 h-2 bg-white rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                          style={{ left: `calc(${simProgress}% - 4px)` }}
                        ></div>
                      </div>
                      <span className="text-xs text-orange-400 font-bold tracking-tight block mt-2 animate-pulse">
                        🎯 {trackStageName}
                      </span>
                    </div>

                    {/* RPM REV BAR (0 to 14 x1000 RPM) */}
                    <div className="w-full flex flex-col items-center mb-6">
                      <div className="w-full flex justify-between px-2 mb-1 text-[9px] font-mono text-zinc-500">
                        <span>0</span><span>2k</span><span>4k</span><span>6k</span><span>8k</span><span>10k</span><span>12k</span><span className="text-red-500 font-bold">14k</span>
                      </div>
                      <div className="w-full h-7 bg-zinc-900 rounded-lg border border-zinc-800 flex p-1 overflow-hidden relative">
                        {/* RPM Fill ratio */}
                        <div 
                          className="h-full bg-gradient-to-r from-teal-400 via-orange-500 to-red-600 transition-all duration-100"
                          style={{ width: `${(liveRPM / 14500) * 100}%` }}
                        ></div>
                        
                        {/* Shift warning overlay if high rpm */}
                        {liveRPM > 12000 && (
                          <div className="absolute inset-0 bg-red-600/20 border-2 border-red-500 animate-ping pointer-events-none"></div>
                        )}
                      </div>
                      <span className="text-[10px] tracking-widest text-zinc-500 font-mono mt-1">
                        🚀 {liveRPM.toLocaleString("id-ID")} RPM / PUTARAN DUA SILINDER
                      </span>
                    </div>

                    {/* LCD Speedometer & Large GEAR Display */}
                    <div className="flex flex-col items-center my-2">
                      <div className="text-8xl md:text-9xl leading-none font-black tracking-tighter text-white font-mono drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] select-none">
                        {liveSpeed}
                      </div>
                      <span className="text-xl font-mono text-zinc-500 tracking-widest">km/h</span>

                      {/* GEAR BOX */}
                      <div className="mt-4 flex flex-col items-center">
                        <div className="w-20 h-24 bg-zinc-900 rounded-xl border-2 border-orange-500/50 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.15)]">
                          <span className="text-5xl font-black text-orange-500 leading-none">
                            {liveGear}
                          </span>
                        </div>
                        <span className="mt-1 text-[9px] font-bold tracking-[0.4em] text-zinc-500 uppercase">
                          GEAR TRANSMISSION
                        </span>
                      </div>
                    </div>

                    {/* DRAG STRIP BUTTON ACTION STYLES */}
                    <div className="space-y-4 w-full mt-6">
                      <div className="flex gap-4 justify-center">
                        {isSimulating ? (
                          <button
                            id="race-stop-btn"
                            onClick={handleStopSimulation}
                            className="bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-full flex items-center gap-2 transition-all shadow-lg active:scale-95"
                          >
                            <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                            BATALKAN BALAPAN / RETIRE
                          </button>
                        ) : (
                          <button
                            id="race-simulate-btn"
                            onClick={handleStartSimulation}
                            className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded-full flex items-center gap-2.5 transition-all shadow-[0_5px_15px_rgba(220,38,38,0.4)] active:scale-95"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            MULAI BALAPAN (LAP SIMULASI LIVE)
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 text-center italic">
                        *Sistem akan mengevaluasi settingan gear dan tingkat rebah motor Anda di sirkuit {selectedTrack.name} secara real time!
                      </p>
                    </div>

                  </div>

                  {/* Right Column: Laps & timing records */}
                  <div className="md:col-span-3 space-y-4">
                    
                    {/* Current Lap timer */}
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                      <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">
                        Waktu Lap Aktif
                      </h3>
                      <div className="text-3xl font-mono font-bold text-white flex items-center gap-1.5">
                        <Timer className="w-5 h-5 text-zinc-400 animate-spin" />
                        {Math.floor(simLapTime / 60)}:
                        {(simLapTime % 60).toFixed(3).padStart(6, "0")}
                      </div>
                      <div className="flex items-center space-x-2 mt-2.5">
                        <div className="text-[10px] text-emerald-400 font-bold tracking-tight uppercase">
                          Target Record: {selectedTrack.bestTimeSec}s
                        </div>
                        <div className="h-[1px] flex-1 bg-zinc-800"></div>
                      </div>
                    </div>

                    {/* Sector details */}
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl space-y-2.5">
                      <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 border-b border-zinc-800 pb-1">
                        Sektor Split (Detik)
                      </h3>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-mono">SEKTOR 1 (S1)</span>
                        <span className="font-mono text-zinc-300 font-semibold">
                          {sectorTimes.s1 > 0 ? `${sectorTimes.s1.toFixed(3)}s` : "--.---"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-mono">SEKTOR 2 (S2)</span>
                        <span className="font-mono text-zinc-300 font-semibold">
                          {sectorTimes.s2 > 0 ? `${sectorTimes.s2.toFixed(3)}s` : "--.---"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-mono">SEKTOR 3 (S3)</span>
                        <span className="font-mono text-zinc-300 font-semibold">
                          {sectorTimes.s3 > 0 ? `${sectorTimes.s3.toFixed(3)}s` : "--.---"}
                        </span>
                      </div>
                    </div>

                    {/* Brake / Throttle percentage bars */}
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                      <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">
                        Input REM vs GAS
                      </h3>
                      <div className="flex h-24 gap-4 justify-center items-end">
                        
                        {/* Brake bar */}
                        <div className="w-10 bg-zinc-950 rounded-md relative flex flex-col justify-end h-full p-0.5 border border-zinc-800">
                          <div 
                            className="bg-red-500 rounded transition-all duration-100 shadow-[0_0_8px_rgba(239,68,68,0.5)]" 
                            style={{ height: `${liveBrake}%`, width: "100%" }}
                          ></div>
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white uppercase mix-blend-difference">
                            {liveBrake}%
                          </span>
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-zinc-500 font-bold">BRK</span>
                        </div>

                        {/* Throttle bar */}
                        <div className="w-10 bg-zinc-950 rounded-md relative flex flex-col justify-end h-full p-0.5 border border-zinc-800">
                          <div 
                            className="bg-green-500 rounded transition-all duration-100 shadow-[0_0_8px_rgba(34,197,94,0.5)]" 
                            style={{ height: `${liveThrottle}%`, width: "100%" }}
                          ></div>
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white uppercase mix-blend-difference">
                            {liveThrottle}%
                          </span>
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-zinc-500 font-bold">THR</span>
                        </div>

                      </div>
                    </div>

                  </div>

                </div>

                {/* Engine Status Indicators row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 border-t border-zinc-800 pt-4 text-xs">
                  <div className="flex items-center space-x-3 bg-zinc-900/40 p-2 rounded-lg border border-zinc-900">
                    <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center border border-zinc-800 text-amber-500">
                      ⚡
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase">Engine Health</div>
                      <div className="font-bold uppercase text-white">Good (98%)</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 bg-zinc-900/40 p-2 rounded-lg border border-zinc-900">
                    <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center border border-zinc-800 text-red-400">
                      🌡️
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase">Suhu Radiator</div>
                      <div className="font-bold text-white">
                        {isSimulating ? "98°C" : "42°C"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 bg-zinc-900/40 p-2 rounded-lg border border-zinc-900">
                    <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center border border-zinc-800 text-yellow-500">
                      ⛽
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase">Oli Mesin</div>
                      <div className="font-bold uppercase text-white">SAE 10W-40</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 bg-zinc-900/40 p-2 rounded-lg border border-zinc-900">
                    <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center border border-zinc-800 text-emerald-400">
                      🛡️
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase">Tekanan Ban</div>
                      <div className="font-bold text-white">F:26R:28 PSI</div>
                    </div>
                  </div>
                </div>

                {/* POPUP SIMULATION LAP REPORT RESULT */}
                {raceResult && (
                  <div className="mt-6 p-5 bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-orange-500 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_10px_30px_rgba(249,115,22,0.15)] animate-in fade-in slide-in-from-bottom-2">
                    <div>
                      <span className="text-[10px] text-orange-500 uppercase tracking-widest font-mono font-bold block mb-1">
                        🏆 HASIL LAP BALAP RESMI (QUALIFYING VERDICT)
                      </span>
                      <h4 className="text-2xl font-black text-white">
                        {Math.floor(raceResult.lapTime / 60)}:
                        {(raceResult.lapTime % 60).toFixed(3).padStart(6, "0")} Detik
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 px-0.5">
                        <span className="text-xs text-zinc-400">
                          Rider: <strong className="text-orange-400">{riderName}</strong>
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-xs text-zinc-400">
                          Peringkat Gaya Mengemudi: <strong className="text-white">{raceResult.performanceRating}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">
                        Settinganmu: <strong className="text-zinc-300">{tuning.ecuMode} + {tuning.exhaust} + {tuning.tireCompound}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 text-right w-full md:w-auto">
                      <div className="text-xs bg-zinc-900 py-1 px-3 rounded-md border border-zinc-800 text-zinc-400 font-mono w-full text-center md:text-right">
                        Skor Telemetri: <strong className="text-white text-sm">{raceResult.score} PTS</strong>
                      </div>
                      <button
                        onClick={handleAskCoach}
                        className="w-full md:w-auto bg-yellow-500 hover:bg-yellow-600 text-black py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 mt-1"
                      >
                        Tanya Strategi Coach AI 🧠
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 3 CONTENT: LEADERBOARD BOARD (LOCAL PERSISTENT STORAGE LAP TIMES) */}
          {activeTab === "LEADERBOARD" && (
            <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
                <div>
                  <h2 className="text-xs uppercase font-bold tracking-widest text-zinc-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                    Sirkuit Nasional Papan Waktu Lap Tercepat
                  </h2>
                  <p className="text-[10px] text-zinc-500 mt-1">Daftar pembalap dengan setelan terfokus dan raceline sempurna</p>
                </div>
                <button
                  id="reset-leaderboards-btn"
                  onClick={() => {
                    if (window.confirm("Apakah Anda yakin ingin menyetel ulang rekor waktu?")) {
                      localStorage.removeItem("racing_scores_v1");
                      window.location.reload();
                    }
                  }}
                  className="p-2 bg-zinc-950 text-red-400 border border-red-500/20 text-[10px] rounded hover:bg-red-950/30 transition-all font-mono"
                >
                  Clear Waktu
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-400">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] uppercase font-mono text-zinc-500">
                      <th className="py-2.5 px-3">POS</th>
                      <th className="py-2.5 px-3">NAMA PEMBALAP</th>
                      <th className="py-2.5 px-3">KENDARAAN MOTO</th>
                      <th className="py-2.5 px-3">SIRKUIT</th>
                      <th className="py-2.5 px-3">WAKTU LAP</th>
                      <th className="py-2.5 px-3 text-right">SKOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-mono">
                    {leaderboard.map((item, index) => {
                      const isTop = index === 0;
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-zinc-900/40 transition-all ${
                            isTop ? "bg-orange-500/5 text-orange-400" : ""
                          }`}
                        >
                          <td className="py-3 px-3 font-bold">
                            {index === 0 ? "🥇 1" : index === 1 ? "🥈 2" : index === 2 ? "🥉 3" : ` ${index + 1}`}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-white">{item.riderName}</span>
                          </td>
                          <td className="py-3 px-3 font-sans text-zinc-300">{item.motorcycleName}</td>
                          <td className="py-3 px-3 text-zinc-400">{item.trackName}</td>
                          <td className="py-3 px-3 font-bold text-white">
                            {Math.floor(item.lapTime / 60)}:
                            {(item.lapTime % 60).toFixed(3).padStart(6, "0")}s
                          </td>
                          <td className="py-3 px-3 text-right text-orange-400 font-bold">{item.score} pts</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-zinc-950 rounded-xl border border-zinc-900 text-[11px] text-zinc-500">
                💡 <strong>Catatan Teknis Mekanik</strong>: Ganti Rasio Gear transmisi ke "Merapat (Fokus Akselerasi)" ditambah ban Soft Slick jika menjajal sirkuit pendek Bukit Peusar Tasikmalaya untuk memecahkan rekor podium di atas!
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: COACH AI PADDOCK STRATEGIST (COL SPAN 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* TRACK MINIMAP REPRESENTATION CARD */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl relative">
            <h3 className="text-xs uppercase font-bold tracking-widest text-zinc-450 border-b border-zinc-800 pb-2 mb-3">
              📐 Karakter sirkuit: {selectedTrack.name}
            </h3>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col items-center justify-center">
              {/* Sirkuit vector visualization helper */}
              <div className="w-full aspect-square max-w-[200px] flex items-center justify-center relative">
                
                {selectedTrack.id === "mandalika" && (
                  <svg viewBox="0 0 100 100" className="w-full h-full stroke-emerald-500 fill-none stroke-[3] drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    {/* Mandalika Flowing circuit representation */}
                    <path d="M 20 20 C 50 10, 80 15, 85 45 C 90 70, 75 90, 50 85 C 30 80, 10 90, 8 60 C 5 35, 10 25, 20 20 Z" />
                    <circle cx="20" cy="20" r="3" className="fill-white" />
                  </svg>
                )}

                {selectedTrack.id === "sentul" && (
                  <svg viewBox="0 0 100 100" className="w-full h-full stroke-amber-500 fill-none stroke-[3] drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                    {/* Sentul classic loop with long straight representation */}
                    <path d="M 10 30 L 90 30 L 85 70 L 60 70 L 55 50 L 30 75 L 12 70 Z" />
                    <circle cx="10" cy="30" r="3" className="fill-white" />
                  </svg>
                )}

                {selectedTrack.id === "subang" && (
                  <svg viewBox="0 0 100 100" className="w-full h-full stroke-indigo-500 fill-none stroke-[3] drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">
                    {/* Bukit peusar super twisty representation */}
                    <path d="M 15 15 C 35 30, 10 45, 45 40 C 70 35, 85 10, 85 45 C 85 75, 40 60, 35 85 C 10 75, 5 45, 15 15 Z" />
                    <circle cx="15" cy="15" r="3" className="fill-white" />
                  </svg>
                )}

                {/* S-curves telemetry tag */}
                <div className="absolute top-2 left-2 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[9px] text-zinc-400 font-mono">
                  {selectedTrack.turns} Tikungan
                </div>
                <div className="absolute bottom-2 right-2 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[9px] text-zinc-400 font-mono">
                  {selectedTrack.length} m
                </div>
              </div>

              <div className="w-full mt-4 text-xs space-y-2 border-t border-zinc-900 pt-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Lokasi:</span>
                  <span className="text-zinc-300 font-bold">{selectedTrack.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tikungan Kiri/Kanan:</span>
                  <span className="text-zinc-300 font-mono">
                    {selectedTrack.leftTurns}L / {selectedTrack.rightTurns}R
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Catatan Waktu Lap Rekor:</span>
                  <span className="text-yellow-500 font-bold font-mono">{selectedTrack.bestTimeSec} detik</span>
                </div>
              </div>

            </div>
          </div>

          {/* AI COACH MEKANIK ADVICE DESK - LINKED TO API WITH DETAILED OUTPUT EXPLAINER */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-550 to-orange-500"></div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs uppercase font-bold tracking-widest text-zinc-400 flex items-center gap-1">
                  🧠 Analisis Mekanik Utama & Coach AI
                </h3>
                {/* Loader */}
                {loadingCoach && (
                  <span className="text-[10px] text-yellow-500 flex items-center gap-1 font-mono animate-pulse">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping"></span>
                    Menganalisis...
                  </span>
                )}
              </div>

              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-900 text-xs text-zinc-300 min-h-[220px] max-h-[380px] overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800 prose prose-invert">
                {/* Parse newline to list paragraphs elegantly */}
                {coachText.split("\n").map((para, i) => {
                  if (para.trim().startsWith("-") || para.trim().startsWith("*")) {
                    return <li key={i} className="mb-1 text-zinc-300 hover:text-white" dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />;
                  }
                  return (
                    <p 
                      key={i} 
                      className="mb-2.5 last:mb-0 text-zinc-350"
                      dangerouslySetInnerHTML={{
                        __html: para
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/🛠️/g, '🛠️')
                          .replace(/🏁/g, '🏁')
                          .replace(/💡/g, '💡')
                      }} 
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between gap-2.5">
              <button
                id="btn-ask-coach-panel"
                onClick={handleAskCoach}
                disabled={loadingCoach}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-zinc-800 text-black py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_10px_rgba(234,179,8,0.2)]"
              >
                {loadingCoach ? "Menganalisi Spek..." : "Tanya Masukan Coach AI"}
              </button>
            </div>
            
            <p className="text-[9px] text-zinc-500 mt-2 text-center">
              ⚠️ AI memberikan panduan berdasarkan kalkulasi Power-to-weight ratio mesin dan jenis sirkuit.
            </p>
          </div>

        </div>

      </main>

      {/* FOOTER DESK */}
      <footer className="bg-zinc-900/40 border-t border-zinc-900 py-6 mt-12 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>
            © 2026 Garasi Balap Indonesia. Tuned for peak cornering speed.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-300">Hubungi Pitstop</a>
            <a href="#" className="hover:text-zinc-300">Panduan Road Race Pekanbaru & Mandalika</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
