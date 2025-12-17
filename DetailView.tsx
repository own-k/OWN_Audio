import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ScribeMessage, TabView, MessageStatus, ChatMessage, MindMapNode } from '../types';
import { ArrowLeft, Send, Layout, Download, FileText, ZoomIn, ZoomOut, Move, Maximize, RefreshCw } from 'lucide-react';
import { generateTutorResponse } from '../services/geminiService';
import AudioPlayer from './AudioPlayer';
import { jsPDF } from 'jspdf';

interface DetailViewProps {
  message: ScribeMessage;
  onBack: () => void;
  onUpdateChat: (id: string, newHistory: ChatMessage[]) => void;
}

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-red-500 dark:text-red-400">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

// --- Interactive Mind Map Component ---

interface LayoutNode {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    depth: number;
    children: LayoutNode[];
}

const InteractiveMindMap: React.FC<{ root: MindMapNode }> = ({ root }) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Layout constants
    const NODE_WIDTH_BASE = 220;
    const NODE_HEIGHT = 50;
    const LEVEL_SPACING = 300;
    const VERTICAL_SPACING = 20;

    // Calculate layout
    const layout = useMemo(() => {
        if (!root) return null;

        let currentY = 0;
        const nodes: LayoutNode[] = [];
        const edges: { x1: number, y1: number, x2: number, y2: number, id: string }[] = [];

        // Recursive function to calculate dimensions and vertical positions
        const processNode = (node: MindMapNode, depth: number): LayoutNode => {
            const width = Math.min(Math.max(node.label.length * 8 + 40, NODE_WIDTH_BASE), 400); // Dynamic width based on text
            
            // Color logic based on screenshot
            let color = 'bg-slate-700';
            if (depth === 0) color = '#4c4c6d'; // Root: Purple/Blue
            else if (depth === 1) color = '#334155'; // Level 1: Slate
            else color = '#1e3a29'; // Level 2+: Dark Green

            const layoutNode: LayoutNode = {
                id: node.id || Math.random().toString(),
                label: node.label,
                x: depth * LEVEL_SPACING,
                y: 0, // Placeholder
                width,
                height: NODE_HEIGHT,
                color,
                depth,
                children: []
            };

            if (node.children && node.children.length > 0) {
                layoutNode.children = node.children.map(child => processNode(child, depth + 1));
                // Center parent vertically relative to children
                const firstChild = layoutNode.children[0];
                const lastChild = layoutNode.children[layoutNode.children.length - 1];
                layoutNode.y = (firstChild.y + lastChild.y) / 2;
            } else {
                // Leaf node
                layoutNode.y = currentY;
                currentY += NODE_HEIGHT + VERTICAL_SPACING;
            }

            nodes.push(layoutNode);
            return layoutNode;
        };

        const rootLayout = processNode(root, 0);

        // Shift everything to center vertically in view initially roughly
        const centerYOffset = (currentY / 2) - (rootLayout.y);
        
        // Flatten for rendering
        const flattenedNodes: LayoutNode[] = [];
        const flattenedEdges: any[] = [];

        const traverseAndShift = (node: LayoutNode) => {
            // Apply slight formatting adjustments
            flattenedNodes.push(node);
            
            node.children.forEach(child => {
                flattenedEdges.push({
                    id: `${node.id}-${child.id}`,
                    x1: node.x + node.width,
                    y1: node.y + node.height / 2,
                    x2: child.x,
                    y2: child.y + child.height / 2
                });
                traverseAndShift(child);
            });
        };

        traverseAndShift(rootLayout);

        return { nodes: flattenedNodes, edges: flattenedEdges, height: currentY, width: rootLayout.width + (3 * LEVEL_SPACING) };
    }, [root]);

    useEffect(() => {
        // Center initial view
        if (containerRef.current && layout) {
            const containerH = containerRef.current.clientHeight;
            const containerW = containerRef.current.clientWidth;
            setPan({
                x: 50, // Slight padding left
                y: (containerH / 2) - (layout.height / 2) + 100 // Roughly center
            });
        }
    }, [layout]);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const scaleAmount = -e.deltaY * 0.001;
            const newZoom = Math.min(Math.max(0.1, zoom + scaleAmount), 3);
            setZoom(newZoom);
        } else {
            // Pan
            setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (!layout) return <div className="text-white">Generating map...</div>;

    return (
        <div 
            ref={containerRef}
            className="w-full h-[600px] bg-[#1a1a1a] rounded-3xl overflow-hidden relative border border-slate-800 cursor-move"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
                <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 shadow-lg border border-slate-600"><ZoomIn className="w-5 h-5"/></button>
                <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.1))} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 shadow-lg border border-slate-600"><ZoomOut className="w-5 h-5"/></button>
                <button onClick={() => { setZoom(1); setPan({x: 50, y: containerRef.current ? containerRef.current.clientHeight/2 - layout.height/2 : 0}) }} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 shadow-lg border border-slate-600"><RefreshCw className="w-5 h-5"/></button>
            </div>

            {/* SVG Content */}
            <svg 
                className="w-full h-full pointer-events-none" 
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                    {/* Edges */}
                    {layout.edges.map(edge => (
                        <path
                            key={edge.id}
                            d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 100} ${edge.y1}, ${edge.x2 - 100} ${edge.y2}, ${edge.x2} ${edge.y2}`}
                            fill="none"
                            stroke="#525252"
                            strokeWidth="2"
                            className="opacity-60"
                        />
                    ))}
                    
                    {/* Nodes */}
                    {layout.nodes.map(node => (
                        <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                            {/* Pill Background */}
                            <rect
                                width={node.width}
                                height={node.height}
                                rx={node.height / 2} // Pill shape
                                fill={node.color}
                                className="shadow-lg"
                                stroke={node.depth === 0 ? "rgba(255,255,255,0.2)" : "transparent"}
                                strokeWidth={1}
                            />
                            {/* Text */}
                            <text
                                x={node.width / 2}
                                y={node.height / 2}
                                dy=".35em"
                                textAnchor="middle"
                                fill="white"
                                className="font-sans text-sm font-medium pointer-events-none"
                                style={{ fontSize: '13px', letterSpacing: '0.02em' }}
                            >
                                {node.label.length > 40 ? node.label.substring(0, 38) + '...' : node.label}
                            </text>
                            
                            {/* Expand Indicator (Visual Only) */}
                            {node.children.length === 0 && (
                                <path d={`M ${node.width - 15} ${node.height/2 - 4} L ${node.width - 11} ${node.height/2} L ${node.width - 15} ${node.height/2 + 4}`} stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
                            )}
                        </g>
                    ))}
                </g>
            </svg>
            
            <div className="absolute top-4 left-6 text-xs font-mono text-slate-500 uppercase tracking-widest pointer-events-none select-none">
                Interactive Map • Scroll to Zoom • Drag to Pan
            </div>
        </div>
    );
};


const DetailView: React.FC<DetailViewProps> = ({ message, onBack, onUpdateChat }) => {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.Summary);
  const [tutorMode, setTutorMode] = useState<'Teach Me'|'Test Me'>('Teach Me');
  const [tutorInput, setTutorInput] = useState("");
  const [tutorHistory, setTutorHistory] = useState<ChatMessage[]>(message.chatHistory || []);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onUpdateChat(message.id, tutorHistory);
  }, [tutorHistory, message.id, onUpdateChat]);

  const handleTutorSend = async () => {
      if (!tutorInput.trim() || !message.transcriptText) return;
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: tutorInput, timestamp: Date.now() };
      const newHistory = [...tutorHistory, userMsg];
      setTutorHistory(newHistory);
      setTutorInput("");
      setIsTyping(true);

      try {
          const textResponse = await generateTutorResponse(message.transcriptText, newHistory, tutorMode, tutorInput);
          const botMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: textResponse, timestamp: Date.now() };
          setTutorHistory(prev => [...prev, botMsg]);
      } catch (e) {
          console.error(e);
      } finally {
          setIsTyping(false);
      }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [tutorHistory, isTyping, activeTab]);

  const handleJsonExport = () => {
      const data = { title: message.title, summary: message.analysis?.summary_long, transcript: message.transcriptText, mind_map: message.analysis?.mind_map };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${message.title.replace(/\s+/g, '_')}_export.json`;
      a.click();
  };

  const handlePdfExport = () => {
      const doc = new jsPDF();
      const margin = 20; let y = 20;
      const pageWidth = doc.internal.pageSize.getWidth(); const maxLineWidth = pageWidth - margin * 2;
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(message.title, maxLineWidth); doc.text(titleLines, margin, y); y += titleLines.length * 8 + 10;
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
      doc.text(`Date: ${new Date(message.createdAt).toLocaleDateString()}`, margin, y); y += 6;
      doc.text(`Duration: ${Math.floor(message.durationSec / 60)}:${(message.durationSec % 60).toString().padStart(2, '0')}`, margin, y); y += 15;
      if (message.analysis?.summary_long) {
          doc.setFontSize(14); doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.text("Summary", margin, y); y += 8;
          doc.setFontSize(11); doc.setFont("helvetica", "normal"); const summaryLines = doc.splitTextToSize(message.analysis.summary_long, maxLineWidth); doc.text(summaryLines, margin, y); y += summaryLines.length * 6 + 15;
      }
      if (y > 250) { doc.addPage(); y = 20; }
      if (message.transcriptText) {
          doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("Transcript", margin, y); y += 8;
          doc.setFontSize(10); doc.setFont("courier", "normal"); const transcriptLines = doc.splitTextToSize(message.transcriptText, maxLineWidth);
          for (let i = 0; i < transcriptLines.length; i++) { if (y > 280) { doc.addPage(); y = 20; } doc.text(transcriptLines[i], margin, y); y += 5; }
      }
      doc.save(`${message.title.replace(/\s+/g, '_')}.pdf`);
  };

  const renderTabContent = () => {
    if (message.status !== MessageStatus.Ready) {
       return (
           <div className="flex flex-col items-center justify-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mb-4"></div>
               <p className="text-slate-500 font-mono text-sm">PROCESSING...</p>
           </div>
       );
    }

    switch (activeTab) {
      case TabView.Transcript:
        return (
          <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-loose font-mono text-sm shadow-sm rounded-3xl">
            {message.transcriptText}
          </div>
        );
      case TabView.Summary:
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden rounded-3xl">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                <h3 className="text-slate-900 dark:text-white font-serif-display text-2xl flex items-center gap-2 mb-4">
                    <Layout className="w-5 h-5 text-red-500"/> Overview
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed font-sans">{message.analysis?.summary_short}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl">
                <h3 className="font-serif-display text-xl text-slate-900 dark:text-white mb-6">Detailed Summary</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-sans">{message.analysis?.summary_long}</p>
            </div>
          </div>
        );

      case TabView.MindMap:
          return (
              <div className="bg-slate-50 dark:bg-black p-1 border border-slate-200 dark:border-slate-800 shadow-inner rounded-3xl overflow-hidden min-h-[600px] flex items-center justify-center">
                  {message.analysis?.mind_map ? (
                      <InteractiveMindMap root={message.analysis.mind_map} />
                  ) : (
                      <div className="text-slate-400 font-mono text-sm">No map generated.</div>
                  )}
              </div>
          );

      case TabView.Tutor:
          return (
              <div className="flex flex-col h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative rounded-3xl shadow-sm overflow-hidden">
                   <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                        {tutorHistory.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 space-y-4">
                                <p className="font-mono text-xs uppercase tracking-widest">Start a conversation</p>
                            </div>
                        )}
                        {tutorHistory.map((msg) => (
                             <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && (
                                    <div className="max-w-[85%] bg-slate-100 dark:bg-slate-800 px-6 py-4 text-slate-700 dark:text-slate-200 text-sm font-sans leading-relaxed border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm shadow-sm">
                                        <FormattedText text={msg.text} />
                                    </div>
                                )}
                                {msg.role === 'user' && (
                                    <div className="max-w-[85%] bg-red-500 dark:bg-red-700 px-6 py-4 text-white text-sm font-sans leading-relaxed rounded-2xl rounded-tr-sm shadow-md">
                                        {msg.text}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                             <div className="flex justify-start">
                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl">
                                     <div className="w-1.5 h-1.5 bg-slate-400 animate-bounce"></div>
                                     <div className="w-1.5 h-1.5 bg-slate-400 animate-bounce delay-100"></div>
                                     <div className="w-1.5 h-1.5 bg-slate-400 animate-bounce delay-200"></div>
                                </div>
                            </div>
                        )}
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
                       <div className="flex gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-1.5 rounded-full shadow-sm focus-within:ring-2 focus-within:ring-red-500 transition-all">
                         <input 
                            type="text" 
                            value={tutorInput}
                            onChange={(e) => setTutorInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTutorSend()}
                            placeholder="Ask me anything..."
                            className="flex-1 px-4 bg-transparent focus:outline-none text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                         />
                         <button 
                            onClick={handleTutorSend}
                            disabled={!tutorInput.trim() || isTyping}
                            className="p-3 bg-slate-900 dark:bg-white hover:bg-red-600 dark:hover:bg-red-500 text-white dark:text-black rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                         >
                             <Send className="w-4 h-4" />
                         </button>
                       </div>
                   </div>
              </div>
          );
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center relative justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="font-serif-display text-xl text-slate-900 dark:text-white tracking-tight truncate max-w-xs md:max-w-md">{message.title}</h1>
            </div>
            <div className="flex items-center gap-1">
                 <button onClick={handlePdfExport} className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Export PDF">
                     <FileText className="w-5 h-5" />
                 </button>
                 <button onClick={handleJsonExport} className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Export JSON">
                     <Download className="w-5 h-5" />
                 </button>
            </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-lg">
             <AudioPlayer blob={message.audioBlob} />
        </div>

        <div className="flex justify-center border-b border-slate-200 dark:border-slate-800">
            {Object.values(TabView).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 md:px-8 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
                        activeTab === tab 
                        ? 'border-red-500 text-slate-900 dark:text-white' 
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>

        <div className="animate-in fade-in duration-300">
            {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default DetailView;