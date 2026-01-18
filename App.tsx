import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Users, BrainCircuit, History, X, Settings, Plus, Trash2, Pencil, Check, Ban, AlertTriangle, FileText, Flag, Download, Copy, ClipboardCheck, MessageSquareQuote, Users2, Stethoscope, ListTodo, Flame, Snowflake, Mail, Calendar, Clock, NotebookPen, CornerDownLeft, HelpCircle, MousePointerClick, Move, GraduationCap, Trophy, MinusCircle, PlusCircle, PenTool, Upload, Terminal, Hash, Undo2 } from 'lucide-react';
import { Player, GameEvent, GameState, GameMode, SavedGame, Team } from './types';
import { PlayerCard } from './components/PlayerCard';

// ANONYMIZED DEFAULT ROSTER
const DEFAULT_ROSTER: Player[] = [
  { id: 'p1', name: 'Pelaaja 1', number: 4, isOnCourt: false, secondsPlayed: 0, points: 0, isFouledOut: false, consecutiveSecondsOnCourt: 0, consecutiveSecondsOnBench: 0 },
  { id: 'p2', name: 'Pelaaja 2', number: 5, isOnCourt: false, secondsPlayed: 0, points: 0, isFouledOut: false, consecutiveSecondsOnCourt: 0, consecutiveSecondsOnBench: 0 },
  { id: 'p3', name: 'Pelaaja 3', number: 6, isOnCourt: false, secondsPlayed: 0, points: 0, isFouledOut: false, consecutiveSecondsOnCourt: 0, consecutiveSecondsOnBench: 0 },
  { id: 'p4', name: 'Pelaaja 4', number: 7, isOnCourt: false, secondsPlayed: 0, points: 0, isFouledOut: false, consecutiveSecondsOnCourt: 0, consecutiveSecondsOnBench: 0 },
  { id: 'p5', name: 'Pelaaja 5', number: 8, isOnCourt: false, secondsPlayed: 0, points: 0, isFouledOut: false, consecutiveSecondsOnCourt: 0, consecutiveSecondsOnBench: 0 },
];

const CHANGELOG = [
  { date: '2025-05-24 11:00', desc: 'Päivitys: Värikoodaus myös juuri kentälle tulleille (Vihreä/Salama) ja näkyvyys vaihtovalikossa.' },
  { date: '2025-05-24 10:30', desc: 'Päivitys: Vaihtopenkin älykäs järjestys. Juuri kentältä tulleet (90s huili) näkyvät harmaalla ja siirtyvät listan hännille.' },
  { date: '2025-05-24 10:00', desc: 'Helppokäyttöisyys: "Peruuta" -toiminto, automaattinen erätuloksen kirjaus ja pikapisteet yläpalkkiin.' },
];

const TODO_LIST = [
  { title: "Peruuta (Undo)", desc: "Mahdollisuus peruuttaa viimeisin toiminto.", status: 'DONE' },
  { title: "Automaattikirjaus", desc: "Kirjaa erätulos automaattisesti muistioon erän vaihtuessa.", status: 'DONE' },
  { title: "Älykäs penkki", desc: "Värikoodaus juuri kentältä tulleille.", status: 'DONE' },
  { title: "Virhelaskuri (1-5)", desc: "Pelaajalle 5 pallukkaa virheiden seurantaan.", status: 'TODO' },
];

// Interface for History Snapshot
interface HistorySnapshot {
    players: Player[];
    gameState: GameState;
    events: GameEvent[];
    scoreUs: number;
    scoreThem: number;
    notesList: string[];
}

// Time in seconds a player is considered "Cooling Down" after subbing out OR "Fresh" after subbing in
const COOLDOWN_THRESHOLD = 90; 

export default function App() {
  const [players, setPlayers] = useState<Player[]>(DEFAULT_ROSTER);
  const [savedTeams, setSavedTeams] = useState<Team[]>([]); 
  const [gameState, setGameState] = useState<GameState>({
    isRunning: false,
    period: 1,
    gameClockSeconds: 0,
  });
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.FOUR_VS_FOUR);
  
  // UI State
  const [swapModalPlayer, setSwapModalPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<'LOG' | 'NOTES' | 'POINTS'>('LOG');
  
  const [isManagePlayersOpen, setIsManagePlayersOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isTodoOpen, setIsTodoOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  
  // Notes State
  const [notesList, setNotesList] = useState<string[]>(['']);
  const noteRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Points State
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);
  const [scoreUs, setScoreUs] = useState(0); 
  const [scoreThem, setScoreThem] = useState(0); 

  // History / Undo State
  const [historyStack, setHistoryStack] = useState<HistorySnapshot[]>([]);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);

  // End Game State
  const [isEndGameModalOpen, setIsEndGameModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [downloadReport, setDownloadReport] = useState(true);
  const [gameName, setGameName] = useState(''); 
  const [gameNotes, setGameNotes] = useState('');
  
  // AI Prompt State
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Player Management State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing State
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerNumber, setEditPlayerNumber] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Load Data on Mount ---
  useEffect(() => {
    const loadedHistory = localStorage.getItem('juniorBasketHistory');
    if (loadedHistory) {
        try { setSavedGames(JSON.parse(loadedHistory)); } catch (e) { console.error("History parse error", e); }
    }
    const loadedTeams = localStorage.getItem('juniorBasketTeams');
    if (loadedTeams) {
        try { setSavedTeams(JSON.parse(loadedTeams)); } catch (e) { console.error("Teams parse error", e); }
    }
  }, []);

  // --- Timer ---
  useEffect(() => {
    if (gameState.isRunning) {
      timerRef.current = setInterval(() => {
        setGameState(prev => ({ ...prev, gameClockSeconds: prev.gameClockSeconds + 1 }));
        setPlayers(prev => prev.map(p => {
          if (p.isInjured) return p; 
          if (p.isOnCourt) {
             return { 
                ...p, 
                secondsPlayed: p.secondsPlayed + 1,
                consecutiveSecondsOnCourt: (p.consecutiveSecondsOnCourt || 0) + 1,
                consecutiveSecondsOnBench: 0
             };
          } else {
             return {
                ...p,
                consecutiveSecondsOnCourt: 0,
                consecutiveSecondsOnBench: (p.consecutiveSecondsOnBench || 0) + 1
             };
          }
        }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.isRunning]);

  // --- UNDO SYSTEM ---
  const saveSnapshot = () => {
      // Limit stack size to 20
      setHistoryStack(prev => {
          const snapshot: HistorySnapshot = {
              players: JSON.parse(JSON.stringify(players)),
              gameState: JSON.parse(JSON.stringify(gameState)),
              events: JSON.parse(JSON.stringify(events)),
              scoreUs,
              scoreThem,
              notesList: JSON.parse(JSON.stringify(notesList))
          };
          const newStack = [snapshot, ...prev];
          return newStack.slice(0, 20);
      });
  };

  const handleUndo = () => {
      if (historyStack.length === 0) return;
      const previousState = historyStack[0];
      const remainingStack = historyStack.slice(1);

      // Restore states
      setPlayers(previousState.players);
      setGameState(previousState.gameState);
      setEvents(previousState.events);
      setScoreUs(previousState.scoreUs);
      setScoreThem(previousState.scoreThem);
      setNotesList(previousState.notesList);

      setHistoryStack(remainingStack);
  };

  // --- Helpers ---
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const addEvent = (type: GameEvent['type'], description: string) => {
    const newEvent: GameEvent = {
      id: Date.now().toString(),
      type,
      description,
      timestamp: formatTime(gameState.gameClockSeconds),
      period: gameState.period,
    };
    setEvents(prev => [newEvent, ...prev]);
  };

  const getPeriodStyle = (period: number) => {
      switch(period) {
          case 1: return 'bg-white border-l-4 border-l-zinc-300';
          case 2: return 'bg-zinc-100 border-l-4 border-l-zinc-500';
          case 3: return 'bg-yellow-50 border-l-4 border-l-yellow-400';
          case 4: return 'bg-blue-50 border-l-4 border-l-blue-500';
          default: return 'bg-red-50 border-l-4 border-l-red-500';
      }
  };

  // --- Notes Handlers ---
  const handleNoteChange = (index: number, value: string) => {
    const newNotes = [...notesList];
    newNotes[index] = value;
    setNotesList(newNotes);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newNotes = [...notesList];
      newNotes.splice(index + 1, 0, '');
      setNotesList(newNotes);
      setTimeout(() => {
          if (noteRefs.current[index + 1]) {
              noteRefs.current[index + 1]?.focus();
          }
      }, 0);
    } else if (e.key === 'Backspace' && notesList[index] === '' && notesList.length > 1) {
      e.preventDefault();
      const newNotes = [...notesList];
      newNotes.splice(index, 1);
      setNotesList(newNotes);
      setTimeout(() => {
          if (noteRefs.current[index - 1]) {
              noteRefs.current[index - 1]?.focus();
          }
      }, 0);
    }
  };

  const deleteNote = (index: number) => {
      if (notesList.length === 1) {
          setNotesList(['']);
          return;
      }
      const newNotes = [...notesList];
      newNotes.splice(index, 1);
      setNotesList(newNotes);
  };

  const logScoreToNotes = (manual = true) => {
      if (manual) saveSnapshot();
      const scoreString = `Erä ${gameState.period} tilanne: Me ${scoreUs} - Vastustaja ${scoreThem}`;
      if (manual) addEvent('SCORE', `Väliaikatulos kirjattu: ${scoreUs}-${scoreThem}`);
      
      const newNotes = [...notesList];
      // Append nicely
      if (newNotes[newNotes.length - 1] === '') {
          newNotes[newNotes.length - 1] = scoreString;
          newNotes.push('');
      } else {
          newNotes.push(scoreString);
          newNotes.push('');
      }
      setNotesList(newNotes);
      if (manual) setIsScoreModalOpen(false);
  };

  const handleQuickScore = (team: 'US' | 'THEM') => {
      saveSnapshot();
      if (team === 'US') {
          setScoreUs(prev => prev + 1);
      } else {
          setScoreThem(prev => prev + 1);
      }
  };

  // --- Game Actions ---
  const toggleTimer = () => {
    const newState = !gameState.isRunning;
    setGameState(prev => ({ ...prev, isRunning: newState }));
    addEvent(newState ? 'START' : 'PAUSE', newState ? 'Pelikello käynnistetty' : 'Pelikello pysäytetty');
  };

  const handleNextPeriodClick = () => {
    setGameState(prev => ({ ...prev, isRunning: false }));
    setIsPeriodModalOpen(true);
  };

  const confirmNextPeriod = (keepLineup: boolean) => {
      saveSnapshot();
      
      // 1. Auto-log score before changing period
      logScoreToNotes(false); // False = auto mode
      addEvent('PERIOD_END', `Erä ${gameState.period} päättyi (${scoreUs}-${scoreThem}).`);

      // 2. Change Period
      setGameState(prev => ({ ...prev, period: prev.period + 1 }));
      
      if (keepLineup) {
         // No lineup change
      } else {
          // Move everyone to bench
          setPlayers(prev => prev.map(p => ({
              ...p,
              isOnCourt: false,
              consecutiveSecondsOnCourt: 0 
          })));
      }
      setIsPeriodModalOpen(false);
  };

  const resetGame = () => {
      saveSnapshot();
      setPlayers(prev => prev.map(p => ({
          ...p,
          isOnCourt: false,
          secondsPlayed: 0,
          points: 0,
          isFouledOut: false,
          isInjured: false,
          consecutiveSecondsOnCourt: 0,
          consecutiveSecondsOnBench: 0,
          lastSubOutTime: undefined,
          lastSubInTime: undefined
      })));
      setGameState({
          isRunning: false,
          period: 1,
          gameClockSeconds: 0
      });
      setEvents([]);
      setGameName('');
      setGameNotes('');
      setNotesList(['']); 
      setScoreUs(0);
      setScoreThem(0);
      setGeneratedPrompt(null);
      setIsCopied(false);
      setIsCorrectionMode(false);
      setHistoryStack([]); // Clear history on reset
  };

  const loadRoster = (roster: Player[]) => {
      saveSnapshot();
      const newRoster = roster.map(p => ({
          ...p,
          isOnCourt: false,
          secondsPlayed: 0,
          points: 0,
          isFouledOut: false,
          isInjured: false,
          consecutiveSecondsOnCourt: 0,
          consecutiveSecondsOnBench: 0
      }));
      setPlayers(newRoster);
      resetGame(); 
  };

  const deleteHistoryItem = (id: string) => {
      const updated = savedGames.filter(g => g.id !== id);
      setSavedGames(updated);
      localStorage.setItem('juniorBasketHistory', JSON.stringify(updated));
  };

  const openEndGameModal = () => {
      const compiledNotes = notesList.filter(n => n.trim() !== '').join('\n');
      setGameNotes(compiledNotes);
      setIsEndGameModalOpen(true);
  }

  const constructGamePrompt = () => {
    const stats = players.map(p => 
        `${p.name}: ${Math.floor(p.secondsPlayed / 60)} min`
    ).join(', ');

    const injured = players.filter(p => p.isInjured).map(p => p.name).join(', ');
    const injuredTxt = injured ? ` (Loukkaantumiset: ${injured})` : "";

    const scoreText = (scoreUs > 0 || scoreThem > 0) 
        ? `Tulos: Me ${scoreUs} - Vastustaja ${scoreThem}` 
        : "Tulos: (Ei merkitty)";

    return `Kirjoita kolme erilaista viestiä juniorijoukkueen vanhempien WhatsApp-ryhmään pelin jälkeen.
    
TIEDOT:
- Vastustaja: ${gameName || "Tuntematon"}
- ${scoreText}
- Valmentajan huomiot pelistä: ${gameNotes || "Ei erityisiä huomioita."}
- Peliajat (taustatietoa): ${stats}
${injuredTxt}

LUO NÄMÄ KOLME VERSIOTA:
1. TSEMPPI: Energinen, iloinen, paljon emojeita (koripallo, tuli, hauishymiö). Korosta hyvää fiilistä!
2. ASIALLINEN: Lyhyt, ytimekäs ja informatiivinen. Vältä liiallista hehkutusta. Faktat selkeästi.
3. ANALYYTTINEN: Korosta oppimista ja pelitavallisia asioita. Opettavainen sävy.

OHJEET:
- Viestien pituus max 100 sanaa per versio.
- Aloita jokainen versio selkeällä otsikolla (esim. "--- TSEMPPI ---").
`;
};

  const handleGeneratePrompt = () => {
      saveSnapshot(); // Save before finishing just in case
      setGameState(prev => ({ ...prev, isRunning: false }));
      const prompt = constructGamePrompt();
      setGeneratedPrompt(prompt);
      
      const fullNotes = `${gameNotes}\n\nTulos: ${scoreUs} - ${scoreThem}`;
      const newSavedGame: SavedGame = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          name: gameName || "Nimetön peli",
          gameMode: gameMode,
          durationSeconds: gameState.gameClockSeconds,
          players: players,
          events: events,
          notes: fullNotes,
          scoreUs: scoreUs,
          scoreThem: scoreThem
      };
      
      const updatedHistory = [newSavedGame, ...savedGames];
      setSavedGames(updatedHistory);
      localStorage.setItem('juniorBasketHistory', JSON.stringify(updatedHistory));
  };

  const copyPromptToClipboard = () => {
    if (generatedPrompt) {
        navigator.clipboard.writeText(generatedPrompt);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleFinishGame = () => {
      saveSnapshot();
      setGameState(prev => ({ ...prev, isRunning: false }));
      
      if (!generatedPrompt) {
          const fullNotes = `${gameNotes}\n\nTulos: ${scoreUs} - ${scoreThem}`;
          const newSavedGame: SavedGame = {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              name: gameName || "Nimetön peli",
              gameMode: gameMode,
              durationSeconds: gameState.gameClockSeconds,
              players: players,
              events: events,
              notes: fullNotes,
              scoreUs: scoreUs,
              scoreThem: scoreThem
          };
          const updatedHistory = [newSavedGame, ...savedGames];
          setSavedGames(updatedHistory);
          localStorage.setItem('juniorBasketHistory', JSON.stringify(updatedHistory));
      }

      if (downloadReport) {
          handleDownloadReport();
      }
      closeEndGameModal();
  };

  const handleDownloadReport = () => {
      const date = new Date().toLocaleString('fi-FI');
      let content = `KOBRAT JUNIORIT - PELIRAPORTTI\n`;
      content += `=====================================\n`;
      content += `Päivämäärä: ${date}\n`;
      content += `Ottelu: ${gameName || 'Nimetön peli'}\n`;
      content += `Tulos: Me ${scoreUs} vs Vastustaja ${scoreThem}\n`;
      content += `Kokonaisaika: ${formatTime(gameState.gameClockSeconds)}\n\n`;
      
      if (gameNotes) {
          content += `HUOMIOT:\n${gameNotes}\n\n`;
      }

      content += `PELAAJATILASTOT:\n`;
      content += `----------------------------\n`;
      const sortedPlayers = [...players].sort((a,b) => b.secondsPlayed - a.secondsPlayed);
      sortedPlayers.forEach(p => {
          content += `#${p.number.toString().padEnd(3)} ${p.name.padEnd(20)} ${Math.floor(p.secondsPlayed / 60)}m ${p.secondsPlayed % 60}s | ${p.points} pst ${p.isFouledOut ? '(ULOS)' : ''} ${p.isInjured ? '(LOUK)' : ''}\n`;
      });

      content += `\n\nPELILOKI:\n`;
      content += `----------------------------\n`;
      const chronologicalEvents = [...events].reverse();
      chronologicalEvents.forEach(e => {
          content += `[Erä ${e.period} | ${e.timestamp}] ${e.description}\n`;
      });

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kobrat_peli_${(gameName || 'raportti').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const closeEndGameModal = () => {
      resetGame();
      setIsEndGameModalOpen(false);
  };

  // --- Scoring Logic ---
  const handleScore = (playerId: string, points: number) => {
      saveSnapshot();
      const realPoints = isCorrectionMode ? -points : points;
      
      setScoreUs(prev => Math.max(0, prev + realPoints));

      setPlayers(prev => prev.map(p => {
          if (p.id !== playerId) return p;
          const newPoints = p.points + realPoints;
          return { ...p, points: Math.max(0, newPoints) }; 
      }));

      const player = players.find(p => p.id === playerId);
      if (player) {
          const sign = realPoints > 0 ? '+' : '';
          const desc = isCorrectionMode 
            ? `${player.name} ${realPoints} pistettä (KORJAUS)` 
            : `${player.name} ${sign}${realPoints} pistettä`;
            
          addEvent('SCORE', desc);
      }
  };

  // --- Substitution Logic ---
  const executeSwap = (playerIn: Player | null, playerOut: Player | null) => {
    if (!playerIn && !playerOut) return;
    
    if (playerIn?.isFouledOut || playerOut?.isFouledOut) return;
    if (playerIn?.isInjured || playerOut?.isInjured) return; 

    saveSnapshot();

    setPlayers(prev => prev.map(p => {
      // Logic for SWAP
      if (playerIn && p.id === playerIn.id) {
          return { 
              ...p, 
              isOnCourt: true, 
              consecutiveSecondsOnBench: 0,
              lastSubInTime: gameState.gameClockSeconds // NEW: Mark entry time
          };
      }
      if (playerOut && p.id === playerOut.id) {
          return { 
              ...p, 
              isOnCourt: false, 
              consecutiveSecondsOnCourt: 0,
              lastSubOutTime: gameState.gameClockSeconds // Mark exit time
          };
      }
      return p;
    }));

    if (playerIn && playerOut) {
      addEvent('SUBSTITUTION', `${playerIn.name} (Sisään) ↔ ${playerOut.name} (Ulos)`);
    } else if (playerIn) {
      addEvent('SUBSTITUTION', `${playerIn.name} kentälle`);
    } else if (playerOut) {
      addEvent('SUBSTITUTION', `${playerOut.name} vaihtoon`);
    }

    setSwapModalPlayer(null);
  };

  const handleFoulOut = (player: Player) => {
      saveSnapshot();
      setPlayers(prev => prev.map(p => 
          p.id === player.id ? { ...p, isFouledOut: true, isOnCourt: false } : p
      ));
      addEvent('FOUL_OUT', `${player.name} ulosajo (5 virhettä)`);
      setSwapModalPlayer(null);
  };

  const handleToggleInjury = (player: Player) => {
    saveSnapshot();
    const isNowInjured = !player.isInjured;
    setPlayers(prev => prev.map(p => 
        p.id === player.id ? { ...p, isInjured: isNowInjured, isOnCourt: isNowInjured ? false : p.isOnCourt } : p
    ));
    if (isNowInjured) {
        addEvent('INJURY', `${player.name} merkittiin loukkaantuneeksi`);
    } else {
        addEvent('RECOVERY', `${player.name} palasi pelikuntoon`);
    }
    setSwapModalPlayer(null);
  };

  const handlePlayerClick = (clickedPlayer: Player) => {
    if (clickedPlayer.isFouledOut || clickedPlayer.isInjured) {
        setSwapModalPlayer(clickedPlayer);
        return;
    }

    if (clickedPlayer.isOnCourt) {
       setSwapModalPlayer(clickedPlayer); 
    } else {
       const courtCount = players.filter(p => p.isOnCourt).length;
       if (courtCount < gameMode) {
         executeSwap(clickedPlayer, null);
       } else {
         setSwapModalPlayer(clickedPlayer); 
       }
    }
  };

  // Drag and drop wrappers
  const onDragStart = (e: React.DragEvent, player: Player) => {
    if (player.isFouledOut || player.isInjured) return;
    e.dataTransfer.setData("playerId", player.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (e: React.DragEvent, targetPlayer: Player | 'BENCH' | 'COURT') => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("playerId");
    const draggedPlayer = players.find(p => p.id === draggedId);
    if (!draggedPlayer || draggedPlayer.isFouledOut || draggedPlayer.isInjured) return;

    if (typeof targetPlayer !== 'string') {
        if (targetPlayer.isFouledOut || targetPlayer.isInjured) return;
    }

    if (targetPlayer === 'COURT') {
        const courtCount = players.filter(p => p.isOnCourt).length;
        if (!draggedPlayer.isOnCourt && courtCount < gameMode) {
            executeSwap(draggedPlayer, null);
        }
    } else if (targetPlayer === 'BENCH') {
        if (draggedPlayer.isOnCourt) {
            executeSwap(null, draggedPlayer);
        }
    } else if (typeof targetPlayer !== 'string') {
        if (draggedPlayer.isOnCourt !== targetPlayer.isOnCourt) {
            const playerIn = draggedPlayer.isOnCourt ? targetPlayer : draggedPlayer;
            const playerOut = draggedPlayer.isOnCourt ? draggedPlayer : targetPlayer;
            executeSwap(playerIn, playerOut);
        }
    }
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  // --- Player Management ---
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    saveSnapshot();
    if (newPlayerName && newPlayerNumber) {
        const newPlayer: Player = {
            id: Date.now().toString(),
            name: newPlayerName,
            number: parseInt(newPlayerNumber),
            isOnCourt: false,
            secondsPlayed: 0,
            points: 0,
            isFouledOut: false,
            consecutiveSecondsOnCourt: 0,
            consecutiveSecondsOnBench: 0
        };
        setPlayers([...players, newPlayer]);
        setNewPlayerName('');
        setNewPlayerNumber('');
    }
  };

  const handleDeletePlayer = (id: string) => {
      saveSnapshot();
      setPlayers(prev => prev.filter(p => p.id !== id));
      if (editingPlayerId === id) setEditingPlayerId(null);
  };

  const handleStartEdit = (player: Player) => {
      setEditingPlayerId(player.id);
      setEditPlayerName(player.name);
      setEditPlayerNumber(player.number.toString());
  };

  const handleCancelEdit = () => {
      setEditingPlayerId(null);
      setEditPlayerName('');
      setEditPlayerNumber('');
  };

  const handleSaveEdit = (id: string) => {
      if (editPlayerName && editPlayerNumber) {
          saveSnapshot();
          setPlayers(prev => prev.map(p => 
              p.id === id 
                  ? { ...p, name: editPlayerName, number: parseInt(editPlayerNumber) }
                  : p
          ));
          handleCancelEdit();
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (Array.isArray(json)) {
                  setSavedTeams(json);
                  localStorage.setItem('juniorBasketTeams', JSON.stringify(json));
              } else {
                  alert("Virheellinen tiedostomuoto. Odotettiin listaa joukkueista.");
              }
          } catch (error) {
              alert("Virhe tiedoston luvussa: " + error);
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileUpload = () => {
      fileInputRef.current?.click();
  };

  const courtPlayers = players.filter(p => p.isOnCourt);
  
  // BENCH SORTING LOGIC
  const benchPlayers = players
      .filter(p => !p.isOnCourt)
      .sort((a, b) => {
          const now = gameState.gameClockSeconds;
          // Check if players are "Cooling Down" (subbed out recently)
          // Default to -9999 so math works if undefined
          const aJustOut = (now - (a.lastSubOutTime || -9999)) < COOLDOWN_THRESHOLD; 
          const bJustOut = (now - (b.lastSubOutTime || -9999)) < COOLDOWN_THRESHOLD;

          // 1. Cooling down players go to bottom
          if (aJustOut && !bJustOut) return 1; // A is cooling, B is ready -> A goes down
          if (!aJustOut && bJustOut) return -1; // B is cooling, A is ready -> B goes down

          // 2. Otherwise sort by total playing time (Least played at top)
          return a.secondsPlayed - b.secondsPlayed;
      });

  return (
    // ROOT
    <div className="h-full w-full bg-zinc-100 font-sans flex flex-col overflow-hidden text-zinc-900">
      
      {/* 1. HEADER */}
      <header className="bg-zinc-900 text-white p-2 md:p-3 shrink-0 border-b-4 border-black z-20 flex justify-between items-center relative">
          <div className="flex flex-col">
             <span className="text-[10px] md:text-xs text-zinc-400 uppercase tracking-widest font-bold">Peliaika</span>
             <span className="text-2xl md:text-3xl font-mono font-bold leading-none text-yellow-400 tracking-tighter">
               {formatTime(gameState.gameClockSeconds)}
             </span>
          </div>
          
          {/* Team Score Display - QUICK ACTIONS */}
          <div className="flex items-center gap-1 md:gap-2">
             {/* Us */}
             <div className="flex flex-col items-center">
                 <span className="text-[9px] text-zinc-500 uppercase font-bold mb-0.5">Me</span>
                 <div className="flex items-center bg-zinc-800 rounded-sm border border-zinc-700 overflow-hidden">
                     <button 
                        onClick={() => setIsScoreModalOpen(true)}
                        className="px-3 py-1 text-2xl font-mono font-bold text-yellow-400 hover:bg-zinc-700"
                    >
                        {scoreUs}
                     </button>
                     <button 
                        onClick={() => handleQuickScore('US')}
                        className="bg-zinc-700 hover:bg-zinc-600 text-white p-1 h-full flex items-center justify-center border-l border-zinc-600 active:bg-zinc-500"
                     >
                         <Plus size={16} />
                     </button>
                 </div>
             </div>

             <span className="text-zinc-600 font-bold mt-4">-</span>

             {/* Them */}
             <div className="flex flex-col items-center">
                 <span className="text-[9px] text-zinc-500 uppercase font-bold mb-0.5">Vast</span>
                 <div className="flex items-center bg-zinc-800 rounded-sm border border-zinc-700 overflow-hidden">
                     <button 
                         onClick={() => handleQuickScore('THEM')}
                         className="bg-zinc-700 hover:bg-zinc-600 text-white p-1 h-full flex items-center justify-center border-r border-zinc-600 active:bg-zinc-500"
                     >
                         <Plus size={16} />
                     </button>
                     <button 
                        onClick={() => setIsScoreModalOpen(true)}
                        className="px-3 py-1 text-2xl font-mono font-bold text-white hover:bg-zinc-700"
                     >
                        {scoreThem}
                     </button>
                 </div>
             </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
             <div className="mr-1 md:mr-2 text-right hidden sm:block">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Erä</div>
                <div className="text-xl md:text-2xl font-bold font-mono leading-none">{gameState.period}</div>
             </div>
             
             {/* End Game Button */}
             <button 
                onClick={openEndGameModal}
                className="bg-black text-white border border-zinc-700 h-10 w-10 md:h-12 md:w-12 flex items-center justify-center hover:bg-zinc-800 hover:border-white transition-all mr-1"
                title="Päätä peli"
             >
                 <Flag size={18} />
             </button>

             {/* Next Period */}
             <button 
                onClick={handleNextPeriodClick} 
                className="bg-white text-black h-10 px-3 md:h-12 md:px-5 text-xs md:text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all hover:bg-zinc-100"
             >
                <RotateCcw size={16}/> 
                <span className="hidden md:inline">Erä</span>
             </button>

             <button 
                onClick={toggleTimer}
                className={`h-10 w-14 md:h-12 md:w-20 flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all 
                ${gameState.isRunning 
                    ? 'bg-yellow-400 text-black hover:bg-yellow-500' 
                    : 'bg-white text-black hover:bg-zinc-100 animate-[pulse_1.5s_ease-in-out_infinite] ring-4 ring-yellow-400/50'}`}
             >
                {gameState.isRunning ? <Pause size={20} className="md:w-7 md:h-7" fill="currentColor" /> : <Play size={20} className="md:w-7 md:h-7" fill="currentColor" />}
             </button>
          </div>
      </header>

      {/* 2. MAIN CONTENT - Two Columns on iPad */}
      <main className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 p-2 md:p-4 overflow-hidden min-h-0">
        
        {/* LEFT COLUMN (Court + Tabs) */}
        <div className="flex-1 flex flex-col gap-2 md:gap-4 min-h-0">
            
            {/* TOP LEFT: COURT (50% approx) */}
            <section 
                className="flex-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative min-h-0 flex flex-col"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, 'COURT')}
            >
                <div className="bg-white border-b-2 border-black p-2 md:p-3 shrink-0 flex justify-between items-center">
                    <h2 className="font-bold text-black uppercase tracking-wide flex items-center gap-2 text-sm md:text-base">
                        <Users size={18} className="text-black"/>
                        Kenttä <span className="font-mono">({courtPlayers.length}/{gameMode})</span>
                    </h2>
                    {courtPlayers.length < gameMode && (
                        <span className="text-[10px] md:text-xs bg-black text-white px-2 py-0.5 font-bold uppercase animate-pulse">
                            ! Vajaamiehitys
                        </span>
                    )}
                </div>
                
                <div className="p-2 md:p-3 bg-zinc-50 flex-1 overflow-y-auto min-h-0" style={{backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                        {courtPlayers.map(player => (
                            <PlayerCard 
                                key={player.id} 
                                player={player} 
                                variant="COURT" 
                                onClick={handlePlayerClick}
                                isDraggable={true}
                                onDragStart={onDragStart}
                                onDrop={onDrop}
                                // Pass isFresh prop
                                isFresh={(gameState.gameClockSeconds - (player.lastSubInTime || -9999)) < COOLDOWN_THRESHOLD}
                            />
                        ))}
                        {courtPlayers.length === 0 && (
                            <div className="col-span-2 flex flex-col items-center justify-center h-full text-zinc-400 border-2 border-dashed border-zinc-300">
                                <p className="text-sm font-mono uppercase">Raahaa pelaajia tähän</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* BOTTOM LEFT: LOG TABS & AI COACH (50% approx) */}
            <section className="flex-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col min-h-0">
                {/* Tabs Header */}
                <div className="flex border-b-4 border-black shrink-0 bg-zinc-50">
                    <button 
                        onClick={() => setActiveTab('LOG')}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-r-2 border-black transition-colors ${activeTab === 'LOG' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-zinc-200'}`}
                    >
                        <History size={16} /> <span className="hidden sm:inline">Loki</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('NOTES')}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'NOTES' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-zinc-200'}`}
                    >
                        <NotebookPen size={16} /> <span className="hidden sm:inline">Muistio</span>
                    </button>
                </div>

                {/* Tab Content - Rigid Container */}
                <div className="flex-1 relative bg-white min-h-0">
                    
                    {activeTab === 'NOTES' && (
                        <div className="absolute inset-0 overflow-y-auto p-4">
                            <div className="space-y-3">
                                {notesList.map((note, index) => (
                                    <div key={index} className="flex items-center gap-2 group">
                                        <input
                                            ref={el => noteRefs.current[index] = el}
                                            type="text"
                                            value={note}
                                            onChange={(e) => handleNoteChange(index, e.target.value)}
                                            onKeyDown={(e) => handleNoteKeyDown(e, index)}
                                            placeholder={index === 0 ? "Kirjoita huomioita..." : ""}
                                            className="w-full bg-zinc-50 border-2 border-dashed border-zinc-300 focus:border-solid focus:border-black focus:bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 font-mono text-base transition-all placeholder:text-zinc-400"
                                            autoFocus={index === notesList.length - 1 && notesList.length > 1}
                                        />
                                        <button 
                                            onClick={() => deleteNote(index)}
                                            className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
                                            tabIndex={-1}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                                <CornerDownLeft size={10} /> Paina Enter uudelle riville
                            </div>
                        </div>
                    )}

                    {activeTab === 'POINTS' && (
                        <div className="absolute inset-0 p-1 flex flex-col h-full bg-zinc-50">
                            {/* Correction Toggle & Header - Compact */}
                            <div className="flex justify-between items-center px-1 mb-1 shrink-0 h-8">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    {courtPlayers.length > 0 ? "Kirjaa pisteet" : ""}
                                </span>
                                <button 
                                    onClick={() => setIsCorrectionMode(!isCorrectionMode)}
                                    className={`flex items-center gap-1 px-2 py-1 border border-black text-[10px] font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-y-[1px]
                                    ${isCorrectionMode ? 'bg-red-100 text-red-600 border-red-500' : 'bg-white text-zinc-600 hover:bg-zinc-100'}`}
                                >
                                    <PenTool size={10} />
                                    {isCorrectionMode ? "Korjaustila" : "Korjaus"}
                                </button>
                            </div>

                            {/* Player List for Scoring - Flex-1 to fill space */}
                            {courtPlayers.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-300 m-2">
                                    <p className="text-zinc-400 font-mono text-xs uppercase">Ei pelaajia kentällä</p>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-y-auto">
                                    {courtPlayers.map(player => (
                                        <div key={player.id} className="flex-1 min-h-[50px] max-h-[70px] flex items-center gap-2 bg-white border-2 border-black px-2 shadow-sm">
                                            {/* Player Info - Compact */}
                                            <div className="w-16 sm:w-20 shrink-0 flex flex-col justify-center leading-none">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="font-mono font-bold text-base">{player.number}</span>
                                                    <span className="font-bold uppercase truncate text-xs w-full">{player.name}</span>
                                                </div>
                                                <div className="text-[9px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                                                    <Trophy size={8} /> {player.points}
                                                </div>
                                            </div>

                                            {/* Buttons - Stretch to fill height, max height limited */}
                                            <div className="flex-1 grid grid-cols-3 gap-1 h-full py-1">
                                                {[1, 2, 3].map(points => (
                                                    <button 
                                                        key={points}
                                                        onClick={() => handleScore(player.id, points)}
                                                        className={`h-full max-h-10 border-2 font-bold font-mono text-base flex items-center justify-center gap-1 transition-all active:scale-95 rounded-sm
                                                            ${isCorrectionMode 
                                                                ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100' 
                                                                : 'border-black bg-white text-black hover:bg-zinc-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none'
                                                            }
                                                        `}
                                                    >
                                                        {isCorrectionMode ? <MinusCircle size={16} strokeWidth={2.5} /> : <PlusCircle size={16} strokeWidth={2.5} />}
                                                        {points}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'LOG' && (
                         <div className="absolute inset-0 overflow-x-auto overflow-y-hidden p-3">
                             {events.length === 0 ? (
                                <div className="flex items-center justify-center h-full w-full bg-white border border-dashed border-zinc-400">
                                   <p className="text-center text-zinc-400 text-sm font-mono">Ei tapahtumia vielä.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col flex-wrap content-start h-full gap-2">
                                    {events.map(e => (
                                        <div 
                                            key={e.id} 
                                            className={`w-64 p-2 border border-black/20 text-xs shrink-0 shadow-sm ${getPeriodStyle(e.period)}
                                            ${e.type === 'SCORE' ? 'border-l-yellow-400 bg-yellow-50' : ''}
                                            `}
                                        >
                                            <div className="flex justify-between items-center mb-1 pb-1 border-b border-black/10">
                                                 <span className="font-mono font-bold">{e.timestamp}</span>
                                                 <span className="font-bold text-[10px] uppercase opacity-70">Erä {e.period}</span>
                                            </div>
                                            <span className="text-black font-medium block leading-tight">{e.description}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

        </div>

        {/* RIGHT COLUMN: BENCH / ROSTER (Full Height) */}
        <aside className="flex-1 flex flex-col gap-2 min-h-0 md:max-w-xs lg:max-w-sm">
            
            <section 
                className="flex-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none p-1 overflow-hidden flex flex-col min-h-0"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, 'BENCH')}
            >
                 <div className="px-2 py-2 md:p-3 shrink-0 flex justify-between items-center bg-white border-b-2 border-black">
                     <div className="flex items-center gap-2">
                         <h2 className="font-bold text-black text-sm uppercase tracking-wide">Vaihtopenkki</h2>
                         <button className="md:hidden px-2 py-0.5 bg-black text-white text-[10px] font-mono font-bold" onClick={() => setGameMode(m => m === 4 ? 5 : 4)}>
                             {gameMode}v{gameMode}
                         </button>
                     </div>
                     <button 
                        onClick={() => setIsManagePlayersOpen(true)}
                        className="p-1.5 hover:bg-zinc-100 border border-transparent hover:border-black transition-colors"
                        title="Hallinnoi pelaajia"
                     >
                         <Settings size={18} />
                     </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto px-1 py-2 space-y-2 bg-zinc-50">
                    {benchPlayers.map(player => (
                        <PlayerCard 
                            key={player.id} 
                            player={player} 
                            variant="BENCH" 
                            onClick={handlePlayerClick}
                            isDraggable={true}
                            onDragStart={onDragStart}
                            onDrop={onDrop}
                            // Calculate if player is in cooldown for visual prop
                            isRecentSub={(gameState.gameClockSeconds - (player.lastSubOutTime || -9999)) < COOLDOWN_THRESHOLD}
                        />
                    ))}
                    {benchPlayers.filter(p => !p.isFouledOut && !p.isInjured).length === 0 && !players.some(p => p.isFouledOut || p.isInjured) && <div className="text-center text-zinc-400 py-4 text-xs font-mono uppercase">Penkki tyhjä</div>}
                    
                    {/* Fouled Out & Injured Section */}
                    {(players.some(p => p.isFouledOut || p.isInjured)) && (
                        <div className="mt-4 pt-2 border-t-2 border-zinc-200">
                             <h3 className="text-[10px] font-bold text-zinc-500 uppercase mb-2 px-1">Poissa pelistä</h3>
                             <div className="space-y-2">
                                {players.filter(p => p.isFouledOut || p.isInjured).map(player => (
                                    <PlayerCard 
                                        key={player.id}
                                        player={player}
                                        variant="BENCH"
                                        onClick={handlePlayerClick}
                                        isDraggable={false}
                                    />
                                ))}
                             </div>
                        </div>
                    )}
                 </div>
            </section>
        </aside>

      </main>

        {/* FOOTER */}
      <footer className="bg-white border-t border-zinc-300 p-2 flex justify-between items-center shrink-0 z-20 text-zinc-400 relative">
         <div className="text-[10px] font-mono">
            &copy; 2025 Vesa Perasto
         </div>

         {/* UNDO BUTTON - CENTERED */}
         <button 
             onClick={handleUndo} 
             disabled={historyStack.length === 0}
             className={`absolute left-1/2 -translate-x-1/2 -top-6 h-12 px-6 rounded-full border-2 border-black font-bold uppercase tracking-wider text-sm flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px] transition-all
             ${historyStack.length === 0 ? 'bg-zinc-200 text-zinc-400 border-zinc-300 cursor-not-allowed shadow-none' : 'bg-white text-black hover:bg-yellow-50'}
             `}
         >
             <Undo2 size={16} /> Peruuta
         </button>

         <div className="flex items-center gap-3">
             <button onClick={() => setIsHelpOpen(true)} className="hover:text-black flex items-center gap-1 transition-colors text-[10px] font-bold uppercase tracking-wide">
                <HelpCircle size={12} /> Ohjeet
             </button>
             <button onClick={() => setIsHistoryOpen(true)} className="hover:text-black flex items-center gap-1 transition-colors text-[10px] font-bold uppercase tracking-wide">
                <History size={12} /> Historia
             </button>
             <button onClick={() => setIsTodoOpen(true)} className="hover:text-black flex items-center gap-1 transition-colors text-[10px] font-bold uppercase tracking-wide">
                <ListTodo size={12} /> To-Do
             </button>
             <button onClick={() => setIsChangelogOpen(true)} className="hover:text-black flex items-center gap-1 transition-colors text-[10px] font-bold uppercase tracking-wide">
                v1.5 <FileText size={10} />
             </button>
         </div>
      </footer>

      {/* MODAL: SCOREBOARD */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsScoreModalOpen(false)}>
            <div 
                className="bg-white w-full max-w-sm border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col gap-4 mx-4 animate-in zoom-in-95" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                    <h3 className="font-bold text-lg uppercase flex items-center gap-2"><Trophy size={20} className="text-yellow-500"/> Tulostaulu</h3>
                    <button onClick={() => setIsScoreModalOpen(false)}><X size={24}/></button>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold uppercase">Me</span>
                        <div className="flex items-center gap-2">
                             <button onClick={() => setScoreUs(s => Math.max(0, s - 1))} className="w-8 h-8 flex items-center justify-center border border-black hover:bg-zinc-100"><MinusCircle size={16}/></button>
                             <input 
                                type="number" 
                                className="w-16 h-12 text-center text-2xl font-mono font-bold border-2 border-black"
                                value={scoreUs}
                                onChange={(e) => setScoreUs(parseInt(e.target.value) || 0)}
                             />
                             <button onClick={() => setScoreUs(s => s + 1)} className="w-8 h-8 flex items-center justify-center border border-black hover:bg-zinc-100"><PlusCircle size={16}/></button>
                        </div>
                    </div>
                    <span className="text-2xl font-bold text-zinc-300">:</span>
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold uppercase">Vastustaja</span>
                         <div className="flex items-center gap-2">
                             <button onClick={() => setScoreThem(s => Math.max(0, s - 1))} className="w-8 h-8 flex items-center justify-center border border-black hover:bg-zinc-100"><MinusCircle size={16}/></button>
                             <input 
                                type="number" 
                                className="w-16 h-12 text-center text-2xl font-mono font-bold border-2 border-black"
                                value={scoreThem}
                                onChange={(e) => setScoreThem(parseInt(e.target.value) || 0)}
                             />
                             <button onClick={() => setScoreThem(s => s + 1)} className="w-8 h-8 flex items-center justify-center border border-black hover:bg-zinc-100"><PlusCircle size={16}/></button>
                        </div>
                    </div>
                </div>
                
                <div className="pt-2">
                    <button 
                        onClick={() => logScoreToNotes(true)}
                        className="w-full py-3 bg-zinc-100 border-2 border-black text-black font-bold uppercase text-xs hover:bg-white flex items-center justify-center gap-2"
                    >
                        <NotebookPen size={16} /> Kirjaa väliaikatulos lokiin
                    </button>
                    <p className="text-[10px] text-zinc-500 mt-2 text-center">
                        Tämä lisää merkinnän "Erä {gameState.period}: Me {scoreUs} - Vast {scoreThem}" muistioon.
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: SWAP PLAYERS & ACTIONS */}
      {swapModalPlayer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setSwapModalPlayer(null)}>
            <div 
                className="bg-white w-full max-w-sm border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10 m-4" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-3 md:p-4 bg-zinc-100 border-b-2 border-black flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-base md:text-lg text-black uppercase">
                            {swapModalPlayer.isInjured ? 'Pelaaja loukkaantunut' : swapModalPlayer.isFouledOut ? 'Ulosajettu' : swapModalPlayer.isOnCourt ? 'Vaihda pois' : 'Vaihda kentälle'}
                        </h3>
                        <p className="text-xs md:text-sm text-zinc-600 font-mono">
                            #{swapModalPlayer.number} {swapModalPlayer.name}
                        </p>
                    </div>
                    <button onClick={() => setSwapModalPlayer(null)} className="p-1 border-2 border-transparent hover:border-black hover:bg-white"><X size={20}/></button>
                </div>

                <div className="p-2 md:p-3 overflow-y-auto bg-white">
                    {/* Only show swap candidates if player is active */}
                    {!swapModalPlayer.isFouledOut && !swapModalPlayer.isInjured && (
                        <div className="mb-4">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase mb-2">Valitse vaihtopari</h4>
                            {(swapModalPlayer.isOnCourt ? benchPlayers : courtPlayers).filter(p => !p.isFouledOut && !p.isInjured).map(candidate => (
                                <PlayerCard 
                                    key={candidate.id}
                                    player={candidate}
                                    variant="MODAL"
                                    onClick={() => {
                                        const pIn = swapModalPlayer.isOnCourt ? candidate : swapModalPlayer;
                                        const pOut = swapModalPlayer.isOnCourt ? swapModalPlayer : candidate;
                                        executeSwap(pIn, pOut);
                                    }}
                                    // PASS PROPS FOR VISUAL CUES IN MODAL
                                    isRecentSub={(gameState.gameClockSeconds - (candidate.lastSubOutTime || -9999)) < COOLDOWN_THRESHOLD}
                                    isFresh={(gameState.gameClockSeconds - (candidate.lastSubInTime || -9999)) < COOLDOWN_THRESHOLD}
                                />
                            ))}
                        </div>
                    )}

                    <div className="border-t-2 border-zinc-100 pt-4 space-y-2">
                        {/* Manual Court (Fill empty spot) - NEW */}
                        {!swapModalPlayer.isFouledOut && !swapModalPlayer.isInjured && !swapModalPlayer.isOnCourt && players.filter(p => p.isOnCourt).length < gameMode && (
                            <button 
                                onClick={() => executeSwap(swapModalPlayer, null)}
                                className="w-full p-3 border-2 border-black bg-white hover:bg-zinc-50 text-black font-bold text-xs md:text-sm uppercase tracking-wide mb-2"
                            >
                                Siirrä kentälle (Täytä paikka)
                            </button>
                        )}

                         {/* Manual Bench (No swap) */}
                         {!swapModalPlayer.isFouledOut && !swapModalPlayer.isInjured && swapModalPlayer.isOnCourt && players.filter(p => p.isOnCourt).length > 0 && (
                            <button 
                                onClick={() => executeSwap(null, swapModalPlayer)}
                                className="w-full p-3 border-2 border-black bg-white hover:bg-zinc-50 text-black font-bold text-xs md:text-sm uppercase tracking-wide mb-2"
                            >
                                Siirrä vaihtoon (Ei korvaajaa)
                            </button>
                        )}
                        
                        {/* Injury Toggle */}
                         {!swapModalPlayer.isFouledOut && (
                             <button 
                                onClick={() => handleToggleInjury(swapModalPlayer)}
                                className={`w-full p-3 border-2 font-bold text-xs md:text-sm uppercase tracking-wide flex items-center justify-center gap-2 ${swapModalPlayer.isInjured ? 'border-green-600 bg-green-50 text-green-700 hover:bg-green-100' : 'border-black bg-zinc-100 text-black hover:bg-zinc-200'}`}
                            >
                                {swapModalPlayer.isInjured ? (
                                    <> <Check size={16} /> Merkitse pelikuntoiseksi</>
                                ) : (
                                    <> <Stethoscope size={16} /> Loukkaantuminen / Ensiapu</>
                                )}
                            </button>
                         )}

                        {/* Foul Out */}
                        {!swapModalPlayer.isFouledOut && !swapModalPlayer.isInjured && (
                            <button 
                                onClick={() => handleFoulOut(swapModalPlayer)}
                                className="w-full p-3 border-2 border-red-600 bg-red-50 text-red-600 font-bold hover:bg-red-100 text-xs md:text-sm uppercase tracking-wide flex items-center justify-center gap-2"
                            >
                                <AlertTriangle size={16} /> 5 Virhettä / Ulosajo
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: NEXT PERIOD CONFIRMATION */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsPeriodModalOpen(false)}>
             <div 
                className="bg-white w-full max-w-sm border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col gap-4 mx-4 animate-in zoom-in-95" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg uppercase">Erä {gameState.period} päättyi</h3>
                    <button onClick={() => setIsPeriodModalOpen(false)}><X size={24}/></button>
                </div>
                <p className="text-sm text-zinc-600">Miten jatketaan seuraavaan erään?</p>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => confirmNextPeriod(true)}
                        className="p-4 border-2 border-black bg-yellow-400 font-bold uppercase text-black hover:bg-yellow-500 text-left"
                    >
                        1. Jatka samalla nelikolla
                        <span className="block text-[10px] font-normal lowercase opacity-80">Pelaajat pysyvät kentällä</span>
                    </button>
                    <button 
                         onClick={() => confirmNextPeriod(false)}
                         className="p-4 border-2 border-black bg-white font-bold uppercase text-black hover:bg-zinc-100 text-left"
                    >
                        2. Valitse uusi nelikko
                        <span className="block text-[10px] font-normal lowercase opacity-80">Kaikki siirtyvät vaihtoon</span>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: MANAGE PLAYERS */}
      {isManagePlayersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsManagePlayersOpen(false)}>
             <div 
                className="bg-white w-full max-w-md border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh] mx-4 animate-in zoom-in-95" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 bg-black text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg uppercase tracking-wider">Hallinnoi joukkuetta</h3>
                    <button onClick={() => setIsManagePlayersOpen(false)} className="p-1 border border-white hover:bg-zinc-800"><X size={20}/></button>
                </div>
                
                <div className="p-4 overflow-y-auto bg-zinc-50 flex-1">
                    
                    {/* TEAM IMPORT SECTION */}
                    <div className="mb-6 p-4 bg-zinc-100 border border-black text-center">
                        <input 
                            type="file" 
                            accept=".json" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                        />
                        <button 
                            onClick={triggerFileUpload}
                            className="w-full mb-3 py-3 border-2 border-dashed border-zinc-400 hover:border-black hover:bg-white text-zinc-600 font-bold uppercase text-xs flex items-center justify-center gap-2 transition-all"
                        >
                            <Upload size={16} /> Tuo joukkueet (.json)
                        </button>
                        
                        {savedTeams.length > 0 && (
                             <div className="grid grid-cols-2 gap-3">
                                {savedTeams.map((team, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => loadRoster(team.players)}
                                        className={`p-3 border-2 border-black flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]
                                            ${team.color === 'yellow' ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 
                                              team.color === 'black' ? 'bg-black text-white hover:bg-zinc-800' : 
                                              'bg-white text-black hover:bg-zinc-100'}`}
                                    >
                                        <Users2 size={24} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Lataa {team.name}</span>
                                    </button>
                                ))}
                             </div>
                        )}
                        {savedTeams.length === 0 && (
                            <p className="text-[10px] text-zinc-500 font-mono">Tuo JSON-tiedosto saadaksesi joukkueet valittavaksi.</p>
                        )}
                    </div>

                    <form onSubmit={handleAddPlayer} className="bg-white p-3 border-2 border-black mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                        <h4 className="text-xs font-bold text-black uppercase mb-2">Lisää uusi pelaaja</h4>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                placeholder="#" 
                                className="w-16 p-2 border-2 border-black text-center font-bold text-black bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono"
                                value={newPlayerNumber}
                                onChange={e => setNewPlayerNumber(e.target.value)}
                                required
                            />
                            <input 
                                type="text" 
                                placeholder="Nimi" 
                                className="flex-1 p-2 border-2 border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                value={newPlayerName}
                                onChange={e => setNewPlayerName(e.target.value)}
                                required
                            />
                            <button type="submit" className="bg-black text-white p-2 hover:bg-zinc-800 border-2 border-black">
                                <Plus size={20} />
                            </button>
                        </div>
                    </form>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Pelaajalista ({players.length})</h4>
                        {players.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white p-2 border border-black">
                                {editingPlayerId === p.id ? (
                                    // EDIT MODE
                                    <div className="flex gap-2 w-full items-center">
                                         <input 
                                            type="number" 
                                            className="w-14 p-1 border-2 border-blue-500 text-center font-bold text-black bg-white font-mono"
                                            value={editPlayerNumber}
                                            onChange={(e) => setEditPlayerNumber(e.target.value)}
                                         />
                                         <input 
                                            type="text" 
                                            className="flex-1 p-1 border-2 border-blue-500 text-black bg-white"
                                            value={editPlayerName}
                                            onChange={(e) => setEditPlayerName(e.target.value)}
                                         />
                                         <button onClick={() => handleSaveEdit(p.id)} className="p-2 text-green-600 bg-green-100 border border-green-600 hover:bg-green-200">
                                            <Check size={18} />
                                         </button>
                                         <button onClick={handleCancelEdit} className="p-2 text-zinc-500 bg-zinc-100 border border-zinc-400 hover:bg-zinc-200">
                                            <X size={18} />
                                         </button>
                                    </div>
                                ) : (
                                    // VIEW MODE
                                    <>
                                        <div className="flex items-center gap-3">
                                            <span className={`w-8 h-8 flex items-center justify-center border-2 border-black font-bold font-mono text-sm ${p.isFouledOut ? 'bg-zinc-200 text-zinc-400 border-zinc-400' : 'bg-black text-white'}`}>
                                                {p.number}
                                            </span>
                                            <span className={`font-bold uppercase text-sm ${p.isFouledOut ? 'line-through text-zinc-400' : 'text-black'}`}>
                                                {p.name}
                                                {p.isFouledOut && <span className="ml-2 text-[10px] text-red-500 no-underline">ULOS</span>}
                                            </span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => handleStartEdit(p)}
                                                className="p-2 text-black hover:bg-zinc-100 border border-transparent hover:border-black transition-all"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeletePlayer(p.id);
                                                }}
                                                className="p-2 text-black hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-600 transition-all cursor-pointer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: END GAME */}
      {isEndGameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => !generatedPrompt && setIsEndGameModalOpen(false)}>
            <div 
                className="bg-white w-full max-w-sm border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col mx-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 bg-black text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg uppercase tracking-wider">{generatedPrompt ? "Kopioi viesti" : "Päätä peli"}</h3>
                    {!generatedPrompt && <button onClick={() => setIsEndGameModalOpen(false)} className="p-1 border border-white hover:bg-zinc-800"><X size={20}/></button>}
                </div>
                
                {generatedPrompt ? (
                     // SUCCESS VIEW WITH COPY PASTE
                     <div className="p-4 bg-white flex flex-col gap-4">
                         <div className="p-3 bg-yellow-50 border-2 border-yellow-400 text-sm">
                            <h4 className="font-bold uppercase text-xs text-black mb-2 flex items-center gap-1"><MessageSquareQuote size={14}/> Kehote tekoälylle:</h4>
                            <div className="whitespace-pre-line text-black italic leading-relaxed text-xs overflow-y-auto max-h-40 border border-yellow-200 p-2 bg-white">
                                {generatedPrompt}
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-2">
                                Kopioi tämä ja liitä se ChatGPT:hen, Claudeen tai Geminiin. Se luo kolme eri viestiversiota.
                            </p>
                         </div>
                         
                         <button 
                            onClick={copyPromptToClipboard}
                            className={`w-full py-3 border-2 border-black font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all ${isCopied ? 'bg-green-500 text-white border-green-600' : 'bg-white text-black hover:bg-zinc-100'}`}
                         >
                            {isCopied ? <ClipboardCheck size={18} /> : <Copy size={18} />}
                            {isCopied ? "Kopioitu!" : "Kopioi leikepöydälle"}
                         </button>
                         
                         <button 
                            onClick={handleDownloadReport}
                            className="w-full py-3 border-2 border-black bg-white text-black font-bold uppercase text-sm hover:bg-zinc-100 flex items-center justify-center gap-2"
                         >
                            <Download size={18} /> Lataa myös tekstitiedosto
                         </button>

                         <button 
                            onClick={closeEndGameModal} 
                            className="w-full py-3 bg-black text-white border-2 border-black font-bold uppercase text-sm hover:bg-zinc-800"
                        >
                            Sulje ja aloita uusi
                        </button>
                     </div>
                ) : (
                    // FORM VIEW
                    <div className="p-4 bg-white flex flex-col gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Vastustaja</label>
                            <input 
                                type="text"
                                placeholder="esim. Espoo Basket"
                                className="w-full p-2 border-2 border-black bg-white text-black placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                value={gameName}
                                onChange={e => setGameName(e.target.value)}
                            />
                        </div>

                        {/* MANUAL SCORE INPUT */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Meidän pisteet</label>
                                <input 
                                    type="number"
                                    placeholder="0"
                                    className="w-full p-2 border-2 border-black bg-white text-black text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    value={scoreUs}
                                    onChange={e => setScoreUs(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="flex items-center justify-center pt-5 text-black font-bold">-</div>
                            <div className="flex-1">
                                <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Vastustaja</label>
                                <input 
                                    type="number"
                                    placeholder="0"
                                    className="w-full p-2 border-2 border-black bg-white text-black text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    value={scoreThem}
                                    onChange={e => setScoreThem(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Pelin muistiinpanot</label>
                            <textarea 
                                rows={6}
                                placeholder="Kirjaa ylös hyvät suoritukset ja kehitettävät kohteet..."
                                className="w-full p-2 border-2 border-black bg-white text-black placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                                value={gameNotes}
                                onChange={e => setGameNotes(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 cursor-pointer" onClick={() => setDownloadReport(!downloadReport)}>
                            <div className={`w-5 h-5 border-2 border-black flex items-center justify-center ${downloadReport ? 'bg-black' : 'bg-white'}`}>
                                {downloadReport && <Check size={14} className="text-white" />}
                            </div>
                            <span className="text-sm font-bold uppercase select-none flex items-center gap-2">
                                <Download size={16} /> Lataa peliraportti (.txt)
                            </span>
                        </div>

                        <div className="flex gap-3 mt-2">
                            <button 
                                onClick={() => setIsEndGameModalOpen(false)} 
                                className="flex-1 py-3 border-2 border-black text-black font-bold uppercase text-sm hover:bg-zinc-100"
                            >
                                Peruuta
                            </button>
                            <button 
                                onClick={handleGeneratePrompt} 
                                className={`flex-1 py-3 bg-white text-black border-2 border-black font-bold uppercase text-sm hover:bg-zinc-100 flex items-center justify-center gap-2`}
                            >
                                <Terminal size={16} /> Luo AI-kehote
                            </button>
                            <button 
                                onClick={handleFinishGame} 
                                className={`flex-1 py-3 bg-black text-white border-2 border-black font-bold uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-2 hover:bg-zinc-800`}
                            >
                                Valmis
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* MODAL: HELP */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsHelpOpen(false)}>
            <div 
                className="bg-white w-full max-w-lg border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh] mx-4 animate-in zoom-in-95" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 bg-black text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg uppercase tracking-wider flex items-center gap-2"><HelpCircle size={20}/> Ohjeet & Vinkit</h3>
                    <button onClick={() => setIsHelpOpen(false)} className="p-1 border border-white hover:bg-zinc-800"><X size={20}/></button>
                </div>
                <div className="p-4 overflow-y-auto bg-zinc-50">
                    
                    {/* Quick Guide */}
                    <div className="mb-6">
                        <h4 className="font-bold uppercase text-sm border-b-2 border-black pb-1 mb-3">Pikaohje</h4>
                        <div className="grid grid-cols-1 gap-3">
                             <div className="flex items-start gap-3">
                                 <div className="p-2 bg-white border border-black"><MousePointerClick size={20} /></div>
                                 <div>
                                     <span className="font-bold text-sm block">Vaihdot & Tapahtumat</span>
                                     <span className="text-xs text-zinc-600">Klikkaa pelaajaa (kentällä tai penkillä) tehdäksesi vaihdon.</span>
                                 </div>
                             </div>
                             <div className="flex items-start gap-3">
                                 <div className="p-2 bg-white border border-black"><Move size={20} /></div>
                                 <div>
                                     <span className="font-bold text-sm block">Raahaus (Drag & Drop)</span>
                                     <span className="text-xs text-zinc-600">Voit myös raahata pelaajan suoraan penkiltä kentälle (ja päinvastoin).</span>
                                 </div>
                             </div>
                             <div className="flex items-start gap-3">
                                 <div className="p-2 bg-white border border-black"><Hash size={20} /></div>
                                 <div>
                                     <span className="font-bold text-sm block">Tulostaulu</span>
                                     <span className="text-xs text-zinc-600">Klikkaa yläpalkin pisteitä muokataksesi tulosta ja kirjataksesi erätuloksia.</span>
                                 </div>
                             </div>
                             <div className="flex items-start gap-3">
                                 <div className="p-2 bg-white border border-black"><Undo2 size={20} /></div>
                                 <div>
                                     <span className="font-bold text-sm block">Peruuta (Undo)</span>
                                     <span className="text-xs text-zinc-600">Paina alalaidan "Peruuta" -nappia palauttaaksesi edellisen tilanteen.</span>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div className="bg-zinc-100 p-3 text-center border border-zinc-300">
                        <span className="text-xs text-zinc-500 flex items-center justify-center gap-1">
                            <Flame size={14} className="text-orange-500"/> Pelaaja "kuuma" {'>'} 4min kentällä
                        </span>
                        <span className="text-xs text-zinc-500 flex items-center justify-center gap-1 mt-1">
                            <Snowflake size={14} className="text-blue-500"/> Pelaaja "kylmä" {'>'} 5min penkillä
                        </span>
                    </div>

                </div>
            </div>
        </div>
      )}

      {/* MODAL: HISTORY */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsHistoryOpen(false)}>
            <div 
                className="bg-white w-full max-w-md border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[80vh] mx-4 animate-in zoom-in-95" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 bg-black text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg uppercase tracking-wider flex items-center gap-2"><History size={20}/> Pelihistoria</h3>
                    <button onClick={() => setIsHistoryOpen(false)} className="p-1 border border-white hover:bg-zinc-800"><X size={20}/></button>
                </div>
                <div className="p-4 overflow-y-auto bg-zinc-50">
                    {savedGames.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                             <p className="text-sm">Ei tallennettuja pelejä.</p>
                             <p className="text-xs mt-1">Peli tallentuu kun painat "Päätä peli".</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                             {savedGames.map(game => (
                                 <div key={game.id} className="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                                     <div className="flex justify-between items-start mb-2">
                                         <div>
                                             <div className="font-bold text-black uppercase">{game.name}</div>
                                             <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
                                                 <Calendar size={12}/> {new Date(game.date).toLocaleDateString()} 
                                                 <Clock size={12} className="ml-1"/> {formatTime(game.durationSeconds)}
                                             </div>
                                             {/* Score Display in History */}
                                             {(game.scoreUs !== undefined || game.scoreThem !== undefined) && (
                                                <div className="mt-1 text-xs font-bold bg-zinc-100 inline-block px-1 border border-zinc-300">
                                                    Tulos: {game.scoreUs ?? '-'} - {game.scoreThem ?? '-'}
                                                </div>
                                             )}
                                         </div>
                                         <button onClick={() => deleteHistoryItem(game.id)} className="text-zinc-400 hover:text-red-600 transition-colors">
                                             <Trash2 size={16} />
                                         </button>
                                     </div>
                                     <div className="text-xs text-zinc-600 border-t border-zinc-100 pt-2 mt-2">
                                         <div className="mb-1 font-bold text-zinc-400 uppercase text-[10px]">Huomiot:</div>
                                         <p className="line-clamp-2 italic">{game.notes || '-'}</p>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* MODAL: CHANGELOG */}
      {isChangelogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsChangelogOpen(false)}>
            <div 
                className="bg-white w-full max-w-md border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[80vh] mx-4 animate-in zoom-in-95" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 bg-black text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg uppercase tracking-wider">Muutosloki</h3>
                    <button onClick={() => setIsChangelogOpen(false)} className="p-1 border border-white hover:bg-zinc-800"><X size={20}/></button>
                </div>
                <div className="p-4 overflow-y-auto bg-zinc-50">
                    <div className="space-y-4">
                        {CHANGELOG.map((log, index) => (
                            <div key={index} className="border-l-2 border-black pl-3 ml-1">
                                <div className="text-[10px] font-mono font-bold text-zinc-500 mb-1">{log.date}</div>
                                <div className="text-sm text-black font-medium">{log.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: TODO LIST */}
      {isTodoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsTodoOpen(false)}>
            <div 
                className="bg-white w-full max-w-md border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[80vh] mx-4 animate-in zoom-in-95" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 bg-black text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg uppercase tracking-wider flex items-center gap-2"><ListTodo size={20}/> Kehityslista</h3>
                    <button onClick={() => setIsTodoOpen(false)} className="p-1 border border-white hover:bg-zinc-800"><X size={20}/></button>
                </div>
                <div className="p-4 overflow-y-auto bg-zinc-50">
                    
                    <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 p-3">
                         <h4 className="font-bold text-xs uppercase mb-1 flex items-center gap-1"><Mail size={14}/> Onko hyviä ideoita?</h4>
                         <p className="text-xs text-zinc-700 mb-2">Kehitän sovellusta jatkuvasti. Lähetä ehdotuksesi sähköpostilla:</p>
                         <a href="mailto:vesa.perasto@gmail.com" className="text-sm font-bold text-black underline hover:text-zinc-600 block">
                             vesa.perasto@gmail.com
                         </a>
                    </div>

                    <div className="space-y-3">
                        {TODO_LIST.map((item, index) => (
                            <div key={index} className={`bg-white border border-black p-3 shadow-sm flex items-start gap-3 ${item.status === 'DONE' ? 'opacity-60' : ''}`}>
                                <div className="mt-1">
                                    {item.status === 'DONE' ? <Check size={16} className="text-green-600"/> : 
                                     item.status === 'PROPOSED' ? <BrainCircuit size={16} className="text-purple-600"/> :
                                    <div className="w-4 h-4 border border-zinc-300 rounded-sm"></div>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-black flex items-center gap-2">
                                        {item.title}
                                        {item.status === 'PROPOSED' && <span className="text-[10px] bg-purple-100 text-purple-800 px-1 rounded border border-purple-200 uppercase">Suunnitteilla</span>}
                                    </h4>
                                    <p className="text-xs text-zinc-600">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}