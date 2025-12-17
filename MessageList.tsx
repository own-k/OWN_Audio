import React, { useState } from 'react';
import { ScribeMessage, MessageStatus } from '../types';
import { FileAudio, ChevronRight, Loader2, AlertCircle, Trash2, Edit2, Upload, ArrowUpRight } from 'lucide-react';

interface MessageListProps {
  messages: ScribeMessage[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onImport: () => void;
}

const StatusIcon: React.FC<{ status: MessageStatus }> = ({ status }) => {
  switch (status) {
    case MessageStatus.Ready:
      return <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />;
    case MessageStatus.Transcribing:
    case MessageStatus.Analyzing:
      return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
    case MessageStatus.Failed:
      return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    default:
      return <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />;
  }
};

const MessageList: React.FC<MessageListProps> = ({ messages, onSelect, onDelete, onRename, onImport }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const startEditing = (e: React.MouseEvent, msg: ScribeMessage) => {
    e.stopPropagation();
    setEditingId(msg.id);
    setEditName(msg.title);
  };

  const saveRename = (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    onRename(id, editName);
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Native confirm dialog for simplicity and reliability
    if (window.confirm("Are you sure you want to delete this recording? This cannot be undone.")) {
        onDelete(id);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up px-4">
        <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mb-8 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-inner rotate-3">
             <ArrowUpRight className="w-10 h-10 text-slate-400 dark:text-slate-600" />
        </div>
        <h3 className="font-serif-display text-3xl text-slate-900 dark:text-slate-100 mb-3">It's quiet here</h3>
        <p className="font-mono text-sm max-w-xs text-center leading-relaxed text-slate-500 dark:text-slate-400 mb-8">
          Tap the <span className="text-red-600 font-bold mx-1">RECORD</span> button below to start capturing your thoughts.
        </p>
        
        <button onClick={onImport} className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-mono uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm hover:shadow-md">
            <Upload className="w-4 h-4" /> Import Audio
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      {messages.map((msg) => (
        <div
          key={msg.id}
          onClick={() => onSelect(msg.id)}
          className="w-full bg-white dark:bg-slate-900/60 backdrop-blur-sm p-6 rounded-3xl border border-slate-200 dark:border-slate-800/60 shadow-sm hover:shadow-lg dark:hover:border-slate-700/50 transition-all duration-300 flex items-center justify-between group text-left relative overflow-hidden cursor-pointer"
        >
          {/* Status Indicator Bar */}
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300 ${msg.status === MessageStatus.Ready ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
          
          <div className="flex items-center space-x-5 flex-1 pl-2">
            <div className={`p-4 rounded-2xl flex-shrink-0 transition-colors ${
                msg.status === MessageStatus.Ready 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-500' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              <FileAudio className="w-6 h-6" />
            </div>
            
            <div className="flex-1 min-w-0 pr-4">
              {editingId === msg.id ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white px-3 py-2 text-lg rounded-lg w-full focus:outline-none focus:border-emerald-500 font-serif-display"
                        autoFocus
                      />
                      <button onClick={(e) => saveRename(e, msg.id)} className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-600">Save</button>
                  </div>
              ) : (
                  <h3 className="font-serif-display text-xl text-slate-900 dark:text-slate-100 leading-tight mb-2 truncate">{msg.title}</h3>
              )}
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-dot text-slate-500 dark:text-slate-400 uppercase tracking-widest font-medium">
                <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>{Math.floor(msg.durationSec / 60)}:{(msg.durationSec % 60).toString().padStart(2, '0')}</span>
                <span className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md ml-1">
                   <StatusIcon status={msg.status} />
                   <span className={msg.status === MessageStatus.Ready ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}>{msg.status}</span>
                </span>
                {msg.language && (
                   <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-500 dark:text-slate-500">{msg.language}</span>
                   </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
              <button 
                onClick={(e) => startEditing(e, msg)}
                className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                title="Rename"
              >
                  <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={(e) => handleDelete(e, msg.id)}
                className="p-3 text-slate-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                title="Delete"
              >
                  <Trash2 className="w-5 h-5" />
              </button>
              <div className="w-2"></div>
              <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;