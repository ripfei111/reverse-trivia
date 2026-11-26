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
  TrendingUp
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

// ชุดคำถามปลายเปิดสำรอง (ใช้ทันทีหาก AI ตอบช้า)
const FALLBACK_QUESTIONS = [
  {
    category: 'food',
    question: {
      th: 'บอกชื่อ "เมนูอาหารตามสั่งในไทย" มา 1 อย่างที่คนมักจะนึกถึงน้อยที่สุด',
      en: 'Name 1 Thai street food dish that very few people think of first'
    },
    hint: { th: 'ต้องเป็นเมนูที่มีขายจริงตามร้านอาหารตามสั่ง', en: 'Must be a real street food dish' },
    commonExamples: ['กะเพรา', 'ผัดกะเพรา', 'ข้าวผัด', 'ไข่เจียว', 'หมูกระเทียม', 'basil', 'fried rice', 'omelette']
  },
  {
    category: 'food',
    question: {
      th: 'บอกชื่อ "ผลไม้ที่มีสีแดงหรือชมพู" มา 1 ชนิดแบบไม่ซ้ำใคร',
      en: 'Name 1 red or pink fruit that most people forget'
    },
    hint: { th: 'ยิ่งหายากแต่มีอยู่จริง ยิ่งได้คะแนนสูง', en: 'Rarer real fruits score higher' },
    commonExamples: ['แอปเปิ้ล', 'สตรอว์เบอร์รี', 'แตงโม', 'เชอร์รี', 'apple', 'strawberry', 'watermelon', 'cherry']
  },
  {
    category: 'daily',
    question: {
      th: 'บอกชื่อ "สิ่งของที่มักวางอยู่บนโต๊ะทำงาน" มา 1 อย่างที่คนนึกถึงน้อยที่สุด',
      en: 'Name 1 item commonly found on a desk that few people mention'
    },
    hint: { th: 'ต้องเป็นของที่วางบนโต๊ะทำงานได้จริง', en: 'Must realistically be on a desk' },
    commonExamples: ['ปากกา', 'คอมพิวเตอร์', 'โน้ตบุ๊ก', 'เมาส์', 'แก้วน้ำ', 'มือถือ', 'pen', 'laptop', 'mouse', 'phone']
  },
  {
    category: 'daily',
    question: {
      th: 'บอกชื่อ "แอปพลิเคชันบนมือถือ" ที่คนใช้งานจริงแต่ไม่ค่อยมีใครนึกถึงเป็นอันดับแรก',
      en: 'Name 1 real smartphone app that few people think of first'
    },
    hint: { th: 'หลีกเลี่ยงแอปโซเชียลยอดฮิตระดับโลก', en: 'Avoid the top mainstream social apps' },
    commonExamples: ['line', 'ไลน์', 'facebook', 'เฟซบุ๊ก', 'tiktok', 'ติ๊กต็อก', 'youtube', 'instagram', 'ig']
  },
  {
    category: 'travel',
    question: {
      th: 'บอกชื่อ "จังหวัดในประเทศไทย" มา 1 จังหวัดที่คนมักนึกชื่อออกเป็นลำดับท้าย ๆ',
      en: 'Name 1 province in Thailand that people rarely think of first'
    },
    hint: { th: 'ต้องเป็นชื่อจังหวัดในไทยจริง ๆ', en: 'Must be an actual Thai province' },
    commonExamples: ['กรุงเทพ', 'เชียงใหม่', 'ภูเก็ต', 'ชลบุรี', 'ขอนแก่น', 'bangkok', 'chiang mai', 'phuket']
  },
  {
    category: 'travel',
    question: {
      th: 'บอกชื่อ "ประเทศในทวีปยุโรป" มา 1 ประเทศที่คนส่วนใหญ่มักนึกไม่ถึง',
      en: 'Name 1 European country that few people think of first'
    },
    hint: { th: 'ประเทศเล็ก ๆ ในยุโรปมักได้คะแนนสวนกระแสสูงมาก', en: 'Smaller European nations score high' },
    commonExamples: ['อังกฤษ', 'ฝรั่งเศส', 'อิตาลี', 'เยอรมนี', 'สเปน', 'สวิตเซอร์แลนด์', 'france', 'italy', 'uk', 'germany', 'spain']
  },
  {
    category: 'pop',
    question: {
      th: 'บอกชื่อ "กีฬาที่มีแข่งในโอลิมปิก" มา 1 ชนิดที่คนไม่ค่อยนึกถึง',
      en: 'Name 1 Olympic sport that most people forget about'
    },
    hint: { th: 'ต้องเป็นกีฬาที่เคยหรือกำลังแข่งในโอลิมปิกจริง', en: 'Must be a real Olympic sport' },
    commonExamples: ['ฟุตบอล', 'ว่ายน้ำ', 'วิ่ง', 'บาสเกตบอล', 'วอลเลย์บอล', 'แบดมินตัน', 'football', 'swimming', 'basketball']
  },
  {
    category: 'pop',
    question: {
      th: 'บอกชื่อ "เครื่องดนตรี" มา 1 ชนิดที่คนส่วนใหญ่มักไม่ตอบเป็นอันดับแรก',
      en: 'Name 1 musical instrument that people rarely name first'
    },
    hint: { th: 'เครื่องดนตรีสากลหรือดนตรีพื้นบ้านก็ได้ทั้งหมด', en: 'Any real instrument worldwide counts' },
    commonExamples: ['กีตาร์', 'เปียโน', 'กลอง', 'ไวโอลิน', 'guitar', 'piano', 'drums', 'violin']
  },
  {
    category: 'tech',
    question: {
      th: 'บอกชื่อ "ภาษาโปรแกรมมิ่งหรือชื่อแบรนด์ไอที" มา 1 ชื่อแบบสวนกระแส',
      en: 'Name 1 programming language or tech brand that few people mention first'
    },
    hint: { th: 'แบรนด์เก่าหรือภาษาเฉพาะทางมักได้คะแนนสูง', en: 'Niche languages or brands score higher' },
    commonExamples: ['python', 'java', 'javascript', 'apple', 'samsung', 'google', 'microsoft']
  },
  {
    category: 'movies',
    question: {
      th: 'บอกชื่อ "ตัวละครซูเปอร์ฮีโร่หรือตัวละครอนิเมะ" มา 1 ตัวแบบที่คนไม่ค่อยนึกถึง',
      en: 'Name 1 superhero or anime character that few people think of first'
    },
    hint: { th: 'ตัวละครรองหรือตัวละครคลาสสิกช่วยสวนกระแสได้ดี', en: 'Supporting or classic characters work great' },
    commonExamples: ['สไปเดอร์แมน', 'ไอรอนแมน', 'แบทแมน', 'นารูโตะ', 'ลูฟี่', 'โดราเอมอน', 'spiderman', 'batman', 'naruto', 'luffy']
  }
];

function computeScoreFromJudge(judgeResult, streak = 0, mode = 'normal') {
  if (!judgeResult || !judgeResult.valid) {
    return {
      points: 0,
      isReverseMaster: false,
      isTrap: true,
      tier: 'invalid'
    };
  }
  const pct = Math.min(99, Math.max(1, Math.round(Number(judgeResult.crowdPct) || 50)));
  if (pct >= 65) {
    return {
      points: 0,
      isReverseMaster: false,
      isTrap: true,
      tier: 'crowd'
    };
  }
  if (pct <= 20) {
    const base = mode === 'survival' ? Math.round((100 - pct) * 2.2) : Math.round((100 - pct) * 2);
    const bonus = streak * (mode === 'survival' ? 35 : 25);
    return {
      points: base + bonus,
      isReverseMaster: true,
      isTrap: false,
      tier: 'rare'
    };
  }
  const normalPts = Math.max(20, Math.round((100 - pct) * 1.4));
  return {
    points: normalPts,
    isReverseMaster: false,
    isTrap: false,
    tier: 'good'
  };
}

function localFallbackJudge(questionObj, submissions) {
  const commonList = (questionObj?.commonExamples || []).map((s) => s.toLowerCase());
  return submissions.map((sub) => {
    const ans = (sub.answer || '').trim();
    const lower = ans.toLowerCase();

    if (ans.length < 2 || /^[\d\s\W]+$/.test(ans)) {
      return {
        key: String(sub.key),
        valid: false,
        crowdPct: 100,
        feedback: {
          th: 'คำตอบสั้นเกินไปหรือไม่ชัดเจน ลองพิมพ์คำตอบที่เป็นคำจริง ๆ นะครับ',
          en: 'Answer is too short or unclear. Please type a valid answer.'
        }
      };
    }

    const hitCommon = commonList.some((c) => lower.includes(c) || c.includes(lower));
    if (hitCommon) {
      const pct = 72 + (ans.length % 18);
      return {
        key: String(sub.key),
        valid: true,
        crowdPct: pct,
        feedback: {
          th: 'คำตอบนี้ถูกต้อง แต่ยอดฮิตเกินไป! คนส่วนใหญ่ตอบเหมือนกันเพียบเลย',
          en: 'Correct, but way too popular! Most people thought of this too.'
        }
      };
    }

    let hash = 0;
    for (let i = 0; i < ans.length; i++) hash = (hash * 31 + ans.charCodeAt(i)) % 100;
    const pct = Math.max(6, Math.min(46, 48 - Math.min(28, ans.length * 2) + (hash % 14)));
    return {
      key: String(sub.key),
      valid: true,
      crowdPct: pct,
      feedback: {
        th: pct <= 20 ? 'สวนกระแสสุดยอด! คำตอบเฉพาะตัวมาก คนส่วนใหญ่นึกไม่ถึง' : 'คำตอบใช้ได้เลย! แหวกแนวกว่าคนส่วนใหญ่พอสมควร',
        en: pct <= 20 ? 'Brilliant reverse answer! Very few people think of this.' : 'Solid answer! More unique than average.'
      }
    };
  });
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

const GlobalStyles = memo(() => (
  <style>{`
    @keyframes fadeUp {
      0% { opacity: 0; transform: translate3d(0, 14px, 0); }
      100% { opacity: 1; transform: translate3d(0, 0, 0); }
    }
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.86); }
      70% { transform: scale(1.05); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes floatSlow {
      0%, 100% { transform: translate3d(0, 0, 0); }
      50% { transform: translate3d(0, -7px, 0); }
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
      50% { transform: translate3d(18px, -16px, 0) scale(1.06); }
    }
    @keyframes confettiFall {
      0% { opacity: 1; transform: translate3d(0, -10px, 0) rotate(0deg); }
      100% { opacity: 0; transform: translate3d(var(--tx), 140px, 0) rotate(360deg); }
    }
    @keyframes toastSlide {
      0% { opacity: 0; transform: translate3d(-50%, 16px, 0) scale(0.95); }
      100% { opacity: 1; transform: translate3d(-50%, 0, 0) scale(1); }
    }
    @keyframes climbHop {
      0%, 100% { transform: translateY(0) scale(1); }
      35% { transform: translateY(-9px) scale(1.12); }
      70% { transform: translateY(-3px) scale(1.04); }
    }
    @keyframes deltaRise {
      0% { opacity: 0; transform: translateY(8px) scale(0.85); }
      25% { opacity: 1; transform: translateY(-4px) scale(1.08); }
      100% { opacity: 1; transform: translateY(-10px) scale(1); }
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.25; }
      50% { opacity: 0.95; }
    }
    .anim-fade-up { animation: fadeUp 0.34s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .anim-pop { animation: popIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .anim-float { animation: floatSlow 3.2s ease-in-out infinite; }
    .anim-shake { animation: shakeX 0.42s ease-in-out both; }
    .anim-orb { animation: orbDrift 11s ease-in-out infinite; will-change: transform; }
    .anim-toast { animation: toastSlide 0.28s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .anim-climb-hop { animation: climbHop 0.65s ease-out 2; }
    .anim-delta { animation: deltaRise 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .anim-twinkle { animation: twinkle 2.4s ease-in-out infinite; }
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
  { left: '10%', color: '#34d399', tx: '-32px', delay: '0s' },
  { left: '22%', color: '#818cf8', tx: '24px', delay: '0.05s' },
  { left: '35%', color: '#fbbf24', tx: '-18px', delay: '0.1s' },
  { left: '48%', color: '#f472b6', tx: '28px', delay: '0.03s' },
  { left: '61%', color: '#38bdf8', tx: '-26px', delay: '0.08s' },
  { left: '74%', color: '#a78bfa', tx: '20px', delay: '0.12s' },
  { left: '86%', color: '#34d399', tx: '-22px', delay: '0.04s' },
  { left: '93%', color: '#fbbf24', tx: '15px', delay: '0.09s' }
];

const ConfettiBurst = memo(({ active }) => {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 h-36 overflow-hidden z-20">
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
// อนิเมชั่นการปีนหอคอยตามคะแนน (TOWER CLIMB ANIMATION COMPONENT)
// ============================================================================
const TowerClimbVisual = memo(({ climbers = [], lang = 'th', animTrigger = 0 }) => {
  const [animReady, setAnimReady] = useState(false);

  useEffect(() => {
    setAnimReady(false);
    const id = setTimeout(() => setAnimReady(true), 70);
    return () => clearTimeout(id);
  }, [animTrigger]);

  const maxScore = useMemo(() => {
    const highest = climbers.reduce((m, c) => Math.max(m, c.score || 0), 0);
    return Math.max(400, Math.ceil((highest + 160) / 200) * 200);
  }, [climbers]);

  const topClimberScore = useMemo(
    () => climbers.reduce((m, c) => Math.max(m, c.score || 0), 0),
    [climbers]
  );

  // เปลี่ยนบรรยากาศท้องฟ้าตามความสูงของหอคอย
  const zoneInfo = useMemo(() => {
    if (topClimberScore >= 1000) {
      return {
        bg: 'from-[#030510] via-[#130d2e] to-[#1e1b4b]',
        badge: lang === 'th' ? '🌌 โซนอวกาศ (Cosmic Peak)' : '🌌 Cosmic Peak',
        stars: true
      };
    }
    if (topClimberScore >= 600) {
      return {
        bg: 'from-[#1a1033] via-[#3b153c] to-[#1e1b4b]',
        badge: lang === 'th' ? '🌅 ชั้นบรรยากาศ (Stratosphere)' : '🌅 Stratosphere',
        stars: true
      };
    }
    if (topClimberScore >= 250) {
      return {
        bg: 'from-[#0c2340] via-[#172554] to-[#0f172a]',
        badge: lang === 'th' ? '☁️ เหนือก้อนเมฆ (Skyline)' : '☁️ Above the Clouds',
        stars: false
      };
    }
    return {
      bg: 'from-[#0f172a] via-[#111c33] to-[#0b2924]',
      badge: lang === 'th' ? '🗼 ฐานหอคอย (Tower Base)' : '🗼 Tower Base',
      stars: false
    };
  }, [topClimberScore, lang]);

  const milestones = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div
      className={`relative w-full h-56 sm:h-64 rounded-3xl overflow-hidden border border-slate-700/80 bg-gradient-to-b ${zoneInfo.bg} shadow-inner mb-5`}
    >
      {/* ดาวระยิบระยับเมื่อปีนสูง */}
      {zoneInfo.stars && (
        <div className="absolute inset-0 pointer-events-none">
          {[
            { top: '12%', left: '14%', d: '0s' },
            { top: '22%', left: '80%', d: '0.6s' },
            { top: '34%', left: '24%', d: '1.1s' },
            { top: '18%', left: '62%', d: '0.3s' },
            { top: '44%', left: '88%', d: '0.9s' },
            { top: '28%', left: '10%', d: '1.4s' }
          ].map((s, idx) => (
            <span
              key={idx}
              style={{ top: s.top, left: s.left, animationDelay: s.d }}
              className="anim-twinkle absolute w-1.5 h-1.5 rounded-full bg-white"
            />
          ))}
        </div>
      )}

      {/* ป้ายโซนความสูง */}
      <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        {zoneInfo.badge}
      </div>

      {/* ป้ายความสูงสูงสุด */}
      <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-amber-400/30 text-[11px] font-black text-amber-300">
        {topClimberScore}m / {maxScore}m
      </div>

      {/* เส้นระดับความสูงของหอคอย */}
      <div className="absolute inset-x-3 inset-y-6 flex flex-col justify-between pointer-events-none">
        {milestones.map((ratio, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400/80 w-10 text-right">
              {Math.round(maxScore * ratio)}m
            </span>
            <div className="flex-1 border-t border-dashed border-slate-500/25" />
          </div>
        ))}
      </div>

      {/* ตัวหอคอยตรงกลาง */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 sm:w-44 h-[90%] bg-slate-900/75 border-x-2 border-t-2 border-indigo-400/30 rounded-t-2xl shadow-2xl overflow-hidden pointer-events-none">
        {/* แสงเสากลาง */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-t from-emerald-500/30 via-indigo-400/30 to-amber-400/40" />
        {/* หน้าต่างหอคอยเรียงเป็นชั้น ๆ */}
        <div className="grid grid-cols-3 gap-2.5 p-3 pt-4 opacity-50">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className={`h-2.5 rounded-sm ${
                i % 4 === 0 ? 'bg-amber-300/60' : i % 3 === 0 ? 'bg-indigo-400/50' : 'bg-slate-700/70'
              }`}
            />
          ))}
        </div>
      </div>

      {/* พื้นฐานหอคอย */}
      <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-r from-emerald-950 via-emerald-700/50 to-emerald-950 border-t border-emerald-400/30" />

      {/* นักปีนหอคอย (รองรับ 1 คน หรือ หลายคนพร้อมกัน) */}
      <div className="absolute inset-x-12 bottom-3 top-8 z-10">
        {climbers.map((c, idx) => {
          const targetScore = animReady ? c.score || 0 : c.prevScore ?? c.score ?? 0;
          const pctHeight = Math.min(92, Math.max(2, (targetScore / maxScore) * 90));
          const leftPercent =
            climbers.length === 1
              ? 50
              : 18 + (idx / Math.max(1, climbers.length - 1)) * 64;
          const gained = (c.lastDelta || 0) > 0;
          const failed = c.isTrap && animReady;

          return (
            <div
              key={c.id || idx}
              style={{
                left: `${leftPercent}%`,
                bottom: `${pctHeight}%`,
                transition: 'bottom 1.15s cubic-bezier(0.22, 1, 0.36, 1)'
              }}
              className="absolute -translate-x-1/2 flex flex-col items-center"
            >
              {/* ป้ายคะแนนที่พุ่งขึ้น */}
              {animReady && gained && (
                <span className="anim-delta mb-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] shadow-lg whitespace-nowrap">
                  +{c.lastDelta}m 🚀
                </span>
              )}
              {failed && (
                <span className="anim-pop mb-1 px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] shadow-lg whitespace-nowrap">
                  0m 💥
                </span>
              )}

              {/* อวาตาร์นักปีนหอคอย */}
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-xl border-2 ${
                  gained && animReady
                    ? 'anim-climb-hop bg-emerald-500/25 border-emerald-400 shadow-emerald-500/40'
                    : failed
                    ? 'anim-shake bg-rose-500/25 border-rose-400'
                    : 'bg-slate-800/95 border-indigo-400/70'
                }`}
              >
                {c.avatar || '😎'}
              </div>

              {/* ชื่อและระดับความสูง */}
              <div className="mt-1 px-2 py-0.5 rounded-lg bg-slate-950/90 border border-slate-700/80 text-[10px] font-bold text-white whitespace-nowrap shadow">
                {c.name?.slice(0, 10)} • <span className="text-amber-300">{c.score || 0}m</span>
              </div>
            </div>
          );
        })}
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

  // Questions, Judging & FX
  const [questions, setQuestions] = useState([]);
  const [questionSource, setQuestionSource] = useState('ai');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [judgingAnswers, setJudgingAnswers] = useState(false);
  const [fxConfetti, setFxConfetti] = useState(false);
  const [fxShake, setFxShake] = useState(false);
  const [towerAnimTick, setTowerAnimTick] = useState(0);

  // Solo states (Text Input + AI Judge + Tower Climb)
  const [soloRound, setSoloRound] = useState(0);
  const [soloScore, setSoloScore] = useState(0);
  const [soloPrevScore, setSoloPrevScore] = useState(0);
  const [soloStreak, setSoloStreak] = useState(0);
  const [soloBestStreak, setSoloBestStreak] = useState(0);
  const [soloAnswerInput, setSoloAnswerInput] = useState('');
  const [soloResult, setSoloResult] = useState(null);
  const [soloFinished, setSoloFinished] = useState(false);

  // Survival states (3 Hearts + Endless + Tower Climb)
  const [survivalLives, setSurvivalLives] = useState(3);
  const [survivalRound, setSurvivalRound] = useState(1);
  const [survivalBatchIdx, setSurvivalBatchIdx] = useState(0);
  const [survivalScore, setSurvivalScore] = useState(0);
  const [survivalPrevScore, setSurvivalPrevScore] = useState(0);
  const [survivalStreak, setSurvivalStreak] = useState(0);
  const [survivalBestStreak, setSurvivalBestStreak] = useState(0);
  const [survivalAnswerInput, setSurvivalAnswerInput] = useState('');
  const [survivalResult, setSurvivalResult] = useState(null);
  const [survivalFinished, setSurvivalFinished] = useState(false);
  const [survivalHealNotice, setSurvivalHealNotice] = useState(false);

  // Local Pass & Play states (2–8 Players Secret Text Input + Batch AI Judge + Tower Climb)
  const [localPlayers, setLocalPlayers] = useState([
    { name: 'ผู้เล่น 1', avatar: '😎', score: 0, prevScore: 0 },
    { name: 'ผู้เล่น 2', avatar: '🦊', score: 0, prevScore: 0 }
  ]);
  const [localRound, setLocalRound] = useState(0);
  const [localTurnIndex, setLocalTurnIndex] = useState(0);
  const [localPrivacyScreen, setLocalPrivacyScreen] = useState(true);
  const [localAnswerInput, setLocalAnswerInput] = useState('');
  const [localAnswers, setLocalAnswers] = useState({});
  const [localResults, setLocalResults] = useState({});
  const [localReveal, setLocalReveal] = useState(false);
  const [localFinished, setLocalFinished] = useState(false);

  // Online Multiplayer states (Text Input + Batch AI Judge + Tower Climb)
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

  // Load saved user & URL room code
  useEffect(() => {
    const saved = localStorage.getItem('reverse_trivia_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          setUser(parsed);
          setLocalPlayers([
            { name: parsed.displayName || parsed.id, avatar: parsed.avatar || '😎', score: 0, prevScore: 0 },
            { name: 'ผู้เล่น 2', avatar: '🦊', score: 0, prevScore: 0 }
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

  // Subscribe to Active Online Room
  useEffect(() => {
    if (!activeRoomCode) return;
    const unsub = onSnapshot(
      doc(db, 'rooms', activeRoomCode),
      (snap) => {
        if (snap.exists()) {
          const nextData = snap.data();
          setRoomData((prev) => {
            if (prev?.status !== 'reveal' && nextData.status === 'reveal') {
              setTowerAnimTick((t) => t + 1);
            }
            if (prev?.currentRound !== nextData.currentRound) {
              setOnlineAnswerInput('');
            }
            return nextData;
          });
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

  // Universal Share Function
  const shareLink = useCallback(
    async ({ title, text, url, isRoom = false }) => {
      const shareUrl = url || window.location.origin;
      const shareTitle = title || 'Reverse Trivia — ทายสวนกระแส';
      const shareText =
        text ||
        (lang === 'th'
          ? 'มาเล่น Reverse Trivia เติมคำตอบสวนกระแสและปีนหอคอยแข่งกัน!'
          : 'Play Reverse Trivia — type unique answers and climb the tower!');

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
        if (prev.includes(catId)) return prev.filter((id) => id !== catId);
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
        { name: loggedUser.displayName, avatar: loggedUser.avatar, score: 0, prevScore: 0 },
        { name: lang === 'th' ? 'ผู้เล่น 2' : 'Player 2', avatar: '🦊', score: 0, prevScore: 0 }
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
        { name: loggedUser.displayName, avatar: loggedUser.avatar, score: 0, prevScore: 0 },
        { name: lang === 'th' ? 'ผู้เล่น 2' : 'Player 2', avatar: '🦊', score: 0, prevScore: 0 }
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
      { name: guestUser.displayName, avatar: '👾', score: 0, prevScore: 0 },
      { name: lang === 'th' ? 'ผู้เล่น 2' : 'Player 2', avatar: '🦊', score: 0, prevScore: 0 }
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

  // AI สร้างโจทย์ปลายเปิด (เติมคำตอบ) ตามหมวดหมู่ที่พิมพ์ + แบนหมวดหมู่
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
          ? `STRICTLY BAN / EXCLUDE any questions related to these forbidden topics: ${bannedStrings.join(', ')}.`
          : '';

      try {
        const prompt = `Generate ${count} open-ended "Reverse Trivia" (fill-in-the-blank) questions in BOTH natural Thai and English specifically about: "${targetTopic}".
${banClause}
Rules:
- Each question asks the player to TYPE 1 valid answer that fits a broad category (with many possible correct answers), trying to pick the most obscure/uncommon valid answer.
- Return ONLY a valid JSON array with no markdown or extra text:
[{"question":{"th":"บอกชื่อ...มา 1 อย่าง","en":"Name 1 ..."},"hint":{"th":"คำใบ้สั้นๆ","en":"Short hint"},"commonExamples":["ตัวอย่างยอดฮิต1","ตัวอย่างยอดฮิต2"]}]`;

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

        if (Array.isArray(parsed) && parsed.length > 0) {
          const validList = parsed
            .filter((q) => q?.question?.th || q?.question?.en)
            .map((q) => ({
              question: {
                th: q.question.th || q.question.en,
                en: q.question.en || q.question.th
              },
              hint: {
                th: q.hint?.th || 'พิมพ์คำตอบที่ถูกต้องแต่คนนึกถึงน้อยที่สุด',
                en: q.hint?.en || 'Type a valid answer few people think of'
              },
              commonExamples: Array.isArray(q.commonExamples) ? q.commonExamples : []
            }));
          if (validList.length > 0) {
            setQuestionSource(trimmedTopic ? 'ai-custom' : 'ai');
            setLoadingQuestions(false);
            return validList.slice(0, count);
          }
        }
        throw new Error('fallback');
      } catch (e) {
        const allowedFallback = FALLBACK_QUESTIONS.filter((q) => !bans.includes(q.category));
        const categoryMatched =
          category === 'all' || trimmedTopic
            ? allowedFallback
            : allowedFallback.filter((q) => q.category === category);
        const pool =
          categoryMatched.length >= count
            ? categoryMatched
            : allowedFallback.length > 0
            ? allowedFallback
            : FALLBACK_QUESTIONS;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        setQuestionSource('classic');
        setLoadingQuestions(false);
        if (trimmedTopic) {
          showToast(
            lang === 'th'
              ? 'AI ตอบช้า ใช้ชุดคำถามสำรองชั่วคราวครับ'
              : 'AI timed out, using classic questions'
          );
        }
        return shuffled.slice(0, count);
      }
    },
    [lang, showToast]
  );

  // AI ตรวจคำตอบแบบเติมคำ (รองรับตรวจ 1 คน หรือ ตรวจทีเดียวหลายคน)
  const judgeAnswersWithAI = useCallback(async (questionObj, submissions) => {
    setJudgingAnswers(true);
    try {
      const prompt = `You are the strict but witty judge for a "Reverse Trivia" game.
Question (TH): "${questionObj.question.th}"
Question (EN): "${questionObj.question.en}"

Evaluate each player's typed answer below:
${JSON.stringify(submissions.map((s) => ({ key: String(s.key), answer: s.answer })))}

Rules for each answer:
1. "valid": true if the answer factually and genuinely fits the question (accept Thai, English, minor typos, or nicknames). false if wrong, nonsense, empty, or does not fit the question.
2. "crowdPct": integer 1 to 99 estimating how many people out of 100 would think of this answer (1-20 = very rare/creative, 21-64 = moderate, 65-99 = super common/obvious crowd favorite). If valid is false, set crowdPct to 100.
3. "feedback": short 1-sentence explanation in BOTH "th" and "en".

Return ONLY a valid JSON array matching each key:
[{"key":"0","valid":true,"crowdPct":14,"feedback":{"th":"...","en":"..."}}]`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 11000);
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error('judge-fallback');
      const data = await res.json();
      const rawText = data?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json|```/gi, '').trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const resultMap = {};
        parsed.forEach((r) => {
          resultMap[String(r.key)] = {
            valid: Boolean(r.valid),
            crowdPct: Number(r.crowdPct) || 50,
            feedback: {
              th: r.feedback?.th || r.feedback?.en || 'ตรวจคำตอบเรียบร้อย',
              en: r.feedback?.en || r.feedback?.th || 'Answer evaluated'
            }
          };
        });
        const complete = submissions.map((s) => {
          const found = resultMap[String(s.key)];
          return found
            ? { key: String(s.key), ...found }
            : localFallbackJudge(questionObj, [s])[0];
        });
        setJudgingAnswers(false);
        return complete;
      }
      throw new Error('judge-fallback');
    } catch (e) {
      const fallbackRes = localFallbackJudge(questionObj, submissions);
      setJudgingAnswers(false);
      return fallbackRes;
    }
  }, []);

  // Save Progress to Firestore (Hall of Fame + Survival)
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
  // SOLO MODE HANDLERS (เติมคำตอบ + AI ตรวจ + ปีนหอคอย)
  // =========================================================================
  const startSoloGame = async () => {
    const qs = await fetchQuestions(selectedCategory, totalRounds, customCategory, bannedCategories);
    setQuestions(qs);
    setSoloRound(0);
    setSoloScore(0);
    setSoloPrevScore(0);
    setSoloStreak(0);
    setSoloBestStreak(0);
    setSoloAnswerInput('');
    setSoloResult(null);
    setSoloFinished(false);
    setTowerAnimTick((t) => t + 1);
    setScreen('solo');
  };

  const handleSoloSubmit = async (e) => {
    e.preventDefault();
    if (!soloAnswerInput.trim() || soloResult || judgingAnswers) return;
    const currentQ = questions[soloRound];
    const judgedList = await judgeAnswersWithAI(currentQ, [
      { key: '0', playerName: user.displayName, answer: soloAnswerInput.trim() }
    ]);
    const judge = judgedList[0];
    const scored = computeScoreFromJudge(judge, soloStreak, 'normal');

    const prev = soloScore;
    const nextScore = prev + scored.points;
    const nextStreak = scored.isReverseMaster ? soloStreak + 1 : 0;

    setSoloPrevScore(prev);
    setSoloScore(nextScore);
    setSoloStreak(nextStreak);
    setSoloBestStreak((b) => Math.max(b, nextStreak));
    setSoloResult({ ...judge, ...scored, answer: soloAnswerInput.trim() });
    setTowerAnimTick((t) => t + 1);

    if (scored.isReverseMaster) triggerConfetti();
    if (scored.isTrap) triggerShake();
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
  // SURVIVAL MODE HANDLERS (3 หัวใจ + เติมคำตอบ + AI ตรวจ + ปีนหอคอย)
  // =========================================================================
  const startSurvivalGame = async () => {
    const qs = await fetchQuestions(selectedCategory, 5, customCategory, bannedCategories);
    setQuestions(qs);
    setSurvivalLives(3);
    setSurvivalRound(1);
    setSurvivalBatchIdx(0);
    setSurvivalScore(0);
    setSurvivalPrevScore(0);
    setSurvivalStreak(0);
    setSurvivalBestStreak(0);
    setSurvivalAnswerInput('');
    setSurvivalResult(null);
    setSurvivalFinished(false);
    setSurvivalHealNotice(false);
    setTowerAnimTick((t) => t + 1);
    setScreen('survival');
  };

  const handleSurvivalSubmit = async (e) => {
    e.preventDefault();
    if (!survivalAnswerInput.trim() || survivalResult || judgingAnswers) return;
    setSurvivalHealNotice(false);

    const currentQ = questions[survivalBatchIdx];
    const judgedList = await judgeAnswersWithAI(currentQ, [
      { key: '0', playerName: user.displayName, answer: survivalAnswerInput.trim() }
    ]);
    const judge = judgedList[0];
    const scored = computeScoreFromJudge(judge, survivalStreak, 'survival');

    const prev = survivalScore;
    const nextScore = prev + scored.points;
    const nextStreak = scored.isReverseMaster ? survivalStreak + 1 : 0;
    const nextBestStreak = Math.max(survivalBestStreak, nextStreak);
    let nextLives = scored.isTrap ? survivalLives - 1 : survivalLives;

    if (scored.isReverseMaster) {
      triggerConfetti();
      if (nextStreak > 0 && nextStreak % 3 === 0 && nextLives < 3) {
        nextLives += 1;
        setSurvivalHealNotice(true);
      }
    }
    if (scored.isTrap) triggerShake();

    setSurvivalPrevScore(prev);
    setSurvivalScore(nextScore);
    setSurvivalStreak(nextStreak);
    setSurvivalBestStreak(nextBestStreak);
    setSurvivalLives(nextLives);
    setSurvivalResult({ ...judge, ...scored, answer: survivalAnswerInput.trim() });
    setTowerAnimTick((t) => t + 1);

    if (nextLives <= 0) {
      setTimeout(async () => {
        setSurvivalFinished(true);
        await savePlayerProgress({
          earnedScore: nextScore,
          newBestStreak: nextBestStreak,
          survivalRunScore: nextScore,
          survivalRounds: survivalRound
        });
      }, 1500);
    }
  };

  const handleSurvivalNext = async () => {
    if (survivalLives <= 0) {
      setSurvivalFinished(true);
      return;
    }
    setSurvivalHealNotice(false);
    setSurvivalAnswerInput('');
    setSurvivalResult(null);

    if (survivalBatchIdx + 1 < questions.length) {
      setSurvivalBatchIdx((p) => p + 1);
      setSurvivalRound((p) => p + 1);
    } else {
      const nextBatch = await fetchQuestions(selectedCategory, 5, customCategory, bannedCategories);
      setQuestions(nextBatch);
      setSurvivalBatchIdx(0);
      setSurvivalRound((p) => p + 1);
    }
  };

  // =========================================================================
  // PASS & PLAY HANDLERS (หลายคนในเครื่องเดียว + พิมพ์คำตอบลับ + AI ตรวจ + ปีนหอคอย)
  // =========================================================================
  const startLocalGame = async () => {
    const cleaned = localPlayers.map((p, idx) => ({
      ...p,
      name: p.name.trim() || (lang === 'th' ? `ผู้เล่น ${idx + 1}` : `Player ${idx + 1}`),
      score: 0,
      prevScore: 0,
      lastDelta: 0,
      isTrap: false
    }));
    setLocalPlayers(cleaned);
    const qs = await fetchQuestions(selectedCategory, totalRounds, customCategory, bannedCategories);
    setQuestions(qs);
    setLocalRound(0);
    setLocalTurnIndex(0);
    setLocalPrivacyScreen(true);
    setLocalAnswerInput('');
    setLocalAnswers({});
    setLocalResults({});
    setLocalReveal(false);
    setLocalFinished(false);
    setScreen('local_game');
  };

  const handleLocalSecretSubmit = async (e) => {
    e.preventDefault();
    if (!localAnswerInput.trim() || judgingAnswers) return;
    const updatedAnswers = { ...localAnswers, [localTurnIndex]: localAnswerInput.trim() };
    setLocalAnswers(updatedAnswers);
    setLocalAnswerInput('');

    if (localTurnIndex + 1 < localPlayers.length) {
      setLocalTurnIndex(localTurnIndex + 1);
      setLocalPrivacyScreen(true);
    } else {
      // ครบทุกคนแล้ว ส่งให้ AI ตรวจคำตอบพร้อมกัน
      const currentQ = questions[localRound];
      const submissions = localPlayers.map((p, idx) => ({
        key: String(idx),
        playerName: p.name,
        answer: updatedAnswers[idx] || ''
      }));
      const judged = await judgeAnswersWithAI(currentQ, submissions);

      const resMap = {};
      const updatedPlayers = localPlayers.map((p, idx) => {
        const j = judged.find((x) => String(x.key) === String(idx)) || judged[idx];
        const scored = computeScoreFromJudge(j, 0, 'normal');
        resMap[idx] = { ...j, ...scored, answer: updatedAnswers[idx] };
        return {
          ...p,
          prevScore: p.score,
          score: p.score + scored.points,
          lastDelta: scored.points,
          isTrap: scored.isTrap
        };
      });

      setLocalResults(resMap);
      setLocalPlayers(updatedPlayers);
      setLocalReveal(true);
      setTowerAnimTick((t) => t + 1);
      triggerConfetti();
    }
  };

  const handleLocalNextRound = async () => {
    if (localRound + 1 < questions.length) {
      setLocalRound((p) => p + 1);
      setLocalTurnIndex(0);
      setLocalPrivacyScreen(true);
      setLocalAnswerInput('');
      setLocalAnswers({});
      setLocalResults({});
      setLocalReveal(false);
    } else {
      setLocalFinished(true);
      triggerConfetti();
      if (localPlayers[0]?.score > 0) {
        await savePlayerProgress({ earnedScore: localPlayers[0].score });
      }
    }
  };

  // =========================================================================
  // ONLINE MULTIPLAYER HANDLERS (เติมคำตอบ + AI ตรวจ + ปีนหอคอยเรียลไทม์)
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
        players: {
          [user.id]: {
            id: user.id,
            displayName: user.displayName,
            avatar: user.avatar || '😎',
            score: 0,
            prevScore: 0,
            currentAnswer: null,
            lastResult: null
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
          prevScore: 0,
          currentAnswer: null,
          lastResult: null
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

  const evaluateOnlineRoom = async (playersObj) => {
    if (!roomData || !activeRoomCode) return;
    const currentQ = roomData.questions[roomData.currentRound];
    const allList = Object.values(playersObj);
    const submissions = allList.map((p) => ({
      key: p.id,
      playerName: p.displayName,
      answer: p.currentAnswer || ''
    }));
    const judged = await judgeAnswersWithAI(currentQ, submissions);

    const scoredPlayers = {};
    allList.forEach((p) => {
      if (!p.currentAnswer) {
        scoredPlayers[p.id] = {
          ...p,
          prevScore: p.score || 0,
          lastResult: {
            valid: false,
            crowdPct: 100,
            points: 0,
            isTrap: true,
            feedback: { th: 'ไม่ได้ส่งคำตอบในรอบนี้', en: 'No answer submitted' }
          }
        };
      } else {
        const j = judged.find((x) => x.key === p.id) || judged[0];
        const scored = computeScoreFromJudge(j, 0, 'normal');
        scoredPlayers[p.id] = {
          ...p,
          prevScore: p.score || 0,
          score: (p.score || 0) + scored.points,
          lastResult: { ...j, ...scored }
        };
      }
    });

    await updateDoc(doc(db, 'rooms', activeRoomCode), {
      players: scoredPlayers,
      status: 'reveal'
    });
  };

  const submitOnlineAnswer = async (e) => {
    e.preventDefault();
    if (!roomData || !activeRoomCode || !onlineAnswerInput.trim() || judgingAnswers) return;
    const me = roomData.players?.[user.id];
    if (!me || me.currentAnswer !== null) return;

    const cleanAns = onlineAnswerInput.trim();
    const updatedPlayers = {
      ...roomData.players,
      [user.id]: { ...me, currentAnswer: cleanAns }
    };

    const allList = Object.values(updatedPlayers);
    if (allList.every((p) => p.currentAnswer !== null)) {
      await evaluateOnlineRoom(updatedPlayers);
    } else {
      await updateDoc(doc(db, 'rooms', activeRoomCode), {
        [`players.${user.id}.currentAnswer`]: cleanAns
      });
    }
  };

  const nextOnlineRound = async () => {
    if (!roomData || !activeRoomCode) return;
    const nextIdx = roomData.currentRound + 1;
    if (nextIdx < roomData.questions.length) {
      const reset = {};
      Object.values(roomData.players || {}).forEach((p) => {
        reset[p.id] = {
          ...p,
          prevScore: p.score || 0,
          currentAnswer: null,
          lastResult: null
        };
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
          ? `มาเล่น Reverse Trivia เติมคำตอบปีนหอคอยด้วยกัน! รหัสห้อง: ${activeRoomCode}`
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
                  {lang === 'th' ? 'เติมคำสวนกระแส • ปีนหอคอย' : 'Fill-in Reverse Trivia Tower'}
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
                  {lang === 'th' ? 'เลือกรูปโปรไฟล์นักปีนหอคอย' : 'Choose Your Climber Avatar'}
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
          {/* Hero Rule Card */}
          <div className="bg-gradient-to-r from-indigo-950/90 via-purple-950/70 to-slate-900/90 border border-indigo-500/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-base mb-1">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                {lang === 'th'
                  ? 'กติกา: พิมพ์คำตอบที่ "ถูกต้อง แต่คนนึกถึงน้อยที่สุด" เพื่อปีนหอคอย!'
                  : 'Rule: Type a VALID answer few people think of to climb the tower!'}
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                {lang === 'th'
                  ? 'AI จะตรวจความถูกต้องและคำนวณความหายาก ยิ่งแหวกแนว ยิ่งปีนหอคอยสูงขึ้น! (แต่ถ้าตอบผิดหรือซ้ำกระแสหลัก ≥65% จะได้ 0 เมตร)'
                  : 'AI judges accuracy & rarity! Rarer answers launch you higher up the tower, while wrong or mainstream (≥65%) answers score 0m.'}
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
                    ? 'พิมพ์หมวดหมู่เอง (AI จะคิดโจทย์เติมคำตอบให้ตรงหัวข้อ)'
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
                      ? 'เช่น อนิเมะญี่ปุ่น, เกม ROV, K-Pop, ชีวิตเด็กหอ, ฟุตบอล...'
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

            {/* Custom Topic Ban Input & Tags */}
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
            <div className="bg-[#0f1626]/90 border border-slate-800 hover:border-indigo-500/50 transition-colors rounded-3xl p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-3">
                  <User className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-base text-white mb-1">
                  {lang === 'th' ? 'เล่นคนเดียว (Solo Tower)' : 'Solo Tower'}
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  {lang === 'th'
                    ? 'เติมคำตอบสวนกระแสให้ AI ตรวจ แล้วปีนหอคอยเก็บคะแนนเข้า Hall of Fame'
                    : 'Type unique answers, get AI-judged, and climb the tower to the Hall of Fame.'}
                </p>
              </div>
              <button
                type="button"
                disabled={loadingQuestions}
                onClick={startSoloGame}
                className="btn-press w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                {loadingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {lang === 'th' ? 'เริ่มปีนหอคอย' : 'Play Solo'}
              </button>
            </div>

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
                    ? 'มี 3 หัวใจ! ตอบผิดหรือซ้ำกระแสหลักเสีย 1 หัวใจ สตรีคแรร์ครบ 3 ได้หัวใจคืน +1'
                    : '3 lives! Avoid wrong or mainstream answers, hit 3 rare streaks to heal +1 heart!'}
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
                    ? 'ผลัดกันแอบพิมพ์คำตอบบนเครื่องเดียว แล้วให้ AI ตรวจและปีนหอคอยแข่งกัน!'
                    : 'Secretly type answers on one device and race up the tower!'}
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
                    ? 'สร้างห้องแชร์ลิงก์ หรือกรอกรหัส 6 หลักเพื่อพิมพ์ตอบแข่งปีนหอคอยคนละเครื่อง'
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
                    ? 'ยังไม่มีสถิติโหมดเอาชีวิตรอด — ลองปีนหอคอยเป็นคนแรกเลย!'
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
                                <span>🔥 {lang === 'th' ? 'สตรีค' : 'Streak'} {item.bestStreak || 0}</span>
                                {(item.survivalScore || 0) > 0 && (
                                  <span className="text-rose-300">💀 {item.survivalScore}m</span>
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
                        <span className="text-[11px] text-slate-400 ml-1">m</span>
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
          <div className="relative z-10 anim-pop w-full max-w-lg mx-auto bg-[#0f1626] border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
            <ConfettiBurst active={fxConfetti} />
            <h2 className="text-xl font-bold text-white mb-3">
              🏆 {lang === 'th' ? 'พิชิตหอคอยสำเร็จ!' : 'Tower Run Complete!'}
            </h2>

            <TowerClimbVisual
              climbers={[
                {
                  id: user.id,
                  name: user.displayName,
                  avatar: user.avatar,
                  score: soloScore,
                  prevScore: 0,
                  lastDelta: soloScore
                }
              ]}
              lang={lang}
              animTrigger={towerAnimTick + 100}
            />

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-4 rounded-2xl bg-[#080d18] border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'th' ? 'ความสูงรวม' : 'Total Height'}</div>
                <div className="text-2xl font-black text-amber-400">{soloScore}m</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#080d18] border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'th' ? 'สตรีคหายากสูงสุด' : 'Best Rare Streak'}</div>
                <div className="text-2xl font-black text-orange-400">🔥 {soloBestStreak}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                shareLink({
                  title: 'Reverse Trivia Tower Score',
                  text:
                    lang === 'th'
                      ? `🗼 ฉันปีนหอคอย Reverse Trivia ได้สูง ${soloScore} เมตร (สตรีค ${soloBestStreak})! มาลองปีนแข่งกัน:`
                      : `🗼 I climbed ${soloScore}m in Reverse Trivia! Beat my height:`,
                  url: window.location.origin
                })
              }
              className="btn-press w-full mb-3 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {lang === 'th' ? 'แชร์ความสูงหอคอยให้เพื่อน' : 'Share Score'}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startSoloGame}
                className="btn-press py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {lang === 'th' ? 'ปีนอีกรอบ' : 'Play Again'}
              </button>
              <button
                type="button"
                onClick={() => setScreen('lobby')}
                className="btn-press py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
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
          className={`relative z-10 anim-fade-up w-full max-w-xl mx-auto bg-[#0f1626]/95 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl ${
            fxShake ? 'anim-shake border-rose-500/60' : ''
          }`}
        >
          <ConfettiBurst active={fxConfetti} />

          {/* Header Bar */}
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-indigo-400">
              {lang === 'th' ? `ข้อที่ ${soloRound + 1} / ${questions.length}` : `Q${soloRound + 1}/${questions.length}`}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                {questionSource === 'ai-custom'
                  ? `✨ ${customCategory.trim()}`
                  : questionSource === 'ai'
                  ? '✨ Gemini AI'
                  : '🎲 Classic'}
              </span>
              <span className="text-orange-400 font-bold">🔥 {soloStreak}</span>
            </div>
          </div>

          {/* อนิเมชั่นหอคอย */}
          <TowerClimbVisual
            climbers={[
              {
                id: user.id,
                name: user.displayName,
                avatar: user.avatar,
                score: soloScore,
                prevScore: soloResult ? soloPrevScore : soloScore,
                lastDelta: soloResult ? soloResult.points : 0,
                isTrap: soloResult ? soloResult.isTrap : false
              }
            ]}
            lang={lang}
            animTrigger={towerAnimTick}
          />

          {/* คำถามปลายเปิด */}
          <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 leading-snug">
            {currentQ?.question[lang]}
          </h3>
          {currentQ?.hint && (
            <p className="text-xs text-slate-400 mb-4">
              💡 {currentQ.hint[lang]}
            </p>
          )}

          {/* ช่องเติมคำตอบ */}
          {!soloResult ? (
            <form onSubmit={handleSoloSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  disabled={judgingAnswers}
                  value={soloAnswerInput}
                  onChange={(e) => setSoloAnswerInput(e.target.value)}
                  placeholder={lang === 'th' ? 'พิมพ์คำตอบสวนกระแสของคุณที่นี่...' : 'Type your rare answer here...'}
                  className="flex-1 px-4 py-3.5 rounded-2xl bg-[#080d18] border border-slate-700 focus:border-indigo-500 focus:outline-none text-sm text-white placeholder:text-slate-500"
                  required
                />
                <button
                  type="submit"
                  disabled={judgingAnswers || !soloAnswerInput.trim()}
                  className="btn-press px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2 shrink-0"
                >
                  {judgingAnswers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {judgingAnswers ? (lang === 'th' ? 'ตรวจ...' : '...') : (lang === 'th' ? 'ส่ง' : 'Send')}
                </button>
              </div>
              {judgingAnswers && (
                <div className="anim-fade-up flex items-center justify-center gap-2 text-xs text-indigo-300 py-2">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  {lang === 'th' ? 'AI กำลังตรวจความถูกต้องและความหายากของคำตอบ...' : 'AI is evaluating your answer...'}
                </div>
              )}
            </form>
          ) : (
            /* ผลตรวจจาก AI */
            <div className="anim-pop space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  !soloResult.valid || soloResult.isTrap
                    ? 'bg-rose-500/10 border-rose-500/40'
                    : soloResult.isReverseMaster
                    ? 'bg-emerald-500/15 border-emerald-500/50'
                    : 'bg-indigo-500/15 border-indigo-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm font-bold text-white">
                    {lang === 'th' ? 'คำตอบของคุณ:' : 'Your Answer:'}{' '}
                    <span className="text-amber-300">"{soloResult.answer}"</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black ${
                      soloResult.points > 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    +{soloResult.points}m
                  </span>
                </div>

                {soloResult.valid && (
                  <div className="mb-2.5">
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>{lang === 'th' ? 'ความซ้ำกับคนทั่วไป (ยิ่งน้อยยิ่งดี)' : 'Crowd Popularity (Lower is better)'}</span>
                      <span className="font-bold">{soloResult.crowdPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          soloResult.crowdPct <= 20
                            ? 'bg-emerald-500'
                            : soloResult.crowdPct >= 65
                            ? 'bg-rose-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${soloResult.crowdPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-200 leading-relaxed">
                  🤖 <span className="font-semibold">AI:</span> {soloResult.feedback[lang]}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSoloNext}
                className="btn-press w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                {soloRound + 1 < questions.length
                  ? lang === 'th' ? 'ปีนด่านถัดไป' : 'Next Floor'
                  : lang === 'th' ? 'ดูสรุปความสูงหอคอย' : 'Finish Run'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. โหมดเอาชีวิตรอด (SURVIVAL — 3 หัวใจ + เติมคำตอบ + AI ตรวจ + ปีนหอคอย)
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
          <div className="relative z-10 anim-pop w-full max-w-lg mx-auto bg-[#0f1626] border border-rose-500/40 rounded-3xl p-6 text-center shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">
              💀 {lang === 'th' ? 'จบการเอาชีวิตรอด!' : 'Survival Run Ended!'}
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              {lang === 'th' ? `คุณรอดชีวิตได้ถึงด่านที่ ${survivalRound}` : `Survived until Round ${survivalRound}`}
            </p>

            <TowerClimbVisual
              climbers={[
                {
                  id: user.id,
                  name: user.displayName,
                  avatar: user.avatar,
                  score: survivalScore,
                  prevScore: 0,
                  lastDelta: survivalScore
                }
              ]}
              lang={lang}
              animTrigger={towerAnimTick + 100}
            />

            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div className="p-3 rounded-2xl bg-[#080d18] border border-slate-800">
                <div className="text-[11px] text-slate-400">{lang === 'th' ? 'ความสูง' : 'Height'}</div>
                <div className="text-xl font-black text-rose-400">{survivalScore}m</div>
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
                  title: 'Reverse Trivia Survival Tower',
                  text:
                    lang === 'th'
                      ? `💀 ฉันปีนหอคอยโหมด Survival ได้สูง ${survivalScore} เมตร (รอดถึงด่าน ${survivalRound})! มาลองท้าชิงกัน:`
                      : `💀 I climbed ${survivalScore}m (Round ${survivalRound}) in Survival Mode!`,
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
                {lang === 'th' ? 'ลุยอีกรอบ' : 'Retry'}
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
          className={`relative z-10 anim-fade-up w-full max-w-xl mx-auto bg-[#0f1626]/95 border border-rose-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl ${
            fxShake ? 'anim-shake border-rose-500' : ''
          }`}
        >
          <ConfettiBurst active={fxConfetti} />

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-black">
                💀 {lang === 'th' ? `ด่าน ${survivalRound}` : `Round ${survivalRound}`}
              </span>
              <span className="text-xs text-slate-400">
                {questionSource === 'ai-custom' ? `✨ ${customCategory.trim()}` : '✨ Gemini AI'}
              </span>
            </div>

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
              <span className="text-orange-400 font-bold text-xs">🔥{survivalStreak}</span>
            </div>
          </div>

          <TowerClimbVisual
            climbers={[
              {
                id: user.id,
                name: user.displayName,
                avatar: user.avatar,
                score: survivalScore,
                prevScore: survivalResult ? survivalPrevScore : survivalScore,
                lastDelta: survivalResult ? survivalResult.points : 0,
                isTrap: survivalResult ? survivalResult.isTrap : false
              }
            ]}
            lang={lang}
            animTrigger={towerAnimTick}
          />

          {survivalHealNotice && (
            <div className="anim-pop mb-3 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
              ❤️ {lang === 'th' ? 'สตรีคแรร์ครบ 3 ข้อ! ฟื้นฟูหัวใจ +1 ดวง!' : '3 Rare Streaks! +1 Heart Restored!'}
            </div>
          )}

          <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 leading-snug">
            {currentQ?.question[lang]}
          </h3>
          {currentQ?.hint && (
            <p className="text-xs text-slate-400 mb-4">💡 {currentQ.hint[lang]}</p>
          )}

          {!survivalResult ? (
            <form onSubmit={handleSurvivalSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  disabled={judgingAnswers}
                  value={survivalAnswerInput}
                  onChange={(e) => setSurvivalAnswerInput(e.target.value)}
                  placeholder={lang === 'th' ? 'พิมพ์คำตอบเอาชีวิตรอด...' : 'Type your survival answer...'}
                  className="flex-1 px-4 py-3.5 rounded-2xl bg-[#080d18] border border-slate-700 focus:border-rose-500 focus:outline-none text-sm text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={judgingAnswers || !survivalAnswerInput.trim()}
                  className="btn-press px-5 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2 shrink-0"
                >
                  {judgingAnswers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {lang === 'th' ? 'ส่ง' : 'Send'}
                </button>
              </div>
              {judgingAnswers && (
                <div className="flex items-center justify-center gap-2 text-xs text-rose-300 py-2">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  {lang === 'th' ? 'AI กำลังตัดสินชะตาคำตอบของคุณ...' : 'AI is judging your survival answer...'}
                </div>
              )}
            </form>
          ) : (
            <div className="anim-pop space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  survivalResult.isTrap
                    ? 'bg-rose-500/15 border-rose-500/50'
                    : survivalResult.isReverseMaster
                    ? 'bg-emerald-500/15 border-emerald-500/50'
                    : 'bg-indigo-500/15 border-indigo-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-bold text-white">"{survivalResult.answer}"</span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black ${
                      survivalResult.isTrap ? 'bg-rose-500/25 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {survivalResult.isTrap ? '-1 ❤️ (0m)' : `+${survivalResult.points}m`}
                  </span>
                </div>
                {survivalResult.valid && (
                  <div className="mb-2.5">
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>{lang === 'th' ? 'อัตราตอบซ้ำกับคนทั่วไป' : 'Crowd Popularity'}</span>
                      <span className="font-bold">{survivalResult.crowdPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          survivalResult.crowdPct <= 20
                            ? 'bg-emerald-500'
                            : survivalResult.crowdPct >= 65
                            ? 'bg-rose-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${survivalResult.crowdPct}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-200 leading-relaxed">
                  🤖 <span className="font-semibold">AI:</span> {survivalResult.feedback[lang]}
                </p>
              </div>

              {survivalLives > 0 && (
                <button
                  type="button"
                  disabled={loadingQuestions}
                  onClick={handleSurvivalNext}
                  className="btn-press w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  {loadingQuestions ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {lang === 'th' ? 'AI กำลังสร้างด่านถัดไป...' : 'Loading next wave...'}
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
              ? 'แตะที่รูปไอคอนเพื่อเปลี่ยนรูปนักปีนหอคอย และตั้งชื่อผู้เล่นแต่ละคนได้เลย'
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
                      score: 0,
                      prevScore: 0
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
              {lang === 'th' ? 'เริ่มแข่งปีนหอคอย!' : 'Start Tower Race!'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. หน้าเล่นเกมผู้เล่นหลายคนในเครื่องเดียว (เติมคำตอบลับ + AI ตรวจ + ปีนหอคอย)
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
            <h2 className="text-xl font-bold text-white mb-1">
              👑 {lang === 'th' ? 'สรุปผลผู้พิชิตหอคอย!' : 'Final Tower Standings!'}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {lang === 'th'
                ? `ผู้ชนะคือ ${sorted[0]?.name} (${sorted[0]?.score} เมตร)`
                : `${sorted[0]?.name} wins (${sorted[0]?.score}m)`}
            </p>

            <TowerClimbVisual
              climbers={localPlayers.map((p, i) => ({
                id: i,
                name: p.name,
                avatar: p.avatar,
                score: p.score,
                prevScore: 0,
                lastDelta: p.score
              }))}
              lang={lang}
              animTrigger={towerAnimTick + 100}
            />

            <div className="space-y-2 mb-5 text-left">
              {sorted.map((p, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-2xl border ${
                    idx === 0 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-[#080d18] border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-400">#{idx + 1}</span>
                    <span className="text-2xl">{p.avatar}</span>
                    <span className="font-bold text-sm text-white">{p.name}</span>
                  </div>
                  <span className="font-black text-amber-400 text-sm">{p.score}m</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                shareLink({
                  text:
                    lang === 'th'
                      ? `👑 ผลแข่งปีนหอคอย Reverse Trivia! ผู้ชนะคือ ${sorted[0]?.name} (${sorted[0]?.score} เมตร)!`
                      : `👑 ${sorted[0]?.name} won our Reverse Trivia Tower race (${sorted[0]?.score}m)!`,
                  url: window.location.origin
                })
              }
              className="btn-press w-full mb-3 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {lang === 'th' ? 'แชร์ผลแข่งให้เพื่อน' : 'Share Results'}
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
        <div className="relative z-10 anim-fade-up w-full max-w-xl mx-auto bg-[#0f1626]/95 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
          <ConfettiBurst active={fxConfetti} />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
            <span className="font-bold text-emerald-400">
              {lang === 'th' ? `ข้อที่ ${localRound + 1} / ${questions.length}` : `Round ${localRound + 1}/${questions.length}`}
            </span>
            <span>{questionSource === 'ai-custom' ? `✨ ${customCategory.trim()}` : '✨ Gemini AI'}</span>
          </div>

          {judgingAnswers ? (
            <div className="py-14 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">
                {lang === 'th' ? '🤖 AI กำลังตรวจคำตอบของทุกคน...' : '🤖 AI is grading all answers...'}
              </p>
              <p className="text-xs text-slate-400">
                {lang === 'th' ? 'เตรียมดูทุกคนปีนหอคอยพร้อมกัน!' : 'Get ready for the tower climb!'}
              </p>
            </div>
          ) : !localReveal && localPrivacyScreen ? (
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
                  {lang === 'th' ? 'คนอื่นห้ามแอบดูตอนพิมพ์คำตอบนะ!' : 'No peeking while typing!'}
                </p>
              </div>
              <button
                type="button"
