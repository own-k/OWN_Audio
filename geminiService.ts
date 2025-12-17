import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { AnalysisResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// 1. Transcribe Audio
export const transcribeAudio = async (audioBlob: Blob, language: string = "English"): Promise<string> => {
  const base64Audio = await blobToBase64(audioBlob);
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: audioBlob.type || 'audio/webm', // Fallback if type missing
            data: base64Audio,
          },
        },
        {
          text: `Transcribe this audio. The spoken language is ${language}. Provide the full transcript verbatim in ${language}. Do not translate. Do not add any introductory text or markdown formatting like 'Here is the transcript'. Just the raw text.`,
        },
      ],
    },
  });

  if (!response.text) throw new Error("No transcript generated");
  return response.text;
};

// 2. Extract Structure (Summary, Key Points, Mind Map)
export const analyzeTranscript = async (transcript: string, language: string = "English"): Promise<AnalysisResult> => {
  // Simple recursive definition for stability
  const nodeType = {
     type: Type.OBJECT,
     properties: {
        id: { type: Type.STRING },
        label: { type: Type.STRING },
        children: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    children: {
                        type: Type.ARRAY,
                        items: {
                             type: Type.OBJECT,
                             properties: {
                                id: { type: Type.STRING },
                                label: { type: Type.STRING },
                             }
                        }
                    }
                }
            }
        }
     }
  };

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary_short: { type: Type.STRING, description: "A one-sentence summary." },
      summary_long: { type: Type.STRING, description: "A detailed paragraph summary." },
      key_points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of key points discussed." },
      action_items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            item: { type: Type.STRING },
            owner: { type: Type.STRING, nullable: true },
            due: { type: Type.STRING, nullable: true },
          },
        },
        description: "List of actionable items.",
      },
      open_questions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Questions raised but not answered." },
      mind_map: { 
          type: Type.OBJECT, 
          properties: nodeType.properties,
          description: "A hierarchical concept map of the main topics. Root node should be the main theme." 
      }
    },
    required: ["summary_short", "summary_long", "key_points", "action_items", "mind_map"],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze the following transcript. The language of the transcript is ${language}. Ensure the summary and all outputs are written in ${language}.
    1. Extract a structured summary and action items.
    2. Create a 'mind_map' which is a tree of concepts. The root should be the main topic. Children are sub-topics. Limit to 3 levels deep.
    
    Transcript:
    ${transcript}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const jsonText = response.text;
  if (!jsonText) throw new Error("No analysis generated");
  return JSON.parse(jsonText) as AnalysisResult;
};

// 3. Chat with Transcript (Q&A)
export const askQuestion = async (transcript: string, question: string, history: {role: string, parts: {text: string}[]}[] = []): Promise<{answer: string, citations: string[]}> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        role: 'user',
        parts: [{ text: `You are a helpful assistant. Answer questions based ONLY on the provided transcript below. If the answer is not in the transcript, say "I couldn't find that in the recording."
        
        Transcript:
        ${transcript}
        
        Current Question: ${question}` }]
      }
    ],
    config: {
        thinkingConfig: { thinkingBudget: 1024 } 
    }
  });

  return {
    answer: response.text || "No response",
    citations: [] 
  };
};

// 4. Text to Speech
export const speakText = async (text: string): Promise<ArrayBuffer> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");
  
  // Decode Base64
  return decodeAudio(base64Audio);
};

// Helper for decoding
const decodeAudio = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// 5. Tutor Interaction
export const generateTutorResponse = async (transcript: string, history: any[], mode: string, lastUserMessage: string): Promise<string> => {
    const systemPrompt = `You are a helpful Tutor. The user wants to ${mode === 'Teach Me' ? 'learn about' : 'be tested on'} the content of the transcript provided below.
    
    Transcript:
    ${transcript.substring(0, 20000)}
    
    Mode: ${mode}
    
    If 'Teach Me': Explain concepts from the transcript simply, step-by-step. Stop and ask if they understand.
    If 'Test Me': Ask questions about the transcript. Wait for the answer, then correct or validate.
    
    Keep responses conversational and concise (under 3 sentences where possible) so the interaction flows.`;
    
    const contents = [
        { role: 'user', parts: [{ text: `System Instruction: ${systemPrompt}` }] },
        ...history.map((msg: any) => ({
             role: msg.role === 'user' ? 'user' : 'model',
             parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: lastUserMessage }] }
    ];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents as any
    });

    return response.text || "I'm not sure how to respond.";
};