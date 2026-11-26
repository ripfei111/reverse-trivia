import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import {
  Sparkles,
  Users,
  User,
  Globe,
  LogIn,
  UserPlus,
  LogOut,
  Trophy,
  Play,
  Copy,
  Check,
  ArrowRight,
  RotateCcw,
  Crown,
  Flame,
  AlertCircle,
  Smartphone,
  Wifi,
  ChevronLeft,
  Eye,
  EyeOff,
  Loader2,
  Share2,
  Ban,
  Heart,
  Skull,
  Medal,
  Plus,
  X,
  Zap,
  CheckCircle2,
  Send,
  Mountain
} from 'lucide-react';

const AVATARS = ['😎', '🦊', '🐱', '🚀', '👾', '🦄', '🐸', '🔥'];

const CATEGORIES = [
  { id: 'all', th: 'สุ่มทุกหมวด', en: 'All Categories' },
  { id: 'food', th: 'อาหารและของกิน', en: 'Food & Drinks' },
  { id: 'daily', th: 'ชีวิตประจำวัน', en: 'Daily Life' },
  { id: 'pop', th: 'บันเทิงและไลฟ์สไตล์', en: 'Pop Culture & Lifestyle' },
  { id: 'travel', th: 'ท่องเที่ยวและสถานที่', en: 'Travel & Places' },
  { id: 'tech', th: 'เทคโนโลยีและเกม', en: 'Tech & Gaming' },
  { id: 'movies', th: 'หนังและซีรีส์', en: 'Movies & Series' }
];

const FALLBACK_QUESTIONS = [
  {
    category: 'food',
    question: {
      th: 'บอกชื่อเมนู "อาหารตามสั่ง" ที่คนไทยมักสั่งเวลาคิดอะไรไม่ออก (ตอบเมนูที่คนสั่งน้อยที่สุด!)',
      en: 'Name a common Thai street-food dish people order when undecided (aim for the LEAST ordered one!)'
    },
    commonKeywords: ['กะเพรา', 'กระเพรา', 'ข้าวผัด', 'หมูกระเทียม', 'ไข่เจียว', 'basil', 'fried rice', 'garlic'],
    crowdSummary: {
      th: 'คำตอบยอดฮิต: ผัดกะเพรา (48%), ข้าวผัด (26%), หมูกระเทียม (16%)',
      en: 'Top Crowd Answers: Basil Stir-fry (48%), Fried Rice (26%), Garlic Pork (16%)'
    }
  },
  {
    category: 'daily',
    question: {
      th: 'สิ่งแรกที่คนส่วนใหญ่ทำทันทีหลังจาก "ตื่นนอนตอนเช้า" คืออะไร? (ทายอย่างที่คนทำน้อยที่สุด)',
      en: 'What is the very first thing people do right after waking up? (Name the LEAST common one)'
    },
    commonKeywords: ['มือถือ', 'โทรศัพท์', 'เช็ก', 'นาฬิกาปลุก', 'เลื่อนปลุก', 'ล้างหน้า', 'แปรงฟัน', 'phone', 'snooze', 'brush'],
    crowdSummary: {
      th: 'คำตอบยอดฮิต: หยิบมือถือเช็กแจ้งเตือน (51%), กดเลื่อนปลุก (24%), แปรงฟัน (15%)',
      en: 'Top Crowd Answers: Check phone (51%), Hit snooze (24%), Brush teeth (15%)'
    }
  },
  {
    category: 'travel',
    question: {
      th: 'บอกชื่อ "ของใช้ส่วนตัว" ที่คนมักจัดใส่กระเป๋าเวลาไปเที่ยวต่างจังหวัด 3 วัน 2 คืน',
      en: 'Name a personal item people pack for a 3-day weekend trip (pick the rarest one!)'
    },
    commonKeywords: ['สายชาร์จ', 'มือถือ', 'เสื้อผ้า', 'แปรงสีฟัน', 'กางเกงใน', 'พาวเวอร์แบงก์', 'charger', 'clothes', 'toothbrush'],
    crowdSummary: {
      th: 'คำตอบยอดฮิต: สายชาร์จมือถือ (46%), เสื้อผ้า (31%), แปรงสีฟัน (14%)',
      en: 'Top Crowd Answers: Phone charger (46%), Clothes (31%), Toothbrush (14%)'
    }
  },
  {
    category: 'pop',
    question: {
      th: 'กิจกรรมยามว่างที่คนชอบทำใน "วันหยุดเสาร์-อาทิตย์" คืออะไร?',
      en: 'What is a popular weekend leisure activity? (Aim for the least common answer)'
    },
    commonKeywords: ['นอน', 'ดูหนัง', 'ซีรีส์', 'เล่นเกม', 'เดินห้าง', 'คาเฟ่', 'sleep', 'movie', 'game', 'mall'],
    crowdSummary: {
      th: 'คำตอบยอดฮิต: นอนพักผ่อน (44%), ดูหนัง/ซีรีส์ (27%), เล่นเกม (18%)',
      en: 'Top Crowd Answers: Sleeping (44%), Watching movies (27%), Gaming (18%)'
    }
  },
  {
    category: 'tech',
    question: {
      th: 'บอกชื่อ "แอปพลิเคชัน" ในมือถือที่คนทั่วไปเปิดใช้งานแทบทุกวัน',
      en: 'Name a smartphone app everyday people open almost every single day'
    },
    commonKeywords: ['ไลน์', 'เฟซ', 'เฟส', 'ยูทูป', 'ติ๊กต็อก', 'ไอจี', 'line', 'facebook', 'youtube', 'tiktok', 'instagram'],
    crowdSummary: {
      th: 'คำตอบยอดฮิต: LINE (42%), TikTok (28%), YouTube (19%)',
      en: 'Top Crowd Answers: LINE (42%), TikTok (28%), YouTube (19%)'
    }
  },
  {
    category: 'movies',
    question: {
      th: 'ของกินหรือเครื่องดื่มที่คนมักซื้อเข้าไปกินใน "โรงภาพยนตร์" คืออะไร?',
      en: 'What snack or drink do people usually buy at a movie theater?'
    },
    commonKeywords: ['ป๊อปคอร์น', 'ข้าวโพด', 'น้ำอัดลม', 'โค้ก', 'เป๊ปซี่', 'popcorn', 'soda', 'coke'],
    crowdSummary: {
      th: 'คำตอบยอดฮิต: ป๊อปคอร์น (55%), น้ำอัดลม (29%), ไส้กรอก/นักเก็ต (10%)',
      en: 'Top Crowd Answers: Popcorn (55%), Soda (29%), Nuggets (10%)'
    }
  },
  {
    category: 'food',
    question: {
      th: 'บอกชื่อ "ผลไม้ยอดนิยม" ที่คนไทยชอบซื้อติดตู้เย็นไว้กิน',
      en: 'Name a popular fruit people keep in their fridge at home'
    },
    commonKeywords: ['แตงโม', 'กล้วย', 'ส้ม', 'แอปเปิ้ล', 'มะม่วง', 'ฝรั่ง', 'watermelon', 'banana', 'orange', 'apple'],
    crowdSummary: {
      th: 'คำตอบยอดฮิต: แตงโม (39%), ส้ม (25%), แอปเปิ้ล (21%)',
      en: 'Top Crowd Answers: Watermelon (39%), Orange (25%), Apple (21%)'
    }
  },
  {
    category: 'daily',
    question: {
      th: 'ข้ออ้างยอดฮิตเวลาคนมาทำงานหรือมาเรียน "สาย" คืออะไร?',
      en: 'What is a classic excuse people use when arriving late to work or school?'
    },
    commonKeywords: ['รถติด', 'ตื่นสาย', 'ฝนตก', 'ท้องเสีย', 'รถเสีย', 'traffic', 'overslept', 'rain'],
    crowdSummary: {
      th: 'คำตอบยอดฮิต: รถติดหนักมาก (52%), นาฬิกาปลุกไม่ดัง/ตื่นสาย (27%), ฝนตก (14%)',
      en: 'Top Crowd Answers: Heavy traffic (52%), Overslept (27%), Heavy rain (14%)'
    }
  }
];

function safeCopyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) resolve();
      else reject(new Error('copy failed'));
    } catch (e) {
      reject(e);
    }
  });
}

function evaluateAnswerLocally(questionObj, rawAnswer, streak = 0) {
  const ans = (rawAnswer || '').trim();
  const lower = ans.toLowerCase();

  // Check empty or gibberish
  if (ans.length < 2 || /^(.)\1+$/.test(lower) || /^[0-9]+$/.test(lower)) {
    return {
      isValid: false,
      pct: 100,
      points: 0,
      floors: 0,
      isReverseWinner: false,
      isCrowdTrap: true,
      comment: {
        th: 'คำตอบสั้นเกินไปหรือไม่ตรงโจทย์ AI ถือว่าตกกระแสหลัก (0 คะแนน)',
        en: 'Answer is too short or invalid. Treated as a crowd trap (0 pts).'
      },
      crowdSummary: questionObj?.crowdSummary || {
        th: 'คำตอบยอดฮิตของคนส่วนใหญ่',
        en: 'Top mainstream crowd answers'
      }
    };
  }

  const keywords = questionObj?.commonKeywords || [];
  const hitCommon = keywords.some((kw) => lower.includes(kw.toLowerCase()));

  if (hitCommon) {
    const pct = 42 + (ans.length % 15);
    return {
      isValid: true,
      pct,
      points: 0,
      floors: 0,
      isReverseWinner: false,
      isCrowdTrap: true,
      comment: {
        th: `ใจตรงกับคนส่วนใหญ่เป๊ะ! (${pct}% ตอบแนวนี้) พลาดโอกาสปีนหอคอยในรอบนี้`,
        en: `Too mainstream! (${pct}% chose this) No tower climb this round.`
      },
      crowdSummary: questionObj?.crowdSummary || {
        th: 'คำตอบยอดฮิตของคนส่วนใหญ่',
        en: 'Top mainstream crowd answers'
      }
    };
  }

  // Creative / Rare answer
  const hash = ans.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const pct = 4 + (hash % 14); // 4% - 17%
  const isTopReverse = pct <= 11;
  const basePoints = isTopReverse ? 180 + streak * 30 : 120 + streak * 15;
  const floors = isTopReverse ? 3 : 2;

  return {
    isValid: true,
    pct,
    points: basePoints,
    floors,
    isReverseWinner: isTopReverse,
    isCrowdTrap: false,
    comment: {
      th: isTopReverse
        ? `สุดยอดความแหวกแนว! มีคนตอบแบบนี้แค่ ${pct}% ปีนขึ้นไป +${floors} ชั้น!`
        : `คำตอบสวนกระแสได้ดี! มีคนคิดเหมือนคุณเพียง ${pct}% ปีนขึ้น +${floors} ชั้น`,
      en: isTopReverse
        ? `Brilliant rare answer! Only ${pct}% said this. Climbed +${floors} floors!`
        : `Nice off-beat answer! Only ${pct}% chose this. Climbed +${floors} floors.`
    },
    crowdSummary: questionObj?.crowdSummary || {
      th: 'คำตอบยอดฮิตของคนส่วนใหญ่',
      en: 'Top mainstream crowd answers'
    }
  };
}

const GlobalStyles = memo(() => (
  <style>{`
    @keyframes fadeUp {
      0% { opacity: 0; transform: translate3d(0, 14px, 0); }
      100% { opacity: 1; transform: translate3d(0, 0, 0); }
    }
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.86); }
      70% { transform: scale(1.04); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes floatSlow {
      0%, 100% { transform: translate3d(0, 0, 0); }
      50% { transform: translate3d(0, -6px, 0); }
    }
    @keyframes shakeX {
      0%, 100% { transform: translate3d(0, 0, 0); }
      20% { transform: translate3d(-7px, 0, 0); }
      40% { transform: translate3d(7px, 0, 0); }
      60% { transform: translate3d(-5px, 0, 0); }
      80% { transform: translate3d(5px, 0, 0); }
    }
    @keyframes climbPulse {
      0% { opacity: 0; transform: translate3d(0, 10px, 0) scale(0.9); }
      25% { opacity: 1; transform: translate3d(0, -4px, 0) scale(1.05); }
      85% { opacity: 1; transform: translate3d(0, -10px, 0) scale(1); }
      100% { opacity: 0; transform: translate3d(0, -18px, 0) scale(0.95); }
    }
    @keyframes orbDrift {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(18px, -16px, 0) scale(1.05); }
    }
    @keyframes confettiFall {
      0% { opacity: 1; transform: translate3d(0, -10px, 0) rotate(0deg); }
      100% { opacity: 0; transform: translate3d(var(--tx), 140px, 0) rotate(360deg); }
    }
    @keyframes toastSlide {
      0% { opacity: 0; transform: translate3d(-50%, 16px, 0) scale(0.95); }
      100% { opacity: 1; transform: translate3d(-50%, 0, 0) scale(1); }
    }
    .anim-fade-up { animation: fadeUp 0.34s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .anim-pop { animation: popIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .anim-float { animation: floatSlow 3.2s ease-in-out infinite; }
    .anim-shake { animation: shakeX 0.42s ease-in-out both; }
    .anim-climb-badge { animation: climbPulse 2.2s ease-out forwards; }
    .anim-orb { animation: orbDrift 12s ease-in-out infinite; will-change: transform; }
    .anim-toast { animation: toastSlide 0.28s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .btn-press { transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease; }
    .btn-press:active:not(:disabled) { transform: scale(0.97); }
  `}</style>
));

const AmbientBackground = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="anim-orb absolute -top-24 -left-24 w-72 h-72 rounded-full bg-indigo-600/15 blur-3xl" />
    <div
      className="anim-orb absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl"
      style={{ animationDelay: '-4s' }}
    />
    <div
      className="anim-orb absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl"
      style={{ animationDelay: '-8s' }}
    />
  </div>
));

const CONFETTI_PIECES = [
  { left: '14%', color: '#34d399', tx: '-28px', delay: '0s' },
  { left: '28%', color: '#818cf8', tx: '22px', delay: '0.05s' },
  { left: '42%', color: '#fbbf24', tx: '-16px', delay: '0.09s' },
  { left: '56%', color: '#f472b6', tx: '26px', delay: '0.03s' },
  { left: '70%', color: '#38bdf8', tx: '-24px', delay: '0.07s' },
  { left: '84%', color: '#fbbf24', tx: '18px', delay: '0.11s' }
];

const ConfettiBurst = memo(({ active }) => {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 h-36 overflow-hidden z-20">
      {CONFETTI_PIECES.map((p, i) => (
        <span
          key={i}
          style={{
            left: p.left,
            backgroundColor: p.color,
            '--tx': p.tx,
            animation: `confettiFall 1.05s cubic-bezier(0.2, 0.8, 0.2, 1) ${p.delay} forwards`
          }}
          className="absolute top-0 w-2.5 h-2.5 rounded-sm"
        />
      ))}
    </div>
  );
});

const ToastBanner = memo(({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-50 anim-toast pointer-events-none">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl text-xs sm:text-sm font-semibold text-emerald-300 backdrop-blur-md">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
});

// ============================================================================
// อนิเมชั่นปีนหอคอย (TOWER CLIMB VISUALIZER)
// ============================================================================
const TowerClimbWidget = memo(({ score, avatar, lastGain, lang, compact = false }) => {
  const floor = Math.floor((score || 0) / 50);
  const progressPct = Math.min(94, Math.max(6, ((score || 0) / 1000) * 100));

  const zone = useMemo(() => {
    if (floor >= 20) {
      return {
        th: 'ยอดหอคอยจักรวาล',
        en: 'Cosmic Summit',
        bg: 'from-amber-950/80 via-purple-950/70 to-slate-900',
        badge: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
        bar: 'from-amber-400 via-orange-500 to-rose-500'
      };
    }
    if (floor >= 12) {
      return {
        th: 'หอคอยดารา',
        en: 'Starlight Bastion',
        bg: 'from-indigo-950/80 via-purple-950/70 to-slate-900',
        badge: 'text-purple-300 bg-purple-500/20 border-purple-500/40',
        bar: 'from-indigo-400 via-purple-500 to-pink-500'
      };
    }
    if (floor >= 5) {
      return {
        th: 'ชั้นเมฆหมอก',
        en: 'Cloud Spire',
        bg: 'from-sky-950/80 via-indigo-950/70 to-slate-900',
        badge: 'text-sky-300 bg-sky-500/20 border-sky-500/40',
        bar: 'from-emerald-400 via-teal-500 to-sky-500'
      };
    }
    return {
      th: 'ฐานหอคอย',
      en: 'Tower Base',
      bg: 'from-slate-900 via-slate-900 to-indigo-950/50',
      badge: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
      bar: 'from-emerald-500 to-indigo-500'
    };
  }, [floor]);

  const milestones = [
    { label: 'F20+', pct: 88 },
    { label: 'F12', pct: 60 },
    { label: 'F5', pct: 30 },
    { label: 'F0', pct: 6 }
  ];

  return (
    <div
      className={`relative rounded-2xl border border-slate-700/80 bg-gradient-to-br ${zone.bg} p-3.5 sm:p-4 mb-5 overflow-hidden transition-colors duration-700`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Mountain className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-white flex items-center gap-1.5">
              <span>{lang === 'th' ? `หอคอยชั้นที่ ${floor}` : `Tower Floor ${floor}`}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${zone.badge}`}>
                {lang === 'th' ? zone.th : zone.en}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {lang === 'th' ? `ความสูงสะสม: ${score} แต้ม` : `Altitude Score: ${score} pts`}
            </div>
          </div>
        </div>

        {lastGain && lastGain.points > 0 && (
          <div
            key={lastGain.id}
            className="anim-climb-badge px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-black shadow-lg"
          >
            +{lastGain.floors} {lang === 'th' ? 'ชั้น' : 'Fl'} • +{lastGain.points}
          </div>
        )}
      </div>

      {/* Visual Tower Track (Vertical Shaft) */}
      <div className={`relative w-full ${compact ? 'h-24' : 'h-32'} bg-[#060a12]/90 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center`}>
        {/* Horizontal Floor Grid Lines */}
        {milestones.map((m) => (
          <div
            key={m.label}
            style={{ bottom: `${m.pct}%` }}
            className="absolute inset-x-0 border-t border-dashed border-slate-800 flex items-center justify-between px-3 pointer-events-none"
          >
            <span className="text-[10px] font-mono text-slate-500">{m.label}</span>
            <span className="text-[10px] font-mono text-slate-600">═══</span>
          </div>
        ))}

        {/* Central Tower Pillar */}
        <div className="relative w-14 h-full bg-slate-900/90 border-x border-slate-700/70 flex flex-col justify-end">
          {/* Glowing Climb Fill */}
          <div
            style={{ height: `${progressPct}%` }}
            className={`w-full bg-gradient-to-t ${zone.bar} opacity-45 transition-all duration-1000 ease-out`}
          />
          {/* Animated Climber Avatar */}
          <div
            style={{ bottom: `calc(${progressPct}% - 14px)` }}
            className="absolute left-1/2 -translate-x-1/2 transition-all duration-1000 ease-out z-10 flex flex-col items-center"
          >
            <div className="w-9 h-9 rounded-full bg-slate-950 border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)] flex items-center justify-center text-lg">
              {avatar || '😎'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function App() {
  const [lang, setLang] = useState('th');
  const [user, setUser] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  // Auth states
  const [authTab, setAuthTab] = useState('login');
  const [playerIdInput, setPlayerIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😎');
  const [showPin, setShowPin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [suggestRegister, setSuggestRegister] = useState(false);

  // Navigation & Settings
  const [screen, setScreen] = useState('lobby');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customCategory, setCustomCategory] = useState('');
  const [bannedCategories, setBannedCategories] = useState([]);
  const [customBanInput, setCustomBanInput] = useState('');
  const [totalRounds, setTotalRounds] = useState(5);

  // Leaderboard (Hall of Fame + Survival)
  const [leaderboardTab, setLeaderboardTab] = useState('hof');
  const [hofLeaderboard, setHofLeaderboard] = useState([]);
  const [survivalLeaderboard, setSurvivalLeaderboard] = useState([]);

  // Questions & Grading FX
  const [questions, setQuestions] = useState([]);
  const [questionSource, setQuestionSource] = useState('ai');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [gradingAnswer, setGradingAnswer] = useState(false);
  const [fxConfetti, setFxConfetti] = useState(false);
  const [fxShake, setFxShake] = useState(false);
  const [lastTowerGain, setLastTowerGain] = useState(null);

  // Solo states (Fill-in-the-blank)
  const [soloRound, setSoloRound] = useState(0);
  const [soloScore, setSoloScore] = useState(0);
  const [soloStreak, setSoloStreak] = useState(0);
  const [soloBestStreak, setSoloBestStreak] = useState(0);
  const [soloAnswerInput, setSoloAnswerInput] = useState('');
  const [soloResult, setSoloResult] = useState(null);
  const [soloFinished, setSoloFinished] = useState(false);

  // Survival states (Fill-in-the-blank + 3 Hearts)
  const [survivalLives, setSurvivalLives] = useState(3);
  const [survivalRound, setSurvivalRound] = useState(1);
  const [survivalBatchIdx, setSurvivalBatchIdx] = useState(0);
  const [survivalScore, setSurvivalScore] = useState(0);
  const [survivalStreak, setSurvivalStreak] = useState(0);
  const [survivalBestStreak, setSurvivalBestStreak] = useState(0);
  const [survivalAnswerInput, setSurvivalAnswerInput] = useState('');
  const [survivalResult, setSurvivalResult] = useState(null);
  const [survivalFinished, setSurvivalFinished] = useState(false);
  const [survivalHealNotice, setSurvivalHealNotice] = useState(false);

  // Local Pass & Play states (Fill-in-the-blank)
  const [localPlayers, setLocalPlayers] = useState([
    { name: 'ผู้เล่น 1', avatar: '😎', score: 0 },
    { name: 'ผู้เล่น 2', avatar: '🦊', score: 0 }
  ]);
  const [localRound, setLocalRound] = useState(0);
  const [localTurnIndex, setLocalTurnIndex] = useState(0);
  const [localPrivacyScreen, setLocalPrivacyScreen] = useState(true);
  const [localInputText, setLocalInputText] = useState('');
  const [localAnswers, setLocalAnswers] = useState({});
  const [localResults, setLocalResults] = useState(null);
  const [localFinished, setLocalFinished] = useState(false);

  // Online Multiplayer states
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [onlineAnswerInput, setOnlineAnswerInput] = useState('');
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const showToast = useCallback((msg) => setToastMsg(msg), []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 2500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const triggerConfetti = useCallback(() => {
    setFxConfetti(false);
    requestAnimationFrame(() => setFxConfetti(true));
    setTimeout(() => setFxConfetti(false), 1200);
  }, []);

  const triggerShake = useCallback(() => {
    setFxShake(false);
    requestAnimationFrame(() => setFxShake(true));
    setTimeout(() => setFxShake(false), 450);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('reverse_trivia_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          setUser(parsed);
          setLocalPlayers([
            { name: parsed.displayName || parsed.id, avatar: parsed.avatar || '😎', score: 0 },
            { name: 'ผู้เล่น 2', avatar: '🦊', score: 0 }
          ]);
        }
      } catch (e) {
        localStorage.removeItem('reverse_trivia_user');
      }
    }
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) setRoomCodeInput(roomParam.toUpperCase());
  }, []);

  // Leaderboards
  useEffect(() => {
    if (!user) return;
    const qHof = query(collection(db, 'users'), orderBy('score', 'desc'), limit(10));
    const qSurv = query(collection(db, 'users'), orderBy('survivalScore', 'desc'), limit(10));

    const unsubHof = onSnapshot(
      qHof,
      (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setHofLeaderboard(list);
      },
      () => {}
    );

    const unsubSurv = onSnapshot(
      qSurv,
      (snap) => {
        const list = [];
        snap.forEach((d) => {
          const data = d.data();
          if ((data.survivalScore || 0) > 0) list.push({ id: d.id, ...data });
        });
        setSurvivalLeaderboard(list);
      },
      () => {}
    );

    return () => {
      unsubHof();
      unsubSurv();
    };
  }, [user]);

  // Online Room Listener
  useEffect(() => {
    if (!activeRoomCode) return;
    const unsub = onSnapshot(
      doc(db, 'rooms', activeRoomCode),
      (snap) => {
        if (snap.exists()) {
          setRoomData(snap.data());
        } else {
          setOnlineError(lang === 'th' ? 'ไม่พบห้องนี้หรือห้องถูกปิดไปแล้ว' : 'Room not found');
          setActiveRoomCode('');
          setRoomData(null);
          setScreen('lobby');
        }
      },
      (err) => setOnlineError(err.message)
    );
    return () => unsub();
  }, [activeRoomCode, lang]);

  // Share Link Helper
  const shareLink = useCallback(
    async ({ title, text, url, isRoom = false }) => {
      const shareUrl = url || window.location.origin;
      const shareTitle = title || 'Reverse Trivia — หอคอยทายสวนกระแส';
      const shareText =
        text ||
        (lang === 'th'
          ? 'มาเล่น Reverse Trivia พิมพ์คำตอบสวนกระแสให้ AI ตรวจและปีนหอคอยกัน!'
          : 'Play Reverse Trivia — type rare answers for AI grading and climb the tower!');

      if (navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
          if (isRoom) {
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
          }
          showToast(lang === 'th' ? 'แชร์ลิงก์สำเร็จ!' : 'Shared successfully!');
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
        }
      }

      try {
        await safeCopyToClipboard(text ? `${shareText}\n${shareUrl}` : shareUrl);
        if (isRoom) {
          setCopiedCode(true);
          setTimeout(() => setCopiedCode(false), 2000);
        }
        showToast(lang === 'th' ? 'คัดลอกลิงก์ลงคลิปบอร์ดแล้ว!' : 'Link copied!');
      } catch (e) {
        showToast(lang === 'th' ? 'คัดลอก URL ด้านบนเพื่อแชร์ได้เลย' : 'Copy URL from address bar');
      }
    },
    [lang, showToast]
  );

  // Ban helpers
  const toggleBanPreset = useCallback(
    (catId) => {
      if (catId === 'all') return;
      setBannedCategories((prev) => {
        if (prev.includes(catId)) return prev.filter((id) => id !== catId);
        const presetBanned = prev.filter((b) => CATEGORIES.some((c) => c.id === b)).length;
        if (presetBanned >= CATEGORIES.length - 2 && !customCategory.trim()) {
          showToast(lang === 'th' ? 'ต้องเหลือหมวดหมู่ไว้อย่างน้อย 1 หมวด' : 'Keep at least 1 category');
          return prev;
        }
        if (selectedCategory === catId) setSelectedCategory('all');
        return [...prev, catId];
      });
    },
    [customCategory, lang, selectedCategory, showToast]
  );

  const addCustomBan = useCallback(() => {
    const trimmed = customBanInput.trim();
    if (!trimmed) return;
    if (!bannedCategories.includes(trimmed)) {
      setBannedCategories((prev) => [...prev, trimmed]);
    }
    setCustomBanInput('');
  }, [bannedCategories, customBanInput]);

  const bannedLabels = useMemo(
    () =>
      bannedCategories.map((b) => {
        const found = CATEGORIES.find((c) => c.id === b);
        return found ? { key: b, label: lang === 'th' ? found.th : found.en } : { key: b, label: b };
      }),
    [bannedCategories, lang]
  );

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSuggestRegister(false);
    const rawName = playerIdInput.trim();
    const cleanId = rawName.toLowerCase();

    if (cleanId.length < 3) {
      setAuthError(lang === 'th' ? 'กรุณากรอกชื่อผู้เล่นอย่างน้อย 3 ตัวอักษร' : 'Min 3 characters');
      return;
    }
    if (!/^\d{4}$/.test(pinInput)) {
      setAuthError(lang === 'th' ? 'กรุณากรอกรหัส PIN ตัวเลข 4 หลัก' : 'Enter 4-digit PIN');
      return;
    }

    setAuthLoading(true);
    try {
      const snap = await getDoc(doc(db, 'users', cleanId));
      if (!snap.exists()) {
        setAuthError(
          lang === 'th'
            ? `ไม่พบชื่อผู้เล่น "${rawName}" ในระบบ ต้องการสมัครเป็น ID ใหม่เลยไหมครับ?`
            : `Player ID "${rawName}" not found. Register now?`
        );
        setSuggestRegister(true);
        setAuthLoading(false);
        return;
      }

      const data = snap.data();
      if (data.pin !== pinInput) {
        setAuthError(lang === 'th' ? 'รหัส PIN 4 หลักไม่ถูกต้อง' : 'Incorrect 4-digit PIN');
        setAuthLoading(false);
        return;
      }

      const loggedUser = {
        id: cleanId,
        displayName: data.displayName || rawName,
        avatar: data.avatar || '😎',
        score: data.score || 0,
        gamesPlayed: data.gamesPlayed || 0,
        bestStreak: data.bestStreak || 0,
        survivalScore: data.survivalScore || 0,
        survivalBestRound: data.survivalBestRound || 0
      };
      setUser(loggedUser);
      localStorage.setItem('reverse_trivia_user', JSON.stringify(loggedUser));
      setLocalPlayers([
        { name: loggedUser.displayName, avatar: loggedUser.avatar, score: 0 },
        { name: lang === 'th' ? 'ผู้เล่น 2' : 'Player 2', avatar: '🦊', score: 0 }
      ]);
    } catch (err) {
      setAuthError((lang === 'th' ? 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ' : 'DB Error: ') + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSuggestRegister(false);
    const rawName = playerIdInput.trim();
    const cleanId = rawName.toLowerCase();

    if (cleanId.length < 3 || cleanId.length > 20) {
      setAuthError(lang === 'th' ? 'ชื่อผู้เล่นต้องยาว 3–20 ตัวอักษร' : 'ID must be 3–20 chars');
      return;
    }
    if (!/^\d{4}$/.test(pinInput)) {
      setAuthError(lang === 'th' ? 'กรุณาตั้งรหัส PIN เป็นตัวเลข 4 หลัก' : 'PIN must be 4 digits');
      return;
    }
    if (pinInput !== confirmPinInput) {
      setAuthError(lang === 'th' ? 'รหัส PIN ทั้ง 2 ช่องไม่ตรงกัน' : 'PINs do not match');
      return;
    }

    setAuthLoading(true);
    try {
      const userRef = doc(db, 'users', cleanId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setAuthError(
          lang === 'th'
            ? `ชื่อ "${rawName}" มีคนใช้แล้ว กรุณาใช้ชื่ออื่นหรือสลับไปแท็บเข้าสู่ระบบ`
            : `Player ID "${rawName}" is already taken.`
        );
        setAuthLoading(false);
        return;
      }

      await setDoc(userRef, {
        id: cleanId,
        displayName: rawName,
        avatar: selectedAvatar,
        pin: pinInput,
        score: 0,
        gamesPlayed: 0,
        bestStreak: 0,
        survivalScore: 0,
        survivalBestRound: 0,
        createdAt: serverTimestamp()
      });

      const loggedUser = {
        id: cleanId,
        displayName: rawName,
        avatar: selectedAvatar,
        score: 0,
        gamesPlayed: 0,
        bestStreak: 0,
        survivalScore: 0,
        survivalBestRound: 0
      };
      setUser(loggedUser);
      localStorage.setItem('reverse_trivia_user', JSON.stringify(loggedUser));
      setLocalPlayers([
        { name: loggedUser.displayName, avatar: loggedUser.avatar, score: 0 },
        { name: lang === 'th' ? 'ผู้เล่น 2' : 'Player 2', avatar: '🦊', score: 0 }
      ]);
    } catch (err) {
      setAuthError((lang === 'th' ? 'สมัครสมาชิกไม่สำเร็จ: ' : 'Register failed: ') + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser = {
      id: 'guest_' + Math.floor(1000 + Math.random() * 9000),
      displayName: lang === 'th' ? 'ผู้เล่นทั่วไป (Guest)' : 'Guest Player',
      avatar: '👾',
      score: 0,
      gamesPlayed: 0,
      bestStreak: 0,
      survivalScore: 0,
      survivalBestRound: 0,
      isGuest: true
    };
    setUser(guestUser);
    setLocalPlayers([
      { name: guestUser.displayName, avatar: '👾', score: 0 },
      { name: lang === 'th' ? 'ผู้เล่น 2' : 'Player 2', avatar: '🦊', score: 0 }
    ]);
  };

  const handleLogout = () => {
    localStorage.removeItem('reverse_trivia_user');
    setUser(null);
    setScreen('lobby');
    setActiveRoomCode('');
    setRoomData(null);
    setPinInput('');
    setConfirmPinInput('');
    setAuthError('');
    setSuggestRegister(false);
  };

  // =========================================================================
  // AI Question Generator (Open-ended Fill-in-the-blank questions!)
  // =========================================================================
  const fetchQuestions = useCallback(
    async (category, count, customTopicText = '', bans = []) => {
      setLoadingQuestions(true);
      const trimmedTopic = customTopicText.trim();
      const catObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
      const targetTopic = trimmedTopic || `${catObj.en} (${catObj.th})`;

      const bannedStrings = bans.map((b) => {
        const preset = CATEGORIES.find((c) => c.id === b);
        return preset ? `${preset.en} (${preset.th})` : b;
      });
      const banClause =
        bannedStrings.length > 0
          ? `STRICTLY BAN / EXCLUDE any topics related to: ${bannedStrings.join(', ')}.`
          : '';

      try {
        const prompt = `Generate ${count} open-ended fill-in-the-blank "Reverse Trivia" survey questions in BOTH Thai and English about: "${targetTopic}".
${banClause}
Rules:
- DO NOT make multiple choice options. Players will type a free-text answer!
- Each question asks players to name ONE item/thing/action in a category where the goal is to pick a valid answer that the FEWEST people in a 100-person survey would say.
- Include "commonKeywords" (array of 5-8 mainstream answer words in Thai & English) and "crowdSummary" (top 3 mainstream answers with % in th & en).
- Return ONLY a valid JSON array with no markdown:
[{"question":{"th":"...","en":"..."},"commonKeywords":["..."],"crowdSummary":{"th":"คำตอบยอดฮิต: ...","en":"Top Crowd Answers: ..."}}]`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, contents: [{ parts: [{ text: prompt }] }] }),
          signal: controller.signal
        });
        clearTimeout(timer);

        if (!res.ok) throw new Error('fallback');
        const data = await res.json();
        const rawText = data?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = rawText.replace(/```json|```/gi, '').trim();
        const match = cleaned.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(match ? match[0] : cleaned);

        if (Array.isArray(parsed) && parsed.length >= Math.min(count, 3)) {
          const valid = parsed.slice(0, count).map((item) => ({
            question: {
              th: item?.question?.th || item?.question?.en || 'ทายคำตอบที่คนเลือกน้อยที่สุด',
              en: item?.question?.en || item?.question?.th || 'Name the least common answer'
            },
            commonKeywords: Array.isArray(item?.commonKeywords) ? item.commonKeywords : [],
            crowdSummary: {
              th: item?.crowdSummary?.th || 'คำตอบยอดฮิต: ขึ้นอยู่กับผลโหวตของคนส่วนใหญ่',
              en: item?.crowdSummary?.en || 'Top Crowd Answers: Common everyday choices'
            }
          }));
          setQuestionSource(trimmedTopic ? 'ai-custom' : 'ai');
          setLoadingQuestions(false);
          return valid;
        }
        throw new Error('fallback');
      } catch (e) {
        const allowed = FALLBACK_QUESTIONS.filter((q) => !bans.includes(q.category));
        const matched =
          category === 'all' || trimmedTopic
            ? allowed
            : allowed.filter((q) => q.category === category);
        const pool = matched.length >= count ? matched : allowed.length > 0 ? allowed : FALLBACK_QUESTIONS;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        setQuestionSource('classic');
        setLoadingQuestions(false);
        return shuffled.slice(0, count);
      }
    },
    []
  );

  // =========================================================================
  // AI Answer Grader (ตรวจคำตอบแบบเติมคำ + ประเมินความหายาก + ชั้นหอคอย)
  // =========================================================================
  const gradeSingleAnswer = useCallback(async (questionObj, userAnswer, currentStreak = 0) => {
    setGradingAnswer(true);
    try {
      const prompt = `You are the AI Judge for a "Reverse Trivia" (ทายสวนกระแส) fill-in-the-blank game.
Question (TH): "${questionObj.question.th}"
Question (EN): "${questionObj.question.en}"
Player's Typed Answer: "${userAnswer}"

Evaluate the player's answer strictly and fairly:
1. "isValid": true ONLY if the answer genuinely and logically answers the question. If it is gibberish, nonsense, off-topic, or an empty trick, set isValid=false, pct=100, points=0, floors=0, isCrowdTrap=true.
2. "pct": integer 1-100 estimating what % of 100 everyday people would give this exact answer.
   - Very obvious/top mainstream answers = 35-65% (isCrowdTrap=true, points=0, floors=0).
   - Somewhat common answers = 20-34% (points=80, floors=1).
   - Valid, clever, rare answers = 3-19% (points=${170 + currentStreak * 25}, floors=3, isReverseWinner=true).
3. "comment": witty 1-sentence feedback in BOTH Thai ("th") and English ("en").
4. "crowdSummary": list the top 3 mainstream crowd answers with % in BOTH "th" and "en".

Return ONLY valid JSON with no markdown:
{"isValid":true,"pct":12,"points":170,"floors":3,"isReverseWinner":true,"isCrowdTrap":false,"comment":{"th":"...","en":"..."},"crowdSummary":{"th":"คำตอบยอดฮิต: ...","en":"Top Crowd Answers: ..."}}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error('fallback');
      const data = await res.json();
      const rawText = data?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json|```/gi, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : cleaned);

      if (typeof parsed?.pct === 'number') {
        const isCrowdTrap = parsed.isValid === false || parsed.pct >= 32 || parsed.isCrowdTrap === true;
        const isReverseWinner = !isCrowdTrap && parsed.pct <= 18;
        const points = isCrowdTrap
          ? 0
          : Number(parsed.points) > 0
          ? Number(parsed.points)
          : isReverseWinner
          ? 170 + currentStreak * 25
          : 90;
        const floors = isCrowdTrap ? 0 : Math.max(1, Math.min(4, Number(parsed.floors) || (isReverseWinner ? 3 : 1)));

        setGradingAnswer(false);
        return {
          isValid: parsed.isValid !== false,
          pct: Math.max(1, Math.min(100, Math.round(parsed.pct))),
          points,
          floors,
          isReverseWinner,
          isCrowdTrap,
          comment: {
            th: parsed?.comment?.th || (isCrowdTrap ? 'ใจตรงกับคนส่วนใหญ่!' : 'คำตอบสวนกระแสยอดเยี่ยม!'),
            en: parsed?.comment?.en || (isCrowdTrap ? 'Too mainstream!' : 'Great rare answer!')
          },
          crowdSummary: {
            th: parsed?.crowdSummary?.th || questionObj?.crowdSummary?.th || '',
            en: parsed?.crowdSummary?.en || questionObj?.crowdSummary?.en || ''
          }
        };
      }
      throw new Error('fallback');
    } catch (e) {
      setGradingAnswer(false);
      return evaluateAnswerLocally(questionObj, userAnswer, currentStreak);
    }
  }, []);

  // Batch AI Grader for Multiplayer (Pass & Play / Online Room)
  const gradeBatchAnswers = useCallback(async (questionObj, entries) => {
    setGradingAnswer(true);
    try {
      const formattedList = entries.map((e) => `ID "${e.id}" (${e.name}): "${e.answer}"`).join('\n');
      const prompt = `You are the AI Judge for a multiplayer "Reverse Trivia" fill-in-the-blank game.
Question (TH): "${questionObj.question.th}"
Question (EN): "${questionObj.question.en}"

Players' Typed Answers:
${formattedList}

Evaluate EACH player's answer:
- "isValid": true only if it validly answers the question (gibberish/blank = false, pct=100, points=0, floors=0).
- "pct": integer 1-100 (how common in a 100-person survey; lower = rarer = better!).
- "points": 0 if invalid or pct >= 35; 80-110 if pct 20-34; 160-220 if pct <= 19.
- "floors": 0 if 0 pts, 1-3 based on points.
- "comment": short 1-sentence comment in Thai ("th") and English ("en").

Return ONLY valid JSON:
{"crowdSummary":{"th":"คำตอบยอดฮิต: ...","en":"Top Crowd Answers: ..."},"results":{"PLAYER_ID":{"isValid":true,"pct":14,"points":180,"floors":3,"comment":{"th":"...","en":"..."}}}}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error('fallback');
      const data = await res.json();
      const rawText = data?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json|```/gi, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : cleaned);

      if (parsed?.results) {
        const mapped = {};
        entries.forEach((entry) => {
          const r = parsed.results[entry.id];
          if (r && typeof r.pct === 'number') {
            const trap = r.isValid === false || r.pct >= 35;
            mapped[entry.id] = {
              isValid: r.isValid !== false,
              pct: Math.max(1, Math.min(100, Math.round(r.pct))),
              points: trap ? 0 : Math.max(50, Number(r.points) || 120),
              floors: trap ? 0 : Math.max(1, Math.min(4, Number(r.floors) || 2)),
              comment: {
                th: r?.comment?.th || (trap ? 'ตรงกับกระแสหลัก' : 'คำตอบแหวกแนว!'),
                en: r?.comment?.en || (trap ? 'Too common!' : 'Rare pick!')
              }
            };
          } else {
            mapped[entry.id] = evaluateAnswerLocally(questionObj, entry.answer, 0);
          }
        });
        setGradingAnswer(false);
        return {
          crowdSummary: {
            th: parsed?.crowdSummary?.th || questionObj?.crowdSummary?.th || '',
            en: parsed?.crowdSummary?.en || questionObj?.crowdSummary?.en || ''
          },
          results: mapped
        };
      }
      throw new Error('fallback');
    } catch (e) {
      const mapped = {};
      entries.forEach((entry) => {
        mapped[entry.id] = evaluateAnswerLocally(questionObj, entry.answer, 0);
      });
      setGradingAnswer(false);
      return {
        crowdSummary: questionObj?.crowdSummary || { th: '', en: '' },
        results: mapped
      };
    }
  }, []);

  // Save Progress to Firestore
  const savePlayerProgress = useCallback(
    async ({ earnedScore = 0, newBestStreak = 0, survivalRunScore = 0, survivalRounds = 0 }) => {
      if (!user || user.isGuest) return;
      try {
        const updatedBestStreak = Math.max(user.bestStreak || 0, newBestStreak || 0);
        const updatedSurvScore = Math.max(user.survivalScore || 0, survivalRunScore || 0);
        const updatedSurvRound = Math.max(user.survivalBestRound || 0, survivalRounds || 0);

        await updateDoc(doc(db, 'users', user.id), {
          score: increment(earnedScore),
          gamesPlayed: increment(1),
          bestStreak: updatedBestStreak,
          survivalScore: updatedSurvScore,
          survivalBestRound: updatedSurvRound
        });

        const updatedUser = {
          ...user,
          score: (user.score || 0) + earnedScore,
          gamesPlayed: (user.gamesPlayed || 0) + 1,
          bestStreak: updatedBestStreak,
          survivalScore: updatedSurvScore,
          survivalBestRound: updatedSurvRound
        };
        setUser(updatedUser);
        localStorage.setItem('reverse_trivia_user', JSON.stringify(updatedUser));
      } catch (e) {}
    },
    [user]
  );

  // =========================================================================
  // Solo Mode Handlers
  // =========================================================================
  const startSoloGame = async () => {
    const qs = await fetchQuestions(selectedCategory, totalRounds, customCategory, bannedCategories);
    setQuestions(qs);
    setSoloRound(0);
    setSoloScore(0);
    setSoloStreak(0);
    setSoloBestStreak(0);
    setSoloAnswerInput('');
    setSoloResult(null);
    setSoloFinished(false);
    setLastTowerGain(null);
    setScreen('solo');
  };

  const handleSoloSubmit = async (e) => {
    e.preventDefault();
    if (soloResult || gradingAnswer || !soloAnswerInput.trim()) return;
    const res = await gradeSingleAnswer(questions[soloRound], soloAnswerInput.trim(), soloStreak);
    setSoloResult(res);

    if (res.points > 0) {
      triggerConfetti();
      setLastTowerGain({ id: Date.now(), points: res.points, floors: res.floors });
    } else {
      triggerShake();
    }

    const nextStreak = res.isReverseWinner ? soloStreak + 1 : 0;
    setSoloScore((p) => p + res.points);
    setSoloStreak(nextStreak);
    setSoloBestStreak((p) => Math.max(p, nextStreak));
  };

  const handleSoloNext = async () => {
    if (soloRound + 1 < questions.length) {
      setSoloRound((p) => p + 1);
      setSoloAnswerInput('');
      setSoloResult(null);
    } else {
      setSoloFinished(true);
      triggerConfetti();
      await savePlayerProgress({ earnedScore: soloScore, newBestStreak: soloBestStreak });
    }
  };

  // =========================================================================
  // Survival Mode Handlers
  // =========================================================================
  const startSurvivalGame = async () => {
    const qs = await fetchQuestions(selectedCategory, 5, customCategory, bannedCategories);
    setQuestions(qs);
    setSurvivalLives(3);
    setSurvivalRound(1);
    setSurvivalBatchIdx(0);
    setSurvivalScore(0);
    setSurvivalStreak(0);
    setSurvivalBestStreak(0);
    setSurvivalAnswerInput('');
    setSurvivalResult(null);
    setSurvivalFinished(false);
    setSurvivalHealNotice(false);
    setLastTowerGain(null);
    setScreen('survival');
  };

  const handleSurvivalSubmit = async (e) => {
    e.preventDefault();
    if (survivalResult || gradingAnswer || !survivalAnswerInput.trim()) return;
    setSurvivalHealNotice(false);

    const res = await gradeSingleAnswer(questions[survivalBatchIdx], survivalAnswerInput.trim(), survivalStreak);
    setSurvivalResult(res);

    const nextScore = survivalScore + res.points;
    const nextStreak = res.isReverseWinner ? survivalStreak + 1 : 0;
    const nextBestStreak = Math.max(survivalBestStreak, nextStreak);
    let nextLives = res.isCrowdTrap ? survivalLives - 1 : survivalLives;

    if (res.points > 0) {
      triggerConfetti();
      setLastTowerGain({ id: Date.now(), points: res.points, floors: res.floors });
      if (res.isReverseWinner && nextStreak > 0 && nextStreak % 3 === 0 && nextLives < 3) {
        nextLives += 1;
        setSurvivalHealNotice(true);
      }
    } else {
      triggerShake();
    }

    setSurvivalScore(nextScore);
    setSurvivalStreak(nextStreak);
    setSurvivalBestStreak(nextBestStreak);
    setSurvivalLives(nextLives);

    if (nextLives <= 0) {
      setTimeout(async () => {
        setSurvivalFinished(true);
        await savePlayerProgress({
          earnedScore: nextScore,
          newBestStreak: nextBestStreak,
          survivalRunScore: nextScore,
          survivalRounds: survivalRound
        });
      }, 1300);
    }
  };

  const handleSurvivalNext = async () => {
    if (survivalLives <= 0) {
      setSurvivalFinished(true);
      return;
    }
    setSurvivalHealNotice(false);
    if (survivalBatchIdx + 1 < questions.length) {
      setSurvivalBatchIdx((p) => p + 1);
      setSurvivalRound((p) => p + 1);
      setSurvivalAnswerInput('');
      setSurvivalResult(null);
    } else {
      const nextBatch = await fetchQuestions(selectedCategory, 5, customCategory, bannedCategories);
      setQuestions(nextBatch);
      setSurvivalBatchIdx(0);
      setSurvivalRound((p) => p + 1);
      setSurvivalAnswerInput('');
      setSurvivalResult(null);
    }
  };

  // =========================================================================
  // Local Pass & Play Handlers (Fill-in-the-blank)
  // =========================================================================
  const startLocalGame = async () => {
    const cleaned = localPlayers.map((p, idx) => ({
      ...p,
      name: p.name.trim() || (lang === 'th' ? `ผู้เล่น ${idx + 1}` : `Player ${idx + 1}`),
      score: 0
    }));
    setLocalPlayers(cleaned);
    const qs = await fetchQuestions(selectedCategory, totalRounds, customCategory, bannedCategories);
    setQuestions(qs);
    setLocalRound(0);
    setLocalTurnIndex(0);
    setLocalPrivacyScreen(true);
    setLocalInputText('');
    setLocalAnswers({});
    setLocalResults(null);
    setLocalFinished(false);
    setScreen('local_game');
  };

  const handleLocalSecretSubmit = async (e) => {
    e.preventDefault();
    if (!localInputText.trim() || gradingAnswer) return;
    const updatedAnswers = { ...localAnswers, [localTurnIndex]: localInputText.trim() };
    setLocalAnswers(updatedAnswers);
    setLocalInputText('');

    if (localTurnIndex + 1 < localPlayers.length) {
      setLocalTurnIndex(localTurnIndex + 1);
      setLocalPrivacyScreen(true);
    } else {
      const entries = localPlayers.map((p, idx) => ({
        id: String(idx),
        name: p.name,
        answer: updatedAnswers[idx]
      }));
      const graded = await gradeBatchAnswers(questions[localRound], entries);
      const scored = localPlayers.map((p, idx) => {
        const r = graded.results[String(idx)];
        return {
          ...p,
          lastAnswer: updatedAnswers[idx],
          lastEval: r,
          score: p.score + (r?.points || 0)
        };
      });
      setLocalPlayers(scored);
      setLocalResults(graded);
      triggerConfetti();
    }
  };

  const handleLocalNextRound = async () => {
    if (localRound + 1 < questions.length) {
      setLocalRound((p) => p + 1);
      setLocalTurnIndex(0);
      setLocalPrivacyScreen(true);
      setLocalInputText('');
      setLocalAnswers({});
      setLocalResults(null);
    } else {
      setLocalFinished(true);
      triggerConfetti();
      if (localPlayers[0]?.score > 0) {
        await savePlayerProgress({ earnedScore: localPlayers[0].score });
      }
    }
  };

  // =========================================================================
  // Online Multiplayer Handlers (Fill-in-the-blank)
  // =========================================================================
  const createOnlineRoom = async () => {
    setOnlineError('');
    setOnlineLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const qs = await fetchQuestions(selectedCategory, totalRounds, customCategory, bannedCategories);
      await setDoc(doc(db, 'rooms', code), {
        code,
        hostId: user.id,
        status: 'waiting',
        currentRound: 0,
        topicLabel: customCategory.trim() || (CATEGORIES.find((c) => c.id === selectedCategory)?.th ?? 'สุ่มทุกหมวด'),
        questions: qs,
        crowdSummary: null,
        players: {
          [user.id]: {
            id: user.id,
            displayName: user.displayName,
            avatar: user.avatar || '😎',
            score: 0,
            currentAnswer: null,
            lastEval: null
          }
        },
        createdAt: serverTimestamp()
      });
      setActiveRoomCode(code);
      setOnlineAnswerInput('');
      setScreen('online_lobby');
    } catch (err) {
      setOnlineError((lang === 'th' ? 'สร้างห้องไม่สำเร็จ: ' : 'Create failed: ') + err.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const joinOnlineRoom = async () => {
    setOnlineError('');
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      setOnlineError(lang === 'th' ? 'กรุณากรอกรหัสห้องให้ถูกต้อง' : 'Enter valid room code');
      return;
    }
    setOnlineLoading(true);
    try {
      const roomRef = doc(db, 'rooms', code);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        setOnlineError(lang === 'th' ? `ไม่พบห้องรหัส "${code}"` : `Room "${code}" not found`);
        setOnlineLoading(false);
        return;
      }
      await updateDoc(roomRef, {
        [`players.${user.id}`]: {
          id: user.id,
          displayName: user.displayName,
          avatar: user.avatar || '😎',
          score: 0,
          currentAnswer: null,
          lastEval: null
        }
      });
      setActiveRoomCode(code);
      setOnlineAnswerInput('');
      setScreen('online_lobby');
    } catch (err) {
      setOnlineError((lang === 'th' ? 'เข้าห้องไม่สำเร็จ: ' : 'Join failed: ') + err.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const submitOnlineAnswer = async (e) => {
    e.preventDefault();
    if (!roomData || !activeRoomCode || !onlineAnswerInput.trim()) return;
    const me = roomData.players?.[user.id];
    if (!me || me.currentAnswer !== null) return;

    const text = onlineAnswerInput.trim();
    setOnlineAnswerInput('');

    await updateDoc(doc(db, 'rooms', activeRoomCode), {
      [`players.${user.id}.currentAnswer`]: text
    });
  };

  const gradeAndRevealOnlineRoom = async () => {
    if (!roomData || !activeRoomCode || gradingAnswer) return;
    const currentQ = roomData.questions[roomData.currentRound];
    const playersList = Object.values(roomData.players || {});
    const entries = playersList.map((p) => ({
      id: p.id,
      name: p.displayName,
      answer: p.currentAnswer || ''
    }));

    const graded = await gradeBatchAnswers(currentQ, entries);
    const updatedPlayers = {};
    playersList.forEach((p) => {
      const evalObj = p.currentAnswer
        ? graded.results[p.id]
        : { isValid: false, pct: 100, points: 0, floors: 0, comment: { th: 'ไม่ได้ส่งคำตอบทันเวลา', en: 'No answer submitted' } };
      updatedPlayers[p.id] = {
        ...p,
        lastEval: evalObj,
        score: (p.score || 0) + (evalObj?.points || 0)
      };
    });

    await updateDoc(doc(db, 'rooms', activeRoomCode), {
      players: updatedPlayers,
      crowdSummary: graded.crowdSummary,
      status: 'reveal'
    });
  };

  // Auto-trigger AI grading when all players in room submit
  useEffect(() => {
    if (!roomData || roomData.status !== 'playing') return;
    if (roomData.hostId !== user?.id) return;
    const list = Object.values(roomData.players || {});
    if (list.length > 0 && list.every((p) => p.currentAnswer !== null)) {
      gradeAndRevealOnlineRoom();
    }
  }, [roomData, user?.id]);

  const nextOnlineRound = async () => {
    if (!roomData || !activeRoomCode) return;
    const nextIdx = roomData.currentRound + 1;
    if (nextIdx < roomData.questions.length) {
      const reset = {};
      Object.values(roomData.players || {}).forEach((p) => {
        reset[p.id] = { ...p, currentAnswer: null, lastEval: null };
      });
      await updateDoc(doc(db, 'rooms', activeRoomCode), {
        players: reset,
        crowdSummary: null,
        currentRound: nextIdx,
        status: 'playing'
      });
    } else {
      await updateDoc(doc(db, 'rooms', activeRoomCode), { status: 'finished' });
      const myFinal = roomData.players?.[user.id]?.score || 0;
      if (myFinal > 0) await savePlayerProgress({ earnedScore: myFinal });
    }
  };

  const shareRoomInvite = () => {
    const inviteUrl = `${window.location.origin}/?room=${activeRoomCode}`;
    shareLink({
      title: `Reverse Trivia — ห้อง ${activeRoomCode}`,
      text:
        lang === 'th'
          ? `มาเล่น Reverse Trivia ห้อง ${activeRoomCode} ด้วยกัน! กดลิงก์เพื่อเข้าห้องเลย:`
          : `Join my Reverse Trivia room ${activeRoomCode}!`,
      url: inviteUrl,
      isRoom: true
    });
  };

  const renderTopBar = () => (
    <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 mb-6 bg-[#0f1626]/90 backdrop-blur-md border border-slate-800 rounded-2xl px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveRoomCode('');
            setRoomData(null);
            setScreen('lobby');
          }}
          className="btn-press w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xl border border-slate-700"
        >
          {user.avatar || '😎'}
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">{user.displayName}</span>
            {!user.isGuest && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                @{user.id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Trophy className="w-3.5 h-3.5" />
              {user.score || 0}
            </span>
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <Skull className="w-3.5 h-3.5" />
              {user.survivalScore || 0}
            </span>
            <span className="flex items-center gap-1 text-orange-400">
              <Flame className="w-3.5 h-3.5" />
              {user.bestStreak || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            shareLink({
              url: activeRoomCode ? `${window.location.origin}/?room=${activeRoomCode}` : window.location.origin
            })
          }
          className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-semibold border border-indigo-500/30"
        >
          <Share2 className="w-3.5 h-3.5" />
          {lang === 'th' ? 'แชร์ลิงก์' : 'Share'}
        </button>
        <button
          type="button"
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          className="btn-press flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          {lang === 'th' ? 'TH' : 'EN'}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="btn-press flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          {lang === 'th' ? 'ออก' : 'Logout'}
        </button>
      </div>
    </div>
  );

  // =========================================================================
  // 1. หน้าเข้าสู่ระบบ & สมัคร ID ใหม่
  // =========================================================================
  if (!user) {
    return (
      <div className="relative min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4 overflow-hidden">
        <GlobalStyles />
        <AmbientBackground />
        <ToastBanner message={toastMsg} />

        <div className="relative z-10 anim-fade-up w-full max-w-md bg-[#0f1626]/95 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="anim-float w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Reverse Trivia</h1>
                <p className="text-xs text-indigo-400">
                  {lang === 'th' ? 'พิมพ์คำตอบสวนกระแส • AI ตรวจปีนหอคอย' : 'Type Rare Answers • Climb the Tower'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              {lang === 'th' ? 'TH' : 'EN'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#080d18] rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setAuthError('');
                setSuggestRegister(false);
              }}
              className={`btn-press flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold ${
                authTab === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              {lang === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setAuthError('');
                setSuggestRegister(false);
              }}
              className={`btn-press flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold ${
                authTab === 'register' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              {lang === 'th' ? 'สมัคร ID ใหม่' : 'Register ID'}
            </button>
          </div>

          {authError && (
            <div className="anim-pop mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
              {suggestRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setConfirmPinInput(pinInput);
                    setAuthError('');
                    setSuggestRegister(false);
                  }}
                  className="btn-press mt-2.5 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {lang === 'th'
                    ? `สมัครชื่อ "${playerIdInput.trim()}" เป็น ID ใหม่เลย`
                    : `Register "${playerIdInput.trim()}" Now`}
                </button>
              )}
            </div>
          )}

          <form onSubmit={authTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {authTab === 'register' && (
              <div className="anim-fade-up">
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  {lang === 'th' ? 'เลือกรูปโปรไฟล์ของคุณ' : 'Choose Avatar'}
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setSelectedAvatar(av)}
                      className={`btn-press h-10 rounded-xl text-xl flex items-center justify-center border ${
                        selectedAvatar === av
                          ? 'bg-emerald-500/20 border-emerald-400 scale-105'
                          : 'bg-[#080d18] border-slate-800'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {lang === 'th' ? 'ชื่อผู้เล่น (Player ID)' : 'Player ID'}
              </label>
              <input
                type="text"
                value={playerIdInput}
                onChange={(e) => setPlayerIdInput(e.target.value)}
                placeholder={lang === 'th' ? 'เช่น somchai99' : 'e.g. player99'}
                className="w-full px-4 py-3 rounded-xl bg-[#080d18] border border-slate-800 focus:border-indigo-500 focus:outline-none text-white text-sm"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-400">
                  {lang === 'th' ? 'รหัส PIN ตัวเลข 4 หลัก' : '4-Digit PIN'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPin ? (lang === 'th' ? 'ซ่อน' : 'Hide') : (lang === 'th' ? 'แสดง' : 'Show')}
                </button>
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl bg-[#080d18] border border-slate-800 focus:border-indigo-500 focus:outline-none text-white text-center tracking-[0.6em] text-lg font-bold"
                required
              />
            </div>

            {authTab === 'register' && (
              <div className="anim-fade-up">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {lang === 'th' ? 'ยืนยันรหัส PIN 4 หลักอีกครั้ง' : 'Confirm 4-Digit PIN'}
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-4 py-3 rounded-xl bg-[#080d18] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-center tracking-[0.6em] text-lg font-bold"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className={`btn-press w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 ${
                authTab === 'login' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'
              } disabled:opacity-50`}
            >
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : authTab === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  {lang === 'th' ? 'เข้าเล่นเกม' : 'Sign In & Play'}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {lang === 'th' ? 'ยืนยันสมัคร ID และเข้าเล่น' : 'Create ID & Play'}
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="text-xs text-slate-400 hover:text-indigo-300 underline underline-offset-4"
            >
              {lang === 'th'
                ? 'เข้าเล่นแบบไม่ใช้ ID (ทดลองเล่น / เล่นกับเพื่อนในเครื่อง)'
                : 'Continue as Guest'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. หน้าหลักเลือกโหมด (LOBBY)
  // =========================================================================
  if (screen === 'lobby') {
    const activeBoard = leaderboardTab === 'hof' ? hofLeaderboard : survivalLeaderboard;

    return (
      <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-x-hidden">
        <GlobalStyles />
        <AmbientBackground />
        <ToastBanner message={toastMsg} />
        {renderTopBar()}

        <div className="relative z-10 w-full max-w-3xl mx-auto space-y-6 anim-fade-up">
          {/* Hero Rule Card */}
          <div className="bg-gradient-to-r from-indigo-950/90 via-purple-950/70 to-slate-900/90 border border-indigo-500/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-base mb-1">
                <Mountain className="w-5 h-5 text-amber-400" />
                {lang === 'th'
                  ? 'พิมพ์คำตอบสวนกระแส ให้ AI ตรวจและปีนขึ้นยอดหอคอย!'
                  : 'Type rare answers for AI grading & climb the Tower!'}
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                {lang === 'th'
                  ? 'ยิ่งคำตอบของคุณแหวกแนวและตรงกับคนส่วนน้อยเท่าไหร่ AI ยิ่งให้คะแนนสูงและปีนหอคอยขึ้นไวขึ้น!'
                  : 'The rarer your typed answer in a 100-person survey, the higher you climb the tower!'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => shareLink({ url: window.location.origin })}
              className="btn-press shrink-0 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
            >
              <Share2 className="w-4 h-4" />
              {lang === 'th' ? 'ชวนเพื่อนเล่น' : 'Invite Friends'}
            </button>
          </div>

          {/* Custom AI Category + Ban Category Panel */}
          <div className="bg-[#0f1626]/90 backdrop-blur-md border border-slate-800 rounded-3xl p-5 space-y-5 shadow-lg">
            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-indigo-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  {lang === 'th'
                    ? 'พิมพ์หมวดหมู่เอง (AI จะสร้างคำถามเติมคำให้ตรงหัวข้อ)'
                    : 'Type Custom Topic (AI Generates Open Questions)'}
                </span>
                {customCategory.trim() && (
                  <button
                    type="button"
                    onClick={() => setCustomCategory('')}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" /> {lang === 'th' ? 'ล้าง' : 'Clear'}
                  </button>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder={
                    lang === 'th'
                      ? 'เช่น อนิเมะญี่ปุ่น, เกม ROV, K-Pop, ชีวิตเด็กหอ, ของกินเซเว่น...'
                      : 'e.g. Anime, Marvel, Football, Office Life...'
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-[#080d18] border border-slate-700 focus:border-indigo-500 focus:outline-none text-sm text-white placeholder:text-slate-500"
                />
                {customCategory.trim() && (
                  <span className="anim-pop absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
                    ✨ AI Topic
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  {lang === 'th'
                    ? 'หรือเลือกหมวดหมู่หลัก (กด 🚫 เพื่อแบนหมวด)'
                    : 'Or Pick Preset Category (Tap 🚫 to Ban)'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => {
                    const isBanned = bannedCategories.includes(c.id);
                    const isSelected = !customCategory.trim() && selectedCategory === c.id && !isBanned;
                    return (
                      <div key={c.id} className="flex items-center">
                        <button
                          type="button"
                          disabled={isBanned}
                          onClick={() => {
                            setCustomCategory('');
                            setSelectedCategory(c.id);
                          }}
                          className={`btn-press px-3 py-1.5 text-xs font-semibold border ${
                            c.id === 'all' ? 'rounded-xl' : 'rounded-l-xl border-r-0'
                          } ${
                            isBanned
                              ? 'bg-rose-950/30 border-rose-500/30 text-rose-400/60 line-through cursor-not-allowed'
                              : isSelected
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-[#080d18] border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {lang === 'th' ? c.th : c.en}
                        </button>
                        {c.id !== 'all' && (
                          <button
                            type="button"
                            onClick={() => toggleBanPreset(c.id)}
                            className={`btn-press px-2 py-1.5 rounded-r-xl border text-xs ${
                              isBanned
                                ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                                : 'bg-[#080d18] border-slate-800 text-slate-500 hover:text-rose-400'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  {lang === 'th' ? 'จำนวนข้อ (โหมดปกติ)' : 'Rounds (Standard)'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTotalRounds(num)}
                      className={`btn-press py-2 rounded-xl text-sm font-bold border ${
                        totalRounds === num
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-[#080d18] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 shrink-0">
                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                  {lang === 'th' ? 'แบนหัวข้อเพิ่มเติม:' : 'Ban Topics:'}
                </div>
                <div className="flex flex-1 gap-2">
                  <input
                    type="text"
                    value={customBanInput}
                    onChange={(e) => setCustomBanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomBan();
                      }
                    }}
                    placeholder={lang === 'th' ? 'พิมพ์หัวข้อที่ไม่อยากเจอ เช่น ผี, การเมือง...' : 'e.g. Politics, Horror...'}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#080d18] border border-slate-800 focus:border-rose-500/60 focus:outline-none text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={addCustomBan}
                    className="btn-press px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {lang === 'th' ? 'แบน' : 'Ban'}
                  </button>
                </div>
              </div>

              {bannedLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {bannedLabels.map((item) => (
                    <span
                      key={item.key}
                      className="anim-pop inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-semibold"
                    >
                      🚫 {item.label}
                      <button
                        type="button"
                        onClick={() => setBannedCategories((prev) => prev.filter((x) => x !== item.key))}
                        className="hover:text-white ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4 Game Modes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#0f1626]/90 border border-slate-800 hover:border-indigo-500/50 transition-colors rounded-3xl p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-3">
                  <User className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-base text-white mb-1">
                  {lang === 'th' ? 'เล่นคนเดียว (Solo)' : 'Solo Mode'}
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  {lang === 'th'
                    ? 'พิมพ์คำตอบให้ AI ตรวจความแหวกแนว ปีนหอคอยทำคะแนนเข้า Hall of Fame'
                    : 'Type rare answers for AI grading and climb the tower.'}
                </p>
              </div>
              <button
                type="button"
                disabled={loadingQuestions}
                onClick={startSoloGame}
                className="btn-press w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                {loadingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {lang === 'th' ? 'เริ่มเล่นคนเดียว' : 'Play Solo'}
              </button>
            </div>

            <div className="bg-gradient-to-br from-[#191020] to-[#0f1626] border border-rose-500/40 hover:border-rose-400/70 transition-colors rounded-3xl p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                    <Skull className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300">
                    ❤️❤️❤️ {lang === 'th' ? 'ปีนไม่จำกัด' : 'Endless'}
                  </span>
                </div>
                <h2 className="font-bold text-base text-white mb-1">
                  {lang === 'th' ? 'โหมดเอาชีวิตรอด (Survival)' : 'Survival Mode'}
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  {lang === 'th'
                    ? 'มี 3 หัวใจ! ตอบตรงกระแสหลักเสีย 1 หัวใจ สตรีคครบ 3 ได้หัวใจคืน +1 ปีนหอคอยให้สูงที่สุด!'
                    : '3 lives! Avoid mainstream answers, hit 3-streaks to heal, climb as high as possible!'}
                </p>
              </div>
              <button
                type="button"
                disabled={loadingQuestions}
                onClick={startSurvivalGame}
                className="btn-press w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
              >
                {loadingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {lang === 'th' ? 'ลุยโหมดเอาชีวิตรอด!' : 'Play Survival!'}
              </button>
            </div>

            <div className="bg-[#0f1626]/90 border border-emerald-500/35 hover:border-emerald-400/60 transition-colors rounded-3xl p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                    2–8 {lang === 'th' ? 'คน' : 'Players'}
                  </span>
                </div>
                <h2 className="font-bold text-base text-white mb-1">
                  {lang === 'th' ? 'หลายคนในเครื่องเดียว' : 'Pass & Play'}
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  {lang === 'th'
                    ? 'ผลัดกันแอบพิมพ์คำตอบทีละคนบนเครื่องเดียว แล้วให้ AI ตรวจแข่งกันปีนหอคอย'
                    : 'Secretly type answers on one device and let AI score everyone together.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScreen('local_setup')}
                className="btn-press w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                {lang === 'th' ? 'ตั้งค่าผู้เล่นในเครื่อง' : 'Setup Pass & Play'}
              </button>
            </div>

            <div className="bg-[#0f1626]/90 border border-purple-500/35 hover:border-purple-400/60 transition-colors rounded-3xl p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3">
                  <Wifi className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-base text-white mb-1">
                  {lang === 'th' ? 'ห้องออนไลน์กับเพื่อน' : 'Online Multiplayer'}
                </h2>
                <p className="text-xs text-slate-400 mb-3">
                  {lang === 'th'
                    ? 'สร้างห้องรับลิงก์ชวนเพื่อน หรือกรอกรหัสห้อง 6 หลักเพื่อพิมพ์คำตอบแข่งกัน'
                    : 'Create a shareable room or join via 6-digit code.'}
                </p>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={onlineLoading || loadingQuestions}
                  onClick={createOnlineRoom}
                  className="btn-press w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {onlineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {lang === 'th' ? 'สร้างห้องออนไลน์ใหม่' : 'Create Online Room'}
                </button>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    maxLength={6}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder={lang === 'th' ? 'รหัสห้อง 6 หลัก' : 'ROOM CODE'}
                    className="w-full px-3 py-2 rounded-xl bg-[#080d18] border border-slate-700 text-xs text-white uppercase"
                  />
                  <button
                    type="button"
                    disabled={onlineLoading}
                    onClick={joinOnlineRoom}
                    className="btn-press px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 shrink-0"
                  >
                    {lang === 'th' ? 'เข้าห้อง' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {onlineError && (
            <div className="anim-pop p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{onlineError}</span>
            </div>
          )}

          {/* Leaderboard: Hall of Fame & Survival Mode */}
          <div className="bg-[#0f1626]/90 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-base text-white">
                {leaderboardTab === 'hof' ? (
                  <Crown className="w-5 h-5 text-amber-400" />
                ) : (
                  <Skull className="w-5 h-5 text-rose-400" />
                )}
                {leaderboardTab === 'hof'
                  ? lang === 'th' ? 'หอเกียรติยศ (Hall of Fame)' : 'Hall of Fame'
                  : lang === 'th' ? 'สถิติโหมดเอาชีวิตรอด (Survival)' : 'Survival Top Scores'}
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#080d18] rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLeaderboardTab('hof')}
                  className={`btn-press px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                    leaderboardTab === 'hof'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Medal className="w-3.5 h-3.5" />
                  Hall of Fame
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardTab('survival')}
                  className={`btn-press px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                    leaderboardTab === 'survival'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Skull className="w-3.5 h-3.5" />
                  Survival
                </button>
              </div>
            </div>

            {activeBoard.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {leaderboardTab === 'survival'
                  ? lang === 'th'
                    ? 'ยังไม่มีสถิติโหมดเอาชีวิตรอด — ลองเล่นเป็นคนแรกเพื่อขึ้นอันดับ 1 เลย!'
                    : 'No Survival records yet. Be the first!'
                  : lang === 'th'
                  ? 'ยังไม่มีข้อมูลอันดับผู้เล่น'
                  : 'No leaderboard data yet'}
              </div>
            ) : (
              <div className="space-y-2">
                {activeBoard.map((item, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  const isMe = item.id === user.id;
                  const pts = leaderboardTab === 'hof' ? item.score || 0 : item.survivalScore || 0;
                  const flr = Math.floor(pts / 50);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border ${
                        idx === 0
                          ? 'bg-amber-500/10 border-amber-500/35'
                          : isMe
                          ? 'bg-indigo-500/10 border-indigo-500/40'
                          : 'bg-[#080d18] border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 text-center text-sm font-black text-amber-300 shrink-0">{medal}</span>
                        <span className="text-xl shrink-0">{item.avatar || '😎'}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-100 truncate">
                            {item.displayName || item.id}
                            {isMe && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200">
                                {lang === 'th' ? 'คุณ' : 'You'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>🏔️ {lang === 'th' ? `ชั้น ${flr}` : `Floor ${flr}`}</span>
                            {leaderboardTab === 'hof' ? (
                              <span>🔥 {item.bestStreak || 0}</span>
                            ) : (
                              <span>🛡️ {lang === 'th' ? `ด่าน ${item.survivalBestRound || 1}` : `R${item.survivalBestRound || 1}`}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span
                          className={`text-sm font-black ${
                            leaderboardTab === 'hof' ? 'text-amber-400' : 'text-rose-400'
                          }`}
                        >
                          {pts}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1">{lang === 'th' ? 'แต้ม' : 'pts'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. โหมดเล่นคนเดียว (SOLO — เติมคำตอบ + AI ตรวจ + ปีนหอคอย)
  // =========================================================================
  if (screen === 'solo') {
    const currentQ = questions[soloRound];

    if (soloFinished) {
      return (
        <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-hidden">
          <GlobalStyles />
          <AmbientBackground />
          <ToastBanner message={toastMsg} />
          {renderTopBar()}
          <div className="relative z-10 anim-pop w-full max-w-md mx-auto bg-[#0f1626] border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
            <ConfettiBurst active={fxConfetti} />
            <div className="text-4xl mb-2 anim-float">🏆</div>
            <h2 className="text-xl font-bold text-white mb-4">
              {lang === 'th' ? 'พิชิตหอคอยสำเร็จ!' : 'Tower Climb Complete!'}
            </h2>

            <TowerClimbWidget score={soloScore} avatar={user.avatar} lang={lang} compact />

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 rounded-2xl bg-[#080d18] border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'th' ? 'คะแนนรอบนี้' : 'Score'}</div>
                <div className="text-2xl font-bold text-amber-400">{soloScore}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#080d18] border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'th' ? 'สตรีคสูงสุด' : 'Best Streak'}</div>
                <div className="text-2xl font-bold text-orange-400">{soloBestStreak}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                shareLink({
                  title: 'Reverse Trivia Tower Score',
                  text:
                    lang === 'th'
                      ? `🏔️ ฉันปีนหอคอย Reverse Trivia ได้ถึงชั้นที่ ${Math.floor(soloScore / 50)} (${soloScore} แต้ม)! มาลองทายสวนกระแสกัน:`
                      : `🏔️ I climbed to Floor ${Math.floor(soloScore / 50)} (${soloScore} pts) in Reverse Trivia!`,
                  url: window.location.origin
                })
              }
              className="btn-press w-full mb-3 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {lang === 'th' ? 'แชร์ความสูงหอคอยให้เพื่อน' : 'Share Tower Climb'}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startSoloGame}
                className="btn-press py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {lang === 'th' ? 'เล่นอีกครั้ง' : 'Play Again'}
              </button>
              <button
                type="button"
                onClick={() => setScreen('lobby')}
                className="btn-press py-3 rounded-xl bg-slate-800 text-white font-bold text-sm"
              >
                {lang === 'th' ? 'กลับหน้าหลัก' : 'Lobby'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-x-hidden">
        <GlobalStyles />
        <AmbientBackground />
        <ToastBanner message={toastMsg} />
        {renderTopBar()}

        <div
          key={soloRound}
          className={`relative z-10 anim-fade-up w-full max-w-xl mx-auto bg-[#0f1626]/95 border border-slate-800 rounded-3xl p-6 shadow-2xl ${
            fxShake ? 'anim-shake border-rose-500/60' : ''
          }`}
        >
          <ConfettiBurst active={fxConfetti} />

          {/* Tower Climb Animation */}
          <TowerClimbWidget score={soloScore} avatar={user.avatar} lastGain={lastTowerGain} lang={lang} compact />

          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-indigo-400">
              {lang === 'th' ? `ข้อที่ ${soloRound + 1} / ${questions.length}` : `Q${soloRound + 1}/${questions.length}`}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                {questionSource === 'ai-custom' ? `✨ ${customCategory.trim()}` : '✨ AI Judge'}
              </span>
              <span className="text-orange-400 font-bold">🔥 {soloStreak}</span>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-5 leading-snug">
            {currentQ?.question[lang]}
          </h3>

          {!soloResult ? (
            <form onSubmit={handleSoloSubmit} className="space-y-3">
              <input
                type="text"
                value={soloAnswerInput}
                onChange={(e) => setSoloAnswerInput(e.target.value)}
                disabled={gradingAnswer}
                placeholder={
                  lang === 'th'
                    ? 'พิมพ์คำตอบที่คิดว่าคนอื่นจะนึกไม่ถึง...'
                    : 'Type an answer nobody else will think of...'
                }
                className="w-full px-4 py-3.5 rounded-2xl bg-[#080d18] border border-slate-700 focus:border-indigo-500 focus:outline-none text-white text-sm"
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={gradingAnswer || !soloAnswerInput.trim()}
                className="btn-press w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {gradingAnswer ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === 'th' ? 'AI กำลังตรวจคำตอบของคุณ...' : 'AI is grading your answer...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {lang === 'th' ? 'ส่งคำตอบให้ AI ตรวจ' : 'Submit to AI Judge'}
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="anim-pop space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  soloResult.points > 0
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-rose-500/10 border-rose-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    {lang === 'th' ? `คำตอบของคุณ: "${soloAnswerInput}"` : `Your Answer: "${soloAnswerInput}"`}
                  </span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                      soloResult.points > 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {lang === 'th' ? `คนตอบแนวนี้ ${soloResult.pct}%` : `${soloResult.pct}% Crowd Match`}
                  </span>
                </div>

                <p className="text-sm font-bold text-white mb-2">{soloResult.comment[lang]}</p>

                <div className="flex items-center gap-3 text-xs font-black">
                  <span className="text-amber-400">+{soloResult.points} {lang === 'th' ? 'แต้ม' : 'pts'}</span>
                  <span className="text-emerald-400">+{soloResult.floors} {lang === 'th' ? 'ชั้นหอคอย' : 'Floors'}</span>
                </div>
              </div>

              {soloResult.crowdSummary?.[lang] && (
                <div className="p-3 rounded-xl bg-[#080d18] border border-slate-800 text-xs text-slate-300">
                  📊 {soloResult.crowdSummary[lang]}
                </div>
              )}

              <button
                type="button"
                onClick={handleSoloNext}
                className="btn-press w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                {soloRound + 1 < questions.length
                  ? lang === 'th' ? 'ข้อถัดไป' : 'Next Question'
                  : lang === 'th' ? 'ดูสรุปความสูงหอคอย' : 'See Final Tower'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. โหมดเอาชีวิตรอด (SURVIVAL — เติมคำตอบ + 3 หัวใจ + ปีนหอคอยไม่จำกัด)
  // =========================================================================
  if (screen === 'survival') {
    const currentQ = questions[survivalBatchIdx];

    if (survivalFinished) {
      return (
        <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-hidden">
          <GlobalStyles />
          <AmbientBackground />
          <ToastBanner message={toastMsg} />
          {renderTopBar()}
          <div className="relative z-10 anim-pop w-full max-w-md mx-auto bg-[#0f1626] border border-rose-500/40 rounded-3xl p-6 text-center shadow-2xl">
            <div className="text-5xl mb-2 anim-float">💀</div>
            <h2 className="text-xl font-bold text-white mb-1">
              {lang === 'th' ? 'จบการเอาชีวิตรอด!' : 'Survival Run Ended!'}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {lang === 'th'
                ? `คุณรอดชีวิตได้ถึงด่านที่ ${survivalRound}`
                : `You survived until Round ${survivalRound}`}
            </p>

            <TowerClimbWidget score={survivalScore} avatar={user.avatar} lang={lang} compact />

            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div className="p-3 rounded-2xl bg-[#080d18] border border-slate-800">
                <div className="text-[11px] text-slate-400">{lang === 'th' ? 'คะแนน' : 'Score'}</div>
                <div className="text-xl font-black text-rose-400">{survivalScore}</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#080d18] border border-slate-800">
                <div className="text-[11px] text-slate-400">{lang === 'th' ? 'ด่านที่ถึง' : 'Round'}</div>
                <div className="text-xl font-black text-indigo-400">{survivalRound}</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#080d18] border border-slate-800">
                <div className="text-[11px] text-slate-400">{lang === 'th' ? 'สตรีค' : 'Streak'}</div>
                <div className="text-xl font-black text-orange-400">{survivalBestStreak}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                shareLink({
                  title: 'Reverse Trivia — Survival Score',
                  text:
                    lang === 'th'
                      ? `💀 ฉันทำคะแนนโหมด Survival ได้ ${survivalScore} แต้ม (รอดถึงด่าน ${survivalRound} • หอคอยชั้น ${Math.floor(survivalScore / 50)}) ใน Reverse Trivia!`
                      : `💀 I scored ${survivalScore} pts (Round ${survivalRound}) in Reverse Trivia Survival!`,
                  url: window.location.origin
                })
              }
              className="btn-press w-full mb-3 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {lang === 'th' ? 'แชร์สถิติอวดเพื่อน' : 'Share Score'}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loadingQuestions}
                onClick={startSurvivalGame}
                className="btn-press py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {lang === 'th' ? 'เล่นอีกรอบ' : 'Retry'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeaderboardTab('survival');
                  setScreen('lobby');
                }}
                className="btn-press py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
              >
                {lang === 'th' ? 'ดูอันดับ' : 'Leaderboard'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-x-hidden">
        <GlobalStyles />
        <AmbientBackground />
        <ToastBanner message={toastMsg} />
        {renderTopBar()}

        <div
          key={survivalRound}
          className={`relative z-10 anim-fade-up w-full max-w-xl mx-auto bg-[#0f1626]/95 border border-rose-500/30 rounded-3xl p-6 shadow-2xl ${
            fxShake ? 'anim-shake border-rose-500' : ''
          }`}
        >
          <ConfettiBurst active={fxConfetti} />

          <TowerClimbWidget score={survivalScore} avatar={user.avatar} lastGain={lastTowerGain} lang={lang} compact />

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-black">
              💀 {lang === 'th' ? `ด่าน ${survivalRound}` : `Round ${survivalRound}`}
            </span>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((h) => (
                  <Heart
                    key={h}
                    className={`w-4 h-4 transition-transform duration-300 ${
                      h <= survivalLives ? 'text-rose-500 fill-rose-500 scale-100' : 'text-slate-700 scale-75'
                    }`}
                  />
                ))}
              </div>
              <span className="text-orange-400 font-bold text-xs">🔥 {survivalStreak}</span>
            </div>
          </div>

          {survivalHealNotice && (
            <div className="anim-pop mb-3 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
              ❤️ {lang === 'th' ? 'สตรีคครบ 3 ข้อ! ฟื้นฟูหัวใจ +1 ดวง!' : '3-Streak Bonus! +1 Heart Restored!'}
            </div>
          )}

          <h3 className="text-base sm:text-lg font-bold text-white mb-5 leading-snug">
            {currentQ?.question[lang]}
          </h3>

          {!survivalResult ? (
            <form onSubmit={handleSurvivalSubmit} className="space-y-3">
              <input
                type="text"
                value={survivalAnswerInput}
                onChange={(e) => setSurvivalAnswerInput(e.target.value)}
                disabled={gradingAnswer}
                placeholder={
                  lang === 'th'
                    ? 'พิมพ์คำตอบสวนกระแสเพื่อเอาชีวิตรอด...'
                    : 'Type a rare answer to survive...'
                }
                className="w-full px-4 py-3.5 rounded-2xl bg-[#080d18] border border-slate-700 focus:border-rose-500 focus:outline-none text-white text-sm"
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={gradingAnswer || !survivalAnswerInput.trim()}
                className="btn-press w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {gradingAnswer ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === 'th' ? 'AI กำลังตัดสิน...' : 'AI Judging...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {lang === 'th' ? 'ส่งคำตอบเอาชีวิตรอด' : 'Submit Answer'}
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="anim-pop space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  survivalResult.points > 0
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-rose-500/15 border-rose-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">"{survivalAnswerInput}"</span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                    {survivalResult.pct}%
                  </span>
                </div>
                <p className="text-sm font-bold text-white mb-2">{survivalResult.comment[lang]}</p>
                <div className="text-xs font-black">
                  {survivalResult.points > 0 ? (
                    <span className="text-emerald-400">
                      +{survivalResult.points} {lang === 'th' ? 'แต้ม' : 'pts'} (+{survivalResult.floors}{' '}
                      {lang === 'th' ? 'ชั้น' : 'Fl'})
                    </span>
                  ) : (
                    <span className="text-rose-400">
                      💔 {lang === 'th' ? 'เสียหัวใจ 1 ดวง!' : 'Lost 1 Heart!'}
                    </span>
                  )}
                </div>
              </div>

              {survivalResult.crowdSummary?.[lang] && (
                <div className="p-3 rounded-xl bg-[#080d18] border border-slate-800 text-xs text-slate-300">
                  📊 {survivalResult.crowdSummary[lang]}
                </div>
              )}

              {survivalLives > 0 && (
                <button
                  type="button"
                  disabled={loadingQuestions}
                  onClick={handleSurvivalNext}
                  className="btn-press w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  {loadingQuestions ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {lang === 'th' ? 'ลุยด่านต่อไป' : 'Next Round'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. หน้าตั้งค่าผู้เล่นหลายคนในเครื่องเดียว
  // =========================================================================
  if (screen === 'local_setup') {
    return (
      <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-x-hidden">
        <GlobalStyles />
        <AmbientBackground />
        <ToastBanner message={toastMsg} />
        {renderTopBar()}
        <div className="relative z-10 anim-fade-up w-full max-w-xl mx-auto bg-[#0f1626]/95 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <button
            type="button"
            onClick={() => setScreen('lobby')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            {lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}
          </button>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              {lang === 'th' ? 'ผู้เล่นหลายคนในเครื่องเดียว' : 'Single-Device Multiplayer'}
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold">
              {localPlayers.length} / 8
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            {lang === 'th'
              ? 'แตะที่รูปไอคอนเพื่อเปลี่ยนรูปโปรไฟล์ และพิมพ์ชื่อผู้เล่นแต่ละคนได้เลย'
              : 'Tap an avatar to change it and enter player names.'}
          </p>

          <div className="space-y-2.5 mb-5">
            {localPlayers.map((player, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 bg-[#080d18] border border-slate-800 p-2.5 rounded-2xl"
              >
                <button
                  type="button"
                  onClick={() => {
                    const copy = [...localPlayers];
                    const nextAv = AVATARS[(AVATARS.indexOf(copy[idx].avatar) + 1) % AVATARS.length];
                    copy[idx] = { ...copy[idx], avatar: nextAv };
                    setLocalPlayers(copy);
                  }}
                  className="btn-press w-10 h-10 rounded-xl bg-slate-800 text-xl flex items-center justify-center shrink-0 border border-slate-700"
                >
                  {player.avatar}
                </button>
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => {
                    const copy = [...localPlayers];
                    copy[idx] = { ...copy[idx], name: e.target.value };
                    setLocalPlayers(copy);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-transparent border border-slate-800 focus:border-emerald-500 focus:outline-none text-sm text-white"
                />
                {localPlayers.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setLocalPlayers(localPlayers.filter((_, i) => i !== idx))}
                    className="btn-press px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {localPlayers.length < 8 && (
              <button
                type="button"
                onClick={() =>
                  setLocalPlayers([
                    ...localPlayers,
                    {
                      name: lang === 'th' ? `ผู้เล่น ${localPlayers.length + 1}` : `Player ${localPlayers.length + 1}`,
                      avatar: AVATARS[localPlayers.length % AVATARS.length],
                      score: 0
                    }
                  ])
                }
                className="btn-press flex-1 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700"
              >
                + {lang === 'th' ? 'เพิ่มผู้เล่น' : 'Add Player'}
              </button>
            )}
            <button
              type="button"
              disabled={loadingQuestions}
              onClick={startLocalGame}
              className="btn-press flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              {loadingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {lang === 'th' ? 'เริ่มเล่นเลย!' : 'Start Game!'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. หน้าเล่นเกมผู้เล่นหลายคนในเครื่องเดียว (Pass & Play — เติมคำตอบ + AI ตรวจ)
  // =========================================================================
  if (screen === 'local_game') {
    const currentQ = questions[localRound];
    const currentPlayer = localPlayers[localTurnIndex];

    if (localFinished) {
      const sorted = [...localPlayers].sort((a, b) => b.score - a.score);
      return (
        <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-hidden">
          <GlobalStyles />
          <AmbientBackground />
          <ToastBanner message={toastMsg} />
          {renderTopBar()}
          <div className="relative z-10 anim-pop w-full max-w-xl mx-auto bg-[#0f1626] border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
            <ConfettiBurst active={fxConfetti} />
            <div className="text-4xl mb-2 anim-float">👑</div>
            <h2 className="text-xl font-bold text-white mb-1">
              {lang === 'th' ? 'สรุปผลผู้ชนะบนยอดหอคอย!' : 'Tower Climb Winners!'}
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              {lang === 'th'
                ? `ผู้ชนะคือ ${sorted[0]?.name} (ชั้น ${Math.floor((sorted[0]?.score || 0) / 50)} • ${sorted[0]?.score} แต้ม)`
                : `${sorted[0]?.name} wins (${sorted[0]?.score} pts)`}
            </p>
            <div className="space-y-2.5 mb-6 text-left">
              {sorted.map((p, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    idx === 0 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-[#080d18] border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-400">#{idx + 1}</span>
                    <span className="text-2xl">{p.avatar}</span>
                    <div>
                      <div className="font-bold text-sm text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-400">
                        🏔️ {lang === 'th' ? `หอคอยชั้นที่ ${Math.floor(p.score / 50)}` : `Floor ${Math.floor(p.score / 50)}`}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-amber-400 text-sm">
                    {p.score} {lang === 'th' ? 'แต้ม' : 'pts'}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startLocalGame}
                className="btn-press py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {lang === 'th' ? 'เล่นอีกรอบ' : 'Play Again'}
              </button>
              <button
                type="button"
                onClick={() => setScreen('lobby')}
                className="btn-press py-3 rounded-xl bg-slate-800 text-white font-bold text-sm"
              >
                {lang === 'th' ? 'กลับหน้าหลัก' : 'Lobby'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-x-hidden">
        <GlobalStyles />
        <AmbientBackground />
        <ToastBanner message={toastMsg} />
        {renderTopBar()}
        <div
          key={`${localRound}-${localTurnIndex}-${localPrivacyScreen}-${Boolean(localResults)}`}
          className="relative z-10 anim-fade-up w-full max-w-xl mx-auto bg-[#0f1626]/95 border border-slate-800 rounded-3xl p-6 shadow-2xl"
        >
          <ConfettiBurst active={fxConfetti} />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
            <span className="font-bold text-emerald-400">
              {lang === 'th' ? `ข้อที่ ${localRound + 1} / ${questions.length}` : `Round ${localRound + 1}/${questions.length}`}
            </span>
            <span>✨ AI Judge</span>
          </div>

          {!localResults && localPrivacyScreen ? (
            <div className="py-8 text-center space-y-5">
              <div className="anim-float w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-4xl mx-auto">
                {currentPlayer.avatar}
              </div>
              <div>
                <p className="text-xs text-emerald-400 font-bold mb-1">
                  {lang === 'th'
                    ? `คิวที่ ${localTurnIndex + 1} จาก ${localPlayers.length} คน`
                    : `Player ${localTurnIndex + 1} of ${localPlayers.length}`}
                </p>
                <h2 className="text-2xl font-bold text-white">
                  {lang === 'th' ? `ส่งเครื่องให้ "${currentPlayer.name}"` : `Pass to "${currentPlayer.name}"`}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'th' ? 'คนอื่นห้ามแอบดูคำตอบที่พิมพ์นะ!' : 'No peeking while typing!'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPrivacyScreen(false)}
                className="btn-press px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
              >
                {lang === 'th' ? `ฉันคือ ${currentPlayer.name} — พร้อมพิมพ์!` : `I am ${currentPlayer.name} — Ready!`}
              </button>
            </div>
          ) : !localResults ? (
            <form onSubmit={handleLocalSecretSubmit} className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 text-xs font-semibold w-fit">
                <span>{currentPlayer.avatar}</span>
                <span>{currentPlayer.name}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                {currentQ?.question[lang]}
              </h3>
              <input
                type="text"
                value={localInputText}
                onChange={(e) => setLocalInputText(e.target.value)}
                disabled={gradingAnswer}
                placeholder={lang === 'th' ? 'พิมพ์คำตอบลับของคุณ...' : 'Type your secret answer...'}
                className="w-full px-4 py-3.5 rounded-2xl bg-[#080d18] border border-slate-700 focus:border-emerald-500 focus:outline-none text-white text-sm"
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={gradingAnswer || !localInputText.trim()}
                className="btn-press w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {gradingAnswer ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === 'th' ? 'AI กำลังตรวจคำตอบทุกคน...' : 'AI is grading all answers...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {localTurnIndex + 1 < localPlayers.length
                      ? lang === 'th' ? 'ยืนยันคำตอบและส่งต่อ' : 'Lock & Pass'
                      : lang === 'th' ? 'ส่งให้ AI ตรวจพร้อมกัน!' : 'Submit All to AI!'}
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">{currentQ?.question[lang]}</h3>
              <div className="space-y-2.5">
                {localPlayers.map((p, idx) => {
                  const ev = p.lastEval;
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border ${
                        (ev?.points || 0) > 0
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-[#080d18] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm font-bold mb-1">
                        <span className="flex items-center gap-2 text-white">
                          <span>{p.avatar}</span>
                          <span>{p.name}:</span>
                          <span className="text-indigo-300">"{p.lastAnswer}"</span>
                        </span>
                        <span className="text-amber-400">
                          +{ev?.points || 0} ({ev?.pct ?? 100}%)
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{ev?.comment?.[lang]}</p>
                      <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                        🏔️ {lang === 'th' ? `หอคอยปัจจุบัน: ชั้น ${Math.floor(p.score / 50)} (${p.score} แต้ม)` : `Tower Floor ${Math.floor(p.score / 50)} (${p.score} pts)`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {localResults?.crowdSummary?.[lang] && (
                <div className="p-3 rounded-xl bg-[#080d18] border border-slate-800 text-xs text-slate-300">
                  📊 {localResults.crowdSummary[lang]}
                </div>
              )}

              <button
                type="button"
                onClick={handleLocalNextRound}
                className="btn-press w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                {localRound + 1 < questions.length
                  ? lang === 'th' ? 'ข้อถัดไป' : 'Next Question'
                  : lang === 'th' ? 'ดูสรุปผู้ชนะ' : 'See Winner'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 7. โหมดห้องออนไลน์หลายคน (ONLINE MULTIPLAYER — เติมคำตอบ + AI ตรวจ)
  // =========================================================================
  if (screen === 'online_lobby' && roomData) {
    const isHost = roomData.hostId === user.id;
    const playersList = Object.values(roomData.players || {});

    if (roomData.status === 'waiting') {
      return (
        <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-x-hidden">
          <GlobalStyles />
          <AmbientBackground />
          <ToastBanner message={toastMsg} />
          {renderTopBar()}
          <div className="relative z-10 anim-fade-up w-full max-w-md mx-auto bg-[#0f1626]/95 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
            <span className="text-xs font-bold text-purple-400">
              {lang === 'th' ? 'ห้องออนไลน์พร้อมแล้ว' : 'Online Room Ready'}
            </span>
            {roomData.topicLabel && (
              <div className="mt-1 text-[11px] text-slate-400">
                {lang === 'th' ? `หมวดคำถาม: ${roomData.topicLabel}` : `Topic: ${roomData.topicLabel}`}
              </div>
            )}
            <div className="my-3 py-3 px-4 rounded-2xl bg-[#080d18] border border-purple-500/30 flex items-center justify-between gap-2">
              <span className="text-2xl font-black tracking-[0.25em] text-white">{activeRoomCode}</span>
              <button
                type="button"
                onClick={shareRoomInvite}
                className="btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                {copiedCode ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (lang === 'th' ? 'แชร์ลิงก์ห้อง' : 'Share Link')}
              </button>
            </div>
            <div className="text-left mt-5 mb-6 space-y-2">
              {playersList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#080d18] border border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{p.avatar || '😎'}</span>
                    <span className="text-sm font-semibold text-white">{p.displayName}</span>
                  </div>
                  {p.id === roomData.hostId && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>
            {isHost ? (
              <button
                type="button"
                onClick={() => updateDoc(doc(db, 'rooms', activeRoomCode), { status: 'playing', currentRound: 0 })}
                className="btn-press w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                {lang === 'th' ? 'เริ่มเกมเลย!' : 'Start Match!'}
              </button>
            ) : (
              <p className="text-xs text-slate-400">
                {lang === 'th' ? 'รอหัวหน้าห้องกดเริ่มเกม...' : 'Waiting for host...'}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (roomData.status === 'finished') {
      const sorted = [...playersList].sort((a, b) => (b.score || 0) - (a.score || 0));
      return (
        <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-hidden">
          <GlobalStyles />
          <AmbientBackground />
          <ToastBanner message={toastMsg} />
          {renderTopBar()}
          <div className="relative z-10 anim-pop w-full max-w-md mx-auto bg-[#0f1626] border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
            <div className="text-4xl mb-2 anim-float">👑</div>
            <h2 className="text-xl font-bold text-white mb-4">
              {lang === 'th' ? 'สรุปผลห้องออนไลน์' : 'Match Results'}
            </h2>
            <div className="space-y-2 mb-5 text-left">
              {sorted.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    idx === 0 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-[#080d18] border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                    <span className="text-xl">{p.avatar || '😎'}</span>
                    <div>
                      <div className="text-sm font-bold text-white">{p.displayName}</div>
                      <div className="text-[11px] text-slate-400">
                        🏔️ {lang === 'th' ? `ชั้น ${Math.floor((p.score || 0) / 50)}` : `Floor ${Math.floor((p.score || 0) / 50)}`}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-amber-400">{p.score || 0}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveRoomCode('');
                setRoomData(null);
                setScreen('lobby');
              }}
              className="btn-press w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm"
            >
              {lang === 'th' ? 'กลับหน้าหลัก' : 'Back to Lobby'}
            </button>
          </div>
        </div>
      );
    }

    const currentQ = roomData.questions[roomData.currentRound];
    const me = roomData.players?.[user.id];
    const myAnswer = me?.currentAnswer ?? null;
    const isReveal = roomData.status === 'reveal';

    return (
      <div className="relative min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 overflow-x-hidden">
        <GlobalStyles />
        <AmbientBackground />
        <ToastBanner message={toastMsg} />
        {renderTopBar()}
        <div
          key={roomData.currentRound}
          className="relative z-10 anim-fade-up w-full max-w-xl mx-auto bg-[#0f1626]/95 border border-slate-800 rounded-3xl p-6 shadow-2xl"
        >
          <TowerClimbWidget score={me?.score || 0} avatar={user.avatar} lang={lang} compact />

          <div className="flex items-center justify-between text-xs mb-4">
            <span className="font-bold text-purple-400">
              {lang === 'th'
                ? `ห้อง ${activeRoomCode} • ข้อ ${roomData.currentRound + 1}/${roomData.questions.length}`
                : `Room ${activeRoomCode} • Q${roomData.currentRound + 1}/${roomData.questions.length}`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                {playersList.filter((p) => p.currentAnswer !== null).length}/{playersList.length}
              </span>
              <button
                type="button"
                onClick={shareRoomInvite}
                className="text-purple-300 hover:text-white flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-5 leading-snug">
            {currentQ?.question[lang]}
          </h3>

          {!isReveal && myAnswer === null && (
            <form onSubmit={submitOnlineAnswer} className="space-y-3">
              <input
                type="text"
                value={onlineAnswerInput}
                onChange={(e) => setOnlineAnswerInput(e.target.value)}
                placeholder={lang === 'th' ? 'พิมพ์คำตอบสวนกระแสของคุณ...' : 'Type your rare answer...'}
                className="w-full px-4 py-3.5 rounded-2xl bg-[#080d18] border border-slate-700 focus:border-purple-500 focus:outline-none text-white text-sm"
                required
              />
              <button
                type="submit"
                disabled={!onlineAnswerInput.trim()}
                className="btn-press w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {lang === 'th' ? 'ส่งคำตอบ' : 'Lock In Answer'}
              </button>
            </form>
          )}

          {!isReveal && myAnswer !== null && (
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-center space-y-2">
              <div className="text-xs text-purple-300 font-bold">
                {lang === 'th' ? `ส่งคำตอบแล้ว: "${myAnswer}"` : `Submitted: "${myAnswer}"`}
              </div>
              <p className="text-xs text-slate-400">
                {gradingAnswer
                  ? lang === 'th' ? 'AI กำลังตรวจคำตอบของทุกคน...' : 'AI is grading everyone...'
                  : lang === 'th' ? 'รอเพื่อนในห้องส่งคำตอบให้ครบ...' : 'Waiting for other players...'}
              </p>
              {isHost && !gradingAnswer && (
                <button
                  type="button"
                  onClick={gradeAndRevealOnlineRoom}
                  className="text-xs text-purple-400 underline"
                >
                  {lang === 'th' ? 'ให้ AI ตรวจและเฉลยทันที' : 'Grade & Reveal Now'}
                </button>
              )}
            </div>
          )}

          {isReveal && (
            <div className="space-y-3">
              {playersList.map((p) => {
                const ev = p.lastEval;
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border ${
                      (ev?.points || 0) > 0
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-[#080d18] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm font-bold mb-1">
                      <span className="flex items-center gap-2 text-white">
                        <span>{p.avatar || '😎'}</span>
                        <span>{p.displayName}:</span>
                        <span className="text-purple-300">"{p.currentAnswer || '-'}"</span>
                      </span>
                      <span className="text-amber-400">
                        +{ev?.points || 0} ({ev?.pct ?? 100}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{ev?.comment?.[lang]}</p>
                  </div>
                );
              })}

              {roomData.crowdSummary?.[lang] && (
                <div className="p-3 rounded-xl bg-[#080d18] border border-slate-800 text-xs text-slate-300">
                  📊 {roomData.crowdSummary[lang]}
                </div>
              )}

              {isHost && (
                <button
                  type="button"
                  onClick={nextOnlineRound}
                  className="btn-press mt-2 w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  {roomData.currentRound + 1 < roomData.questions.length
                    ? lang === 'th' ? 'ข้อถัดไป' : 'Next Question'
                    : lang === 'th' ? 'สรุปผลผู้ชนะ' : 'Results'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
// END OF FILE
