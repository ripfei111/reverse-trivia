import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Trophy, Flame, Heart, RefreshCw, Lightbulb, ShieldAlert,
  Users, User, Play, CheckCircle2, XCircle, Crown, Award, Share2,
  Copy, Check, Lock, Eye, EyeOff, Ban, Layers, History, LogOut,
  Plus, ArrowRight, AlertTriangle, Globe, Coins, Zap, Home, KeyRound, Sliders
} from 'lucide-react';
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection,
  query, orderBy, limit
} from 'firebase/firestore';
import { db } from './firebase';

const AVATARS = ['🦊', '🐉', '🦉', '🐙', '🦄', '🐼', '🦁', '🐸', '🐧', '🦖', '👻', '🤖'];

const RARITY_CONFIG = {
  Invalid: {
    labelTh: 'ผิดเงื่อนไข',
    color: 'text-rose-400',
    border: 'border-rose-500/60',
    bg: 'bg-rose-950/40',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    points: 0,
  },
  Common: {
    labelTh: 'โหลสุดๆ',
    color: 'text-slate-300',
    border: 'border-slate-500/60', 
    bg: 'bg-slate-900/70',
    badge: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
    points: 10,
  },
  Uncommon: {
    labelTh: 'คุ้นหู',
    color: 'text-emerald-400',
    border: 'border-emerald-500/60',
    bg: 'bg-emerald-950/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    points: 30,
  },
  Rare: {
    labelTh: 'เฉพาะทาง',
    color: 'text-sky-400',
    border: 'border-sky-500/70',
    bg: 'bg-sky-950/30',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    points: 55,
  },
  Epic: {
    labelTh: 'สายลึก',
    color: 'text-purple-400',
    border: 'border-purple-500/70',
    bg: 'bg-purple-950/30',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    points: 80,
  },
  Legendary: {
    labelTh: 'แรร์มาก',
    color: 'text-amber-400',
    border: 'border-amber-400/80',
    bg: 'bg-amber-950/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
    points: 100,
  },
  Mythic: {
    labelTh: 'ระดับตำนาน',
    color: 'text-fuchsia-300',
    border: 'border-fuchsia-400',
    bg: 'bg-gradient-to-br from-fuchsia-950/50 via-purple-950/40 to-amber-950/40',
    badge: 'bg-gradient-to-r from-fuchsia-500/30 to-amber-500/30 text-amber-200 border-fuchsia-400/60',
    points: 125,
  },
};

const RARITY_RANK = {
  Invalid: 0,
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Epic: 4,
  Legendary: 5,
  Mythic: 6,
};

const cleanFirestoreData = (obj) => JSON.parse(JSON.stringify(obj));

const parseJsonSafe = (raw) => {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
};

async function callGemini({ prompt, systemInstruction, responseMimeType = 'application/json' }) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemInstruction, responseMimeType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI request failed');
  return data.text;
}

function getStreakMultiplier(streak) {
  if (streak >= 7) return 2.0;
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function App() {
  // Language & UI
  const [lang, setLang] = useState('th');
  const [activeTab, setActiveTab] = useState('play'); // 'play' | 'vault' | 'leaderboard' | 'history'
  const [toast, setToast] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Account (Player ID + 4-digit PIN)
  const [currentUser, setCurrentUser] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'register'
  const [handleInput, setHandleInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('🦊');
  const [authError, setAuthError] = useState('');

  // Shared Archives
  const [hallOfFame, setHallOfFame] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);

  // Game Mode Selection
  const [gameMode, setGameMode] = useState('solo'); // 'solo' | 'party' | 'online'
  const [soloVariant, setSoloVariant] = useState('classic5'); // 'classic5' | 'classic10' | 'survival'
  const [poolDepth, setPoolDepth] = useState('Balanced'); // 'Wide' | 'Balanced' | 'Narrow'
  const [totalRounds, setTotalRounds] = useState(5);
  const [vetoMode, setVetoMode] = useState('simultaneous'); // 'simultaneous' | 'rotating'
  const [collisionPenalty, setCollisionPenalty] = useState('zero'); // 'zero' | 'half'

  // Party Players Setup
  const [partyRoster, setPartyRoster] = useState([
    { id: 'p1', name: 'Player 1', avatar: '🦊' },
    { id: 'p2', name: 'Player 2', avatar: '🐉' },
  ]);
  const [newPartyName, setNewPartyName] = useState('');

  // Online Room Setup
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const isHost = roomData && currentUser && roomData.hostId === currentUser.id;

  // Local / Party Game State
  const [phase, setPhase] = useState('LOBBY'); // 'LOBBY' | 'TOPIC_VETO' | 'ANSWERING' | 'JUDGING' | 'REVEAL' | 'SUMMARY'
  const [roundNum, setRoundNum] = useState(1);
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [usedTopics, setUsedTopics] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [hintText, setHintText] = useState('');
  const [hintUsedThisRound, setHintUsedThisRound] = useState(false);

  // Solo Player State
  const [soloScore, setSoloScore] = useState(0);
  const [soloStreak, setSoloStreak] = useState(0);
  const [soloHearts, setSoloHearts] = useState(3);
  const [soloLifelines, setSoloLifelines] = useState({ reroll: true, hint: true });
  const [soloAnswer, setSoloAnswer] = useState('');
  const [soloWager, setSoloWager] = useState(false);
  const [soloResult, setSoloResult] = useState(null);
  const [soloHistory, setSoloHistory] = useState([]);

  // Party State
  const [partyPlayersState, setPartyPlayersState] = useState([]);
  const [topicCandidates, setTopicCandidates] = useState([]);
  const [partyTurnIndex, setPartyTurnIndex] = useState(0);
  const [partyCurtainOpen, setPartyCurtainOpen] = useState(false);
  const [partyVetoVotes, setPartyVetoVotes] = useState({});
  const [partySubmissions, setPartySubmissions] = useState({});
  const [partyTempAnswer, setPartyTempAnswer] = useState('');
  const [partyTempWager, setPartyTempWager] = useState(false);
  const [roundResults, setRoundResults] = useState([]);
  const [revealedCount, setRevealedCount] = useState(0);

  // Online Local Input State
  const [onlineAnswer, setOnlineAnswer] = useState('');
  const [onlineWager, setOnlineWager] = useState(false);
  const [onlineSubmitted, setOnlineSubmitted] = useState(false);
  const [onlineVetoChoice, setOnlineVetoChoice] = useState(null);
  const hostProcessingRef = useRef(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Detect ?room=XXXX from URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    if (r) {
      setJoinCodeInput(r.toUpperCase().slice(0, 4));
      setGameMode('online');
      showToast(lang === 'th' ? `พบลิงก์ห้อง ${r.toUpperCase()} กรุณาเข้าสู่ระบบเพื่อจอย` : `Room ${r.toUpperCase()} detected! Sign in to join.`);
    }
  }, []);

  // Restore last signed-in user from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem('rt_player_id');
    if (savedId) {
      getDoc(doc(db, 'players', savedId)).then((snap) => {
        if (snap.exists()) setCurrentUser(snap.data());
      });
    }
  }, []);

  // Sync Players, Hall of Fame, Match History from Firestore
  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, 'players'), (snap) => {
      const list = snap.docs.map((d) => d.data());
      setAllPlayers(list);
      if (currentUser) {
        const updated = list.find((p) => p.id === currentUser.id);
        if (updated) setCurrentUser(updated);
      }
    });

    const unsubHof = onSnapshot(
      query(collection(db, 'hallOfFame'), orderBy('timestamp', 'desc'), limit(25)),
      (snap) => setHallOfFame(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubHist = onSnapshot(
      query(collection(db, 'matchHistory'), orderBy('timestamp', 'desc'), limit(20)),
      (snap) => setMatchHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubPlayers();
      unsubHof();
      unsubHist();
    };
  }, [currentUser?.id]);

  // Subscribe to Active Online Room
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onSnapshot(doc(db, 'rooms', roomCode), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoomData(data);
        setPhase(data.phase);
      }
    });
    return () => unsub();
  }, [roomCode]);

  // Reset local online inputs when round or phase changes
  useEffect(() => {
    if (!roomData) return;
    setOnlineSubmitted(Boolean(roomData.submissions?.[currentUser?.id]));
    setOnlineVetoChoice(roomData.vetoVotes?.[currentUser?.id] || null);
    if (roomData.phase === 'ANSWERING' && !roomData.submissions?.[currentUser?.id]) {
      setOnlineAnswer('');
      setOnlineWager(false);
    }
  }, [roomData?.roundNum, roomData?.phase, currentUser?.id]);

  // Host-Authoritative Triggers in Online Mode
  useEffect(() => {
    if (!isHost || !roomData || hostProcessingRef.current) return;
    const playerIds = Object.keys(roomData.players || {});
    if (playerIds.length < 2) return;

    // 1. Check if all veto votes are in
    if (roomData.phase === 'TOPIC_VETO') {
      const votes = roomData.vetoVotes || {};
      const requiredVoters =
        roomData.vetoMode === 'rotating'
          ? roomData.vetoVoterIds || playerIds.slice(0, 2)
          : playerIds;

      if (requiredVoters.length > 0 && requiredVoters.every((id) => votes[id] !== undefined)) {
        hostProcessingRef.current = true;
        resolveOnlineVeto(roomData).finally(() => {
          hostProcessingRef.current = false;
        });
      }
    }

    // 2. Check if all answers are submitted
    if (roomData.phase === 'ANSWERING') {
      const subs = roomData.submissions || {};
      if (playerIds.every((id) => subs[id])) {
        hostProcessingRef.current = true;
        judgeOnlineBatch(roomData).finally(() => {
          hostProcessingRef.current = false;
        });
      }
    }
  }, [isHost, roomData]);

  // --- AUTH HANDLERS ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const cleanHandle = handleInput.trim();
    const idKey = cleanHandle.toLowerCase().replace(/[^a-z0-9ก-๙_-]/g, '');
    if (!idKey || idKey.length < 2) {
      setAuthError(lang === 'th' ? 'กรุณาตั้งชื่อ ID อย่างน้อย 2 ตัวอักษร' : 'Player ID must be at least 2 characters.');
      return;
    }
    if (!/^\d{4}$/.test(pinInput)) {
      setAuthError(lang === 'th' ? 'รหัส PIN ต้องเป็นตัวเลข 4 หลัก' : 'PIN must be exactly 4 digits.');
      return;
    }

    setLoadingMsg(lang === 'th' ? 'กำลังเชื่อมต่อบัญชี...' : 'Syncing Player ID...');
    try {
      const ref = doc(db, 'players', idKey);
      const snap = await getDoc(ref);

      if (authMode === 'register') {
        if (snap.exists()) {
          setAuthError(lang === 'th' ? 'ชื่อ ID นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่นหรือกดเข้าสู่ระบบ' : 'Player ID already taken. Choose another or Sign In.');
          setLoadingMsg('');
          return;
        }
        const profile = {
          id: idKey,
          handle: cleanHandle,
          pin: pinInput,
          avatar: avatarInput,
          gamesPlayed: 0,
          wins: 0,
          bestScore: 0,
          totalPoints: 0,
          vault: [],
          createdAt: Date.now(),
        };
        await setDoc(ref, cleanFirestoreData(profile));
        setCurrentUser(profile);
        localStorage.setItem('rt_player_id', idKey);
        showToast(lang === 'th' ? `สร้าง ID "${cleanHandle}" สำเร็จ!` : `Created ID "${cleanHandle}"!`);
      } else {
        if (!snap.exists()) {
          setAuthError(lang === 'th' ? 'ไม่พบชื่อ ID นี้ กรุณากดสร้าง ID ใหม่' : 'Player ID not found. Switch to Create New ID.');
          setLoadingMsg('');
          return;
        }
        const data = snap.data();
        if (data.pin !== pinInput) {
          setAuthError(lang === 'th' ? 'รหัส PIN 4 หลักไม่ถูกต้อง' : 'Incorrect 4-digit PIN.');
          setLoadingMsg('');
          return;
        }
        setCurrentUser(data);
        localStorage.setItem('rt_player_id', idKey);
        showToast(lang === 'th' ? `ยินดีต้อนรับกลับ, ${data.handle}!` : `Welcome back, ${data.handle}!`);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rt_player_id');
    setPhase('LOBBY');
    setRoomCode('');
    setRoomData(null);
  };

  // --- PERSISTENCE HELPERS ---
  const savePullToVaultAndHof = async (playerId, playerHandle, playerAvatar, questionText, item) => {
    if (!item.isValid || RARITY_RANK[item.rarityTier] < RARITY_RANK.Rare) return;
    const entry = {
      playerId,
      handle: playerHandle,
      avatar: playerAvatar,
      question: questionText,
      answer: item.answer,
      rarityTier: item.rarityTier,
      mindshare: item.estimatedMindsharePercent,
      points: item.finalPoints,
      timestamp: Date.now(),
    };

    if (RARITY_RANK[item.rarityTier] >= RARITY_RANK.Legendary) {
      const hofId = `${playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(db, 'hallOfFame', hofId), cleanFirestoreData(entry));
    }

    const pRef = doc(db, 'players', playerId);
    const pSnap = await getDoc(pRef);
    if (pSnap.exists()) {
      const pData = pSnap.data();
      const updatedVault = [entry, ...(pData.vault || [])].slice(0, 40);
      await updateDoc(pRef, { vault: cleanFirestoreData(updatedVault) });
    }
  };

  const updatePlayerCareerStats = async (playerId, score, didWin) => {
    const pRef = doc(db, 'players', playerId);
    const snap = await getDoc(pRef);
    if (!snap.exists()) return;
    const d = snap.data();
    await updateDoc(pRef, {
      gamesPlayed: (d.gamesPlayed || 0) + 1,
      wins: (d.wins || 0) + (didWin ? 1 : 0),
      bestScore: Math.max(d.bestScore || 0, score),
      totalPoints: (d.totalPoints || 0) + score,
    });
  };

  // --- AI GENERATORS & REFEREES ---
  const generateTopicsAI = async (activeLang, excludeTopics) => {
    const sys =
      activeLang === 'th'
        ? 'คุณคือผู้สร้างหมวดหมู่เกมทายสวนกระแส (Reverse Trivia) สร้าง 3 หมวดหมู่ที่สนุก หลากหลาย ไม่ซ้ำกับรายการที่เคยใช้ ตอบเป็น JSON เท่านั้น'
        : 'You are a Reverse Trivia category designer. Generate 3 distinct, fun, open-ended trivia categories avoiding previously used topics. Output strict JSON only.';
    const prompt = `Previously used topics: ${JSON.stringify(excludeTopics)}.
Return JSON schema: { "topics": ["Topic 1", "Topic 2", "Topic 3"] }`;
    const raw = await callGemini({ prompt, systemInstruction: sys });
    const parsed = parseJsonSafe(raw);
    return parsed.topics.slice(0, 3);
  };

  const generateQuestionAI = async (activeLang, depth, prevQuestions, forcedTopic = null) => {
    const depthRule = {
      Wide: '1 basic condition with 100+ valid answers (rewards deep obscure digging).',
      Balanced: '1-2 conditions with 30-80 valid answers.',
      Narrow: '2-3 stacked conditions with 10-25 valid answers (never narrow to just 1-2 answers).',
    }[depth];

    const sys =
      activeLang === 'th'
        ? `คุณคือพิธีกรเกมโชว์ "ทายสวนกระแส (Reverse Trivia)" สร้างโจทย์ปลายเปิดเป็นภาษาไทยที่อิงบริบทวัฒนธรรมไทย/สากลที่คนไทยคุ้นเคย ระดับความกว้างโจทย์: ${depth} (${depthRule}) พร้อมแอบลิสต์คำตอบยอดฮิตที่คนไทยน่าจะนึกถึงมากที่สุด 3 อันดับแรกใน forbiddenTop3 ห้ามซ้ำโจทย์เดิม ตอบเป็น JSON เท่านั้น`
        : `You are a witty Reverse Trivia game show host. Generate an open-ended trivia prompt in English for a Global cultural baseline. Pool Depth: ${depth} (${depthRule}). Secretly list the 3 most obvious/popular answers in forbiddenTop3. Never repeat previous questions. Output strict JSON only.`;

    const prompt = `${forcedTopic ? `Required Topic: ${forcedTopic}\n` : ''}Previously asked questions: ${JSON.stringify(prevQuestions)}.
Return strict JSON:
{
  "category": "string",
  "question": "string",
  "forbiddenTop3": ["string", "string", "string"]
}`;
    const raw = await callGemini({ prompt, systemInstruction: sys });
    return parseJsonSafe(raw);
  };

  const generateHintAI = async (activeLang, questionObj) => {
    const sys =
      activeLang === 'th'
        ? 'ให้คำใบ้หมวดย่อยสั้นๆ 1 ประโยคเพื่อช่วยให้ผู้เล่นนึกถึงคำตอบระดับ Rare ได้ โดยไม่เฉลยคำตอบตรงๆ'
        : 'Give a concise 1-sentence sub-category hint to help the player think of a Rare-tier answer without giving away an exact answer.';
    const prompt = `Question: "${questionObj.question}". Return JSON: { "hint": "string" }`;
    const raw = await callGemini({ prompt, systemInstruction: sys });
    return parseJsonSafe(raw).hint;
  };

  const judgeSingleAI = async (activeLang, depth, questionObj, answer) => {
    const sys =
      activeLang === 'th'
        ? `คุณคือกรรมการตัดสินเกม "ทายสวนกระแส (Reverse Trivia)" ที่เข้มงวดและยุติธรรม ห้ามใจดีแจกคะแนนเฟ้อ คิดทีละขั้นก่อนตัดสิน:
1) ตรวจสอบข้อเท็จจริงและเงื่อนไขโจทย์ 100% ถ้าผิด แต่งเรื่อง หรือไม่ตรงเงื่อนไข ให้ isValid: false (0 คะแนน)
2) ห้ามเติมคำขยายเพื่อโกงความแรร์ เช่น โจทย์ถาม "ชื่อสัตว์" แล้วตอบ "แมวส้มสามขาหน้าปากซอย" ให้ประเมินเป็นแค่ "แมว" (Common)
3) ประเมิน Mindshare ตามจริงจากมุมมองคนไทย 100 คน เทียบกับขนาด Pool (${depth}) แล้วจัดระดับ:
   - Invalid (ผิดเงื่อนไข): 0
   - Common (>40%): 10
   - Uncommon (20-40%): 30
   - Rare (8-19%): 55
   - Epic (2-7%): 80
   - Legendary (0.5-1.9%): 100
   - Mythic (<0.5%): 125
4) ตรวจว่าตรงกับ forbiddenTop3 (${JSON.stringify(questionObj.forbiddenTop3)}) หรือความหมายเดียวกันหรือไม่ ตอบเป็น JSON เท่านั้น`
        : `You are a strict, anti-sycophancy Reverse Trivia referee. Never inflate scores. Perform step-by-step reasoning:
1) Fact-check strictly against all prompt constraints. If wrong, fabricated, or rule-breaking, set isValid: false (0 pts).
2) Reject artificial qualifiers on mundane answers (e.g., "the three-legged orange cat down the street" must be graded as "cat" -> Common).
3) Estimate realistic mindshare out of 100 average people in a Global baseline relative to Pool Depth (${depth}), mapping strictly to:
   - Invalid: 0 | Common (>40%): 10 | Uncommon (20-40%): 30 | Rare (8-19%): 55 | Epic (2-7%): 80 | Legendary (0.5-1.9%): 100 | Mythic (<0.5%): 125
4) Check if the answer matches forbiddenTop3 (${JSON.stringify(questionObj.forbiddenTop3)}) conceptually. Output strict JSON only.`;

    const prompt = `Question: "${questionObj.question}"
Forbidden Top 3: ${JSON.stringify(questionObj.forbiddenTop3)}
Player Answer: "${answer}"
Return strict JSON:
{
  "isValid": boolean,
  "hitForbiddenTop3": boolean,
  "estimatedMindsharePercent": number,
  "rarityTier": "Invalid" | "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic",
  "hostComment": "string (witty 1-sentence host reaction)",
  "reason": "string (concise explanation of accuracy & rarity)",
  "funFact": "string (1-2 sentence trivia fact)",
  "mythicExample": "string (one valid Mythic-tier example)"
}`;
    const raw = await callGemini({ prompt, systemInstruction: sys });
    return parseJsonSafe(raw);
  };

  const judgeBatchAI = async (activeLang, depth, questionObj, submissionsList) => {
    const sys =
      activeLang === 'th'
        ? `คุณคือกรรมการเกม "ทายสวนกระแส" ประเมินคำตอบของผู้เล่นทุกคนพร้อมกันอย่างเข้มงวดและยุติธรรม (ห้ามแจกคะแนนเฟ้อ)
กฎสำคัญ:
1) ตรวจความถูกต้อง 100% ตามเงื่อนไขโจทย์ (Pool Depth: ${depth}) ถ้าผิดให้ isValid: false
2) ป้องกันการเติมคำขยายโกงความแรร์ (เช่น "แมวส้มหน้าปากซอย" นับเป็น "แมว")
3) สร้างฟิลด์ canonicalConcept (ชื่อแนวคิดมาตรฐานภาษาอังกฤษตัวพิมพ์เล็ก เช่น "octopus", "bhutan") สำหรับคำตอบที่ถูกต้องทุกข้อ เพื่อตรวจจับการตอบซ้ำเชิงความหมาย (Semantic Collision) แม้ผู้เล่นจะพิมพ์คนละภาษาหรือสะกดต่างกัน
4) จัดระดับ Rarity ตาม Mindshare ของคนไทย 100 คน: Invalid, Common (>40%), Uncommon (20-40%), Rare (8-19%), Epic (2-7%), Legendary (0.5-1.9%), Mythic (<0.5%) ตอบเป็น JSON เท่านั้น`
        : `You are a strict Reverse Trivia batch referee. Evaluate all players' submissions simultaneously and consistently without score inflation.
Rules:
1) Fact-check strictly against all prompt constraints (Pool Depth: ${depth}). Invalid answers get isValid: false.
2) Reject artificial qualifiers added to common answers.
3) Assign a normalized lowercase English "canonicalConcept" (e.g., "octopus", "bhutan") to every valid answer so conceptual duplicates across synonyms/languages are caught.
4) Assign Rarity Tier based on realistic Global mindshare out of 100 people: Invalid, Common (>40%), Uncommon (20-40%), Rare (8-19%), Epic (2-7%), Legendary (0.5-1.9%), Mythic (<0.5%). Output strict JSON only.`;

    const prompt = `Question: "${questionObj.question}"
Forbidden Top 3: ${JSON.stringify(questionObj.forbiddenTop3)}
Submissions: ${JSON.stringify(submissionsList)}
Return strict JSON:
{
  "results": [
    {
      "playerId": "string",
      "isValid": boolean,
      "canonicalConcept": "string",
      "hitForbiddenTop3": boolean,
      "estimatedMindsharePercent": number,
      "rarityTier": "Invalid" | "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic",
      "hostComment": "string",
      "reason": "string"
    }
  ],
  "funFact": "string",
  "mythicExample": "string"
}`;
    const raw = await callGemini({ prompt, systemInstruction: sys });
    return parseJsonSafe(raw);
  };

  // --- SOLO GAME FLOW ---
  const startSoloGame = async () => {
    setErrorMsg('');
    const rounds = soloVariant === 'classic5' ? 5 : soloVariant === 'classic10' ? 10 : 99;
    setTotalRounds(rounds);
    setRoundNum(1);
    setSoloScore(0);
    setSoloStreak(0);
    setSoloHearts(3);
    setSoloLifelines({ reroll: true, hint: true });
    setSoloHistory([]);
    setAskedQuestions([]);
    setSoloResult(null);
    setSoloAnswer('');
    setSoloWager(false);
    setHintText('');
    setHintUsedThisRound(false);

    setLoadingMsg(lang === 'th' ? 'พิธีกรกำลังสุ่มโจทย์แรก...' : 'Host is generating your first prompt...');
    try {
      const q = await generateQuestionAI(lang, poolDepth, []);
      setCurrentQuestion(q);
      setAskedQuestions([q.question]);
      setPhase('ANSWERING');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  const handleSoloReroll = async () => {
    if (!soloLifelines.reroll || loadingMsg) return;
    setLoadingMsg(lang === 'th' ? 'กำลังเปลี่ยนโจทย์ใหม่...' : 'Rerolling question...');
    try {
      const q = await generateQuestionAI(lang, poolDepth, askedQuestions);
      setCurrentQuestion(q);
      setAskedQuestions((prev) => [...prev, q.question]);
      setSoloLifelines((prev) => ({ ...prev, reroll: false }));
      setHintText('');
      setHintUsedThisRound(false);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  const handleSoloHint = async () => {
    if (!soloLifelines.hint || loadingMsg || hintUsedThisRound) return;
    setLoadingMsg(lang === 'th' ? 'กำลังขอคำใบ้หมวดย่อย...' : 'Fetching sub-category hint...');
    try {
      const h = await generateHintAI(lang, currentQuestion);
      setHintText(h);
      setHintUsedThisRound(true);
      setSoloLifelines((prev) => ({ ...prev, hint: false }));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  const handleSoloSubmit = async (e) => {
    e.preventDefault();
    if (!soloAnswer.trim() || loadingMsg) return;
    setLoadingMsg(lang === 'th' ? 'กรรมการกำลังเช็กความแรร์...' : 'Referee is evaluating rarity...');
    setErrorMsg('');

    try {
      const res = await judgeSingleAI(lang, poolDepth, currentQuestion, soloAnswer.trim());
      const tier = res.isValid ? res.rarityTier : 'Invalid';
      let base = RARITY_CONFIG[tier]?.points ?? 0;

      // Streak calculation
      const qualifiesStreak =
        res.isValid && !res.hitForbiddenTop3 && RARITY_RANK[tier] >= RARITY_RANK.Rare;
      const newStreak = qualifiesStreak ? soloStreak + 1 : 0;
      const mult = getStreakMultiplier(newStreak);

      let pts = Math.round(base * mult);
      if (hintUsedThisRound) pts = Math.round(pts * 0.8);
      if (res.hitForbiddenTop3 && res.isValid) pts = Math.floor(pts * 0.5);

      if (soloWager) {
        if (res.isValid && !res.hitForbiddenTop3 && RARITY_RANK[tier] >= RARITY_RANK.Epic) {
          pts = pts * 2;
        } else {
          pts = 0;
        }
      }

      let nextHearts = soloHearts;
      if (soloVariant === 'survival') {
        if (!res.isValid || tier === 'Common' || res.hitForbiddenTop3) {
          nextHearts = Math.max(0, soloHearts - 1);
        }
      }

      const fullResult = {
        ...res,
        rarityTier: tier,
        answer: soloAnswer.trim(),
        question: currentQuestion.question,
        forbiddenTop3: currentQuestion.forbiddenTop3,
        basePoints: base,
        multiplier: mult,
        wagered: soloWager,
        finalPoints: pts,
      };

      setSoloScore((s) => s + pts);
      setSoloStreak(newStreak);
      setSoloHearts(nextHearts);
      setSoloResult(fullResult);
      setSoloHistory((prev) => [...prev, fullResult]);
      setPhase('REVEAL');

      if (currentUser) {
        await savePullToVaultAndHof(
          currentUser.id,
          currentUser.handle,
          currentUser.avatar,
          currentQuestion.question,
          fullResult
        );
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  const handleSoloNext = async () => {
    const isSurvivalOver = soloVariant === 'survival' && soloHearts <= 0;
    const isClassicOver = soloVariant !== 'survival' && roundNum >= totalRounds;

    if (isSurvivalOver || isClassicOver) {
      setPhase('SUMMARY');
      if (currentUser) {
        await updatePlayerCareerStats(currentUser.id, soloScore, true);
      }
      return;
    }

    setLoadingMsg(lang === 'th' ? 'กำลังสร้างโจทย์ข้อถัดไป...' : 'Generating next prompt...');
    try {
      const q = await generateQuestionAI(lang, poolDepth, askedQuestions);
      setCurrentQuestion(q);
      setAskedQuestions((prev) => [...prev, q.question]);
      setRoundNum((r) => r + 1);
      setSoloAnswer('');
      setSoloWager(false);
      setSoloResult(null);
      setHintText('');
      setHintUsedThisRound(false);
      setPhase('ANSWERING');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  // --- PARTY PASS & PLAY FLOW ---
  const addPartyPlayer = () => {
    if (!newPartyName.trim() || partyRoster.length >= 6) return;
    const nextAvatar = AVATARS[partyRoster.length % AVATARS.length];
    setPartyRoster((prev) => [
      ...prev,
      { id: `p${Date.now()}`, name: newPartyName.trim(), avatar: nextAvatar },
    ]);
    setNewPartyName('');
  };

  const startPartyGame = async () => {
    if (partyRoster.length < 2) return;
    const initialPlayers = partyRoster.map((p) => ({ ...p, score: 0, streak: 0 }));
    setPartyPlayersState(initialPlayers);
    setRoundNum(1);
    setAskedQuestions([]);
    setUsedTopics([]);
    await beginPartyRound(1, initialPlayers, []);
  };

  const beginPartyRound = async (rNum, playersList, prevTopics) => {
    setLoadingMsg(lang === 'th' ? 'กำลังสุ่ม 3 หัวข้อให้แบน...' : 'Generating 3 topics for Veto...');
    setErrorMsg('');
    try {
      const topics = await generateTopicsAI(lang, prevTopics);
      setTopicCandidates(topics);
      setUsedTopics((prev) => [...prev, ...topics]);
      setPartyVetoVotes({});
      setPartySubmissions({});
      setPartyTurnIndex(0);
      setPartyCurtainOpen(false);
      setPhase('TOPIC_VETO');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  const getPartyVetoVoters = (playersList) => {
    if (vetoMode === 'rotating') {
      if (playersList.length === 2) return playersList;
      const sorted = [...playersList].sort((a, b) => a.score - b.score);
      return sorted.slice(0, 2);
    }
    return playersList;
  };

  const handlePartyVetoPick = async (topicIdx) => {
    const voters = getPartyVetoVoters(partyPlayersState);
    const activeVoter = voters[partyTurnIndex];
    const nextVotes = { ...partyVetoVotes, [activeVoter.id]: topicIdx };
    setPartyVetoVotes(nextVotes);
    setPartyCurtainOpen(false);

    if (partyTurnIndex + 1 < voters.length) {
      setPartyTurnIndex(partyTurnIndex + 1);
      return;
    }

    // Tally bans
    const counts = [0, 0, 0];
    Object.values(nextVotes).forEach((idx) => {
      if (counts[idx] !== undefined) counts[idx] += 1;
    });
    const minVotes = Math.min(...counts);
    const survivingIndices = counts
      .map((c, idx) => (c === minVotes ? idx : -1))
      .filter((idx) => idx !== -1);
    const chosenIdx = survivingIndices[Math.floor(Math.random() * survivingIndices.length)];
    const chosenTopic = topicCandidates[chosenIdx];

    setLoadingMsg(
      lang === 'th'
        ? `หัวข้อ "${chosenTopic}" ชนะโหวต! กำลังสร้างโจทย์...`
        : `Topic "${chosenTopic}" survived! Crafting prompt...`
    );
    try {
      const q = await generateQuestionAI(lang, poolDepth, askedQuestions, chosenTopic);
      setCurrentQuestion(q);
      setAskedQuestions((prev) => [...prev, q.question]);
      setPartyTurnIndex(0);
      setPartyCurtainOpen(false);
      setPartyTempAnswer('');
      setPartyTempWager(false);
      setPhase('ANSWERING');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  const handlePartyAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!partyTempAnswer.trim()) return;
    const activePlayer = partyPlayersState[partyTurnIndex];
    const nextSubs = {
      ...partySubmissions,
      [activePlayer.id]: {
        playerId: activePlayer.id,
        name: activePlayer.name,
        answer: partyTempAnswer.trim(),
        wager: partyTempWager,
      },
    };
    setPartySubmissions(nextSubs);
    setPartyTempAnswer('');
    setPartyTempWager(false);
    setPartyCurtainOpen(false);

    if (partyTurnIndex + 1 < partyPlayersState.length) {
      setPartyTurnIndex(partyTurnIndex + 1);
      return;
    }

    // All players answered -> Batch Judge
    setPhase('JUDGING');
    setLoadingMsg(lang === 'th' ? 'AI กำลังตรวจคำตอบทุกคนพร้อมกัน...' : 'AI Referee judging all answers simultaneously...');
    try {
      const subList = Object.values(nextSubs).map((s) => ({
        playerId: s.playerId,
        name: s.name,
        answer: s.answer,
      }));
      const batch = await judgeBatchAI(lang, poolDepth, currentQuestion, subList);
      const processed = computeMultiplayerScores(partyPlayersState, nextSubs, batch, collisionPenalty);

      const updatedPlayers = partyPlayersState.map((p) => {
        const r = processed.find((item) => item.playerId === p.id);
        return {
          ...p,
          score: p.score + (r?.finalPoints || 0),
          streak: r?.newStreak || 0,
        };
      });

      setPartyPlayersState(updatedPlayers);
      setRoundResults(processed.map((r) => ({ ...r, funFact: batch.funFact, mythicExample: batch.mythicExample })));
      setRevealedCount(1);
      setPhase('REVEAL');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  // --- ONLINE ROOM SYNC FLOW ---
  const createOnlineRoom = async () => {
    if (!currentUser) return;
    const code = generateRoomCode();
    const initialRoom = {
      code,
      hostId: currentUser.id,
      lang,
      poolDepth,
      totalRounds,
      vetoMode,
      collisionPenalty,
      phase: 'LOBBY',
      roundNum: 1,
      players: {
        [currentUser.id]: {
          id: currentUser.id,
          handle: currentUser.handle,
          avatar: currentUser.avatar,
          score: 0,
          streak: 0,
        },
      },
      usedTopics: [],
      askedQuestions: [],
      topicCandidates: [],
      vetoVotes: {},
      vetoVoterIds: [],
      currentQuestion: null,
      submissions: {},
      roundResults: [],
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'rooms', code), cleanFirestoreData(initialRoom));
    setRoomCode(code);
  };

  const joinOnlineRoom = async () => {
    if (!currentUser || joinCodeInput.trim().length !== 4) return;
    const code = joinCodeInput.trim().toUpperCase();
    const ref = doc(db, 'rooms', code);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      setErrorMsg(lang === 'th' ? `ไม่พบห้องรหัส ${code}` : `Room ${code} not found.`);
      return;
    }
    const data = snap.data();
    if (Object.keys(data.players || {}).length >= 6 && !data.players[currentUser.id]) {
      setErrorMsg(lang === 'th' ? 'ห้องเต็มแล้ว (สูงสุด 6 คน)' : 'Room is full (max 6 players).');
      return;
    }
    await updateDoc(ref, {
      [`players.${currentUser.id}`]: {
        id: currentUser.id,
        handle: currentUser.handle,
        avatar: currentUser.avatar,
        score: data.players?.[currentUser.id]?.score || 0,
        streak: data.players?.[currentUser.id]?.streak || 0,
      },
    });
    setRoomCode(code);
    setErrorMsg('');
  };

  const startOnlineMatch = async () => {
    if (!isHost || !roomData) return;
    const pList = Object.values(roomData.players || {});
    if (pList.length < 2) return;
    setLoadingMsg(lang === 'th' ? 'กำลังสุ่มหัวข้อรอบที่ 1...' : 'Generating Round 1 topics...');
    try {
      const topics = await generateTopicsAI(roomData.lang, []);
      const voters =
        roomData.vetoMode === 'rotating'
          ? [...pList].sort((a, b) => a.score - b.score).slice(0, 2).map((p) => p.id)
          : pList.map((p) => p.id);

      await updateDoc(doc(db, 'rooms', roomCode), {
        phase: 'TOPIC_VETO',
        roundNum: 1,
        topicCandidates: topics,
        usedTopics: topics,
        vetoVotes: {},
        vetoVoterIds: voters,
        submissions: {},
        roundResults: [],
      });
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  const submitOnlineVeto = async (idx) => {
    if (!roomData || !currentUser || onlineVetoChoice !== null) return;
    setOnlineVetoChoice(idx);
    await updateDoc(doc(db, 'rooms', roomCode), {
      [`vetoVotes.${currentUser.id}`]: idx,
    });
  };

  const resolveOnlineVeto = async (latestRoom) => {
    const counts = [0, 0, 0];
    Object.values(latestRoom.vetoVotes || {}).forEach((idx) => {
      if (counts[idx] !== undefined) counts[idx] += 1;
    });
    const minVotes = Math.min(...counts);
    const surviving = counts.map((c, idx) => (c === minVotes ? idx : -1)).filter((i) => i !== -1);
    const chosenTopic = latestRoom.topicCandidates[surviving[Math.floor(Math.random() * surviving.length)]];

    const q = await generateQuestionAI(
      latestRoom.lang,
      latestRoom.poolDepth,
      latestRoom.askedQuestions || [],
      chosenTopic
    );
    await updateDoc(doc(db, 'rooms', latestRoom.code), {
      phase: 'ANSWERING',
      currentQuestion: q,
      askedQuestions: [...(latestRoom.askedQuestions || []), q.question],
      submissions: {},
    });
  };

  const submitOnlineAnswer = async (e) => {
    e.preventDefault();
    if (!onlineAnswer.trim() || onlineSubmitted || !currentUser) return;
    setOnlineSubmitted(true);
    await updateDoc(doc(db, 'rooms', roomCode), {
      [`submissions.${currentUser.id}`]: {
        playerId: currentUser.id,
        name: currentUser.handle,
        answer: onlineAnswer.trim(),
        wager: onlineWager,
      },
    });
  };

  const judgeOnlineBatch = async (latestRoom) => {
    await updateDoc(doc(db, 'rooms', latestRoom.code), { phase: 'JUDGING' });
    const pList = Object.values(latestRoom.players || {});
    const subs = latestRoom.submissions || {};
    const subList = Object.values(subs).map((s) => ({
      playerId: s.playerId,
      name: s.name,
      answer: s.answer,
    }));

    const batch = await judgeBatchAI(latestRoom.lang, latestRoom.poolDepth, latestRoom.currentQuestion, subList);
    const processed = computeMultiplayerScores(pList, subs, batch, latestRoom.collisionPenalty);

    const updatedPlayersMap = { ...latestRoom.players };
    for (const r of processed) {
      if (updatedPlayersMap[r.playerId]) {
        updatedPlayersMap[r.playerId] = {
          ...updatedPlayersMap[r.playerId],
          score: (updatedPlayersMap[r.playerId].score || 0) + r.finalPoints,
          streak: r.newStreak,
        };
      }
      const pObj = latestRoom.players[r.playerId];
      if (pObj) {
        await savePullToVaultAndHof(
          r.playerId,
          pObj.handle,
          pObj.avatar,
          latestRoom.currentQuestion.question,
          r
        );
      }
    }

    await updateDoc(doc(db, 'rooms', latestRoom.code), {
      phase: 'REVEAL',
      players: cleanFirestoreData(updatedPlayersMap),
      roundResults: cleanFirestoreData(
        processed.map((r) => ({ ...r, funFact: batch.funFact, mythicExample: batch.mythicExample }))
      ),
    });
  };

  const advanceOnlineRound = async () => {
    if (!isHost || !roomData) return;
    const pList = Object.values(roomData.players || {});

    if (roomData.roundNum >= roomData.totalRounds) {
      const sorted = [...pList].sort((a, b) => b.score - a.score);
      const topScore = sorted[0]?.score || 0;
      for (const p of sorted) {
        await updatePlayerCareerStats(p.id, p.score, p.score === topScore && topScore > 0);
      }
      await setDoc(doc(db, 'matchHistory', `${roomCode}_${Date.now()}`), cleanFirestoreData({
        roomCode,
        mode: 'Online',
        players: sorted.map((p) => ({ handle: p.handle, avatar: p.avatar, score: p.score })),
        timestamp: Date.now(),
      }));
      await updateDoc(doc(db, 'rooms', roomCode), { phase: 'SUMMARY' });
      return;
    }

    setLoadingMsg(lang === 'th' ? 'กำลังสุ่มหัวข้อรอบถัดไป...' : 'Generating next round topics...');
    try {
      const topics = await generateTopicsAI(roomData.lang, roomData.usedTopics || []);
      const voters =
        roomData.vetoMode === 'rotating'
          ? [...pList].sort((a, b) => a.score - b.score).slice(0, 2).map((p) => p.id)
          : pList.map((p) => p.id);

      await updateDoc(doc(db, 'rooms', roomCode), {
        phase: 'TOPIC_VETO',
        roundNum: roomData.roundNum + 1,
        topicCandidates: topics,
        usedTopics: [...(roomData.usedTopics || []), ...topics],
        vetoVotes: {},
        vetoVoterIds: voters,
        submissions: {},
        roundResults: [],
      });
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  // --- SHARED MULTIPLAYER SCORING & SEMANTIC COLLISION ---
  function computeMultiplayerScores(playersList, subsMap, batchResponse, penaltyMode) {
    const rawResults = batchResponse.results || [];
    const conceptCounts = {};
    rawResults.forEach((r) => {
      if (r.isValid && r.canonicalConcept) {
        const key = r.canonicalConcept.trim().toLowerCase();
        conceptCounts[key] = (conceptCounts[key] || 0) + 1;
      }
    });

    return playersList.map((p) => {
      const sub = subsMap[p.id] || { answer: '', wager: false };
      const res = rawResults.find((item) => item.playerId === p.id) || {
        isValid: false,
        rarityTier: 'Invalid',
        estimatedMindsharePercent: 100,
        hitForbiddenTop3: false,
        hostComment: 'No valid evaluation.',
        reason: 'Could not evaluate.',
      };

      const tier = res.isValid ? res.rarityTier : 'Invalid';
      const conceptKey = (res.canonicalConcept || '').trim().toLowerCase();
      const isCollision = res.isValid && conceptKey && (conceptCounts[conceptKey] || 0) > 1;

      const qualifiesStreak =
        res.isValid && !res.hitForbiddenTop3 && !isCollision && RARITY_RANK[tier] >= RARITY_RANK.Rare;
      const newStreak = qualifiesStreak ? (p.streak || 0) + 1 : 0;
      const mult = getStreakMultiplier(newStreak);

      let pts = Math.round((RARITY_CONFIG[tier]?.points ?? 0) * mult);
      if (res.hitForbiddenTop3 && res.isValid) pts = Math.floor(pts * 0.5);

      if (isCollision) {
        pts = penaltyMode === 'zero' ? 0 : Math.floor(pts * 0.5);
      }

      if (sub.wager) {
        if (res.isValid && !res.hitForbiddenTop3 && !isCollision && RARITY_RANK[tier] >= RARITY_RANK.Epic) {
          pts = pts * 2;
        } else {
          pts = 0;
        }
      }

      return {
        ...res,
        playerId: p.id,
        playerName: p.handle || p.name,
        playerAvatar: p.avatar,
        answer: sub.answer,
        wagered: sub.wager,
        rarityTier: tier,
        isCollision,
        multiplier: mult,
        newStreak,
        finalPoints: pts,
      };
    });
  }

  // --- SHARE HELPERS ---
  const shareInvite = async () => {
    const baseUrl = window.location.origin;
    const link = roomCode ? `${baseUrl}/?room=${roomCode}` : baseUrl;
    const text = roomCode
      ? lang === 'th'
        ? `มาแข่งเกม "ทายสวนกระแส (Reverse Trivia)" กัน!\nลิงก์: ${link}\nรหัสห้อง (Room Code): ${roomCode}`
        : `Join my Reverse Trivia room!\nLink: ${link}\nRoom Code: ${roomCode}`
      : lang === 'th'
      ? `ลองเล่นเกม "ทายสวนกระแส (Reverse Trivia)" ตอบให้ถูกแต่ห้ามซ้ำคนอื่น!\n${link}`
      : `Play Reverse Trivia — be right, be obscure!\n${link}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Reverse Trivia', text, url: link });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    showToast(lang === 'th' ? 'คัดลอกลิงก์ชวนเพื่อนแล้ว!' : 'Invite link copied to clipboard!');
  };

  // --- RENDER: SIGN-IN / REGISTER GATE ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium">
            {toast}
          </div>
        )}
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-fuchsia-400"/>
              <h1 className="text-xl font-bold tracking-tight">
                {lang === 'th' ? 'ทายสวนกระแส' : 'Reverse Trivia'}
              </h1>
            </div>
            <button
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400"/>
              {lang === 'th' ? 'ภาษาไทย' : 'English'}
            </button>
          </div>

          <p className="text-sm text-slate-400">
            {lang === 'th'
              ? 'สร้าง Player ID + รหัส PIN 4 หลัก เพื่อบันทึกสถิติและคลังการ์ด Mythic ของคุณไว้บนคลาวด์ถาวร'
              : 'Create a Player ID + 4-digit PIN to permanently save your career stats and Mythic Card Vault.'}
          </p>

          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setAuthError(''); }}
              className={`py-2 text-sm font-semibold rounded-lg transition ${
                authMode === 'signin' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'th' ? 'เข้าสู่ระบบ (Sign In)' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`py-2 text-sm font-semibold rounded-lg transition ${
                authMode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'th' ? 'สร้าง ID ใหม่' : 'Create New ID'}
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {lang === 'th' ? 'เลือกอวาตาร์' : 'Choose Avatar'}
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map((av) => (
                    <button
                      type="button"
                      key={av}
                      onClick={() => setAvatarInput(av)}
                      className={`text-xl py-2 rounded-xl border transition ${
                        avatarInput === av
                          ? 'bg-indigo-600/30 border-indigo-400 scale-105'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {lang === 'th' ? 'ชื่อ Player ID' : 'Player ID / Handle'}
              </label>
              <input
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder={lang === 'th' ? 'เช่น Boss, Mindy' : 'e.g. Boss, Mindy'}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {lang === 'th' ? 'รหัส PIN 4 หลัก (สำหรับเข้าจากเครื่องอื่น)' : '4-Digit Game PIN'}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3"/>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm tracking-widest focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {authError && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/40 rounded-lg p-2.5">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={Boolean(loadingMsg)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loadingMsg ? loadingMsg : authMode === 'register' ? (lang === 'th' ? 'สร้างบัญชีและเริ่มเล่น' : 'Create ID & Play') : (lang === 'th' ? 'เข้าสู่ระบบ' : 'Enter Game')}
              <ArrowRight className="w-4 h-4"/>
            </button>
          </form>

          {allPlayers.length > 0 && authMode === 'signin' && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-400 mb-2">
                {lang === 'th' ? 'แตะชื่อเพื่อเลือก ID:' : 'Quick-select existing ID:'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allPlayers.slice(0, 10).map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setHandleInput(p.handle)}
                    className="text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1"
                  >
                    <span>{p.avatar}</span>
                    <span>{p.handle}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN APP SHELL ---
  const activeMultiplayerResults = gameMode === 'online' ? roomData?.roundResults || [] : roundResults;
  const activeMultiplayerPlayers =
    gameMode === 'online' ? Object.values(roomData?.players || {}) : partyPlayersState;
  const activeQuestionObj = gameMode === 'online' ? roomData?.currentQuestion : currentQuestion;
  const activeRoundNum = gameMode === 'online' ? roomData?.roundNum || 1 : roundNum;
  const activeTotalRounds = gameMode === 'online' ? roomData?.totalRounds || totalRounds : totalRounds;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4"/>
          {toast}
        </div>
      )}

      {/* TOP BAR */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setPhase('LOBBY');
                setRoomCode('');
                setRoomData(null);
                setActiveTab('play');
              }}
              className="flex items-center gap-2 font-bold text-base sm:text-lg hover:text-fuchsia-300 transition"
            >
              <Sparkles className="w-5 h-5 text-fuchsia-400"/>
              <span>{lang === 'th' ? 'ทายสวนกระแส' : 'Reverse Trivia'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={shareInvite}
              className="flex items-center gap-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-2.5 py-1.5 rounded-lg transition"
            >
              <Share2 className="w-3.5 h-3.5"/>
              <span className="hidden sm:inline">{lang === 'th' ? 'แชร์เกม' : 'Share'}</span>
            </button>

            <button
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400"/>
              <span>{lang === 'th' ? 'TH' : 'EN'}</span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg text-xs">
              <span>{currentUser.avatar}</span>
              <span className="font-semibold max-w-[80px] truncate">{currentUser.handle}</span>
              <button
                onClick={handleLogout}
                title="Switch ID"
                className="text-slate-400 hover:text-rose-400 ml-1"
              >
                <LogOut className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {errorMsg && (
          <div className="bg-rose-950/50 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0"/>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-xs underline ml-3">
              Dismiss
            </button>
          </div>
        )}

        {/* LOBBY & NAVIGATION TABS */}
        {phase === 'LOBBY' && !roomCode && (
          <>
            <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
              {[
                { id: 'play', icon: Play, labelTh: 'เล่นเกม', labelEn: 'Play' },
                { id: 'vault', icon: Sparkles, labelTh: 'คลังการ์ด', labelEn: 'Vault' },
                { id: 'leaderboard', icon: Trophy, labelTh: 'อันดับ', labelEn: 'Ranks' },
                { id: 'history', icon: History, labelTh: 'ประวัติ', labelEn: 'History' },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                      activeTab === t.id
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4"/>
                    <span>{lang === 'th' ? t.labelTh : t.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: PLAY SETUP */}
            {activeTab === 'play' && (
              <div className="space-y-5">
                {/* Career Mini Banner */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      {currentUser.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-base">{currentUser.handle}</div>
                      <div className="text-xs text-slate-400">
                        {lang === 'th' ? 'การ์ดแรร์สะสม:' : 'Vault Cards:'}{' '}
                        <span className="text-amber-400 font-semibold">{currentUser.vault?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <div className="text-xs text-slate-400">{lang === 'th' ? 'เล่นแล้ว' : 'Played'}</div>
                      <div className="font-bold text-sm">{currentUser.gamesPlayed || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{lang === 'th' ? 'ชนะ' : 'Wins'}</div>
                      <div className="font-bold text-sm text-emerald-400">{currentUser.wins || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{lang === 'th' ? 'สูงสุด' : 'Best'}</div>
                      <div className="font-bold text-sm text-amber-400">{currentUser.bestScore || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'solo',
                      icon: User,
                      titleTh: 'เล่นคนเดียว (Solo)',
                      titleEn: 'Solo Run',
                      descTh: 'ไต่แรงก์ Classic หรือเอาชีวิตรอด 3 หัวใจ',
                      descEn: 'Classic 5/10 or 3-Heart Survival',
                    },
                    {
                      id: 'party',
                      icon: Users,
                      titleTh: 'ปาร์ตี้จอเดียว (Pass & Play)',
                      titleEn: 'Party Pass & Play',
                      descTh: 'เล่น 2–6 คนบนเครื่องเดียว พร้อมม่านบังคำตอบ',
                      descEn: '2–6 players on 1 screen with Privacy Curtain',
                    },
                    {
                      id: 'online',
                      icon: Globe,
                      titleTh: 'ออนไลน์ข้ามเครื่อง',
                      titleEn: 'Online Room Sync',
                      descTh: 'สร้างห้อง 4 หลัก ชวนเพื่อนเล่นพร้อมกัน',
                      descEn: '4-char Room Code synced live across devices',
                    },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setGameMode(m.id)}
                        className={`text-left p-4 rounded-2xl border transition ${
                          gameMode === m.id
                            ? 'bg-indigo-950/50 border-indigo-500 shadow-lg'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                      <Icon className={`w-5 h-5 mb-2 ${gameMode === m.id ? 'text-indigo-400' : 'text-slate-400'}`} />
                        <div className="font-bold text-sm">{lang === 'th' ? m.titleTh : m.titleEn}</div>
                        <div className="text-xs text-slate-400 mt-1">{lang === 'th' ? m.descTh : m.descEn}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Question Pool Depth */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sliders className="w-4 h-4 text-sky-400"/>
                    <span>{lang === 'th' ? 'ความกว้าง-แคบของโจทย์ (Pool Depth)' : 'Question Pool Depth'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Wide', labelTh: 'กว้าง (Wide)', labelEn: 'Wide', subTh: 'คำตอบถูก 100+', subEn: '100+ valid answers' },
                      { id: 'Balanced', labelTh: 'สมดุล (Balanced)', labelEn: 'Balanced', subTh: 'คำตอบถูก 30–80', subEn: '30–80 valid answers' },
                      { id: 'Narrow', labelTh: 'แคบ/โหด (Narrow)', labelEn: 'Narrow', subTh: 'เงื่อนไขซ้อน 10–25', subEn: 'Stacked 10–25 pool' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setPoolDepth(d.id)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          poolDepth === d.id
                            ? 'bg-sky-950/50 border-sky-500 text-sky-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{lang === 'th' ? d.labelTh : d.labelEn}</div>
                        <div className="text-[11px] opacity-80 mt-0.5">{lang === 'th' ? d.subTh : d.subEn}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SOLO OPTIONS */}
                {gameMode === 'solo' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'classic5', label: 'Classic 5' },
                        { id: 'classic10', label: 'Classic 10' },
                        { id: 'survival', label: lang === 'th' ? 'เอาชีวิตรอด (3 ❤️)' : 'Survival (3 ❤️)' },
                      ].map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSoloVariant(v.id)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                            soloVariant === v.id
                              ? 'bg-indigo-600 border-indigo-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={startSoloGame}
                      disabled={Boolean(loadingMsg)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4"/>
                      {loadingMsg || (lang === 'th' ? 'เริ่มเกมคนเดียว' : 'Start Solo Run')}
                    </button>
                  </div>
                )}

                {/* PARTY OPTIONS */}
                {gameMode === 'party' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          {lang === 'th' ? 'จำนวนรอบ' : 'Rounds'}
                        </label>
                        <select
                          value={totalRounds}
                          onChange={(e) => setTotalRounds(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                        >
                          <option value={3}>3 Rounds</option>
                          <option value={5}>5 Rounds</option>
                          <option value={7}>7 Rounds</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          {lang === 'th' ? 'ระบบแบนหัวข้อ' : 'Topic Veto'}
                        </label>
                        <select
                          value={vetoMode}
                          onChange={(e) => setVetoMode(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                        >
                          <option value="simultaneous">{lang === 'th' ? 'โหวตแบนทุกคน' : 'All Vote Ban'}</option>
                          <option value="rotating">{lang === 'th' ? '2 อันดับท้ายแบน' : 'Bottom 2 Veto'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          {lang === 'th' ? 'กฎใจตรงกัน (Collision)' : 'Collision Penalty'}
                        </label>
                        <select
                          value={collisionPenalty}
                          onChange={(e) => setCollisionPenalty(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                        >
                          <option value="zero">{lang === 'th' ? '0 แต้มทันที (โหด)' : '0 Points (Strict)'}</option>
                          <option value="half">{lang === 'th' ? 'หารครึ่ง -50%' : 'Half Points (-50%)'}</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-300">
                        {lang === 'th' ? `ผู้เล่น (${partyRoster.length}/6 คน)` : `Players (${partyRoster.length}/6)`}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {partyRoster.map((p, idx) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-sm"
                          >
                            <span>
                              {p.avatar} {p.name}
                            </span>
                            {partyRoster.length > 2 && (
                              <button
                                onClick={() => setPartyRoster((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-xs text-rose-400 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {partyRoster.length < 6 && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newPartyName}
                            onChange={(e) => setNewPartyName(e.target.value)}
                            placeholder={lang === 'th' ? 'เพิ่มชื่อผู้เล่น...' : 'Add player name...'}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                          />
                          <button
                            type="button"
                            onClick={addPartyPlayer}
                            className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5"/> Add
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={startPartyGame}
                      disabled={Boolean(loadingMsg)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4"/>
                      {loadingMsg || (lang === 'th' ? 'เริ่มปาร์ตี้ Pass & Play' : 'Start Party Game')}
                    </button>
                  </div>
                )}

                {/* ONLINE ROOM SYNC OPTIONS */}
                {gameMode === 'online' && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="font-bold text-sm text-indigo-300">
                        {lang === 'th' ? 'สร้างห้องใหม่ (Host)' : 'Create New Room'}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={totalRounds}
                          onChange={(e) => setTotalRounds(Number(e.target.value))}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs"
                        >
                          <option value={3}>3 Rounds</option>
                          <option value={5}>5 Rounds</option>
                          <option value={7}>7 Rounds</option>
                        </select>
                        <select
                          value={collisionPenalty}
                          onChange={(e) => setCollisionPenalty(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs"
                        >
                          <option value="zero">{lang === 'th' ? 'ชนกัน = 0 แต้ม' : 'Collision = 0 pts'}</option>
                          <option value="half">{lang === 'th' ? 'ชนกัน = -50%' : 'Collision = -50%'}</option>
                        </select>
                      </div>
                      <button
                        onClick={createOnlineRoom}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition"
                      >
                        {lang === 'th' ? 'สร้างรหัสห้อง 4 หลัก' : 'Create 4-Char Room'}
                      </button>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="font-bold text-sm text-emerald-300">
                        {lang === 'th' ? 'เข้าร่วมห้องเพื่อน (Join)' : 'Join Existing Room'}
                      </h3>
                      <input
                        type="text"
                        maxLength={4}
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        placeholder="ABCD"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center font-mono text-lg tracking-widest uppercase"
                      />
                      <button
                        onClick={joinOnlineRoom}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition"
                      >
                        {lang === 'th' ? 'เข้าห้อง' : 'Join Room'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PERSONAL MYTHIC VAULT */}
            {activeTab === 'vault' && (
              <div className="space-y-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400"/>
                  {lang === 'th' ? `คลังการ์ดแรร์ของ ${currentUser.handle}` : `${currentUser.handle}'s Rare+ Vault`}
                </h2>
                {(!currentUser.vault || currentUser.vault.length === 0) ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
                    {lang === 'th'
                      ? 'ยังไม่มีการ์ดระดับ Rare ขึ้นไป ลองเล่นสักรอบเพื่อสะสมการ์ด!'
                      : 'No Rare+ pulls yet. Play a match to start collecting!'}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {currentUser.vault.map((card, i) => {
                      const rc = RARITY_CONFIG[card.rarityTier] || RARITY_CONFIG.Rare;
                      return (
                        <div key={i} className={`p-4 rounded-2xl border ${rc.border} ${rc.bg} space-y-1.5`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${rc.badge}`}>
                              {card.rarityTier}
                            </span>
                            <span className="text-xs font-mono text-slate-300">+{card.points} pts</span>
                          </div>
                          <div className="font-bold text-base text-white">{card.answer}</div>
                          <div className="text-xs text-slate-400 line-clamp-2">{card.question}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LEADERBOARD & HALL OF FAME */}
            {activeTab === 'leaderboard' && (
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-amber-400">
                    <Trophy className="w-4 h-4"/>
                    {lang === 'th' ? 'อันดับผู้เล่นสูงสุด' : 'Top Player IDs'}
                  </h3>
                  <div className="space-y-2">
                    {[...allPlayers]
                      .sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0))
                      .slice(0, 10)
                      .map((p, idx) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-500 w-4">#{idx + 1}</span>
                            <span>{p.avatar}</span>
                            <span className="font-semibold">{p.handle}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">{p.wins || 0}W</span>
                            <span className="font-bold text-amber-400">{p.bestScore || 0} pts</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-fuchsia-400">
                    <Crown className="w-4 h-4"/>
                    {lang === 'th' ? 'หอเกียรติยศ (Legendary & Mythic)' : 'Group Hall of Fame'}
                  </h3>
                  <div className="space-y-2">
                    {hallOfFame.length === 0 ? (
                      <p className="text-xs text-slate-400">No Legendary/Mythic pulls recorded yet.</p>
                    ) : (
                      hallOfFame.map((item) => {
                        const rc = RARITY_CONFIG[item.rarityTier] || RARITY_CONFIG.Legendary;
                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl border ${rc.border} ${rc.bg} text-xs space-y-1`}
                          >
                            <div className="flex justify-between font-bold">
                              <span>
                                {item.avatar} {item.handle}: <span className="text-white">{item.answer}</span>
                              </span>
                              <span className={rc.color}>{item.rarityTier}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{item.question}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MATCH HISTORY */}
            {activeTab === 'history' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-400"/>
                  {lang === 'th' ? 'ประวัติการแข่งขันล่าสุด' : 'Recent Multiplayer Matches'}
                </h3>
                {matchHistory.length === 0 ? (
                  <p className="text-xs text-slate-400">No completed online matches yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {matchHistory.map((m) => (
                      <div key={m.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-2">
                        <div className="flex justify-between text-slate-400">
                          <span>Room #{m.roomCode}</span>
                          <span>{new Date(m.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(m.players || []).map((p, i) => (
                            <span
                              key={i}
                              className={`px-2.5 py-1 rounded-lg border ${
                                i === 0
                                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              {i === 0 ? '👑 ' : ''}
                              {p.avatar} {p.handle}: {p.score}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ONLINE LOBBY WAITING ROOM */}
        {phase === 'LOBBY' && roomCode && roomData && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs text-slate-400">{lang === 'th' ? 'รหัสห้องออนไลน์' : 'Online Room Code'}</div>
                <div className="text-3xl font-mono font-black tracking-widest text-indigo-400">{roomCode}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={shareInvite}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4"/>
                  {lang === 'th' ? 'ชวนเพื่อน' : 'Invite Friends'}
                </button>
                <button
                  onClick={() => { setRoomCode(''); setRoomData(null); }}
                  className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2.5 rounded-xl"
                >
                  {lang === 'th' ? 'ออก' : 'Leave'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400">
                {lang === 'th'
                  ? `ผู้เล่นในห้อง (${Object.keys(roomData.players || {}).length}/6)`
                  : `Players in Room (${Object.keys(roomData.players || {}).length}/6)`}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {Object.values(roomData.players || {}).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm"
                  >
                    <span className="font-medium">
                      {p.avatar} {p.handle}
                    </span>
                    {p.id === roomData.hostId && (
                      <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                        HOST
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isHost ? (
              <button
                onClick={startOnlineMatch}
                disabled={Object.keys(roomData.players || {}).length < 2 || Boolean(loadingMsg)}
                className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl"
              >
                {loadingMsg ||
                  (Object.keys(roomData.players || {}).length < 2
                    ? lang === 'th'
                      ? 'รอเพื่อนเข้าห้องอย่างน้อย 2 คน...'
                      : 'Waiting for at least 2 players...'
                    : lang === 'th'
                    ? 'เริ่มเกมออนไลน์!'
                    : 'Start Online Match!')}
              </button>
            ) : (
              <div className="text-center text-sm text-slate-400 py-2">
                {lang === 'th' ? 'รอหัวหน้าห้อง (Host) กดเริ่มเกม...' : 'Waiting for Host to start the match...'}
              </div>
            )}
          </div>
        )}

        {/* PHASE: TOPIC VETO (MULTIPLAYER) */}
        {phase === 'TOPIC_VETO' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5"/>
                {lang === 'th' ? `รอบที่ ${activeRoundNum}/${activeTotalRounds} • แบนหัวข้อ` : `Round ${activeRoundNum}/${activeTotalRounds} • Topic Veto`}
              </span>
            </div>

            {gameMode === 'party' && !partyCurtainOpen ? (
              <div className="py-10 text-center space-y-4">
                <EyeOff className="w-10 h-10 text-indigo-400 mx-auto"/>
                <div className="text-lg font-bold">
                  {lang === 'th'
                    ? `ส่งเครื่องให้ ${getPartyVetoVoters(partyPlayersState)[partyTurnIndex]?.name}`
                    : `Pass device to ${getPartyVetoVoters(partyPlayersState)[partyTurnIndex]?.name}`}
                </div>
                <button
                  onClick={() => setPartyCurtainOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl"
                >
                  {lang === 'th' ? 'พร้อมแบนหัวข้อ' : 'Ready to Ban'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  {lang === 'th'
                    ? 'เลือกแบนทิ้ง 1 หัวข้อที่ไม่อยากเล่น (หัวข้อที่โดนแบนน้อยที่สุดจะถูกนำมาสร้างโจทย์):'
                    : 'Select 1 topic to BAN (the topic with the fewest ban votes will be played):'}
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {(gameMode === 'online' ? roomData?.topicCandidates || [] : topicCandidates).map((topic, idx) => (
                    <button
                      key={idx}
                      disabled={Boolean(loadingMsg) || (gameMode === 'online' && onlineVetoChoice !== null)}
                      onClick={() => (gameMode === 'online' ? submitOnlineVeto(idx) : handlePartyVetoPick(idx))}
                      className={`p-4 rounded-xl border text-left transition ${
                        gameMode === 'online' && onlineVetoChoice === idx
                          ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                          : 'bg-slate-950 border-slate-800 hover:border-rose-500/60'
                      }`}
                    >
                      <div className="text-xs text-rose-400 font-bold mb-1">BAN #{idx + 1}</div>
                      <div className="font-bold text-sm">{topic}</div>
                    </button>
                  ))}
                </div>
                {loadingMsg && <div className="text-center text-sm text-indigo-300">{loadingMsg}</div>}
                {gameMode === 'online' && onlineVetoChoice !== null && (
                  <div className="text-center text-xs text-slate-400">
                    {lang === 'th' ? 'ส่งโหวตแบนแล้ว รอผู้เล่นอื่น...' : 'Ban vote submitted. Waiting for others...'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PHASE: ANSWERING */}
        {phase === 'ANSWERING' && activeQuestionObj && (
          <div className="space-y-4">
            {/* HUD */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-indigo-300">
                  {soloVariant === 'survival' && gameMode === 'solo'
                    ? `Survival • Q${roundNum}`
                    : `Round ${activeRoundNum}/${activeTotalRounds}`}
                </span>
                <span className="bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-300">{poolDepth}</span>
              </div>

              {gameMode === 'solo' && (
                <div className="flex items-center gap-4">
                  {soloVariant === 'survival' && (
                    <span className="font-bold text-rose-400">{'❤️'.repeat(soloHearts)}{'🖤'.repeat(3 - soloHearts)}</span>
                  )}
                  {soloStreak >= 2 && (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5"/> {soloStreak}x ({getStreakMultiplier(soloStreak)}x)
                    </span>
                  )}
                  <span className="font-bold text-emerald-400 text-sm">{soloScore} pts</span>
                </div>
              )}
            </div>

            {/* Party Privacy Curtain */}
            {gameMode === 'party' && !partyCurtainOpen ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
                <Lock className="w-10 h-10 text-fuchsia-400 mx-auto"/>
                <div className="text-lg font-bold">
                  {lang === 'th'
                    ? `ส่งเครื่องให้ ${partyPlayersState[partyTurnIndex]?.avatar} ${partyPlayersState[partyTurnIndex]?.name}`
                    : `Pass device to ${partyPlayersState[partyTurnIndex]?.avatar} ${partyPlayersState[partyTurnIndex]?.name}`}
                </div>
                <p className="text-xs text-slate-400">
                  {lang === 'th' ? 'ห้ามแอบดูคำตอบเพื่อน!' : 'No peeking at other players!'}
                </p>
                <button
                  onClick={() => setPartyCurtainOpen(true)}
                  className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold px-6 py-2.5 rounded-xl"
                >
                  {lang === 'th' ? 'เปิดหน้าจอพิมพ์คำตอบ' : 'Reveal Prompt & Answer'}
                </button>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/30 px-2.5 py-1 rounded-full">
                    {activeQuestionObj.category}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold leading-snug pt-1">
                    {activeQuestionObj.question}
                  </h2>
                </div>

                {hintText && (
                  <div className="bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs p-3 rounded-xl flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0"/>
                    <span>{hintText}</span>
                  </div>
                )}

                {/* Solo Lifelines */}
                {gameMode === 'solo' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!soloLifelines.reroll || Boolean(loadingMsg)}
                      onClick={handleSoloReroll}
                      className="text-xs bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400"/>
                      {lang === 'th' ? 'เปลี่ยนโจทย์ (1x)' : 'Reroll (1x)'}
                    </button>
                    <button
                      type="button"
                      disabled={!soloLifelines.hint || hintUsedThisRound || Boolean(loadingMsg)}
                      onClick={handleSoloHint}
                      className="text-xs bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400"/>
                      {lang === 'th' ? 'ขอคำใบ้ (-20%)' : 'Hint (-20%)'}
                    </button>
                  </div>
                )}

                {/* Answer Form */}
                {gameMode === 'online' && onlineSubmitted ? (
                  <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto"/>
                    <div className="font-bold text-sm text-emerald-200">
                      {lang === 'th' ? 'ส่งคำตอบเรียบร้อยแล้ว!' : 'Answer Locked In!'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {lang === 'th'
                        ? `รอเพื่อนส่งคำตอบ (${Object.keys(roomData?.submissions || {}).length}/${Object.keys(roomData?.players || {}).length} คน)`
                        : `Waiting for players (${Object.keys(roomData?.submissions || {}).length}/${Object.keys(roomData?.players || {}).length} submitted)`}
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={
                      gameMode === 'solo'
                        ? handleSoloSubmit
                        : gameMode === 'party'
                        ? handlePartyAnswerSubmit
                        : submitOnlineAnswer
                    }
                    className="space-y-4"
                  >
                    <input
                      type="text"
                      value={
                        gameMode === 'solo'
                          ? soloAnswer
                          : gameMode === 'party'
                          ? partyTempAnswer
                          : onlineAnswer
                      }
                      onChange={(e) =>
                        gameMode === 'solo'
                          ? setSoloAnswer(e.target.value)
                          : gameMode === 'party'
                          ? setPartyTempAnswer(e.target.value)
                          : setOnlineAnswer(e.target.value)
                      }
                      placeholder={
                        lang === 'th'
                          ? 'พิมพ์คำตอบที่ถูกต้องและแรร์ที่สุด...'
                          : 'Enter your most obscure valid answer...'
                      }
                      className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-base focus:outline-none"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs bg-amber-950/30 border border-amber-500/40 px-3 py-2 rounded-xl">
                        <input
                          type="checkbox"
                          checked={
                            gameMode === 'solo'
                              ? soloWager
                              : gameMode === 'party'
                              ? partyTempWager
                              : onlineWager
                          }
                          onChange={(e) =>
                            gameMode === 'solo'
                              ? setSoloWager(e.target.checked)
                              : gameMode === 'party'
                              ? setPartyTempWager(e.target.checked)
                              : setOnlineWager(e.target.checked)
                          }
                          className="accent-amber-500"
                        />
                        <Coins className="w-4 h-4 text-amber-400"/>
                        <span className="font-semibold text-amber-200">
                          {lang === 'th' ? 'เดิมพัน x2 (ต้องได้ Epic ขึ้นไป)' : 'Double or Nothing (Epic+ required)'}
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={Boolean(loadingMsg)}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition"
                      >
                        {loadingMsg || (lang === 'th' ? 'ส่งคำตอบ' : 'Lock In Answer')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* PHASE: JUDGING */}
        {phase === 'JUDGING' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-fuchsia-400 animate-spin mx-auto"/>
            <div className="font-bold text-lg">
              {loadingMsg || (lang === 'th' ? 'AI กรรมการกำลังประเมินความแรร์...' : 'AI Referee evaluating all submissions...')}
            </div>
          </div>
        )}

        {/* PHASE: REVEAL (SOLO) */}
        {phase === 'REVEAL' && gameMode === 'solo' && soloResult && (
          <div className="space-y-4">
            {(() => {
              const rc = RARITY_CONFIG[soloResult.rarityTier] || RARITY_CONFIG.Invalid;
              return (
                <div className={`rounded-2xl border-2 ${rc.border} ${rc.bg} p-6 space-y-4 shadow-2xl`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${rc.badge}`}>
                      {soloResult.rarityTier} {lang === 'th' ? `• ${rc.labelTh}` : ''}
                    </span>
                    <span className="text-2xl font-black text-white">+{soloResult.finalPoints} pts</span>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">{lang === 'th' ? 'คำตอบของคุณ' : 'Your Answer'}</div>
                    <div className="text-2xl font-extrabold text-white">{soloResult.answer}</div>
                  </div>

                  {soloResult.hitForbiddenTop3 && soloResult.isValid && (
                    <div className="bg-rose-950/70 border border-rose-500 text-rose-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400"/>
                      {lang === 'th'
                        ? 'กับดักคำตอบต้องห้าม Top 3! แต้มถูกหารครึ่งและสตรีคขาด'
                        : 'FORBIDDEN TOP 3 TRAP TRIGGERED! Points halved & streak broken.'}
                    </div>
                  )}

                  {soloResult.isValid && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>{lang === 'th' ? 'อัตราคนตอบซ้ำ (Mindshare)' : 'Estimated Public Mindshare'}</span>
                        <span className="font-bold">~{soloResult.estimatedMindsharePercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-fuchsia-500 to-amber-400"
                          style={{ width: `${Math.min(100, Math.max(3, soloResult.estimatedMindsharePercent))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-slate-200 italic">"{soloResult.hostComment}"</p>
                  <p className="text-xs text-slate-300">{soloResult.reason}</p>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                    <div className="font-bold text-amber-300">💡 Fun Fact</div>
                    <div className="text-slate-300">{soloResult.funFact}</div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                      <div className="text-rose-400 font-bold mb-1">
                        {lang === 'th' ? 'กับดักยอดฮิต (Forbidden Top 3)' : 'Hidden Forbidden Top 3'}
                      </div>
                      <div className="text-slate-300">{(soloResult.forbiddenTop3 || []).join(', ')}</div>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                      <div className="text-fuchsia-300 font-bold mb-1">
                        {lang === 'th' ? 'ตัวอย่างระดับ Mythic' : 'Mythic-Tier Example'}
                      </div>
                      <div className="text-slate-200 font-semibold">{soloResult.mythicExample}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={handleSoloNext}
              disabled={Boolean(loadingMsg)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition"
            >
              {loadingMsg ||
                ((soloVariant === 'survival' && soloHearts <= 0) ||
                (soloVariant !== 'survival' && roundNum >= totalRounds)
                  ? lang === 'th'
                    ? 'ดูสรุปผลคะแนน'
                    : 'View Final Summary'
                  : lang === 'th'
                  ? 'ข้อถัดไป'
                  : 'Next Question')}
            </button>
          </div>
        )}

        {/* PHASE: REVEAL (MULTIPLAYER PARTY & ONLINE) */}
        {phase === 'REVEAL' && gameMode !== 'solo' && (
          <div className="space-y-4">
            {activeMultiplayerResults.some((r) => r.isCollision) && (
              <div className="bg-rose-950/70 border border-rose-500 text-rose-200 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400 shrink-0"/>
                <span>
                  {lang === 'th'
                    ? '💥 ใจตรงกัน (Semantic Collision)! มีผู้เล่นตอบแนวคิดเดียวกัน โดนลงโทษตัดคะแนน!'
                    : '💥 SEMANTIC COLLISION! Matching answers detected — collision penalty applied!'}
                </span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              {activeMultiplayerResults.map((r, idx) => {
                const isRevealed = gameMode === 'online' || idx < revealedCount;
                const rc = RARITY_CONFIG[r.rarityTier] || RARITY_CONFIG.Invalid;

                if (!isRevealed) {
                  return (
                    <button
                      key={r.playerId}
                      onClick={() => setRevealedCount((c) => c + 1)}
                      className="bg-slate-900 border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 rounded-2xl p-6 text-center space-y-2 transition"
                    >
                      <Eye className="w-6 h-6 text-indigo-400 mx-auto"/>
                      <div className="font-bold">
                        {r.playerAvatar} {r.playerName}
                      </div>
                      <div className="text-xs text-indigo-300">
                        {lang === 'th' ? 'แตะเพื่อเปิดการ์ด!' : 'Tap to Reveal Card!'}
                      </div>
                    </button>
                  );
                }

                return (
                  <div key={r.playerId} className={`rounded-2xl border-2 ${rc.border} ${rc.bg} p-4 space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">
                        {r.playerAvatar} {r.playerName}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${rc.badge}`}>
                        {r.rarityTier}
                      </span>
                    </div>
                    <div className="text-lg font-extrabold text-white">{r.answer || '—'}</div>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {r.isCollision && (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded">
                          COLLISION
                        </span>
                      )}
                      {r.hitForbiddenTop3 && r.isValid && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                          TOP 3 TRAP
                        </span>
                      )}
                      {r.wagered && (
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded">
                          WAGER x2
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">{r.reason}</p>
                    <div className="text-right font-black text-base text-emerald-300">+{r.finalPoints} pts</div>
                  </div>
                );
              })}
            </div>

            {activeMultiplayerResults[0] && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
                <div className="text-slate-300">
                  <strong className="text-amber-300">Fun Fact:</strong> {activeMultiplayerResults[0].funFact}
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-slate-400 pt-1 border-t border-slate-800">
                  <span>Top 3: {(activeQuestionObj?.forbiddenTop3 || []).join(', ')}</span>
                  <span className="text-fuchsia-300">Mythic: {activeMultiplayerResults[0].mythicExample}</span>
                </div>
              </div>
            )}

            {/* Next Round Controls */}
            {gameMode === 'party' && revealedCount >= activeMultiplayerResults.length && (
              <button
                onClick={async () => {
                  if (roundNum >= totalRounds) {
                    setPhase('SUMMARY');
                    return;
                  }
                  const nextR = roundNum + 1;
                  setRoundNum(nextR);
                  await beginPartyRound(nextR, partyPlayersState, usedTopics);
                }}
                disabled={Boolean(loadingMsg)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl"
              >
                {loadingMsg ||
                  (roundNum >= totalRounds
                    ? lang === 'th'
                      ? 'ดูสรุปผู้ชนะ'
                      : 'Final Podium'
                    : lang === 'th'
                    ? 'เริ่มรอบถัดไป'
                    : 'Next Round')}
              </button>
            )}

            {gameMode === 'online' &&
              (isHost ? (
                <button
                  onClick={advanceOnlineRound}
                  disabled={Boolean(loadingMsg)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl"
                >
                  {loadingMsg ||
                    (activeRoundNum >= activeTotalRounds
                      ? lang === 'th'
                        ? 'จบเกมและดูโพเดียม'
                        : 'Finish & Show Podium'
                      : lang === 'th'
                      ? 'เริ่มรอบถัดไป'
                      : 'Next Round')}
                </button>
              ) : (
                <div className="text-center text-xs text-slate-400 py-2">
                  {lang === 'th' ? 'รอ Host กดไปรอบถัดไป...' : 'Waiting for Host to advance...'}
                </div>
              ))}
          </div>
        )}

        {/* PHASE: SUMMARY / PODIUM */}
        {phase === 'SUMMARY' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-center">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto"/>
            <div>
              <h2 className="text-2xl font-black">
                {lang === 'th' ? 'สรุปผลการแข่งขัน!' : 'Final Results!'}
              </h2>
              {gameMode === 'solo' && (
                <div className="text-4xl font-black text-indigo-400 mt-2">{soloScore} pts</div>
              )}
            </div>

            {gameMode !== 'solo' && (
              <div className="max-w-md mx-auto space-y-2 text-left">
                {[...activeMultiplayerPlayers]
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                        idx === 0
                          ? 'bg-amber-950/40 border-amber-400 text-amber-200 font-bold'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <span>
                        {idx === 0 ? '👑 ' : `#${idx + 1} `}
                        {p.avatar} {p.handle || p.name}
                      </span>
                      <span>{p.score} pts</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={shareInvite}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm"
              >
                <Share2 className="w-4 h-4"/>
                {lang === 'th' ? 'แชร์ผลคะแนน' : 'Share Results'}
              </button>
              <button
                onClick={() => {
                  setPhase('LOBBY');
                  setRoomCode('');
                  setRoomData(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm"
              >
                <Home className="w-4 h-4"/>
                {lang === 'th' ? 'กลับหน้าหลัก' : 'Back to Lobby'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
