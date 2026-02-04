import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
// Added: Corrected import to use generateNanoImage instead of non-existent generateModelImage
import { generateNanoImage, describeImage, detectObjects, refinePrompt } from '../services/geminiService';
// @ts-ignore
import * as htmlToImage from 'html-to-image';

// Import Modular Components
import { StudioHeader } from './studio/StudioHeader';
import { NewsFeed } from './studio/NewsFeed';
import { ResultsPanel } from './studio/ResultsPanel';
import { ComfyCanvas } from './studio/ComfyCanvas';
import { BottomControls } from './studio/BottomControls';

// Import Constants or Helpers if needed, but data is passed down
import { ChatMessage, DetectedObject } from '../types';

const PRESET_DATA = {
    Style: [
        { label: "Cinematic", value: "cinematic lighting, movie scene, dramatic atmosphere, color graded" },
        { label: "Studio", value: "professional studio lighting, clean background, 8k resolution, sharp focus" },
        { label: "Neon", value: "cyberpunk style, neon lights, high contrast, futuristic vibe" },
        { label: "Matte", value: "matte finish, soft lighting, pastel colors, minimalist" }
    ],
    Sport: [
        { label: "Soccer", value: "soccer jersey, grass field background, dynamic kicking pose" },
        { label: "Gym", value: "fitness gear, gym environment, dumbbell weights, intense workout" },
        { label: "Running", value: "marathon runner, blurred street background, motion blur, energetic" },
        { label: "Basketball", value: "basketball jersey, court floor, action jump shot" }
    ],
    Lighting: [
        { label: "Golden Hour", value: "warm sunlight, sunset glow, soft shadows, outdoor" },
        { label: "Rembrandt", value: "dramatic chiaroscuro, moody lighting, artistic shadows" },
        { label: "Softbox", value: "diffused soft light, even illumination, product photography" }
    ],
    Camera: [
        { label: "Wide Angle", value: "wide angle lens, 16mm, expansive view" },
        { label: "Telephoto", value: "telephoto lens, 85mm, bokeh background, subject isolation" },
        { label: "Macro", value: "macro lens, extreme close up, fabric texture details" }
    ]
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const fileToPart = async (file: File): Promise<any> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            });
        };
        reader.readAsDataURL(file);
    });
};

interface BeatstoriaStudioProps {
    isOpen: boolean;
    onClose: () => void;
    initialImage: string | null;
    onApply: (src: string) => void;
    onAddToGallery: (src: string) => void;
    isSmartAssistantActive: boolean;
    toggleSmartAssistant: () => void;
    chatMessages: ChatMessage[];
    setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    onLogSmartAction: (action: string) => void;
    onExecuteAiCommand?: (command: any) => void;

    // Passed Chat Props
    onSendMessage: (text?: string) => void;
    chatInput: string;
    setChatInput: (v: string) => void;
    isChatLoading: boolean;
    // Fix: Added setIsChatLoading to prop definitions to allow local state management of loading status
    setIsChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
    chatAttachments: { file: File, url: string }[];
    setChatAttachments: React.Dispatch<React.SetStateAction<{ file: File, url: string }[]>>;
    chatSession: React.MutableRefObject<Chat | null>;
}

export const BeatstoriaStudio: React.FC<BeatstoriaStudioProps> = ({
    isOpen,
    onClose,
    initialImage,
    onApply,
    onAddToGallery,
    isSmartAssistantActive,
    toggleSmartAssistant = () => { },
    chatMessages,
    setChatMessages,
    onLogSmartAction,
    onExecuteAiCommand,
    onSendMessage,
    chatInput,
    setChatInput,
    isChatLoading,
    // Fix: Destructured setIsChatLoading from props
    setIsChatLoading,
    chatAttachments,
    setChatAttachments,
    chatSession
}) => {
    // STATE
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [nodesToAdd, setNodesToAdd] = useState<string[]>([]);
    const [currentResults, setCurrentResults] = useState<string[]>([]);
    const [historyResults, setHistoryResults] = useState<string[]>([]);
    const [promptText, setPromptText] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
    const [mode, setMode] = useState("Txt2Img");
    const [aspectRatio, setAspectRatio] = useState("1:1");
    const [showGenerateControl, setShowGenerateControl] = useState(false);
    const [leftPanelWidth, setLeftPanelWidth] = useState(280);
    const [rightPanelWidth, setRightPanelWidth] = useState(320);
    const [presetsPanelWidth, setPresetsPanelWidth] = useState(320);
    const [bottomPanelHeight, setBottomPanelHeight] = useState(280);
    const [aiPanelWidth, setAiPanelWidth] = useState(350);
    const [isResizing, setIsResizing] = useState<'left' | 'right-results' | 'right-presets' | 'bottom' | 'ai-panel' | null>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState<DetectedObject[]>([]);
    const [groundingSources, setGroundingSources] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatFileRef = useRef<HTMLInputElement>(null);
    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const generationRef = useRef<boolean>(false);

    // UI State: Kontrol visibilitas panel AI (Default: Tampil)
    const [showAiPanel, setShowAiPanel] = useState(true);

    useEffect(() => {
        if (initialImage) {
            setOriginalImage(initialImage);
            handleAnalyze(initialImage);
        }
    }, [initialImage, isOpen]);

    useEffect(() => {
        if (originalImage) {
            if (mode === "Txt2Img") handleModeChange("Img2Img");
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                let bestRatio = "1:1";
                if (Math.abs(ratio - 0.56) < 0.2) bestRatio = "9:16";
                else if (Math.abs(ratio - 1.77) < 0.2) bestRatio = "16:9";
                setAspectRatio(bestRatio);
            };
            img.src = originalImage;
        } else {
            setMode("Txt2Img");
        }
    }, [originalImage]);

    useEffect(() => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (!promptText.trim()) { setShowGenerateControl(false); return; }
        inactivityTimerRef.current = setTimeout(() => setShowGenerateControl(true), 3000);
        return () => { if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current); };
    }, [promptText]);

    useEffect(() => {
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, [chatMessages, chatAttachments]);

    const handleCaptureContext = async () => {
        const rootElement = document.getElementById('root');
        if (rootElement) {
            onLogSmartAction("Capturing visual context...");
            try {
                const dataUrl = await htmlToImage.toPng(rootElement, {
                    pixelRatio: 0.5,
                    filter: (node: any) => node.tagName !== 'VIDEO'
                });
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], "context_screenshot.png", { type: "image/png" });
                setChatAttachments(prev => [...prev, { file, url: dataUrl }]);
                setChatMessages(prev => [...prev, { role: 'system', text: ">>> Visual Context Captured." }]);
            } catch (error) {
                setChatMessages(prev => [...prev, { role: 'system', text: ">>> Error capturing context." }]);
            }
        }
    };

    const handleModeChange = (newMode: string) => {
        setMode(newMode);
        onLogSmartAction(`Mode switched: ${newMode}`);
    };

    const handleNewChat = () => {
        setChatMessages([]);
        setChatAttachments([]);
        onLogSmartAction("Chat feed purged.");
    };

    const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).slice(0, 10 - chatAttachments.length);
            const newAttachments = newFiles.map((file: any) => ({ file, url: URL.createObjectURL(file) }));
            setChatAttachments(prev => [...prev, ...newAttachments]);
            if (chatFileRef.current) chatFileRef.current.value = '';
        }
    };

    const handleAnalyze = async (img: string) => {
        setIsAnalyzing(true);
        try {
            const desc = await describeImage(img);
            setPromptText(desc);
        } catch (e) { } finally { setIsAnalyzing(false); }
    };

    const handleRefinePrompt = async () => {
        if (!promptText.trim()) return;
        setIsRefining(true);
        try { const refined = await refinePrompt(promptText); setPromptText(refined); } catch (e) { } finally { setIsRefining(false); }
    };

    const handleScan = async () => {
        if (!originalImage) return;
        setIsScanning(true);
        try { const results = await detectObjects(originalImage); setScanResults(results); } catch (e) { } finally { setIsScanning(false); }
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => { if (ev.target?.result) { setOriginalImage(ev.target.result as string); handleAnalyze(ev.target.result as string); } };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSendMessageToStudioOverride = async (customText?: string) => {
        const textToSend = customText || chatInput;
        if ((!textToSend.trim() && chatAttachments.length === 0) || isChatLoading) return;

        const currentAttachments = [...chatAttachments];
        setChatMessages(prev => [...prev, {
            role: 'user',
            text: textToSend,
            // @ts-ignore
            attachments: currentAttachments.map(a => a.url)
        }]);

        setChatInput("");
        setChatAttachments([]);
        setIsChatLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const parts: any[] = [];
            if (textToSend.trim()) parts.push({ text: textToSend });

            for (const attachment of currentAttachments) {
                if (attachment.file.type.startsWith('image/')) {
                    parts.push(await fileToPart(attachment.file));
                }
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts },
                config: {
                    systemInstruction: 'You are an AI Creative Director. CRITICAL RULE: If the user asks for a "prompt" or "image description" to use for generation, you MUST output the response as a SINGLE, RAW, DETAILED PARAGRAPH. Do NOT use bullet points, lists, bold headers, or markdown formatting for the prompt text itself. It must be a clean block of text ready to be copied into an image generator. For other queries, be helpful, concise, and professional.',
                    tools: [{ googleSearch: {} }]
                }
            });

            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            setChatMessages(prev => [...prev, { role: 'model', text: response.text || "", sources }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'model', text: "Neural link timeout." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleGenerate = async (overridePrompt?: string, count: number = 4) => {
        const textToUse = overridePrompt || promptText;
        if (!textToUse.trim()) return;
        if (currentResults.length > 0) setHistoryResults(prev => [...currentResults, ...prev]);
        setIsGenerating(true); generationRef.current = true; setCurrentResults([]);
        try {
            // Fixed: Changed generateModelImage to multiple parallel calls to generateNanoImage
            // generateNanoImage signature: (prompt, aspectRatio, inputImages, grading)
            const inputImages = mode !== "Txt2Img" ? originalImage : null;
            const promises = Array(count).fill(0).map(() =>
                generateNanoImage(textToUse, aspectRatio, inputImages)
            );
            const results = await Promise.all(promises);

            if (generationRef.current) { setCurrentResults(results); setSelectedResultIndex(0); }
        } catch (e) { } finally { setIsGenerating(false); generationRef.current = false; }
    };

    const appendTag = (tag: string) => setPromptText(prev => prev ? `${prev}, ${tag}` : tag);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            if (isResizing === 'left') setLeftPanelWidth(Math.max(220, Math.min(450, e.clientX)));
            else if (isResizing === 'right-results') setRightPanelWidth(Math.max(260, Math.min(500, window.innerWidth - e.clientX)));
            else if (isResizing === 'right-presets') setPresetsPanelWidth(Math.max(260, Math.min(500, window.innerWidth - e.clientX)));
            else if (isResizing === 'bottom') setBottomPanelHeight(Math.max(150, Math.min(600, window.innerHeight - e.clientY)));
            else if (isResizing === 'ai-panel') setAiPanelWidth(Math.max(280, Math.min(800, e.clientX)));
        };
        const handleMouseUp = () => setIsResizing(null);
        if (isResizing) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [isResizing]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-[#050505] text-white flex flex-col font-sans animate-in fade-in duration-500">
            <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />

            {/* Header dengan Toggle Panel AI */}
            <StudioHeader
                onClose={onClose}
                showAiPanel={showAiPanel}
                onToggleAiPanel={() => setShowAiPanel(prev => !prev)}
            />

            <div className="flex-1 flex overflow-hidden relative">
                <NewsFeed width={leftPanelWidth} />
                <div className="w-1 h-full cursor-col-resize hover:bg-purple-500/50 active:bg-purple-500 z-20 absolute" style={{ left: leftPanelWidth }} onMouseDown={() => setIsResizing('left')}></div>
                <ComfyCanvas
                    activeTab={activeTab} setActiveTab={setActiveTab}
                    originalImage={originalImage} generatedImages={currentResults}
                    isCompareMode={isCompareMode} selectedResultIndex={selectedResultIndex}
                    scanResults={scanResults} isAnalyzing={isAnalyzing} isScanning={isScanning}
                    handleUpload={handleUpload} fileInputRef={fileInputRef}
                    isNodeActive={mode !== "Txt2Img"} nodesToAdd={nodesToAdd} onNodesAdded={() => setNodesToAdd([])}
                    promptText={promptText} setPromptText={setPromptText}
                    onGenerate={() => handleGenerate(undefined, 4)} isGenerating={isGenerating}
                    mode={mode} setMode={handleModeChange}
                    onImageUpdate={(newSrc) => setOriginalImage(newSrc)}
                />
                <div className="w-1 h-full cursor-col-resize hover:bg-purple-500/50 active:bg-purple-500 z-20 absolute" style={{ right: rightPanelWidth }} onMouseDown={() => setIsResizing('right-results')}></div>
                <ResultsPanel width={rightPanelWidth} currentImages={currentResults} historyImages={historyResults} onApply={onApply} onUseAsInput={setOriginalImage} onAddToGallery={onAddToGallery} onRemoveBg={() => { }} onDelete={(src, hist) => hist ? setHistoryResults(p => p.filter(i => i !== src)) : setCurrentResults(p => p.filter(i => i !== src))} onAddNode={src => setNodesToAdd(p => [...p, src])} selectedResultIndex={selectedResultIndex} setSelectedResultIndex={setSelectedResultIndex} />
            </div>
            <div className="h-1 w-full bg-black border-t border-white/10 cursor-row-resize hover:bg-purple-500/50 active:bg-purple-500 z-30" onMouseDown={() => setIsResizing('bottom')}></div>
            <BottomControls
                height={bottomPanelHeight} aiPanelWidth={aiPanelWidth}
                showAiPanel={showAiPanel}
                chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
                chatAttachments={chatAttachments} isChatLoading={isChatLoading}
                handleSendMessage={() => handleSendMessageToStudioOverride()} handleNewChat={handleNewChat}
                handleChatFileUpload={handleChatFileUpload} removeAttachment={(i) => setChatAttachments(prev => prev.filter((_, idx) => idx !== i))}
                chatFileRef={chatFileRef} chatScrollRef={chatScrollRef} setIsResizing={setIsResizing}
                promptText={promptText} setPromptText={setPromptText}
                isGenerating={isGenerating} handleGenerate={handleGenerate}
                handleStopGeneration={() => { setIsGenerating(false); generationRef.current = false; }}
                showGenerateControl={showGenerateControl} mode={mode} setMode={handleModeChange}
                aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                handleScan={handleScan} isScanning={isScanning} originalImage={originalImage}
                presetsPanelWidth={presetsPanelWidth} presetData={PRESET_DATA} appendTag={appendTag}
                isCompareMode={isCompareMode} setIsCompareMode={setIsCompareMode} hasGeneratedResults={currentResults.length > 0}
                onRefinePrompt={handleRefinePrompt} isRefining={isRefining}
                isSmartAssistantActive={isSmartAssistantActive} toggleSmartAssistant={toggleSmartAssistant}
                onCaptureContext={handleCaptureContext}
                groundingSources={groundingSources}
                setChatAttachments={setChatAttachments}
            />
        </div>
    );
};