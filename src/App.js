import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ── Constants ────────────────────────────────────────────────────────────────
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
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const TYPE_COLORS = { gym: "#00ff87", mma: "#ff4757", climbing: "#ffa502" };
const TYPE_LABELS = { gym: "💪 GYM", mma: "🥊 MMA", climbing: "🧗 CLIMB" };

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function getDayName(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
}
function getTodayName() { return getDayName(todayStr()); }
function fmt(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("today");
  const [loading, setLoading] = useState(true);

  // Today state
  const [dayData, setDayData] = useState({ calories: 0, protein: 0, water: 0, food_log: [], completed_workouts: [], weight: null });
  const [customFood, setCustomFood] = useState({ name: "", calories: "", protein: "" });
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [toast, setToast] = useState(null);
  const [weightInput, setWeightInput] = useState("");

  // History state
  const [history, setHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState("week");

  // AI state
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Schedule
  const [selectedDay, setSelectedDay] = useState(getTodayName());
  const today = getTodayName();

  // ── Supabase helpers ────────────────────────────────────────────────────────
  const loadToday = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("date", todayStr())
      .single();
    if (data) {
      setDayData({
        calories: data.calories || 0,
        protein: data.protein || 0,
        water: data.water || 0,
        food_log: data.food_log || [],
        completed_workouts: data.completed_workouts || [],
        weight: data.weight || null,
      });
      if (data.weight) setWeightInput(String(data.weight));
    }
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .order("date", { ascending: false })
      .limit(90);
    if (data) setHistory(data);
  }, []);

  useEffect(() => { loadToday(); loadHistory(); }, [loadToday, loadHistory]);

  const saveDay = async (updates) => {
    const merged = { ...dayData, ...updates, date: todayStr() };
    setDayData(merged);
    await supabase.from("daily_logs").upsert({
      date: todayStr(),
      calories: merged.calories,
      protein: merged.protein,
      water: merged.water,
      food_log: merged.food_log,
      completed_workouts: merged.completed_workouts,
      weight: merged.weight,
    });
    loadHistory();
  };

  // ── Food ────────────────────────────────────────────────────────────────────
  const addFood = (food, key) => {
    const newLog = [...dayData.food_log, { ...food, id: Date.now(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }];
    saveDay({ calories: dayData.calories + food.calories, protein: dayData.protein + food.protein, food_log: newLog });
    setRecentlyAdded(key ?? food.name);
    setTimeout(() => setRecentlyAdded(null), 900);
    setToast(`✓ ${food.name} added`);
    setTimeout(() => setToast(null), 2000);
  };

  const removeFood = (item) => {
    const newLog = dayData.food_log.filter(f => f.id !== item.id);
    saveDay({ calories: Math.max(0, dayData.calories - item.calories), protein: Math.max(0, dayData.protein - item.protein), food_log: newLog });
  };

  const addCustomFood = () => {
    if (!customFood.name || !customFood.calories) return;
    addFood({ name: customFood.name, calories: Number(customFood.calories), protein: Number(customFood.protein || 0) }, "custom");
    setCustomFood({ name: "", calories: "", protein: "" });
  };

  // ── Water ───────────────────────────────────────────────────────────────────
  const addWater = (oz) => saveDay({ water: Math.min(dayData.water + oz, 200) });
  const removeWater = (oz) => saveDay({ water: Math.max(0, dayData.water - oz) });

  // ── Workouts ────────────────────────────────────────────────────────────────
  const toggleWorkout = (activity) => {
    const cw = dayData.completed_workouts;
    saveDay({ completed_workouts: cw.includes(activity) ? cw.filter(w => w !== activity) : [...cw, activity] });
  };

  // ── Weight ──────────────────────────────────────────────────────────────────
  const saveWeight = () => {
    const w = parseFloat(weightInput);
    if (!w) return;
    saveDay({ weight: w });
    setToast(`✓ Weight logged: ${w} lbs`);
    setTimeout(() => setToast(null), 2000);
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetDay = async () => {
    const reset = { calories: 0, protein: 0, water: 0, food_log: [], completed_workouts: [], weight: null };
    setDayData(reset);
    setWeightInput("");
    await supabase.from("daily_logs").upsert({ date: todayStr(), ...reset });
    loadHistory();
  };

  // ── AI Coach ────────────────────────────────────────────────────────────────
  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const streak = calcStreak();
      const weekAvg = getWeekData();
      const context = `You are a fitness coach AI for Kaden, an 18-year-old athlete (6'1", 160 lbs) in Oakland, CA. Goals: gain lean muscle, get stronger for MMA, rock climbing and lifting. Daily targets: 3000-3200 calories, 130-160g protein, 1 gallon (128oz) water. Trains MMA (boxing, jiu jitsu, muay thai), rock climbs, and lifts weights. Takes creatine and whey protein daily. Current stats today: ${dayData.calories} calories, ${dayData.protein}g protein, ${dayData.water}oz water. Current streak: ${streak} days hitting goals. This week avg: ${weekAvg.avgCal} calories/day, ${weekAvg.avgProt}g protein/day. Be direct, practical, and encouraging. Keep responses concise and actionable.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: context,
          messages: [{ role: "user", content: aiQuery }],
        }),
      });
      const data = await res.json();
      setAiResponse(data.content?.map(b => b.text || "").join("") || "Sorry, couldn't get a response.");
    } catch (e) { setAiResponse("Error connecting. Try again."); }
    setAiLoading(false);
  };

  // ── Analytics ────────────────────────────────────────────────────────────────
  const calcStreak = () => {
    let streak = 0;
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
    for (const d of sorted) {
      if ((d.calories >= GOALS.calories * 0.85) && (d.protein >= GOALS.protein * 0.85)) streak++;
      else break;
    }
    return streak;
  };

  const getWeekData = () => {
    const week = history.slice(0, 7);
    if (!week.length) return { avgCal: 0, avgProt: 0 };
    return {
      avgCal: Math.round(week.reduce((s, d) => s + (d.calories || 0), 0) / week.length),
      avgProt: Math.round(week.reduce((s, d) => s + (d.protein || 0), 0) / week.length),
    };
  };

  const getChartData = () => {
    const days = historyTab === "week" ? 7 : historyTab === "month" ? 30 : 90;
    return [...history]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days)
      .map(d => ({ date: fmt(d.date), calories: d.calories || 0, protein: d.protein || 0, weight: d.weight || null }));
  };

  const getWeightData = () => history.filter(d => d.weight).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ date: fmt(d.date), weight: d.weight }));

  const streak = calcStreak();
  const { avgCal, avgProt } = getWeekData();
  const calPct = Math.min((dayData.calories / GOALS.calories) * 100, 100);
  const protPct = Math.min((dayData.protein / GOALS.protein) * 100, 100);
  const waterPct = Math.min((dayData.water / GOALS.water) * 100, 100);

  // ── Styles ───────────────────────────────────────────────────────────────────
  const s = {
    card: { background: "#111118", borderRadius: "14px", padding: "16px", marginBottom: "14px" },
    label: { fontSize: "10px", letterSpacing: "3px", marginBottom: "10px", fontWeight: "800" },
    btn: (active, color = "#00ff87") => ({
      background: active ? `${color}22` : "#0a0a0f",
      border: `1px solid ${active ? color : "#222"}`,
      borderRadius: "8px", padding: "10px 12px", cursor: "pointer",
      fontFamily: "'Courier New', monospace", transition: "all 0.15s ease",
      transform: active ? "scale(0.98)" : "scale(1)",
    }),
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid #222", borderTop: "3px solid #00ff87", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ color: "#00ff87", fontSize: "12px", letterSpacing: "3px", fontFamily: "'Courier New', monospace" }}>LOADING...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f0", fontFamily: "'Courier New', monospace", maxWidth: "430px", margin: "0 auto" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)", background: "#00ff87", color: "#0a0a0f", padding: "10px 20px", borderRadius: "20px", fontSize: "13px", fontWeight: "900", letterSpacing: "1px", zIndex: 100, fontFamily: "'Courier New', monospace", boxShadow: "0 4px 20px #00ff8766", whiteSpace: "nowrap", animation: "fadeInOut 2s ease" }}>{toast}</div>
      )}

      <style>{`
        @keyframes fadeInOut { 0%{opacity:0;transform:translateX(-50%) translateY(-8px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 75%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-8px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#111} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
        input,textarea{outline:none}
        button:active{opacity:0.8}
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #00ff87 0%, #00b4d8 100%)", padding: "20px 20px 16px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#0a0a0f", fontWeight: "800" }}>PULSE</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "#0a0a0f" }}>TRACK. IMPROVE. ACHIEVE.</div>
          {streak > 0 && <div style={{ background: "#0a0a0f22", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: "900", color: "#0a0a0f" }}>🔥 {streak}d</div>}
        </div>
        <div style={{ fontSize: "11px", color: "#0a0a0f88", marginTop: "2px" }}>{today.toUpperCase()} • {new Date().toLocaleDateString()}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#111118", borderBottom: "1px solid #222", position: "sticky", top: "78px", zIndex: 9 }}>
        {[["today","TODAY"],["history","HISTORY"],["schedule","SCHEDULE"],["ai","AI COACH"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "11px 2px", border: "none", background: "none", color: tab === key ? "#00ff87" : "#444", fontSize: "9px", fontWeight: "800", letterSpacing: "1px", borderBottom: tab === key ? "2px solid #00ff87" : "2px solid transparent", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "16px", paddingBottom: "40px" }}>

        {/* ── TODAY TAB ── */}
        {tab === "today" && (
          <div>
            {/* Progress rings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {[
                { label: "CALORIES", current: dayData.calories, goal: GOALS.calories, pct: calPct, color: "#ff4757", unit: "" },
                { label: "PROTEIN", current: dayData.protein, goal: GOALS.protein, pct: protPct, color: "#00ff87", unit: "g" },
                { label: "WATER", current: dayData.water, goal: GOALS.water, pct: waterPct, color: "#00b4d8", unit: "oz" },
              ].map(({ label, current, goal, pct, color, unit }) => (
                <div key={label} style={{ ...s.card, padding: "14px 10px", border: `1px solid ${color}22`, textAlign: "center", marginBottom: 0 }}>
                  <div style={{ position: "relative", width: "60px", height: "60px", margin: "0 auto 8px" }}>
                    <svg width="60" height="60" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="30" cy="30" r="24" fill="none" stroke="#222" strokeWidth="5" />
                      <circle cx="30" cy="30" r="24" fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                    </svg>
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: "11px", fontWeight: "900", color }}>{Math.round(pct)}%</div>
                  </div>
                  <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#555", marginBottom: "3px" }}>{label}</div>
                  <div style={{ fontSize: "13px", fontWeight: "900", color }}>{current}{unit}</div>
                  <div style={{ fontSize: "9px", color: "#333" }}>/ {goal}{unit}</div>
                </div>
              ))}
            </div>

            {/* Weight */}
            <div style={{ ...s.card, border: "1px solid #ffa50222" }}>
              <div style={{ ...s.label, color: "#ffa502" }}>⚖️ WEIGHT LOG</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="number" placeholder="Your weight (lbs)" value={weightInput} onChange={e => setWeightInput(e.target.value)}
                  style={{ flex: 1, background: "#0a0a0f", border: "1px solid #333", borderRadius: "8px", padding: "10px", color: "#ffa502", fontSize: "14px", fontFamily: "'Courier New', monospace" }} />
                <button onClick={saveWeight} style={{ background: "#ffa50222", border: "1px solid #ffa50244", borderRadius: "8px", padding: "10px 16px", color: "#ffa502", cursor: "pointer", fontWeight: "900", fontFamily: "'Courier New', monospace", fontSize: "12px" }}>LOG</button>
              </div>
              {dayData.weight && <div style={{ marginTop: "8px", fontSize: "11px", color: "#555" }}>Today: <span style={{ color: "#ffa502" }}>{dayData.weight} lbs</span></div>}
            </div>

            {/* Water */}
            <div style={{ ...s.card, border: "1px solid #00b4d822" }}>
              <div style={{ ...s.label, color: "#00b4d8" }}>💧 WATER TRACKER</div>
              <div style={{ fontSize: "10px", color: "#555", marginBottom: "6px", letterSpacing: "1px" }}>ADD</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                {[8, 16, 20, 26, 32].map(oz => (
                  <button key={oz} onClick={() => addWater(oz)} style={{ background: "#00b4d811", border: "1px solid #00b4d833", color: "#00b4d8", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700", fontFamily: "'Courier New', monospace" }}>+{oz}oz</button>
                ))}
              </div>
              <div style={{ fontSize: "10px", color: "#555", marginBottom: "6px", letterSpacing: "1px" }}>REMOVE</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[8, 16, 20, 26, 32].map(oz => (
                  <button key={oz} onClick={() => removeWater(oz)} style={{ background: "#ff475711", border: "1px solid #ff475733", color: "#ff4757", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700", fontFamily: "'Courier New', monospace" }}>-{oz}oz</button>
                ))}
              </div>
              <div style={{ marginTop: "10px", fontSize: "11px", color: "#444" }}>{dayData.water}oz / {GOALS.water}oz • {Math.max(0, GOALS.water - dayData.water)}oz to go</div>
            </div>

            {/* Today workouts */}
            {SCHEDULE[today] && (
              <div style={{ ...s.card, border: "1px solid #ffffff11" }}>
                <div style={{ ...s.label, color: "#aaa" }}>🗓 TODAY'S TRAINING</div>
                {SCHEDULE[today].map((item, i) => (
                  <div key={i} onClick={() => toggleWorkout(item.activity)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", marginBottom: "6px", cursor: "pointer", background: dayData.completed_workouts.includes(item.activity) ? `${TYPE_COLORS[item.type]}15` : "#0a0a0f", border: `1px solid ${dayData.completed_workouts.includes(item.activity) ? TYPE_COLORS[item.type] : "#222"}`, transition: "all 0.2s" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${TYPE_COLORS[item.type]}`, background: dayData.completed_workouts.includes(item.activity) ? TYPE_COLORS[item.type] : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", flexShrink: 0 }}>{dayData.completed_workouts.includes(item.activity) ? "✓" : ""}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: dayData.completed_workouts.includes(item.activity) ? TYPE_COLORS[item.type] : "#ddd" }}>{item.activity}</div>
                      <div style={{ fontSize: "10px", color: "#444" }}>{item.time}</div>
                    </div>
                    <div style={{ fontSize: "9px", color: TYPE_COLORS[item.type], letterSpacing: "1px" }}>{TYPE_LABELS[item.type]}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Food */}
            <div style={{ ...s.card, border: "1px solid #00ff8722" }}>
              <div style={{ ...s.label, color: "#00ff87" }}>🍗 QUICK ADD FOOD</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {QUICK_FOODS.map((food, i) => {
                  const flash = recentlyAdded === food.name;
                  return (
                    <button key={i} onClick={() => addFood(food, food.name)} style={{ ...s.btn(flash), display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", width: "100%" }}>
                      <span style={{ fontSize: "12px", color: flash ? "#00ff87" : "#ddd" }}>{flash ? "✓ " : ""}{food.name}</span>
                      <span style={{ fontSize: "11px" }}>
                        <span style={{ color: flash ? "#00ff87" : "#ff4757" }}>{food.calories}cal</span>
                        <span style={{ color: "#333" }}> · </span>
                        <span style={{ color: "#00ff87" }}>{food.protein}g</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Food */}
            <div style={{ ...s.card, border: "1px solid #ffffff11" }}>
              <div style={{ ...s.label, color: "#aaa" }}>✏️ CUSTOM FOOD</div>
              <input placeholder="Food name" value={customFood.name} onChange={e => setCustomFood({ ...customFood, name: e.target.value })}
                style={{ width: "100%", background: "#0a0a0f", border: "1px solid #222", borderRadius: "8px", padding: "10px", color: "#fff", marginBottom: "8px", fontSize: "12px", fontFamily: "'Courier New', monospace", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input type="number" placeholder="Calories" value={customFood.calories} onChange={e => setCustomFood({ ...customFood, calories: e.target.value })}
                  style={{ flex: 1, background: "#0a0a0f", border: "1px solid #222", borderRadius: "8px", padding: "10px", color: "#ff4757", fontSize: "12px", fontFamily: "'Courier New', monospace" }} />
                <input type="number" placeholder="Protein (g)" value={customFood.protein} onChange={e => setCustomFood({ ...customFood, protein: e.target.value })}
                  style={{ flex: 1, background: "#0a0a0f", border: "1px solid #222", borderRadius: "8px", padding: "10px", color: "#00ff87", fontSize: "12px", fontFamily: "'Courier New', monospace" }} />
              </div>
              <button onClick={addCustomFood} style={{ width: "100%", background: recentlyAdded === "custom" ? "#00ff87" : "linear-gradient(135deg, #00ff87, #00b4d8)", border: "none", borderRadius: "8px", padding: "12px", color: "#0a0a0f", fontWeight: "900", fontSize: "12px", letterSpacing: "2px", cursor: "pointer", fontFamily: "'Courier New', monospace", transition: "all 0.15s" }}>
                {recentlyAdded === "custom" ? "✓ ADDED!" : "ADD FOOD"}
              </button>
            </div>

            {/* Food Log */}
            {dayData.food_log.length > 0 && (
              <div style={{ ...s.card, border: "1px solid #ffffff11" }}>
                <div style={{ ...s.label, color: "#aaa" }}>📋 TODAY'S LOG</div>
                {dayData.food_log.map((item, i) => (
                  <div key={item.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", color: "#ddd" }}>{item.name}</div>
                      <div style={{ fontSize: "10px", color: "#444" }}>{item.time}</div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: "10px" }}>
                      <div style={{ fontSize: "12px", color: "#ff4757" }}>{item.calories} cal</div>
                      <div style={{ fontSize: "10px", color: "#00ff87" }}>{item.protein}g</div>
                    </div>
                    <button onClick={() => removeFood(item)} style={{ background: "#ff475722", border: "1px solid #ff475744", borderRadius: "6px", color: "#ff4757", padding: "6px 10px", cursor: "pointer", fontSize: "14px", fontFamily: "'Courier New', monospace", fontWeight: "900", flexShrink: 0 }}>✕</button>
                  </div>
                ))}
                <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", color: "#555" }}>TOTAL</span>
                  <span><span style={{ color: "#ff4757", fontSize: "12px", marginRight: "10px" }}>{dayData.calories} cal</span><span style={{ color: "#00ff87", fontSize: "12px" }}>{dayData.protein}g protein</span></span>
                </div>
              </div>
            )}

            <button onClick={resetDay} style={{ width: "100%", background: "transparent", border: "1px solid #ff475733", borderRadius: "8px", padding: "12px", color: "#ff4757", fontSize: "11px", letterSpacing: "2px", cursor: "pointer", fontFamily: "'Courier New', monospace", fontWeight: "700" }}>RESET DAY</button>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div>
            {/* Stats summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {[
                { label: "STREAK", value: `${streak}d`, sub: "days on track", color: "#ffa502" },
                { label: "AVG CAL", value: avgCal, sub: "this week", color: "#ff4757" },
                { label: "AVG PRO", value: `${avgProt}g`, sub: "this week", color: "#00ff87" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} style={{ ...s.card, border: `1px solid ${color}22`, textAlign: "center", marginBottom: 0, padding: "14px 8px" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#555", marginBottom: "6px" }}>{label}</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color }}>{value}</div>
                  <div style={{ fontSize: "9px", color: "#333", marginTop: "4px" }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Chart tabs */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
              {[["week","7 DAYS"],["month","30 DAYS"],["all","90 DAYS"]].map(([key, label]) => (
                <button key={key} onClick={() => setHistoryTab(key)} style={{ flex: 1, padding: "8px", border: `1px solid ${historyTab === key ? "#00ff87" : "#222"}`, borderRadius: "8px", background: historyTab === key ? "#00ff8722" : "#111118", color: historyTab === key ? "#00ff87" : "#555", fontSize: "10px", fontWeight: "800", letterSpacing: "1px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>{label}</button>
              ))}
            </div>

            {/* Calories chart */}
            <div style={{ ...s.card, border: "1px solid #ff475722" }}>
              <div style={{ ...s.label, color: "#ff4757" }}>🔥 CALORIES</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={getChartData()}>
                  <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 4000]} />
                  <Tooltip contentStyle={{ background: "#111118", border: "1px solid #333", borderRadius: "8px", color: "#fff", fontSize: "11px" }} />
                  <ReferenceLine y={GOALS.calories} stroke="#ff475744" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="calories" stroke="#ff4757" strokeWidth={2} dot={{ fill: "#ff4757", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ fontSize: "9px", color: "#333", textAlign: "right" }}>dashed line = goal</div>
            </div>

            {/* Protein chart */}
            <div style={{ ...s.card, border: "1px solid #00ff8722" }}>
              <div style={{ ...s.label, color: "#00ff87" }}>💪 PROTEIN</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={getChartData()}>
                  <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 200]} />
                  <Tooltip contentStyle={{ background: "#111118", border: "1px solid #333", borderRadius: "8px", color: "#fff", fontSize: "11px" }} />
                  <ReferenceLine y={GOALS.protein} stroke="#00ff8744" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="protein" stroke="#00ff87" strokeWidth={2} dot={{ fill: "#00ff87", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Weight chart */}
            {getWeightData().length > 1 && (
              <div style={{ ...s.card, border: "1px solid #ffa50222" }}>
                <div style={{ ...s.label, color: "#ffa502" }}>⚖️ WEIGHT PROGRESS</div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={getWeightData()}>
                    <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ background: "#111118", border: "1px solid #333", borderRadius: "8px", color: "#fff", fontSize: "11px" }} formatter={(v) => [`${v} lbs`, "Weight"]} />
                    <Line type="monotone" dataKey="weight" stroke="#ffa502" strokeWidth={2} dot={{ fill: "#ffa502", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#555" }}>Start: <span style={{ color: "#ffa502" }}>{getWeightData()[0]?.weight} lbs</span></span>
                  <span style={{ fontSize: "11px", color: "#555" }}>Latest: <span style={{ color: "#ffa502" }}>{getWeightData().at(-1)?.weight} lbs</span></span>
                  <span style={{ fontSize: "11px", color: "#555" }}>Change: <span style={{ color: getWeightData().at(-1)?.weight > getWeightData()[0]?.weight ? "#00ff87" : "#ff4757" }}>{(getWeightData().at(-1)?.weight - getWeightData()[0]?.weight).toFixed(1)} lbs</span></span>
                </div>
              </div>
            )}

            {/* Day by day log */}
            <div style={{ ...s.card, border: "1px solid #ffffff11" }}>
              <div style={{ ...s.label, color: "#aaa" }}>📅 DAY BY DAY</div>
              {history.slice(0, historyTab === "week" ? 7 : historyTab === "month" ? 30 : 90).map((d, i) => {
                const calOk = d.calories >= GOALS.calories * 0.85;
                const protOk = d.protein >= GOALS.protein * 0.85;
                const onTrack = calOk && protOk;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#ddd", fontWeight: "700" }}>{fmt(d.date)}</div>
                      <div style={{ fontSize: "10px", color: "#444" }}>{getDayName(d.date)}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "11px" }}>
                      <span style={{ color: calOk ? "#ff4757" : "#ff475766" }}>{d.calories || 0}cal</span>
                      <span style={{ color: "#333" }}> · </span>
                      <span style={{ color: protOk ? "#00ff87" : "#00ff8766" }}>{d.protein || 0}g</span>
                      {d.weight && <div style={{ color: "#ffa502", fontSize: "10px" }}>{d.weight}lbs</div>}
                    </div>
                    <div style={{ marginLeft: "10px", fontSize: "14px" }}>{onTrack ? "✅" : "⭕"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SCHEDULE TAB ── */}
        {tab === "schedule" && (
          <div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
              {DAYS.map(day => (
                <button key={day} onClick={() => setSelectedDay(day)} style={{ background: selectedDay === day ? "linear-gradient(135deg, #00ff87, #00b4d8)" : "#111118", border: `1px solid ${selectedDay === day ? "transparent" : day === today ? "#00ff87" : "#222"}`, borderRadius: "8px", padding: "8px 10px", cursor: "pointer", color: selectedDay === day ? "#0a0a0f" : day === today ? "#00ff87" : "#666", fontSize: "10px", fontWeight: "900", letterSpacing: "1px", fontFamily: "'Courier New', monospace" }}>
                  {day.slice(0, 3).toUpperCase()}{day === today ? " •" : ""}
                </button>
              ))}
            </div>
            <div style={{ ...s.card, border: "1px solid #ffffff11" }}>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#fff", marginBottom: "4px" }}>
                {selectedDay.toUpperCase()}
                {selectedDay === today && <span style={{ fontSize: "10px", color: "#00ff87", marginLeft: "8px", letterSpacing: "2px" }}>TODAY</span>}
              </div>
              {SCHEDULE[selectedDay] ? (
                <div style={{ marginTop: "12px" }}>
                  {SCHEDULE[selectedDay].map((item, i) => (
                    <div key={i} style={{ padding: "12px", borderRadius: "8px", marginBottom: "8px", background: "#0a0a0f", border: `1px solid ${TYPE_COLORS[item.type]}33`, borderLeft: `3px solid ${TYPE_COLORS[item.type]}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>{item.activity}</div>
                        <div style={{ fontSize: "9px", color: TYPE_COLORS[item.type] }}>{TYPE_LABELS[item.type]}</div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>{item.time}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "30px", color: "#333", fontSize: "13px" }}>REST DAY 💤<br /><span style={{ fontSize: "11px", color: "#222" }}>Recovery is growth</span></div>
              )}
            </div>
            <div style={{ ...s.card, border: "1px solid #ffffff11" }}>
              <div style={{ ...s.label, color: "#aaa" }}>WEEKLY OVERVIEW</div>
              {Object.entries({ "💪 GYM": "gym", "🥊 MMA": "mma", "🧗 CLIMB": "climbing" }).map(([label, type]) => {
                const days = DAYS.filter(d => SCHEDULE[d]?.some(s => s.type === type));
                return (
                  <div key={type} style={{ marginBottom: "10px" }}>
                    <div style={{ fontSize: "10px", color: TYPE_COLORS[type], letterSpacing: "2px", marginBottom: "4px" }}>{label}</div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {days.map(d => <span key={d} style={{ background: `${TYPE_COLORS[type]}22`, border: `1px solid ${TYPE_COLORS[type]}44`, borderRadius: "6px", padding: "4px 8px", fontSize: "10px", color: TYPE_COLORS[type] }}>{d.slice(0, 3)}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AI TAB ── */}
        {tab === "ai" && (
          <div>
            <div style={{ ...s.card, border: "1px solid #00ff8722" }}>
              <div style={{ ...s.label, color: "#00ff87" }}>🤖 YOUR AI COACH</div>
              <div style={{ fontSize: "12px", color: "#555", marginBottom: "14px" }}>Ask anything about nutrition, training, recovery, or progress.</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                {["What should I eat tonight?","Am I on track today?","How do I recover faster?","Best pre-MMA meal?"].map(q => (
                  <button key={q} onClick={() => setAiQuery(q)} style={{ background: "#0a0a0f", border: "1px solid #222", borderRadius: "8px", padding: "8px 10px", cursor: "pointer", color: "#666", fontSize: "11px", fontFamily: "'Courier New', monospace" }}>{q}</button>
                ))}
              </div>
              <textarea value={aiQuery} onChange={e => setAiQuery(e.target.value)} placeholder="Ask your AI coach..." rows={3}
                style={{ width: "100%", background: "#0a0a0f", border: "1px solid #222", borderRadius: "8px", padding: "12px", color: "#fff", fontSize: "13px", fontFamily: "'Courier New', monospace", resize: "none", boxSizing: "border-box", marginBottom: "10px" }} />
              <button onClick={askAI} disabled={aiLoading} style={{ width: "100%", background: aiLoading ? "#222" : "linear-gradient(135deg, #00ff87, #00b4d8)", border: "none", borderRadius: "8px", padding: "14px", color: aiLoading ? "#555" : "#0a0a0f", fontWeight: "900", fontSize: "12px", letterSpacing: "2px", cursor: aiLoading ? "not-allowed" : "pointer", fontFamily: "'Courier New', monospace" }}>
                {aiLoading ? "THINKING..." : "ASK COACH"}
              </button>
            </div>
            {aiResponse && (
              <div style={{ ...s.card, border: "1px solid #00b4d822" }}>
                <div style={{ ...s.label, color: "#00b4d8" }}>COACH SAYS:</div>
                <div style={{ fontSize: "13px", color: "#ddd", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{aiResponse}</div>
              </div>
            )}
            <div style={{ ...s.card, border: "1px solid #ffffff11" }}>
              <div style={{ ...s.label, color: "#aaa" }}>TODAY'S STATS</div>
              {[{ label: "Calories", value: `${dayData.calories} / ${GOALS.calories}`, color: "#ff4757", pct: calPct }, { label: "Protein", value: `${dayData.protein}g / ${GOALS.protein}g`, color: "#00ff87", pct: protPct }, { label: "Water", value: `${dayData.water}oz / ${GOALS.water}oz`, color: "#00b4d8", pct: waterPct }].map(({ label, value, color, pct }) => (
                <div key={label} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#555" }}>{label}</span>
                    <span style={{ fontSize: "11px", color }}>{value}</span>
                  </div>
                  <div style={{ height: "4px", background: "#222", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "2px", transition: "width 0.5s ease" }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>🔥 {streak} day streak • Workouts: {dayData.completed_workouts.length}/{SCHEDULE[today]?.length || 0}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
