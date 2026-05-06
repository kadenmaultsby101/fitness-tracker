import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

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
  { name: "Protein Shake (1 scoop)", calories: 150, protein: 25 },
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

const WORKOUT_TEMPLATES = {
  "Chest & Triceps": ["Chest Press Machine","Incline Press Machine","Pec Deck","Tricep Pushdown","Dumbbell Kickbacks","Overhead Tricep Extension","Dips"],
  "Back & Shoulders": ["Lower Back Press","Vertical Traction","Low Row","Shoulder Press","Lateral Raises","Trap Shrugs"],
  "Arms": ["Bicep Curl","Hammer Curl","Tricep Pushdown","Overhead Tricep Extension"],
  "Rock Climbing": ["Bouldering","Top Rope","Lead Climbing","Hangboard"],
  "MMA": ["Boxing","Jiu Jitsu No Gi","Muay Thai","Sparring","Wrestling"],
  "Custom": [],
};

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const TYPE_COLORS = { gym: "#00ff87", mma: "#ff4757", climbing: "#ffa502" };
const TYPE_LABELS = { gym: "💪 GYM", mma: "🥊 MMA", climbing: "🧗 CLIMB" };

function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
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
function getDisplayDate() {
  return new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" });
}

export default function App() {
  const [tab, setTab] = useState("today");
  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState({ calories: 0, protein: 0, water: 0, food_log: [], completed_workouts: [], weight: null });
  const [customFood, setCustomFood] = useState({ name: "", calories: "", protein: "" });
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [toast, setToast] = useState(null);
  const [weightInput, setWeightInput] = useState("");
  const [foodSearch, setFoodSearch] = useState("");
  const [foodResults, setFoodResults] = useState([]);
  const [foodSearching, setFoodSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeRef = useRef(null);
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
  const today = getTodayName();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000); };

  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("daily_logs").select("*").eq("date", todayStr()).single();
      if (data) {
        setDayData({ calories: data.calories || 0, protein: data.protein || 0, water: data.water || 0, food_log: data.food_log || [], completed_workouts: data.completed_workouts || [], weight: data.weight || null });
        if (data.weight) setWeightInput(String(data.weight));
      }
    } catch (e) {}
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await supabase.from("daily_logs").select("*").order("date", { ascending: false }).limit(90);
      if (data) setHistory(data);
    } catch (e) {}
  }, []);

  const loadWorkoutHistory = useCallback(async () => {
    try {
      const { data } = await supabase.from("workout_logs").select("*").order("date", { ascending: false }).limit(30);
      if (data) setWorkoutHistory(data);
    } catch (e) {}
  }, []);

  useEffect(() => { loadToday(); loadHistory(); loadWorkoutHistory(); }, [loadToday, loadHistory, loadWorkoutHistory]);

  const saveDay = async (updates) => {
    const merged = { ...dayData, ...updates };
    setDayData(merged);
    try {
      await supabase.from("daily_logs").upsert({ date: todayStr(), calories: merged.calories, protein: merged.protein, water: merged.water, food_log: merged.food_log, completed_workouts: merged.completed_workouts, weight: merged.weight }, { onConflict: "date" });
      loadHistory();
    } catch (e) { showToast("Save error — check Supabase setup"); }
  };

  const addFood = (food, key) => {
    const newLog = [...dayData.food_log, { ...food, id: Date.now(), time: new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit" }) }];
    saveDay({ calories: dayData.calories + food.calories, protein: dayData.protein + food.protein, food_log: newLog });
    setRecentlyAdded(key ?? food.name);
    setTimeout(() => setRecentlyAdded(null), 900);
    showToast(`✓ ${food.name} added`);
  };

  const removeFood = (item) => {
    saveDay({ calories: Math.max(0, dayData.calories - item.calories), protein: Math.max(0, dayData.protein - item.protein), food_log: dayData.food_log.filter(f => f.id !== item.id) });
  };

  const addCustomFood = () => {
    if (!customFood.name || !customFood.calories) return;
    addFood({ name: customFood.name, calories: Number(customFood.calories), protein: Number(customFood.protein || 0) }, "custom");
    setCustomFood({ name: "", calories: "", protein: "" });
  };

  const searchFood = async () => {
    if (!foodSearch.trim()) return;
    setFoodSearching(true);
    setFoodResults([]);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodSearch)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments,serving_size`);
      const data = await res.json();
      const results = (data.products || []).filter(p => p.product_name && p.nutriments).map(p => ({ name: p.product_name, calories: Math.round(p.nutriments["energy-kcal_serving"] || p.nutriments["energy-kcal_100g"] || 0), protein: Math.round(p.nutriments["proteins_serving"] || p.nutriments["proteins_100g"] || 0), serving: p.serving_size || "1 serving" })).filter(p => p.calories > 0).slice(0, 8);
      setFoodResults(results);
      if (!results.length) showToast("No results — try different words");
    } catch (e) { showToast("Search failed — try again"); }
    setFoodSearching(false);
  };

  const lookupBarcode = async (barcode) => {
    if (!barcode) return;
    setScanning(false);
    showToast("Looking up barcode...");
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const food = { name: p.product_name || "Unknown Product", calories: Math.round(p.nutriments?.["energy-kcal_serving"] || p.nutriments?.["energy-kcal_100g"] || 0), protein: Math.round(p.nutriments?.["proteins_serving"] || p.nutriments?.["proteins_100g"] || 0) };
        food.calories > 0 ? addFood(food, food.name) : showToast("No nutrition info found");
      } else { showToast("Product not found — try manual entry"); }
    } catch (e) { showToast("Lookup failed — try again"); }
    setBarcodeInput("");
  };

  const addWater = (oz) => saveDay({ water: Math.min(dayData.water + oz, 200) });
  const removeWater = (oz) => saveDay({ water: Math.max(0, dayData.water - oz) });
  const toggleScheduleWorkout = (activity) => { const cw = dayData.completed_workouts; saveDay({ completed_workouts: cw.includes(activity) ? cw.filter(w => w !== activity) : [...cw, activity] }); };

  const addSet = (exerciseName) => {
    if (!setInput.reps) return;
    const newSet = { weight: Number(setInput.weight) || 0, reps: Number(setInput.reps) };
    const existing = currentWorkout.find(e => e.name === exerciseName);
    if (existing) { setCurrentWorkout(prev => prev.map(e => e.name === exerciseName ? { ...e, sets: [...e.sets, newSet] } : e)); }
    else { setCurrentWorkout(prev => [...prev, { name: exerciseName, sets: [newSet] }]); }
    setSetInput({ weight: "", reps: "" });
    setAddingExercise(null);
    showToast("✓ Set logged");
  };

  const removeSet = (exerciseName, setIndex) => { setCurrentWorkout(prev => prev.map(e => e.name === exerciseName ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) } : e).filter(e => e.sets.length > 0)); };

  const saveWorkout = async () => {
    if (!currentWorkout.length) return;
    try {
      await supabase.from("workout_logs").insert({ date: todayStr(), day_name: today, workout_type: selectedTemplate, exercises: currentWorkout });
      showToast("✓ Workout saved!");
      setCurrentWorkout([]);
      loadWorkoutHistory();
    } catch (e) { showToast("Save failed — run the SQL setup in Supabase"); }
  };

  const saveWeight = () => { const w = parseFloat(weightInput); if (!w) return; saveDay({ weight: w }); showToast(`✓ Weight logged: ${w} lbs`); };

  const resetDay = async () => {
    const reset = { calories: 0, protein: 0, water: 0, food_log: [], completed_workouts: [], weight: null };
    setDayData(reset); setWeightInput("");
    try { await supabase.from("daily_logs").upsert({ date: todayStr(), ...reset }, { onConflict: "date" }); } catch (e) {}
    loadHistory();
  };

  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true); setAiResponse("");
    try {
      const streak = calcStreak();
      const { avgCal, avgProt } = getWeekData();
      const recentWorkouts = workoutHistory.slice(0, 3).map(w => `${w.day_name}: ${w.workout_type}`).join(", ");
      const context = `You are a fitness coach AI for Kaden, an 18-year-old athlete (6'1", 160 lbs) in Oakland, CA. Goals: gain lean muscle, get stronger for MMA, rock climbing and lifting. Daily targets: 3000-3200 calories, 130-160g protein, 1 gallon water. Trains MMA (boxing, jiu jitsu, muay thai), rock climbs, and lifts. Takes creatine and whey protein daily. Today (${today}): ${dayData.calories} cal, ${dayData.protein}g protein, ${dayData.water}oz water. Streak: ${streak} days. Week avg: ${avgCal} cal, ${avgProt}g protein. Recent workouts: ${recentWorkouts || "none yet"}. Be direct, practical, encouraging. Keep it concise.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "anthropic-dangerous-direct-browser-ipc": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: context, messages: [{ role: "user", content: aiQuery }] }),
      });
      const data = await res.json();
      setAiResponse(data.content?.map(b => b.text || "").join("") || "Sorry, try again.");
    } catch (e) { setAiResponse("Error connecting. Try again."); }
    setAiLoading(false);
  };

  const calcStreak = () => { let s = 0; for (const d of [...history].sort((a, b) => b.date.localeCompare(a.date))) { if (d.calories >= GOALS.calories * 0.85 && d.protein >= GOALS.protein * 0.85) s++; else break; } return s; };
  const getWeekData = () => { const w = history.slice(0, 7); return w.length ? { avgCal: Math.round(w.reduce((s, d) => s + (d.calories || 0), 0) / w.length), avgProt: Math.round(w.reduce((s, d) => s + (d.protein || 0), 0) / w.length) } : { avgCal: 0, avgProt: 0 }; };
  const getChartData = () => { const days = historyTab === "week" ? 7 : historyTab === "month" ? 30 : 90; return [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-days).map(d => ({ date: fmt(d.date), calories: d.calories || 0, protein: d.protein || 0 })); };
  const getWeightData = () => history.filter(d => d.weight).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ date: fmt(d.date), weight: d.weight }));

  const streak = calcStreak();
  const { avgCal, avgProt } = getWeekData();
  const calPct = Math.min((dayData.calories / GOALS.calories) * 100, 100);
  const protPct = Math.min((dayData.protein / GOALS.protein) * 100, 100);
  const waterPct = Math.min((dayData.water / GOALS.water) * 100, 100);

  const card = { background: "#111118", borderRadius: "14px", padding: "16px", marginBottom: "14px" };
  const lbl = (color) => ({ fontSize: "10px", letterSpacing: "3px", marginBottom: "10px", fontWeight: "800", color, display: "block" });
  const inp = { background: "#0a0a0f", border: "1px solid #222", borderRadius: "8px", padding: "10px", color: "#fff", fontSize: "13px", fontFamily: "'Courier New', monospace", outline: "none" };

  const allExercises = [...(WORKOUT_TEMPLATES[selectedTemplate] || []), ...currentWorkout.filter(e => !(WORKOUT_TEMPLATES[selectedTemplate] || []).includes(e.name)).map(e => e.name)];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid #222", borderTop: "3px solid #00ff87", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ color: "#00ff87", fontSize: "12px", letterSpacing: "3px", fontFamily: "'Courier New', monospace" }}>LOADING PULSE...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f0", fontFamily: "'Courier New', monospace", maxWidth: "430px", margin: "0 auto" }}>
      {toast && <div style={{ position: "fixed", top: "90px", left: "50%", transform: "translateX(-50%)", background: "#00ff87", color: "#0a0a0f", padding: "10px 20px", borderRadius: "20px", fontSize: "13px", fontWeight: "900", zIndex: 100, fontFamily: "'Courier New', monospace", boxShadow: "0 4px 20px #00ff8766", whiteSpace: "nowrap", animation: "fadeInOut 2s ease" }}>{toast}</div>}
      <style>{`@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}15%{opacity:1;transform:translateX(-50%) translateY(0)}75%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-8px)}}@keyframes spin{to{transform:rotate(360deg)}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:2px}input,textarea{outline:none}button:active{opacity:0.8}`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #00ff87 0%, #00b4d8 100%)", padding: "20px 20px 16px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#0a0a0f88", fontWeight: "800" }}>TRACK. IMPROVE. ACHIEVE.</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "#0a0a0f", letterSpacing: "3px" }}>PULSE</div>
          {streak > 0 && <div style={{ background: "#0a0a0f22", borderRadius: "20px", padding: "4px 12px", fontSize: "13px", fontWeight: "900", color: "#0a0a0f" }}>🔥 {streak}d</div>}
        </div>
        <div style={{ fontSize: "11px", color: "#0a0a0f77", marginTop: "2px" }}>{getDisplayDate().toUpperCase()}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#111118", borderBottom: "1px solid #222", position: "sticky", top: "82px", zIndex: 9 }}>
        {[["today","TODAY"],["workout","WORKOUT"],["history","HISTORY"],["schedule","SCHED"],["ai","AI"]].map(([key, lbl2]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "11px 2px", border: "none", background: "none", color: tab === key ? "#00ff87" : "#444", fontSize: "9px", fontWeight: "800", letterSpacing: "1px", borderBottom: tab === key ? "2px solid #00ff87" : "2px solid transparent", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>{lbl2}</button>
        ))}
      </div>

      <div style={{ padding: "16px", paddingBottom: "40px" }}>

        {/* TODAY */}
        {tab === "today" && (
          <div>
            {/* Rings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {[{ label: "CALORIES", current: dayData.calories, goal: GOALS.calories, pct: calPct, color: "#ff4757", unit: "" }, { label: "PROTEIN", current: dayData.protein, goal: GOALS.protein, pct: protPct, color: "#00ff87", unit: "g" }, { label: "WATER", current: dayData.water, goal: GOALS.water, pct: waterPct, color: "#00b4d8", unit: "oz" }].map(({ label: l, current, goal, pct, color, unit }) => (
                <div key={l} style={{ ...card, padding: "14px 10px", border: `1px solid ${color}22`, textAlign: "center", marginBottom: 0 }}>
                  <div style={{ position: "relative", width: "60px", height: "60px", margin: "0 auto 8px" }}>
                    <svg width="60" height="60" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="30" cy="30" r="24" fill="none" stroke="#222" strokeWidth="5" />
                      <circle cx="30" cy="30" r="24" fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                    </svg>
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: "11px", fontWeight: "900", color }}>{Math.round(pct)}%</div>
                  </div>
                  <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#555", marginBottom: "3px" }}>{l}</div>
                  <div style={{ fontSize: "13px", fontWeight: "900", color }}>{current}{unit}</div>
                  <div style={{ fontSize: "9px", color: "#333" }}>/ {goal}{unit}</div>
                </div>
              ))}
            </div>

            {/* Weight */}
            <div style={{ ...card, border: "1px solid #ffa50222" }}>
              <span style={lbl("#ffa502")}>⚖️ WEIGHT LOG</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="number" placeholder="Your weight (lbs)" value={weightInput} onChange={e => setWeightInput(e.target.value)} style={{ ...inp, flex: 1, color: "#ffa502" }} />
                <button onClick={saveWeight} style={{ background: "#ffa50222", border: "1px solid #ffa50244", borderRadius: "8px", padding: "10px 16px", color: "#ffa502", cursor: "pointer", fontWeight: "900", fontFamily: "'Courier New', monospace" }}>LOG</button>
              </div>
              {dayData.weight && <div style={{ marginTop: "8px", fontSize: "11px", color: "#555" }}>Today: <span style={{ color: "#ffa502" }}>{dayData.weight} lbs</span></div>}
            </div>

            {/* Water */}
            <div style={{ ...card, border: "1px solid #00b4d822" }}>
              <span style={lbl("#00b4d8")}>💧 WATER TRACKER</span>
              <div style={{ fontSize: "10px", color: "#555", marginBottom: "6px" }}>ADD</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                {[8,16,20,26,32].map(oz => <button key={oz} onClick={() => addWater(oz)} style={{ background: "#00b4d811", border: "1px solid #00b4d833", color: "#00b4d8", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700", fontFamily: "'Courier New', monospace" }}>+{oz}oz</button>)}
              </div>
              <div style={{ fontSize: "10px", color: "#555", marginBottom: "6px" }}>REMOVE</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[8,16,20,26,32].map(oz => <button key={oz} onClick={() => removeWater(oz)} style={{ background: "#ff475711", border: "1px solid #ff475733", color: "#ff4757", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700", fontFamily: "'Courier New', monospace" }}>-{oz}oz</button>)}
              </div>
              <div style={{ marginTop: "10px", fontSize: "11px", color: "#444" }}>{dayData.water}oz / {GOALS.water}oz • {Math.max(0, GOALS.water - dayData.water)}oz to go</div>
            </div>

            {/* Today schedule */}
            {SCHEDULE[today] && (
              <div style={{ ...card, border: "1px solid #ffffff11" }}>
                <span style={lbl("#aaa")}>🗓 TODAY'S TRAINING</span>
                {SCHEDULE[today].map((item, i) => (
                  <div key={i} onClick={() => toggleScheduleWorkout(item.activity)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", marginBottom: "6px", cursor: "pointer", background: dayData.completed_workouts.includes(item.activity) ? `${TYPE_COLORS[item.type]}15` : "#0a0a0f", border: `1px solid ${dayData.completed_workouts.includes(item.activity) ? TYPE_COLORS[item.type] : "#222"}`, transition: "all 0.2s" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${TYPE_COLORS[item.type]}`, background: dayData.completed_workouts.includes(item.activity) ? TYPE_COLORS[item.type] : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", flexShrink: 0 }}>{dayData.completed_workouts.includes(item.activity) ? "✓" : ""}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: dayData.completed_workouts.includes(item.activity) ? TYPE_COLORS[item.type] : "#ddd" }}>{item.activity}</div>
                      <div style={{ fontSize: "10px", color: "#444" }}>{item.time}</div>
                    </div>
                    <div style={{ fontSize: "9px", color: TYPE_COLORS[item.type] }}>{TYPE_LABELS[item.type]}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Food Search */}
            <div style={{ ...card, border: "1px solid #00ff8722" }}>
              <span style={lbl("#00ff87")}>🔍 SEARCH FOOD DATABASE</span>
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <input placeholder="Search any food..." value={foodSearch} onChange={e => setFoodSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchFood()} style={{ ...inp, flex: 1 }} />
                <button onClick={searchFood} style={{ background: "#00ff8722", border: "1px solid #00ff8744", borderRadius: "8px", padding: "10px 14px", color: "#00ff87", cursor: "pointer", fontWeight: "900", fontFamily: "'Courier New', monospace" }}>{foodSearching ? "..." : "GO"}</button>
              </div>
              {foodResults.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {foodResults.map((food, i) => (
                    <button key={i} onClick={() => { addFood(food, food.name); setFoodResults([]); setFoodSearch(""); }} style={{ background: "#0a0a0f", border: "1px solid #222", borderRadius: "8px", padding: "10px 12px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'Courier New', monospace" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: "#ddd" }}>{food.name.length > 28 ? food.name.slice(0, 28) + "..." : food.name}</div>
                        <div style={{ fontSize: "10px", color: "#444" }}>{food.serving}</div>
                      </div>
                      <span style={{ fontSize: "11px", flexShrink: 0, marginLeft: "8px" }}><span style={{ color: "#ff4757" }}>{food.calories}cal</span><span style={{ color: "#333" }}> · </span><span style={{ color: "#00ff87" }}>{food.protein}g</span></span>
                    </button>
                  ))}
                  <button onClick={() => setFoodResults([])} style={{ background: "none", border: "1px solid #333", borderRadius: "8px", padding: "8px", color: "#555", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: "11px" }}>CLEAR RESULTS</button>
                </div>
              )}
            </div>

            {/* Barcode */}
            <div style={{ ...card, border: "1px solid #b388ff22" }}>
              <span style={lbl("#b388ff")}>📷 BARCODE SCANNER</span>
              {!scanning ? (
                <button onClick={() => { setScanning(true); setTimeout(() => barcodeRef.current?.focus(), 100); }} style={{ width: "100%", background: "#b388ff22", border: "1px solid #b388ff44", borderRadius: "8px", padding: "14px", color: "#b388ff", fontWeight: "900", fontSize: "12px", letterSpacing: "2px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>📷 SCAN BARCODE</button>
              ) : (
                <div>
                  <div style={{ fontSize: "11px", color: "#b388ff", marginBottom: "8px", textAlign: "center" }}>Type or scan barcode number below</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input ref={barcodeRef} type="number" placeholder="Barcode number..." value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={e => e.key === "Enter" && lookupBarcode(barcodeInput)} style={{ ...inp, flex: 1, color: "#b388ff" }} autoFocus />
                    <button onClick={() => lookupBarcode(barcodeInput)} style={{ background: "#b388ff22", border: "1px solid #b388ff44", borderRadius: "8px", padding: "10px 14px", color: "#b388ff", cursor: "pointer", fontWeight: "900", fontFamily: "'Courier New', monospace" }}>GO</button>
                    <button onClick={() => { setScanning(false); setBarcodeInput(""); }} style={{ background: "#ff475722", border: "1px solid #ff475744", borderRadius: "8px", padding: "10px 14px", color: "#ff4757", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>✕</button>
                  </div>
                  <div style={{ fontSize: "10px", color: "#444", marginTop: "8px", textAlign: "center" }}>Point phone camera at barcode — number appears automatically on some devices</div>
                </div>
              )}
            </div>

            {/* Quick Add */}
            <div style={{ ...card, border: "1px solid #00ff8711" }}>
              <span style={lbl("#00ff87")}>⚡ QUICK ADD</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {QUICK_FOODS.map((food, i) => {
                  const flash = recentlyAdded === food.name;
                  return (
                    <button key={i} onClick={() => addFood(food, food.name)} style={{ background: flash ? "#00ff8722" : "#0a0a0f", border: `1px solid ${flash ? "#00ff87" : "#222"}`, borderRadius: "8px", padding: "10px 12px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'Courier New', monospace", transition: "all 0.15s", transform: flash ? "scale(0.98)" : "scale(1)" }}>
                      <span style={{ fontSize: "12px", color: flash ? "#00ff87" : "#ddd" }}>{flash ? "✓ " : ""}{food.name}</span>
                      <span style={{ fontSize: "11px" }}><span style={{ color: flash ? "#00ff87" : "#ff4757" }}>{food.calories}cal</span><span style={{ color: "#333" }}> · </span><span style={{ color: "#00ff87" }}>{food.protein}g</span></span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Food */}
            <div style={{ ...card, border: "1px solid #ffffff11" }}>
              <span style={lbl("#aaa")}>✏️ CUSTOM FOOD</span>
              <input placeholder="Food name" value={customFood.name} onChange={e => setCustomFood({ ...customFood, name: e.target.value })} style={{ ...inp, width: "100%", marginBottom: "8px", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input type="number" placeholder="Calories" value={customFood.calories} onChange={e => setCustomFood({ ...customFood, calories: e.target.value })} style={{ ...inp, flex: 1, color: "#ff4757" }} />
                <input type="number" placeholder="Protein (g)" value={customFood.protein} onChange={e => setCustomFood({ ...customFood, protein: e.target.value })} style={{ ...inp, flex: 1, color: "#00ff87" }} />
              </div>
              <button onClick={addCustomFood} style={{ width: "100%", background: recentlyAdded === "custom" ? "#00ff87" : "linear-gradient(135deg, #00ff87, #00b4d8)", border: "none", borderRadius: "8px", padding: "12px", color: "#0a0a0f", fontWeight: "900", fontSize: "12px", letterSpacing: "2px", cursor: "pointer", fontFamily: "'Courier New', monospace", transition: "all 0.15s" }}>
                {recentlyAdded === "custom" ? "✓ ADDED!" : "ADD FOOD"}
              </button>
            </div>

            {/* Food Log */}
            {dayData.food_log.length > 0 && (
              <div style={{ ...card, border: "1px solid #ffffff11" }}>
                <span style={lbl("#aaa")}>📋 TODAY'S LOG</span>
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
                    <button onClick={() => removeFood(item)} style={{ background: "#ff475722", border: "1px solid #ff475744", borderRadius: "6px", color: "#ff4757", padding: "6px 10px", cursor: "pointer", fontSize: "14px", fontFamily: "'Courier New', monospace" }}>✕</button>
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

        {/* WORKOUT */}
        {tab === "workout" && (
          <div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
              {[["log","LOG WORKOUT"],["history","HISTORY"]].map(([key, l]) => (
                <button key={key} onClick={() => setWorkoutTab(key)} style={{ flex: 1, padding: "10px", border: `1px solid ${workoutTab === key ? "#00ff87" : "#222"}`, borderRadius: "8px", background: workoutTab === key ? "#00ff8722" : "#111118", color: workoutTab === key ? "#00ff87" : "#555", fontSize: "10px", fontWeight: "800", letterSpacing: "1px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>{l}</button>
              ))}
            </div>

            {workoutTab === "log" && (
              <div>
                <div style={{ ...card, border: "1px solid #00ff8722" }}>
                  <span style={lbl("#00ff87")}>💪 WORKOUT TYPE</span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {Object.keys(WORKOUT_TEMPLATES).map(type => (
                      <button key={type} onClick={() => setSelectedTemplate(type)} style={{ background: selectedTemplate === type ? "#00ff8722" : "#0a0a0f", border: `1px solid ${selectedTemplate === type ? "#00ff87" : "#222"}`, borderRadius: "8px", padding: "8px 12px", cursor: "pointer", color: selectedTemplate === type ? "#00ff87" : "#666", fontSize: "11px", fontWeight: "700", fontFamily: "'Courier New', monospace" }}>{type}</button>
                    ))}
                  </div>
                </div>

                <div style={{ ...card, border: "1px solid #ffffff11" }}>
                  <span style={lbl("#aaa")}>🏋️ LOG YOUR SETS</span>
                  {allExercises.map((exercise, i) => {
                    const logged = currentWorkout.find(e => e.name === exercise);
                    return (
                      <div key={i} style={{ marginBottom: "12px", background: "#0a0a0f", borderRadius: "10px", padding: "12px", border: `1px solid ${logged ? "#00ff8733" : "#1a1a1a"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: logged ? "8px" : "0" }}>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: logged ? "#00ff87" : "#ddd" }}>{exercise}</div>
                          <button onClick={() => setAddingExercise(addingExercise === exercise ? null : exercise)} style={{ background: "#00ff8722", border: "1px solid #00ff8744", borderRadius: "6px", padding: "5px 10px", color: "#00ff87", cursor: "pointer", fontSize: "11px", fontFamily: "'Courier New', monospace", fontWeight: "700" }}>+ SET</button>
                        </div>
                        {logged && logged.sets.map((set, si) => (
                          <div key={si} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid #1a1a1a" }}>
                            <span style={{ fontSize: "12px", color: "#666" }}>Set {si + 1}</span>
                            <span style={{ fontSize: "12px" }}>{set.weight > 0 && <span style={{ color: "#ffa502" }}>{set.weight}lbs </span>}<span style={{ color: "#00ff87" }}>× {set.reps} reps</span></span>
                            <button onClick={() => removeSet(exercise, si)} style={{ background: "none", border: "none", color: "#ff475766", cursor: "pointer", fontSize: "12px" }}>✕</button>
                          </div>
                        ))}
                        {addingExercise === exercise && (
                          <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                            <input type="number" placeholder="lbs" value={setInput.weight} onChange={e => setSetInput({ ...setInput, weight: e.target.value })} style={{ ...inp, width: "72px", textAlign: "center", color: "#ffa502" }} />
                            <input type="number" placeholder="reps" value={setInput.reps} onChange={e => setSetInput({ ...setInput, reps: e.target.value })} onKeyDown={e => e.key === "Enter" && addSet(exercise)} style={{ ...inp, width: "72px", textAlign: "center", color: "#00ff87" }} autoFocus />
                            <button onClick={() => addSet(exercise)} style={{ flex: 1, background: "linear-gradient(135deg, #00ff87, #00b4d8)", border: "none", borderRadius: "8px", padding: "10px", color: "#0a0a0f", fontWeight: "900", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: "12px" }}>LOG</button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <input placeholder="Add custom exercise..." value={customExercise} onChange={e => setCustomExercise(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && customExercise.trim()) { setAddingExercise(customExercise); setCustomExercise(""); } }} style={{ ...inp, flex: 1 }} />
                    <button onClick={() => { if (customExercise.trim()) { setAddingExercise(customExercise); setCustomExercise(""); } }} style={{ background: "#ffffff11", border: "1px solid #333", borderRadius: "8px", padding: "10px 14px", color: "#aaa", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: "16px" }}>+</button>
                  </div>
                </div>

                {currentWorkout.length > 0 && (
                  <button onClick={saveWorkout} style={{ width: "100%", background: "linear-gradient(135deg, #00ff87, #00b4d8)", border: "none", borderRadius: "10px", padding: "16px", color: "#0a0a0f", fontWeight: "900", fontSize: "14px", letterSpacing: "2px", cursor: "pointer", fontFamily: "'Courier New', monospace", marginBottom: "14px" }}>💾 SAVE WORKOUT</button>
                )}
              </div>
            )}

            {workoutTab === "history" && (
              <div>
                {!workoutHistory.length ? (
                  <div style={{ ...card, textAlign: "center", padding: "40px", color: "#333" }}>
                    <div style={{ fontSize: "30px", marginBottom: "10px" }}>💪</div>
                    <div style={{ fontSize: "13px" }}>No workouts logged yet</div>
                    <div style={{ fontSize: "11px", color: "#222", marginTop: "6px" }}>Start logging to see your history</div>
                  </div>
                ) : workoutHistory.map((workout, i) => (
                  <div key={i} style={{ ...card, border: "1px solid #00ff8722" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "900", color: "#00ff87" }}>{workout.workout_type}</div>
                        <div style={{ fontSize: "11px", color: "#444" }}>{workout.day_name} • {fmt(workout.date)}</div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#555" }}>{(workout.exercises || []).length} exercises</div>
                    </div>
                    {(workout.exercises || []).map((ex, ei) => (
                      <div key={ei} style={{ padding: "8px 0", borderTop: "1px solid #1a1a1a" }}>
                        <div style={{ fontSize: "12px", color: "#ddd", marginBottom: "4px" }}>{ex.name}</div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {(ex.sets || []).map((set, si) => (
                            <span key={si} style={{ background: "#0a0a0f", border: "1px solid #222", borderRadius: "6px", padding: "3px 8px", fontSize: "11px" }}>
                              {set.weight > 0 && <span style={{ color: "#ffa502" }}>{set.weight}lbs </span>}
                              <span style={{ color: "#00ff87" }}>×{set.reps}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {[{ l: "STREAK", v: `${streak}d`, sub: "days on track", color: "#ffa502" }, { l: "AVG CAL", v: avgCal, sub: "this week", color: "#ff4757" }, { l: "AVG PRO", v: `${avgProt}g`, sub: "this week", color: "#00ff87" }].map(({ l, v, sub, color }) => (
                <div key={l} style={{ ...card, border: `1px solid ${color}22`, textAlign: "center", marginBottom: 0, padding: "14px 8px" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#555", marginBottom: "6px" }}>{l}</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color }}>{v}</div>
                  <div style={{ fontSize: "9px", color: "#333", marginTop: "4px" }}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
              {[["week","7 DAYS"],["month","30 DAYS"],["all","90 DAYS"]].map(([key, l]) => (
                <button key={key} onClick={() => setHistoryTab(key)} style={{ flex: 1, padding: "8px", border: `1px solid ${historyTab === key ? "#00ff87" : "#222"}`, borderRadius: "8px", background: historyTab === key ? "#00ff8722" : "#111118", color: historyTab === key ? "#00ff87" : "#555", fontSize: "10px", fontWeight: "800", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>{l}</button>
              ))}
            </div>
            <div style={{ ...card, border: "1px solid #ff475722" }}>
              <span style={lbl("#ff4757")}>🔥 CALORIES</span>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={getChartData()}>
                  <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 4000]} />
                  <Tooltip contentStyle={{ background: "#111118", border: "1px solid #333", borderRadius: "8px", color: "#fff", fontSize: "11px" }} />
                  <ReferenceLine y={GOALS.calories} stroke="#ff475744" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="calories" stroke="#ff4757" strokeWidth={2} dot={{ fill: "#ff4757", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ ...card, border: "1px solid #00ff8722" }}>
              <span style={lbl("#00ff87")}>💪 PROTEIN</span>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={getChartData()}>
                  <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 200]} />
                  <Tooltip contentStyle={{ background: "#111118", border: "1px solid #333", borderRadius: "8px", color: "#fff", fontSize: "11px" }} />
                  <ReferenceLine y={GOALS.protein} stroke="#00ff8744" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="protein" stroke="#00ff87" strokeWidth={2} dot={{ fill: "#00ff87", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {getWeightData().length > 1 && (
              <div style={{ ...card, border: "1px solid #ffa50222" }}>
                <span style={lbl("#ffa502")}>⚖️ WEIGHT PROGRESS</span>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={getWeightData()}>
                    <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={["auto","auto"]} />
                    <Tooltip contentStyle={{ background: "#111118", border: "1px solid #333", borderRadius: "8px", color: "#fff", fontSize: "11px" }} formatter={v => [`${v} lbs`, "Weight"]} />
                    <Line type="monotone" dataKey="weight" stroke="#ffa502" strokeWidth={2} dot={{ fill: "#ffa502", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#555" }}>Start: <span style={{ color: "#ffa502" }}>{getWeightData()[0]?.weight}lbs</span></span>
                  <span style={{ fontSize: "11px", color: "#555" }}>Now: <span style={{ color: "#ffa502" }}>{getWeightData().at(-1)?.weight}lbs</span></span>
                  <span style={{ fontSize: "11px", color: "#555" }}>Change: <span style={{ color: (getWeightData().at(-1)?.weight - getWeightData()[0]?.weight) >= 0 ? "#00ff87" : "#ff4757" }}>{(getWeightData().at(-1)?.weight - getWeightData()[0]?.weight).toFixed(1)}lbs</span></span>
                </div>
              </div>
            )}
            <div style={{ ...card, border: "1px solid #ffffff11" }}>
              <span style={lbl("#aaa")}>📅 DAY BY DAY</span>
              {history.slice(0, historyTab === "week" ? 7 : historyTab === "month" ? 30 : 90).map((d, i) => {
                const calOk = d.calories >= GOALS.calories * 0.85;
                const protOk = d.protein >= GOALS.protein * 0.85;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#ddd", fontWeight: "700" }}>{fmt(d.date)}</div>
                      <div style={{ fontSize: "10px", color: "#444" }}>{getDayName(d.date)}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "11px" }}>
                      <span style={{ color: calOk ? "#ff4757" : "#ff475744" }}>{d.calories || 0}cal</span>
                      <span style={{ color: "#333" }}> · </span>
                      <span style={{ color: protOk ? "#00ff87" : "#00ff8744" }}>{d.protein || 0}g</span>
                      {d.weight && <div style={{ color: "#ffa502", fontSize: "10px" }}>{d.weight}lbs</div>}
                    </div>
                    <div style={{ marginLeft: "10px", fontSize: "14px" }}>{calOk && protOk ? "✅" : "⭕"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCHEDULE */}
        {tab === "schedule" && (
          <div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
              {DAYS.map(day => (
                <button key={day} onClick={() => setSelectedDay(day)} style={{ background: selectedDay === day ? "linear-gradient(135deg, #00ff87, #00b4d8)" : "#111118", border: `1px solid ${selectedDay === day ? "transparent" : day === today ? "#00ff87" : "#222"}`, borderRadius: "8px", padding: "8px 10px", cursor: "pointer", color: selectedDay === day ? "#0a0a0f" : day === today ? "#00ff87" : "#666", fontSize: "10px", fontWeight: "900", fontFamily: "'Courier New', monospace" }}>
                  {day.slice(0, 3).toUpperCase()}{day === today ? " •" : ""}
                </button>
              ))}
            </div>
            <div style={{ ...card, border: "1px solid #ffffff11" }}>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#fff", marginBottom: "4px" }}>{selectedDay.toUpperCase()}{selectedDay === today && <span style={{ fontSize: "10px", color: "#00ff87", marginLeft: "8px" }}>TODAY</span>}</div>
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
              ) : <div style={{ textAlign: "center", padding: "30px", color: "#333" }}>REST DAY 💤<br /><span style={{ fontSize: "11px", color: "#222" }}>Recovery is growth</span></div>}
            </div>
          </div>
        )}

        {/* AI */}
        {tab === "ai" && (
          <div>
            <div style={{ ...card, border: "1px solid #00ff8722" }}>
              <span style={lbl("#00ff87")}>🤖 AI COACH</span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                {["What should I eat tonight?","Am I on track today?","How do I recover faster?","Best pre-MMA meal?"].map(q => (
                  <button key={q} onClick={() => setAiQuery(q)} style={{ background: "#0a0a0f", border: "1px solid #222", borderRadius: "8px", padding: "8px 10px", cursor: "pointer", color: "#666", fontSize: "11px", fontFamily: "'Courier New', monospace" }}>{q}</button>
                ))}
              </div>
              <textarea value={aiQuery} onChange={e => setAiQuery(e.target.value)} placeholder="Ask your AI coach..." rows={3} style={{ ...inp, width: "100%", resize: "none", boxSizing: "border-box", marginBottom: "10px" }} />
              <button onClick={askAI} disabled={aiLoading} style={{ width: "100%", background: aiLoading ? "#222" : "linear-gradient(135deg, #00ff87, #00b4d8)", border: "none", borderRadius: "8px", padding: "14px", color: aiLoading ? "#555" : "#0a0a0f", fontWeight: "900", fontSize: "12px", letterSpacing: "2px", cursor: aiLoading ? "not-allowed" : "pointer", fontFamily: "'Courier New', monospace" }}>{aiLoading ? "THINKING..." : "ASK COACH"}</button>
            </div>
            {aiResponse && (
              <div style={{ ...card, border: "1px solid #00b4d822" }}>
                <span style={lbl("#00b4d8")}>COACH SAYS:</span>
                <div style={{ fontSize: "13px", color: "#ddd", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{aiResponse}</div>
              </div>
            )}
            <div style={{ ...card, border: "1px solid #ffffff11" }}>
              <span style={lbl("#aaa")}>TODAY'S STATS</span>
              {[{ l: "Calories", v: `${dayData.calories} / ${GOALS.calories}`, color: "#ff4757", pct: calPct }, { l: "Protein", v: `${dayData.protein}g / ${GOALS.protein}g`, color: "#00ff87", pct: protPct }, { l: "Water", v: `${dayData.water}oz / ${GOALS.water}oz`, color: "#00b4d8", pct: waterPct }].map(({ l, v, color, pct }) => (
                <div key={l} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#555" }}>{l}</span>
                    <span style={{ fontSize: "11px", color }}>{v}</span>
                  </div>
                  <div style={{ height: "4px", background: "#222", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "2px", transition: "width 0.5s" }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>🔥 {streak} day streak</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
