import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const DEFAULT_GOALS = { calories: 3200, protein: 150, water: 128, weightGoal: 180 };
const SUPPLEMENTS = ["Creatine", "Protein Shake"];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const TYPE_COLORS = { gym: "#00C805", mma: "#FF6B35", climbing: "#4A9EFF" };
const TYPE_LABELS = { gym: "GYM", mma: "MMA", climbing: "CLIMB" };

const SCHEDULE = {
  Monday: [
    { time: "3:00-4:30pm", activity: "Gym - Chest & Triceps", type: "gym" },
    { time: "5:30-6:30pm", activity: "Boxing w/ Antonio Vasquez", type: "mma" },
    { time: "6:30-7:30pm", activity: "Jiu Jitsu No Gi w/ Kenny Thai", type: "mma" },
  ],
  Tuesday: [
    { time: "3:00-4:30pm", activity: "Gym - Back & Shoulders", type: "gym" },
    { time: "4:30-5:30pm", activity: "Rock Climbing", type: "climbing" },
  ],
  Wednesday: [
    { time: "3:00-4:30pm", activity: "Gym - Arms", type: "gym" },
    { time: "5:30-6:30pm", activity: "Boxing w/ Antonio Vasquez", type: "mma" },
    { time: "6:30-7:30pm", activity: "Muay Thai Drills w/ Gilbert", type: "mma" },
    { time: "7:30-8:30pm", activity: "Jiu Jitsu No Gi w/ Gilbert & Kenny", type: "mma" },
  ],
  Thursday: [
    { time: "5:30-6:30pm", activity: "Muay Thai All Levels w/ Edge Brown", type: "mma" },
  ],
  Friday: [
    { time: "2:00-4:00pm", activity: "Rock Climbing", type: "climbing" },
    { time: "5:30-6:30pm", activity: "Jiu Jitsu No Gi w/ Kenny Thai", type: "mma" },
    { time: "6:30-7:30pm", activity: "Beginner Sparring w/ Antonio Vasquez", type: "mma" },
  ],
  Saturday: [{ time: "Morning", activity: "Rock Climbing", type: "climbing" }],
  Sunday: [{ time: "Morning", activity: "Gym - Full Arms", type: "gym" }],
};

const QUICK_FOODS = [
  { name: "3 Eggs", calories: 210, protein: 18 },
  { name: "2 Packets Oatmeal", calories: 200, protein: 8 },
  { name: "Protein Shake", calories: 150, protein: 25 },
  { name: "Chipotle Double Chicken Bowl", calories: 1050, protein: 57 },
  { name: "Coconut Water", calories: 120, protein: 2 },
];

const WORKOUT_TEMPLATES = {
  "Chest & Triceps": ["Chest Press Machine","Incline Press Machine","Pec Deck","Tricep Pushdown","Dumbbell Kickbacks","Overhead Tricep Extension","Dips"],
  "Back & Shoulders": ["Lower Back Press","Vertical Traction","Low Row","Shoulder Press","Lateral Raises","Trap Shrugs"],
  "Arms": ["Bicep Curl","Hammer Curl","Tricep Pushdown","Overhead Tricep Extension"],
  "Full Body": ["Chest Press Machine","Low Row","Shoulder Press","Bicep Curl","Tricep Pushdown","Lateral Raises"],
  "Custom": [],
};

function todayStr() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); }
function getDayName(ds) { const d = new Date(ds + "T12:00:00"); return DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]; }
function getTodayName() { return getDayName(todayStr()); }
function fmt(ds) { return new Date(ds + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function getDisplayDate() { return new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" }); }
function getWeekStart() {
  const d = new Date(); const day = d.getDay(); const diff = (day === 0 ? -6 : 1 - day);
  const m = new Date(d); m.setDate(d.getDate() + diff);
  return m.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}
function gradeWeek(s) {
  if (s >= 90) return { grade: "A", color: "#00C805" };
  if (s >= 75) return { grade: "B", color: "#4A9EFF" };
  if (s >= 60) return { grade: "C", color: "#FF9F0A" };
  if (s >= 40) return { grade: "D", color: "#FF6B35" };
  return { grade: "F", color: "#FF453A" };
}

const C = {
  bg: "#0D0D0F", surface: "#141416", surfaceUp: "#1C1C1F", border: "#252528",
  accent: "#00C805", accentBg: "rgba(0,200,5,0.08)", accentBorder: "rgba(0,200,5,0.2)",
  text: "#FFFFFF", textSub: "#8A8A8E", textDim: "#3A3A3E",
  red: "#FF453A", orange: "#FF9F0A", blue: "#4A9EFF", purple: "#BF5AF2",
  font: "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
  r: "14px", rSm: "10px",
};

const Card = ({ children, style = {}, accent }) => (
  <div style={{ background: C.surface, borderRadius: C.r, padding: "18px", marginBottom: "12px",
    border: `1px solid ${accent ? accent + "25" : C.border}`,
    borderLeft: accent ? `3px solid ${accent}` : `1px solid ${C.border}`, ...style }}>{children}</div>
);
const Lbl = ({ children, color = C.textSub, style = {} }) => (
  <div style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.8px", color, marginBottom: "14px", textTransform: "uppercase", ...style }}>{children}</div>
);
const PillBtn = ({ children, onClick, active, color = C.accent }) => (
  <button onClick={onClick} style={{ background: active ? color + "15" : "transparent", border: `1px solid ${active ? color : C.border}`, borderRadius: "20px", padding: "7px 14px", cursor: "pointer", color: active ? color : C.textSub, fontSize: "12px", fontWeight: "600", fontFamily: C.font, transition: "all 0.15s" }}>{children}</button>
);
const Inp = ({ style = {}, ...props }) => (
  <input style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: C.rSm, padding: "12px 14px", color: C.text, fontSize: "15px", fontFamily: C.font, outline: "none", width: "100%", boxSizing: "border-box", ...style }} {...props} />
);
const Ring = ({ pct, color, size = 72, stroke = 5 }) => {
  const r = (size - stroke * 2) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surfaceUp} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(pct, 100) / 100)}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
};

export default function App() {
  const [tab, setTab] = useState("today");
  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState({ calories: 0, protein: 0, water: 0, food_log: [], completed_workouts: [], weight: null, supplements: [] });
  const [customFood, setCustomFood] = useState({ name: "", calories: "", protein: "" });
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [toast, setToast] = useState(null);
  const [weightInput, setWeightInput] = useState("");
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalsInput, setGoalsInput] = useState({ ...DEFAULT_GOALS });
  const [workoutSubTab, setWorkoutSubTab] = useState("log");
  const [selectedTemplate, setSelectedTemplate] = useState("Chest & Triceps");
  const [currentWorkout, setCurrentWorkout] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [addingExercise, setAddingExercise] = useState(null);
  const [setInput, setSetInput] = useState({ weight: "", reps: "" });
  const [customExercise, setCustomExercise] = useState("");
  const [history, setHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState("overview");
  const [selectedPastDay, setSelectedPastDay] = useState(null);
  const [selectedDay, setSelectedDay] = useState(getTodayName());
  const today = getTodayName();

  const showToast = (msg, isError = false) => { setToast({ msg, isError }); setTimeout(() => setToast(null), 2500); };

  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("daily_logs").select("*").eq("date", todayStr()).single();
      if (data) {
        setDayData({ calories: data.calories || 0, protein: data.protein || 0, water: data.water || 0,
          food_log: data.food_log || [], completed_workouts: data.completed_workouts || [],
          weight: data.weight || null, supplements: data.supplements || [] });
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
      const { data } = await supabase.from("workout_logs").select("*").order("date", { ascending: false }).limit(60);
      if (data) setWorkoutHistory(data);
    } catch (_) {}
  }, []);

  const loadGoals = useCallback(async () => {
    try {
      const { data } = await supabase.from("user_settings").select("*").eq("key", "goals").single();
      if (data?.value) { setGoals(data.value); setGoalsInput(data.value); }
    } catch (_) {}
  }, []);

  useEffect(() => { loadToday(); loadHistory(); loadWorkoutHistory(); loadGoals(); }, [loadToday, loadHistory, loadWorkoutHistory, loadGoals]);

  const saveDay = async (updates) => {
    const merged = {
      ...dayData, ...updates,
      supplements: (updates.supplements ?? dayData.supplements) || [],
      food_log: (updates.food_log ?? dayData.food_log) || [],
      completed_workouts: (updates.completed_workouts ?? dayData.completed_workouts) || [],
    };
    setDayData(merged);
    try {
      await supabase.from("daily_logs").upsert({
        date: todayStr(),
        calories: merged.calories || 0,
        protein: merged.protein || 0,
        water: merged.water || 0,
        food_log: merged.food_log,
        completed_workouts: merged.completed_workouts,
        weight: merged.weight || null,
        supplements: merged.supplements,
      }, { onConflict: "date" });
      loadHistory();
    } catch (_) { showToast("Save failed", true); }
  };

  const saveGoals = async () => {
    const updated = { calories: Number(goalsInput.calories)||3200, protein: Number(goalsInput.protein)||150, water: Number(goalsInput.water)||128, weightGoal: Number(goalsInput.weightGoal)||180 };
    setGoals(updated); setEditingGoals(false);
    try { await supabase.from("user_settings").upsert({ key: "goals", value: updated }, { onConflict: "key" }); } catch (_) {}
    showToast("Goals updated!");
  };

  const addFood = (food, key) => {
    const newLog = [...dayData.food_log, { ...food, id: Date.now(), time: new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit" }) }];
    saveDay({ calories: dayData.calories + food.calories, protein: dayData.protein + food.protein, food_log: newLog });
    setRecentlyAdded(key ?? food.name); setTimeout(() => setRecentlyAdded(null), 800);
    showToast("Added " + food.name);
  };
  const removeFood = (item) => saveDay({ calories: Math.max(0, dayData.calories - item.calories), protein: Math.max(0, dayData.protein - item.protein), food_log: dayData.food_log.filter(f => f.id !== item.id) });
  const addCustomFood = () => { if (!customFood.name || !customFood.calories) return; addFood({ name: customFood.name, calories: Number(customFood.calories), protein: Number(customFood.protein||0) }, "custom"); setCustomFood({ name: "", calories: "", protein: "" }); };
  const addWater = (oz) => saveDay({ water: Math.min(dayData.water + oz, 200) });
  const removeWater = (oz) => saveDay({ water: Math.max(0, dayData.water - oz) });
  const toggleSupplement = (name) => {
    const s = dayData.supplements || []; const u = s.includes(name) ? s.filter(x => x !== name) : [...s, name];
    saveDay({ supplements: u }); if (!s.includes(name)) showToast(name + " logged");
  };
  const toggleScheduleWorkout = (activity) => {
    const cw = dayData.completed_workouts || [];
    const updated = cw.includes(activity) ? cw.filter(w => w !== activity) : [...cw, activity];
    const merged = { ...dayData, completed_workouts: updated };
    setDayData(merged);
    supabase.from("daily_logs").upsert({
      date: todayStr(), calories: merged.calories, protein: merged.protein,
      water: merged.water, food_log: merged.food_log,
      completed_workouts: merged.completed_workouts, weight: merged.weight,
      supplements: merged.supplements,
    }, { onConflict: "date" }).then(() => loadHistory()).catch(() => showToast("Save failed", true));
  };
  const getLastSession = (tmpl) => workoutHistory.find(w => w.workout_type === tmpl);
  const addSet = (exerciseName) => {
    if (!setInput.reps) return;
    const ns = { weight: Number(setInput.weight)||0, reps: Number(setInput.reps) };
    const ex = currentWorkout.find(e => e.name === exerciseName);
    if (ex) setCurrentWorkout(p => p.map(e => e.name === exerciseName ? { ...e, sets: [...e.sets, ns] } : e));
    else setCurrentWorkout(p => [...p, { name: exerciseName, sets: [ns] }]);
    setSetInput({ weight: "", reps: "" }); setAddingExercise(null); showToast("Set logged");
  };
  const removeSet = (name, idx) => setCurrentWorkout(p => p.map(e => e.name === name ? { ...e, sets: e.sets.filter((_, i) => i !== idx) } : e).filter(e => e.sets.length > 0));
  const saveWorkout = async () => {
    if (!currentWorkout.length) return;
    try { await supabase.from("workout_logs").insert({ date: todayStr(), day_name: today, workout_type: selectedTemplate, exercises: currentWorkout }); showToast("Workout saved!"); setCurrentWorkout([]); loadWorkoutHistory(); }
    catch (_) { showToast("Save failed - run SQL setup", true); }
  };
  const saveWeight = () => { const w = parseFloat(weightInput); if (!w) return; saveDay({ weight: w }); showToast("Weight logged: " + w + " lbs"); };
  const resetDay = async () => {
    const r = { calories: 0, protein: 0, water: 0, food_log: [], completed_workouts: [], weight: null, supplements: [] };
    setDayData(r); setWeightInput("");
    try { await supabase.from("daily_logs").upsert({ date: todayStr(), ...r }, { onConflict: "date" }); } catch (_) {}
    loadHistory();
  };

  const getNutritionStreak = () => { let s = 0; for (const d of [...history].sort((a,b) => b.date.localeCompare(a.date))) { if ((d.calories||0) >= goals.calories*0.85 && (d.protein||0) >= goals.protein*0.85) s++; else break; } return s; };
  const getGymStreak = () => { let s = 0; const gd = DAYS.filter(d => SCHEDULE[d]?.some(x => x.type === "gym")); for (const d of [...history].sort((a,b) => b.date.localeCompare(a.date))) { const dn = getDayName(d.date); if (gd.includes(dn)) { const gi = SCHEDULE[dn].filter(x => x.type === "gym"); if (gi.some(g => (d.completed_workouts||[]).includes(g.activity))) s++; else break; } } return s; };
  const getSuppStreak = () => { let s = 0; for (const d of [...history].sort((a,b) => b.date.localeCompare(a.date))) { if (SUPPLEMENTS.every(x => (d.supplements||[]).includes(x))) s++; else break; } return s; };
  const getWeekDays = () => { const ws = getWeekStart(); const ts = todayStr(); return history.filter(d => d.date >= ws && d.date <= ts).sort((a,b) => a.date.localeCompare(b.date)); };
  const getWeightData = () => history.filter(d => d.weight).sort((a,b) => a.date.localeCompare(b.date)).map(d => ({ date: fmt(d.date), weight: d.weight }));
  const getAttendance = (days, type) => {
    const sched = DAYS.filter(d => SCHEDULE[d]?.some(s => s.type === type));
    let hit = 0, total = 0; const missed = [], attended = [];
    days.forEach(d => { const dn = getDayName(d.date); if (sched.includes(dn)) { total++; const items = SCHEDULE[dn].filter(s => s.type === type); if (items.some(i => (d.completed_workouts||[]).includes(i.activity))) { hit++; attended.push(d.date); } else missed.push(d.date); } });
    return { hit, total, missed, attended, rate: total > 0 ? Math.round((hit/total)*100) : 0 };
  };
  const getWeeklyScore = (wd) => {
    if (!wd.length) return 0;
    const ac = wd.reduce((s,d) => s+(d.calories||0),0)/wd.length;
    const ap = wd.reduce((s,d) => s+(d.protein||0),0)/wd.length;
    const aw = wd.reduce((s,d) => s+(d.water||0),0)/wd.length;
    const ga = getAttendance(wd,"gym").rate;
    const ma = getAttendance(wd,"mma").rate;
    const sd = wd.filter(d => SUPPLEMENTS.every(s => (d.supplements||[]).includes(s))).length;
    const sr = (sd/wd.length)*100;
    return Math.round(Math.min(ac/goals.calories,1)*100*0.25 + Math.min(ap/goals.protein,1)*100*0.25 + ga*0.2 + ma*0.1 + Math.min(aw/goals.water,1)*100*0.1 + sr*0.1);
  };

  const nutritionStreak = getNutritionStreak(), gymStreak = getGymStreak(), suppStreak = getSuppStreak();
  const calPct = (dayData.calories/goals.calories)*100, protPct = (dayData.protein/goals.protein)*100, waterPct = (dayData.water/goals.water)*100;
  const weightData = getWeightData();
  const startWeight = weightData[0]?.weight || 160;
  const currentWeight = weightData.at(-1)?.weight || dayData.weight || startWeight;
  const weightPct = Math.max(0, Math.min(((currentWeight - startWeight) / (goals.weightGoal - startWeight)) * 100, 100));
  const allExercises = [...(WORKOUT_TEMPLATES[selectedTemplate]||[]), ...currentWorkout.filter(e => !(WORKOUT_TEMPLATES[selectedTemplate]||[]).includes(e.name)).map(e => e.name)];
  const lastSession = getLastSession(selectedTemplate);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"20px", fontFamily:C.font }}>
      <div style={{ fontSize:"28px", fontWeight:"700", color:C.accent }}>PULSE</div>
      <div style={{ width:"32px", height:"32px", border:`2px solid ${C.border}`, borderTop:`2px solid ${C.accent}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)} style={{ flex:1, padding:"12px 2px", border:"none", background:"none", color: tab===key ? C.text : C.textDim, fontSize:"10px", fontWeight:"600", letterSpacing:"0.3px", borderBottom:`2px solid ${tab===key ? C.accent : "transparent"}`, cursor:"pointer", fontFamily:C.font }}>{label}</button>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:C.font, maxWidth:"430px", margin:"0 auto" }}>
      {toast && <div style={{ position:"fixed", top:"100px", left:"50%", transform:"translateX(-50%)", background: toast.isError ? C.red : C.accent, color:"#000", padding:"10px 20px", borderRadius:"20px", fontSize:"13px", fontWeight:"600", zIndex:200, whiteSpace:"nowrap", boxShadow:`0 4px 24px ${toast.isError ? C.red : C.accent}44`, animation:"fadeUp 2.5s ease forwards" }}>{toast.msg}</div>}
      <style>{"@keyframes fadeUp{0%{opacity:0;transform:translateX(-50%) translateY(8px)}10%{opacity:1;transform:translateX(-50%) translateY(0)}80%{opacity:1}100%{opacity:0}}@keyframes spin{to{transform:rotate(360deg)}}*{-webkit-tap-highlight-color:transparent}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#252528;border-radius:2px}input,button{-webkit-appearance:none;outline:none}"}</style>

      <div style={{ background:C.bg, padding:"52px 20px 16px", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontSize:"26px", fontWeight:"700", letterSpacing:"-1px" }}>Pulse</div>
            <div style={{ fontSize:"12px", color:C.textSub, marginTop:"2px" }}>{getDisplayDate()}</div>
          </div>
          <div style={{ display:"flex", gap:"6px" }}>
            {gymStreak > 0 && <div style={{ background:C.accentBg, border:`1px solid ${C.accentBorder}`, borderRadius:"20px", padding:"5px 10px", fontSize:"11px", fontWeight:"600", color:C.accent }}>{"💪 " + gymStreak + "d gym"}</div>}
            {nutritionStreak > 0 && <div style={{ background:C.orange+"15", border:`1px solid ${C.orange}44`, borderRadius:"20px", padding:"5px 10px", fontSize:"11px", fontWeight:"600", color:C.orange }}>{"🔥 " + nutritionStreak + "d"}</div>}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", background:C.bg, borderBottom:`1px solid ${C.border}`, position:"sticky", top:"86px", zIndex:9 }}>
        {[["today","Today"],["workout","Workout"],["history","History"],["week","Week"],["schedule","Schedule"]].map(([k,l]) => tabBtn(k,l))}
      </div>

      <div style={{ padding:"16px", paddingBottom:"48px" }}>

        {tab === "today" && (
          <div>
            <Card>
              <div style={{ display:"flex", gap:"8px", justifyContent:"space-around" }}>
                {[{label:"Calories",current:dayData.calories,goal:goals.calories,pct:calPct,color:C.accent,unit:""},
                  {label:"Protein",current:dayData.protein+"g",goal:goals.protein+"g",pct:protPct,color:C.blue,unit:"g"},
                  {label:"Water",current:dayData.water+"oz",goal:goals.water+"oz",pct:waterPct,color:"#4CD5FF",unit:"oz"}
                ].map(({label,current,goal,pct,color}) => (
                  <div key={label} style={{ textAlign:"center" }}>
                    <div style={{ position:"relative", width:"72px", height:"72px", margin:"0 auto 10px" }}>
                      <Ring pct={pct} color={color} size={72} stroke={5} />
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <div style={{ fontSize:"13px", fontWeight:"700", color }}>{Math.round(pct)}%</div>
                      </div>
                    </div>
                    <div style={{ fontSize:"15px", fontWeight:"700" }}>{current}</div>
                    <div style={{ fontSize:"11px", color:C.textSub }}>{label}</div>
                    <div style={{ fontSize:"10px", color:C.textDim }}>{"/ " + goal}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <Lbl>Supplements</Lbl>
              <div style={{ display:"flex", gap:"8px" }}>
                {SUPPLEMENTS.map(s => {
                  const done = (dayData.supplements||[]).includes(s);
                  return <button key={s} onClick={() => toggleSupplement(s)} style={{ flex:1, background: done ? C.accentBg : C.surfaceUp, border:`1px solid ${done ? C.accentBorder : C.border}`, borderRadius:C.rSm, padding:"14px 10px", cursor:"pointer", fontFamily:C.font, transition:"all 0.15s" }}>
                    <div style={{ fontSize:"20px", marginBottom:"6px" }}>{s === "Creatine" ? "⚡" : "🥤"}</div>
                    <div style={{ fontSize:"12px", fontWeight:"600", color: done ? C.accent : C.textSub }}>{s}</div>
                    <div style={{ fontSize:"11px", color: done ? C.accent : C.textDim, marginTop:"3px" }}>{done ? "✓ Done" : "Tap to log"}</div>
                  </button>;
                })}
              </div>
              {suppStreak > 0 && <div style={{ marginTop:"12px", fontSize:"12px", color:C.textSub }}>{"💊 " + suppStreak + " day supplement streak"}</div>}
            </Card>

            {SCHEDULE[today] && (
              <Card>
                <Lbl>Today's Training</Lbl>
                {SCHEDULE[today].map((item, i) => {
                  const done = dayData.completed_workouts.includes(item.activity);
                  return <div key={i} onClick={() => toggleScheduleWorkout(item.activity)} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px", borderRadius:C.rSm, marginBottom:"6px", cursor:"pointer", background: done ? TYPE_COLORS[item.type]+"10" : C.surfaceUp, border:`1px solid ${done ? TYPE_COLORS[item.type]+"40" : C.border}`, transition:"all 0.15s" }}>
                    <div style={{ width:"22px", height:"22px", borderRadius:"50%", border:`2px solid ${TYPE_COLORS[item.type]}`, background: done ? TYPE_COLORS[item.type] : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"11px", color: done ? "#000" : "transparent", fontWeight:"700" }}>✓</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"13px", fontWeight:"600", color: done ? TYPE_COLORS[item.type] : C.text }}>{item.activity}</div>
                      <div style={{ fontSize:"11px", color:C.textSub, marginTop:"2px" }}>{item.time}</div>
                    </div>
                    <div style={{ fontSize:"10px", fontWeight:"700", color:TYPE_COLORS[item.type], background:TYPE_COLORS[item.type]+"15", padding:"3px 8px", borderRadius:"10px" }}>{TYPE_LABELS[item.type]}</div>
                  </div>;
                })}
              </Card>
            )}

            <Card>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
                <Lbl style={{ marginBottom:0 }}>Weight</Lbl>
                {currentWeight > startWeight && <div style={{ fontSize:"12px", color:C.accent, fontWeight:"600" }}>{"+" + (currentWeight - startWeight).toFixed(1) + " lbs gained"}</div>}
              </div>
              <div style={{ display:"flex", gap:"8px", marginBottom:"12px" }}>
                <Inp type="number" placeholder="Enter weight (lbs)" value={weightInput} onChange={e => setWeightInput(e.target.value)} style={{ color:C.orange }} />
                <button onClick={saveWeight} style={{ background:C.orange+"15", border:`1px solid ${C.orange}40`, borderRadius:C.rSm, padding:"12px 18px", color:C.orange, cursor:"pointer", fontWeight:"600", fontFamily:C.font, fontSize:"14px", flexShrink:0 }}>Log</button>
              </div>
              <div style={{ marginBottom:"6px", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:"12px", color:C.textSub }}>Goal: <span style={{ color:C.orange, fontWeight:"600" }}>{goals.weightGoal} lbs</span></span>
                <span style={{ fontSize:"12px", color:C.textSub }}><span style={{ color:C.orange, fontWeight:"600" }}>{Math.max(0, goals.weightGoal - currentWeight).toFixed(1)} lbs</span> to go</span>
              </div>
              <div style={{ height:"6px", background:C.surfaceUp, borderRadius:"3px", marginBottom:"8px" }}>
                <div style={{ height:"100%", width: weightPct + "%", background:`linear-gradient(90deg, ${C.orange}, ${C.accent})`, borderRadius:"3px", transition:"width 0.5s" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:"11px", color:C.textDim }}>{"Start: " + startWeight + " lbs"}</span>
                <span style={{ fontSize:"11px", color:C.textDim }}>{"Now: " + currentWeight + " lbs"}</span>
                <span style={{ fontSize:"11px", color:C.textDim }}>{"Goal: " + goals.weightGoal + " lbs"}</span>
              </div>
            </Card>

            <Card>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
                <Lbl style={{ marginBottom:0 }}>Water</Lbl>
                <div style={{ fontSize:"13px", fontWeight:"600", color:"#4CD5FF" }}>{dayData.water + "oz"} <span style={{ color:C.textDim }}>{"/ " + goals.water + "oz"}</span></div>
              </div>
              <div style={{ marginBottom:"10px" }}>
                <div style={{ fontSize:"11px", color:C.textDim, marginBottom:"8px" }}>ADD</div>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  {[8,16,20,26,32].map(oz => <button key={oz} onClick={() => addWater(oz)} style={{ background:"rgba(76,213,255,0.08)", border:"1px solid rgba(76,213,255,0.2)", color:"#4CD5FF", padding:"8px 12px", borderRadius:"20px", cursor:"pointer", fontSize:"12px", fontWeight:"600", fontFamily:C.font }}>{"+"+oz+"oz"}</button>)}
                </div>
              </div>
              <div style={{ fontSize:"11px", color:C.textDim, marginBottom:"8px" }}>REMOVE</div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                {[8,16,20,26,32].map(oz => <button key={oz} onClick={() => removeWater(oz)} style={{ background:C.red+"08", border:`1px solid ${C.red}25`, color:C.red, padding:"8px 12px", borderRadius:"20px", cursor:"pointer", fontSize:"12px", fontWeight:"600", fontFamily:C.font }}>{"-"+oz+"oz"}</button>)}
              </div>
            </Card>

            <Card>
              <Lbl>Quick Add Food</Lbl>
              <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                {QUICK_FOODS.map((food, i) => {
                  const flash = recentlyAdded === food.name;
                  return <button key={i} onClick={() => addFood(food, food.name)} style={{ background: flash ? C.accentBg : "transparent", border:`1px solid ${flash ? C.accentBorder : C.border}`, borderRadius:C.rSm, padding:"12px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:C.font, transition:"all 0.12s" }}>
                    <span style={{ fontSize:"14px", color: flash ? C.accent : C.text, fontWeight:"500" }}>{flash ? "✓ " : ""}{food.name}</span>
                    <span style={{ fontSize:"12px" }}><span style={{ color: flash ? C.accent : C.red, fontWeight:"600" }}>{food.calories}</span><span style={{ color:C.textDim }}> cal · </span><span style={{ color:C.blue, fontWeight:"600" }}>{food.protein}g</span></span>
                  </button>;
                })}
              </div>
            </Card>

            <Card>
              <Lbl>Custom Food</Lbl>
              <Inp placeholder="Food name" value={customFood.name} onChange={e => setCustomFood({...customFood, name:e.target.value})} style={{ marginBottom:"8px" }} />
              <div style={{ display:"flex", gap:"8px", marginBottom:"10px" }}>
                <Inp type="number" placeholder="Calories" value={customFood.calories} onChange={e => setCustomFood({...customFood, calories:e.target.value})} style={{ color:C.red }} />
                <Inp type="number" placeholder="Protein (g)" value={customFood.protein} onChange={e => setCustomFood({...customFood, protein:e.target.value})} style={{ color:C.blue }} />
              </div>
              <button onClick={addCustomFood} style={{ width:"100%", background: recentlyAdded==="custom" ? C.accent : C.accentBg, border:`1px solid ${C.accentBorder}`, borderRadius:C.rSm, padding:"13px", color: recentlyAdded==="custom" ? "#000" : C.accent, fontWeight:"600", fontSize:"14px", cursor:"pointer", fontFamily:C.font }}>
                {recentlyAdded==="custom" ? "✓ Added!" : "Add Food"}
              </button>
            </Card>

            {dayData.food_log.length > 0 && (
              <Card>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"14px" }}>
                  <Lbl style={{ marginBottom:0 }}>Today's Log</Lbl>
                  <div style={{ fontSize:"12px", color:C.textSub }}><span style={{ color:C.red, fontWeight:"600" }}>{dayData.calories}</span>{" cal · "}<span style={{ color:C.blue, fontWeight:"600" }}>{dayData.protein}g</span></div>
                </div>
                {dayData.food_log.map((item, i) => (
                  <div key={item.id||i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"13px", fontWeight:"500" }}>{item.name}</div>
                      <div style={{ fontSize:"11px", color:C.textSub, marginTop:"2px" }}>{item.time}</div>
                    </div>
                    <div style={{ textAlign:"right", marginRight:"12px" }}>
                      <div style={{ fontSize:"13px", color:C.red, fontWeight:"600" }}>{item.calories} cal</div>
                      <div style={{ fontSize:"11px", color:C.blue }}>{item.protein}g</div>
                    </div>
                    <button onClick={() => removeFood(item)} style={{ background:C.red+"10", border:`1px solid ${C.red}25`, borderRadius:"8px", color:C.red, padding:"6px 10px", cursor:"pointer", fontSize:"13px", fontFamily:C.font }}>✕</button>
                  </div>
                ))}
              </Card>
            )}

            <Card>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: editingGoals ? "14px" : "0" }}>
                <Lbl style={{ marginBottom:0 }}>Daily Goals</Lbl>
                <button onClick={() => setEditingGoals(!editingGoals)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:"20px", padding:"5px 12px", color:C.textSub, cursor:"pointer", fontSize:"12px", fontFamily:C.font }}>{editingGoals ? "Cancel" : "Edit"}</button>
              </div>
              {editingGoals ? (
                <div>
                  {[["calories","Calorie goal",C.accent],["protein","Protein goal (g)",C.blue],["water","Water goal (oz)","#4CD5FF"],["weightGoal","Weight goal (lbs)",C.orange]].map(([key,label,color]) => (
                    <div key={key} style={{ marginBottom:"10px" }}>
                      <div style={{ fontSize:"12px", color:C.textSub, marginBottom:"6px" }}>{label}</div>
                      <Inp type="number" value={goalsInput[key]} onChange={e => setGoalsInput({...goalsInput, [key]:e.target.value})} style={{ color }} />
                    </div>
                  ))}
                  <button onClick={saveGoals} style={{ width:"100%", background:C.accent, border:"none", borderRadius:C.rSm, padding:"13px", color:"#000", fontWeight:"700", fontSize:"14px", cursor:"pointer", fontFamily:C.font }}>Save Goals</button>
                </div>
              ) : (
                <div style={{ display:"flex", gap:"8px", marginTop:"10px", flexWrap:"wrap" }}>
                  {[["🔥",goals.calories+" cal",C.accent],["💪",goals.protein+"g protein",C.blue],["💧",goals.water+"oz water","#4CD5FF"],["⚖️",goals.weightGoal+" lbs goal",C.orange]].map(([icon,label,color],i) => (
                    <div key={i} style={{ background:C.surfaceUp, borderRadius:C.rSm, padding:"8px 12px", fontSize:"12px", color, fontWeight:"600" }}>{icon + " " + label}</div>
                  ))}
                </div>
              )}
            </Card>

            <button onClick={resetDay} style={{ width:"100%", background:"transparent", border:`1px solid ${C.border}`, borderRadius:C.rSm, padding:"13px", color:C.textSub, fontSize:"13px", cursor:"pointer", fontFamily:C.font, fontWeight:"500" }}>Reset Day</button>
          </div>
        )}

        {tab === "workout" && (
          <div>
            <div style={{ display:"flex", gap:"8px", marginBottom:"16px" }}>
              <PillBtn onClick={() => setWorkoutSubTab("log")} active={workoutSubTab==="log"}>Log Workout</PillBtn>
              <PillBtn onClick={() => setWorkoutSubTab("history")} active={workoutSubTab==="history"}>History</PillBtn>
            </div>

            {workoutSubTab === "log" && (
              <div>
                <Card>
                  <Lbl>Workout Type</Lbl>
                  <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                    {Object.keys(WORKOUT_TEMPLATES).map(type => (
                      <PillBtn key={type} onClick={() => { setSelectedTemplate(type); setCurrentWorkout([]); setAddingExercise(null); }} active={selectedTemplate===type}>{type}</PillBtn>
                    ))}
                  </div>
                </Card>

                {lastSession && (
                  <Card accent={C.blue}>
                    <Lbl color={C.blue}>{"Last Session - " + fmt(lastSession.date)}</Lbl>
                    {(lastSession.exercises||[]).map((ex,i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                        <div style={{ fontSize:"13px" }}>{ex.name}</div>
                        <div style={{ display:"flex", gap:"4px" }}>
                          {(ex.sets||[]).map((set,si) => (
                            <span key={si} style={{ background:C.surfaceUp, borderRadius:"6px", padding:"3px 8px", fontSize:"11px" }}>
                              {set.weight > 0 && <span style={{ color:C.orange }}>{set.weight + "lb "}</span>}
                              <span style={{ color:C.blue }}>{"×" + set.reps}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </Card>
                )}

                <Card>
                  <Lbl>Log Sets</Lbl>
                  {allExercises.map((exercise, i) => {
                    const logged = currentWorkout.find(e => e.name === exercise);
                    const isAdding = addingExercise === exercise;
                    return (
                      <div key={i} style={{ marginBottom:"10px", background:C.surfaceUp, borderRadius:C.rSm, padding:"14px", border:`1px solid ${logged ? C.accentBorder : C.border}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ fontSize:"14px", fontWeight:"600", color: logged ? C.accent : C.text }}>{exercise}</div>
                          <button onClick={() => setAddingExercise(isAdding ? null : exercise)} style={{ background:C.accentBg, border:`1px solid ${C.accentBorder}`, borderRadius:"16px", padding:"5px 12px", color:C.accent, cursor:"pointer", fontSize:"12px", fontWeight:"600", fontFamily:C.font }}>+ Set</button>
                        </div>
                        {logged && logged.sets.length > 0 && (
                          <div style={{ marginTop:"10px", display:"flex", gap:"6px", flexWrap:"wrap" }}>
                            {logged.sets.map((set,si) => (
                              <div key={si} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"5px 10px", display:"flex", alignItems:"center", gap:"8px" }}>
                                <span style={{ fontSize:"12px" }}>
                                  {set.weight > 0 && <span style={{ color:C.orange, fontWeight:"600" }}>{set.weight + "lb "}</span>}
                                  <span style={{ color:C.accent, fontWeight:"600" }}>{"×" + set.reps}</span>
                                </span>
                                <button onClick={() => removeSet(exercise, si)} style={{ background:"none", border:"none", color:C.textDim, cursor:"pointer", fontSize:"11px" }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {isAdding && (
                          <div style={{ marginTop:"12px", display:"flex", gap:"8px" }}>
                            <Inp type="number" placeholder="lbs" value={setInput.weight} onChange={e => setSetInput({...setInput, weight:e.target.value})} style={{ color:C.orange, textAlign:"center", padding:"10px" }} />
                            <Inp type="number" placeholder="reps" value={setInput.reps} onChange={e => setSetInput({...setInput, reps:e.target.value})} onKeyDown={e => e.key==="Enter" && addSet(exercise)} style={{ color:C.accent, textAlign:"center", padding:"10px" }} autoFocus />
                            <button onClick={() => addSet(exercise)} style={{ background:C.accent, border:"none", borderRadius:C.rSm, padding:"10px 16px", color:"#000", fontWeight:"700", cursor:"pointer", fontFamily:C.font, fontSize:"14px", flexShrink:0 }}>Log</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ display:"flex", gap:"8px", marginTop:"4px" }}>
                    <Inp placeholder="Add custom exercise..." value={customExercise} onChange={e => setCustomExercise(e.target.value)} onKeyDown={e => { if (e.key==="Enter" && customExercise.trim()) { setAddingExercise(customExercise); setCustomExercise(""); }}} />
                    <button onClick={() => { if (customExercise.trim()) { setAddingExercise(customExercise); setCustomExercise(""); }}} style={{ background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:C.rSm, padding:"12px 16px", color:C.textSub, cursor:"pointer", fontFamily:C.font, fontSize:"18px", flexShrink:0 }}>+</button>
                  </div>
                </Card>

                {currentWorkout.length > 0 && (
                  <button onClick={saveWorkout} style={{ width:"100%", background:C.accent, border:"none", borderRadius:C.r, padding:"16px", color:"#000", fontWeight:"700", fontSize:"15px", cursor:"pointer", fontFamily:C.font, marginBottom:"12px" }}>Save Workout</button>
                )}
              </div>
            )}

            {workoutSubTab === "history" && (
              <div>
                {!workoutHistory.length ? (
                  <Card style={{ textAlign:"center", padding:"48px 20px" }}>
                    <div style={{ fontSize:"36px", marginBottom:"12px" }}>💪</div>
                    <div style={{ fontSize:"15px", fontWeight:"600", marginBottom:"6px" }}>No workouts yet</div>
                    <div style={{ fontSize:"13px", color:C.textSub }}>Start logging to see history</div>
                  </Card>
                ) : workoutHistory.map((w,i) => (
                  <Card key={i} accent={C.accent}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"12px" }}>
                      <div>
                        <div style={{ fontSize:"15px", fontWeight:"700" }}>{w.workout_type}</div>
                        <div style={{ fontSize:"12px", color:C.textSub, marginTop:"3px" }}>{w.day_name + " · " + fmt(w.date)}</div>
                      </div>
                      <div style={{ fontSize:"12px", color:C.textSub }}>{(w.exercises||[]).length + " exercises"}</div>
                    </div>
                    {(w.exercises||[]).map((ex,ei) => (
                      <div key={ei} style={{ paddingTop:"10px", borderTop:`1px solid ${C.border}` }}>
                        <div style={{ fontSize:"13px", fontWeight:"600", marginBottom:"6px" }}>{ex.name}</div>
                        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                          {(ex.sets||[]).map((set,si) => (
                            <span key={si} style={{ background:C.surfaceUp, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"4px 10px", fontSize:"12px" }}>
                              {set.weight > 0 && <span style={{ color:C.orange, fontWeight:"600" }}>{set.weight + "lb "}</span>}
                              <span style={{ color:C.accent, fontWeight:"600" }}>{"×" + set.reps}</span>
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

        {tab === "history" && (
          <div>
            <div style={{ display:"flex", gap:"6px", marginBottom:"16px", overflowX:"auto", paddingBottom:"4px" }}>
              {[["overview","Overview"],["days","Past Days"],["weight","Weight"],["workouts","Workouts"]].map(([key,label]) => (
                <PillBtn key={key} onClick={() => { setHistoryTab(key); setSelectedPastDay(null); }} active={historyTab===key}>{label}</PillBtn>
              ))}
            </div>

            {historyTab === "overview" && (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"12px" }}>
                  {[{icon:"🔥",label:"Nutrition",value:nutritionStreak+"d",color:C.orange},{icon:"💪",label:"Gym",value:gymStreak+"d",color:C.accent},{icon:"💊",label:"Supplements",value:suppStreak+"d",color:C.purple}].map(({icon,label,value,color}) => (
                    <div key={label} style={{ background:C.surface, borderRadius:C.r, padding:"14px 10px", border:`1px solid ${color}25`, textAlign:"center" }}>
                      <div style={{ fontSize:"20px", marginBottom:"6px" }}>{icon}</div>
                      <div style={{ fontSize:"20px", fontWeight:"700", color, marginBottom:"3px" }}>{value}</div>
                      <div style={{ fontSize:"10px", color:C.textSub }}>{label + " streak"}</div>
                    </div>
                  ))}
                </div>
                {(() => {
                  const l30 = history.slice(0,30), gym = getAttendance(l30,"gym"), mma = getAttendance(l30,"mma");
                  return (
                    <Card accent={C.accent}>
                      <Lbl>Workout Attendance · 30 Days</Lbl>
                      <div style={{ display:"flex", gap:"8px", marginBottom:"14px" }}>
                        {[{label:"Gym",data:gym,color:C.accent},{label:"MMA",data:mma,color:C.orange}].map(({label,data,color}) => (
                          <div key={label} style={{ flex:1, background:C.surfaceUp, borderRadius:C.rSm, padding:"12px", border:`1px solid ${color}25` }}>
                            <div style={{ fontSize:"11px", color:C.textSub, marginBottom:"6px" }}>{label}</div>
                            <div style={{ fontSize:"22px", fontWeight:"700", color, marginBottom:"2px" }}>{data.hit + "/" + data.total}</div>
                            <div style={{ height:"3px", background:C.border, borderRadius:"2px", margin:"8px 0 5px" }}>
                              <div style={{ height:"100%", width:data.rate+"%", background:color, borderRadius:"2px" }} />
                            </div>
                            <div style={{ fontSize:"11px", color, fontWeight:"600" }}>{data.rate + "%"}</div>
                          </div>
                        ))}
                      </div>
                      {gym.missed.length > 0 && <div style={{ marginBottom:"10px" }}><div style={{ fontSize:"11px", color:C.textSub, marginBottom:"8px" }}>MISSED GYM</div><div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>{gym.missed.slice(0,6).map((d,i) => <span key={i} style={{ background:C.red+"10", border:`1px solid ${C.red}25`, borderRadius:"8px", padding:"4px 10px", fontSize:"11px", color:C.red }}>{getDayName(d).slice(0,3) + " " + fmt(d)}</span>)}</div></div>}
                      {gym.attended.length > 0 && <div><div style={{ fontSize:"11px", color:C.textSub, marginBottom:"8px" }}>COMPLETED GYM</div><div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>{gym.attended.slice(0,6).map((d,i) => <span key={i} style={{ background:C.accentBg, border:`1px solid ${C.accentBorder}`, borderRadius:"8px", padding:"4px 10px", fontSize:"11px", color:C.accent }}>{getDayName(d).slice(0,3) + " " + fmt(d)}</span>)}</div></div>}
                    </Card>
                  );
                })()}
                <Card accent={C.red}>
                  <Lbl color={C.textSub}>Calories · 30 Days</Lbl>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={[...history].sort((a,b)=>a.date.localeCompare(b.date)).slice(-30).map(d=>({date:fmt(d.date),cal:d.calories||0}))}>
                      <XAxis dataKey="date" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false}/>
                      <YAxis hide domain={[0,4000]}/>
                      <Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",color:C.text,fontSize:"11px"}}/>
                      <ReferenceLine y={goals.calories} stroke={C.red+"44"} strokeDasharray="4 4"/>
                      <Line type="monotone" dataKey="cal" stroke={C.red} strokeWidth={2} dot={false} activeDot={{r:4}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <Card accent={C.blue}>
                  <Lbl color={C.textSub}>Protein · 30 Days</Lbl>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={[...history].sort((a,b)=>a.date.localeCompare(b.date)).slice(-30).map(d=>({date:fmt(d.date),prot:d.protein||0}))}>
                      <XAxis dataKey="date" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false}/>
                      <YAxis hide domain={[0,200]}/>
                      <Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",color:C.text,fontSize:"11px"}}/>
                      <ReferenceLine y={goals.protein} stroke={C.blue+"44"} strokeDasharray="4 4"/>
                      <Line type="monotone" dataKey="prot" stroke={C.blue} strokeWidth={2} dot={false} activeDot={{r:4}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}

            {historyTab === "days" && (
              <div>
                {selectedPastDay ? (() => {
                  const d = history.find(h => h.date === selectedPastDay);
                  if (!d) return null;
                  const dw = workoutHistory.filter(w => w.date === selectedPastDay);
                  return (
                    <div>
                      <button onClick={() => setSelectedPastDay(null)} style={{ background:"none", border:"none", color:C.accent, cursor:"pointer", fontFamily:C.font, fontSize:"14px", fontWeight:"600", marginBottom:"16px", padding:"0" }}>← Back</button>
                      <Card>
                        <div style={{ fontSize:"18px", fontWeight:"700", marginBottom:"4px" }}>{getDayName(d.date)}</div>
                        <div style={{ fontSize:"13px", color:C.textSub, marginBottom:"16px" }}>{fmt(d.date)}</div>
                        {[{label:"Calories",value:(d.calories||0)+" / "+goals.calories,color:C.red,pct:Math.min((d.calories||0)/goals.calories*100,100)},
                          {label:"Protein",value:(d.protein||0)+"g / "+goals.protein+"g",color:C.blue,pct:Math.min((d.protein||0)/goals.protein*100,100)},
                          {label:"Water",value:(d.water||0)+"oz / "+goals.water+"oz",color:"#4CD5FF",pct:Math.min((d.water||0)/goals.water*100,100)}
                        ].map(({label,value,color,pct}) => (
                          <div key={label} style={{ marginBottom:"14px" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                              <span style={{ fontSize:"13px", color:C.textSub }}>{label}</span>
                              <span style={{ fontSize:"13px", color, fontWeight:"600" }}>{value}</span>
                            </div>
                            <div style={{ height:"4px", background:C.surfaceUp, borderRadius:"2px" }}>
                              <div style={{ height:"100%", width:pct+"%", background:color, borderRadius:"2px" }} />
                            </div>
                          </div>
                        ))}
                        {d.weight && <div style={{ fontSize:"13px", color:C.textSub, marginTop:"8px" }}>Weight: <span style={{ color:C.orange, fontWeight:"600" }}>{d.weight} lbs</span></div>}
                        {(d.supplements||[]).length > 0 && <div style={{ marginTop:"10px" }}><div style={{ fontSize:"11px", color:C.textSub, marginBottom:"6px" }}>SUPPLEMENTS</div><div style={{ display:"flex", gap:"6px" }}>{(d.supplements||[]).map(s => <span key={s} style={{ background:C.accentBg, border:`1px solid ${C.accentBorder}`, borderRadius:"8px", padding:"4px 10px", fontSize:"12px", color:C.accent }}>{s}</span>)}</div></div>}
                      </Card>
                      {(d.completed_workouts||[]).length > 0 && <Card accent={C.accent}><Lbl>Training Completed</Lbl>{(d.completed_workouts||[]).map((w,i) => <div key={i} style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}`, fontSize:"13px" }}>{w}</div>)}</Card>}
                      {dw.map((w,i) => (
                        <Card key={i} accent={C.accent}>
                          <div style={{ fontSize:"15px", fontWeight:"700", marginBottom:"4px" }}>{w.workout_type}</div>
                          <div style={{ fontSize:"12px", color:C.textSub, marginBottom:"12px" }}>Logged workout</div>
                          {(w.exercises||[]).map((ex,ei) => (
                            <div key={ei} style={{ paddingTop:"8px", borderTop:`1px solid ${C.border}` }}>
                              <div style={{ fontSize:"13px", fontWeight:"600", marginBottom:"6px" }}>{ex.name}</div>
                              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                                {(ex.sets||[]).map((set,si) => <span key={si} style={{ background:C.surfaceUp, borderRadius:"6px", padding:"3px 8px", fontSize:"12px" }}>{set.weight > 0 && <span style={{ color:C.orange }}>{set.weight + "lb "}</span>}<span style={{ color:C.accent }}>{"×" + set.reps}</span></span>)}
                              </div>
                            </div>
                          ))}
                        </Card>
                      ))}
                    </div>
                  );
                })() : (
                  <div>
                    {history.slice(0,60).map((d,i) => {
                      const calOk = (d.calories||0) >= goals.calories*0.85, protOk = (d.protein||0) >= goals.protein*0.85;
                      return <div key={i} onClick={() => setSelectedPastDay(d.date)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:C.surface, borderRadius:C.rSm, marginBottom:"6px", border:`1px solid ${C.border}`, cursor:"pointer" }}>
                        <div>
                          <div style={{ fontSize:"14px", fontWeight:"600" }}>{getDayName(d.date)}</div>
                          <div style={{ fontSize:"11px", color:C.textSub, marginTop:"2px" }}>{fmt(d.date)}</div>
                        </div>
                        <div style={{ textAlign:"right", fontSize:"12px" }}>
                          <span style={{ color: calOk ? C.red : C.textDim, fontWeight: calOk ? "600":"400" }}>{(d.calories||0) + " cal"}</span>
                          <span style={{ color:C.textDim }}> · </span>
                          <span style={{ color: protOk ? C.blue : C.textDim, fontWeight: protOk ? "600":"400" }}>{(d.protein||0) + "g"}</span>
                          {d.weight && <div style={{ color:C.orange, fontSize:"11px" }}>{d.weight + " lbs"}</div>}
                        </div>
                        <div style={{ marginLeft:"10px", fontSize:"14px" }}>{calOk && protOk ? "✅" : "⭕"}</div>
                      </div>;
                    })}
                  </div>
                )}
              </div>
            )}

            {historyTab === "weight" && (
              <div>
                <Card>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
                    <div><div style={{ fontSize:"13px", color:C.textSub, marginBottom:"4px" }}>Current</div><div style={{ fontSize:"28px", fontWeight:"700", color:C.orange }}>{currentWeight + " lbs"}</div></div>
                    <div style={{ textAlign:"right" }}><div style={{ fontSize:"13px", color:C.textSub, marginBottom:"4px" }}>Goal</div><div style={{ fontSize:"28px", fontWeight:"700", color:C.accent }}>{goals.weightGoal + " lbs"}</div></div>
                  </div>
                  <div style={{ marginBottom:"8px", display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:"12px", color:C.textSub }}>Progress to goal</span>
                    <span style={{ fontSize:"12px", color:C.orange, fontWeight:"600" }}>{Math.max(0, goals.weightGoal - currentWeight).toFixed(1) + " lbs to go"}</span>
                  </div>
                  <div style={{ height:"8px", background:C.surfaceUp, borderRadius:"4px", marginBottom:"16px" }}>
                    <div style={{ height:"100%", width: Math.max(0, Math.min(weightPct,100))+"%", background:`linear-gradient(90deg, ${C.orange}, ${C.accent})`, borderRadius:"4px", transition:"width 0.5s" }} />
                  </div>
                  {weightData.length > 1 && (
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <div style={{ textAlign:"center" }}><div style={{ fontSize:"11px", color:C.textSub }}>Start</div><div style={{ fontSize:"15px", fontWeight:"700", color:C.orange }}>{weightData[0]?.weight + " lbs"}</div></div>
                      <div style={{ textAlign:"center" }}><div style={{ fontSize:"11px", color:C.textSub }}>Gained</div><div style={{ fontSize:"15px", fontWeight:"700", color:(currentWeight-startWeight)>=0 ? C.accent : C.red }}>{((currentWeight-startWeight)>=0?"+":"") + (currentWeight-startWeight).toFixed(1) + " lbs"}</div></div>
                      <div style={{ textAlign:"center" }}><div style={{ fontSize:"11px", color:C.textSub }}>Entries</div><div style={{ fontSize:"15px", fontWeight:"700", color:C.blue }}>{weightData.length}</div></div>
                    </div>
                  )}
                </Card>
                {weightData.length > 1 && (
                  <Card accent={C.orange}>
                    <Lbl color={C.textSub}>Weight Journey</Lbl>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={weightData}>
                        <XAxis dataKey="date" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false}/>
                        <YAxis hide domain={["auto","auto"]}/>
                        <Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",color:C.text,fontSize:"11px"}} formatter={v=>[v+" lbs","Weight"]}/>
                        <ReferenceLine y={goals.weightGoal} stroke={C.accent+"66"} strokeDasharray="4 4" label={{value:"Goal "+goals.weightGoal,fill:C.accent,fontSize:10}}/>
                        <Line type="monotone" dataKey="weight" stroke={C.orange} strokeWidth={2.5} dot={{fill:C.orange,r:4}} activeDot={{r:6}}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}
                {weightData.length === 0 && <Card style={{ textAlign:"center", padding:"48px 20px" }}><div style={{ fontSize:"36px", marginBottom:"12px" }}>⚖️</div><div style={{ fontSize:"15px", fontWeight:"600", marginBottom:"6px" }}>No weight logged yet</div><div style={{ fontSize:"13px", color:C.textSub }}>Log your weight on the Today tab</div></Card>}
              </div>
            )}

            {historyTab === "workouts" && (() => {
              const l7 = history.slice(0,7), l30 = history.slice(0,30);
              const g7 = getAttendance(l7,"gym"), g30 = getAttendance(l30,"gym");
              const m7 = getAttendance(l7,"mma"), m30 = getAttendance(l30,"mma");
              return (
                <div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"12px" }}>
                    {[{label:"Gym Hit (7d)",value:g7.hit+"/"+g7.total,sub:g7.rate+"% attendance",color:C.accent},{label:"Gym Missed (7d)",value:g7.total-g7.hit,sub:"this week",color:C.red},{label:"MMA Hit (7d)",value:m7.hit+"/"+m7.total,sub:m7.rate+"% attendance",color:C.orange},{label:"MMA Missed (7d)",value:m7.total-m7.hit,sub:"this week",color:C.red}].map(({label,value,sub,color}) => (
                      <div key={label} style={{ background:C.surface, borderRadius:C.r, padding:"14px", border:`1px solid ${color}25` }}>
                        <div style={{ fontSize:"11px", color:C.textSub, marginBottom:"6px" }}>{label}</div>
                        <div style={{ fontSize:"24px", fontWeight:"700", color, marginBottom:"3px" }}>{value}</div>
                        <div style={{ fontSize:"11px", color:C.textDim }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  <Card><Lbl>Gym Streak</Lbl><div style={{ fontSize:"32px", fontWeight:"700", color:C.accent, marginBottom:"6px" }}>{gymStreak + " sessions"}</div><div style={{ fontSize:"13px", color:C.textSub }}>consecutive gym days completed</div></Card>
                  {g30.missed.length > 0 && (
                    <Card accent={C.red}>
                      <Lbl color={C.red}>Missed Gym · 30 Days</Lbl>
                      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                        {g30.missed.map((d,i) => <span key={i} style={{ background:C.red+"10", border:`1px solid ${C.red}25`, borderRadius:"8px", padding:"5px 10px", fontSize:"12px", color:C.red }}>{getDayName(d).slice(0,3) + " " + fmt(d)}</span>)}
                      </div>
                    </Card>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {tab === "week" && (() => {
          const wd = getWeekDays(), score = getWeeklyScore(wd);
          const { grade, color: gc } = gradeWeek(score);
          const ga = getAttendance(wd,"gym"), ma = getAttendance(wd,"mma");
          const ac = wd.length ? Math.round(wd.reduce((s,d)=>s+(d.calories||0),0)/wd.length) : 0;
          const ap = wd.length ? Math.round(wd.reduce((s,d)=>s+(d.protein||0),0)/wd.length) : 0;
          const aw = wd.length ? Math.round(wd.reduce((s,d)=>s+(d.water||0),0)/wd.length) : 0;
          const sd = wd.filter(d=>SUPPLEMENTS.every(s=>(d.supplements||[]).includes(s))).length;
          const ww = wd.filter(d=>d.weight).map(d=>d.weight);
          const wc = ww.length >= 2 ? (ww.at(-1)-ww[0]).toFixed(1) : null;
          const isComplete = new Date().getDay() === 0;
          return (
            <div>
              <Card style={{ textAlign:"center", padding:"28px 18px" }}>
                <div style={{ fontSize:"12px", color:C.textSub, marginBottom:"12px", letterSpacing:"1px" }}>{isComplete ? "THIS WEEK - FINAL" : "THIS WEEK - " + wd.length + "/7 DAYS LOGGED"}</div>
                <div style={{ fontSize:"80px", fontWeight:"700", color:gc, lineHeight:1, marginBottom:"8px" }}>{grade}</div>
                <div style={{ fontSize:"16px", fontWeight:"600", color:gc, marginBottom:"4px" }}>{score + "/100"}</div>
                <div style={{ fontSize:"13px", color:C.textSub }}>{score>=90?"Crushing it this week 🔥":score>=75?"Solid week, keep pushing":score>=60?"Decent week, room to improve":score>=40?"Tough week, get back on track":"Rough week - fresh start tomorrow"}</div>
              </Card>

              <Card accent={C.accent}>
                <Lbl>Nutrition</Lbl>
                {[{label:"Avg Calories",value:ac,goal:goals.calories,color:C.red,unit:""},
                  {label:"Avg Protein",value:ap+"g",goal:goals.protein,color:C.blue,unit:"g",raw:ap},
                  {label:"Avg Water",value:aw+"oz",goal:goals.water,color:"#4CD5FF",unit:"oz",raw:aw}
                ].map(({label,value,goal,color,unit,raw}) => {
                  const pct = Math.min(((raw??ac)/goal)*100,100);
                  return (
                    <div key={label} style={{ marginBottom:"14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                        <span style={{ fontSize:"13px", color:C.textSub }}>{label}</span>
                        <span style={{ fontSize:"13px", color, fontWeight:"600" }}>{value + " "}<span style={{ color:C.textDim, fontWeight:"400" }}>{"/ " + goal + unit}</span></span>
                      </div>
                      <div style={{ height:"4px", background:C.surfaceUp, borderRadius:"2px" }}>
                        <div style={{ height:"100%", width:pct+"%", background:color, borderRadius:"2px" }} />
                      </div>
                    </div>
                  );
                })}
              </Card>

              <Card accent={C.orange}>
                <Lbl>Training</Lbl>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"12px" }}>
                  {[{label:"Gym",hit:ga.hit,total:ga.total,color:C.accent},{label:"MMA",hit:ma.hit,total:ma.total,color:C.orange}].map(({label,hit,total,color}) => (
                    <div key={label} style={{ background:C.surfaceUp, borderRadius:C.rSm, padding:"12px", border:`1px solid ${color}25` }}>
                      <div style={{ fontSize:"11px", color:C.textSub, marginBottom:"6px" }}>{label}</div>
                      <div style={{ fontSize:"22px", fontWeight:"700", color, marginBottom:"4px" }}>{hit+"/"+total}</div>
                      <div style={{ height:"3px", background:C.border, borderRadius:"2px" }}><div style={{ height:"100%", width: total>0?(hit/total)*100+"%":"0%", background:color, borderRadius:"2px" }} /></div>
                    </div>
                  ))}
                </div>
                {ga.missed.length > 0 && <div style={{ padding:"10px 12px", background:C.red+"08", borderRadius:C.rSm, fontSize:"13px", color:C.red, marginBottom:"8px" }}>{"Missed gym: " + ga.missed.map(d=>getDayName(d).slice(0,3)+" "+fmt(d)).join(", ")}</div>}
                {ga.attended.length > 0 && <div style={{ padding:"10px 12px", background:C.accentBg, borderRadius:C.rSm, fontSize:"13px", color:C.accent }}>{"Hit gym: " + ga.attended.map(d=>getDayName(d).slice(0,3)).join(", ")}</div>}
              </Card>

              <Card accent={C.purple}>
                <Lbl>Supplements</Lbl>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:"28px", fontWeight:"700", color:C.purple, marginBottom:"4px" }}>{sd+"/"+wd.length}</div>
                    <div style={{ fontSize:"13px", color:C.textSub }}>days both taken</div>
                  </div>
                  <div style={{ fontSize:"36px" }}>{sd===wd.length && wd.length>0 ? "💊✅" : "💊"}</div>
                </div>
                <div style={{ height:"4px", background:C.surfaceUp, borderRadius:"2px", marginTop:"12px" }}>
                  <div style={{ height:"100%", width: wd.length>0?(sd/wd.length)*100+"%":"0%", background:C.purple, borderRadius:"2px" }} />
                </div>
              </Card>

              <Card accent={C.orange}>
                <Lbl>Weight This Week</Lbl>
                {wc !== null ? (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:"28px", fontWeight:"700", color: parseFloat(wc)>=0 ? C.accent : C.red }}>{(parseFloat(wc)>=0?"+":"")+wc+" lbs"}</div>
                      <div style={{ fontSize:"13px", color:C.textSub, marginTop:"4px" }}>this week</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:"13px", color:C.textSub }}>Total gained</div>
                      <div style={{ fontSize:"18px", fontWeight:"700", color:C.orange }}>{"+" + Math.max(0,currentWeight-startWeight).toFixed(1) + " lbs"}</div>
                    </div>
                  </div>
                ) : <div style={{ fontSize:"13px", color:C.textSub }}>Log weight at least twice this week to see change</div>}
              </Card>

              <Card>
                <Lbl>Streaks</Lbl>
                <div style={{ display:"flex", gap:"8px" }}>
                  {[{icon:"🔥",label:"Nutrition",value:nutritionStreak,color:C.orange},{icon:"💪",label:"Gym",value:gymStreak,color:C.accent},{icon:"💊",label:"Supplements",value:suppStreak,color:C.purple}].map(({icon,label,value,color}) => (
                    <div key={label} style={{ flex:1, textAlign:"center", background:C.surfaceUp, borderRadius:C.rSm, padding:"12px 8px", border:`1px solid ${color}20` }}>
                      <div style={{ fontSize:"18px", marginBottom:"6px" }}>{icon}</div>
                      <div style={{ fontSize:"20px", fontWeight:"700", color, marginBottom:"3px" }}>{value+"d"}</div>
                      <div style={{ fontSize:"10px", color:C.textSub }}>{label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          );
        })()}

        {tab === "schedule" && (
          <div>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"16px" }}>
              {DAYS.map(day => {
                const isSel = selectedDay===day, isToday = day===today;
                return <button key={day} onClick={() => setSelectedDay(day)} style={{ background: isSel ? C.accent : isToday ? C.accentBg : C.surface, border:`1px solid ${isSel ? C.accent : isToday ? C.accentBorder : C.border}`, borderRadius:"20px", padding:"7px 12px", cursor:"pointer", color: isSel ? "#000" : isToday ? C.accent : C.textSub, fontSize:"12px", fontWeight:"600", fontFamily:C.font }}>
                  {day.slice(0,3)}{isToday && !isSel ? " ●" : ""}
                </button>;
              })}
            </div>
            <Card>
              <div style={{ fontSize:"18px", fontWeight:"700", marginBottom:"4px" }}>{selectedDay}{selectedDay===today && <span style={{ fontSize:"11px", color:C.accent, marginLeft:"8px" }}>TODAY</span>}</div>
              {SCHEDULE[selectedDay] ? (
                <div style={{ marginTop:"14px" }}>
                  {SCHEDULE[selectedDay].map((item,i) => (
                    <div key={i} style={{ padding:"13px", borderRadius:C.rSm, marginBottom:"8px", background:C.surfaceUp, borderLeft:`3px solid ${TYPE_COLORS[item.type]}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <div style={{ fontSize:"14px", fontWeight:"600" }}>{item.activity}</div>
                        <div style={{ fontSize:"10px", fontWeight:"700", color:TYPE_COLORS[item.type], background:TYPE_COLORS[item.type]+"15", padding:"3px 8px", borderRadius:"10px" }}>{TYPE_LABELS[item.type]}</div>
                      </div>
                      <div style={{ fontSize:"12px", color:C.textSub, marginTop:"4px" }}>{item.time}</div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ textAlign:"center", padding:"36px 20px" }}><div style={{ fontSize:"32px", marginBottom:"10px" }}>💤</div><div style={{ fontSize:"15px", fontWeight:"600", color:C.textSub }}>Rest Day</div><div style={{ fontSize:"12px", color:C.textDim, marginTop:"4px" }}>Recovery is where growth happens</div></div>}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
