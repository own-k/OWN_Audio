export enum MessageStatus {
  Saved = 'Saved',
  Transcribing = 'Transcribing',
  Analyzing = 'Analyzing',
  Ready = 'Ready',
  Failed = 'Failed',
}

export interface ActionItem {
  item: string;
  owner?: string;
  due?: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}

export interface AnalysisResult {
  summary_short: string;
  summary_long: string;
  key_points: string[];
  action_items: ActionItem[];
  open_questions?: string[];
  mind_map?: MindMapNode; // Root node of the concept map
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  citations?: string[];
  timestamp: number;
}

export interface TutorState {
  mode: 'Teach Me' | 'Test Me';
  isActive: boolean;
  history: ChatMessage[];
  status: 'idle' | 'listening' | 'speaking' | 'processing';
}

export interface ScribeMessage {
  id: string;
  title: string;
  createdAt: string;
  durationSec: number;
  status: MessageStatus;
  audioBlob?: Blob; // In a real app, this would be a URL
  transcriptText?: string;
  analysis?: AnalysisResult;
  chatHistory: ChatMessage[];
  tutor?: TutorState;
  language?: string;
}

export enum TabView {
  Transcript = 'Transcript',
  Summary = 'Summary',
  MindMap = 'Mind Map',
  Tutor = 'Tutor',
}