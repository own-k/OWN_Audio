import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Globe } from 'lucide-react';

interface RecorderProps {
  onRecordingComplete: (blob: Blob, duration: number, language: string) => void;
}

const LANGUAGES = [
  "English",
  "Russian",
  "Uzbek"
];

const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob, duration, selectedLanguage);
        cleanupVisualizer();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      setupVisualizer(stream);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const setupVisualizer = (stream: MediaStream) => {
    if (!canvasRef.current) return;
    
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioCtx = audioContextRef.current;
    
    analyserRef.current = audioCtx.createAnalyser();
    analyserRef.current.fftSize = 2048; 
    analyserRef.current.smoothingTimeConstant = 0.2; 
    
    sourceRef.current = audioCtx.createMediaStreamSource(stream);
    sourceRef.current.connect(analyserRef.current);
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const barCount = 40;
    const barState = new Float32Array(barCount).fill(0);
    const BAR_WIDTH_RATIO = 0.6;
    const GRAVITY = 1.5;
    const ELASTICITY = 0.5;

    const draw = () => {
      if (!analyserRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Clear with transparency
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      const slotWidth = width / barCount;
      const barWidth = slotWidth * BAR_WIDTH_RATIO;

      const meaningfulRangeStart = 4; 
      const meaningfulRangeEnd = bufferLength * 0.7; 
      const range = meaningfulRangeEnd - meaningfulRangeStart;
      const step = Math.floor(range / barCount);

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        const startBin = meaningfulRangeStart + (i * step);
        for (let j = 0; j < step; j++) {
            if (startBin + j < bufferLength) {
                sum += dataArray[startBin + j];
            }
        }
        const average = sum / step;
        const targetHeight = (average / 255) * (height * 0.9);

        if (targetHeight > barState[i]) {
            barState[i] += (targetHeight - barState[i]) * ELASTICITY; 
        } else {
            barState[i] = Math.max(0, barState[i] - GRAVITY);
        }

        const currentBarHeight = Math.max(4, barState[i]);
        const intensity = Math.min(1, currentBarHeight / (height / 2));
        
        // Red color scheme
        const hue = 350 + (intensity * 10);
        const sat = 80 + (intensity * 20); 
        const light = 50; 
        
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;

        const x = i * slotWidth + (slotWidth - barWidth) / 2;
        ctx.beginPath();
        ctx.roundRect(x, centerY - currentBarHeight / 2, barWidth, currentBarHeight / 2, [2, 2, 0, 0]);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x, centerY, barWidth, currentBarHeight / 2, [0, 0, 2, 2]);
        ctx.fill();
      }
    };

    draw();
  };

  const cleanupVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
  };
  
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupVisualizer();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-black rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md mx-auto mt-4 transition-all duration-300">
      
      {/* Visualizer Container */}
      <div className="w-full h-32 bg-slate-50 dark:bg-slate-900/50 rounded-3xl mb-10 overflow-hidden relative flex items-center justify-center border border-slate-200 dark:border-slate-900 shadow-inner group">
         {isRecording ? (
             <canvas ref={canvasRef} width={400} height={128} className="w-full h-full" />
         ) : (
            <div className="flex flex-col items-center gap-4 w-full px-8 animate-in fade-in zoom-in duration-500">
                 <div className="flex flex-col items-center gap-2 w-full">
                    <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Input Language
                    </label>
                    <div className="relative w-full">
                        <select 
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="w-full appearance-none bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    </div>
                 </div>
                 <div className="text-slate-400 text-[10px] font-mono tracking-widest uppercase">Ready to Record</div>
            </div>
         )}
      </div>

      <div className="text-7xl font-dot font-bold text-slate-900 dark:text-white mb-10 tracking-widest tabular-nums">
        {formatTime(duration)}
      </div>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`relative rounded-[2rem] p-8 transition-all duration-500 transform shadow-xl border-4 outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black overflow-hidden group ${
          isRecording
            ? 'bg-slate-900 dark:bg-slate-900 border-red-500 scale-100'
            : 'bg-red-500 hover:bg-red-600 border-red-400 hover:scale-110 active:scale-95'
        }`}
      >
        {isRecording ? (
          <>
            <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>
            <Square className="w-10 h-10 text-red-500 fill-current relative z-10" />
          </>
        ) : (
          <Mic className="w-10 h-10 text-white relative z-10" />
        )}
      </button>
      
      <p className={`mt-8 text-xs font-mono uppercase tracking-[0.2em] transition-colors duration-500 font-bold ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-400 dark:text-slate-600'}`}>
          {isRecording ? "● Recording Active" : "Tap microphone to start"}
      </p>
    </div>
  );
};

export default Recorder;