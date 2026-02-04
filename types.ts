
export type FrameStatus = 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'APPROVED';

export type PenToolMode = 'select' | 'hand' | 'pen-standard' | 'pen-curvature' | 'pen-freeform' | 'pen-magnetic' | 'pen-add' | 'pen-delete' | 'pen-convert';

export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
}

export interface LayerGroup {
  id: string;
  name: string;
  layerIds: string[];
  collapsed: boolean;
  locked: boolean;
  hidden: boolean;
}

export interface LayerEffects {
  blur: number;
  brightness: number;
  contrast: number;
  saturate: number;
  hueRotate: number;
  grayscale: number;
  invert: number;
  sepia: number;
  dropShadowX: number;
  dropShadowY: number;
  dropShadowBlur: number;
  dropShadowColor: string;
  dropShadowOpacity: number;
  skewX: number;
  skewY: number;
  rotateX: number;
  rotateY: number;
  perspective: number;
  backdropBlur: number;
  exposure: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temp: number;
  tint: number;
  vibrance: number;
  clarity: number;
  dehaze: number;
  vignette: number;
  grain: number;
}

export type WarpType = 'none' | 'arch' | 'wave' | 'circle';

export interface GradientOverlay {
  enabled: boolean;
  type: 'linear' | 'radial';
  angle: number;
  startColor: string;
  endColor: string;
  opacity: number; // 0-100 Feather/Intensity (Master Opacity)
  blendMode: string;
  midpoint: number; // 0-100 Control the spread
  // New Alpha Channel Features
  isMask?: boolean; 
  startOpacity?: number; // 0-1 Opacity for start stop
  endOpacity?: number;   // 0-1 Opacity for end stop
  startPoint?: { x: number; y: number }; // Normalized 0-1 coordinates
  endPoint?: { x: number; y: number };   // Normalized 0-1 coordinates
}

export interface ImageLayer {
  id: string;
  name?: string;
  src: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  hidden: boolean;
  opacity?: number;
  blend_mode?: string;
  effects_enabled?: boolean;
  effects?: LayerEffects;
  mask_enabled?: boolean;
  mask_src?: string | null;
  mask_type?: string;
  mask_blur?: number;
  mask_feather?: number;
  mask_inverted?: boolean;
  mask_content_x?: number;
  mask_content_y?: number;
  mask_content_scale?: number;
  flipX?: boolean;
  flipY?: boolean;
  border_radius?: number;
  gradient_overlay?: GradientOverlay; // New Complex Gradient Feature
}

export interface TextLayer {
  id: string;
  name?: string;
  text: string;
  font: string;
  font_size: number;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  locked?: boolean;
  hidden?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  type?: string;
  effects_enabled?: boolean;
  effects?: LayerEffects;
  line_height?: number;
  letter_spacing?: number;
  wrap_enabled?: boolean;
  resize_mode?: 'auto-width' | 'auto-height'; // Figma-style Auto Layout
  fill_enabled?: boolean;
  fill_opacity?: number;
  stroke_enabled?: boolean;
  stroke_width?: number;
  stroke_color?: string;
  stroke_opacity?: number;
  shadow_enabled?: boolean;
  shadow_blur?: number;
  shadow_color?: string;
  shadow_offset_x?: number;
  shadow_offset_y?: number;
  gradient_enabled?: boolean;
  gradient_start?: string;
  gradient_end?: string;
  gradient_deg?: number;
  gradient_start_opacity?: number;
  gradient_end_opacity?: number;
  background_color?: string;
  border_radius?: number;
  padding_x?: number;
  opacity?: number;
  warp_type?: WarpType;
  warp_intensity?: number;
  warp_frequency?: number;
  warp_bend?: number;
  italic?: boolean;
  // New Masking Props
  mask_enabled?: boolean;
  mask_type?: 'fade-bottom' | 'fade-top' | 'fade-left' | 'fade-right' | 'radial';
  mask_feather?: number; // 0-100
}

export interface TableCell {
  row: number;
  col: number;
  text: string;
  rowSpan?: number;
  colSpan?: number;
  fillColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface VectorPoint {
  x: number;
  y: number;
  c1x?: number; // In-Handle
  c1y?: number;
  c2x?: number; // Out-Handle
  c2y?: number;
  type?: 'corner' | 'smooth' | 'symmetric';
}

export interface GradientStop {
  color: string;
  opacity: number; // LEGACY: Used as position (0-1) in older versions
  position?: number; // 0-1 Stop Position
  alpha?: number; // 0-1 Transparency/Opacity
}

export interface ShapeLayer {
  id: string;
  name?: string;
  shape_type: 'rect' | 'circle' | 'triangle' | 'star' | 'line' | 'rounded-rect' | 'table' | 'custom_vector';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  fill_color: string;
  stroke_color: string;
  stroke_width: number;
  stroke_opacity?: number;
  stroke_cap?: 'butt' | 'round' | 'square';
  stroke_join?: 'miter' | 'round' | 'bevel';
  stroke_dash?: number[];
  border_radius?: number;
  opacity: number;
  blend_mode: string;
  locked: boolean;
  hidden: boolean;
  effects_enabled: boolean;
  effects: LayerEffects;
  vector_points?: VectorPoint[];
  is_closed?: boolean;
  gradient_enabled?: boolean;
  gradient_stops?: GradientStop[];
  gradient_deg?: number;
  shadow_enabled?: boolean;
  shadow_color?: string;
  shadow_blur?: number;
  shadow_x?: number;
  shadow_y?: number;
  table_rows?: number;
  table_cols?: number;
  table_cells?: TableCell[];
  table_text_size?: number;
  table_font?: string;
  table_text_color?: string;
  table_row_heights?: number[]; 
  table_col_widths?: number[];  
}

export interface StashAsset {
  id: string;
  src: string;
  name?: string;
  backup: boolean;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  sources?: any[];
  attachments?: string[];
}

export interface ProjectState {
  pages: AppConfig[];
  activePageIndex: number;
}

export interface DetectedObject {
  label: string;
  box_2d: number[];
}

export interface NoteTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  text: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;
  src?: string;
  tasks: NoteTask[];
}

export interface AppConfig {
  id: string;
  name: string;
  projectName: string;
  description?: string;
  canvas: {
    width: number;
    height: number;
    background_color: string;
    background_pattern: string;
    background_image: string | null;
    background_gradient_enabled: boolean;
    background_gradient_start: string;
    background_gradient_end: string;
    background_gradient_deg: number;
    background_layer_opacity: number;
    background_layer_blur: number;
    background_vignette: number;
    background_noise: number;
    background_pattern_adaptive_color: boolean;
    background_pattern_opacity?: number;
    background_pattern_color?: string;
    background_effects?: LayerEffects;
    background_gradient_overlay?: GradientOverlay; // Added for background
    theme_style: string;
    show_rulers: boolean;
    show_guides: boolean;
    show_grid: boolean;
    guides: Guide[];
    smart_guide_type: string;
    guide_opacity: number;
    safe_area: number;
    global_effects_enabled: boolean;
    global_effects_locked?: boolean;
    global_effects: LayerEffects;
    status?: FrameStatus;
    export_settings: {
      scale: number;
      format: string;
    };
  };
  typography: {
    headline_name?: string;
    headline_text: string;
    headline_font: string;
    headline_font_size: number;
    headline_line_height?: number;
    headline_letter_spacing?: number;
    headline_color: string;
    headline_position_x: number;
    headline_position_y: number;
    headline_width: number;
    headline_height: number;
    headline_locked: boolean;
    headline_hidden: boolean;
    headline_rotation: number;
    headline_alignment: string;
    headline_wrap_enabled?: boolean;
    headline_fill_enabled?: boolean;
    headline_fill_opacity?: number;
    headline_stroke_enabled?: boolean;
    headline_stroke_width?: number;
    headline_stroke_color?: string;
    headline_stroke_opacity?: number;
    headline_shadow_enabled?: boolean;
    headline_shadow_blur?: number;
    headline_shadow_color?: string;
    headline_shadow_offset_x?: number;
    headline_shadow_offset_y?: number;
    headline_gradient_enabled?: boolean;
    headline_gradient_start?: string;
    headline_gradient_end?: string;
    headline_gradient_deg?: number;
    headline_gradient_start_opacity?: number;
    headline_gradient_end_opacity?: number;
    headline_effects_enabled: boolean;
    headline_effects?: LayerEffects;
    headline_warp_type?: WarpType;
    headline_warp_intensity?: number;
    headline_warp_frequency?: number;
    headline_warp_bend?: number;
    headline_italic?: boolean;
    headline_opacity?: number;
    subtitle_name?: string;
    subtitle_text: string;
    subtitle_font: string;
    subtitle_font_size: number;
    subtitle_line_height?: number;
    subtitle_letter_spacing?: number;
    subtitle_color: string;
    subtitle_position_x: number;
    subtitle_position_y: number;
    subtitle_width: number;
    subtitle_height: number;
    subtitle_locked: boolean;
    subtitle_hidden: boolean;
    subtitle_rotation: number;
    subtitle_alignment: string;
    subtitle_wrap_enabled?: boolean;
    subtitle_fill_enabled?: boolean;
    subtitle_fill_opacity?: number;
    subtitle_stroke_enabled?: boolean;
    subtitle_stroke_width?: number;
    subtitle_stroke_color?: string;
    subtitle_stroke_opacity?: number;
    subtitle_shadow_enabled?: boolean;
    subtitle_shadow_blur?: number;
    subtitle_shadow_color?: string;
    subtitle_shadow_offset_x?: number;
    subtitle_shadow_offset_y?: number;
    subtitle_gradient_enabled?: boolean;
    subtitle_gradient_start?: string;
    subtitle_gradient_end?: string;
    subtitle_gradient_deg?: number;
    subtitle_gradient_start_opacity?: number;
    subtitle_gradient_end_opacity?: number;
    subtitle_effects_enabled: boolean;
    subtitle_effects?: LayerEffects;
    subtitle_warp_type?: WarpType;
    subtitle_warp_intensity?: number;
    subtitle_warp_frequency?: number;
    subtitle_warp_bend?: number;
    subtitle_italic?: boolean;
    subtitle_opacity?: number;
  };
  additional_texts: TextLayer[];
  image_layers: ImageLayer[];
  shapes: ShapeLayer[];
  model?: {
    gallery: (string | null)[]; 
    camera_angle: string;
  };
  badge?: {
    badge_text: string; 
    badge_style: string;
    badge_position_x: number;
    badge_position_y: number;
    badge_size: number;
    locked: boolean;
    hidden: boolean;
  };
  size_chart?: {
    sizes: string[];
    position_x: number;
    position_y: number;
    color_bars: string[]; 
    box_size: number;
    style: string; 
    locked: boolean;
    hidden: boolean;
  };
  groups: LayerGroup[];
  layerOrder: string[];
  notes?: Note[];
  showNotes?: boolean;
  stash: StashAsset[];
  ai_sync_enabled?: boolean;
}
