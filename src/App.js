import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────
const GOALS = { calories: 3200, protein: 150, water: 128 };

const SCHEDULE = {
  Monday: [
    { time: "3:00–4:30pm", activity: "Gym — Chest & Triceps", type: "gym" },
    { time: "5:30–6:30pm", activity: "Boxing w/ Antonio Vasquez", type: "mma" },
    { time: "6:30–7:30pm", activity: "Jiu Jitsu No Gi w/ Kenny Thai", type: "mma" },
  ],
  Tuesday: [
    { time: "3:00–4:30pm", activity: "Gym — Back & Shoulders", type: "gym" },
    { time: "4:30–5:30pm", activity: "Rock Climbing", type: "climbing" },
  ],
  Wednesday: [
    { time: "3:00–4:30pm", activity: "Gym — Arms", type: "gym" },
    { time: "5:30–6:30pm", activity: "Boxing w/ Antonio Vasquez", type: "mma" },
    { time: "6:30–7:30pm", activity: "Muay Thai Drills w/ Gilbert", type: "mma" },
    { time: "7:30–8:30pm", activity: "Jiu Jitsu No Gi w/ Gilbert & Kenny", type: "mma" },
  ],
  Thursday: [
    { time: "5:30–6:30pm", activity: "Muay Thai All Levels w/ Edge Brown", type: "mma" },
  ],
  Friday: [
    { time: "2:00–4:00pm", activity: "Rock Climbing", type: "climbing" },
    { time: "5:30–6:30pm", activity: "Jiu Jitsu No Gi w/ Kenny Thai", type: "mma" },
    { time: "6:30–7:30pm", activity: "Beginner Sparring w/ Antonio Vasquez", type: "mma" },
  ],
  Saturday: [{ time: "Morning", activity: "Rock Climbing", type: "climbing" }],
  Sunday: [{ time: "Morning", activity: "Gym — Full Arms", type: "gym" }],
};

const QUICK_FOODS = [
  { name: "3 Eggs", calories: 210, protein: 18 },
  { name: "2 Packets Oatmeal", calories: 200, protein: 8 },
  { name: "Protein Shake", calories: 150, protein: 25 },
  { name: "Chipotle Double Chicken Bowl", calories: 1050, protein: 57 },
  { name: "Bacon (3 strips)", calories: 140, protein: 14 },
  { name: "Greek Yogurt + Granola", calories: 380, protein: 18 },
  { name: "PB on Rice Cakes (3)", calories: 290, protein: 8 },
  { name: "2 Bacon Cheeseburgers", calories: 900, protein: 50 },
  { name: "Coconut Water", calories: 120, protein: 2 },
  { name: "Banana + PB", calories: 300, protein: 8 },
  { name: "Cottage Cheese (1 cup)", calories: 200, protein: 25 },
  { name: "Canned Tuna", calories: 130, protein: 28 },
  { name: "Ground Beef + Rice", calories: 650, protein: 40 },
  { name: "Chicken Thighs (2)", calories: 400, protein: 36 },
];

// Gym only workouts
const WORKOUT_TEMPLATES = {
  "Chest & Triceps": ["Chest Press Machine","Incline Press Machine","Pec Deck","Tricep Pushdown","Dumbbell Kickbacks","Overhead Tricep Extension","Dips"],
  "Back & Shoulders": ["Lower Back Press","Vertical Traction","Low Row","Shoulder Press","Lateral Raises","Trap Shrugs"],
  "Arms": ["Bicep Curl","Hammer Curl","Tricep Pushdown","Overhead Tricep Extension"],
  "Full Body": ["Chest Press Machine","Low Row","Shoulder Press","Bicep Curl","Tricep Pushdown","Lateral Raises"],
  "Custom": [],
};

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const TYPE_COLORS = { gym: "#00C805", mma: "#FF6B35", climbing: "#4A9EFF" };
const TYPE_LABELS = { gym: "GYM", mma: "MMA", climbing: "CLIMB" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}
function getDayName(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
}
function getTodayName() { return getDayName(todayStr()); }
function fmt(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function getDisplayDate() {
  return new Date().toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric"
  });
}

// ── Design System ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0D0D0F",
  surface: "#141416",
  surfaceUp: "#1C1C1F",
  border: "#252528",
  accent: "#00C805",
  accentBg: "rgba(0,200,5,0.08)",
  accentBorder: "rgba(0,200,5,0.2)",
  text: "#FFFFFF",
  textSub: "#8A8A8E",
  textDim: "#3A3A3E",
  red: "#FF453A",
  orange: "#FF9F0A",
  blue: "#4A9EFF",
  font: "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
  r: "14px",
  rSm: "10px",
};

// ── Reusable UI ───────────────────────────────────────────────────────────────
const Card = ({ children, style = {}, accent }) => (
  <div style={{
    background: C.surface, borderRadius: C.r, padding: "18px",
    marginBottom: "12px", border: `1px solid ${accent ? `${accent}25` : C.border}`,
    borderLeft: accent ? `3px solid ${accent}` : `1px solid ${C.border}`,
    ...style
  }}>{children}</div>
);

const SectionLabel = ({ children, color = C.textSub }) => (
  <div style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.8px", color, marginBottom: "14px", textTransform: "uppercase" }}>
    {children}
  </div>
);

const PillButton = ({ children, onClick, active, color = C.accent, style = {} }) => (
  <button onClick={onClick} style={{
    background: active ? `${color}15` : "transparent",
    border: `1px solid ${active ? color : C.border}`,
    borderRadius: "20px", padding: "7px 14px", cursor: "pointer",
    color: active ? color : C.textSub, fontSize: "12px", fontWeight: "600",
    fontFamily: C.font, transition: "all 0.15s", ...style
  }}>{children}</button>
);

const Input = ({ style = {}, ...props }) => (
  <input style={{
    background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: C.rSm,
    padding: "12px 14px", color: C.text, fontSize: "15px", fontFamily: C.font,
    outline: "none", width: "100%", boxSizing: "border-box", ...style
  }} {...props} />
);

// Ring progress component
const Ring = ({ pct, color, size = 64, stroke = 5 }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surfaceUp} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(pct,100) / 100)}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("today");
  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState({ calories: 0, protein: 0, water: 0, food_log: [], completed_workouts: [], weight: null });
  const [customFood, setCustomFood] = useState({ name: "", calories: "", protein: "" });
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [toast, setToast] = useState(null);
  const [weightInput, setWeightInput] = useState("");
  const [workoutTab, setWorkoutTab] = useState("log");
  const [selectedTemplate, setSelectedTemplate] = useState("Chest & Triceps");
  const [currentWorkout, setCurrentWorkout] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [addingExercise, setAddingExercise] = useState(null);
  const [setInput, setSetInput] = useState({ weight: "", reps: "" });
  const [customExercise, setCustomExercise] = useState("");
  const [history, setHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState("week");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getTodayName());
  // Oura — ready for when ring arrives
  const [ouraData, setOuraData] = useState(null);
  const today = getTodayName();

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Supabase ──────────────────────────────────────────────────────────────
  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("daily_logs").select("*").eq("date", todayStr()).single();
      if (data) {
        setDayData({
          calories: data.calories || 0, protein: data.protein || 0,
          water: data.water || 0, food_log: data.food_log || [],
          completed_workouts: data.completed_workouts || [], weight: data.weight || null,
        });
        if (data.weight) setWeightInput(String(data.weight));
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await supabase.from("daily_logs").select("*").order("date", { ascending: false }).limit(90);
      if (data) setHistory(data);
    } catch (_) {}
  }, []);

  const loadWorkoutHistory = useCallback(async () => {
    try {
      const { data } = await supabase.from("workout_logs").select("*").order("date", { ascending: false }).limit(30);
      if (data) setWorkoutHistory(data);
    } catch (_) {}
  }, []);

  useEffect(() => { loadToday(); loadHistory(); loadWorkoutHistory(); }, [loadToday, loadHistory, loadWorkoutHistory]);

  const saveDay = async (updates) => {
    const merged = { ...dayData, ...updates };
    setDayData(merged);
    try {
      await supabase.from("daily_logs").upsert({
        date: todayStr(), calories: merged.calories, protein: merged.protein,
        water: merged.water, food_log: merged.food_log,
        completed_workouts: merged.completed_workouts, weight: merged.weight,
      }, { onConflict: "date" });
      loadHistory();
    } catch (_) { showToast("Save failed — check Supabase", true); }
  };

  // ── Food ──────────────────────────────────────────────────────────────────
  const addFood = (food, key) => {
    const newLog = [...dayData.food_log, {
      ...food, id: Date.now(),
      time: new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit" })
    }];
    saveDay({ calories: dayData.calories + food.calories, protein: dayData.protein + food.protein, food_log: newLog });
    setRecentlyAdded(key ?? food.name);
    setTimeout(() => setRecentlyAdded(null), 800);
    showToast(`Added ${food.name}`);
  };

  const removeFood = (item) => {
    saveDay({
      calories: Math.max(0, dayData.calories - item.calories),
      protein: Math.max(0, dayData.protein - item.protein),
      food_log: dayData.food_log.filter(f => f.id !== item.id),
    });
  };

  const addCustomFood = () => {
    if (!customFood.name || !customFood.calories) return;
    addFood({ name: customFood.name, calories: Number(customFood.calories), protein: Number(customFood.protein || 0) }, "custom");
    setCustomFood({ name: "", calories: "", protein: "" });
  };

  // ── Water ─────────────────────────────────────────────────────────────────
  const addWater = (oz) => saveDay({ water: Math.min(dayData.water + oz, 200) });
  const removeWater = (oz) => saveDay({ water: Math.max(0, dayData.water - oz) });

  // ── Schedule workouts ─────────────────────────────────────────────────────
  const toggleScheduleWorkout = (activity) => {
    const cw = dayData.completed_workouts;
    saveDay({ completed_workouts: cw.includes(activity) ? cw.filter(w => w !== activity) : [...cw, activity] });
  };

  // ── Gym workout tracker ───────────────────────────────────────────────────
  const addSet = (exerciseName) => {
    if (!setInput.reps) return;
    const newSet = { weight: Number(setInput.weight) || 0, reps: Number(setInput.reps) };
    const exists = currentWorkout.find(e => e.name === exerciseName);
    if (exists) {
      setCurrentWorkout(p => p.map(e => e.name === exerciseName ? { ...e, sets: [...e.sets, newSet] } : e));
    } else {
      setCurrentWorkout(p => [...p, { name: exerciseName, sets: [newSet] }]);
    }
    setSetInput({ weight: "", reps: "" });
    setAddingExercise(null);
    showToast("Set logged");
  };

  const removeSet = (name, idx) => {
    setCurrentWorkout(p => p.map(e => e.name === name ? { ...e, sets: e.sets.filter((_, i) => i !== idx) } : e).filter(e => e.sets.length > 0));
  };

  const saveWorkout = async () => {
    if (!currentWorkout.length) return;
    try {
      await supabase.from("workout_logs").insert({
        date: todayStr(), day_name: today, workout_type: selectedTemplate, exercises: currentWorkout,
      });
      showToast("Workout saved!");
      setCurrentWorkout([]);
      loadWorkoutHistory();
    } catch (_) { showToast("Save failed — run SQL setup in Supabase", true); }
  };

  // ── Weight ────────────────────────────────────────────────────────────────
  const saveWeight = () => {
    const w = parseFloat(weightInput);
    if (!w) return;
    saveDay({ weight: w });
    showToast(`Weight logged: ${w} lbs`);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetDay = async () => {
    const reset = { calories: 0, protein: 0, water: 0, food_log: [], completed_workouts: [], weight: null };
    setDayData(reset); setWeightInput("");
    try { await supabase.from("daily_logs").upsert({ date: todayStr(), ...reset }, { onConflict: "date" }); } catch (_) {}
    loadHistory();
  };

  // ── AI Coach ──────────────────────────────────────────────────────────────
  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const streak = calcStreak();
      const { avgCal, avgProt } = getWeekData();
      const recentW = workoutHistory.slice(0, 3).map(w => `${w.day_name}: ${w.workout_type}`).join(", ");
      const ouraContext = ouraData
        ? `Oura recovery score: ${ouraData.recovery_score}, sleep score: ${ouraData.sleep_score}, HRV: ${ouraData.hrv}, resting HR: ${ouraData.resting_hr}.`
        : "No Oura Ring data yet.";

      const systemPrompt = `You are a fitness coach AI for Kaden, an 18-year-old athlete (6'1", 160 lbs) in Oakland CA. Goals: gain lean muscle, get stronger for MMA, rock climbing and lifting. Daily targets: 3000-3200 calories, 130-160g protein, 1 gallon water. Trains MMA (boxing, jiu jitsu, muay thai), rock climbs, lifts. Takes creatine and whey protein daily.

Today is ${today}. Current stats: ${dayData.calories} cal eaten, ${dayData.protein}g protein, ${dayData.water}oz water. ${ouraContext} Current streak: ${streak} days hitting goals. This week average: ${avgCal} cal/day, ${avgProt}g protein/day. Recent workouts: ${recentW || "none logged yet"}.

Be direct, practical and encouraging. Keep responses short and actionable. No fluff.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-ipc": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: "user", content: aiQuery }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "API error");
      }

      const data = await response.json();
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "No response.";
      setAiResponse(text);
    } catch (e) {
      setAiResponse(`Error: ${e.message}. Make sure the app is deployed on Vercel — AI only works on the live URL, not locally.`);
    }
    setAiLoading(false);
  };

  // ── Analytics ─────────────────────────────────────────────────────────────
  const calcStreak = () => {
    let s = 0;
    for (const d of [...history].sort((a, b) => b.date.localeCompare(a.date))) {
      if (d.calories >= GOALS.calories * 0.85 && d.protein >= GOALS.protein * 0.85) s++;
      else break;
    }
    return s;
  };

  const getWeekData = () => {
    const w = history.slice(0, 7);
    return w.length
      ? { avgCal: Math.round(w.reduce((s, d) => s + (d.calories || 0), 0) / w.length), avgProt: Math.round(w.reduce((s, d) => s + (d.protein || 0), 0) / w.length) }
      : { avgCal: 0, avgProt: 0 };
  };

  const getChartData = () => {
    const days = historyTab === "week" ? 7 : historyTab === "month" ? 30 : 90;
    return [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-days).map(d => ({ date: fmt(d.date), calories: d.calories || 0, protein: d.protein || 0 }));
  };

  const getWeightData = () => history.filter(d => d.weight).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ date: fmt(d.date), weight: d.weight }));

  const streak = calcStreak();
  const { avgCal, avgProt } = getWeekData();
  const calPct = (dayData.calories / GOALS.calories) * 100;
  const protPct = (dayData.protein / GOALS.protein) * 100;
  const waterPct = (dayData.water / GOALS.water) * 100;

  const allExercises = [
    ...(WORKOUT_TEMPLATES[selectedTemplate] || []),
    ...currentWorkout.filter(e => !(WORKOUT_TEMPLATES[selectedTemplate] || []).includes(e.name)).map(e => e.name),
  ];

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "20px", fontFamily: C.font }}>
      <div style={{ fontSize: "28px", fontWeight: "700", color: C.accent, letterSpacing: "-0.5px" }}>PULSE</div>
      <div style={{ width: "32px", height: "32px", border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Styles ────────────────────────────────────────────────────────────────
  const tabBtnStyle = (key) => ({
    flex: 1, padding: "13px 4px", border: "none", background: "none",
    color: tab === key ? C.text : C.textDim, fontSize: "10px", fontWeight: "600",
    letterSpacing: "0.5px", borderBottom: `2px solid ${tab === key ? C.accent : "transparent"}`,
    cursor: "pointer", fontFamily: C.font, transition: "color 0.15s",
  });

  const statCard = (value, label, sub, color) => (
    <div style={{ background: C.surface, borderRadius: C.r, padding: "16px 12px", border: `1px solid ${C.border}`, textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: "22px", fontWeight: "700", color, marginBottom: "4px", letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontSize: "11px", fontWeight: "600", color: C.textSub, marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "10px", color: C.textDim }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.font, maxWidth: "430px", margin: "0 auto" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "100px", left: "50%", transform: "translateX(-50%)",
          background: toast.isError ? C.red : C.accent, color: "#000",
          padding: "10px 20px", borderRadius: "20px", fontSize: "13px", fontWeight: "600",
          zIndex: 200, whiteSpace: "nowrap", boxShadow: `0 4px 24px ${toast.isError ? C.red : C.accent}44`,
          animation: "fadeUp 2.5s ease forwards",
        }}>{toast.msg}</div>
      )}

      <style>{`
        @keyframes fadeUp {
          0%{opacity:0;transform:translateX(-50%) translateY(8px)}
          10%{opacity:1;transform:translateX(-50%) translateY(0)}
          80%{opacity:1}
          100%{opacity:0}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
        *{-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        input,textarea{outline:none;-webkit-appearance:none}
        button{-webkit-appearance:none}
      `}</style>

      {/* Header */}
      <div style={{ background: C.bg, padding: "52px 20px 16px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-1px", color: C.text }}>
              Pulse
            </div>
            <div style={{ fontSize: "12px", color: C.textSub, marginTop: "2px" }}>{getDisplayDate()}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {ouraData && (
              <div style={{ background: ouraData.recovery_score >= 70 ? `${C.accent}15` : "#FF9F0A15", border: `1px solid ${ouraData.recovery_score >= 70 ? C.accentBorder : "#FF9F0A44"}`, borderRadius: "20px", padding: "5px 10px", fontSize: "11px", fontWeight: "600", color: ouraData.recovery_score >= 70 ? C.accent : C.orange }}>
                ◉ {ouraData.recovery_score}% ready
              </div>
            )}
            {streak > 0 && (
              <div style={{ background: C.surfaceUp, borderRadius: "20px", padding: "5px 10px", fontSize: "12px", fontWeight: "600", color: C.orange }}>
                🔥 {streak}d
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: "flex", background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: "96px", zIndex: 9 }}>
        {[["today","Today"],["workout","Workout"],["history","History"],["schedule","Schedule"],["ai","AI Coach"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={tabBtnStyle(key)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "16px", paddingBottom: "48px" }}>

        {/* ━━━ TODAY ━━━ */}
        {tab === "today" && (
          <div>
            {/* Oura recovery banner — shows when ring is connected */}
            {ouraData && (
              <Card style={{ marginBottom: "12px" }} accent={ouraData.recovery_score >= 70 ? C.accent : C.orange}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", color: C.textSub, marginBottom: "4px" }}>Recovery · Oura Ring</div>
                    <div style={{ fontSize: "22px", fontWeight: "700", color: ouraData.recovery_score >= 70 ? C.accent : C.orange }}>
                      {ouraData.recovery_score}% — {ouraData.recovery_score >= 70 ? "Train Hard" : ouraData.recovery_score >= 50 ? "Train Easy" : "Rest Today"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "12px", color: C.textSub, lineHeight: "1.8" }}>
                    <div>Sleep {ouraData.sleep_score}%</div>
                    <div>HRV {ouraData.hrv}</div>
                    <div>HR {ouraData.resting_hr} bpm</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Macro rings */}
            <Card style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", gap: "8px", justifyContent: "space-around" }}>
                {[
                  { label: "Calories", current: dayData.calories, goal: GOALS.calories, pct: calPct, color: C.accent },
                  { label: "Protein", current: `${dayData.protein}g`, goal: `${GOALS.protein}g`, pct: protPct, color: C.blue },
                  { label: "Water", current: `${dayData.water}oz`, goal: `${GOALS.water}oz`, pct: waterPct, color: "#4CD5FF" },
                ].map(({ label, current, goal, pct, color }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ position: "relative", width: "72px", height: "72px", margin: "0 auto 10px" }}>
                      <Ring pct={pct} color={color} size={72} stroke={5} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color }}>{Math.round(pct)}%</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>{current}</div>
                    <div style={{ fontSize: "11px", color: C.textSub }}>{label}</div>
                    <div style={{ fontSize: "10px", color: C.textDim }}>/ {goal}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Today's training */}
            {SCHEDULE[today] && (
              <Card>
                <SectionLabel>Today's Training</SectionLabel>
                {SCHEDULE[today].map((item, i) => {
                  const done = dayData.completed_workouts.includes(item.activity);
                  return (
                    <div key={i} onClick={() => toggleScheduleWorkout(item.activity)}
                      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: C.rSm, marginBottom: "6px", cursor: "pointer", background: done ? `${TYPE_COLORS[item.type]}10` : C.surfaceUp, border: `1px solid ${done ? TYPE_COLORS[item.type] + "40" : C.border}`, transition: "all 0.15s" }}>
                      <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: `2px solid ${TYPE_COLORS[item.type]}`, background: done ? TYPE_COLORS[item.type] : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "11px", color: done ? "#000" : "transparent", fontWeight: "700" }}>✓</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: done ? TYPE_COLORS[item.type] : C.text }}>{item.activity}</div>
                        <div style={{ fontSize: "11px", color: C.textSub, marginTop: "2px" }}>{item.time}</div>
                      </div>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: TYPE_COLORS[item.type], background: `${TYPE_COLORS[item.type]}15`, padding: "3px 8px", borderRadius: "10px" }}>{TYPE_LABELS[item.type]}</div>
                    </div>
                  );
                })}
              </Card>
            )}

            {/* Weight */}
            <Card>
              <SectionLabel>Weight</SectionLabel>
              <div style={{ display: "flex", gap: "8px" }}>
                <Input type="number" placeholder="Enter weight (lbs)" value={weightInput} onChange={e => setWeightInput(e.target.value)} style={{ color: C.orange }} />
                <button onClick={saveWeight} style={{ background: `${C.orange}15`, border: `1px solid ${C.orange}40`, borderRadius: C.rSm, padding: "12px 18px", color: C.orange, cursor: "pointer", fontWeight: "600", fontFamily: C.font, fontSize: "14px", flexShrink: 0, whiteSpace: "nowrap" }}>Log</button>
              </div>
              {dayData.weight && <div style={{ marginTop: "10px", fontSize: "13px", color: C.textSub }}>Today: <span style={{ color: C.orange, fontWeight: "600" }}>{dayData.weight} lbs</span></div>}
            </Card>

            {/* Water */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <SectionLabel style={{ marginBottom: 0 }}>Water</SectionLabel>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#4CD5FF" }}>{dayData.water}oz <span style={{ color: C.textDim }}>/ {GOALS.water}oz</span></div>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "11px", color: C.textDim, marginBottom: "8px" }}>ADD</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[8,16,20,26,32].map(oz => (
                    <button key={oz} onClick={() => addWater(oz)} style={{ background: "rgba(76,213,255,0.08)", border: "1px solid rgba(76,213,255,0.2)", color: "#4CD5FF", padding: "8px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: "600", fontFamily: C.font }}>+{oz}oz</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: C.textDim, marginBottom: "8px" }}>REMOVE</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[8,16,20,26,32].map(oz => (
                    <button key={oz} onClick={() => removeWater(oz)} style={{ background: `${C.red}08`, border: `1px solid ${C.red}25`, color: C.red, padding: "8px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: "600", fontFamily: C.font }}>-{oz}oz</button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Quick Add Food */}
            <Card>
              <SectionLabel>Quick Add Food</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {QUICK_FOODS.map((food, i) => {
                  const flash = recentlyAdded === food.name;
                  return (
                    <button key={i} onClick={() => addFood(food, food.name)} style={{ background: flash ? C.accentBg : "transparent", border: `1px solid ${flash ? C.accentBorder : C.borderLight}`, borderRadius: C.rSm, padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: C.font, transition: "all 0.12s" }}>
                      <span style={{ fontSize: "14px", color: flash ? C.accent : C.text, fontWeight: "500" }}>{flash ? "✓ " : ""}{food.name}</span>
                      <span style={{ fontSize: "12px", color: C.textSub }}>
                        <span style={{ color: flash ? C.accent : C.red, fontWeight: "600" }}>{food.calories}</span>
                        <span style={{ color: C.textDim }}> cal · </span>
                        <span style={{ color: C.blue, fontWeight: "600" }}>{food.protein}g</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Custom Food */}
            <Card>
              <SectionLabel>Custom Food</SectionLabel>
              <Input placeholder="Food name" value={customFood.name} onChange={e => setCustomFood({ ...customFood, name: e.target.value })} style={{ marginBottom: "8px" }} />
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <Input type="number" placeholder="Calories" value={customFood.calories} onChange={e => setCustomFood({ ...customFood, calories: e.target.value })} style={{ color: C.red }} />
                <Input type="number" placeholder="Protein (g)" value={customFood.protein} onChange={e => setCustomFood({ ...customFood, protein: e.target.value })} style={{ color: C.blue }} />
              </div>
              <button onClick={addCustomFood} style={{ width: "100%", background: recentlyAdded === "custom" ? C.accent : C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: C.rSm, padding: "13px", color: recentlyAdded === "custom" ? "#000" : C.accent, fontWeight: "600", fontSize: "14px", cursor: "pointer", fontFamily: C.font, transition: "all 0.15s" }}>
                {recentlyAdded === "custom" ? "✓ Added!" : "Add Food"}
              </button>
            </Card>

            {/* Food log */}
            {dayData.food_log.length > 0 && (
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <SectionLabel style={{ marginBottom: 0 }}>Today's Log</SectionLabel>
                  <div style={{ fontSize: "12px", color: C.textSub }}>
                    <span style={{ color: C.red, fontWeight: "600" }}>{dayData.calories}</span> cal · <span style={{ color: C.blue, fontWeight: "600" }}>{dayData.protein}g</span> protein
                  </div>
                </div>
                {dayData.food_log.map((item, i) => (
                  <div key={item.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", color: C.text, fontWeight: "500" }}>{item.name}</div>
                      <div style={{ fontSize: "11px", color: C.textSub, marginTop: "2px" }}>{item.time}</div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: "12px" }}>
                      <div style={{ fontSize: "13px", color: C.red, fontWeight: "600" }}>{item.calories} cal</div>
                      <div style={{ fontSize: "11px", color: C.blue }}>{item.protein}g protein</div>
                    </div>
                    <button onClick={() => removeFood(item)} style={{ background: `${C.red}10`, border: `1px solid ${C.red}25`, borderRadius: "8px", color: C.red, padding: "6px 10px", cursor: "pointer", fontSize: "13px", fontFamily: C.font }}>✕</button>
                  </div>
                ))}
              </Card>
            )}

            <button onClick={resetDay} style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, borderRadius: C.rSm, padding: "13px", color: C.textSub, fontSize: "13px", cursor: "pointer", fontFamily: C.font, fontWeight: "500" }}>Reset Day</button>
          </div>
        )}

        {/* ━━━ WORKOUT ━━━ */}
        {tab === "workout" && (
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {[["log","Log Workout"],["history","History"]].map(([key, label]) => (
                <PillButton key={key} onClick={() => setWorkoutTab(key)} active={workoutTab === key}>{label}</PillButton>
              ))}
            </div>

            {workoutTab === "log" && (
              <div>
                <Card>
                  <SectionLabel>Workout Type</SectionLabel>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {Object.keys(WORKOUT_TEMPLATES).map(type => (
                      <PillButton key={type} onClick={() => setSelectedTemplate(type)} active={selectedTemplate === type}>{type}</PillButton>
                    ))}
                  </div>
                </Card>

                <Card>
                  <SectionLabel>Log Sets</SectionLabel>
                  {allExercises.map((exercise, i) => {
                    const logged = currentWorkout.find(e => e.name === exercise);
                    const isAdding = addingExercise === exercise;
                    return (
                      <div key={i} style={{ marginBottom: "10px", background: C.surfaceUp, borderRadius: C.rSm, padding: "14px", border: `1px solid ${logged ? C.accentBorder : C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: logged ? C.accent : C.text }}>{exercise}</div>
                          <button onClick={() => setAddingExercise(isAdding ? null : exercise)} style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: "16px", padding: "5px 12px", color: C.accent, cursor: "pointer", fontSize: "12px", fontWeight: "600", fontFamily: C.font }}>+ Set</button>
                        </div>

                        {logged && logged.sets.length > 0 && (
                          <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {logged.sets.map((set, si) => (
                              <div key={si} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "5px 10px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "12px" }}>
                                  {set.weight > 0 && <span style={{ color: C.orange, fontWeight: "600" }}>{set.weight}lb </span>}
                                  <span style={{ color: C.accent, fontWeight: "600" }}>×{set.reps}</span>
                                </span>
                                <button onClick={() => removeSet(exercise, si)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: "11px", padding: "0", lineHeight: 1 }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}

                        {isAdding && (
                          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                            <Input type="number" placeholder="lbs" value={setInput.weight} onChange={e => setSetInput({ ...setInput, weight: e.target.value })} style={{ color: C.orange, textAlign: "center", padding: "10px" }} />
                            <Input type="number" placeholder="reps" value={setInput.reps} onChange={e => setSetInput({ ...setInput, reps: e.target.value })} onKeyDown={e => e.key === "Enter" && addSet(exercise)} style={{ color: C.accent, textAlign: "center", padding: "10px" }} autoFocus />
                            <button onClick={() => addSet(exercise)} style={{ background: C.accent, border: "none", borderRadius: C.rSm, padding: "10px 16px", color: "#000", fontWeight: "700", cursor: "pointer", fontFamily: C.font, fontSize: "14px", flexShrink: 0 }}>Log</button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <Input placeholder="Add custom exercise..." value={customExercise} onChange={e => setCustomExercise(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && customExercise.trim()) { setAddingExercise(customExercise); setCustomExercise(""); } }} />
                    <button onClick={() => { if (customExercise.trim()) { setAddingExercise(customExercise); setCustomExercise(""); } }} style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: C.rSm, padding: "12px 16px", color: C.textSub, cursor: "pointer", fontFamily: C.font, fontSize: "18px", flexShrink: 0 }}>+</button>
                  </div>
                </Card>

                {currentWorkout.length > 0 && (
                  <button onClick={saveWorkout} style={{ width: "100%", background: C.accent, border: "none", borderRadius: C.r, padding: "16px", color: "#000", fontWeight: "700", fontSize: "15px", cursor: "pointer", fontFamily: C.font, marginBottom: "12px" }}>
                    Save Workout
                  </button>
                )}
              </div>
            )}

            {workoutTab === "history" && (
              <div>
                {!workoutHistory.length ? (
                  <Card style={{ textAlign: "center", padding: "48px 20px" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>💪</div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: C.text, marginBottom: "6px" }}>No workouts yet</div>
                    <div style={{ fontSize: "13px", color: C.textSub }}>Log your first workout to see history</div>
                  </Card>
                ) : workoutHistory.map((w, i) => (
                  <Card key={i} accent={C.accent}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>{w.workout_type}</div>
                        <div style={{ fontSize: "12px", color: C.textSub, marginTop: "3px" }}>{w.day_name} · {fmt(w.date)}</div>
                      </div>
                      <div style={{ fontSize: "12px", color: C.textSub }}>{(w.exercises || []).length} exercises</div>
                    </div>
                    {(w.exercises || []).map((ex, ei) => (
                      <div key={ei} style={{ paddingTop: "10px", borderTop: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: C.text, marginBottom: "6px" }}>{ex.name}</div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {(ex.sets || []).map((set, si) => (
                            <span key={si} style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "4px 10px", fontSize: "12px" }}>
                              {set.weight > 0 && <span style={{ color: C.orange, fontWeight: "600" }}>{set.weight}lb </span>}
                              <span style={{ color: C.accent, fontWeight: "600" }}>×{set.reps}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ━━━ HISTORY ━━━ */}
        {tab === "history" && (
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {statCard(`${streak}d`, "Streak", "days on track", C.orange)}
              {statCard(avgCal, "Avg Cal", "this week", C.red)}
              {statCard(`${avgProt}g`, "Avg Protein", "this week", C.blue)}
            </div>

            <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
              {[["week","7 Days"],["month","30 Days"],["all","90 Days"]].map(([key, label]) => (
                <PillButton key={key} onClick={() => setHistoryTab(key)} active={historyTab === key}>{label}</PillButton>
              ))}
            </div>

            <Card accent={C.red}>
              <SectionLabel color={C.textSub}>Calories</SectionLabel>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={getChartData()}>
                  <XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 4000]} />
                  <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text, fontSize: "11px" }} />
                  <ReferenceLine y={GOALS.calories} stroke={`${C.red}44`} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="calories" stroke={C.red} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: C.red }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card accent={C.blue}>
              <SectionLabel color={C.textSub}>Protein</SectionLabel>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={getChartData()}>
                  <XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 200]} />
                  <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text, fontSize: "11px" }} />
                  <ReferenceLine y={GOALS.protein} stroke={`${C.blue}44`} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="protein" stroke={C.blue} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: C.blue }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {getWeightData().length > 1 && (
              <Card accent={C.orange}>
                <SectionLabel color={C.textSub}>Weight</SectionLabel>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={getWeightData()}>
                    <XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={["auto","auto"]} />
                    <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text, fontSize: "11px" }} formatter={v => [`${v} lbs`,"Weight"]} />
                    <Line type="monotone" dataKey="weight" stroke={C.orange} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: C.orange }} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                  {[["Start", getWeightData()[0]?.weight], ["Current", getWeightData().at(-1)?.weight], ["Change", `${(getWeightData().at(-1)?.weight - getWeightData()[0]?.weight).toFixed(1)}`]].map(([label, val], i) => (
                    <div key={label} style={{ textAlign: i === 1 ? "center" : i === 2 ? "right" : "left" }}>
                      <div style={{ fontSize: "11px", color: C.textSub }}>{label}</div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: i === 2 ? (parseFloat(val) >= 0 ? C.accent : C.red) : C.orange }}>{val} lbs</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <SectionLabel>Day by Day</SectionLabel>
              {history.slice(0, historyTab === "week" ? 7 : historyTab === "month" ? 30 : 90).map((d, i) => {
                const calOk = d.calories >= GOALS.calories * 0.85;
                const protOk = d.protein >= GOALS.protein * 0.85;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: C.text }}>{fmt(d.date)}</div>
                      <div style={{ fontSize: "11px", color: C.textSub }}>{getDayName(d.date)}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "12px" }}>
                      <span style={{ color: calOk ? C.red : C.textDim, fontWeight: calOk ? "600" : "400" }}>{d.calories || 0} cal</span>
                      <span style={{ color: C.textDim }}> · </span>
                      <span style={{ color: protOk ? C.blue : C.textDim, fontWeight: protOk ? "600" : "400" }}>{d.protein || 0}g</span>
                      {d.weight && <div style={{ color: C.orange, fontSize: "11px" }}>{d.weight} lbs</div>}
                    </div>
                    <div style={{ marginLeft: "10px", fontSize: "16px" }}>{calOk && protOk ? "✅" : "⭕"}</div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* ━━━ SCHEDULE ━━━ */}
        {tab === "schedule" && (
          <div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
              {DAYS.map(day => {
                const isSelected = selectedDay === day;
                const isToday = day === today;
                return (
                  <button key={day} onClick={() => setSelectedDay(day)} style={{ background: isSelected ? C.accent : isToday ? C.accentBg : C.surface, border: `1px solid ${isSelected ? C.accent : isToday ? C.accentBorder : C.border}`, borderRadius: "20px", padding: "7px 12px", cursor: "pointer", color: isSelected ? "#000" : isToday ? C.accent : C.textSub, fontSize: "12px", fontWeight: "600", fontFamily: C.font }}>
                    {day.slice(0, 3)}{isToday && !isSelected ? " ●" : ""}
                  </button>
                );
              })}
            </div>

            <Card>
              <div style={{ fontSize: "18px", fontWeight: "700", color: C.text, marginBottom: "4px" }}>
                {selectedDay}
                {selectedDay === today && <span style={{ fontSize: "11px", color: C.accent, marginLeft: "8px", fontWeight: "600" }}>TODAY</span>}
              </div>
              {SCHEDULE[selectedDay] ? (
                <div style={{ marginTop: "14px" }}>
                  {SCHEDULE[selectedDay].map((item, i) => (
                    <div key={i} style={{ padding: "13px", borderRadius: C.rSm, marginBottom: "8px", background: C.surfaceUp, borderLeft: `3px solid ${TYPE_COLORS[item.type]}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: C.text }}>{item.activity}</div>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: TYPE_COLORS[item.type], background: `${TYPE_COLORS[item.type]}15`, padding: "3px 8px", borderRadius: "10px" }}>{TYPE_LABELS[item.type]}</div>
                      </div>
                      <div style={{ fontSize: "12px", color: C.textSub, marginTop: "4px" }}>{item.time}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "36px 20px" }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>💤</div>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: C.textSub }}>Rest Day</div>
                  <div style={{ fontSize: "12px", color: C.textDim, marginTop: "4px" }}>Recovery is where growth happens</div>
                </div>
              )}
            </Card>

            <Card>
              <SectionLabel>Weekly Breakdown</SectionLabel>
              {[["💪 Gym", "gym"], ["🥊 MMA", "mma"], ["🧗 Climbing", "climbing"]].map(([label, type]) => {
                const days = DAYS.filter(d => SCHEDULE[d]?.some(s => s.type === type));
                return (
                  <div key={type} style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: TYPE_COLORS[type], marginBottom: "8px" }}>{label} · {days.length}x/week</div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {days.map(d => <span key={d} style={{ background: `${TYPE_COLORS[type]}12`, border: `1px solid ${TYPE_COLORS[type]}30`, borderRadius: "8px", padding: "4px 10px", fontSize: "12px", fontWeight: "600", color: TYPE_COLORS[type] }}>{d.slice(0,3)}</span>)}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* ━━━ AI COACH ━━━ */}
        {tab === "ai" && (
          <div>
            {/* Oura recovery insight if connected */}
            {ouraData && (
              <Card accent={ouraData.recovery_score >= 70 ? C.accent : C.orange} style={{ marginBottom: "12px" }}>
                <SectionLabel>Recovery Insight</SectionLabel>
                <div style={{ fontSize: "14px", color: C.text, lineHeight: "1.6" }}>
                  {ouraData.recovery_score >= 70
                    ? `Your recovery score is ${ouraData.recovery_score}% — your body is ready. Push hard today.`
                    : ouraData.recovery_score >= 50
                    ? `Recovery at ${ouraData.recovery_score}% — keep training but don't max out.`
                    : `Low recovery at ${ouraData.recovery_score}% — consider a light day or rest.`}
                </div>
              </Card>
            )}

            <Card>
              <SectionLabel>Quick Questions</SectionLabel>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                {["What should I eat tonight?", "Am I on track today?", "How do I recover faster?", "Best pre-MMA meal?", "Should I train today?"].map(q => (
                  <button key={q} onClick={() => setAiQuery(q)} style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: "20px", padding: "7px 12px", cursor: "pointer", color: C.textSub, fontSize: "12px", fontFamily: C.font, fontWeight: "500" }}>{q}</button>
                ))}
              </div>
              <textarea value={aiQuery} onChange={e => setAiQuery(e.target.value)} placeholder="Ask your coach anything..." rows={3}
                style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: C.rSm, padding: "13px 14px", color: C.text, fontSize: "14px", fontFamily: C.font, resize: "none", width: "100%", boxSizing: "border-box", marginBottom: "10px", outline: "none" }} />
              <button onClick={askAI} disabled={aiLoading} style={{ width: "100%", background: aiLoading ? C.surfaceUp : C.accent, border: "none", borderRadius: C.rSm, padding: "14px", color: aiLoading ? C.textSub : "#000", fontWeight: "700", fontSize: "14px", cursor: aiLoading ? "not-allowed" : "pointer", fontFamily: C.font, transition: "all 0.15s" }}>
                {aiLoading ? "Thinking..." : "Ask Coach"}
              </button>
            </Card>

            {aiResponse && (
              <Card accent={C.accent}>
                <SectionLabel>Coach</SectionLabel>
                <div style={{ fontSize: "14px", color: C.text, lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{aiResponse}</div>
              </Card>
            )}

            {/* Today snapshot for context */}
            <Card>
              <SectionLabel>Today's Snapshot</SectionLabel>
              {[
                { label: "Calories", value: `${dayData.calories} / ${GOALS.calories}`, color: C.red, pct: calPct },
                { label: "Protein", value: `${dayData.protein}g / ${GOALS.protein}g`, color: C.blue, pct: protPct },
                { label: "Water", value: `${dayData.water}oz / ${GOALS.water}oz`, color: "#4CD5FF", pct: waterPct },
              ].map(({ label, value, color, pct }) => (
                <div key={label} style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", color: C.textSub }}>{label}</span>
                    <span style={{ fontSize: "13px", color, fontWeight: "600" }}>{value}</span>
                  </div>
                  <div style={{ height: "3px", background: C.surfaceUp, borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: "2px", transition: "width 0.5s ease" }} />
                  </div>
                </div>
              ))}
              {streak > 0 && <div style={{ fontSize: "13px", color: C.textSub, marginTop: "4px" }}>🔥 {streak} day streak</div>}
              {ouraData && <div style={{ fontSize: "13px", color: C.textSub, marginTop: "4px" }}>💍 Recovery: {ouraData.recovery_score}%</div>}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
