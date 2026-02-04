
import { AppConfig, LayerEffects, GradientOverlay } from './types';

export const DEFAULT_EFFECTS: LayerEffects = {
  blur: 0,
  brightness: 1,
  contrast: 1,
  saturate: 1,
  hueRotate: 0,
  grayscale: 0,
  invert: 0,
  sepia: 0,
  dropShadowX: 0,
  dropShadowY: 0,
  dropShadowBlur: 0,
  dropShadowColor: '#000000',
  dropShadowOpacity: 0.5,
  skewX: 0,
  skewY: 0,
  rotateX: 0,
  rotateY: 0,
  perspective: 0,
  backdropBlur: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temp: 0,
  tint: 0,
  vibrance: 0,
  clarity: 0,
  dehaze: 0,
  vignette: 0,
  grain: 0
};

export const DEFAULT_GRADIENT_OVERLAY: GradientOverlay = {
  enabled: false,
  type: 'linear',
  angle: 180,
  startColor: '#ffffff',
  endColor: '#000000',
  opacity: 0.5,
  blendMode: 'overlay',
  midpoint: 50,
  isMask: false,
  startOpacity: 1,
  endOpacity: 0
};

export const PERFORMANCE_PRESETS = [
  {
    id: 'ice-runner',
    label: 'Ice Runner',
    color: '#38bdf8',
    effects: { ...DEFAULT_EFFECTS, temp: -0.4, tint: 0.1, brightness: 1.1, contrast: 1.25, clarity: 0.5, exposure: 0.1 }
  },
  {
    id: 'urban-tactical',
    label: 'Urban Tactical',
    color: '#475569',
    effects: { ...DEFAULT_EFFECTS, grayscale: 0.15, contrast: 1.4, blacks: -0.1, shadows: -0.1, clarity: 0.8, grain: 0.12 }
  },
  {
    id: 'neon-gym',
    label: 'Neon Gym',
    color: '#d946ef',
    effects: { ...DEFAULT_EFFECTS, hueRotate: 280, saturate: 1.7, contrast: 1.3, brightness: 1.05, vignette: 0.25, clarity: 0.6 }
  },
  {
    id: 'sunset-flex',
    label: 'Sunset Flex',
    color: '#f97316',
    effects: { ...DEFAULT_EFFECTS, temp: 0.35, tint: -0.1, brightness: 1.15, saturate: 1.4, exposure: 0.1 }
  },
  {
    id: 'pro-studio',
    label: 'Clean Studio',
    color: '#94a3b8',
    effects: { ...DEFAULT_EFFECTS, brightness: 1.05, contrast: 1.1, saturate: 1.05, clarity: 0.2 }
  }
];

export const PRODUCT_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "Navy", hex: "#000080" },
  { name: "Royal Blue", hex: "#4169E1" },
  { name: "Maroon", hex: "#800000" },
  { name: "Red", hex: "#FF0000" },
  { name: "Army", hex: "#6B8E23" },
  { name: "Yellow", hex: "#FFFF00" },
  { name: "Grey", hex: "#808080" },
  { name: "White", hex: "#FFFFFF" }
];

export const SOLID_BACKGROUND_PRESETS = [
  "#FFFFFF", "#F8FAFC", "#F1F5F9", "#E2E8F0", "#94A3B8", 
  "#000000", "#1E293B", "#0F172A", 
  "#FEF2F2", "#F0F9FF", "#F0FDFA", "#FFFBEB"
];

export const NOISE_TEXTURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAUVBMVEWFhYWDg4N3d3dtbW17e3t1dXVnbGxqamr///+GmJqEmZmAmJmAmJeAmJeAmJeAmJeAmJeAmJc+Dk4EAAAAG3RSTlNAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEqv08KFAAAAFklEQVR4AWNABQwMIMD4/48YwIARDHgAAN1uAp3t+yX0AAAAAElFTkSuQmCC";

export const BADGE_PRESETS = [
  "https://cdn-icons-png.flaticon.com/512/10692/10692790.png", 
  "https://cdn-icons-png.flaticon.com/512/12308/12308119.png", 
  "https://cdn-icons-png.flaticon.com/512/5722/5722237.png",   
  "https://cdn-icons-png.flaticon.com/512/9370/9370270.png",   
  "https://cdn-icons-png.flaticon.com/512/6127/6127042.png",   
  "https://cdn-icons-png.flaticon.com/512/2653/2653775.png"    
];

export const FONTS = [
  "Poppins Medium",
  "Poppins Black",
  "Roboto Medium",
  "Roboto Light",
  "Anton",
  "Bebas Neue",
  "Oswald Medium",
  "Oswald Light",
  "Saira Condensed Medium",
  "Saira Condensed Regular",
  "Montserrat Medium", 
  "Noto Sans Medium", 
  "Montserrat Light", 
  "Noto Sans Regular",
  "Righteous",
  "Permanent Marker",
  "Merriweather",
  "Pacifico",
  "Material Symbols Outlined"
];

export const PATTERNS = [
  "none", 
  "grid-thin", 
  "grid-dashed",
  "dot-regular", 
  "diagonal-stripes", 
  "checkerboard", 
  "blueprint",
  "noise-static",
  "circuit-board",
  "topo-flow"
];

export const BACKGROUND_PRESETS = [
    { name: "Midnight", start: "#0f172a", end: "#1e1b4b", deg: 135 },
    { name: "Sunset", start: "#f97316", end: "#db2777", deg: 45 },
    { name: "Mint", start: "#dcfce7", end: "#a5f3fc", deg: 180 },
    { name: "Gold", start: "#fde047", end: "#f97316", deg: 90 },
    { name: "Cherry", start: "#ef4444", end: "#991b1b", deg: 135 },
    { name: "Glacier", start: "#f0f9ff", end: "#bae6fd", deg: 0 },
    { name: "Lavender", start: "#e9d5ff", end: "#faf5ff", deg: 60 },
    { name: "Cyber", start: "#d946ef", end: "#3b82f6", deg: 120 },
    { name: "Slate", start: "#cbd5e1", end: "#64748b", deg: 180 },
    { name: "Peach", start: "#ffedd5", end: "#fdba74", deg: 45 }
];

export const BADGE_STYLES = ["metallic", "flat", "outline", "3D gloss"];
export const SIZE_CHART_STYLES = [
    { label: "Boxed Grid", value: "boxed" },
    { label: "Minimal Text", value: "minimal" },
    { label: "Circle Tags", value: "circle" },
    { label: "Pill Tags", value: "pill" },
    { label: "Underline", value: "underline" }
];
export const ICONS = ["hexagon-line", "molecule", "shield", "bolt", "airflow"];

export const AI_ROTATION_OPTIONS = [
  { label: "-90°", value: "Side profile view from the left (-90 degrees)", side: "left" },
  { label: "-60°", value: "Turn viewpoint 60 degrees left", side: "left" },
  { label: "-45°", value: "Turn viewpoint 45 degrees left", side: "left" },
  { label: "-30°", value: "Turn viewpoint 30 degrees left", side: "left" },
  { label: "FRONT 0°", value: "Front View (0 degrees)", side: "center" },
  { label: "30°", value: "Turn viewpoint 30 degrees right", side: "right" },
  { label: "45°", value: "Turn viewpoint 45 degrees right", side: "right" },
  { label: "60°", value: "Turn viewpoint 60 degrees right", side: "right" },
  { label: "90°", value: "Side profile view from the right (90 degrees)", side: "right" },
];

export const THEME_STYLES = [
  "Sport Minimalist", 
  "Midnight Elite", 
  "Urban Concrete", 
  "High Voltage", 
  "Crimson Fury", 
  "Forest Tactical", 
  "Ocean Depth", 
  "Royal Violet", 
  "Carbon Fiber", 
  "Clean Slate"
];

export const BLEND_MODES = [
  { label: "Normal", value: "normal" },
  { label: "Multiply", value: "multiply" },
  { label: "Screen", value: "screen" },
  { label: "Overlay", value: "overlay" },
  { label: "Soft Light", value: "soft-light" },
  { label: "Hard Light", value: "hard-light" },
  { label: "Darken", value: "darken" },
  { label: "Lighten", value: "lighten" },
  { label: "Color Dodge", value: "color-dodge" },
  { label: "Color Burn", value: "color-burn" },
  { label: "Difference", value: "difference" },
  { label: "Exclusion", value: "exclusion" },
  { label: "Hue", value: "hue" },
  { label: "Saturation", value: "saturation" },
  { label: "Color", value: "color" },
  { label: "Luminosity", value: "luminosity" }
];

export const ASPECT_RATIOS = [
  { label: "Square (1:1)", value: "1:1", width: 1080, height: 1080 },
  { label: "Insta (4:5)", value: "4:5", width: 1080, height: 1350 }, // Standard 1080p Portrait
  { label: "Story (9:16)", value: "9:16", width: 1080, height: 1920 },
  { label: "Wide (16:9)", value: "16:9", width: 1920, height: 1080 },
];

export const LAYER_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e", "#64748b"
];

export const DEFAULT_CONFIG: AppConfig = {
  id: "page-default",
  name: "Blank Canvas",
  projectName: "NEW PROJECT",
  canvas: {
    width: 1080,
    height: 1080, 
    background_color: "#ffffff", 
    background_pattern: "none",
    background_image: null,
    background_gradient_enabled: false, 
    background_gradient_start: "#ffffff",
    background_gradient_end: "#f3f4f6",
    background_gradient_deg: 135,
    background_layer_opacity: 1,
    background_layer_blur: 0,
    background_vignette: 0,
    background_noise: 0,
    background_pattern_adaptive_color: true,
    background_pattern_opacity: 0.1,
    background_pattern_color: "rgba(0,0,0,0.4)",
    background_gradient_overlay: { ...DEFAULT_GRADIENT_OVERLAY },
    theme_style: "Clean Slate",
    show_rulers: true,
    show_guides: true,
    show_grid: true,
    guides: [],
    smart_guide_type: 'none',
    guide_opacity: 0.6,
    safe_area: 128,
    global_effects_enabled: true,
    global_effects: { ...DEFAULT_EFFECTS },
    export_settings: {
      scale: 1,
      format: 'png'
    }
  },
  typography: {
    headline_text: "",
    headline_font: "Montserrat Medium",
    headline_font_size: 180,
    headline_color: "#000000", 
    headline_position_x: 540,
    headline_position_y: 400,
    headline_width: 1000, 
    headline_height: 200, 
    headline_locked: false,
    headline_hidden: true,
    headline_rotation: 0,
    headline_alignment: "center",
    headline_effects_enabled: false,
    subtitle_text: "",
    subtitle_font: "Montserrat Medium",
    subtitle_font_size: 48,
    subtitle_color: "#000000", 
    subtitle_position_x: 540,
    subtitle_position_y: 520,
    subtitle_width: 900,
    subtitle_height: 60, 
    subtitle_locked: false,
    subtitle_hidden: true,
    subtitle_rotation: 0,
    subtitle_alignment: "center",
    subtitle_effects_enabled: false,
  },
  additional_texts: [],
  image_layers: [], 
  shapes: [], 
  groups: [], 
  layerOrder: ['global-fx'],
  stash: [],
  ai_sync_enabled: true
};
