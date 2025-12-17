import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, Moon, Sun, Upload } from 'lucide-react';
import { ScribeMessage, MessageStatus, ChatMessage } from './types';
import MessageList from './components/MessageList';
import Recorder from './components/Recorder';
import DetailView from './components/DetailView';
import WelcomeScreen from './components/WelcomeScreen';
import { transcribeAudio, analyzeTranscript } from './services/geminiService';

const App: React.FC = () => {
  const [hasEntered, setHasEntered] = useState(false);
  const [messages, setMessages] = useState<ScribeMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persistence
  useEffect(() => {
    const saved = localStorage.getItem('own_audio_messages');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setMessages(parsed.map((m: any) => ({ ...m, audioBlob: undefined })));
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }
    
    // Check system preference for theme initially
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
       setTheme('light');
    }
    
    setIsLoaded(true);
  }, []);

  // Save persistence
  useEffect(() => {
      if (!isLoaded) return;
      const toSave = messages.map(({ audioBlob, ...rest }) => rest);
      localStorage.setItem('own_audio_messages', JSON.stringify(toSave));
  }, [messages, isLoaded]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const processRecording = async (messageId: string, blob: Blob, language: string = "English") => {
    try {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: MessageStatus.Transcribing } : m));
      const transcript = await transcribeAudio(blob, language);
      
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, transcriptText: transcript, status: MessageStatus.Analyzing } : m));

      const analysis = await analyzeTranscript(transcript, language);
      
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, analysis, status: MessageStatus.Ready } : m));

    } catch (error) {
      console.error("Processing failed", error);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: MessageStatus.Failed } : m));
    }
  };

  const handleRecordingComplete = (blob: Blob, duration: number, language: string) => {
    const newMessage: ScribeMessage = {
      id: Date.now().toString(),
      title: `Recording — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
      createdAt: new Date().toISOString(),
      durationSec: duration,
      status: MessageStatus.Saved,
      audioBlob: blob,
      chatHistory: [],
      language: language
    };

    setMessages(prev => [newMessage, ...prev]);
    setIsRecordingMode(false);
    processRecording(newMessage.id, blob, language);
  };

  const handleDelete = (id: string) => {
      if (selectedMessageId === id) setSelectedMessageId(null);
      setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleRename = (id: string, newName: string) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, title: newName } : m));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const blob = new Blob([file], { type: file.type });
      const defaultLanguage = "English";

      const newMessage: ScribeMessage = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        createdAt: new Date().toISOString(),
        durationSec: 0, 
        status: MessageStatus.Saved,
        audioBlob: blob,
        chatHistory: [],
        language: defaultLanguage
      };

      setMessages(prev => [newMessage, ...prev]);
      processRecording(newMessage.id, blob, defaultLanguage);
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileUpload = () => {
      fileInputRef.current?.click();
  };

  const updateChatHistory = (id: string, newHistory: ChatMessage[]) => {
      setMessages(prev => prev.map(m => m.id === id ? {...m, chatHistory: newHistory} : m));
  };

  const goHome = () => {
      setHasEntered(false);
      setSelectedMessageId(null);
      setIsRecordingMode(false);
  };

  const resetView = () => {
      setSelectedMessageId(null);
      setIsRecordingMode(false);
  }

  return (
    <div className={`${theme}`}>
      <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col font-serif text-slate-900 dark:text-white transition-colors duration-300">
        
        {!hasEntered ? (
          <WelcomeScreen onEnter={() => setHasEntered(true)} />
        ) : (
          <>
            <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

            {/* Header */}
            <header className="bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10 sticky top-0 z-30">
              <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                <button onClick={goHome} className="flex items-center gap-3 hover:opacity-70 transition-opacity group">
                   <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center">
                       <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                   </div>
                   <span className="text-xl font-bold font-serif italic text-black dark:text-white">OWN Audio</span>
                </button>
                
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
              
              {selectedMessageId ? (
                 <DetailView 
                    message={messages.find(m => m.id === selectedMessageId)!} 
                    onBack={resetView} 
                    onUpdateChat={updateChatHistory} 
                 />
              ) : isRecordingMode ? (
                  <div>
                      <div className="flex justify-between items-center mb-6 px-2">
                          <h2 className="text-lg font-bold text-black dark:text-white font-serif uppercase">New Recording</h2>
                          <button onClick={() => setIsRecordingMode(false)} className="text-slate-500 hover:text-red-600 text-xs font-mono font-bold uppercase tracking-widest transition-colors">CLOSE</button>
                      </div>
                      <Recorder onRecordingComplete={handleRecordingComplete} />
                  </div>
              ) : (
                  <>
                      <div className="flex items-center justify-between mb-8 px-2">
                          <h2 className="text-4xl text-black dark:text-white font-serif italic tracking-tight">Inbox</h2>
                          <button 
                            onClick={triggerFileUpload} 
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-mono uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm"
                          >
                             <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import</span>
                          </button>
                      </div>
                      <MessageList 
                          messages={messages} 
                          onSelect={setSelectedMessageId} 
                          onDelete={handleDelete}
                          onRename={handleRename}
                          onImport={triggerFileUpload}
                      />
                  </>
              )}

            </main>

            {/* Floating Action Button */}
            {!isRecordingMode && !selectedMessageId && (
              <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none z-20">
                <button
                  onClick={() => setIsRecordingMode(true)}
                  className="pointer-events-auto bg-black dark:bg-white text-white dark:text-black rounded-full px-8 py-4 shadow-xl hover:scale-105 transition-transform flex items-center gap-3 border border-transparent"
                >
                  <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="font-mono font-bold tracking-widest text-sm">RECORD</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;