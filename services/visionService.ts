
// @ts-ignore
import * as imgly from "@imgly/background-removal";

// Helper to clean alpha noise and artifacts from the generated blob
const cleanAlphaArtifacts = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(URL.createObjectURL(blob));
                return;
            }
            
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Aggressive cleaning strategy for "Purge" artifacts
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                // Threshold: Remove faint ghosting artifacts
                if (alpha < 100) { 
                    data[i + 3] = 0;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            const finalUrl = canvas.toDataURL('image/png');
            resolve(finalUrl);
        };
        img.onerror = () => {
            resolve(URL.createObjectURL(blob));
        }
        img.src = URL.createObjectURL(blob);
    });
};

const ensureBlob = async (src: string): Promise<Blob> => {
    try {
        if (src.startsWith('blob:') || src.startsWith('data:')) {
            const response = await fetch(src);
            if (response.ok) return await response.blob();
        }
    } catch (e) {
        console.warn("[VisionService] Direct fetch failed, trying Canvas fallback...");
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context failed"));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Canvas to Blob failed"));
                }, 'image/png');
            } catch (err) {
                reject(new Error("Image processing failed (Tainted Canvas?)"));
            }
        };
        img.onerror = () => reject(new Error("Failed to load image for processing. Check CORS policy."));
        img.src = src;
    });
};

const ASSET_CDNS = [
    "https://static.img.ly/background-removal-data/1.5.5/dist/",
    "https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.5.5/dist/",
    "https://unpkg.com/@imgly/background-removal-data@1.5.5/dist/"
];

const validateCDN = async (baseUrl: string): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000); 
        const response = await fetch(`${baseUrl}manifest.json`, { 
            method: 'GET',
            signal: controller.signal,
            mode: 'cors'
        });
        clearTimeout(id);
        return response.ok;
    } catch (e) {
        return false;
    }
};

/**
 * FAST CHROMA KEY REMOVER (Instant Speed)
 * Removes a specific solid color background.
 * Much faster than Neural Model for solid backgrounds.
 */
export const purgeSpecificColor = async (imageSrc: string, targetHex: string, tolerance: number = 30): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(imageSrc); return; }
            
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Parse Target Hex
            const rT = parseInt(targetHex.slice(1, 3), 16);
            const gT = parseInt(targetHex.slice(3, 5), 16);
            const bT = parseInt(targetHex.slice(5, 7), 16);

            for(let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                
                // Euclidean color distance
                const dist = Math.sqrt((rT-r)**2 + (gT-g)**2 + (bT-b)**2);
                
                if (dist < tolerance) {
                    // Inside tolerance: Transparent
                    data[i+3] = 0;
                } else if (dist < tolerance + 20) {
                    // Edge Feathering (Anti-aliasing fix)
                    const feather = (dist - tolerance) / 20;
                    data[i+3] = Math.min(data[i+3], feather * 255);
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(imageSrc);
        img.crossOrigin = "Anonymous";
        img.src = imageSrc;
    });
};

/**
 * Optical White Remover (Fallback)
 */
export const purgeWhiteBackground = async (imageSrc: string): Promise<string> => {
    return purgeSpecificColor(imageSrc, '#FFFFFF', 40);
};

/**
 * Neural Background Purge Service
 */
export const removeBackgroundLocal = async (
  imageSrc: string, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (!navigator.onLine) {
      throw new Error("Neural Purge Error: Offline. Please check your internet connection.");
  }

  const removeBackground = (imgly as any).removeBackground || (imgly as any).default || imgly;

  if (typeof removeBackground !== 'function') {
      throw new Error("Could not find removeBackground function in module exports.");
  }

  let imageInput: Blob;
  try {
      imageInput = await ensureBlob(imageSrc);
  } catch (e: any) {
      throw new Error(`Input Error: ${e.message || "Could not process source image"}`);
  }

  let lastError: any = null;
  let success = false;
  let resultBlob: Blob | null = null;

  for (const publicPath of ASSET_CDNS) {
      const isReachable = await validateCDN(publicPath);
      if (!isReachable) continue;

      try {
          const config = {
            publicPath: publicPath,
            debug: false, 
            progress: (key: string, current: number, total: number) => {
              if (onProgress) {
                let percent = 0;
                if (key.includes('fetch')) percent = 10 + (current/total) * 40; 
                else if (key.includes('compute')) percent = 50 + (current/total) * 50; 
                else percent = (current / total) * 100;
                onProgress(Math.min(99, Math.round(percent)));
              }
            },
            output: {
              format: "image/png" as const,
              quality: 0.95
            }
          };

          resultBlob = await removeBackground(imageInput, config);
          success = true;
          break;

      } catch (error: any) {
          console.warn(`[VisionService] Engine execution failed with ${publicPath}:`, error.message || error);
          lastError = error;
      }
  }

  if (!success) {
      try {
          resultBlob = await removeBackground(imageInput, {
              debug: true,
              progress: (key: string, current: number, total: number) => {
                  if (onProgress) onProgress(50);
              }
          });
          success = true;
      } catch (error: any) {
          lastError = error;
      }
  }

  if (success && resultBlob) {
      return await cleanAlphaArtifacts(resultBlob);
  }

  let msg = "Neural Purge Error: Failed to process image.";
  if (lastError) {
      const errStr = (lastError.message || lastError.toString()).toLowerCase();
      if (errStr.includes('fetch') || errStr.includes('network') || errStr.includes('404')) {
          msg = "Neural Purge Error: Unable to download AI model. Network block detected.";
      } else {
          msg = `Neural Purge Error: ${lastError.message || 'Unknown processing error'}`;
      }
  }
  
  throw new Error(msg);
};
