import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onEnter: () => void;
}

// Digital Clock Widget - Dot Matrix Style
const DigitalClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="w-full h-full bg-black rounded-[2rem] flex flex-col items-center justify-center border border-white/20 shadow-none relative overflow-hidden">
            <span className="font-dot text-7xl md:text-9xl text-white tracking-widest leading-none select-none">
                {formatTime(time)}
            </span>
             <div className="absolute bottom-6 flex gap-2">
                <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-red-600 rounded-full"></div>
            </div>
        </div>
    );
};

// Date Widget - Strict Black/White/Red
const DateWidget = () => {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dayNum = date.getDate();

    return (
        <div className="w-full h-full bg-black rounded-[2rem] flex flex-col items-center justify-center border border-white/20 shadow-none relative overflow-hidden">
            {/* Red Accent Dot */}
            <div className="absolute top-6 right-6 w-3 h-3 bg-red-600 rounded-full"></div>
            
            <div className="flex flex-col items-center z-10">
                <span className="font-serif text-xl md:text-2xl text-red-600 tracking-widest uppercase mb-2 font-bold italic">{dayName}</span>
                <div className="flex items-baseline gap-3">
                    <span className="font-dot text-7xl md:text-8xl text-white leading-none">{dayNum}</span>
                    <span className="font-serif text-3xl text-white opacity-80 italic">{month}</span>
                </div>
            </div>
        </div>
    );
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-black text-white font-serif relative overflow-hidden flex flex-col items-center justify-center p-6 selection:bg-red-600 selection:text-white">
      
      {/* Background Dot Grid */}
      <div className="absolute inset-0 bg-grid-dots opacity-10 pointer-events-none"></div>

      <div className="max-w-5xl w-full z-10 flex flex-col items-center gap-10">
        
        {/* Top: Typography */}
        <div className="text-center flex flex-col items-center mt-8">
            <h1 className="font-serif text-6xl md:text-8xl font-bold tracking-tight leading-[0.9] text-white mb-6">
                Listen once. <br/>
                <span className="font-serif italic font-normal text-red-600">Remember forever.</span>
            </h1>
            <div className="font-mono text-xs md:text-sm text-white opacity-60 tracking-[0.3em] uppercase mt-2 border-b border-red-600 pb-1">
                Record, Transcribe, Summarize
            </div>
        </div>

        {/* Middle: Widget Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-64">
            
            {/* Digital Clock Widget */}
            <div className="col-span-1 h-56 md:h-full">
                <DigitalClock />
            </div>

            {/* Date Widget */}
            <div className="col-span-1 h-56 md:h-full">
                <DateWidget />
            </div>
        </div>

        {/* Bottom: Entry Button */}
        <div className="mt-8 mb-8">
             <button 
                onClick={onEnter}
                className="group flex flex-col items-center gap-4 active:scale-95 transition-transform"
             >
                <div className="w-20 h-20 rounded-full bg-black border border-white/20 flex items-center justify-center hover:bg-white hover:border-transparent transition-colors duration-300">
                    <ArrowRight className="w-8 h-8 text-white group-hover:text-black transition-colors duration-300" />
                </div>
                <span className="font-mono font-bold text-sm tracking-widest text-white group-hover:text-red-600 transition-colors uppercase border border-white/20 px-6 py-2 rounded-full group-hover:border-red-600">
                    Launch OWN Audio
                </span>
             </button>
        </div>

      </div>
    </div>
  );
};

export default WelcomeScreen;