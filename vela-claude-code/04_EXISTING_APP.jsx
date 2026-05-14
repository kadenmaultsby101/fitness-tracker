import { useState, useRef, useEffect } from "react";

const ACCOUNTS = [
  { id:1, name:"Chase Checking", inst:"Chase", type:"bank", balance:4280.52, change:+120.40 },
  { id:2, name:"Chase Savings", inst:"Chase", type:"bank", balance:12450.00, change:+500.00 },
  { id:3, name:"Robinhood", inst:"Robinhood", type:"invest", balance:8930.44, change:+342.10 },
  { id:4, name:"Fidelity 401k", inst:"Fidelity", type:"invest", balance:22100.00, change:+890.00 },
  { id:5, name:"Schwab Brokerage", inst:"Schwab", type:"invest", balance:15600.75, change:-120.30 },
  { id:6, name:"Schwab Checking", inst:"Schwab", type:"bank", balance:3100.00, change:0 },
];

const TXNS = [
  { id:1, name:"Whole Foods", cat:"Groceries", amount:-84.32, date:"Today", emoji:"🛒" },
  { id:2, name:"Robinhood Deposit", cat:"Investment", amount:+500.00, date:"Yesterday", emoji:"📈" },
  { id:3, name:"Netflix", cat:"Subscriptions", amount:-17.99, date:"May 8", emoji:"📺" },
  { id:4, name:"Shell Gas", cat:"Transport", amount:-62.10, date:"May 7", emoji:"⛽" },
  { id:5, name:"Law Firm Paycheck", cat:"Income", amount:+1840.00, date:"May 5", emoji:"💼" },
  { id:6, name:"Nike.com", cat:"Shopping", amount:-129.99, date:"May 4", emoji:"👟" },
  { id:7, name:"Chipotle", cat:"Dining", amount:-18.45, date:"May 3", emoji:"🌯" },
  { id:8, name:"Amazon", cat:"Shopping", amount:-67.32, date:"May 1", emoji:"📦" },
  { id:9, name:"Internship Pay", cat:"Income", amount:+3200.00, date:"Apr 30", emoji:"🏢" },
  { id:10, name:"PG&E Utilities", cat:"Bills", amount:-124.00, date:"Apr 29", emoji:"💡" },
];

const BUDGET = [
  { cat:"Housing", spent:1200, limit:1200 },
  { cat:"Food & Dining", spent:380, limit:500 },
  { cat:"Transport", spent:210, limit:250 },
  { cat:"Shopping", spent:340, limit:300 },
  { cat:"Subscriptions", spent:87, limit:100 },
  { cat:"Entertainment", spent:45, limit:150 },
  { cat:"Bills", spent:124, limit:150 },
];

const GOALS = [
  { name:"Emergency Fund", current:12450, target:15000, emoji:"🛡️", monthly:500 },
  { name:"Roth IRA 2025", current:4200, target:7000, emoji:"🌱", monthly:350 },
  { name:"FHA Down Payment", current:18200, target:80000, emoji:"🏠", monthly:800 },
  { name:"Brokerage Growth", current:24531, target:50000, emoji:"📊", monthly:600 },
];

const BANKS = [
  { id:"chase", name:"Chase", emoji:"🏦", connected:true },
  { id:"boa", name:"Bank of America", emoji:"🏛️", connected:false },
  { id:"wells", name:"Wells Fargo", emoji:"🏗️", connected:false },
  { id:"schwab", name:"Schwab", emoji:"📊", connected:true },
  { id:"fidelity", name:"Fidelity", emoji:"📈", connected:true },
  { id:"robinhood", name:"Robinhood", emoji:"🐦", connected:true },
  { id:"sofi", name:"SoFi", emoji:"✨", connected:false },
  { id:"ally", name:"Ally Bank", emoji:"🤝", connected:false },
  { id:"amex", name:"Amex", emoji:"💳", connected:false },
  { id:"capital", name:"Capital One", emoji:"💰", connected:false },
  { id:"coinbase", name:"Coinbase", emoji:"₿", connected:false },
  { id:"vanguard", name:"Vanguard", emoji:"🏔️", connected:false },
];

const NW = ACCOUNTS.reduce((s,a) => s+a.balance, 0);
const money = (n,dec=0) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:dec}).format(n);
const moneyAbs = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Math.abs(n));

const SAGE_SYSTEM = `You are Sage, the AI financial coach inside Vela — a premium personal finance app. You're talking with Kaden, 18, Oakland CA. He works at his uncle's law firm, has a high-paying summer internship coming, runs a fintech startup called Seed Swipe, and plans to start valet work. Net worth ~$66,461 across 6 accounts. Big goals: max Roth IRA, FHA loan for Oakland fourplex, retire at 45. Be sharp, direct, specific. Use real numbers. **Bold** key points. Keep it concise — 2-3 short paragraphs max.`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#070707;--c1:#0e0e0e;--c2:#161616;--c3:#1f1f1f;--c4:#282828;
  --b1:rgba(255,255,255,0.06);--b2:rgba(255,255,255,0.12);--b3:rgba(255,255,255,0.2);
  --t1:#f0f0f0;--t2:#888;--t3:#444;
  --green:#9febb8;--red:#eb9f9f;--gold:#ebd49f;
  --serif:'Cormorant Garamond',serif;--mono:'DM Mono',monospace;
}
html,body,#root{width:100%;height:100%;background:var(--bg);overflow:hidden}
body{font-family:var(--mono);color:var(--t1);-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:0}

.app{
  position:fixed;inset:0;
  display:flex;flex-direction:column;
  width:100%;height:100%;
}

.pages{flex:1;overflow:hidden;position:relative;min-height:0}

.page{
  position:absolute;inset:0;
  overflow-y:auto;overflow-x:hidden;
  -webkit-overflow-scrolling:touch;
  padding-bottom:20px;
  opacity:0;pointer-events:none;
  transform:translateY(10px);
  transition:opacity .22s ease,transform .22s ease;
}
.page.on{opacity:1;pointer-events:all;transform:translateY(0)}

/* coach page has its own internal layout */
.page.coach-page{padding-bottom:0;display:flex;flex-direction:column}

.bnav{
  height:60px;min-height:60px;
  background:var(--c1);border-top:1px solid var(--b1);
  display:flex;align-items:stretch;
  flex-shrink:0;z-index:100;
}
.bn{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;cursor:pointer;transition:all .15s;
  border-top:2px solid transparent;
}
.bn.on{border-top-color:var(--t1)}
.bn-ic{font-size:16px;line-height:1}
.bn-lbl{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);transition:color .15s}
.bn.on .bn-lbl{color:var(--t1)}

/* PAGE HEADER */
.ph{
  padding:18px 18px 14px;
  border-bottom:1px solid var(--b1);
  background:var(--bg);
  position:sticky;top:0;z-index:5;
}
.ph-t{font-family:var(--serif);font-size:30px;font-weight:300;letter-spacing:-1px;line-height:1}
.ph-s{font-size:9px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin-top:4px}

/* CARD */
.card{background:var(--c1);border:1px solid var(--b1);margin:10px 14px;padding:18px}
.ctitle{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--t3);margin-bottom:14px}

/* NET WORTH */
.nw{
  background:var(--c1);border:1px solid var(--b1);
  margin:10px 14px;padding:24px 20px;
  position:relative;overflow:hidden;
}
.nw::before{
  content:'';position:absolute;right:-30px;top:-30px;
  width:150px;height:150px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.025) 0%,transparent 70%);
  pointer-events:none;
}
.nw-lbl{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--t3);margin-bottom:8px}
.nw-amt{font-family:var(--serif);font-size:46px;font-weight:300;letter-spacing:-2px;line-height:1}
.nw-row{display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap}
.nw-up{font-size:12px;color:var(--green)}
.nw-pct{font-size:9px;color:var(--t3)}

/* ACCOUNTS SCROLL */
.acc-scr{display:flex;gap:10px;padding:4px 14px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.am{background:var(--c1);border:1px solid var(--b1);padding:14px 12px;min-width:120px;flex-shrink:0}
.am-inst{font-size:8px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
.am-nm{font-size:9px;color:var(--t2);margin-bottom:6px}
.am-bal{font-family:var(--serif);font-size:18px;font-weight:300;letter-spacing:-.5px}
.am-chg{font-size:9px;margin-top:2px}

/* AI BANNER */
.aib{
  background:var(--c1);border:1px solid var(--b2);
  margin:0 14px 4px;padding:14px 16px;
  position:relative;overflow:hidden;
}
.aib::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(159,235,184,.04) 0%,transparent 60%);pointer-events:none}
.ai-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border:1px solid var(--b2);font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:9px}
.ai-dot{width:4px;height:4px;background:var(--green);border-radius:50%;animation:bl 2s infinite}
@keyframes bl{0%,100%{opacity:1}50%{opacity:.2}}
.ai-txt{font-size:11px;line-height:1.8;color:var(--t2)}
.ai-txt strong{color:var(--t1)}
.ai-more{margin-top:9px;font-size:8px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;cursor:pointer}

/* TXN */
.txn{display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--b1)}
.txn:last-child{border-bottom:none}
.txn-em{width:34px;height:34px;background:var(--c2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.txn-nm{font-size:12px}
.txn-ct{font-size:8px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px}
.txn-r{margin-left:auto;text-align:right;flex-shrink:0}
.txn-amt{font-size:12px}
.txn-dt{font-size:8px;color:var(--t3);margin-top:2px}

/* BUDGET */
.br{margin-bottom:14px}
.br:last-child{margin-bottom:0}
.br-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
.br-cat{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t2)}
.br-nums{font-size:9px}
.br-track{height:2px;background:var(--c3)}
.br-fill{height:2px;transition:width .8s ease}

.bsum{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--b1)}
.bsum:last-child{border-bottom:none}
.bsl{font-size:10px;color:var(--t2)}
.bsv{font-size:11px}

/* GOALS */
.gc{background:var(--c1);border:1px solid var(--b1);margin:0 14px 10px;padding:18px}
.gc-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.gc-nm{font-size:13px;letter-spacing:-.2px;margin-bottom:2px}
.gc-ds{font-size:8px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase}
.gc-pct{font-family:var(--serif);font-size:30px;font-weight:300;letter-spacing:-1px;color:var(--t2)}
.gc-track{height:1px;background:var(--c3);margin:10px 0 5px}
.gc-fill{height:1px;background:var(--t1);transition:width .9s}
.gc-row{display:flex;justify-content:space-between;align-items:baseline}
.gc-cur{font-size:12px}
.gc-tgt{font-size:9px;color:var(--t3)}
.gc-mo{font-size:9px;color:var(--t3);margin-top:8px;padding-top:8px;border-top:1px solid var(--b1)}

/* INSIGHTS */
.ic{background:var(--c1);border:1px solid var(--b1);margin:0 14px 10px;padding:18px}
.ic-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.ic-val{font-family:var(--serif);font-size:26px;font-weight:300;letter-spacing:-.5px}
.ic-lbl{font-size:8px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin-top:2px}
.ic-em{font-size:20px}
.ic-desc{font-size:11px;color:var(--t2);line-height:1.8}
.ic-tag{display:inline-block;margin-top:9px;padding:3px 9px;font-size:8px;letter-spacing:2px;text-transform:uppercase}
.good{color:var(--green);background:rgba(159,235,184,.1)}
.warn{color:var(--red);background:rgba(235,159,159,.1)}
.info{color:var(--gold);background:rgba(235,212,159,.1)}

/* BANKS */
.bank-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:0 14px}
.bt{background:var(--c1);border:1px solid var(--b1);padding:14px;cursor:pointer;transition:all .2s;text-align:center}
.bt.on{border-color:rgba(159,235,184,.35);background:rgba(159,235,184,.04)}
.bt-em{font-size:22px;margin-bottom:6px}
.bt-nm{font-size:10px;margin-bottom:4px}
.bt-st{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;padding:2px 8px;display:inline-block}
.bt-st.on{color:var(--green);background:rgba(159,235,184,.1)}
.bt-st.off{color:var(--t3);background:var(--c3)}

/* SETTINGS */
.sr{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--b1)}
.sr:last-child{border-bottom:none}
.sr-l{font-size:12px}
.sr-s{font-size:9px;color:var(--t3);margin-top:2px}
.tog{width:36px;height:20px;background:var(--c3);border:1px solid var(--b2);border-radius:10px;position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
.tog.on{background:rgba(159,235,184,.25);border-color:rgba(159,235,184,.4)}
.tok{width:14px;height:14px;background:var(--t3);border-radius:50%;position:absolute;top:2px;left:2px;transition:all .2s}
.tog.on .tok{left:18px;background:var(--green)}

/* COACH */
.coach-hd{padding:14px 18px;border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:12px;background:var(--bg);flex-shrink:0}
.coach-av{width:32px;height:32px;background:var(--t1);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.coach-nm{font-size:12px}
.coach-st{font-size:8px;color:var(--green);letter-spacing:2px;text-transform:uppercase;margin-top:2px}
.chips{display:flex;gap:8px;padding:9px 14px;border-bottom:1px solid var(--b1);overflow-x:auto;-webkit-overflow-scrolling:touch;flex-shrink:0}
.chip{white-space:nowrap;padding:6px 11px;border:1px solid var(--b1);background:var(--c2);color:var(--t2);font-family:var(--mono);font-size:10px;cursor:pointer;transition:all .15s;flex-shrink:0}
.chip:hover{border-color:var(--b2);color:var(--t1)}
.chat-msgs{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px;display:flex;flex-direction:column;gap:14px;min-height:0}
.msg{display:flex;gap:9px;animation:su .28s ease}
.msg.u{flex-direction:row-reverse}
@keyframes su{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
.mav{width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0}
.mav.ai{background:var(--t1);color:var(--bg)}
.mav.us{background:var(--c3);color:var(--t2)}
.mbub{max-width:82%}
.mfrom{font-size:8px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
.msg.u .mfrom{text-align:right}
.mtxt{background:var(--c2);border:1px solid var(--b1);padding:11px 13px;font-size:12px;line-height:1.8;color:var(--t2)}
.msg.u .mtxt{background:var(--c3);color:var(--t1)}
.mtxt strong{color:var(--t1)}
.typing-wrap{display:flex;align-items:center;gap:4px;padding:11px 13px;background:var(--c2);border:1px solid var(--b1);width:fit-content}
.td{width:4px;height:4px;background:var(--t3);border-radius:50%;animation:ta 1.2s infinite}
.td:nth-child(2){animation-delay:.2s}.td:nth-child(3){animation-delay:.4s}
@keyframes ta{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
.cin-wrap{padding:10px 14px;border-top:1px solid var(--b1);display:flex;gap:9px;background:var(--bg);flex-shrink:0}
.cin{flex:1;background:var(--c2);border:1px solid var(--b1);color:var(--t1);padding:11px 13px;font-family:var(--mono);font-size:13px;outline:none;resize:none;height:42px;transition:border-color .2s}
.cin:focus{border-color:var(--b2)}
.csend{width:42px;height:42px;background:var(--t1);color:var(--bg);border:none;cursor:pointer;font-size:15px;transition:opacity .15s;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.csend:hover{opacity:.85}
.csend:disabled{opacity:.4;cursor:not-allowed}

/* MODAL */
.moverlay{position:fixed;inset:0;background:rgba(0,0,0,.78);display:flex;align-items:flex-end;z-index:500;animation:fi .2s ease}
@keyframes fi{from{opacity:0}to{opacity:1}}
.modal{background:var(--c1);border:1px solid var(--b2);border-bottom:none;width:100%;padding:26px 22px 32px;animation:mup .28s ease;position:relative}
@keyframes mup{from{transform:translateY(100%)}to{transform:translateY(0)}}
.mcl{position:absolute;top:14px;right:18px;background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer}
.mtitle{font-family:var(--serif);font-size:26px;font-weight:300;letter-spacing:-.5px;margin-bottom:4px}
.msub{font-size:10px;color:var(--t3);letter-spacing:1.5px;margin-bottom:20px}
.mnote{background:var(--c2);border:1px solid var(--b1);padding:13px;font-size:11px;color:var(--t2);line-height:1.8;margin-bottom:16px}
.mnote strong{color:var(--t1)}
.fl{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:7px}
.finp{width:100%;background:var(--c2);border:1px solid var(--b1);color:var(--t1);padding:12px 13px;font-family:var(--mono);font-size:13px;outline:none;margin-bottom:13px;transition:border-color .2s}
.finp:focus{border-color:var(--b2)}
.mbtns{display:flex;gap:10px;margin-top:6px}
.bpri{flex:1;padding:13px;background:var(--t1);border:none;color:var(--bg);font-family:var(--mono);font-size:10px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;transition:opacity .15s}
.bpri:hover{opacity:.85}
.bsec{flex:1;padding:13px;background:transparent;border:1px solid var(--b2);color:var(--t2);font-family:var(--mono);font-size:10px;letter-spacing:3px;text-transform:uppercase;cursor:pointer}
.sctr{text-align:center;padding:16px 0}
.sem{font-size:40px;margin-bottom:12px}

.pos{color:var(--green)}
.neg{color:var(--red)}
.slbl{padding:12px 14px 7px;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--t3)}
`;

export default function App() {
  const [page, setPage] = useState("home");
  const [modal, setModal] = useState(null);
  const [mstep, setMstep] = useState(0);
  const [banks, setBanks] = useState(BANKS);
  const [msgs, setMsgs] = useState([{
    role:"ai",
    text:"Hey Kaden. I'm **Sage** — your financial coach. Your net worth is **$66,461** across 6 accounts. You're building real wealth at 18. What do you want to work on?"
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({alerts:true,weekly:true,ai:true,twofa:false});
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({behavior:"smooth"}); }, [msgs, loading]);

  const openBank = (b) => {
    if (b.connected) {
      setBanks(p => p.map(x => x.id===b.id ? {...x,connected:false} : x));
    } else {
      setModal(b); setMstep(0);
    }
  };

  const finishConnect = () => {
    setMstep(2);
    setBanks(p => p.map(x => x.id===modal.id ? {...x,connected:true} : x));
  };

  const closeModal = () => { setModal(null); setMstep(0); };

  const send = async (txt) => {
    if (!txt.trim() || loading) return;
    const um = {role:"user", text:txt};
    setMsgs(p => [...p, um]);
    setInput("");
    setLoading(true);
    try {
      const hist = [...msgs, um].map(m => ({
        role: m.role==="ai" ? "assistant" : "user",
        content: m.text.replace(/\*\*(.*?)\*\*/g,"$1")
      }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:SAGE_SYSTEM,messages:hist})
      });
      const data = await res.json();
      setMsgs(p => [...p, {role:"ai", text: data.content?.[0]?.text || "Try again."}]);
    } catch {
      setMsgs(p => [...p, {role:"ai", text:"Network error. Try again."}]);
    }
    setLoading(false);
  };

  const bold = (t) => t.split(/(\*\*.*?\*\*)/g).map((p,i) =>
    p.startsWith("**") ? <strong key={i}>{p.slice(2,-2)}</strong> : p
  );

  const NAV = [
    {id:"home",ic:"◈",lbl:"Home"},
    {id:"budget",ic:"◎",lbl:"Budget"},
    {id:"goals",ic:"◇",lbl:"Goals"},
    {id:"coach",ic:"✦",lbl:"Sage"},
    {id:"more",ic:"⊙",lbl:"More"},
  ];

  const totalSpent = BUDGET.reduce((s,b)=>s+b.spent,0);
  const income = 5040; const invested = 500;
  const remaining = income - totalSpent - invested;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="pages">

          {/* ── HOME ── */}
          <div className={`page ${page==="home"?"on":""}`}>
            <div className="ph">
              <div className="ph-t">Vela</div>
              <div className="ph-s">Good morning, Kaden · May 10</div>
            </div>
            <div className="nw">
              <div className="nw-lbl">Total Net Worth</div>
              <div className="nw-amt">{money(NW)}</div>
              <div className="nw-row">
                <span className="nw-up">↑ +$1,731 this month</span>
                <span className="nw-pct">+2.7%</span>
              </div>
            </div>
            <div className="aib">
              <div className="ai-pill"><span className="ai-dot"/>Sage · Live</div>
              <div className="ai-txt">Your <strong>Shopping ($340)</strong> is over budget by $40. Redirect it to your <strong>Roth IRA</strong> — you need $2,800 more to max it this year.</div>
              <div className="ai-more" onClick={()=>setPage("coach")}>Ask Sage for a full plan →</div>
            </div>
            <div style={{paddingTop:12}}>
              <div className="slbl">Accounts</div>
              <div className="acc-scr">
                {ACCOUNTS.map(a=>(
                  <div key={a.id} className="am">
                    <div className="am-inst">{a.inst}</div>
                    <div className="am-nm">{a.name.replace(a.inst+" ","")}</div>
                    <div className="am-bal">{money(a.balance)}</div>
                    <div className={`am-chg ${a.change>0?"pos":a.change<0?"neg":""}`}>
                      {a.change!==0?(a.change>0?"+":"-")+"$"+Math.abs(a.change).toFixed(0):""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="ctitle">Recent Transactions</div>
              {TXNS.slice(0,5).map(t=>(
                <div key={t.id} className="txn">
                  <div className="txn-em">{t.emoji}</div>
                  <div><div className="txn-nm">{t.name}</div><div className="txn-ct">{t.cat}</div></div>
                  <div className="txn-r">
                    <div className={`txn-amt ${t.amount>0?"pos":""}`}>{t.amount>0?"+":"−"}{moneyAbs(t.amount)}</div>
                    <div className="txn-dt">{t.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── BUDGET ── */}
          <div className={`page ${page==="budget"?"on":""}`}>
            <div className="ph">
              <div className="ph-t">Budget</div>
              <div className="ph-s">May 2026 · 21 days left</div>
            </div>
            <div className="card">
              <div className="ctitle">Monthly Summary</div>
              {[
                {l:"Income",     v:money(income),    c:"var(--green)"},
                {l:"Spent",      v:money(totalSpent),c:"var(--t1)"},
                {l:"Invested",   v:money(invested),  c:"var(--gold)"},
                {l:"Remaining",  v:money(remaining), c:"var(--green)"},
                {l:"Savings Rate",v:`${Math.round((remaining+invested)/income*100)}%`,c:"var(--green)"},
              ].map(r=>(
                <div key={r.l} className="bsum">
                  <span className="bsl">{r.l}</span>
                  <span className="bsv" style={{color:r.c}}>{r.v}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="ctitle">Spending vs. Budget</div>
              {BUDGET.map(b=>{
                const pct = Math.min(b.spent/b.limit*100,100);
                const over = b.spent>b.limit;
                return (
                  <div key={b.cat} className="br">
                    <div className="br-top">
                      <span className="br-cat">{b.cat}</span>
                      <span className="br-nums" style={{color:over?"var(--red)":"var(--t3)"}}>${b.spent}<span style={{color:"var(--t3)"}}> / ${b.limit}</span></span>
                    </div>
                    <div className="br-track">
                      <div className="br-fill" style={{width:`${pct}%`,background:over?"var(--red)":"var(--t1)"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="card">
              <div className="ctitle">All Transactions</div>
              {TXNS.map(t=>(
                <div key={t.id} className="txn">
                  <div className="txn-em">{t.emoji}</div>
                  <div><div className="txn-nm">{t.name}</div><div className="txn-ct">{t.cat}</div></div>
                  <div className="txn-r">
                    <div className={`txn-amt ${t.amount>0?"pos":""}`}>{t.amount>0?"+":"−"}{moneyAbs(t.amount)}</div>
                    <div className="txn-dt">{t.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── GOALS ── */}
          <div className={`page ${page==="goals"?"on":""}`}>
            <div className="ph">
              <div className="ph-t">Goals</div>
              <div className="ph-s">4 active · Building wealth</div>
            </div>
            <div style={{paddingTop:10}}>
              {GOALS.map(g=>{
                const pct = Math.round(g.current/g.target*100);
                const rem = g.target-g.current;
                return (
                  <div key={g.name} className="gc">
                    <div className="gc-top">
                      <div><div className="gc-nm">{g.name} {g.emoji}</div><div className="gc-ds">{money(g.monthly)}/mo contribution</div></div>
                      <div className="gc-pct">{pct}%</div>
                    </div>
                    <div className="gc-track"><div className="gc-fill" style={{width:`${pct}%`}}/></div>
                    <div className="gc-row">
                      <span className="gc-cur">{money(g.current)}</span>
                      <span className="gc-tgt">of {money(g.target)}</span>
                    </div>
                    <div className="gc-mo">{money(rem)} remaining · ~{Math.ceil(rem/g.monthly)} months at current pace</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── SAGE COACH ── */}
          <div className={`page coach-page ${page==="coach"?"on":""}`}>
            <div className="coach-hd">
              <div className="coach-av">✦</div>
              <div><div className="coach-nm">Sage — AI Coach</div><div className="coach-st">● Online · Powered by Claude</div></div>
            </div>
            <div className="chips">
              {["Allocate internship income","Max my Roth IRA?","Review my budget","Fourplex plan","Best move for savings"].map(q=>(
                <button key={q} className="chip" onClick={()=>send(q)}>{q}</button>
              ))}
            </div>
            <div className="chat-msgs">
              {msgs.map((m,i)=>(
                <div key={i} className={`msg ${m.role==="user"?"u":""}`}>
                  <div className={`mav ${m.role==="ai"?"ai":"us"}`}>{m.role==="ai"?"✦":"K"}</div>
                  <div className="mbub">
                    <div className="mfrom">{m.role==="ai"?"Sage":"You"}</div>
                    <div className="mtxt">{bold(m.text)}</div>
                  </div>
                </div>
              ))}
              {loading&&(
                <div className="msg">
                  <div className="mav ai">✦</div>
                  <div className="mbub">
                    <div className="mfrom">Sage</div>
                    <div className="typing-wrap"><div className="td"/><div className="td"/><div className="td"/></div>
                  </div>
                </div>
              )}
              <div ref={chatEnd}/>
            </div>
            <div className="cin-wrap">
              <textarea className="cin" placeholder="Ask Sage anything..." value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input)}}}
              />
              <button className="csend" onClick={()=>send(input)} disabled={loading||!input.trim()}>→</button>
            </div>
          </div>

          {/* ── MORE ── */}
          <div className={`page ${page==="more"?"on":""}`}>
            <div className="ph">
              <div className="ph-t">More</div>
              <div className="ph-s">Insights · Connect · Settings</div>
            </div>

            <div className="slbl">AI Insights</div>
            {[
              {val:"45%",lbl:"Savings Rate",em:"📈",desc:"Top 10% for your age. At this pace you hit $200K net worth by 22.",type:"good",tag:"Excellent"},
              {val:"$40 over",lbl:"Shopping Budget",em:"⚠️",desc:"Redirect the overage to your Roth IRA — small moves compound fast.",type:"warn",tag:"Action needed"},
              {val:"$2,800",lbl:"Roth IRA Gap",em:"🌱",desc:"Bump monthly contribution by $100 using internship income to max it.",type:"warn",tag:"Attention"},
              {val:"4.5% APY",lbl:"HYSA Opportunity",em:"💡",desc:"Move $5K from Schwab Checking to a high-yield account. That's $225 free per year.",type:"info",tag:"Optimize"},
            ].map((ins,i)=>(
              <div key={i} className="ic">
                <div className="ic-top">
                  <div><div className="ic-val">{ins.val}</div><div className="ic-lbl">{ins.lbl}</div></div>
                  <div className="ic-em">{ins.em}</div>
                </div>
                <div className="ic-desc">{ins.desc}</div>
                <div className={`ic-tag ${ins.type}`}>{ins.tag}</div>
              </div>
            ))}

            <div className="slbl" style={{marginTop:6}}>Connect Accounts</div>
            <div className="bank-grid">
              {banks.map(b=>(
                <div key={b.id} className={`bt ${b.connected?"on":""}`} onClick={()=>openBank(b)}>
                  <div className="bt-em">{b.emoji}</div>
                  <div className="bt-nm">{b.name}</div>
                  <div className={`bt-st ${b.connected?"on":"off"}`}>{b.connected?"✓ Connected":"Connect"}</div>
                </div>
              ))}
            </div>
            <div style={{margin:"10px 14px",background:"var(--c1)",border:"1px solid var(--b1)",padding:"14px",fontSize:11,color:"var(--t2)",lineHeight:1.85}}>
              <strong style={{color:"var(--t1)"}}>Secured via Plaid.</strong> Same technology as Coinbase, Venmo, and Robinhood. We never store your credentials. Disconnect any time.
            </div>

            <div className="slbl" style={{marginTop:6}}>Settings</div>
            <div className="card">
              {[
                {k:"alerts",l:"Transaction Alerts",s:"Instant notifications"},
                {k:"weekly",l:"Weekly Summary",s:"Sunday recap from Sage"},
                {k:"ai",l:"AI Insights",s:"Proactive coaching tips"},
                {k:"twofa",l:"Two-Factor Auth",s:"Extra account security"},
              ].map(r=>(
                <div key={r.k} className="sr">
                  <div><div className="sr-l">{r.l}</div><div className="sr-s">{r.s}</div></div>
                  <div className={`tog ${settings[r.k]?"on":""}`} onClick={()=>setSettings(p=>({...p,[r.k]:!p[r.k]}))}>
                    <div className="tok"/>
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{marginBottom:20}}>
              {[
                {l:"Name",v:"Kaden"},{l:"Location",v:"Oakland, CA"},
                {l:"Plan",v:"Pro"},{l:"Accounts",v:`${banks.filter(b=>b.connected).length} connected`},
              ].map(r=>(
                <div key={r.l} className="bsum">
                  <span className="bsl">{r.l}</span>
                  <span className="bsv">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BOTTOM NAV ── */}
        <div className="bnav">
          {NAV.map(n=>(
            <div key={n.id} className={`bn ${page===n.id?"on":""}`} onClick={()=>setPage(n.id)}>
              <div className="bn-ic">{n.ic}</div>
              <div className="bn-lbl">{n.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BANK MODAL */}
      {modal&&(
        <div className="moverlay" onClick={e=>{if(e.target.className==="moverlay")closeModal()}}>
          <div className="modal">
            <button className="mcl" onClick={closeModal}>×</button>
            {mstep===0&&<>
              <div className="mtitle">Connect {modal.name}</div>
              <div className="msub">Secured via Plaid · 256-bit encryption</div>
              <div className="mnote"><strong>Read-only access.</strong> Vela reads balances & transactions only. We cannot move money or see your full account number.</div>
              <div className="fl">Username or Email</div>
              <input className="finp" type="text" placeholder={`${modal.name} username`}/>
              <div className="fl">Password</div>
              <input className="finp" type="password" placeholder="••••••••••"/>
              <div className="mbtns">
                <button className="bsec" onClick={closeModal}>Cancel</button>
                <button className="bpri" onClick={()=>setMstep(1)}>Connect →</button>
              </div>
            </>}
            {mstep===1&&<>
              <div className="mtitle">Connecting...</div>
              <div className="msub">Establishing secure link to {modal.name}</div>
              <div style={{textAlign:"center",padding:"24px 0"}}>
                <div style={{fontSize:38,marginBottom:12,animation:"bl 1s infinite"}}>🔐</div>
                <div style={{fontSize:12,color:"var(--t2)",lineHeight:2}}>Verifying credentials...<br/>Just a moment.</div>
              </div>
              <button className="bpri" style={{width:"100%"}} onClick={finishConnect}>Confirm →</button>
            </>}
            {mstep===2&&<div className="sctr">
              <div className="sem">✅</div>
              <div className="mtitle">{modal.name} Connected!</div>
              <div style={{fontSize:12,color:"var(--t2)",lineHeight:1.8,marginTop:8,marginBottom:20}}>Your accounts are now linked. Balances sync automatically.</div>
              <button className="bpri" style={{width:"100%"}} onClick={closeModal}>Done</button>
            </div>}
          </div>
        </div>
      )}
    </>
  );
}
