
declare global {
    interface Window {
        Upscaler: any;
        tf: any;
    }
}

/**
 * Nano Banana Service (BananaService) V21 - Network Resilient Loader
 * Handles client-side AI upscaling with advanced CDN fallback strategies.
 */

const loadScript = (url: string, id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
            resolve();
            return; 
        }

        const script = document.createElement('script');
        script.id = id;
        script.src = url; 
        script.async = true;
        script.crossOrigin = "anonymous";

        script.onload = () => resolve();
        script.onerror = () => {
            script.remove();
            reject(new Error(`Failed to load script: ${url}`));
        };

        document.head.appendChild(script);
    });
};

const waitForGlobal = async (globalVar: string, timeoutMs = 15000): Promise<void> => {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        if ((window as any)[globalVar]) {
            resolve();
            return;
        }
        const interval = setInterval(() => {
            if ((window as any)[globalVar]) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                reject(new Error(`Timeout waiting for global variable: ${globalVar}`));
            }
        }, 100);
    });
};

const loadTensorFlow = async () => {
    if (window.tf) return;

    const mirrors = [
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js',
        'https://unpkg.com/@tensorflow/tfjs@4.17.0/dist/tf.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/tensorflow/4.17.0/tf.min.js'
    ];

    for (const url of mirrors) {
        try {
            // console.log(`[BananaService] Loading TF from ${url}...`);
            const id = `tf-lib-${Math.random().toString(36).substr(2,5)}`;
            await loadScript(url, id);
            await waitForGlobal('tf');
            return;
        } catch (e) {
            console.warn(`[BananaService] TF Mirror Failed: ${url}`);
        }
    }
    throw new Error("Failed to load TensorFlow.js from all mirrors.");
};

const loadUpscaler = async () => {
    if (window.Upscaler) return;

    // STRATEGY 1: UMD Mirrors (Script Tags)
    const umdMirrors = [
        'https://unpkg.com/upscaler@0.29.0/dist/browser/upscaler.min.js',
        'https://cdn.jsdelivr.net/npm/upscaler@0.29.0/dist/browser/upscaler.min.js'
    ];

    for (const url of umdMirrors) {
        try {
            // console.log(`[BananaService] Attempting Upscaler UMD from ${url}...`);
            const id = `upscaler-lib-${Math.random().toString(36).substr(2,9)}`;
            await loadScript(url, id);
            await waitForGlobal('Upscaler', 5000); // Short timeout for UMD
            // console.log(`[BananaService] Upscaler Loaded from ${url}.`);
            return;
        } catch (e) {
            // Silently fail to try next mirror
        }
    }

    // STRATEGY 2: Dynamic Import ESM Mirrors (Fallback)
    // Critical fix for "Failed to fetch dynamically imported module" errors when esm.sh is blocked
    const esmMirrors = [
        'https://cdn.jsdelivr.net/npm/upscaler@0.29.0/+esm',
        'https://esm.sh/upscaler@0.29.0',
        'https://unpkg.com/upscaler@0.29.0?module'
    ];

    for (const url of esmMirrors) {
        try {
            console.log(`[BananaService] Attempting Upscaler ESM from ${url}...`);
            const module = await import(/* webpackIgnore: true */ url);
            window.Upscaler = module.default || module;
            console.log(`[BananaService] Upscaler (ESM) Loaded from ${url}.`);
            return;
        } catch (e) {
            console.warn(`[BananaService] ESM Mirror Failed: ${url}`, e);
        }
    }

    throw new Error("Failed to load UpscalerJS from all sources (UMD & ESM). Network block detected.");
};

export const upscaleImageLocal = async (
    imageSrc: string, 
    onProgress?: (percent: number) => void
): Promise<string> => {
    try {
        console.log("[BananaService] Initializing Neural Engine...");

        // 1. Initialize TensorFlow
        await loadTensorFlow();
        if (!window.tf) throw new Error("TensorFlow.js failed to initialize.");

        // 2. Initialize Upscaler
        await loadUpscaler();
        if (!window.Upscaler) throw new Error("UpscalerJS failed to initialize.");

        // 3. Configure Backend
        try {
            await window.tf.setBackend('webgl');
        } catch (err) {
            console.warn("[BananaService] WebGL failed, falling back to CPU.", err);
            try { await window.tf.setBackend('cpu'); } catch (e) {}
        }

        // 4. Execute Model
        const UpscalerConstructor = window.Upscaler;
        const upscaler = new UpscalerConstructor({
            model: 'default-model',
            warmupSize: { patchSize: 64, padding: 2 }
        });

        const start = Date.now();
        const upscaledSrc = await upscaler.upscale(imageSrc, {
            patchSize: 64,
            padding: 2,
            output: 'base64',
            progress: (amount: number) => {
                if (onProgress) onProgress(Math.round(amount * 100));
            }
        });
        
        console.log(`[BananaService] Upscale success in ${(Date.now() - start) / 1000}s`);
        return upscaledSrc;

    } catch (error: any) {
        console.error("Nano Banana Service Error:", error);
        
        let msg = "Proses Upscaling Gagal.";
        const errStr = (error.message || error.toString()).toLowerCase();
        
        if (errStr.includes('load') || errStr.includes('script') || errStr.includes('import') || errStr.includes('fetch') || errStr.includes('network')) {
            msg = "Gagal memuat AI Engine. Koneksi ke CDN (Unpkg/JsDelivr/Esm) terblokir. Coba matikan VPN atau ganti jaringan.";
        } else if (errStr.includes('webgl') || errStr.includes('backend')) {
            msg = "Error Hardware: WebGL crash. Coba refresh halaman.";
        } else if (errStr.includes('tensor')) {
            msg = "Error TensorFlow: Gagal inisialisasi tensor.";
        } else {
            msg = `Error Internal: ${error.message || "Unknown error"}`;
        }
        
        throw new Error(msg);
    }
};
