
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { AppConfig } from '../types';

export type ExportQuality = 'SD' | 'HD' | '4K' | '8K';

export const getScaleFromQuality = (config: AppConfig['canvas'], quality: ExportQuality): number => {
  const baseWidth = config.width;
  const baseHeight = config.height;
  
  const targetDimension = {
    'SD': 720,
    'HD': 1920, // This targets 1080p landscape standard
    '4K': 3840,
    '8K': 7680
  };

  // Logic: Ensure the long edge hits the target dimension
  const maxBaseDim = Math.max(baseWidth, baseHeight);
  return targetDimension[quality] / maxBaseDim;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const exportArtboard = async (domId: string, name: string, config: AppConfig, options: ExportOptions): Promise<string> => {
  const element = document.getElementById(domId);
  if (!element) throw new Error(`Element with ID ${domId} not found`);

  // --- PRE-FLIGHT: ASSET WARMING ---
  try {
      await document.fonts.ready;
      const images = Array.from(element.querySelectorAll('img'));
      await Promise.all(images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => { 
              img.onload = resolve; 
              img.onerror = resolve; 
          });
      }));
  } catch (e) {
      console.warn("Asset warming warning:", e);
  }

  const exportScale = getScaleFromQuality(config.canvas, options.quality);

  const configParams = {
      width: config.canvas.width,
      height: config.canvas.height,
      style: {
          transform: 'none', 
          transformOrigin: 'top left',
          margin: '0',
          padding: '0',
          boxShadow: 'none'
      },
      filter: (node: HTMLElement) => {
          if (node.classList) {
              if (node.classList.contains('no-export')) return false;
              if (node.classList.contains('react-rnd__resize-handle')) return false;
              if (node.classList.contains('group-controller')) return false;
              if (node.classList.contains('react-draggable-handle')) return false;
              if (node.id && (node.id.includes('ruler') || node.id.includes('guide'))) return false;
          }
          return true;
      },
      pixelRatio: exportScale, 
      cacheBust: true,
      skipAutoScale: true,
      backgroundColor: config.canvas.background_color || '#ffffff'
  };

  // Delay for stability
  await delay(250); 

  try {
    if (options.format === 'png') {
        return await htmlToImage.toPng(element, configParams);
    } else {
        return await htmlToImage.toJpeg(element, { ...configParams, quality: 0.95 });
    }
  } catch (err) {
    console.error(`Export Critical Error for ${name}:`, err);
    throw err;
  }
};

export const downloadBlob = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export interface ExportOptions {
  quality: ExportQuality;
  format: 'png' | 'jpeg';
  onProgress?: (val: number) => void;
}

export const exportAllArtboards = async (pages: AppConfig[], projectName: string, options: ExportOptions): Promise<void> => {
  const zip = new JSZip();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const domId = `canvas-export-${page.id}`;
    
    if (options.onProgress) options.onProgress(Math.round((i / total) * 100));
    
    try {
      const resultUrl = await exportArtboard(domId, page.name, page, options);
      let fileData: Blob | string;
      
      if (resultUrl.startsWith('blob:')) {
          const response = await fetch(resultUrl);
          fileData = await response.blob();
      } else {
          fileData = resultUrl.split(',')[1];
      }
      
      const fileName = `${page.name.replace(/\s+/g, '_')}_${options.quality}.${options.format}`;
      zip.file(fileName, fileData, resultUrl.startsWith('blob:') ? undefined : { base64: true });
      await delay(500);
    } catch (err) {
      console.warn(`Skipping artboard ${page.name}`, err);
    }
  }

  if (options.onProgress) options.onProgress(100);
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const safeProjectName = projectName.trim().replace(/\s+/g, '_') || 'Project_Export';
  downloadBlob(url, `${safeProjectName}_${options.quality}_${Date.now()}.zip`);
};
