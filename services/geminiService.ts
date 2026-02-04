import { GoogleGenAI, GenerateContentResponse, Part, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- ROBUST EXECUTION WRAPPER ---
const runGenAI = async <T>(
    operation: () => Promise<T>, 
    retries = 3, 
    fallback: T | null = null,
    context: string = "Operation"
): Promise<T> => {
    try {
        return await operation();
    } catch (e: any) {
        const msg = e?.message || JSON.stringify(e);
        const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
        
        if (isRateLimit && retries > 0) {
            const backoff = 2000 * (4 - retries);
            console.warn(`[Gemini:${context}] 429/Quota hit. Retrying in ${backoff}ms... (${retries} left)`);
            await delay(backoff);
            return runGenAI(operation, retries - 1, fallback, context);
        }
        
        if (fallback !== null) {
            console.warn(`[Gemini:${context}] Failed, returning fallback. Error:`, e);
            return fallback;
        }
        
        if (isRateLimit) throw new Error("⚠️ Neural Engine Overload: API Quota Exceeded. Please wait a moment.");
        throw e;
    }
};

export const prepareImageForAi = async (src: string | File): Promise<{ data: string, mimeType: string }> => {
  if (typeof src === 'string') {
    if (src.startsWith('data:')) {
      const base64 = src.split(',')[1];
      const mimeType = src.substring(src.indexOf(':') + 1, src.indexOf(';'));
      return { data: base64, mimeType };
    }
    // Fallback: if it's a URL, we need to fetch it to get base64
    try {
        const response = await fetch(src);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve({ data: base64, mimeType: blob.type });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        throw new Error("Could not fetch remote image for AI processing.");
    }
  } else {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ data: base64, mimeType: src.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(src);
    });
  }
};

const toPart = async (src: string | File): Promise<Part> => {
  if (typeof src === 'string') {
    if (src.startsWith('data:')) {
      const base64 = src.split(',')[1];
      const mimeType = src.substring(src.indexOf(':') + 1, src.indexOf(';'));
      return { inlineData: { data: base64, mimeType } };
    }
    // Fix: Handle non-data URLs by converting them
    const prepared = await prepareImageForAi(src);
    return { inlineData: { data: prepared.data, mimeType: prepared.mimeType } };
  } else {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ inlineData: { data: base64, mimeType: src.type } });
        };
        reader.readAsDataURL(src);
    });
  }
};

export const generateNanoImage = async (
  prompt: string, 
  aspectRatio: string = "1:1", 
  inputImages: string | string[] | null = null, 
  grading: string = "Standard",
  params: { negativePrompt?: string, guidanceScale?: number, seed?: number } = {},
  retryCount = 0
): Promise<string> => {
  try {
    const ai = getAI();
    let visualAnchors: string[] = [];
    if (Array.isArray(inputImages)) visualAnchors = inputImages;
    else if (typeof inputImages === 'string') visualAnchors = [inputImages];
    visualAnchors = visualAnchors.filter(Boolean);

    let targetRatio = aspectRatio;
    if (aspectRatio === "4:5") targetRatio = "3:4";

    let processedPrompt = prompt;
    try {
        const trimmed = prompt.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            const jsonObj = JSON.parse(trimmed);
            if (jsonObj && typeof jsonObj === 'object') {
                processedPrompt = Object.entries(jsonObj)
                    .map(([k, v]) => `${k.toUpperCase()}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
                    .join('. ');
            }
        }
    } catch (e) { }

    const gradingMap: Record<string, string> = {
        'Standard': 'Natural balanced color, realistic textures.',
        'Vivid Pop': 'Highly saturated, vibrant colors, clean aesthetic.',
        'HDR Sharp': 'High dynamic range, extreme micro-details, sharp focus.',
        'Deep Film': 'Cinematic film stock, soft highlights, moody contrast.',
        'Soft Matte': 'Flat color profile, soft diffused lighting, minimalist.',
        'Mono Noir': 'Classic black and white, high contrast, silver halide texture.'
    };

    const identityProtocol = visualAnchors.length > 0 
        ? `[IDENTITY LOCK]: The provided image(s) are ABSOLUTE REFERENCE. Maintain the exact face, body type, clothing materials, and lighting characteristics from the source images.`
        : '';

    const technicalStandard = `
    [TECHNICAL SPEC]: Ultra-high fidelity, photorealistic 8k, RAW photography style, sharp focus, volumetric lighting.
    [COLOR GRADING]: ${gradingMap[grading] || gradingMap['Standard']}
    [NEGATIVE PROMPT]: Avoid: blurry, low quality, distorted face, changing background, illustration, painting, cartoon, 3d render, noise, artifacts, deformed, bad anatomy.
    `;
    
    const finalFullPrompt = `
    ${identityProtocol}
    [ACTION/SCENE]: ${processedPrompt}
    ${technicalStandard}
    `.trim();

    const genParts: Part[] = [];
    for (const img of visualAnchors) { 
        try { genParts.push(await toPart(img)); } catch (e) { console.warn("Failed to attach anchor:", e); }
    }
    genParts.push({ text: finalFullPrompt });

    const effectiveSeed = retryCount > 0 ? undefined : params.seed;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', 
        contents: { parts: genParts },
        config: { 
          imageConfig: { aspectRatio: targetRatio as any },
          seed: effectiveSeed,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
        }
    });

    if (!response.candidates || response.candidates.length === 0) {
        if (retryCount < 3) {
            await delay(2000 * (retryCount + 1));
            return generateNanoImage(prompt, aspectRatio, inputImages, grading, params, retryCount + 1);
        }
        throw new Error("Neural Grid Failure");
    }

    const candidate = response.candidates[0];

    if (candidate.finishReason === 'SAFETY') {
        if (retryCount < 2) {
             await delay(1500);
             return generateNanoImage(prompt, aspectRatio, inputImages, grading, params, retryCount + 1);
        }
        throw new Error(`Neural Grid Failure: Safety filter triggered.`);
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        if (retryCount < 3) {
            await delay(2000 * (retryCount + 1));
            return generateNanoImage(prompt, aspectRatio, inputImages, grading, params, retryCount + 1);
        }
        throw new Error(`Neural Grid Failure`);
    }

    for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }

    const textPart = candidate.content.parts.find(p => p.text);
    if (textPart) {
        if (retryCount < 1) {
             await delay(2000);
             return generateNanoImage(prompt, aspectRatio, inputImages, grading, params, retryCount + 1);
        }
        throw new Error(`Model Refusal: ${textPart.text}`);
    }
    
    throw new Error("Empty Render");

  } catch (error: any) { 
      const msg = error?.message || JSON.stringify(error);
      const isRateLimit = error?.status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');

      if (isRateLimit && retryCount < 3) {
          await delay(3000 * (retryCount + 1)); 
          return generateNanoImage(prompt, aspectRatio, inputImages, grading, params, retryCount + 1);
      }
      if (isRateLimit) throw new Error("⚠️ Neural Engine Overload");
      throw error; 
  }
};

export const generativeFill = async (image: string, mask: string, prompt: string): Promise<string> => {
    return runGenAI(async () => {
        const ai = getAI();
        const imagePart = await toPart(image);
        const maskPart = await toPart(mask);
        
        // Command Protocol refined for strict adherence
        const technicalPrompt = `
        [INPAINTING PROTOCOL - STRICT BOUNDARIES]
        MODIFICATION REQUEST: ${prompt}
        
        CRITICAL RULES:
        1. MASK ADHERENCE: Modify ONLY the pixels defined by the white area in the provided mask image. 
        2. SPATIAL INTEGRITY: Do not change any content outside of the masked region.
        3. SEAMLESS BLENDING: Ensure lighting, texture, and pixel-color transition perfectly from the original image at the mask boundaries.
        4. REALISM: Photorealistic 8k execution, octane render quality.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash-image', 
            contents: { parts: [imagePart, maskPart, { text: technicalPrompt }] }
        });
        
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) { 
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; 
            }
        }
        throw new Error("Generative Fill failed");
    }, 2);
};

export const neuralHeal = async (image: string, mask: string, contextPrompt?: string): Promise<string> => {
    return runGenAI(async () => {
        const ai = getAI();
        const imagePart = await toPart(image);
        const maskPart = await toPart(mask);
        
        const technicalPrompt = `
        [NEURAL HEALING PROTOCOL - SEAMLESS TEXTURE RESTORATION]
        OBJECTIVE: Perform professional-grade 'Healing' on the masked area.
        ${contextPrompt ? `CONTEXT: ${contextPrompt}` : 'GOAL: Remove all artifacts, blemishes, or cracks within the masked region.'}
        
        CRITICAL INSTRUCTIONS:
        1. ANALYZE SURROUNDINGS: Identify the specific material, texture frequency, and lighting from pixels immediately adjacent to the mask.
        2. CONTENT-AWARE SYNTHESIS: Reconstruct the masked region so it matches the surroundings perfectly. 
        3. ELIMINATE ARTIFACTS: Ensure all blemishes, cracks, or noise marked by the mask are completely removed and replaced with logical, continuous textures.
        4. NO VISIBLE SEAMS: The transition between original pixels and generated pixels must be invisible.
        5. PRESERVE STRUCTURE: If the mask covers an edge or a structural detail, reconstruct that edge following the existing geometric flow.
        6. OUTPUT: Ultra-high fidelity, photorealistic 8k quality.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash-image', 
            contents: { parts: [imagePart, maskPart, { text: technicalPrompt }] }
        });
        
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) { 
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; 
            }
        }
        throw new Error("Neural Healing failed");
    }, 2);
};

export const expandPrompt = async (prompt: string): Promise<string> => {
    return runGenAI(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Refine this concept for high-end cinematic image generation: ${prompt}`,
            config: { systemInstruction: "Output ONLY a single descriptive paragraph." }
        });
        return response.text || prompt;
    }, 2, prompt);
};

export const retouchImage = async (image: string, mask: string, prompt?: string): Promise<string> => {
    return runGenAI(async () => {
        const ai = getAI();
        const imagePart = await toPart(image);
        const maskPart = await toPart(mask);
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash-image', 
            contents: { parts: [imagePart, maskPart, { text: prompt || "Professional seamless retouching." }] }
        });
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
        }
        throw new Error("Retouch failed.");
    }, 2);
};

export const describeImage = async (img: string): Promise<string> => {
    return runGenAI(async () => {
        const ai = getAI();
        const part = await toPart(img);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [part, { text: "Describe this image technically for an image generation prompt." }] }
        });
        return response.text || "";
    }, 2, "");
};

export const detectObjects = async (img: string): Promise<any[]> => {
    return runGenAI(async () => {
        const ai = getAI();
        const part = await toPart(img);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [part, { text: "Detect objects. Return ONLY a JSON array." }] },
            config: { responseMimeType: "application/json" }
        });
        try { return JSON.parse(response.text || "[]"); } catch { return []; }
    }, 1, []);
};

export const refinePrompt = async (prompt: string): Promise<string> => {
    return runGenAI(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Expand for 8k photography: ${prompt}`
        });
        return response.text || prompt;
    }, 2, prompt);
};

export const generateVideoScript = async (story: string, sceneCount: number): Promise<{prompt: string}[]> => {
    return runGenAI(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Divide into ${sceneCount} technical scene prompts for video generation: "${story}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { prompt: { type: Type.STRING } } } }
            }
        });
        try { return JSON.parse(response.text || "[]"); } catch { return []; }
    }, 2, []);
};

export const generateStoryScenes = async (context: string, count: number): Promise<string[]> => {
    return runGenAI(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate exactly ${count} cinematic image prompts forming a narrative sequence based on: "${context}". 
            
            Format each prompt string precisely as: "Scene-X: [The detailed visual description]". 
            X is the scene number starting from 1. 
            Ensure each scene logically flows from the previous one for visual continuity. 
            Describe camera movement, lighting, and specific actor actions. 
            Return ONLY a JSON array of strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        });
        try { return JSON.parse(response.text || "[]"); } catch { return []; }
    }, 2, []);
};

export const suggestStyleFromPrompt = async (prompt: string, flavors: string[], grades: string[]): Promise<{ flavorId: string, gradeId: string, reasoning: string }> => {
    return runGenAI(async () => {
        const ai = getAI();
        const instruction = `Analyze: "${prompt}". Choose best flavor and grade. Return JSON.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: instruction,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        flavorId: { type: Type.STRING },
                        gradeId: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    }
                }
            }
        });
        try { return JSON.parse(response.text || "{}"); } catch { throw new Error("Parse error"); }
    }, 2, { flavorId: flavors[0], gradeId: grades[0], reasoning: "Default fallback" });
};