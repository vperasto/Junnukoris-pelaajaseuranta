import React from 'react';
import { Player } from '../types';
import { Clock, Shirt, Ban, Flame, Snowflake, Stethoscope, Trophy, Hourglass, Zap, ArrowRightFromLine } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  onClick: (player: Player) => void;
  variant: 'COURT' | 'BENCH' | 'MODAL'; // MODAL is for the list inside the popup
  onDragStart?: (e: React.DragEvent, player: Player) => void;
  onDrop?: (e: React.DragEvent, target: Player) => void;
  isDraggable?: boolean;
  isRecentSub?: boolean; // Just came OFF court (Cooling down)
  isFresh?: boolean; // Just came ON court (Fresh legs)
  isLongestShift?: boolean; // Has been on court the longest
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  onClick, 
  variant, 
  onDragStart,
  onDrop,
  isDraggable,
  isRecentSub = false,
  isFresh = false,
  isLongestShift = false
}) => {
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart && !player.isFouledOut && !player.isInjured) onDragStart(e, player);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDrop && !player.isFouledOut && !player.isInjured) onDrop(e, player);
  };

  // E-Paper / Brutalist Styles
  const baseStyles = "relative flex items-center justify-between transition-transform select-none cursor-pointer touch-manipulation overflow-hidden";
  
  // Logic for status icons
  const shiftSeconds = player.consecutiveSecondsOnCourt || 0;
  const isHot = shiftSeconds > 240; // > 4 mins (Red)
  const isMedium = shiftSeconds > 90; // > 1.5 mins (Yellow)
  
  const isCold = (player.consecutiveSecondsOnBench || 0) > 300; // > 5 mins
  const isDisabled = player.isFouledOut || player.isInjured;
  
  // Dynamic styles based on state
  let cardBackground = 'bg-white';
  let cardBorder = 'border-zinc-400 border-dashed';
  let cardShadow = 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]';

  // --- STYLE LOGIC ---
  if (isDisabled) {
      cardBackground = 'bg-zinc-100 opacity-60';
      cardBorder = 'border border-zinc-300';
  } else if (isRecentSub) {
      // RECENT SUB (Cooling Down) - Grey/Slate
      cardBackground = 'bg-slate-200';
      cardBorder = 'border-2 border-slate-400';
  } else if (isFresh) {
      // FRESH (Just In) - Green/Lime
      cardBackground = 'bg-lime-50';
      cardBorder = 'border-2 border-lime-500';
  } else if (variant === 'COURT') {
      // STANDARD COURT
      cardBackground = 'bg-white';
      cardBorder = 'border-2 border-black';
      cardShadow = 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]';
      
      // Highlight "Next Out" candidate
      if (isLongestShift && !isDisabled) {
          cardBorder = 'border-2 border-red-500 ring-2 ring-red-200 animate-pulse';
      } else if (isHot) {
          cardBorder = 'border-2 border-orange-500';
      }
  } else if (variant === 'BENCH') {
      // STANDARD BENCH
      if (isCold) {
          cardBackground = 'bg-blue-50';
          cardBorder = 'border border-blue-300 border-dashed';
      } else {
          cardBorder = 'border border-zinc-400 border-dashed hover:border-black hover:border-solid';
      }
  } else if (variant === 'MODAL') {
      // STANDARD MODAL (Fallback if not Fresh/RecentSub)
      cardBackground = 'bg-white';
      cardBorder = 'border-2 border-black';
      cardShadow = 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none';
  }

  // Shift Meter Calculation (Max 5 mins = 100%)
  const shiftPercentage = Math.min(100, (shiftSeconds / 300) * 100);
  let barColor = 'bg-lime-500';
  if (shiftSeconds > 240) barColor = 'bg-red-500';
  else if (shiftSeconds > 90) barColor = 'bg-yellow-400';

  return (
    <div 
      className={`${baseStyles} ${cardBackground} ${cardBorder} ${cardShadow} ${variant === 'COURT' ? 'p-3 h-24' : 'p-2 h-16'} ${variant === 'MODAL' ? 'mb-2' : ''}`}
      onClick={() => onClick(player)}
      draggable={isDraggable && !isDisabled}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* SHIFT METER (Background Bar) for Court Players */}
      {variant === 'COURT' && !isDisabled && (
          <div className="absolute bottom-0 left-0 h-1.5 transition-all duration-1000 ease-linear" style={{ width: `${shiftPercentage}%` }}>
              <div className={`w-full h-full ${barColor}`}></div>
          </div>
      )}

      <div className="flex items-center gap-3 w-full relative z-10">
        {/* Number Badge - Only show for BENCH or MODAL variants per user request */}
        {variant !== 'COURT' && (
          <div className={`
            flex items-center justify-center font-bold border-2 border-black shrink-0 font-mono relative
            ${variant === 'COURT' ? 'w-10 h-10 text-lg bg-black text-white' : 'w-8 h-8 text-sm bg-white text-black'}
            ${player.isFouledOut ? 'grayscale' : ''}
            ${player.isInjured ? 'border-red-500 text-red-500 bg-red-50' : ''}
            ${isRecentSub && !isDisabled ? 'bg-slate-400 text-white border-slate-500' : ''}
            ${isFresh && !isDisabled ? 'bg-lime-500 text-black border-lime-600' : ''}
          `}>
            {player.number}
            {player.isFouledOut && <div className="absolute inset-0 flex items-center justify-center text-red-600"><Ban size={32} className="opacity-80" /></div>}
            {player.isInjured && <div className="absolute inset-0 flex items-center justify-center text-red-600"><Stethoscope size={20} /></div>}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold truncate text-black uppercase tracking-tight ${variant === 'COURT' ? 'text-lg sm:text-xl' : 'text-sm'} ${isDisabled ? 'line-through text-zinc-500' : ''}`}>
              {player.name}
            </h3>
            
            {/* Context Icons */}
            {!isDisabled && isLongestShift && variant === 'COURT' && (
                <span className="text-[9px] bg-red-100 text-red-600 px-1 font-bold border border-red-200 animate-pulse rounded-sm">VAIHTOON?</span>
            )}
            {!isDisabled && isCold && variant === 'BENCH' && !isRecentSub && <Snowflake size={16} className="text-blue-400" />}
            {!isDisabled && isRecentSub && <Hourglass size={14} className="text-slate-500 animate-spin-slow" />}
            {!isDisabled && isFresh && <Zap size={14} className="text-lime-600 fill-current" />}
          </div>
          
          <div className={`flex items-center gap-2 ${variant === 'COURT' ? 'text-sm text-zinc-600' : 'text-xs text-zinc-500'}`}>
            <div className="flex items-center gap-1">
                <Clock size={variant === 'COURT' ? 14 : 12} />
                <span className="font-mono font-bold">{formatTime(player.secondsPlayed)}</span>
            </div>
            
            {/* Points Badge on Court Card */}
            {variant === 'COURT' && !isDisabled && player.points > 0 && (
                 <div className="flex items-center gap-1 bg-yellow-100 px-1.5 border border-yellow-500 rounded-sm text-yellow-800">
                    <Trophy size={10} />
                    <span className="font-mono font-bold text-xs">{player.points}</span>
                 </div>
            )}

            {player.isFouledOut && <span className="text-red-600 font-bold ml-1 text-[10px] border border-red-600 px-1">ULOS</span>}
            {player.isInjured && <span className="text-red-600 font-bold ml-1 text-[10px] border border-red-600 px-1">LOUK</span>}
            {isRecentSub && !isDisabled && <span className="text-slate-500 font-bold ml-1 text-[10px] uppercase">Huili</span>}
            {isFresh && !isDisabled && <span className="text-lime-600 font-bold ml-1 text-[10px] uppercase">Tuore</span>}
          </div>
        </div>

        {/* Action Hint Icon */}
        {variant === 'MODAL' && !isDisabled && (
           <div className="border border-black p-1 bg-zinc-100 text-black">
             <Shirt size={16} />
           </div>
        )}
      </div>
      
      {/* Active Indicator for Court players */}
      {variant === 'COURT' && player.isOnCourt && !isDisabled && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-r-[20px] border-t-yellow-400 border-r-yellow-400"></div>
      )}
    </div>
  );
};