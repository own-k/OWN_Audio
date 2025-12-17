import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Rewind, FastForward } from 'lucide-react';

interface AudioPlayerProps {
  src?: string;
  blob?: Blob;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, blob }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let url = src;
    if (blob) {
      url = URL.createObjectURL(blob);
    }
    
    if (url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      
      const audio = audioRef.current;
      
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onended = () => setIsPlaying(false);
      audio.playbackRate = playbackRate;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [src, blob]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const skip = (seconds: number) => {
     if (!audioRef.current) return;
     const newTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), duration);
     seek(newTime);
  };

  const formatTime = (t: number) => {
    if (isNaN(t)) return "0:00";
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="px-6 py-4 bg-slate-950 rounded-lg">
      
      {/* Top: Progress Bar */}
      <div className="flex items-center gap-4 mb-4">
         <span className="text-xs font-dot font-bold text-slate-500 w-10 text-right tracking-widest">{formatTime(currentTime)}</span>
         <div className="flex-1 relative h-1 bg-slate-800 rounded-full group cursor-pointer">
             <div 
                className="absolute top-0 left-0 h-full bg-red-600 rounded-full" 
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
             ></div>
             <input 
               type="range" 
               min="0" 
               max={duration || 100} 
               value={currentTime} 
               onChange={(e) => seek(parseFloat(e.target.value))}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             />
         </div>
         <span className="text-xs font-dot font-bold text-slate-500 w-10 tracking-widest">{formatTime(duration)}</span>
      </div>

      {/* Bottom: Controls */}
      <div className="flex items-center justify-between px-2">
         {/* Left: Speed */}
         <button 
            onClick={() => setPlaybackRate(rate => rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1)} 
            className="text-xs font-dot text-slate-400 hover:text-white bg-slate-900 border border-slate-700 hover:border-slate-500 px-2 py-1 rounded transition-colors w-12 text-center"
         >
            {playbackRate}x
         </button>

         {/* Center: Playback */}
         <div className="flex items-center gap-6">
             <button onClick={() => skip(-10)} className="text-slate-500 hover:text-white transition-colors">
                 <Rewind className="w-5 h-5" />
             </button>
             <button 
                onClick={togglePlay} 
                className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.2)]"
             >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
             </button>
             <button onClick={() => skip(10)} className="text-slate-500 hover:text-white transition-colors">
                 <FastForward className="w-5 h-5" />
             </button>
         </div>
         
         {/* Right: Spacer for balance */}
         <div className="w-12"></div>
      </div>
    </div>
  );
};

export default AudioPlayer;