import React, { useState, useEffect, useRef } from 'react';
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
  getDocs,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import {
  Trophy,
  Users,
  Play,
  Copy,
  Check,
  QrCode,
  LogOut,
  ShieldAlert,
  Ban,
  Crown,
  Clock,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Globe,
  UserX,
  RotateCcw,
  Send,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Flame,
  Target,
  Plus,
  LogIn,
  Unlock,
  SkipForward,
  Loader2,
  Link2,
} from 'lucide-react';

// ==========================================
// CONSTANTS & HELPERS
// ==========================================

const CATEGORIES = [
  { id: 'general', th: 'ความรู้รอบตัว', en: 'General Knowledge' },
  { id: 'food', th: 'อาหารและเครื่องดื่ม', en: 'Food & Drinks' },
  { id: 'geography', th: 'ภูมิศาสตร์และประเทศ', en: 'Geography & Countries' },
  { id: 'pop', th: 'หนัง เกม และเพลง', en: 'Movies, Games & Music' },
  { id: 'science', th: 'วิทยาศาสตร์และสัตว์', en: 'Science & Animals' },
  { id: 'thai', th: 'เรื่องไทยๆ', en: 'Thai Culture & Local' },
];

const SOLO_MODES = [
  {
    id: 'classic',
    icon: Target,
    titleTh: 'คลาสสิก (5 ข้อ)',
    titleEn: 'Classic (5 Rounds)',
    descTh: 'ทายคำตอบที่ถูกต้องแต่แรร์ที่สุด สะสมคะแนนสูงสุดใน 5 ข้อ',
    descEn: 'Give the rarest valid answers across 5 rounds.',
  },
  {
    id: 'survival',
    icon: Flame,
    titleTh: 'เอาชีวิตรอด (3 หัวใจ)',
    titleEn: 'Survival (3 Lives)',
    descTh: 'ตอบผิดหรือโดนคำต้องห้ามเสีย 1 หัวใจ เล่นยาวจนกว่าจะหมด',
    descEn: 'Wrong or banned answers cost 1 life. Survive as long as you can.',
  },
  {
    id: 'blitz',
    icon: Zap,
    titleTh: 'สปีดบลิตซ์ (15 วิ)',
    titleEn: 'Speed Blitz (15s)',
    descTh: 'จำกัดเวลาตอบข้อละ 15 วินาที ท้าความไวและไหวพริบ',
    descEn: 'Only 15 seconds per question. Think fast!',
  },
];

const DIFFICULTIES = [
  { id: 'easy', th: 'ง่าย', en: 'Easy' },
  { id: 'medium', th: 'กลาง', en: 'Medium' },
  { id: 'hard', th: 'ยาก', en: 'Hard' },
];

const normalizeText = (str = '') =>
  String(str)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const sanitizeId = (raw = '') =>
  String(raw)
    .trim()
    .replace(/[.#$/\[\]\s]+/g, '_')
    .slice(0, 24);

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

const extractJson = (rawText = '') => {
  const cleaned = String(rawText)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('AI ตอบกลับไม่เป็นรูปแบบ JSON กรุณาลองใหม่');
  }
};

async function callGemini({ prompt, systemInstruction }) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      systemInstruction,
      responseMimeType: 'application/json',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return extractJson(data.text);
}

async function generateQuestionAI({ category, difficulty, lang, usedQuestions = [] }) {
  const catObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const catLabel = lang === 'th' ? catObj.th : catObj.en;
  const avoidList = usedQuestions.slice(-8).join(' | ');

  const systemInstruction =
    lang === 'th'
      ? 'คุณคือผู้สร้างคำถามเกม Reverse Trivia (ทายสวนกระแส) ตอบกลับเป็น JSON เท่านั้น'
      : 'You are a Reverse Trivia game host. Return valid JSON only.';

  const prompt =
    lang === 'th'
      ? `สร้างคำถาม Reverse Trivia ภาษาไทย 1 ข้อ หมวด "${catLabel}" ระดับความยาก "${difficulty}"
กติกาของคำถามที่ดี:
- เป็นคำถามปลายเปิดที่มีคำตอบถูกต้องหลากหลาย (อย่างน้อย 15 คำตอบขึ้นไป) เช่น "ชื่อจังหวัดในภาคอีสาน", "ชื่อประเทศที่ขึ้นต้นด้วยตัว S", "ชื่อเมนูอาหารไทยที่มีคำว่า ผัด"
- ห้ามซ้ำกับคำถามเหล่านี้: ${avoidList || 'ไม่มี'}
- ระบุคำตอบยอดฮิตที่คนส่วนใหญ่มักนึกถึงเป็นอันดับแรก 3 คำ (defaultBans) เพื่อใช้เป็นคำต้องห้าม

ส่งกลับเป็น JSON รูปแบบนี้เท่านั้น:
{
  "question": "ข้อความคำถามภาษาไทยที่สั้นและเข้าใจง่าย",
  "hint": "คำใบ้สั้นๆ หรือขอบเขตคำตอบ",
  "defaultBans": ["คำตอบยอดฮิต1", "คำตอบยอดฮิต2", "คำตอบยอดฮิต3"]
}`
      : `Create 1 open-ended Reverse Trivia question in English for category "${catLabel}", difficulty "${difficulty}".
Rules:
- Must have at least 15 valid factual answers (e.g., "Name a country in Europe", "Name a Pixar movie").
- Do NOT repeat: ${avoidList || 'None'}.
- Provide 3 most obvious/common answers in "defaultBans".

Return JSON ONLY:
{
  "question": "Short clear question",
  "hint": "Brief scope or hint",
  "defaultBans": ["Obvious1", "Obvious2", "Obvious3"]
}`;

  const result = await callGemini({ prompt, systemInstruction });
  if (!result?.question) {
    throw new Error('ไม่สามารถสร้างคำถามได้ กรุณาลองใหม่');
  }
  return {
    question: String(result.question).trim(),
    hint: String(result.hint || '').trim(),
    defaultBans: Array.isArray(result.defaultBans)
      ? result.defaultBans.map((b) => String(b).trim()).filter(Boolean).slice(0, 4)
      : [],
  };
}

async function gradeAnswersBatchAI({ question, answers, lang }) {
  const systemInstruction =
    lang === 'th'
      ? 'คุณคือกรรมการตัดสินเกม Reverse Trivia ที่ยุติธรรมและมีอารมณ์ขัน ตอบกลับเป็น JSON เท่านั้น'
      : 'You are a fair and witty Reverse Trivia judge. Return valid JSON only.';

  const itemsText = answers
    .map((a) => `- id: "${a.id}", answer: "${a.text.replace(/"/g, "'")}"`)
    .join('\n');

  const prompt =
    lang === 'th'
      ? `คำถาม: "${question}"
รายชื่อคำตอบที่ต้องตรวจ:
${itemsText}

เกณฑ์การให้คะแนน Reverse Trivia:
1. ตรวจว่าคำตอบ "ถูกต้องตามความจริงและตรงคำถาม" หรือไม่ (isValid: true/false) ยืดหยุ่นเรื่องการสะกดผิดเล็กน้อยได้ถ้าสื่อความหมายถูกต้องชัดเจน
2. ถ้าถูกต้อง ให้คะแนนความแรร์ (rarity) ตั้งแต่ 10 ถึง 100:
   - 10-35 = คำตอบธรรมดา คนทั่วไปนึกออกง่าย
   - 36-70 = คำตอบดี ค่อนข้างเฉพาะตัว
   - 71-100 = คำตอบแรร์มาก ลึก เหนือความคาดหมาย แต่ถูกต้องจริง!
3. ถ้าไม่ถูกต้อง ให้ isValid: false และ rarity: 0
4. เขียนคำอธิบายสั้นๆ แซวสนุกๆ ภาษาไทย (reason) ไม่เกิน 1 ประโยค

ตอบกลับเป็น JSON รูปแบบนี้เท่านั้น:
{
  "results": {
    "ID_ผู้เล่น": { "isValid": true, "rarity": 85, "reason": "คำอธิบายสั้นๆ" }
  }
}`
      : `Question: "${question}"
Answers to grade:
${itemsText}

Grading rules:
1. Check if each answer is factually valid for the question (isValid: true/false). Allow minor typos.
2. If valid, score rarity from 10 to 100 (10 = super common, 100 = ultra rare/obscure but undeniably true).
3. If invalid, set isValid: false and rarity: 0.
4. Provide a short witty 1-sentence reason in English.

Return JSON ONLY:
{
  "results": {
    "PLAYER_ID": { "isValid": true, "rarity": 85, "reason": "Short reason" }
  }
}`;

  const data = await callGemini({ prompt, systemInstruction });
  return data?.results || {};
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function App() {
  const [lang, setLang] = useState('th');
  const [user, setUser] = useState(null);
  const [authId, setAuthId] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Navigation & Global notices
  const [view, setView] = useState('home'); // 'home' | 'solo' | 'multi'
  const [globalNotice, setGlobalNotice] = useState(null); // { type: 'error'|'info'|'success', text }
  const [pendingRoomCode, setPendingRoomCode] = useState('');

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);

  // Solo state
  const [gameMode, setGameMode] = useState('classic');
  const [category, setCategory] = useState('general');
  const [difficulty, setDifficulty] = useState('medium');
  const [soloState, setSoloState] = useState(null);
  const [soloAnswer, setSoloAnswer] = useState('');
  const [soloTimer, setSoloTimer] = useState(0);
  const [soloBusy, setSoloBusy] = useState(false);

  // Multiplayer state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom] = useState(null);
  const [mpAnswer, setMpAnswer] = useState('');
  const [mpBanInput, setMpBanInput] = useState('');
  const [mpTimeLeft, setMpTimeLeft] = useState(0);
  const [mpActionBusy, setMpActionBusy] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [hostGradingError, setHostGradingError] = useState('');

  // Host transition guard to prevent race conditions / hanging
  const phaseLockRef = useRef('');

  const t = (th, en) => (lang === 'th' ? th : en);

  // Check if current URL is a Vercel preview deployment URL
  const isVercelPreviewUrl =
    typeof window !== 'undefined' &&
    window.location.hostname.includes('vercel.app') &&
    (window.location.hostname.includes('-git-') ||
      window.location.hostname.includes('-projects.vercel.app'));

  // 1. On initial mount: read ?room=CODE and restore saved session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = (params.get('room') || '').trim().toUpperCase();
    if (codeFromUrl) {
      setPendingRoomCode(codeFromUrl);
      setJoinCodeInput(codeFromUrl);
    }

    try {
      const saved = localStorage.getItem('rt_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          setUser(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // 2. Fetch leaderboard
  const loadLeaderboard = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('bestScore', 'desc'), limit(10));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLeaderboard(list);
    } catch {
      // ignore leaderboard errors silently
    }
  };

  useEffect(() => {
    if (user) {
      loadLeaderboard();
    }
  }, [user, view]);

  // 3. Auto-join room from URL link/QR right after login
  useEffect(() => {
    if (user && pendingRoomCode && !roomId) {
      const code = pendingRoomCode;
      setPendingRoomCode('');
      handleJoinRoom(code);
    }
  }, [user, pendingRoomCode, roomId]);

  // ==========================================
  // AUTHENTICATION (Player ID + 4-digit PIN)
  // ==========================================

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const cleanId = sanitizeId(authId);
    const cleanPin = authPin.trim();

    if (cleanId.length < 2) {
      setAuthError(t('กรุณาตั้งชื่อผู้เล่นอย่างน้อย 2 ตัวอักษร', 'Player ID must be at least 2 characters.'));
      return;
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      setAuthError(t('กรุณากรอกรหัส PIN ตัวเลข 4 หลัก', 'Please enter a 4-digit numeric PIN.'));
      return;
    }

    setAuthLoading(true);
    try {
      const userRef = doc(db, 'users', cleanId);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        if (String(data.pin) !== cleanPin) {
          setAuthError(t('ชื่อนี้มีคนใช้แล้ว หรือรหัส PIN ไม่ถูกต้อง', 'Player ID already exists or PIN is incorrect.'));
          setAuthLoading(false);
          return;
        }
        const sessionUser = {
          id: cleanId,
          displayName: data.displayName || cleanId,
          bestScore: data.bestScore || 0,
        };
        setUser(sessionUser);
        localStorage.setItem('rt_user_session', JSON.stringify(sessionUser));
      } else {
        const newProfile = {
          displayName: authId.trim().slice(0, 24) || cleanId,
          pin: cleanPin,
          bestScore: 0,
          gamesPlayed: 0,
          createdAt: Date.now(),
        };
        await setDoc(userRef, newProfile);
        const sessionUser = {
          id: cleanId,
          displayName: newProfile.displayName,
          bestScore: 0,
        };
        setUser(sessionUser);
        localStorage.setItem('rt_user_session', JSON.stringify(sessionUser));
      }
    } catch (err) {
      setAuthError(t(`เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ${err.message}`, `Database error: ${err.message}`));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rt_user_session');
    setUser(null);
    setRoomId(null);
    setRoom(null);
    setSoloState(null);
    setView('home');
  };

  // ==========================================
  // SOLO MODE LOGIC
  // ==========================================

  const startSoloGame = async () => {
    setGlobalNotice(null);
    setSoloBusy(true);
    const maxRounds = gameMode === 'survival' ? 99 : 5;
    const lives = gameMode === 'survival' ? 3 : 99;
    const timeLimit = gameMode === 'blitz' ? 15 : 0;

    setSoloState({
      mode: gameMode,
      round: 1,
      maxRounds,
      lives,
      score: 0,
      streak: 0,
      status: 'loading', // 'loading' | 'playing' | 'grading' | 'result' | 'finished'
      question: null,
      lastResult: null,
      history: [],
      usedQuestions: [],
      timeLimit,
    });
    setView('solo');
    setSoloAnswer('');

    try {
      const qData = await generateQuestionAI({ category, difficulty, lang, usedQuestions: [] });
      setSoloState((prev) =>
        prev
          ? {
              ...prev,
              status: 'playing',
              question: qData,
              usedQuestions: [qData.question],
            }
          : null
      );
      if (timeLimit > 0) setSoloTimer(timeLimit);
    } catch (err) {
      setGlobalNotice({ type: 'error', text: err.message });
      setView('home');
      setSoloState(null);
    } finally {
      setSoloBusy(false);
    }
  };

  // Solo Blitz Timer
  useEffect(() => {
    if (view !== 'solo' || soloState?.status !== 'playing' || !soloState?.timeLimit) return;
    if (soloTimer <= 0) {
      submitSoloAnswer(true);
      return;
    }
    const id = setTimeout(() => setSoloTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(id);
  }, [view, soloState?.status, soloTimer]);

  const submitSoloAnswer = async (isTimeout = false) => {
    if (!soloState || soloState.status !== 'playing' || soloBusy) return;
    const ans = isTimeout ? '' : soloAnswer.trim();
    const bannedList = soloState.question?.defaultBans || [];

    setSoloBusy(true);
    setSoloState((prev) => ({ ...prev, status: 'grading' }));

    try {
      let resultObj;
      if (!ans) {
        resultObj = {
          answer: t('(หมดเวลา/ไม่ได้ตอบ)', '(Timed out)'),
          status: 'timeout',
          points: 0,
          rarity: 0,
          reason: t('หมดเวลาก่อนส่งคำตอบ!', 'Time ran out before submitting!'),
        };
      } else {
        const normAns = normalizeText(ans);
        const hitBan = bannedList.find((b) => normalizeText(b) === normAns);
        if (hitBan) {
          resultObj = {
            answer: ans,
            status: 'banned',
            points: 0,
            rarity: 0,
            reason: t(`โดนคำต้องห้าม "${hitBan}"! คิดให้ลึกกว่านี้อีกนิด`, `Hit banned word "${hitBan}"!`),
          };
        } else {
          const graded = await gradeAnswersBatchAI({
            question: soloState.question.question,
            answers: [{ id: 'solo', text: ans }],
            lang,
          });
          const g = graded?.solo || { isValid: false, rarity: 0, reason: t('ตรวจคำตอบไม่สำเร็จ', 'Could not grade') };
          const pts = g.isValid ? Math.max(10, Math.min(100, Number(g.rarity) || 50)) : 0;
          resultObj = {
            answer: ans,
            status: g.isValid ? 'valid' : 'invalid',
            points: pts,
            rarity: pts,
            reason: g.reason || '',
          };
        }
      }

      const isGood = resultObj.status === 'valid';
      const newLives = isGood ? soloState.lives : soloState.lives - 1;
      const newScore = soloState.score + resultObj.points;
      const newStreak = isGood ? soloState.streak + 1 : 0;

      setSoloState((prev) => ({
        ...prev,
        status: 'result',
        score: newScore,
        lives: newLives,
        streak: newStreak,
        lastResult: resultObj,
        history: [...prev.history, { question: prev.question.question, ...resultObj }],
      }));
    } catch (err) {
      setGlobalNotice({ type: 'error', text: err.message });
      setSoloState((prev) => ({ ...prev, status: 'playing' }));
    } finally {
      setSoloBusy(false);
    }
  };

  const nextSoloRound = async () => {
    if (!soloState || soloBusy) return;
    const isGameOver =
      (soloState.mode === 'survival' && soloState.lives <= 0) ||
      (soloState.mode !== 'survival' && soloState.round >= soloState.maxRounds);

    if (isGameOver) {
      setSoloState((prev) => ({ ...prev, status: 'finished' }));
      // Save best score to Firestore
      if (user) {
        try {
          const userRef = doc(db, 'users', user.id);
          const snap = await getDoc(userRef);
          const currentBest = snap.exists() ? snap.data().bestScore || 0 : 0;
          const nextBest = Math.max(currentBest, soloState.score);
          await updateDoc(userRef, {
            bestScore: nextBest,
            gamesPlayed: (snap.exists() ? snap.data().gamesPlayed || 0 : 0) + 1,
          });
          setUser((u) => {
            const updated = { ...u, bestScore: nextBest };
            localStorage.setItem('rt_user_session', JSON.stringify(updated));
            return updated;
          });
        } catch {
          // ignore
        }
      }
      return;
    }

    setSoloBusy(true);
    setSoloAnswer('');
    setSoloState((prev) => ({ ...prev, round: prev.round + 1, status: 'loading', lastResult: null }));
    try {
      const qData = await generateQuestionAI({
        category,
        difficulty,
        lang,
        usedQuestions: soloState.usedQuestions,
      });
      setSoloState((prev) => ({
        ...prev,
        status: 'playing',
        question: qData,
        usedQuestions: [...prev.usedQuestions, qData.question],
      }));
      if (soloState.timeLimit > 0) setSoloTimer(soloState.timeLimit);
    } catch (err) {
      setGlobalNotice({ type: 'error', text: err.message });
      setSoloState((prev) => ({ ...prev, status: 'finished' }));
    } finally {
      setSoloBusy(false);
    }
  };

  // ==========================================
  // MULTIPLAYER: CREATE / JOIN / LEAVE / BAN
  // ==========================================

  const clearRoomUrlParam = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  const handleCreateRoom = async () => {
    if (!user || mpActionBusy) return;
    setGlobalNotice(null);
    setMpActionBusy(true);
    try {
      const code = generateRoomCode();
      const roomRef = doc(db, 'rooms', code);
      const initialRoom = {
        code,
        hostId: user.id,
        status: 'lobby', // 'lobby' | 'generating' | 'banning' | 'answering' | 'grading' | 'results' | 'finished'
        category,
        difficulty,
        totalRounds: 5,
        answerTime: 30,
        banTime: 20,
        enableBanPhase: true,
        round: 0,
        phaseEndsAt: 0,
        question: null,
        usedQuestions: [],
        bannedWords: [],
        players: {
          [user.id]: {
            id: user.id,
            name: user.displayName || user.id,
            score: 0,
            ready: true,
            joinedAt: Date.now(),
          },
        },
        bannedIds: [],
        bans: {},
        submissions: {},
        roundResults: null,
        createdAt: Date.now(),
      };
      await setDoc(roomRef, initialRoom);
      phaseLockRef.current = '';
      setRoomId(code);
      setView('multi');
    } catch (err) {
      setGlobalNotice({ type: 'error', text: t(`สร้างห้องไม่สำเร็จ: ${err.message}`, `Failed to create room: ${err.message}`) });
    } finally {
      setMpActionBusy(false);
    }
  };

  const handleJoinRoom = async (rawCode) => {
    const code = String(rawCode || joinCodeInput || '').trim().toUpperCase();
    if (!user || !code) {
      setGlobalNotice({ type: 'error', text: t('กรุณากรอกรหัสห้อง 6 หลัก', 'Please enter a 6-character room code.') });
      return;
    }

    setGlobalNotice(null);
    setMpActionBusy(true);
    try {
      const roomRef = doc(db, 'rooms', code);
      const snap = await getDoc(roomRef);

      if (!snap.exists()) {
        clearRoomUrlParam();
        setGlobalNotice({ type: 'error', text: t(`ไม่พบห้องรหัส "${code}"`, `Room "${code}" not found.`) });
        setMpActionBusy(false);
        return;
      }

      const data = snap.data();
      if (Array.isArray(data.bannedIds) && data.bannedIds.includes(user.id)) {
        clearRoomUrlParam();
        setGlobalNotice({
          type: 'error',
          text: t('คุณถูกแบนจากห้องนี้ ไม่สามารถเข้าร่วมได้จนกว่าหัวห้องจะปลดแบน', 'You are banned from this room.'),
        });
        setMpActionBusy(false);
        return;
      }

      if (!data.players?.[user.id]) {
        await updateDoc(roomRef, {
          [`players.${user.id}`]: {
            id: user.id,
            name: user.displayName || user.id,
            score: 0,
            ready: false,
            joinedAt: Date.now(),
          },
        });
      }

      phaseLockRef.current = '';
      setRoomId(code);
      setView('multi');
    } catch (err) {
      setGlobalNotice({ type: 'error', text: t(`เข้าห้องไม่สำเร็จ: ${err.message}`, `Failed to join room: ${err.message}`) });
    } finally {
      setMpActionBusy(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomId || !user) {
      setRoomId(null);
      setRoom(null);
      setView('home');
      return;
    }

    const currentRoom = room;
    const currentId = roomId;
    setRoomId(null);
    setRoom(null);
    setView('home');
    clearRoomUrlParam();

    try {
      const roomRef = doc(db, 'rooms', currentId);
      const updates = {
        [`players.${user.id}`]: deleteField(),
        [`submissions.${user.id}`]: deleteField(),
        [`bans.${user.id}`]: deleteField(),
      };
      // Transfer host if leaving player was host
      if (currentRoom?.hostId === user.id && currentRoom?.players) {
        const others = Object.keys(currentRoom.players).filter((pid) => pid !== user.id);
        if (others.length > 0) {
          updates.hostId = others[0];
        }
      }
      await updateDoc(roomRef, updates);
    } catch {
      // ignore cleanup errors
    }
  };

  // Atomic Kick & Ban (clears player from players, bans, and submissions so rounds NEVER hang)
  const handleKickPlayer = async (targetId) => {
    if (!roomId || !room || room.hostId !== user?.id || targetId === user.id) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        [`players.${targetId}`]: deleteField(),
        [`submissions.${targetId}`]: deleteField(),
        [`bans.${targetId}`]: deleteField(),
      });
    } catch (err) {
      setGlobalNotice({ type: 'error', text: err.message });
    }
  };

  const handleBanPlayer = async (targetId) => {
    if (!roomId || !room || room.hostId !== user?.id || targetId === user.id) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        bannedIds: arrayUnion(targetId),
        [`players.${targetId}`]: deleteField(),
        [`submissions.${targetId}`]: deleteField(),
        [`bans.${targetId}`]: deleteField(),
      });
    } catch (err) {
      setGlobalNotice({ type: 'error', text: err.message });
    }
  };

  const handleUnbanPlayer = async (targetId) => {
    if (!roomId || !room || room.hostId !== user?.id) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        bannedIds: arrayRemove(targetId),
      });
    } catch (err) {
      setGlobalNotice({ type: 'error', text: err.message });
    }
  };

  const handleToggleReady = async () => {
    if (!roomId || !room || !user) return;
    const current = Boolean(room.players?.[user.id]?.ready);
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        [`players.${user.id}.ready`]: !current,
      });
    } catch {
      // ignore
    }
  };

  const handleUpdateRoomSetting = async (patch) => {
    if (!roomId || !room || room.hostId !== user?.id) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), patch);
    } catch {
      // ignore
    }
  };

  // ==========================================
  // MULTIPLAYER REALTIME LISTENER & BAN DETECTION
  // ==========================================

  useEffect(() => {
    if (!roomId || !user) return;
    const roomRef = doc(db, 'rooms', roomId);

    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          setRoomId(null);
          setRoom(null);
          setView('home');
          clearRoomUrlParam();
          setGlobalNotice({ type: 'error', text: t('ห้องนี้ถูกปิดไปแล้ว', 'This room no longer exists.') });
          return;
        }

        const data = snap.data();

        // Immediate clean exit if banned
        if (Array.isArray(data.bannedIds) && data.bannedIds.includes(user.id)) {
          setRoomId(null);
          setRoom(null);
          setView('home');
          clearRoomUrlParam();
          setGlobalNotice({
            type: 'error',
            text: t('คุณถูกแบนออกจากห้องนี้โดยหัวห้อง', 'You were banned from this room by the host.'),
          });
          return;
        }

        // Immediate clean exit if kicked
        if (!data.players || !data.players[user.id]) {
          setRoomId(null);
          setRoom(null);
          setView('home');
          clearRoomUrlParam();
          setGlobalNotice({
            type: 'info',
            text: t('คุณถูกเชิญออกจากห้องนี้', 'You were removed from the room.'),
          });
          return;
        }

        setRoom(data);
      },
      (err) => {
        setGlobalNotice({ type: 'error', text: err.message });
      }
    );

    return () => unsub();
  }, [roomId, user]);

  // Clear local inputs when round or status changes
  useEffect(() => {
    setMpAnswer('');
    setMpBanInput('');
    setHostGradingError('');
  }, [room?.round, room?.status]);

  // Live countdown ticker synced to room.phaseEndsAt
  useEffect(() => {
    if (!room || (room.status !== 'banning' && room.status !== 'answering')) {
      setMpTimeLeft(0);
      return;
    }

    const updateTick = () => {
      const remaining = Math.max(0, Math.ceil(((room.phaseEndsAt || 0) - Date.now()) / 1000));
      setMpTimeLeft(remaining);
    };

    updateTick();
    const timer = setInterval(updateTick, 500);
    return () => clearInterval(timer);
  }, [room?.status, room?.phaseEndsAt]);

  // ==========================================
  // MULTIPLAYER HOST STATE MACHINE (ZERO HANG)
  // ==========================================

  const isHost = Boolean(room && user && room.hostId === user.id);
  const activePlayerIds = room?.players ? Object.keys(room.players) : [];

  // Host starts a new round (generates question -> enters banning OR answering)
  const hostStartRound = async (nextRoundNumber, resetScores = false) => {
    if (!roomId || !room || !isHost) return;
    const lockKey = `gen-${nextRoundNumber}-${resetScores ? 'reset' : 'next'}`;
    if (phaseLockRef.current === lockKey) return;
    phaseLockRef.current = lockKey;

    setHostGradingError('');
    const roomRef = doc(db, 'rooms', roomId);

    try {
      const prepUpdates = {
        status: 'generating',
        round: nextRoundNumber,
        bans: {},
        submissions: {},
        roundResults: null,
        bannedWords: [],
      };
      if (resetScores && room.players) {
        Object.keys(room.players).forEach((pid) => {
          prepUpdates[`players.${pid}.score`] = 0;
        });
        prepUpdates.usedQuestions = [];
      }
      await updateDoc(roomRef, prepUpdates);

      const used = resetScores ? [] : room.usedQuestions || [];
      const qData = await generateQuestionAI({
        category: room.category || 'general',
        difficulty: room.difficulty || 'medium',
        lang,
        usedQuestions: used,
      });

      if (room.enableBanPhase) {
        await updateDoc(roomRef, {
          status: 'banning',
          question: qData,
          usedQuestions: [...used, qData.question],
          bannedWords: qData.defaultBans || [],
          phaseEndsAt: Date.now() + (room.banTime || 20) * 1000,
        });
      } else {
        await updateDoc(roomRef, {
          status: 'answering',
          question: qData,
          usedQuestions: [...used, qData.question],
          bannedWords: qData.defaultBans || [],
          phaseEndsAt: Date.now() + (room.answerTime || 30) * 1000,
        });
      }
    } catch (err) {
      phaseLockRef.current = '';
      setHostGradingError(err.message);
      await updateDoc(roomRef, { status: 'lobby' }).catch(() => {});
    }
  };

  // Transition: Banning -> Answering
  const hostAdvanceToAnswering = async () => {
    if (!roomId || !room || !isHost || room.status !== 'banning') return;
    const lockKey = `ban-to-ans-${room.round}`;
    if (phaseLockRef.current === lockKey) return;
    phaseLockRef.current = lockKey;

    try {
      const defaultBans = room.question?.defaultBans || [];
      const playerBans = Object.values(room.bans || {})
        .map((b) => String(b?.word || '').trim())
        .filter(Boolean);

      // Deduplicate case-insensitively
      const seen = new Set();
      const mergedBans = [];
      [...defaultBans, ...playerBans].forEach((word) => {
        const key = normalizeText(word);
        if (key && !seen.has(key)) {
          seen.add(key);
          mergedBans.push(word);
        }
      });

      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'answering',
        bannedWords: mergedBans,
        phaseEndsAt: Date.now() + (room.answerTime || 30) * 1000,
      });
    } catch (err) {
      phaseLockRef.current = '';
      setHostGradingError(err.message);
    }
  };

  // Transition: Answering -> Grading -> Results
  const hostGradeRound = async (forceRetry = false) => {
    if (!roomId || !room || !isHost) return;
    if (!forceRetry && room.status !== 'answering') return;

    const lockKey = `grade-${room.round}`;
    if (!forceRetry && phaseLockRef.current === lockKey) return;
    phaseLockRef.current = lockKey;
    setHostGradingError('');

    const roomRef = doc(db, 'rooms', roomId);
    try {
      await updateDoc(roomRef, { status: 'grading' });

      const activeIds = Object.keys(room.players || {});
      const subs = room.submissions || {};
      const bannedSet = new Set((room.bannedWords || []).map(normalizeText).filter(Boolean));

      // Count duplicates across active players
      const freq = {};
      activeIds.forEach((pid) => {
        const norm = normalizeText(subs[pid]?.text || '');
        if (norm) {
          freq[norm] = (freq[norm] || 0) + 1;
        }
      });

      const finalResults = {};
      const toGradeByAI = [];

      activeIds.forEach((pid) => {
        const rawText = String(subs[pid]?.text || '').trim();
        const norm = normalizeText(rawText);

        if (!norm) {
          finalResults[pid] = {
            answer: t('(ไม่ได้ตอบ)', '(No answer)'),
            status: 'timeout',
            points: 0,
            rarity: 0,
            reason: t('ส่งคำตอบไม่ทันเวลา', 'Did not submit in time.'),
          };
        } else if (bannedSet.has(norm)) {
          finalResults[pid] = {
            answer: rawText,
            status: 'banned',
            points: 0,
            rarity: 0,
            reason: t('โดนคำต้องห้าม! อดคะแนนรอบนี้', 'Hit a banned word! 0 pts.'),
          };
        } else if (freq[norm] > 1) {
          finalResults[pid] = {
            answer: rawText,
            status: 'duplicate',
            points: 0,
            rarity: 0,
            reason: t('ใจตรงกัน! ตอบซ้ำกับเพื่อน ตัดคะแนนคู่', 'Duplicate answer! Cancelled out.'),
          };
        } else {
          toGradeByAI.push({ id: pid, text: rawText });
        }
      });

      // Only call AI if there are unique non-banned answers
      if (toGradeByAI.length > 0) {
        const aiMap = await gradeAnswersBatchAI({
          question: room.question?.question || '',
          answers: toGradeByAI,
          lang,
        });

        toGradeByAI.forEach(({ id, text }) => {
          const g = aiMap?.[id];
          if (g && g.isValid) {
            const pts = Math.max(10, Math.min(100, Number(g.rarity) || 50));
            finalResults[id] = {
              answer: text,
              status: 'valid',
              points: pts,
              rarity: pts,
              reason: g.reason || t('คำตอบถูกต้อง!', 'Valid answer!'),
            };
          } else {
            finalResults[id] = {
              answer: text,
              status: 'invalid',
              points: 0,
              rarity: 0,
              reason: g?.reason || t('คำตอบยังไม่ตรงเงื่อนไขคำถาม', 'Answer does not match the question.'),
            };
          }
        });
      }

      // Compute updated scores
      const updates = {
        status: 'results',
        roundResults: finalResults,
      };
      activeIds.forEach((pid) => {
        const oldScore = Number(room.players?.[pid]?.score || 0);
        const earned = Number(finalResults[pid]?.points || 0);
        updates[`players.${pid}.score`] = oldScore + earned;
      });

      await updateDoc(roomRef, updates);
    } catch (err) {
      phaseLockRef.current = '';
      setHostGradingError(err.message);
    }
  };

  // Auto-advance Effect for Host (Banning -> Answering, Answering -> Grading)
  useEffect(() => {
    if (!isHost || !room || activePlayerIds.length === 0) return;

    if (room.status === 'banning') {
      const bansMap = room.bans || {};
      const allDoneBanning = activePlayerIds.every((pid) => Boolean(bansMap[pid]));
      const timeExpired = room.phaseEndsAt > 0 && Date.now() >= room.phaseEndsAt;
      if (allDoneBanning || timeExpired) {
        hostAdvanceToAnswering();
      }
    } else if (room.status === 'answering') {
      const subsMap = room.submissions || {};
      const allSubmitted = activePlayerIds.every((pid) => Boolean(subsMap[pid]));
      const timeExpired = room.phaseEndsAt > 0 && Date.now() >= room.phaseEndsAt;
      if (allSubmitted || timeExpired) {
        hostGradeRound(false);
      }
    }
  }, [isHost, room, mpTimeLeft]);

  // Player actions during Banning & Answering
  const handleSubmitBan = async (skip = false) => {
    if (!roomId || !room || !user || room.status !== 'banning') return;
    if (room.bans?.[user.id]) return;

    const word = skip ? '' : mpBanInput.trim();
    if (!skip && !word) return;

    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        [`bans.${user.id}`]: {
          word,
          skipped: skip,
          submittedAt: Date.now(),
        },
      });
    } catch (err) {
      setGlobalNotice({ type: 'error', text: err.message });
    }
  };

  const handleSubmitMpAnswer = async (e) => {
    e?.preventDefault();
    if (!roomId || !room || !user || room.status !== 'answering') return;
    if (room.submissions?.[user.id]) return;

    const text = mpAnswer.trim();
    if (!text) return;

    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        [`submissions.${user.id}`]: {
          text,
          submittedAt: Date.now(),
        },
      });
    } catch (err) {
      setGlobalNotice({ type: 'error', text: err.message });
    }
  };

  const hostNextStepFromResults = async () => {
    if (!roomId || !room || !isHost) return;
    if (room.round >= (room.totalRounds || 5)) {
      await updateDoc(doc(db, 'rooms', roomId), { status: 'finished' });
    } else {
      await hostStartRound(room.round + 1, false);
    }
  };

  const hostBackToLobby = async () => {
    if (!roomId || !room || !isHost) return;
    phaseLockRef.current = '';
    await updateDoc(doc(db, 'rooms', roomId), {
      status: 'lobby',
      round: 0,
      question: null,
      bans: {},
      submissions: {},
      roundResults: null,
      bannedWords: [],
    });
  };

  // Invite URL & QR code
  const inviteUrl =
    typeof window !== 'undefined' && roomId
      ? `${window.location.origin}${window.location.pathname}?room=${roomId}`
      : '';

  const qrImageUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(inviteUrl)}`
    : '';

  const copyInviteLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setGlobalNotice({ type: 'info', text: inviteUrl });
    }
  };

  // ==========================================
  // RENDER: LOGIN SCREEN
  // ==========================================

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-black text-xl tracking-tight">Reverse Trivia</h1>
                <p className="text-xs text-indigo-400 font-medium">ทายสวนกระแส</p>
              </div>
            </div>
            <button
              onClick={() => setLang((l) => (l === 'th' ? 'en' : 'th'))}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              {lang.toUpperCase()}
            </button>
          </div>

          {pendingRoomCode && (
            <div className="mb-5 p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 text-sm text-indigo-200 flex items-center gap-2.5">
              <Users className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>
                {t(
                  `คุณได้รับคำเชิญเข้าห้อง ${pendingRoomCode} — กรอกชื่อและ PIN เพื่อเข้าห้องทันที`,
                  `Invited to Room ${pendingRoomCode} — sign in to join immediately!`
                )}
              </span>
            </div>
          )}

          <p className="text-sm text-slate-400 mb-6">
            {t(
              'สร้างชื่อผู้เล่น + รหัส PIN 4 หลัก (หรือใส่ของเดิมเพื่อเข้าสู่ระบบ)',
              'Create a Player ID + 4-digit PIN (or sign in with an existing one).'
            )}
          </p>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                {t('ชื่อผู้เล่น (Player ID)', 'Player ID')}
              </label>
              <input
                type="text"
                value={authId}
                onChange={(e) => setAuthId(e.target.value)}
                placeholder={t('เช่น player1 หรือ ชื่อเล่นของคุณ', 'e.g. player1')}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-white"
                maxLength={24}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                {t('รหัส PIN 4 หลัก', '4-Digit PIN')}
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={authPin}
                onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-white tracking-widest text-center text-lg"
                maxLength={4}
                required
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold text-white flex items-center justify-center gap-2 transition"
            >
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {pendingRoomCode
                    ? t(`เข้าสู่ระบบและเข้าห้อง ${pendingRoomCode}`, `Sign In & Join ${pendingRoomCode}`)
                    : t('เข้าเล่นเกม', 'Enter Game')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: HEADER BAR
  // ==========================================

  const sortedPlayers = room?.players
    ? Object.values(room.players).sort((a, b) => (b.score || 0) - (a.score || 0))
    : [];

  const mpPhases = [
    { key: 'lobby', th: '1. ห้องรอ', en: '1. Lobby' },
    { key: 'banning', th: '2. แบนคำ', en: '2. Ban' },
    { key: 'answering', th: '3. ตอบคำถาม', en: '3. Answer' },
    { key: 'results', th: '4. ผลคะแนน', en: '4. Results' },
    { key: 'finished', th: '5. สรุป', en: '5. Final' },
  ];

  const activePhaseIndex =
    room?.status === 'lobby'
      ? 0
      : room?.status === 'generating' || room?.status === 'banning'
      ? 1
      : room?.status === 'answering' || room?.status === 'grading'
      ? 2
      : room?.status === 'results'
      ? 3
      : 4;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (view === 'multi' && roomId) {
                if (window.confirm(t('ต้องการออกจากห้อง Multiplayer ใช่ไหม?', 'Leave Multiplayer room?'))) {
                  handleLeaveRoom();
                }
              } else {
                setView('home');
                setSoloState(null);
              }
            }}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-base leading-tight">Reverse Trivia</div>
              <div className="text-[11px] text-indigo-400 font-semibold">ทายสวนกระแส</div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang((l) => (l === 'th' ? 'en' : 'th'))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              {lang.toUpperCase()}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="font-bold text-white">{user.displayName}</span>
              <span className="text-amber-400 font-semibold">★ {user.bestScore || 0}</span>
            </div>
            <button
              onClick={handleLogout}
              title={t('ออกจากระบบ', 'Sign Out')}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        {/* Global Alert Banner */}
        {globalNotice && (
          <div
            className={`mb-5 p-4 rounded-2xl border flex items-start justify-between gap-3 text-sm ${
              globalNotice.type === 'error'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{globalNotice.text}</span>
            </div>
            <button
              onClick={() => setGlobalNotice(null)}
              className="text-xs opacity-70 hover:opacity-100 font-bold px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* ==========================================
            VIEW 1: HOME LOBBY (SOLO + MULTIPLAYER)
           ========================================== */}
        {view === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Game Setup */}
            <div className="lg:col-span-2 space-y-6">
              {/* Multiplayer Quick Card */}
              <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-black text-lg">{t('เล่นหลายคนกับเพื่อน (Multiplayer)', 'Play with Friends (Multiplayer)')}</h2>
                </div>
                <p className="text-xs text-slate-400 mb-5">
                  {t(
                    'สร้างห้องแชร์ลิงก์/QR โค้ด — ใครตอบซ้ำกันอดคะแนน! เปิดโหมดแบนคำต้องห้ามแกล้งเพื่อนได้',
                    'Create a room with shareable link & QR code. Duplicate answers cancel out!'
                  )}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleCreateRoom}
                    disabled={mpActionBusy}
                    className="py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20"
                  >
                    {mpActionBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    {t('สร้างห้องใหม่', 'Create Room')}
                  </button>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                      placeholder={t('กรอกรหัสห้อง 6 หลัก', 'Room Code')}
                      className="flex-1 min-w-0 px-3.5 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-center font-mono font-bold tracking-widest uppercase"
                    />
                    <button
                      onClick={() => handleJoinRoom(joinCodeInput)}
                      disabled={mpActionBusy || joinCodeInput.trim().length < 4}
                      className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 font-bold text-white flex items-center gap-1.5 transition shrink-0"
                    >
                      <LogIn className="w-4 h-4" />
                      {t('เข้าห้อง', 'Join')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Solo Mode Setup */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-lg flex items-center gap-2">
                    <Play className="w-5 h-5 text-emerald-400" />
                    {t('เล่นคนเดียว (Solo Run)', 'Solo Run')}
                  </h2>
                </div>

                {/* Mode cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SOLO_MODES.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setGameMode(m.id)}
                        className={`p-4 rounded-2xl border text-left transition ${
                          gameMode === m.id
                            ? 'bg-indigo-600/15 border-indigo-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-2 ${gameMode === m.id ? 'text-indigo-400' : 'text-slate-400'}`} />
                        <div className="font-bold text-sm">{lang === 'th' ? m.titleTh : m.titleEn}</div>
                        <div className="text-xs text-slate-400 mt-1">{lang === 'th' ? m.descTh : m.descEn}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Category & Difficulty */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      {t('หมวดหมู่คำถาม', 'Category')}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {lang === 'th' ? c.th : c.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      {t('ระดับความยาก', 'Difficulty')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {DIFFICULTIES.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setDifficulty(d.id)}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                            difficulty === d.id
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {lang === 'th' ? d.th : d.en}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={startSoloGame}
                  disabled={soloBusy}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20"
                >
                  {soloBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  {t('เริ่มเกมคนเดียว', 'Start Solo Run')}
                </button>
              </div>
            </div>

            {/* Right Column: How to Play + Leaderboard */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                <h3 className="font-bold text-sm text-indigo-300 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t('กติกา Reverse Trivia', 'How to Play')}
                </h3>
                <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
                  <li>• {t('ตอบให้ "ถูกต้องตามความจริง" แต่ต้อง "แรร์/ไม่ซ้ำใคร"', 'Give a factually TRUE answer that is as RARE as possible.')}</li>
                  <li>• {t('ห้ามตอบคำที่อยู่ในรายการ "คำต้องห้าม (Banned)"', 'Never submit a word on the Banned list.')}</li>
                  <li>• {t('ในโหมด Multiplayer ถ้าตอบซ้ำกับเพื่อน = อดคะแนนทั้งคู่!', 'In Multiplayer, matching another player = 0 pts for both!')}</li>
                </ul>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  {t('อันดับคะแนนสูงสุด (Solo)', 'Top Solo Leaderboard')}
                </h3>
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-slate-500">{t('ยังไม่มีสถิติ เริ่มเล่นเลย!', 'No scores yet.')}</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${
                          p.id === user.id ? 'bg-indigo-600/20 border border-indigo-500/40' : 'bg-slate-950/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-black text-slate-500 w-5">#{idx + 1}</span>
                          <span className="font-semibold truncate">{p.displayName || p.id}</span>
                        </div>
                        <span className="font-bold text-amber-400">{p.bestScore || 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            VIEW 2: SOLO RUN SCREEN
           ========================================== */}
        {view === 'solo' && soloState && (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Top Stats */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm">
              <div className="font-bold">
                {t('ข้อที่', 'Round')} {soloState.round}
                {soloState.mode !== 'survival' ? ` / ${soloState.maxRounds}` : ''}
              </div>
              {soloState.mode === 'survival' && (
                <div className="text-rose-400 font-bold">
                  {'❤️'.repeat(Math.max(0, soloState.lives))}
                </div>
              )}
              {soloState.timeLimit > 0 && soloState.status === 'playing' && (
                <div className={`font-mono font-bold flex items-center gap-1 ${soloTimer <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                  <Clock className="w-4 h-4" />
                  {soloTimer}s
                </div>
              )}
              <div className="font-black text-indigo-400">
                {soloState.score} {t('คะแนน', 'pts')}
              </div>
            </div>

            {soloState.status === 'loading' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-slate-300 font-medium">{t('AI กำลังสร้างคำถาม...', 'Generating question...')}</p>
              </div>
            )}

            {(soloState.status === 'playing' || soloState.status === 'grading') && soloState.question && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    {t('คำถาม', 'Question')}
                  </span>
                  <h2 className="text-2xl font-black mt-1 leading-snug">{soloState.question.question}</h2>
                  {soloState.question.hint && (
                    <p className="text-xs text-slate-400 mt-1.5">{soloState.question.hint}</p>
                  )}
                </div>

                {soloState.question.defaultBans?.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                    <div className="text-xs font-bold text-rose-300 mb-2 flex items-center gap-1.5">
                      <Ban className="w-4 h-4" />
                      {t('คำต้องห้าม (ห้ามตอบคำเหล่านี้):', 'Banned Obvious Answers:')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {soloState.question.defaultBans.map((b, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 text-xs font-semibold">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitSoloAnswer(false);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={soloAnswer}
                    onChange={(e) => setSoloAnswer(e.target.value)}
                    disabled={soloState.status === 'grading'}
                    placeholder={t('พิมพ์คำตอบที่แรร์ที่สุดของคุณ...', 'Type your rarest valid answer...')}
                    className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-white"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={soloState.status === 'grading' || !soloAnswer.trim()}
                    className="px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-bold text-white flex items-center gap-2"
                  >
                    {soloState.status === 'grading' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {t('ส่ง', 'Submit')}
                  </button>
                </form>
              </div>
            )}

            {soloState.status === 'result' && soloState.lastResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {soloState.lastResult.status === 'valid' ? (
                      <CheckCircle className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <XCircle className="w-7 h-7 text-rose-400" />
                    )}
                    <div>
                      <div className="font-black text-lg">
                        {soloState.lastResult.status === 'valid'
                          ? t(`ถูกต้อง! +${soloState.lastResult.points} คะแนน`, `Valid! +${soloState.lastResult.points} pts`)
                          : t('อดคะแนน (0 คะแนน)', '0 Points')}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t('คำตอบของคุณ:', 'Your answer:')} <span className="text-white font-semibold">{soloState.lastResult.answer}</span>
                      </div>
                    </div>
                  </div>
                  {soloState.lastResult.status === 'valid' && (
                    <div className="text-right">
                      <div className="text-xs text-slate-400">{t('ความแรร์', 'Rarity')}</div>
                      <div className="text-2xl font-black text-amber-400">{soloState.lastResult.rarity}/100</div>
                    </div>
                  )}
                </div>

                <p className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-300">
                  {soloState.lastResult.reason}
                </p>

                <button
                  onClick={nextSoloRound}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white flex items-center justify-center gap-2"
                >
                  {t('ข้อถัดไป', 'Next Round')}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {soloState.status === 'finished' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5">
                <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
                <div>
                  <h2 className="text-2xl font-black">{t('จบเกม Solo!', 'Solo Run Complete!')}</h2>
                  <p className="text-4xl font-black text-indigo-400 mt-2">
                    {soloState.score} <span className="text-base text-slate-400">{t('คะแนน', 'pts')}</span>
                  </p>
                </div>

                <div className="space-y-2 text-left max-h-64 overflow-y-auto">
                  {soloState.history.map((h, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-slate-400 truncate">{i + 1}. {h.question}</div>
                        <div className="font-bold text-white mt-0.5">{h.answer}</div>
                      </div>
                      <span className={`font-black shrink-0 ${h.points > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        +{h.points}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startSoloGame}
                    className="py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('เล่นอีกครั้ง', 'Play Again')}
                  </button>
                  <button
                    onClick={() => {
                      setView('home');
                      setSoloState(null);
                    }}
                    className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-200"
                  >
                    {t('กลับหน้าหลัก', 'Back Home')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            VIEW 3: MULTIPLAYER ROOM
           ========================================== */}
        {view === 'multi' && room && (
          <div className="space-y-5">
            {/* Room Top Bar + Clear 5-Step Progress */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 font-mono font-black text-indigo-300 tracking-widest">
                    {room.code}
                  </div>
                  <div className="text-xs text-slate-400">
                    {isHost ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5" /> {t('คุณคือหัวห้อง', 'You are Host')}
                      </span>
                    ) : (
                      <span>{t('ผู้เล่นในห้อง', 'Player')} • {activePlayerIds.length} {t('คน', 'online')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyInviteLink}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-indigo-400" />}
                    {copiedLink ? t('คัดลอกแล้ว!', 'Copied!') : t('คัดลอกลิงก์', 'Copy Link')}
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                    QR
                  </button>
                  <button
                    onClick={handleLeaveRoom}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold"
                  >
                    {t('ออกห้อง', 'Leave')}
                  </button>
                </div>
              </div>

              {/* 5-Step Progress Bar */}
              <div className="grid grid-cols-5 gap-1.5">
                {mpPhases.map((p, idx) => (
                  <div
                    key={p.key}
                    className={`py-1.5 px-2 rounded-lg text-center text-[11px] font-bold truncate transition ${
                      idx === activePhaseIndex
                        ? 'bg-indigo-600 text-white'
                        : idx < activePhaseIndex
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-950 text-slate-500'
                    }`}
                  >
                    {lang === 'th' ? p.th : p.en}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview URL Warning for Host */}
            {isVercelPreviewUrl && room.status === 'lobby' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <span className="font-bold">{t('คำเตือนลิงก์ Vercel Preview:', 'Vercel Preview URL detected:')}</span>{' '}
                  {t(
                    'ตอนนี้คุณเปิดจากลิงก์ Preview เพื่อนที่สแกน QR อาจติดหน้า Login ของ Vercel ให้เปิดเว็บจากโดเมนหลัก (Production Domain) หรือปิด Vercel Authentication ใน Settings → Deployment Protection',
                    'Friends opening this Preview URL may be asked to log into Vercel. Use your main Production domain or disable Vercel Authentication in Deployment Protection.'
                  )}
                </div>
              </div>
            )}

            {/* Host Error Recovery Bar */}
            {hostGradingError && isHost && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm flex flex-wrap items-center justify-between gap-3">
                <span>{t(`เกิดข้อผิดพลาดจาก AI: ${hostGradingError}`, `AI Error: ${hostGradingError}`)}</span>
                <div className="flex gap-2">
                  {room.status === 'grading' && (
                    <button
                      onClick={() => hostGradeRound(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> {t('ตรวจใหม่', 'Retry')}
                    </button>
                  )}
                  <button
                    onClick={hostBackToLobby}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold"
                  >
                    {t('กลับห้องรอ', 'Back to Lobby')}
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------
                MP PHASE 1: LOBBY
               ------------------------------------------ */}
            {room.status === 'lobby' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Players + Kick/Ban Manager */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-black text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-400" />
                      {t('ผู้เล่นในห้อง', 'Players')} ({sortedPlayers.length})
                    </h2>
                    {!isHost && (
                      <button
                        onClick={handleToggleReady}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                          room.players?.[user.id]?.ready
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {room.players?.[user.id]?.ready ? t('✓ พร้อมแล้ว', '✓ Ready') : t('กดพร้อม', 'Mark Ready')}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {sortedPlayers.map((p) => {
                      const pIsHost = p.id === room.hostId;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-300 font-black flex items-center justify-center uppercase">
                              {(p.name || p.id).slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm flex items-center gap-1.5 truncate">
                                {p.name || p.id}
                                {pIsHost && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                                {p.id === user.id && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                    {t('คุณ', 'You')}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">
                                {pIsHost
                                  ? t('หัวห้อง', 'Host')
                                  : p.ready
                                  ? t('พร้อมเล่นแล้ว', 'Ready')
                                  : t('กำลังรอ...', 'Waiting...')}
                              </div>
                            </div>
                          </div>

                          {/* Host Kick / Ban buttons */}
                          {isHost && p.id !== user.id && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleKickPlayer(p.id)}
                                title={t('เตะออก (เข้าใหม่ได้)', 'Kick player')}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-600/30 text-slate-300 hover:text-amber-300 text-xs font-bold flex items-center gap-1"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                {t('เตะ', 'Kick')}
                              </button>
                              <button
                                onClick={() => handleBanPlayer(p.id)}
                                title={t('แบนถาวร (ห้ามเข้าห้องนี้)', 'Ban player')}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1 transition"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                {t('แบน', 'Ban')}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Banned Players Management (Host Only) */}
                  {isHost && Array.isArray(room.bannedIds) && room.bannedIds.length > 0 && (
                    <div className="pt-4 border-t border-slate-800">
                      <div className="text-xs font-bold text-rose-400 mb-2 flex items-center gap-1.5">
                        <Ban className="w-4 h-4" />
                        {t('รายชื่อผู้เล่นที่ถูกแบน', 'Banned Players')} ({room.bannedIds.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {room.bannedIds.map((bid) => (
                          <div
                            key={bid}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs"
                          >
                            <span className="text-rose-200 font-semibold">{bid}</span>
                            <button
                              onClick={() => handleUnbanPlayer(bid)}
                              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5"
                            >
                              <Unlock className="w-3 h-3" /> {t('ปลดแบน', 'Unban')}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Room Settings & Start */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <h3 className="font-black text-base">{t('ตั้งค่าห้อง', 'Room Settings')}</h3>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">{t('หมวดหมู่', 'Category')}</label>
                    <select
                      value={room.category || 'general'}
                      disabled={!isHost}
                      onChange={(e) => handleUpdateRoomSetting({ category: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs disabled:opacity-60"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {lang === 'th' ? c.th : c.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">{t('จำนวนข้อ', 'Rounds')}</label>
                      <select
                        value={room.totalRounds || 5}
                        disabled={!isHost}
                        onChange={(e) => handleUpdateRoomSetting({ totalRounds: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs disabled:opacity-60"
                      >
                        {[3, 5, 7, 10].map((n) => (
                          <option key={n} value={n}>
                            {n} {t('ข้อ', 'Rounds')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">{t('เวลาตอบ', 'Answer Time')}</label>
                      <select
                        value={room.answerTime || 30}
                        disabled={!isHost}
                        onChange={(e) => handleUpdateRoomSetting({ answerTime: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs disabled:opacity-60"
                      >
                        {[20, 30, 45, 60].map((s) => (
                          <option key={s} value={s}>
                            {s} {t('วิ', 'sec')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Toggle Answer Ban Phase */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Ban className="w-3.5 h-3.5 text-rose-400" />
                        {t('ช่วงแบนคำตอบก่อนทาย', 'Pre-Round Ban Phase')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t('ให้ทุกคนแบนคำตอบคนละ 1 คำก่อนเริ่มทาย', 'Each player bans 1 obvious answer first')}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleUpdateRoomSetting({ enableBanPhase: !room.enableBanPhase })}
                      className={`w-12 h-7 rounded-full transition relative shrink-0 disabled:opacity-60 ${
                        room.enableBanPhase ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white absolute top-1 transition ${
                          room.enableBanPhase ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {isHost ? (
                    <button
                      onClick={() => hostStartRound(1, true)}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <Play className="w-5 h-5" />
                      {t('เริ่มเกมเลย!', 'Start Game')}
                    </button>
                  ) : (
                    <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-center text-xs text-indigo-300 font-medium">
                      {t('รอหัวห้องกดเริ่มเกม...', 'Waiting for host to start...')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------
                MP PHASE: GENERATING QUESTION
               ------------------------------------------ */}
            {room.status === 'generating' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                <h2 className="text-xl font-black">
                  {t(`กำลังเตรียมคำถามข้อที่ ${room.round}...`, `Preparing Round ${room.round}...`)}
                </h2>
              </div>
            )}

            {/* ------------------------------------------
                MP PHASE 2: BANNING PHASE (NO HANG!)
               ------------------------------------------ */}
            {room.status === 'banning' && room.question && (
              <div className="max-w-2xl mx-auto bg-slate-900 border border-rose-500/30 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5" />
                    {t(`ข้อ ${room.round}/${room.totalRounds} • ช่วงแบนคำตอบ`, `Round ${room.round}/${room.totalRounds} • Ban Phase`)}
                  </span>
                  <div className={`font-mono font-black text-lg flex items-center gap-1.5 ${mpTimeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                    <Clock className="w-5 h-5" />
                    {mpTimeLeft}s
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">{t('คำถามรอบนี้คือ:', 'This round question:')}</div>
                  <h2 className="text-2xl font-black leading-snug">{room.question.question}</h2>
                </div>

                <div className="text-xs text-slate-400">
                  {t('ส่งคำแบนแล้ว:', 'Banned submitted:')}{' '}
                  <span className="text-white font-bold">
                    {activePlayerIds.filter((pid) => Boolean(room.bans?.[pid])).length} / {activePlayerIds.length}
                  </span>
                </div>

                {room.bans?.[user.id] ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-sm flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <span>
                      {room.bans[user.id].skipped
                        ? t('คุณเลือกข้ามการแบน รอเพื่อนคนอื่นสักครู่...', 'You skipped banning. Waiting for others...')
                        : t(`คุณแบนคำว่า "${room.bans[user.id].word}" แล้ว รอเพื่อนคนอื่น...`, `You banned "${room.bans[user.id].word}". Waiting for others...`)}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-rose-200">
                      {t('พิมพ์ 1 คำตอบที่คิดว่าเป็นคำฮิต เพื่อแบนไม่ให้ใครใช้ในรอบนี้:', 'Type 1 obvious answer to ban for this round:')}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={mpBanInput}
                        onChange={(e) => setMpBanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && mpBanInput.trim()) handleSubmitBan(false);
                        }}
                        placeholder={t('พิมพ์คำที่อยากแบน...', 'Type a word to ban...')}
                        className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-rose-500 focus:outline-none text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSubmitBan(false)}
                        disabled={!mpBanInput.trim()}
                        className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 font-bold text-white"
                      >
                        {t('แบนคำนี้', 'Ban')}
                      </button>
                      <button
                        onClick={() => handleSubmitBan(true)}
                        className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                      >
                        {t('ข้าม', 'Skip')}
                      </button>
                    </div>
                  </div>
                )}

                {isHost && (
                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={hostAdvanceToAnswering}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
                    >
                      <SkipForward className="w-4 h-4" />
                      {t('เริ่มช่วงตอบคำถามเลย (หัวห้อง)', 'Force Start Answering')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------
                MP PHASE 3: ANSWERING PHASE
               ------------------------------------------ */}
            {room.status === 'answering' && room.question && (
              <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">
                    {t(`ข้อ ${room.round} / ${room.totalRounds}`, `Round ${room.round} / ${room.totalRounds}`)}
                  </span>
                  <div className={`font-mono font-black text-xl flex items-center gap-1.5 ${mpTimeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                    <Clock className="w-5 h-5" />
                    {mpTimeLeft}s
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black leading-snug">{room.question.question}</h2>
                  {room.question.hint && <p className="text-xs text-slate-400 mt-1">{room.question.hint}</p>}
                </div>

                {/* All Active Banned Words */}
                {room.bannedWords?.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                    <div className="text-xs font-bold text-rose-300 mb-2 flex items-center gap-1.5">
                      <Ban className="w-4 h-4" />
                      {t('คำต้องห้ามรอบนี้ (ตอบโดน = 0 คะแนน):', 'Banned Words This Round (0 pts):')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {room.bannedWords.map((w, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-rose-500/25 text-rose-100 text-xs font-bold">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submission Form or Submitted Confirmation */}
                {room.submissions?.[user.id] ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 space-y-1">
                    <div className="text-emerald-300 font-bold text-sm flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      {t('ส่งคำตอบแล้ว!', 'Answer Submitted!')}
                    </div>
                    <div className="text-xs text-slate-300">
                      {t('คำตอบของคุณ:', 'Your answer:')} <span className="font-bold text-white">{room.submissions[user.id].text}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitMpAnswer} className="flex gap-2">
                    <input
                      type="text"
                      value={mpAnswer}
                      onChange={(e) => setMpAnswer(e.target.value)}
                      placeholder={t('พิมพ์คำตอบที่ถูกและไม่ซ้ำใคร...', 'Type a rare, unique valid answer...')}
                      className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-white"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!mpAnswer.trim()}
                      className="px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-bold text-white flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      {t('ส่ง', 'Send')}
                    </button>
                  </form>
                )}

                {/* Live Submission Status per Player */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {t('สถานะการส่งคำตอบ:', 'Submissions:')}{' '}
                      <strong className="text-white">
                        {activePlayerIds.filter((pid) => Boolean(room.submissions?.[pid])).length} / {activePlayerIds.length}
                      </strong>
                    </span>
                    {isHost && (
                      <button
                        onClick={() => hostGradeRound(false)}
                        className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        {t('ปิดรับและตรวจเลย', 'Grade Now')}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sortedPlayers.map((p) => {
                      const done = Boolean(room.submissions?.[p.id]);
                      return (
                        <span
                          key={p.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                            done
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {done ? '✓' : '…'} {p.name || p.id}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------
                MP PHASE: GRADING
               ------------------------------------------ */}
            {room.status === 'grading' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
                <h2 className="text-xl font-black">{t('AI กำลังตรวจความถูกต้องและความแรร์...', 'AI is grading answers...')}</h2>
                {isHost && (
                  <button
                    onClick={() => hostGradeRound(true)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('กดตรวจซ้ำถ้ารอนานเกิน 10 วิ', 'Retry if stuck')}
                  </button>
                )}
              </div>
            )}

            {/* ------------------------------------------
                MP PHASE 4: ROUND RESULTS
               ------------------------------------------ */}
            {room.status === 'results' && room.roundResults && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div>
                    <div className="text-xs font-bold text-indigo-400">
                      {t(`ผลลัพธ์ข้อที่ ${room.round} / ${room.totalRounds}`, `Round ${room.round} Results`)}
                    </div>
                    <h2 className="text-xl font-black mt-0.5">{room.question?.question}</h2>
                  </div>

                  <div className="space-y-3">
                    {sortedPlayers.map((p) => {
                      const res = room.roundResults[p.id];
                      if (!res) return null;
                      const badge =
                        res.status === 'valid'
                          ? { cls: 'bg-emerald-500/20 text-emerald-300', label: t(`✅ ถูกต้อง (+${res.points})`, `✅ Valid (+${res.points})`) }
                          : res.status === 'duplicate'
                          ? { cls: 'bg-amber-500/20 text-amber-300', label: t('👯 ใจตรงกัน! ซ้ำ (0)', '👯 Duplicate (0)') }
                          : res.status === 'banned'
                          ? { cls: 'bg-rose-500/20 text-rose-300', label: t('🚫 โดนคำต้องห้าม (0)', '🚫 Banned (0)') }
                          : { cls: 'bg-slate-800 text-slate-400', label: t('❌ ไม่ผ่าน (0)', '❌ Invalid (0)') };

                      return (
                        <div key={p.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm">{p.name || p.id}</span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                          </div>
                          <div className="text-base font-black text-white">{res.answer}</div>
                          {res.reason && <div className="text-xs text-slate-400">{res.reason}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {isHost ? (
                    <button
                      onClick={hostNextStepFromResults}
                      className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white flex items-center justify-center gap-2"
                    >
                      {room.round >= (room.totalRounds || 5)
                        ? t('ดูสรุปผู้ชนะ!', 'View Final Podium!')
                        : t('ไปข้อถัดไป', 'Next Round')}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-950 text-center text-xs text-slate-400">
                      {t('รอหัวห้องกดไปข้อถัดไป...', 'Waiting for host to continue...')}
                    </div>
                  )}
                </div>

                {/* Live Standings */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 h-fit">
                  <h3 className="font-black text-base flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    {t('ตารางคะแนนรวม', 'Standings')}
                  </h3>
                  <div className="space-y-2">
                    {sortedPlayers.map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 text-sm">
                        <span className="font-bold truncate">
                          #{idx + 1} {p.name || p.id}
                        </span>
                        <span className="font-black text-amber-400">{p.score || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------
                MP PHASE 5: FINAL PODIUM
               ------------------------------------------ */}
            {room.status === 'finished' && (
              <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
                <Trophy className="w-14 h-14 text-amber-400 mx-auto" />
                <div>
                  <h2 className="text-3xl font-black">{t('สรุปผู้ชนะ!', 'Final Results!')}</h2>
                  {sortedPlayers[0] && (
                    <p className="text-indigo-300 font-bold mt-2">
                      👑 {sortedPlayers[0].name || sortedPlayers[0].id} — {sortedPlayers[0].score || 0} {t('คะแนน', 'pts')}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5 text-left">
                  {sortedPlayers.map((p, idx) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border ${
                        idx === 0
                          ? 'bg-amber-500/15 border-amber-500/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-2">
                        <span className="text-lg">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <span>{p.name || p.id}</span>
                      </div>
                      <span className="font-black text-amber-400 text-lg">{p.score || 0}</span>
                    </div>
                  ))}
                </div>

                {isHost ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => hostStartRound(1, true)}
                      className="py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t('เล่นอีกรอบ', 'Play Again')}
                    </button>
                    <button
                      onClick={hostBackToLobby}
                      className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-200"
                    >
                      {t('กลับห้องรอ', 'Lobby')}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">{t('รอหัวห้องเริ่มเกมใหม่หรือกลับห้องรอ...', 'Waiting for host...')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* QR Code Share Modal */}
      {showQrModal && roomId && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-black text-lg">{t('สแกนเพื่อเข้าห้องทันที', 'Scan to Join Room')}</h3>
            <div className="bg-white p-3 rounded-2xl inline-block">
              <img src={qrImageUrl} alt="Room QR Code" className="w-52 h-52" />
            </div>
            <div className="font-mono font-black text-2xl tracking-widest text-indigo-300">{roomId}</div>
            <div className="text-[11px] text-slate-400 break-all bg-slate-950 p-2.5 rounded-xl">{inviteUrl}</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyInviteLink}
                className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? t('คัดลอกแล้ว', 'Copied') : t('คัดลอกลิงก์', 'Copy Link')}
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
              >
                {t('ปิด', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
