import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Loader2
} from 'lucide-react';

const AVATARS = ['😎', '🦊', '🐱', '🚀', '👾', '🦄', '🐸', '🔥'];

const CATEGORIES = [
  { id: 'all', th: 'สุ่มทุกหมวด', en: 'All Categories' },
  { id: 'food', th: 'อาหารและของกิน', en: 'Food & Drinks' },
  { id: 'daily', th: 'ชีวิตประจำวัน', en: 'Daily Life' },
  { id: 'pop', th: 'บันเทิงและไลฟ์สไตล์', en: 'Pop Culture & Lifestyle' },
  { id: 'travel', th: 'ท่องเที่ยวและสถานที่', en: 'Travel & Places' }
];

// ชุดคำถามสำรองในตัว (ใช้ทันทีหาก AI โหลดช้าหรือเชื่อมต่อไม่ได้)
const FALLBACK_QUESTIONS = [
  {
    category: 'food',
    question: {
      th: 'เวลาไปร้านอาหารตามสั่ง เมนูไหนที่คนมักจะสั่ง "น้อยที่สุด" เมื่อคิดไม่ออก?',
      en: 'At a local street food stall, which dish do people order the LEAST when they cannot decide?'
    },
    options: [
      { th: 'ผัดกะเพราหมูสับไข่ดาว', en: 'Stir-fried Basil Pork with Fried Egg', pct: 46 },
      { th: 'ข้าวผัดหมู / ไก่', en: 'Pork / Chicken Fried Rice', pct: 27 },
      { th: 'หมูกระเทียมราดข้าว', en: 'Garlic Pork over Rice', pct: 18 },
      { th: 'สุกี้แห้งรวมมิตร', en: 'Dry Sukiyaki Mixed', pct: 9 }
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
    category: 'pop',
    question: {
      th: 'เวลาเข้าโรงภาพยนตร์ คนดูมักจะเลือกที่นั่งโซนไหน "น้อยที่สุด"?',
      en: 'When booking movie tickets, which seating zone do people pick the LEAST?'
    },
    options: [
      { th: 'แถวกลางโรง ตรงกลางจอพอดี', en: 'Middle rows, dead center', pct: 44 },
      { th: 'แถวหลังสุด (Honeymoon / Sofa)', en: 'Very back row / VIP seats', pct: 31 },
      { th: 'แถวค่อนไปทางด้านหลังริมทางเดิน', en: 'Upper rows near the aisle', pct: 18 },
      { th: 'แถวหน้าสุดใกล้จอภาพยนตร์', en: 'Front rows closest to the screen', pct: 7 }
    ]
  },
  {
    category: 'travel',
    question: {
      th: 'เวลาจัดกระเป๋าไปเที่ยวต่างจังหวัด 3 วัน 2 คืน ของชิ้นไหนที่คนมักลืมหรือพกไป "น้อยที่สุด"?',
      en: 'When packing for a 3-day weekend trip, which item do people pack the LEAST?'
    },
    options: [
      { th: 'สายชาร์จแบตและพาวเวอร์แบงก์', en: 'Phone charger and power bank', pct: 45 },
      { th: 'เสื้อผ้าชุดเก่งสำหรับถ่ายรูป', en: 'Extra outfits for photos', pct: 29 },
      { th: 'ครีมกันแดดและสกินแคร์', en: 'Sunscreen and skincare', pct: 17 },
      { th: 'ชุดปฐมพยาบาล / ยาสามัญประจำบ้าน', en: 'Mini first-aid kit / basic medicine', pct: 9 }
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
      th: 'เวลาดูซีรีส์หรืออนิเมะเรื่องโปรด ช่วงไหนที่คนกดข้าม (Skip) "น้อยที่สุด"?',
      en: 'When binge-watching a favorite series or anime, which part do people skip the LEAST?'
    },
    options: [
      { th: 'ฉากไคลแมกซ์สำคัญของตอน', en: 'The main climax scene of the episode', pct: 48 },
      { th: 'เพลงเปิด (Opening Theme)', en: 'The Opening Theme song', pct: 24 },
      { th: 'ตัวอย่างตอนต่อไป (Next Episode Preview)', en: 'Next episode preview', pct: 19 },
      { th: 'เครดิตท้ายเรื่อง (End Credits)', en: 'End credits roll', pct: 9 }
    ]
  },
  {
    category: 'travel',
    question: {
      th: 'เวลาไปเดินห้างสรรพสินค้าในวันหยุด โซนไหนที่คนแวะเดินเข้าไป "น้อยที่สุด"?',
      en: 'When visiting a shopping mall on weekends, which zone do people visit the LEAST?'
    },
    options: [
      { th: 'โซนร้านอาหารและคาเฟ่', en: 'Restaurants & Cafes zone', pct: 45 },
      { th: 'ซูเปอร์มาร์เก็ตและร้านสะดวกซื้อ', en: 'Supermarket & Grocery', pct: 27 },
      { th: 'โซนเสื้อผ้าแฟชั่นและเครื่องสำอาง', en: 'Fashion & Cosmetics zone', pct: 19 },
      { th: 'โซนเฟอร์นิเจอร์และของแต่งบ้านชิ้นใหญ่', en: 'Large Furniture & Home Decor zone', pct: 9 }
    ]
  },
  {
    category: 'food',
    question: {
      th: 'เวลาทานก๋วยเตี๋ยว เครื่องปรุงชนิดไหนที่คนมักตักใส่ชาม "น้อยที่สุด"?',
      en: 'When eating noodle soup, which table condiment do people add the LEAST?'
    },
    options: [
      { th: 'พริกป่น', en: 'Chili flakes', pct: 42 },
      { th: 'น้ำส้มสายชู / พริกดอง', en: 'Vinegar / Pickled chili', pct: 26 },
      { th: 'น้ำตาลทราย', en: 'White sugar', pct: 21 },
      { th: 'น้ำปลา', en: 'Fish sauce', pct: 11 }
    ]
  },
  {
    category: 'daily',
    question: {
      th: 'เวลาฝนตกหนักตอนเลิกงาน วิธีกลับบ้านแบบไหนที่คนเลือกใช้ "น้อยที่สุด"?',
      en: 'When heavy rain hits right after work/school, which way home do people choose the LEAST?'
    },
    options: [
      { th: 'รอในอาคารหรือร้านกาแฟจนฝนซา', en: 'Wait indoors/cafe until rain stops', pct: 41 },
      { th: 'เรียกแท็กซี่หรือรถผ่านแอป', en: 'Call a taxi or ride-hailing car', pct: 32 },
      { th: 'กางร่มเดินฝ่าฝนไปขึ้นรถสาธารณะ', en: 'Use an umbrella to catch transit', pct: 20 },
      { th: 'วิ่งฝ่าฝนตัวเปล่าแบบไม่กางร่ม', en: 'Run straight through the rain without umbrella', pct: 7 }
    ]
  },
  {
    category: 'pop',
    question: {
      th: 'เวลาตั้งรหัสผ่านบัญชีใหม่ รูปแบบไหนที่คนทั่วไปใช้ตั้ง "น้อยที่สุด"?',
      en: 'When creating a new account password, which pattern do everyday users pick the LEAST?'
    },
    options: [
      { th: 'วันเดือนปีเกิดของตัวเอง', en: 'Their own birthday', pct: 40 },
      { th: 'ชื่อเล่นตามด้วยตัวเลขง่าย ๆ', en: 'Nickname + simple numbers', pct: 31 },
      { th: 'เบอร์โทรศัพท์มือถือ', en: 'Mobile phone number', pct: 20 },
      { th: 'รหัสสุ่มยาว 16 ตัวอักษรพร้อมสัญลักษณ์พิเศษ', en: 'Random 16-char string with symbols', pct: 9 }
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
      { th: 'ฟังเพลงหรือดูหนังที่โหลดไว้', en: 'Listening to music / watching downloaded movies', pct: 29 },
      { th: 'ถ่ายรูปวิวเมฆนอกหน้าต่าง', en: 'Taking window photos of clouds', pct: 17 },
      { th: 'หยิบนิตยสารหน้าที่นั่งขึ้นมาอ่าน', en: 'Reading the in-flight seatback magazine', pct: 8 }
    ]
  }
];

function getLowestPctIndex(options) {
  let minIdx = 0;
  for (let i = 1; i < options.length; i++) {
    if (options[i].pct < options[minIdx].pct) {
      minIdx = i;
    }
  }
  return minIdx;
}

function getRankByPct(options, selectedIdx) {
  // เรียงจาก % น้อยไปมาก (อันดับ 0 คือ % น้อยที่สุด = ชนะขาด)
  const sortedPcts = [...options.map((o) => o.pct)].sort((a, b) => a - b);
  const chosenPct = options[selectedIdx].pct;
  return sortedPcts.indexOf(chosenPct);
}

function calculateRoundPoints(options, selectedIdx, currentStreak = 0) {
  const rank = getRankByPct(options, selectedIdx);
  if (rank === 0) {
    return { points: 150 + currentStreak * 25, isReverseWinner: true, rank };
  }
  if (rank === 1) {
    return { points: 80, isReverseWinner: false, rank };
  }
  if (rank === 2) {
    return { points: 30, isReverseWinner: false, rank };
  }
  return { points: 0, isReverseWinner: false, rank };
}

export default function App() {
  const [lang, setLang] = useState('th');
  const [user, setUser] = useState(null);

  // Auth states
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [playerIdInput, setPlayerIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😎');
  const [showPin, setShowPin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [suggestRegister, setSuggestRegister] = useState(false);

  // Screen navigation: 'lobby' | 'solo' | 'local_setup' | 'local_game' | 'online_lobby' | 'online_game'
  const [screen, setScreen] = useState('lobby');

  // Shared game settings
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [totalRounds, setTotalRounds] = useState(5);
  const [leaderboard, setLeaderboard] = useState([]);

  // Question pool & loading
  const [questions, setQuestions] = useState([]);
  const [questionSource, setQuestionSource] = useState('ai'); // 'ai' | 'classic'
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Solo game states
  const [soloRound, setSoloRound] = useState(0);
  const [soloScore, setSoloScore] = useState(0);
  const [soloStreak, setSoloStreak] = useState(0);
  const [soloBestStreak, setSoloBestStreak] = useState(0);
  const [soloPicked, setSoloPicked] = useState(null);
  const [soloFinished, setSoloFinished] = useState(false);

  // Local Pass & Play (โหมดผู้เล่นหลายคนในเครื่องเดียว) states
  const [localPlayers, setLocalPlayers] = useState([
    { name: 'ผู้เล่น 1', avatar: '😎', score: 0 },
    { name: 'ผู้เล่น 2', avatar: '🦊', score: 0 }
  ]);
  const [localRound, setLocalRound] = useState(0);
  const [localTurnIndex, setLocalTurnIndex] = useState(0);
  const [localPrivacyScreen, setLocalPrivacyScreen] = useState(true);
  const [localAnswers, setLocalAnswers] = useState({}); // { playerIndex: optionIndex }
  const [localReveal, setLocalReveal] = useState(false);
  const [localFinished, setLocalFinished] = useState(false);

  // Online Multiplayer states
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // โหลดเซสชันที่จำไว้ในเครื่อง
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

    // เช็กพารามิเตอร์ ?room= บน URL
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCodeInput(roomParam.toUpperCase());
    }
  }, []);

  // โหลดตารางอันดับผู้เล่นสูงสุดจาก Firestore
  useEffect(() => {
    if (!user || user.isGuest) return;
    const q = query(collection(db, 'users'), orderBy('score', 'desc'), limit(5));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setLeaderboard(list);
      },
      () => {
        // ข้ามเงียบ ๆ หากยังไม่มีข้อมูล
      }
    );
    return () => unsub();
  }, [user]);

  // ซิงก์ห้องออนไลน์แบบเรียลไทม์
  useEffect(() => {
    if (!activeRoomCode) return;
    const roomRef = doc(db, 'rooms', activeRoomCode);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          setRoomData(snap.data());
        } else {
          setOnlineError(lang === 'th' ? 'ไม่พบห้องนี้หรือห้องถูกปิดไปแล้ว' : 'Room not found or closed');
          setActiveRoomCode('');
          setRoomData(null);
          setScreen('lobby');
        }
      },
      (err) => {
        setOnlineError(err.message);
      }
    );
    return () => unsub();
  }, [activeRoomCode, lang]);

  // ฟังก์ชันเข้าสู่ระบบ (Login)
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setSuggestRegister(false);

    const rawName = playerIdInput.trim();
    const cleanId = rawName.toLowerCase();

    if (cleanId.length < 3) {
      setAuthError(
        lang === 'th'
          ? 'กรุณากรอกชื่อผู้เล่นอย่างน้อย 3 ตัวอักษร'
          : 'Player ID must be at least 3 characters'
      );
      return;
    }
    if (!/^\d{4}$/.test(pinInput)) {
      setAuthError(
        lang === 'th'
          ? 'กรุณากรอกรหัส PIN ตัวเลข 4 หลัก'
          : 'Please enter a 4-digit numeric PIN'
      );
      return;
    }

    setAuthLoading(true);
    try {
      const userRef = doc(db, 'users', cleanId);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        setAuthError(
          lang === 'th'
            ? `ไม่พบชื่อผู้เล่น "${rawName}" ในระบบ ต้องการสมัครเป็น ID ใหม่เลยไหมครับ?`
            : `Player ID "${rawName}" not found. Would you like to register it now?`
        );
        setSuggestRegister(true);
        setAuthLoading(false);
        return;
      }

      const data = snap.data();
      if (data.pin !== pinInput) {
        setAuthError(
          lang === 'th' ? 'รหัส PIN 4 หลักไม่ถูกต้อง กรุณาลองใหม่' : 'Incorrect 4-digit PIN'
        );
        setAuthLoading(false);
        return;
      }

      const loggedUser = {
        id: cleanId,
        displayName: data.displayName || rawName,
        avatar: data.avatar || '😎',
        score: data.score || 0,
        gamesPlayed: data.gamesPlayed || 0,
        bestStreak: data.bestStreak || 0
      };

      setUser(loggedUser);
      localStorage.setItem('reverse_trivia_user', JSON.stringify(loggedUser));
      setLocalPlayers([
        { name: loggedUser.displayName, avatar: loggedUser.avatar, score: 0 },
        { name: lang === 'th' ? 'ผู้เล่น 2' : 'Player 2', avatar: '🦊', score: 0 }
      ]);
    } catch (err) {
      setAuthError(
        (lang === 'th' ? 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ' : 'Database error: ') + err.message
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // ฟังก์ชันสมัคร ID ใหม่ (Register)
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setSuggestRegister(false);

    const rawName = playerIdInput.trim();
    const cleanId = rawName.toLowerCase();

    if (cleanId.length < 3 || cleanId.length > 20) {
      setAuthError(
        lang === 'th'
          ? 'ชื่อผู้เล่นต้องมีความยาว 3–20 ตัวอักษร'
          : 'Player ID must be 3–20 characters long'
      );
      return;
    }
    if (!/^\d{4}$/.test(pinInput)) {
      setAuthError(
        lang === 'th'
          ? 'กรุณาตั้งรหัส PIN เป็นตัวเลข 4 หลัก'
          : 'PIN must be exactly 4 digits'
      );
      return;
    }
    if (pinInput !== confirmPinInput) {
      setAuthError(
        lang === 'th'
          ? 'รหัส PIN ทั้ง 2 ช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง'
          : 'PINs do not match'
      );
      return;
    }

    setAuthLoading(true);
    try {
      const userRef = doc(db, 'users', cleanId);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setAuthError(
          lang === 'th'
            ? `ชื่อผู้เล่น "${rawName}" มีคนใช้แล้ว กรุณาใช้ชื่ออื่น หรือสลับไปแท็บเข้าสู่ระบบ`
            : `Player ID "${rawName}" is already taken.`
        );
        setAuthLoading(false);
        return;
      }

      const newUserDoc = {
        id: cleanId,
        displayName: rawName,
        avatar: selectedAvatar,
        pin: pinInput,
        score: 0,
        gamesPlayed: 0,
        bestStreak: 0,
        createdAt: serverTimestamp()
      };

      await setDoc(userRef, newUserDoc);

      const loggedUser = {
        id: cleanId,
        displayName: rawName,
        avatar: selectedAvatar,
        score: 0,
        gamesPlayed: 0,
        bestStreak: 0
      };

      setUser(loggedUser);
      localStorage.setItem('reverse_trivia_user', JSON.stringify(loggedUser));
      setLocalPlayers([
        { name: loggedUser.displayName, avatar: loggedUser.avatar, score: 0 },
        { name: lang === 'th' ? 'ผู้เล่น 2' : 'Player 2', avatar: '🦊', score: 0 }
      ]);
    } catch (err) {
      setAuthError(
        (lang === 'th' ? 'สมัครสมาชิกไม่สำเร็จ: ' : 'Registration failed: ') + err.message
      );
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

  // สร้างชุดคำถาม (พยายามเรียก AI ก่อน หากไม่ได้จะใช้ชุดคำถามสำรองในตัวทันที)
  const fetchQuestions = async (category, count) => {
    setLoadingQuestions(true);
    try {
      const catObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
      const prompt = `Generate ${count} fun "Reverse Trivia" survey questions in BOTH Thai and English about "${catObj.en}".
In Reverse Trivia, players try to pick the option that the FEWEST people in a 100-person survey chose.
Return ONLY a valid JSON array with no markdown or extra text. Format:
[
  {
    "question": { "th": "คำถามภาษาไทย", "en": "English question" },
    "options": [
      { "th": "ตัวเลือก 1", "en": "Option 1", "pct": 45 },
      { "th": "ตัวเลือก 2", "en": "Option 2", "pct": 28 },
      { "th": "ตัวเลือก 3", "en": "Option 3", "pct": 18 },
      { "th": "ตัวเลือก 4", "en": "Option 4", "pct": 9 }
    ]
  }
]
Make sure the 4 "pct" integers sum to exactly 100 and are distinct.`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          contents: [{ parts: [{ text: prompt }] }]
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('API fallback');
      const data = await res.json();
      const rawText =
        data?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed) && parsed.length >= count) {
        setQuestionSource('ai');
        setLoadingQuestions(false);
        return parsed.slice(0, count);
      }
      throw new Error('Invalid format');
    } catch (err) {
      // ใช้ชุดคำถามสำรองแบบสุ่มไม่ซ้ำ
      const pool =
        category === 'all'
          ? [...FALLBACK_QUESTIONS]
          : FALLBACK_QUESTIONS.filter((q) => q.category === category);
      const sourcePool = pool.length >= count ? pool : [...FALLBACK_QUESTIONS];
      const shuffled = sourcePool.sort(() => Math.random() - 0.5);
      setQuestionSource('classic');
      setLoadingQuestions(false);
      return shuffled.slice(0, count);
    }
  };

  // อัปเดตสถิติผู้เล่นลง Firestore
  const savePlayerProgress = async (earnedScore, newBestStreak) => {
    if (!user || user.isGuest) return;
    try {
      const userRef = doc(db, 'users', user.id);
      const updatedBest = Math.max(user.bestStreak || 0, newBestStreak || 0);
      await updateDoc(userRef, {
        score: increment(earnedScore),
        gamesPlayed: increment(1),
        bestStreak: updatedBest
      });
      const updatedUser = {
        ...user,
        score: (user.score || 0) + earnedScore,
        gamesPlayed: (user.gamesPlayed || 0) + 1,
        bestStreak: updatedBest
      };
      setUser(updatedUser);
      localStorage.setItem('reverse_trivia_user', JSON.stringify(updatedUser));
    } catch (e) {
      // ข้ามหากออฟไลน์ชั่วคราว
    }
  };

  // --- โหมดเล่นคนเดียว (Solo) ---
  const startSoloGame = async () => {
    const qs = await fetchQuestions(selectedCategory, totalRounds);
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
    const currentQ = questions[soloRound];
    const { points, isReverseWinner } = calculateRoundPoints(
      currentQ.options,
      idx,
      soloStreak
    );
    const nextStreak = isReverseWinner ? soloStreak + 1 : 0;
    setSoloScore((prev) => prev + points);
    setSoloStreak(nextStreak);
    setSoloBestStreak((prev) => Math.max(prev, nextStreak));
  };

  const handleSoloNext = async () => {
    if (soloRound + 1 < questions.length) {
      setSoloRound((prev) => prev + 1);
      setSoloPicked(null);
    } else {
      setSoloFinished(true);
      await savePlayerProgress(soloScore, soloBestStreak);
    }
  };

  // --- โหมดผู้เล่นหลายคนในเครื่องเดียว (Local Pass & Play) ---
  const addLocalPlayer = () => {
    if (localPlayers.length >= 8) return;
    const nextNum = localPlayers.length + 1;
    const nextAvatar = AVATARS[(nextNum - 1) % AVATARS.length];
    setLocalPlayers([
      ...localPlayers,
      {
        name: lang === 'th' ? `ผู้เล่น ${nextNum}` : `Player ${nextNum}`,
        avatar: nextAvatar,
        score: 0
      }
    ]);
  };

  const removeLocalPlayer = (index) => {
    if (localPlayers.length <= 2) return;
    setLocalPlayers(localPlayers.filter((_, i) => i !== index));
  };

  const updateLocalPlayerName = (index, name) => {
    const copy = [...localPlayers];
    copy[index] = { ...copy[index], name };
    setLocalPlayers(copy);
  };

  const cycleLocalPlayerAvatar = (index) => {
    const copy = [...localPlayers];
    const currIdx = AVATARS.indexOf(copy[index].avatar);
    copy[index] = {
      ...copy[index],
      avatar: AVATARS[(currIdx + 1) % AVATARS.length]
    };
    setLocalPlayers(copy);
  };

  const startLocalGame = async () => {
    const cleanedPlayers = localPlayers.map((p, idx) => ({
      ...p,
      name:
        p.name.trim() ||
        (lang === 'th' ? `ผู้เล่น ${idx + 1}` : `Player ${idx + 1}`),
      score: 0
    }));
    setLocalPlayers(cleanedPlayers);
    const qs = await fetchQuestions(selectedCategory, totalRounds);
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
      // ครบทุกคนแล้ว คำนวณคะแนนรอบนี้และเปิดเฉลยพร้อมกัน
      const currentQ = questions[localRound];
      const scoredPlayers = localPlayers.map((p, idx) => {
        const picked = updatedAnswers[idx];
        const { points } = calculateRoundPoints(currentQ.options, picked, 0);
        return {
          ...p,
          lastRoundPoints: points,
          score: p.score + points
        };
      });
      setLocalPlayers(scoredPlayers);
      setLocalReveal(true);
    }
  };

  const handleLocalNextRound = async () => {
    if (localRound + 1 < questions.length) {
      setLocalRound(localRound + 1);
      setLocalTurnIndex(0);
      setLocalPrivacyScreen(true);
      setLocalAnswers({});
      setLocalReveal(false);
    } else {
      setLocalFinished(true);
      if (localPlayers[0]?.score > 0) {
        await savePlayerProgress(localPlayers[0].score, 0);
      }
    }
  };

  // --- โหมดห้องออนไลน์หลายคน (Online Room) ---
  const createOnlineRoom = async () => {
    setOnlineError('');
    setOnlineLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const qs = await fetchQuestions(selectedCategory, totalRounds);
      const roomDoc = {
        code,
        hostId: user.id,
        status: 'waiting', // 'waiting' | 'playing' | 'reveal' | 'finished'
        currentRound: 0,
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
      };
      await setDoc(doc(db, 'rooms', code), roomDoc);
      setActiveRoomCode(code);
      setScreen('online_lobby');
    } catch (err) {
      setOnlineError(
        (lang === 'th' ? 'สร้างห้องไม่สำเร็จ: ' : 'Failed to create room: ') + err.message
      );
    } finally {
      setOnlineLoading(false);
    }
  };

  const joinOnlineRoom = async () => {
    setOnlineError('');
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      setOnlineError(
        lang === 'th' ? 'กรุณากรอกรหัสห้องให้ถูกต้อง' : 'Please enter a valid room code'
      );
      return;
    }
    setOnlineLoading(true);
    try {
      const roomRef = doc(db, 'rooms', code);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        setOnlineError(
          lang === 'th' ? `ไม่พบห้องรหัส "${code}"` : `Room "${code}" not found`
        );
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
      setOnlineError(
        (lang === 'th' ? 'เข้าห้องไม่สำเร็จ: ' : 'Failed to join room: ') + err.message
      );
    } finally {
      setOnlineLoading(false);
    }
  };

  const startOnlineMatch = async () => {
    if (!activeRoomCode) return;
    await updateDoc(doc(db, 'rooms', activeRoomCode), {
      status: 'playing',
      currentRound: 0
    });
  };

  const submitOnlinePick = async (optionIdx) => {
    if (!roomData || !activeRoomCode) return;
    const me = roomData.players?.[user.id];
    if (!me || me.currentPick !== null) return;

    const updatedPlayers = {
      ...roomData.players,
      [user.id]: { ...me, currentPick: optionIdx }
    };

    const allPlayersList = Object.values(updatedPlayers);
    const everyonePicked = allPlayersList.every((p) => p.currentPick !== null);

    if (everyonePicked) {
      const currentQ = roomData.questions[roomData.currentRound];
      const scoredPlayers = {};
      allPlayersList.forEach((p) => {
        const { points } = calculateRoundPoints(currentQ.options, p.currentPick, 0);
        scoredPlayers[p.id] = {
          ...p,
          lastPoints: points,
          score: (p.score || 0) + points
        };
      });
      await updateDoc(doc(db, 'rooms', activeRoomCode), {
        players: scoredPlayers,
        status: 'reveal'
      });
    } else {
      await updateDoc(doc(db, 'rooms', activeRoomCode), {
        [`players.${user.id}.currentPick`]: optionIdx
      });
    }
  };

  const forceRevealOnline = async () => {
    if (!roomData || !activeRoomCode) return;
    const currentQ = roomData.questions[roomData.currentRound];
    const scoredPlayers = {};
    Object.values(roomData.players || {}).forEach((p) => {
      if (p.currentPick !== null) {
        const { points } = calculateRoundPoints(currentQ.options, p.currentPick, 0);
        scoredPlayers[p.id] = {
          ...p,
          lastPoints: points,
          score: (p.score || 0) + points
        };
      } else {
        scoredPlayers[p.id] = { ...p, lastPoints: 0 };
      }
    });
    await updateDoc(doc(db, 'rooms', activeRoomCode), {
      players: scoredPlayers,
      status: 'reveal'
    });
  };

  const nextOnlineRound = async () => {
    if (!roomData || !activeRoomCode) return;
    const nextIdx = roomData.currentRound + 1;
    if (nextIdx < roomData.questions.length) {
      const resetPlayers = {};
      Object.values(roomData.players || {}).forEach((p) => {
        resetPlayers[p.id] = { ...p, currentPick: null, lastPoints: 0 };
      });
      await updateDoc(doc(db, 'rooms', activeRoomCode), {
        players: resetPlayers,
        currentRound: nextIdx,
        status: 'playing'
      });
    } else {
      await updateDoc(doc(db, 'rooms', activeRoomCode), {
        status: 'finished'
      });
      const myFinal = roomData.players?.[user.id]?.score || 0;
      if (myFinal > 0) {
        await savePlayerProgress(myFinal, 0);
      }
    }
  };

  const copyRoomInvite = () => {
    const baseUrl = window.location.origin;
    const inviteText =
      lang === 'th'
        ? `มาเล่น Reverse Trivia ทายสวนกระแสกัน! รหัสห้อง: ${activeRoomCode} หรือกดลิงก์ ${baseUrl}/?room=${activeRoomCode}`
        : `Join my Reverse Trivia room! Code: ${activeRoomCode} Link: ${baseUrl}/?room=${activeRoomCode}`;
    navigator.clipboard.writeText(inviteText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // =========================================================================
  // 1. หน้าเข้าสู่ระบบ & สมัคร ID ใหม่ (AUTH SCREEN)
  // =========================================================================
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0f1626] border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Reverse Trivia
                </h1>
                <p className="text-xs text-indigo-400 font-medium">
                  {lang === 'th' ? 'ทายสวนกระแส' : 'Think Against the Crowd'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              {lang === 'th' ? 'TH' : 'EN'}
            </button>
          </div>

          {/* แท็บสลับ เข้าสู่ระบบ / สมัคร ID ใหม่ */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#080d18] rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setAuthError('');
                setSuggestRegister(false);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                authTab === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
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
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                authTab === 'register'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              {lang === 'th' ? 'สมัคร ID ใหม่' : 'Register ID'}
            </button>
          </div>

          {/* กล่องแจ้งเตือน Error */}
          {authError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
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
                  className="mt-2.5 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {lang === 'th'
                    ? `สมัครชื่อ "${playerIdInput.trim()}" เป็น ID ใหม่เลย`
                    : `Register "${playerIdInput.trim()}" Now`}
                </button>
              )}
            </div>
          )}

          {authSuccess && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* ฟอร์ม เข้าสู่ระบบ หรือ สมัคร ID */}
          <form
            onSubmit={authTab === 'login' ? handleLogin : handleRegister}
            className="space-y-4"
          >
            {authTab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  {lang === 'th' ? 'เลือกรูปโปรไฟล์ของคุณ' : 'Choose Your Avatar'}
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setSelectedAvatar(av)}
                      className={`h-10 rounded-xl text-xl flex items-center justify-center border transition ${
                        selectedAvatar === av
                          ? 'bg-emerald-500/20 border-emerald-400 scale-105'
                          : 'bg-[#080d18] border-slate-800 hover:border-slate-600'
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
                placeholder={
                  lang === 'th' ? 'เช่น somchai99' : 'e.g. player99'
                }
                className="w-full px-4 py-3 rounded-xl bg-[#080d18] border border-slate-800 focus:border-indigo-500 focus:outline-none text-white text-sm"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-400">
                  {lang === 'th'
                    ? authTab === 'register'
                      ? 'ตั้งรหัส PIN ตัวเลข 4 หลัก'
                      : 'รหัส PIN 4 หลัก'
                    : '4-Digit PIN'}
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
                onChange={(e) =>
                  setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl bg-[#080d18] border border-slate-800 focus:border-indigo-500 focus:outline-none text-white text-center tracking-[0.6em] text-lg font-bold"
                required
              />
            </div>

            {authTab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {lang === 'th'
                    ? 'ยืนยันรหัส PIN 4 หลักอีกครั้ง'
                    : 'Confirm 4-Digit PIN'}
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPinInput}
                  onChange={(e) =>
                    setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder="••••"
                  className="w-full px-4 py-3 rounded-xl bg-[#080d18] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-center tracking-[0.6em] text-lg font-bold"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition flex items-center justify-center gap-2 ${
                authTab === 'login'
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
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

          {/* ปุ่มเข้าเล่นด่วนแบบไม่ต้องสมัคร */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="text-xs text-slate-400 hover:text-indigo-300 transition underline underline-offset-4"
            >
              {lang === 'th'
                ? 'เข้าเล่นแบบไม่ใช้ ID (โหมดทดลองเล่น / เล่นกับเพื่อนในเครื่อง)'
                : 'Continue as Guest (No ID required)'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // แถบด้านบนเมื่อเข้าสู่ระบบแล้ว (TOP NAVBAR)
  // =========================================================================
  const TopBar = () => (
    <div className="w-full max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 mb-6 bg-[#0f1626] border border-slate-800/80 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveRoomCode('');
            setRoomData(null);
            setScreen('lobby');
          }}
          className="w-10 h-10 rounded-xl bg-slate-800/90 flex items-center justify-center text-xl border border-slate-700"
        >
          {user.avatar || '😎'}
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">{user.displayName}</span>
            {!user.isGuest && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                @{user.id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Trophy className="w-3.5 h-3.5" />
              {user.score || 0} {lang === 'th' ? 'คะแนน' : 'pts'}
            </span>
            <span className="flex items-center gap-1 text-orange-400">
              <Flame className="w-3.5 h-3.5" />
              {lang === 'th' ? 'สตรีคสูงสุด:' : 'Best:'} {user.bestStreak || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          {lang === 'th' ? 'TH' : 'EN'}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          {lang === 'th' ? 'ออก' : 'Logout'}
        </button>
      </div>
    </div>
  );

  // =========================================================================
  // 2. หน้าหลักเลือกโหมด (MAIN LOBBY)
  // =========================================================================
  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6">
        <TopBar />

        <div className="w-full max-w-3xl mx-auto space-y-6">
          {/* กติกาเกมแบบกระชับ */}
          <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900 border border-indigo-500/30 rounded-3xl p-5">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-base mb-1">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              {lang === 'th'
                ? 'กติกา: เลือกคำตอบที่คนเลือก "น้อยที่สุด"!'
                : 'Rule: Pick the answer chosen by the FEWEST people!'}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {lang === 'th'
                ? 'ยิ่งตัวเลือกของคุณมีเปอร์เซ็นต์คนตอบน้อยเท่าไหร่ ยิ่งได้คะแนนเยอะ (สวนกระแสอันดับ 1 รับ +150 คะแนน) แต่ถ้าไปตรงกับคำตอบยอดฮิตที่คนเลือกเยอะสุด จะได้ 0 คะแนน!'
                : 'The lower the survey percentage of your choice, the more points you score (+150 pts for the #1 least popular answer). Picking the most popular answer gets 0 pts!'}
            </p>
          </div>

          {/* ตั้งค่าหมวดหมู่และจำนวนข้อ */}
          <div className="bg-[#0f1626] border border-slate-800 rounded-3xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                {lang === 'th' ? 'เลือกหมวดคำถาม' : 'Question Category'}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080d18] border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
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
                {lang === 'th' ? 'จำนวนข้อต่อเกม' : 'Rounds per Game'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 7].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTotalRounds(num)}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition ${
                      totalRounds === num
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-[#080d18] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {num} {lang === 'th' ? 'ข้อ' : 'Q'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* โหมดการเล่นทั้งหมด (ครบทั้ง 3 โหมด) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* โหมด 1: เล่นคนเดียว */}
            <div className="bg-[#0f1626] border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 flex flex-col justify-between transition">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-4">
                  <User className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-base text-white mb-1">
                  {lang === 'th' ? 'เล่นคนเดียว' : 'Solo Mode'}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-5">
                  {lang === 'th'
                    ? 'ทายสวนกระแสสะสมสตรีคและเก็บคะแนนไต่อันดับผู้เล่นสูงสุด'
                    : 'Challenge the crowd survey solo, build win streaks, and climb the leaderboard.'}
                </p>
              </div>
              <button
                type="button"
                disabled={loadingQuestions}
                onClick={startSoloGame}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loadingQuestions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {lang === 'th' ? 'เริ่มเล่นคนเดียว' : 'Play Solo'}
              </button>
            </div>

            {/* โหมด 2: ผู้เล่นหลายคนในเครื่องเดียว (Pass & Play) */}
            <div className="bg-[#0f1626] border border-emerald-500/40 hover:border-emerald-400 rounded-3xl p-5 flex flex-col justify-between transition relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                    2–8 {lang === 'th' ? 'คน' : 'Players'}
                  </span>
                </div>
                <h2 className="font-bold text-base text-white mb-1">
                  {lang === 'th'
                    ? 'ผู้เล่นหลายคนในเครื่องเดียว'
                    : 'Single-Device Multiplayer'}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-5">
                  {lang === 'th'
                    ? 'ผลัดกันแอบกดคำตอบทีละคนบนมือถือหรือคอมเครื่องเดียว แล้วมาลุ้นเฉลยพร้อมกัน'
                    : 'Pass & Play on one phone or computer with secret turn-by-turn picks.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScreen('local_setup')}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                <Users className="w-4 h-4" />
                {lang === 'th' ? 'ตั้งค่าผู้เล่นในเครื่อง' : 'Setup Pass & Play'}
              </button>
            </div>

            {/* โหมด 3: ห้องออนไลน์หลายคน */}
            <div className="bg-[#0f1626] border border-slate-800 hover:border-purple-500/50 rounded-3xl p-5 flex flex-col justify-between transition">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-4">
                  <Wifi className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-base text-white mb-1">
                  {lang === 'th' ? 'ห้องออนไลน์กับเพื่อน' : 'Online Multiplayer'}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {lang === 'th'
                    ? 'สร้างห้องรับรหัส 6 หลัก หรือกรอกรหัสห้องเพื่อเล่นจากคนละเครื่อง'
                    : 'Create a 6-digit room or enter a code to play across devices.'}
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={onlineLoading || loadingQuestions}
                  onClick={createOnlineRoom}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  {onlineLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {lang === 'th' ? 'สร้างห้องออนไลน์ใหม่' : 'Create Room'}
                </button>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    maxLength={6}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder={lang === 'th' ? 'รหัสห้อง' : 'CODE'}
                    className="w-full px-3 py-2 rounded-xl bg-[#080d18] border border-slate-700 text-xs text-white uppercase tracking-wider focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    disabled={onlineLoading}
                    onClick={joinOnlineRoom}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 shrink-0"
                  >
                    {lang === 'th' ? 'เข้า' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {onlineError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{onlineError}</span>
            </div>
          )}

          {/* ตารางอันดับผู้เล่นสูงสุด */}
          {leaderboard.length > 0 && (
            <div className="bg-[#0f1626] border border-slate-800 rounded-3xl p-5">
              <div className="flex items-center gap-2 font-bold text-sm text-white mb-4">
                <Crown className="w-4 h-4 text-amber-400" />
                {lang === 'th'
                  ? 'อันดับนักทายสวนกระแสสูงสุด (Top 5)'
                  : 'Top Reverse Trivia Players'}
              </div>
              <div className="space-y-2">
                {leaderboard.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#080d18] border border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-300'
                            : idx === 1
                            ? 'bg-slate-400/20 text-slate-300'
                            : idx === 2
                            ? 'bg-orange-600/20 text-orange-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-lg">{item.avatar || '😎'}</span>
                      <span className="text-sm font-semibold text-slate-200">
                        {item.displayName || item.id}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-amber-400">
                      {item.score || 0} {lang === 'th' ? 'คะแนน' : 'pts'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. หน้าตั้งค่าผู้เล่นหลายคนในเครื่องเดียว (LOCAL MULTIPLAYER SETUP)
  // =========================================================================
  if (screen === 'local_setup') {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6">
        <TopBar />

        <div className="w-full max-w-xl mx-auto bg-[#0f1626] border border-slate-800 rounded-3xl p-6">
          <button
            type="button"
            onClick={() => setScreen('lobby')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            {lang === 'th' ? 'กลับหน้าหลัก' : 'Back to Lobby'}
          </button>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              {lang === 'th'
                ? 'ผู้เล่นหลายคนในเครื่องเดียว (Pass & Play)'
                : 'Single-Device Multiplayer'}
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold">
              {localPlayers.length} / 8 {lang === 'th' ? 'คน' : 'Players'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            {lang === 'th'
              ? 'แตะที่รูปไอคอนเพื่อเปลี่ยนรูปโปรไฟล์ และพิมพ์ชื่อผู้เล่นแต่ละคนได้เลยครับ'
              : 'Tap an avatar to change it and enter each player name.'}
          </p>

          <div className="space-y-2.5 mb-5">
            {localPlayers.map((player, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 bg-[#080d18] border border-slate-800 p-2.5 rounded-2xl"
              >
                <button
                  type="button"
                  onClick={() => cycleLocalPlayerAvatar(idx)}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-xl flex items-center justify-center shrink-0 border border-slate-700"
                  title={lang === 'th' ? 'กดเพื่อเปลี่ยนไอคอน' : 'Click to change avatar'}
                >
                  {player.avatar}
                </button>
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => updateLocalPlayerName(idx, e.target.value)}
                  placeholder={
                    lang === 'th' ? `ชื่อผู้เล่น ${idx + 1}` : `Player ${idx + 1}`
                  }
                  className="w-full px-3 py-2 rounded-xl bg-transparent border border-slate-800 focus:border-emerald-500 focus:outline-none text-sm text-white"
                />
                {localPlayers.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLocalPlayer(idx)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold"
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
                onClick={addLocalPlayer}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition"
              >
                + {lang === 'th' ? 'เพิ่มผู้เล่น' : 'Add Player'}
              </button>
            )}
            <button
              type="button"
              disabled={loadingQuestions}
              onClick={startLocalGame}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {loadingQuestions ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {lang === 'th' ? 'เริ่มเล่นเลย!' : 'Start Game!'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. หน้าเล่นเกมผู้เล่นหลายคนในเครื่องเดียว (LOCAL MULTIPLAYER GAMEPLAY)
  // =========================================================================
  if (screen === 'local_game') {
    const currentQ = questions[localRound];
    const currentPlayer = localPlayers[localTurnIndex];
    const lowestIdx = currentQ ? getLowestPctIndex(currentQ.options) : 0;

    if (localFinished) {
      const sorted = [...localPlayers].sort((a, b) => b.score - a.score);
      return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6">
          <TopBar />
          <div className="w-full max-w-xl mx-auto bg-[#0f1626] border border-slate-800 rounded-3xl p-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 text-3xl">
              👑
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {lang === 'th' ? 'สรุปผลผู้ชนะ!' : 'Final Standings!'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              {lang === 'th'
                ? `ผู้ชนะคือ ${sorted[0]?.name} ด้วยคะแนน ${sorted[0]?.score} แต้ม!`
                : `${sorted[0]?.name} wins with ${sorted[0]?.score} points!`}
            </p>

            <div className="space-y-2.5 mb-6 text-left">
              {sorted.map((p, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-[#080d18] border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm w-6 text-center text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="text-2xl">{p.avatar}</span>
                    <span className="font-bold text-sm text-white">{p.name}</span>
                  </div>
                  <span className="font-bold text-amber-400 text-sm">
                    {p.score} {lang === 'th' ? 'คะแนน' : 'pts'}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startLocalGame}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {lang === 'th' ? 'เล่นอีกรอบ' : 'Play Again'}
              </button>
              <button
                type="button"
                onClick={() => setScreen('lobby')}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
              >
                {lang === 'th' ? 'กลับหน้าหลัก' : 'Main Lobby'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6">
        <TopBar />

        <div className="w-full max-w-xl mx-auto bg-[#0f1626] border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
            <span className="font-bold text-emerald-400">
              {lang === 'th'
                ? `ข้อที่ ${localRound + 1} / ${questions.length}`
                : `Round ${localRound + 1} / ${questions.length}`}
            </span>
            <span>
              {questionSource === 'ai' ? '✨ Gemini AI' : '🎲 Classic Pack'}
            </span>
          </div>

          {/* หน้าจอบังคำตอบเวลาส่งเครื่องให้คนถัดไป */}
          {!localReveal && localPrivacyScreen ? (
            <div className="py-10 text-center space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-4xl mx-auto">
                {currentPlayer.avatar}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-400 font-bold mb-1">
                  {lang === 'th'
                    ? `คิวที่ ${localTurnIndex + 1} จาก ${localPlayers.length} คน`
                    : `Player ${localTurnIndex + 1} of ${localPlayers.length}`}
                </p>
                <h2 className="text-2xl font-bold text-white">
                  {lang === 'th'
                    ? `ส่งเครื่องให้ "${currentPlayer.name}"`
                    : `Pass device to "${currentPlayer.name}"`}
                </h2>
                <p className="text-xs text-slate-400 mt-1.5">
                  {lang === 'th'
                    ? 'คนอื่นห้ามแอบดูหน้าจอนะ! กดปุ่มด้านล่างเมื่อพร้อมเลือกคำตอบ'
                    : 'No peeking! Tap below when ready to pick secretly.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPrivacyScreen(false)}
                className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition"
              >
                {lang === 'th'
                  ? `ฉันคือ ${currentPlayer.name} — พร้อมตอบ!`
                  : `I am ${currentPlayer.name} — Ready!`}
              </button>
            </div>
          ) : !localReveal ? (
            /* หน้าเลือกคำตอบแบบลับของแต่ละคน */
            <div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4 w-fit">
                <span>{currentPlayer.avatar}</span>
                <span>
                  {lang === 'th'
                    ? `กำลังเลือกคำตอบของ: ${currentPlayer.name}`
                    : `Picking for: ${currentPlayer.name}`}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white leading-snug mb
