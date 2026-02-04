
/**
 * TITAN LOCAL ENGINE v50.0 (ULTRA-LUMINANCE SYNTHESIS)
 * Pro-Industry Standard for high-contrast textiles.
 * Logic: Luminance-Aware Patch Normalization + Gradient Preservation.
 */

export interface InpaintOptions {
  passes?: number;
  smoothness?: number;
}

export const inpaintLocal = async (
  imageSrc: string,
  maskSrc: string,
  options: InpaintOptions = {}
): Promise<string> => {
  const basePasses = options.passes || 1200;
  // Menyeimbangkan performa dan kualitas
  const iterations = Math.min(400, Math.max(10, Math.floor(basePasses / 4)));

  return new Promise((resolve, reject) => {
    const img = new Image();
    const mask = new Image();
    let loaded = 0;

    const onLoaded = () => {
      loaded++;
      if (loaded === 2) process();
    };

    img.onload = onLoaded;
    mask.onload = onLoaded;
    img.crossOrigin = "Anonymous";
    mask.crossOrigin = "Anonymous";
    img.src = imageSrc;
    mask.src = maskSrc;

    const process = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject("Canvas failure");

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data; 
      const workingPixels = new Uint8ClampedArray(pixels);
      const originalData = new Uint8ClampedArray(pixels);

      // Prepare Mask Data
      const mCanvas = document.createElement('canvas');
      mCanvas.width = canvas.width;
      mCanvas.height = canvas.height;
      const mCtx = mCanvas.getContext('2d');
      if (!mCtx) return reject("Mask context failure");
      mCtx.drawImage(mask, 0, 0);
      const maskPixels = mCtx.getImageData(0, 0, canvas.width, canvas.height).data;

      const w = canvas.width;
      const h = canvas.height;
      const alphaMap = new Float32Array(w * h);
      let minX = w, maxX = 0, minY = h, maxY = 0;
      let hasMask = false;

      for (let i = 0; i < w * h; i++) {
        const alpha = maskPixels[i * 4 + 3] / 255;
        alphaMap[i] = alpha;
        if (alpha > 0.05) {
          hasMask = true;
          const x = i % w;
          const y = Math.floor(i / w);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }

      if (!hasMask) { resolve(imageSrc); return; }

      // 1. ANALISIS LUMINANCE LOKAL (Mencegah bercak hitam/gosong)
      // Menghitung rata-rata kecerahan area "sehat" di pinggiran mask
      let avgR = 0, avgG = 0, avgB = 0, count = 0;
      const ringSize = 15;
      for (let y = Math.max(0, minY - ringSize); y <= Math.min(h - 1, maxY + ringSize); y++) {
        for (let x = Math.max(0, minX - ringSize); x <= Math.min(w - 1, maxX + ringSize); x++) {
          const idx = y * w + x;
          if (alphaMap[idx] < 0.1) {
            avgR += originalData[idx * 4];
            avgG += originalData[idx * 4 + 1];
            avgB += originalData[idx * 4 + 2];
            count++;
          }
        }
      }
      const targetLumaR = avgR / count;
      const targetLumaG = avgG / count;
      const targetLumaB = avgB / count;

      // 2. STOCHASTIC TEXTURE SYNTHESIS WITH NORMALIZATION
      const searchRadius = 100;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const i = y * w + x;
          if (alphaMap[i] > 0.1) {
            let bestDist = Infinity;
            let bestIdx = -1;

            // Spiral search for best matching texture block
            for (let r = 8; r < searchRadius; r += 8) {
              for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                const sx = Math.round(x + Math.cos(a) * r);
                const sy = Math.round(y + Math.sin(a) * r);
                if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                  const si = sy * w + sx;
                  if (alphaMap[si] < 0.05) {
                    // Cek kemiripan luminance donor vs target
                    const dR = originalData[si * 4];
                    const dG = originalData[si * 4 + 1];
                    const dB = originalData[si * 4 + 2];
                    const dist = Math.abs(dR - targetLumaR) + Math.abs(dG - targetLumaG) + Math.abs(dB - targetLumaB);
                    
                    if (dist < bestDist) {
                      bestDist = dist;
                      bestIdx = si;
                    }
                  }
                }
              }
              if (bestIdx !== -1 && bestDist < 15) break; 
            }

            if (bestIdx !== -1) {
              const i4 = i * 4;
              const bi4 = bestIdx * 4;
              
              // LUMINANCE MATCHING TRANSFORMATION
              // Menyesuaikan pixel donor agar sesuai dengan kecerahan target lokal
              const offsetR = targetLumaR - originalData[bi4];
              const offsetG = targetLumaG - originalData[bi4 + 1];
              const offsetB = targetLumaB - originalData[bi4 + 2];

              // Blending faktor (mengurangi offset secara halus)
              const factor = 0.85; 
              workingPixels[i4] = Math.min(255, Math.max(0, originalData[bi4] + (offsetR * factor)));
              workingPixels[i4+1] = Math.min(255, Math.max(0, originalData[bi4+1] + (offsetG * factor)));
              workingPixels[i4+2] = Math.min(255, Math.max(0, originalData[bi4+2] + (offsetB * factor)));
            }
          }
        }
      }

      // 3. GRADIENT PRESERVATION (Anti-Smudge)
      // Menggunakan difusi terbatas untuk menghaluskan seam tanpa merusak tekstur
      for (let p = 0; p < iterations; p++) {
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const i = y * w + x;
            if (alphaMap[i] > 0.05) {
              const i4 = i * 4;
              // Sampling tetangga (cross pattern)
              const n = [((y-1)*w + x)*4, ((y+1)*w + x)*4, (y*w + (x-1))*4, (y*w + (x+1))*4];
              let r=0, g=0, b=0, c=0;
              for (let n4 of n) {
                if (n4 >= 0 && n4 < workingPixels.length) {
                  r += workingPixels[n4]; g += workingPixels[n4+1]; b += workingPixels[n4+2]; c++;
                }
              }
              
              // Interpolasi sangat halus (0.08) untuk menjaga ketajaman tekstur kain
              const mix = 0.08; 
              workingPixels[i4] = workingPixels[i4] * (1-mix) + (r/c) * mix;
              workingPixels[i4+1] = workingPixels[i4+1] * (1-mix) + (g/c) * mix;
              workingPixels[i4+2] = workingPixels[i4+2] * (1-mix) + (b/c) * mix;
            }
          }
        }
      }

      // 4. SMART GRAIN SYNCHRONIZATION
      for (let i = 0; i < w * h; i++) {
        if (alphaMap[i] > 0.1) {
          const i4 = i * 4;
          // Noise yang disesuaikan dengan intensitas warna (Photographic Grain)
          const luma = (workingPixels[i4] + workingPixels[i4+1] + workingPixels[i4+2]) / 3;
          const noiseScale = luma < 50 ? 4 : 2; // Kain gelap butuh grain lebih tegas
          const grain = (Math.random() - 0.5) * noiseScale;
          workingPixels[i4] = Math.min(255, Math.max(0, workingPixels[i4] + grain));
          workingPixels[i4+1] = Math.min(255, Math.max(0, workingPixels[i4+1] + grain));
          workingPixels[i4+2] = Math.min(255, Math.max(0, workingPixels[i4+2] + grain));
        }
      }

      // Final Assembly dengan Feathering Luas
      for (let i = 0; i < w * h; i++) {
        const a = alphaMap[i];
        if (a > 0) {
          const i4 = i * 4;
          // Menggunakan alpha linear untuk blending yang lebih natural
          pixels[i4] = workingPixels[i4] * a + originalData[i4] * (1 - a);
          pixels[i4+1] = workingPixels[i4+1] * a + originalData[i4+1] * (1 - a);
          pixels[i4+2] = workingPixels[i4+2] * a + originalData[i4+2] * (1 - a);
          pixels[i4+3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png', 1.0));
    };
  });
};
