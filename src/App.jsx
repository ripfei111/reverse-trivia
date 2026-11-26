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
  CheckCircle2
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
      th: 'เวลาไปร้านอาหารตามสั่ง เมนูไหนที่คนมักจะสั่ง "น้อยที่สุด" เมื่อคิดไม่ออก?',
      en: 'At a local street food stall, which dish do people order the LEAST when undecided?'
    },
    options: [
      { th: 'ผัดกะเพราหมูสับไข่ดาว', en: 'Stir-fried Basil Pork with Fried Egg', pct: 46 },
      { th: 'ข้าวผัดหมู / ไก่', en: 'Pork / Chicken Fried Rice', pct: 27 },
      { th: 'หมูกระเทียมราดข้าว', en: 'Garlic Pork over Rice', pct: 18 },
      { th: 'สุกี้แห้งรวมมิตร', en: 'Dry Sukiyaki Mixed', pct: 9 }
    ]
  },
  {
    category: 'food',
    question: {
      th: 'เวลาสั่งชานมไข่มุกหรือกาแฟเย็น ระดับความหวานแบบไหนที่คนสั่ง "น้อยที่สุด"?',
      en: 'When ordering iced bubble tea or coffee, which sweetness level is ordered the LEAST?'
    },
    options: [
      { th: 'หวานน้อย (25% - 50%)', en: 'Less sweet (25% - 50%)', pct: 43 },
      { th: 'หวานปกติ (100%)', en: 'Normal sweet (100%)', pct: 28 },
      { th: 'ไม่หวานเลย (0%)', en: 'No sugar (0%)', pct: 20 },
      { th: 'หวานพิเศษ (125% ขึ้นไป)', en: 'Extra sweet (125%+)', pct: 9 }
    ]
  },
  {
    category: 'daily',
    question: {
      th: 'เมื่อตื่นนอนตอนเช้า สิ่งแรกที่คนส่วนใหญ่หยิบจับหรือทำ "น้อยที่สุด" คืออะไร?',
      en: 'Right after waking up, what is the LEAST common first thing people do?'
    },
    options: [
      { th: 'หยิบโทรศัพท์มือถือมาเช็กแจ้งเตือน', en: 'Check smartphone notifications', pct: 49 },
      { th: 'กดเลื่อนปลุก (Snooze) แล้วนอนต่อ', en: 'Hit snooze and sleep more', pct: 26 },
      { th: 'เดินเข้าห้องน้ำล้างหน้าแปรงฟัน', en: 'Go to the bathroom to wash up', pct: 17 },
      { th: 'ดื่มน้ำเปล่า 1 แก้วทันที', en: 'Drink a glass of plain water immediately', pct: 8 }
    ]
  },
  {
    category: 'daily',
    question: {
      th: 'เวลาแบตมือถือเหลือต่ำกว่า 10% นอกบ้าน คนส่วนใหญ่มักจะทำสิ่งไหน "น้อยที่สุด"?',
      en: 'When phone battery drops below 10% outside, what do people do the LEAST?'
    },
    options: [
      { th: 'เปิดโหมดประหยัดพลังงานและลดแสงจอ', en: 'Turn on Low Power Mode & dim screen', pct: 44 },
      { th: 'รีบหยิบพาวเวอร์แบงก์ขึ้นมาชาร์จ', en: 'Plug into a power bank', pct: 30 },
      { th: 'เล่นต่อจนกว่าเครื่องจะดับไปเอง', en: 'Keep scrolling until it dies', pct: 18 },
      { th: 'เปิดโหมดเครื่องบิน (Airplane Mode)', en: 'Switch on Airplane Mode', pct: 8 }
    ]
  },
  {
    category: 'pop',
    question: {
      th: 'เวลาเข้าโรงภาพยนตร์ คนดูมักจะเลือกที่นั่งโซนไหน "น้อยที่สุด"?',
      en: 'When booking movie tickets, which seating zone do people pick the LEAST?'
    },
    options: [
      { th: 'แถวกลางโรง ตรงกลางจอพอดี', en: 'Middle rows, dead center', pct: 44 },
      { th: 'แถวหลังสุด (VIP / Sofa)', en: 'Very back row / VIP seats', pct: 31 },
      { th: 'แถวค่อนไปทางด้านหลังริมทางเดิน', en: 'Upper rows near the aisle', pct: 18 },
      { th: 'แถวหน้าสุดใกล้จอภาพยนตร์', en: 'Front rows closest to the screen', pct: 7 }
    ]
  },
  {
    category: 'movies',
    question: {
      th: 'เวลาดูซีรีส์หรืออนิเมะเรื่องโปรด ช่วงไหนที่คนกดข้าม (Skip) "น้อยที่สุด"?',
      en: 'When watching a favorite series or anime, which part do people skip the LEAST?'
    },
    options: [
      { th: 'เครดิตท้ายเรื่อง (End Credits)', en: 'End credits roll', pct: 45 },
      { th: 'เพลงเปิด (Opening Theme)', en: 'The Opening Theme song', pct: 26 },
      { th: 'ตัวอย่างตอนต่อไป (Next Episode Preview)', en: 'Next episode preview', pct: 21 },
      { th: 'ฉากเกริ่นสรุปตอนก่อน (Recap)', en: 'Previously-on recap scene', pct: 8 }
    ]
  },
  {
    category: 'travel',
    question: {
      th: 'เวลาจัดกระเป๋าไปเที่ยวต่างจังหวัด 3 วัน 2 คืน ของชิ้นไหนที่คนมักพกไป "น้อยที่สุด"?',
      en: 'When packing for a 3-day trip, which item do people pack the LEAST?'
    },
    options: [
      { th: 'สายชาร์จแบตและพาวเวอร์แบงก์', en: 'Phone charger and power bank', pct: 45 },
      { th: 'เสื้อผ้าชุดเก่งสำหรับถ่ายรูป', en: 'Extra outfits for photos', pct: 29 },
      { th: 'ครีมกันแดดและสกินแคร์', en: 'Sunscreen and skincare', pct: 17 },
      { th: 'ชุดปฐมพยาบาล / ยาสามัญประจำบ้าน', en: 'Mini first-aid kit / basic medicine', pct: 9 }
    ]
  },
  {
    category: 'travel',
    question: {
      th: 'เวลาขึ้นเครื่องบิน ผู้โดยสารมักเลือกทำกิจกรรมไหนระหว่างบิน "น้อยที่สุด"?',
      en: 'During a flight, which activity do passengers do the LEAST?'
    },
    options: [
      { th: 'นอนหลับพักผ่อน', en: 'Sleeping / napping', pct: 46 },
      { th: 'ฟังเพลงหรือดูหนังที่โหลดไว้', en: 'Listening to music / watching movies', pct: 29 },
      { th: 'ถ่ายรูปวิวเมฆนอกหน้าต่าง', en: 'Taking window photos of clouds', pct: 17 },
      { th: 'หยิบนิตยสารหน้าที่นั่งขึ้นมาอ่าน', en: 'Reading the seatback magazine', pct: 8 }
    ]
  },
  {
    category: 'tech',
    question: {
      th: 'เวลาซื้อสมาร์ตโฟนเครื่องใหม่ สิ่งแรกที่คนมักจะตั้งค่าหรือทำ "น้อยที่สุด" คืออะไร?',
      en: 'When getting a brand-new smartphone, what do people do the LEAST right away?'
    },
    options: [
      { th: 'ย้ายข้อมูลและโหลดแอปโซเชียล', en: 'Transfer data & download social apps', pct: 47 },
      { th: 'ติดฟิล์มกันรอยและใส่เคส', en: 'Put on a screen protector & case', pct: 28 },
      { th: 'ลองถ่ายรูปทดสอบกล้อง', en: 'Test out the camera', pct: 17 },
      { th: 'อ่านคู่มือการใช้งานในกล่อง', en: 'Read the printed manual inside the box', pct: 8 }
    ]
  },
  {
    category: 'tech',
    question: {
      th: 'เวลาเปิดคอมพิวเตอร์หรือโน้ตบุ๊กแล้วเครื่องค้าง วิธีไหนที่คนเลือกทำ "น้อยที่สุด" เป็นอันดับแรก?',
      en: 'When a computer freezes, which action do people try the LEAST first?'
    },
    options: [
      { th: 'กดปุ่ม Ctrl+Alt+Del เปิด Task Manager', en: 'Open Task Manager', pct: 41 },
      { th: 'กดปุ่ม Power ค้างไว้เพื่อรีสตาร์ต', en: 'Hold the Power button to force restart', pct: 33 },
      { th: 'คลิกเมาส์รัว ๆ รอให้หายค้างเอง', en: 'Spam-click and wait for it to unfreeze', pct: 19 },
      { th: 'เปิดหาวิธีแก้ปัญหาในคู่มือหรือโทรหาศูนย์', en: 'Call official tech support right away', pct: 7 }
    ]
  },
  {
    category: 'movies',
    question: {
      th: 'เวลาไปดูหนังกับเพื่อน ของกินหน้าโรงหนังอย่างไหนที่คนซื้อ "น้อยที่สุด"?',
      en: 'At a movie theater with friends, which snack do people buy the LEAST?'
    },
    options: [
      { th: 'ป๊อปคอร์นรสหวาน / เค็ม / ชีส', en: 'Popcorn (sweet / salted / cheese)', pct: 52 },
      { th: 'น้ำอัดลมแก้วใหญ่', en: 'Large soda cup', pct: 26 },
      { th: 'ไส้กรอกหรือนักเก็ตทอด', en: 'Hot dog or chicken nuggets', pct: 14 },
      { th: 'น้ำเปล่าขวดธรรมดาอย่างเดียว', en: 'Only a plain bottle of water', pct: 8 }
    ]
  },
  {
    category: 'pop',
    question: {
      th: 'เวลาฟังเพลงในแอปสตรีมมิง ฟีเจอร์ไหนที่คนทั่วไปกดใช้งาน "น้อยที่สุด"?',
      en: 'In a music streaming app, which feature do everyday listeners use the LEAST?'
    },
    options: [
      { th: 'กดสุ่มเพลง (Shuffle)', en: 'Shuffle playback', pct: 44 },
      { th: 'ดูเนื้อเพลง (Lyrics)', en: 'View song lyrics', pct: 29 },
      { th: 'สร้างเพลย์ลิสต์ส่วนตัว', en: 'Create custom playlists', pct: 19 },
      { th: 'ปรับแต่ง Equalizer เสียงด้วยตัวเอง', en: 'Manually tune the audio Equalizer', pct: 8 }
    ]
  }
];

function getLowestPctIndex(options) {
  let minIdx = 0;
  for (let i = 1; i < options.length; i++) {
    if (options[i].pct < options[minIdx].pct) minIdx = i;
  }
  return minIdx;
}

function getHighestPctIndex(options) {
  let maxIdx = 0;
  for (let i = 1; i < options.length; i++) {
    if (options[i].pct > options[maxIdx].pct) maxIdx = i;
  }
  return maxIdx;
}

function calculateRoundPoints(options, selectedIdx, currentStreak = 0, mode = 'normal') {
  const sortedPcts = [...options.map((o) => o.pct)].sort((a, b) => a - b);
  const pct = options[selectedIdx].pct;
  const rank = sortedPcts.indexOf(pct);

  if (mode === 'survival') {
    if (rank === 0) return { points: 200 + currentStreak * 50, isReverseWinner: true, isCrowdTrap: false, rank };
    if (rank === 1) return { points: 100, isReverseWinner: false, isCrowdTrap: false, rank };
    if (rank === 2) return { points: 40, isReverseWinner: false, isCrowdTrap: false, rank };
    return { points: 0, isReverseWinner: false, isCrowdTrap: true, rank };
  }

  if (rank === 0) return { points: 150 + currentStreak * 25, isReverseWinner: true, isCrowdTrap: false, rank };
  if (rank === 1) return { points: 80, isReverseWinner: false, isCrowdTrap: false, rank };
  if (rank === 2) return { points: 30, isReverseWinner: false, isCrowdTrap: false, rank };
  return { points: 0, isReverseWinner: false, isCrowdTrap: true, rank };
}

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

function normalizeParsedQuestions(parsed) {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item) => item && item.question && Array.isArray(item.options) && item.options.length >= 4)
    .map((item) => {
      const qTh = item.question.th || item.question.en || 'คำถามสวนกระแส';
      const qEn = item.question.en || item.question.th || 'Reverse Trivia Question';
      const rawOpts = item.options.slice(0, 4).map((o, i) => ({
        th: o.th || o.en || `ตัวเลือก ${i + 1}`,
        en: o.en || o.th || `Option ${i + 1}`,
        pct: Number(o.pct) > 0 ? Number(o.pct) : [45, 28, 18, 9][i]
      }));
      const sum = rawOpts.reduce((acc, o) => acc + o.pct, 0) || 100;
      let running = 0;
      const normalizedOpts = rawOpts.map((o, idx) => {
        if (idx === rawOpts.length - 1) {
          return { ...o, pct: Math.max(1, 100 - running) };
        }
        const val = Math.max(1, Math.round((o.pct / sum) * 100));
        running += val;
        return { ...o, pct: val };
      });
      return { question: { th: qTh, en: qEn }, options: normalizedOpts };
    });
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
      50% { transform: translate3d(0, -8px, 0); }
    }
    @keyframes shakeX {
      0%, 100% { transform: translate3d(0, 0, 0); }
      20% { transform: translate3d(-7px, 0, 0); }
      40% { transform: translate3d(7px, 0, 0); }
      60% { transform: translate3d(-5px, 0, 0); }
      80% { transform: translate3d(5px, 0, 0); }
    }
    @keyframes orbDrift {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(20px, -18px, 0) scale(1.06); }
    }
    @keyframes confettiFall {
      0% { opacity: 1; transform: translate3d(0, -10px, 0) rotate(0deg); }
      100% { opacity: 0; transform: translate3d(var(--tx), 140px, 0) rotate(360deg); }
    }
    @keyframes toastSlide {
      0% { opacity: 0; transform: translate3d(-50%, 16px, 0) scale(0.95); }
      100% { opacity: 1; transform: translate3d(-50%, 0, 0) scale(1); }
    }
    .anim-fade-up { animation: fadeUp 0.36s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .anim-pop { animation: popIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .anim-float { animation: floatSlow 3.4s ease-in-out infinite; }
    .anim-shake { animation: shakeX 0.42s ease-in-out both; }
    .anim-orb { animation: orbDrift 11s ease-in-out infinite; will-change: transform; }
    .anim-toast { animation: toastSlide 0.28s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .btn-press { transition: transform 0.16s ease, background-color 0.16s ease, border-color 0.16s ease; }
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
      className="anim-orb absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl"
      style={{ animationDelay: '-7s' }}
    />
  </div>
));

const CONFETTI_PIECES = [
  { left: '12%', color: '#34d399', tx: '-32px', delay: '0s' },
  { left: '24%', color: '#818cf8', tx: '24px', delay: '0.05s' },
  { left: '36%', color: '#fbbf24', tx: '-18px', delay: '0.1s' },
  { left: '48%', color: '#f472b6', tx: '28px', delay: '0.03s' },
  { left: '60%', color: '#38bdf8', tx: '-26px', delay: '0.08s' },
  { left: '72%', color: '#a78bfa', tx: '20px', delay: '0.12s' },
  { left: '84%', color: '#34d399', tx: '-22px', delay: '0.04s' },
  { left: '92%', color: '#fbbf24', tx: '15px', delay: '0.09s' }
];

const ConfettiBurst = memo(({ active }) => {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 h-36 overflow-hidden z-20">
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

  // Navigation & Game Settings
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

  // Questions & Feedback FX
  const [questions, setQuestions] = useState([]);
  const [questionSource, setQuestionSource] = useState('ai');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [fxConfetti, setFxConfetti] = useState(false);
  const [fxShake, setFxShake] = useState(false);

  // Solo states
  const [soloRound, setSoloRound] = useState(0);
  const [soloScore, setSoloScore] = useState(0);
  const [soloStreak, setSoloStreak] = useState(0);
  const [soloBestStreak, setSoloBestStreak] = useState(0);
  const [soloPicked, setSoloPicked] = useState(null);
  const [soloFinished, setSoloFinished] = useState(false);

  // Survival states
  const [survivalLives, setSurvivalLives] = useState(3);
  const [survivalRound, setSurvivalRound] = useState(0);
  const [survivalBatchIdx, setSurvivalBatchIdx] = useState(0);
  const [survivalScore, setSurvivalScore] = useState(0);
  const [survivalStreak, setSurvivalStreak] = useState(0);
  const [survivalBestStreak, setSurvivalBestStreak] = useState(0);
  const [survivalPicked, setSurvivalPicked] = useState(null);
  const [survivalFinished, setSurvivalFinished] = useState(false);
  const [survivalHealNotice, setSurvivalHealNotice] = useState(false);

  // Local Pass & Play states
  const [localPlayers, setLocalPlayers] = useState([
    { name: 'ผู้เล่น 1', avatar: '😎', score: 0 },
    { name: 'ผู้เล่น 2', avatar: '🦊', score: 0 }
  ]);
  const [localRound, setLocalRound] = useState(0);
  const [localTurnIndex, setLocalTurnIndex] = useState(0);
  const [localPrivacyScreen, setLocalPrivacyScreen] = useState(true);
  const [localAnswers, setLocalAnswers] = useState({});
  const [localReveal, setLocalReveal] = useState(false);
  const [localFinished, setLocalFinished] = useState(false);

  // Online Multiplayer states
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
  }, []);

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

  // Load saved user & URL room code
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

  // Subscribe to Hall of Fame & Survival Leaderboards
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
          if ((data.survivalScore || 0) > 0) {
            list.push({ id: d.id, ...data });
          }
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

  // Subscribe to Active Online Room
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

  // Universal Share Function (App Link, Room Link, Score Share)
  const shareLink = useCallback(
    async ({ title, text, url, isRoom = false }) => {
      const shareUrl = url || window.location.origin;
      const shareTitle = title || 'Reverse Trivia — ทายสวนกระแส';
      const shareText =
        text ||
        (lang === 'th'
          ? 'มาเล่น Reverse Trivia เกมทายคำตอบที่คนเลือกน้อยที่สุดกัน!'
          : 'Play Reverse Trivia — pick the least popular answer!');

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
        showToast(lang === 'th' ? 'คัดลอกลิงก์ลงคลิปบอร์ดแล้ว!' : 'Link copied to clipboard!');
      } catch (e) {
        showToast(lang === 'th' ? 'ไม่สามารถคัดลอกได้ กรุณาคัดลอก URL ด้านบน' : 'Copy failed');
      }
    },
    [lang, showToast]
  );

  // Category Ban Helpers
  const toggleBanPreset = useCallback(
    (catId) => {
      if (catId === 'all') return;
      setBannedCategories((prev) => {
        const exists = prev.includes(catId);
        if (exists) return prev.filter((id) => id !== catId);
        const nonAllCount = CATEGORIES.length - 1;
        const presetBannedCount = prev.filter((b) => CATEGORIES.some((c) => c.id === b)).length;
        if (presetBannedCount >= nonAllCount - 1 && !customCategory.trim()) {
          showToast(lang === 'th' ? 'ต้องเหลือหมวดหมู่ไว้อย่างน้อย 1 หมวดครับ' : 'Keep at least 1 category');
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

  const removeBan = useCallback((tag) => {
    setBannedCategories((prev) => prev.filter((item) => item !== tag));
  }, []);

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
            : `Player ID "${rawName}" not found. Register it now?`
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

  // AI Question Generator with Custom Topic & Category Bans
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
          ? `STRICTLY BAN / EXCLUDE any questions or options related to these forbidden topics: ${bannedStrings.join(', ')}.`
          : '';

      try {
        const prompt = `Generate ${count} fun, creative "Reverse Trivia" survey questions in BOTH natural Thai and English specifically about: "${targetTopic}".
${banClause}
Rules:
- Players try to pick the answer chosen by the FEWEST people in a survey.
- Each question must have 4 realistic options with distinct popularity percentages (pct) summing to exactly 100 (e.g., 46, 27, 19, 8).
- Return ONLY a valid JSON array with no markdown or extra text:
[{"question":{"th":"...","en":"..."},"options":[{"th":"...","en":"...","pct":46},{"th":"...","en":"...","pct":27},{"th":"...","en":"...","pct":19},{"th":"...","en":"...","pct":8}]}]`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 11000);
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
        const cleanedText = rawText.replace(/```json|```/gi, '').trim();
        const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedText);
        const valid = normalizeParsedQuestions(parsed);

        if (valid.length >= Math.min(count, 3)) {
          setQuestionSource(trimmedTopic ? 'ai-custom' : 'ai');
          setLoadingQuestions(false);
          return valid.slice(0, count);
        }
        throw new Error('fallback');
      } catch (e) {
        const allowedFallback = FALLBACK_QUESTIONS.filter((q) => !bans.includes(q.category));
        const categoryMatched =
          category === 'all' || trimmedTopic
            ? allowedFallback
            : allowedFallback.filter((q) => q.category === category);
        const pool = categoryMatched.length >= count ? categoryMatched : allowedFallback.length > 0 ? allowedFallback : FALLBACK_QUESTIONS;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        setQuestionSource('classic');
        setLoadingQuestions(false);
        if (trimmedTopic) {
          showToast(
            lang === 'th'
              ? 'AI ตอบสนองช้า ใช้คำถามชุดคลาสสิกแทนชั่วคราว'
              : 'AI timed out, using classic questions'
          );
        }
        return shuffled.slice(0, count);
      }
    },
    [lang, showToast]
  );

  // Save Progress (Hall of Fame + Survival Score)
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

  // Solo Mode Handlers
  const startSoloGame = async () => {
    const qs = await fetchQuestions(selectedCategory, totalRounds, customCategory, bannedCategories);
    setQuestions(qs);
    setSoloRound(0);
    setSoloScore(0);
    setSoloStreak(0);
    setSoloBestStreak(0);
    setSoloPicked(null);
    setSoloFinished(false);
    setScreen('solo');
  };

  const handleSoloPick = (idx) => {
    if (soloPicked !== null) return;
    setSoloPicked(idx);
    const { points, isReverseWinner, isCrowdTrap } = calculateRoundPoints(
      questions[soloRound].options,
      idx,
      soloStreak,
      'normal'
    );
    if (isReverseWinner) triggerConfetti();
    if (isCrowdTrap) triggerShake();

    const nextStreak = isReverseWinner ? soloStreak + 1 : 0;
    setSoloScore((p) => p + points);
    setSoloStreak(nextStreak);
    setSoloBestStreak((p) => Math.max(p, nextStreak));
  };

  const handleSoloNext = async () => {
    if (soloRound + 1 < questions.length) {
      setSoloRound((p) => p + 1);
      setSoloPicked(null);
    } else {
      setSoloFinished(true);
      triggerConfetti();
      await savePlayerProgress({ earnedScore: soloScore, newBestStreak: soloBestStreak });
    }
  };

  // Survival Mode Handlers
  const startSurvivalGame = async () => {
    const qs = await fetchQuestions(selectedCategory, 5, customCategory, bannedCategories);
    setQuestions(qs);
    setSurvivalLives(3);
    setSurvivalRound(1);
    setSurvivalBatchIdx(0);
    setSurvivalScore(0);
    setSurvivalStreak(0);
    setSurvivalBestStreak(0);
    setSurvivalPicked(null);
    setSurvivalFinished(false);
    setSurvivalHealNotice(false);
    setScreen('survival');
  };

  const handleSurvivalPick = async (idx) => {
    if (survivalPicked !== null) return;
    setSurvivalPicked(idx);
    setSurvivalHealNotice(false);

    const currentQ = questions[survivalBatchIdx];
    const { points, isReverseWinner, isCrowdTrap } = calculateRoundPoints(
      currentQ.options,
      idx,
      survivalStreak,
      'survival'
    );

    const nextScore = survivalScore + points;
    const nextStreak = isReverseWinner ? survivalStreak + 1 : 0;
    const nextBestStreak = Math.max(survivalBestStreak, nextStreak);
    let nextLives = isCrowdTrap ? survivalLives - 1 : survivalLives;

    if (isReverseWinner) {
      triggerConfetti();
      if (nextStreak > 0 && nextStreak % 3 === 0 && nextLives < 3) {
        nextLives += 1;
        setSurvivalHealNotice(true);
      }
    }
    if (isCrowdTrap) {
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
      }, 900);
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
      setSurvivalPicked(null);
    } else {
      const nextBatch = await fetchQuestions(selectedCategory, 5, customCategory, bannedCategories);
      setQuestions(nextBatch);
      setSurvivalBatchIdx(0);
      setSurvivalRound((p) => p + 1);
      setSurvivalPicked(null);
    }
  };

  // Local Pass & Play Handlers
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
    setLocalAnswers({});
    setLocalReveal(false);
    setLocalFinished(false);
    setScreen('local_game');
  };

  const handleLocalSecretPick = (optionIdx) => {
    const updatedAnswers = { ...localAnswers, [localTurnIndex]: optionIdx };
    setLocalAnswers(updatedAnswers);
    if (localTurnIndex + 1 < localPlayers.length) {
      setLocalTurnIndex(localTurnIndex + 1);
      setLocalPrivacyScreen(true);
    } else {
      const currentQ = questions[localRound];
      const scored = localPlayers.map((p, idx) => {
        const { points } = calculateRoundPoints(currentQ.options, updatedAnswers[idx], 0, 'normal');
        return { ...p, lastRoundPoints: points, score: p.score + points };
      });
      setLocalPlayers(scored);
      setLocalReveal(true);
      triggerConfetti();
    }
  };

  const handleLocalNextRound = async () => {
    if (localRound + 1 < questions.length) {
      setLocalRound((p) => p + 1);
      setLocalTurnIndex(0);
      setLocalPrivacyScreen(true);
      setLocalAnswers({});
      setLocalReveal(false);
    } else {
      setLocalFinished(true);
      triggerConfetti();
      if (localPlayers[0]?.score > 0) {
        await savePlayerProgress({ earnedScore: localPlayers[0].score });
      }
    }
  };

  // Online Multiplayer Handlers
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
        players: {
          [user.id]: {
            id: user.id,
            displayName: user.displayName,
            avatar: user.avatar || '😎',
            score: 0,
            currentPick: null
          }
        },
        createdAt: serverTimestamp()
      });
      setActiveRoomCode(code);
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
          currentPick: null
        }
      });
      setActiveRoomCode(code);
      setScreen('online_lobby');
    } catch (err) {
      setOnlineError((lang === 'th' ? 'เข้าห้องไม่สำเร็จ: ' : 'Join failed: ') + err.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const submitOnlinePick = async (optionIdx) => {
    if (!roomData || !activeRoomCode) return;
    const me = roomData.players?.[user.id];
    if (!me || me.currentPick !== null) return;

    const updatedPlayers = {
      ...roomData.players,
      [user.id]: { ...me, currentPick: optionIdx }
    };
    const allList = Object.values(updatedPlayers);
    if (allList.every((p) => p.currentPick !== null)) {
      const currentQ = roomData.questions[roomData.currentRound];
      const scored = {};
      allList.forEach((p) => {
        const { points } = calculateRoundPoints(currentQ.options, p.currentPick, 0, 'normal');
        scored[p.id] = { ...p, lastPoints: points, score: (p.score || 0) + points };
      });
      await updateDoc(doc(db, 'rooms', activeRoomCode), { players: scored, status: 'reveal' });
    } else {
      await updateDoc(doc(db, 'rooms', activeRoomCode), {
        [`players.${user.id}.currentPick`]: optionIdx
      });
    }
  };

  const forceRevealOnline = async () => {
    if (!roomData || !activeRoomCode) return;
    const currentQ = roomData.questions[roomData.currentRound];
    const scored = {};
    Object.values(roomData.players || {}).forEach((p) => {
      if (p.currentPick !== null) {
        const { points } = calculateRoundPoints(currentQ.options, p.currentPick, 0, 'normal');
        scored[p.id] = { ...p, lastPoints: points, score: (p.score || 0) + points };
      } else {
        scored[p.id] = { ...p, lastPoints: 0 };
      }
    });
    await updateDoc(doc(db, 'rooms', activeRoomCode), { players: scored, status: 'reveal' });
  };

  const nextOnlineRound = async () => {
    if (!roomData || !activeRoomCode) return;
    const nextIdx = roomData.currentRound + 1;
    if (nextIdx < roomData.questions.length) {
      const reset = {};
      Object.values(roomData.players || {}).forEach((p) => {
        reset[p.id] = { ...p, currentPick: null, lastPoints: 0 };
      });
      await updateDoc(doc(db, 'rooms', activeRoomCode), {
        players: reset,
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
                  {lang === 'th' ? 'ทายสวนกระแส' : 'Think Against the Crowd'}
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
  // 2. หน้าหลักเลือกโหมด + พิมพ์หมวดหมู่ AI + แบนหมวดหมู่ + Leaderboard
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
          {/* Hero Rule Card + Share Button */}
          <div className="bg-gradient-to-r from-indigo-950/90 via-purple-950/70 to-slate-900/90 border border-indigo-500/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-base mb-1">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                {lang === 'th'
                  ? 'กติกา: เลือกคำตอบที่คนเลือก "น้อยที่สุด"!'
                  : 'Rule: Pick the answer chosen by the FEWEST people!'}
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                {lang === 'th'
                  ? 'ยิ่งคนตอบน้อย ยิ่งได้แต้มเยอะ (+150 แต้ม) แต่ถ้าตอบตรงใจคนส่วนใหญ่รับ 0 แต้ม!'
                  : 'Fewer votes = higher score (+150 pts). Picking the crowd favorite gets 0 pts!'}
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
            {/* Custom AI Category Input */}
            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-indigo-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  {lang === 'th'
                    ? 'พิมพ์หมวดหมู่เอง (AI จะคิดคำถามให้ตรงหัวข้อ)'
                    : 'Type Custom Topic (AI Generates Questions)'}
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
                      ? 'เช่น อนิเมะญี่ปุ่น, เกม ROV, K-Pop, ชีวิตเด็กหอ, การเงิน...'
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

            {/* Preset Category Pills + Rounds */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  {lang === 'th'
                    ? 'หรือเลือกหมวดหมู่หลัก (กดปุ่ม 🚫 เพื่อแบนหมวด)'
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
                            title={lang === 'th' ? 'แบน / ปลดแบนหมวดนี้' : 'Ban / Unban'}
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

            {/* Custom Topic Ban Input & Active Banned Tags */}
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
                        onClick={() => removeBan(item.key)}
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
            {/* Solo Mode */}
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
                    ? 'ทายสวนกระแสตามจำนวนข้อที่เลือก สะสมคะแนนเข้า Hall of Fame'
                    : 'Classic solo run to climb the Hall of Fame.'}
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

            {/* Survival Mode */}
            <div className="bg-gradient-to-br from-[#191020] to-[#0f1626] border border-rose-500/40 hover:border-rose-400/70 transition-colors rounded-3xl p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                    <Skull className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 flex items-center gap-1">
                    ❤️❤️❤️ {lang === 'th' ? 'ไร้ขีดจำกัด' : 'Endless'}
                  </span>
                </div>
                <h2 className="font-bold text-base text-white mb-1">
                  {lang === 'th' ? 'โหมดเอาชีวิตรอด (Survival)' : 'Survival Mode'}
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  {lang === 'th'
                    ? 'มี 3 หัวใจ! ตอบตรงกระแสหลักเสีย 1 หัวใจ สตรีคครบ 3 ได้หัวใจคืน +1 ทำสถิติสูงสุด!'
                    : '3 lives! Avoid the crowd trap, hit 3-streaks to heal, set your Survival record!'}
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

            {/* Single-Device Multiplayer */}
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
                    ? 'ผลัดกันแอบเลือกคำตอบบนมือถือเครื่องเดียว แล้วมาลุ้นเฉลยพร้อมกัน'
                    : 'Secret turn-by-turn picks on one device.'}
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

            {/* Online Multiplayer */}
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
                    ? 'สร้างห้องรับลิงก์ชวนเพื่อน หรือกรอกรหัสห้อง 6 หลักเพื่อเล่นคนละเครื่อง'
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
                  : lang === 'th' ? 'สถิติโหมดเอาชีวิตรอด (Survival)' : 'Survival Mode Top Scores'}
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
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-colors ${
                        idx === 0
                          ? 'bg-amber-500/10 border-amber-500/35'
                          : isMe
                          ? 'bg-indigo-500/10 border-indigo-500/40'
                          : 'bg-[#080d18] border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 text-center text-sm font-black text-amber-300 shrink-0">
                          {medal}
                        </span>
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
                            {leaderboardTab === 'hof' ? (
                              <>
                                <span>🔥 {lang === 'th' ? 'สตรีคสูงสุด' : 'Streak'} {item.bestStreak || 0}</span>
                                {(item.survivalScore || 0) > 0 && (
                                  <span className="text-rose-300">💀 {item.survivalScore}</span>
                                )}
                              </>
                            ) : (
                              <span>
                                🛡️ {lang === 'th' ? `รอดสูงสุด ${item.survivalBestRound || 1} ด่าน` : `Best Round ${item.survivalBestRound || 1}`}
                              </span>
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
                          {leaderboardTab === 'hof' ? item.score || 0 : item.survivalScore || 0}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1">
                          {lang === 'th' ? 'แต้ม' : 'pts'}
                        </span>
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
  // 3. โหมดเอาชีวิตรอด (SURVIVAL MODE)
  // =========================================================================
  if (screen === 'survival') {
    const currentQ = questions[survivalBatchIdx];
    const lowestIdx = currentQ ? getLowestPctIndex(currentQ.options) : 0;
    const highestIdx = currentQ ? getHighestPctIndex(currentQ.options) : 0;

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
            <p className="text-xs text-slate-400 mb-5">
              {lang === 'th'
                ? `คุณเอาชีวิตรอดได้ถึงด่านที่ ${survivalRound}`
                : `You survived until Round ${survivalRound}`}
            </p>
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
                      ? `💀 ฉันทำคะแนนโหมด Survival ได้ ${survivalScore} แต้ม (รอดถึงด่าน ${survivalRound}) ใน Reverse Trivia! มาลองท้าชิงกัน:`
                      : `💀 I scored ${survivalScore} pts (Round ${survivalRound}) in Reverse Trivia Survival! Beat my score:`,
                  url: window.location.origin
                })
              }
              className="btn-press w-full mb-3 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-bold text-sm flex items-center justify-center gap-2"
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

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-black">
                💀 {lang === 'th' ? `ด่าน ${survivalRound}` : `Round ${survivalRound}`}
              </span>
              <span className="text-xs text-slate-400">
                {questionSource === 'ai-custom'
                  ? `✨ ${customCategory.trim()}`
                  : questionSource === 'ai'
                  ? '✨ Gemini AI'
                  : '🎲 Classic'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((h) => (
                  <Heart
                    key={h}
                    className={`w-4 h-4 transition-transform duration-300 ${
                      h <= survivalLives
                        ? 'text-rose-500 fill-rose-500 scale-100'
                        : 'text-slate-700 scale-75'
                    }`}
                  />
                ))}
              </div>
              <span className="text-amber-400 font-black text-sm">{survivalScore}</span>
              <span className="text-orange-400 font-bold text-xs">🔥{survivalStreak}</span>
            </div>
          </div>

          {survivalHealNotice && (
            <div className="anim-pop mb-4 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
              ❤️ {lang === 'th' ? 'สตรีคครบ 3 ข้อ! ฟื้นฟูหัวใจ +1 ดวง!' : '3-Streak Bonus! +1 Heart Restored!'}
            </div>
          )}

          <h3 className="text-base sm:text-lg font-bold text-white mb-5 leading-snug">
            {currentQ?.question[lang]}
          </h3>

          <div className="space-y-2.5">
            {currentQ?.options.map((opt, idx) => {
              const revealed = survivalPicked !== null;
              const isChosen = survivalPicked === idx;
              const isLowest = idx === lowestIdx;
              const isTrap = idx === highestIdx;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleSurvivalPick(idx)}
                  className={`btn-press w-full text-left p-4 rounded-2xl border ${
                    !revealed
                      ? 'bg-[#080d18] hover:bg-rose-500/10 border-slate-800 hover:border-rose-500/50'
                      : isLowest
                      ? 'bg-emerald-500/15 border-emerald-500/60'
                      : isTrap && isChosen
                      ? 'bg-rose-600/20 border-rose-500'
                      : isChosen
                      ? 'bg-indigo-500/15 border-indigo-400/60'
                      : 'bg-[#080d18] border-slate-800 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2 text-white">
                      {revealed && isLowest && <Crown className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {revealed && isTrap && <Skull className="w-4 h-4 text-rose-400 shrink-0" />}
                      {opt[lang]}
                    </span>
                    {revealed && (
                      <span
                        className={
                          isLowest
                            ? 'text-emerald-400 font-black'
                            : isTrap
                            ? 'text-rose-400 font-black'
                            : 'text-slate-300'
                        }
                      >
                        {opt.pct}%
                      </span>
                    )}
                  </div>
                  {revealed && (
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isLowest ? 'bg-emerald-500' : isTrap ? 'bg-rose-500' : 'bg-indigo-500/70'
                        }`}
                        style={{ width: `${opt.pct}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {survivalPicked !== null && survivalLives > 0 && (
            <button
              type="button"
              disabled={loadingQuestions}
              onClick={handleSurvivalNext}
              className="btn-press anim-fade-up mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              {loadingQuestions ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {lang === 'th' ? 'AI กำลังสร้างด่านถัดไป...' : 'Generating next wave...'}
                </>
              ) : (
                <>
                  {lang === 'th' ? 'ลุยด่านต่อไป' : 'Next Round'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. หน้าตั้งค่าผู้เล่นหลายคนในเครื่องเดียว
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
  // 5. หน้าเล่นเกมผู้เล่นหลายคนในเครื่องเดียว
  // =========================================================================
  if (screen === 'local_game') {
    const currentQ = questions[localRound];
    const currentPlayer = localPlayers[localTurnIndex];
    const lowestIdx = currentQ ? getLowestPctIndex(currentQ.options) : 0;

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
              {lang === 'th' ? 'สรุปผลผู้ชนะ!' : 'Final Standings!'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              {lang === 'th'
                ? `ผู้ชนะคือ ${sorted[0]?.name} (${sorted[0]?.score} คะแนน)`
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
                    <span className="font-bold text-sm text-white">{p.name}</span>
                  </div>
                  <span className="font-bold text-amber-400 text-sm">
                    {p.score} {lang === 'th' ? 'คะแนน' : 'pts'}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                shareLink({
                  text:
                    lang === 'th'
                      ? `👑 ผลเกม Reverse Trivia! ผู้ชนะคือ ${sorted[0]?.name} (${sorted[0]?.score} แต้ม) มาเล่นกันเลย:`
                      : `👑 ${sorted[0]?.name} won our Reverse Trivia game with ${sorted[0]?.score} pts!`,
                  url: window.location.origin
                })
              }
              className="btn-press w-full mb-3 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {lang === 'th' ? 'แชร์ผลเกมให้เพื่อน' : 'Share Results'}
            </button>
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
          key={`${localRound}-${localTurnIndex}-${localPrivacyScreen}-${localReveal}`}
          className="relative z-10 anim-fade-up w-full max-w-xl mx-auto bg-[#0f1626]/95 border border-slate-800 rounded-3xl p-6 shadow-2xl"
        >
          <ConfettiBurst active={fxConfetti} />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
            <span className="font-bold text-emerald-400">
              {lang === 'th' ? `ข้อที่ ${localRound + 1} / ${questions.length}` : `Round ${localRound + 1}/${questions.length}`}
            </span>
            <span>
              {questionSource === 'ai-custom'
                ? `✨ ${customCategory.trim()}`
                : questionSource === 'ai'
                ? '✨ Gemini AI'
                : '🎲 Classic'}
            </span>
          </div>

          {!localReveal && localPrivacyScreen ? (
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
                  {lang === 'th' ? 'คนอื่นห้ามแอบดูหน้าจอนะ!' : 'No peeking!'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPrivacyScreen(false)}
                className="btn-press px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
              >
                {lang === 'th' ? `ฉันคือ ${currentPlayer.name} — พร้อมตอบ!` : `I am ${currentPlayer.name} — Ready!`}
              </button>
            </div>
          ) : !localReveal ? (
            <div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 text-xs font-semibold mb-4 w-fit">
                <span>{currentPlayer.avatar}</span>
                <span>{currentPlayer.name}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-5">
                {currentQ.question[lang]}
              </h3>
              <div className="space-y-2.5">
                {currentQ.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLocalSecretPick(idx)}
                    className="btn-press w-full text-left p-4 rounded-2xl bg-[#080d18] hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500 flex items-center justify-between"
                  >
                    <span className="text-sm font-medium text-slate-100">{opt[lang]}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-base font-bold text-white mb-4">{currentQ.question[lang]}</h3>
              <div className="space-y-3 mb-6">
                {currentQ.options.map((opt, idx) => {
                  const isLowest = idx === lowestIdx;
                  const pickers = localPlayers.filter((_, pIdx) => localAnswers[pIdx] === idx);
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border ${
                        isLowest ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-[#080d18] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm font-semibold mb-1.5">
                        <span className="flex items-center gap-2 text-white">
                          {isLowest && <Crown className="w-4 h-4 text-emerald-400" />}
                          {opt[lang]}
                        </span>
                        <span className={isLowest ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {opt.pct}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isLowest ? 'bg-emerald-500' : 'bg-indigo-500/60'
                          }`}
                          style={{ width: `${opt.pct}%` }}
                        />
                      </div>
                      {pickers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {pickers.map((pk, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200"
                            >
                              {pk.avatar} {pk.name} (+{pk.lastRoundPoints})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
  // 6. หน้าเล่นเกมคนเดียว (SOLO)
  // =========================================================================
  if (screen === 'solo') {
    const currentQ = questions[soloRound];
    const lowestIdx = currentQ ? getLowestPctIndex(currentQ.options) : 0;

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
              {lang === 'th' ? 'จบเกมแล้ว!' : 'Game Over!'}
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-4 rounded-2xl bg-[#080d18] border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'th' ? 'คะแนนรอบนี้' : 'Score'}</div>
                <div className="text-2xl font-bold text-amber-400">{soloScore}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#080d18] border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'th' ? 'สตรีคสูงสุด' : 'Best Streak'}</div>
                <div className="text-2xl font-bold text-orange-400">{soloBestStreak}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                shareLink({
                  title: 'Reverse Trivia Score',
                  text:
                    lang === 'th'
                      ? `🏆 ฉันทำได้ ${soloScore} คะแนน (สตรีค ${soloBestStreak}) ในเกม Reverse Trivia! มาลองทายสวนกระแสกัน:`
                      : `🏆 I scored ${soloScore} pts in Reverse Trivia! Come try it:`,
                  url: window.location.origin
                })
              }
              className="btn-press w-full mb-3 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {lang === 'th' ? 'แชร์คะแนนให้เพื่อน' : 'Share Score'}
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
          <div className="flex items-center justify-between text-xs mb-4">
            <span className="font-bold text-indigo-400">
              {lang === 'th' ? `ข้อที่ ${soloRound + 1} / ${questions.length}` : `Q${soloRound + 1}/${questions.length}`}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                {questionSource === 'ai-custom'
                  ? `✨ ${customCategory.trim()}`
                  : questionSource === 'ai'
                  ? '✨ AI'
                  : '🎲 Classic'}
              </span>
              <span className="text-amber-400 font-bold">{soloScore} {lang === 'th' ? 'แต้ม' : 'pts'}</span>
              <span className="text-orange-400 font-bold">🔥 {soloStreak}</span>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-5 leading-snug">
            {currentQ?.question[lang]}
          </h3>

          <div className="space-y-2.5">
            {currentQ?.options.map((opt, idx) => {
              const revealed = soloPicked !== null;
              const isChosen = soloPicked === idx;
              const isLowest = idx === lowestIdx;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleSoloPick(idx)}
                  className={`btn-press w-full text-left p-4 rounded-2xl border ${
                    !revealed
                      ? 'bg-[#080d18] hover:bg-indigo-600/20 border-slate-800 hover:border-indigo-500'
                      : isLowest
                      ? 'bg-emerald-500/15 border-emerald-500/60'
                      : isChosen
                      ? 'bg-rose-500/15 border-rose-500/50'
                      : 'bg-[#080d18] border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2 text-white">
                      {revealed && isLowest && <Crown className="w-4 h-4 text-emerald-400" />}
                      {opt[lang]}
                    </span>
                    {revealed && (
                      <span className={isLowest ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                        {opt.pct}%
                      </span>
                    )}
                  </div>
                  {revealed && (
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isLowest ? 'bg-emerald-500' : 'bg-indigo-500/60'
                        }`}
                        style={{ width: `${opt.pct}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {soloPicked !== null && (
            <button
              type="button"
              onClick={handleSoloNext}
              className="btn-press anim-fade-up mt-5 w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              {soloRound + 1 < questions.length
                ? lang === 'th' ? 'ข้อถัดไป' : 'Next Question'
                : lang === 'th' ? 'ดูสรุปคะแนน' : 'Finish'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 7. โหมดห้องออนไลน์หลายคน (ONLINE MULTIPLAYER)
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
                    <span className="text-sm font-bold text-white">{p.displayName}</span>
                  </div>
                  <span className="text-sm font-bold text-amber-400">{p.score || 0}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                shareLink({
                  text:
                    lang === 'th'
                      ? `👑 ผลห้องออนไลน์ Reverse Trivia! ${sorted[0]?.displayName} ชนะด้วยคะแนน ${sorted[0]?.score || 0} แต้ม!`
                      : `👑 ${sorted[0]?.displayName} won Reverse Trivia Online with ${sorted[0]?.score || 0} pts!`,
                  url: window.location.origin
                })
              }
              className="btn-press w-full mb-3 py-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {lang === 'th' ? 'แชร์ผลการแข่งขัน' : 'Share Results'}
            </button>
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
    const myPick = roomData.players?.[user.id]?.currentPick ?? null;
    const isReveal = roomData.status === 'reveal';
    const lowestIdx = currentQ ? getLowestPctIndex(currentQ.options) : 0;

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
          <div className="flex items-center justify-between text-xs mb-4">
            <span className="font-bold text-purple-400">
              {lang === 'th'
                ? `ห้อง ${activeRoomCode} • ข้อ ${roomData.currentRound + 1}/${roomData.questions.length}`
                : `Room ${activeRoomCode} • Q${roomData.currentRound + 1}/${roomData.questions.length}`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                {playersList.filter((p) => p.currentPick !== null).length}/{playersList.length}
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

          <div className="space-y-2.5">
            {currentQ?.options.map((opt, idx) => {
              const isLowest = idx === lowestIdx;
              const isMine = myPick === idx;
              const pickers = playersList.filter((p) => p.currentPick === idx);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={myPick !== null || isReveal}
                  onClick={() => submitOnlinePick(idx)}
                  className={`btn-press w-full text-left p-4 rounded-2xl border ${
                    !isReveal
                      ? isMine
                        ? 'bg-purple-600/20 border-purple-500'
                        : 'bg-[#080d18] hover:border-purple-500/50 border-slate-800'
                      : isLowest
                      ? 'bg-emerald-500/15 border-emerald-500/60'
                      : 'bg-[#080d18] border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2 text-white">
                      {isReveal && isLowest && <Crown className="w-4 h-4 text-emerald-400" />}
                      {opt[lang]}
                    </span>
                    {isReveal && (
                      <span className={isLowest ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                        {opt.pct}%
                      </span>
                    )}
                  </div>
                  {isReveal && (
                    <>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isLowest ? 'bg-emerald-500' : 'bg-purple-500/60'
                          }`}
                          style={{ width: `${opt.pct}%` }}
                        />
                      </div>
                      {pickers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {pickers.map((pk) => (
                            <span
                              key={pk.id}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200"
                            >
                              {pk.avatar} {pk.displayName} (+{pk.lastPoints || 0})
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {!isReveal && myPick !== null && (
            <div className="mt-4 text-center space-y-2">
              <p className="text-xs text-slate-400">
                {lang === 'th' ? 'เลือกแล้ว! รอเพื่อนคนอื่น...' : 'Locked in! Waiting...'}
              </p>
              {isHost && (
                <button
                  type="button"
                  onClick={forceRevealOnline}
                  className="text-xs text-purple-400 underline"
                >
                  {lang === 'th' ? 'เฉลยทันที' : 'Reveal Now'}
                </button>
              )}
            </div>
          )}

          {isReveal && isHost && (
            <button
              type="button"
              onClick={nextOnlineRound}
              className="btn-press anim-fade-up mt-5 w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              {roomData.currentRound + 1 < roomData.questions.length
                ? lang === 'th' ? 'ข้อถัดไป' : 'Next Question'
                : lang === 'th' ? 'สรุปผลผู้ชนะ' : 'Results'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
// END OF FILE
