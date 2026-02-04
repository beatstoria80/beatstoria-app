import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { AppConfig, LayerEffects, Guide, ShapeLayer, TextLayer, ImageLayer } from '../types';
import { NOISE_TEXTURE } from '../constants';

interface CanvasPreviewProps {
    config: AppConfig;
    scale: number;
    onUpdate: (config: AppConfig, save?: boolean) => void;
    selectedIds: string[];
    onSelect: (id: string | null, multi?: boolean) => void;
    readOnly?: boolean;
    hideControls?: boolean;
    domId?: string;
    onFocusCanvas?: () => void;
    isActive?: boolean;
    handToolActive?: boolean;
}

// --- HELPER: COLOR UTILS ---
const hexToRgba = (color: string, alpha: number) => {
    if (!color) return `rgba(0,0,0,${alpha ?? 1})`;
    const safeAlpha = isNaN(alpha) ? 1 : alpha;
    if (color.startsWith('#')) {
        let hex = color.substring(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length !== 6) return `rgba(0,0,0,${safeAlpha})`; 
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${safeAlpha})`;
    }
    if (color.startsWith('rgb')) {
        const matches = color.match(/\d+(\.\d+)?/g);
        if (matches && matches.length >= 3) {
            return `rgba(${matches[0]}, ${matches[1]}, ${matches[2]}, ${safeAlpha})`;
        }
    }
    return color;
}

// --- HELPER: CSS FILTER GENERATOR ---
const getEffectsStyle = (effects?: LayerEffects) => {
    if (!effects) return 'none';
    const { blur, brightness, contrast, saturate, hueRotate, grayscale, invert, sepia, dropShadowX, dropShadowY, dropShadowBlur, dropShadowColor, dropShadowOpacity } = effects;
    
    const filterList = [
        blur > 0 ? `blur(${blur}px)` : '',
        brightness !== 1 ? `brightness(${brightness})` : '',
        contrast !== 1 ? `contrast(${contrast})` : '',
        saturate !== 1 ? `saturate(${saturate})` : '',
        hueRotate !== 0 ? `hue-rotate(${hueRotate}deg)` : '',
        grayscale > 0 ? `grayscale(${grayscale})` : '',
        invert > 0 ? `invert(${invert})` : '',
        sepia > 0 ? `sepia(${sepia})` : '',
        (dropShadowBlur > 0 || Math.abs(dropShadowX) > 0 || Math.abs(dropShadowY) > 0) 
            ? `drop-shadow(${dropShadowX}px ${dropShadowY}px ${dropShadowBlur}px ${hexToRgba(dropShadowColor, dropShadowOpacity ?? 0.5)})` 
            : ''
    ].filter(Boolean).join(' ');

    return filterList || 'none';
};

const getFontStyle = (fontString: string) => {
    if (!fontString) return { fontFamily: 'Montserrat', fontWeight: 400 };
    const parts = fontString.split(' ');
    const lastPart = parts[parts.length - 1];
    const weights: Record<string, number> = { 'Thin': 100, 'Light': 300, 'Regular': 400, 'Medium': 500, 'SemiBold': 600, 'Bold': 700, 'ExtraBold': 800, 'Black': 900 };
    if (weights[lastPart]) return { fontFamily: parts.slice(0, -1).join(' '), fontWeight: weights[lastPart] };
    return { fontFamily: fontString, fontWeight: 400 };
};

const getBackgroundPatternStyle = (pattern: string, color: string = 'rgba(0,0,0,0.1)', opacity: number = 0.1) => {
    if (!pattern || pattern === 'none') return {};
    const c = color.startsWith('#') ? hexToRgba(color, opacity) : color; 
    let backgroundImage = '';
    let backgroundSize = '';
    switch (pattern) {
        case 'grid-thin': backgroundImage = `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`; backgroundSize = '20px 20px'; break;
        case 'grid-dashed': backgroundImage = `linear-gradient(90deg, ${c} 1px, transparent 1px), linear-gradient(180deg, ${c} 1px, transparent 1px)`; backgroundSize = '40px 40px'; break;
        case 'dot-regular': backgroundImage = `radial-gradient(${c} 1.5px, transparent 1.5px)`; backgroundSize = '20px 20px'; break;
        case 'diagonal-stripes': backgroundImage = `repeating-linear-gradient(45deg, ${c}, ${c} 1px, transparent 1px, transparent 10px)`; break;
        case 'checkerboard': backgroundImage = `linear-gradient(45deg, ${c} 25%, transparent 25%), linear-gradient(-45deg, ${c} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${c} 75%), linear-gradient(-45deg, transparent 75%, ${c} 75%)`; backgroundSize = '30px 30px'; break;
        case 'blueprint': backgroundImage = `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`; backgroundSize = '50px 50px'; break;
        case 'noise-static': backgroundImage = `url("${NOISE_TEXTURE}")`; backgroundSize = '60px 60px'; break;
        case 'circuit-board': backgroundImage = `radial-gradient(${c} 2px, transparent 2px), radial-gradient(${c} 2px, transparent 2px)`; backgroundSize = '30px 30px'; break;
        case 'topo-flow': backgroundImage = `repeating-radial-gradient(circle at 0 0, transparent 0, ${c} 1px, transparent 2px, transparent 20px)`; break;
    }
    return { backgroundImage, backgroundSize };
};

const RulerTrack = ({ orientation, size, onMouseDown }: { orientation: 'h' | 'v', size: number, onMouseDown: (e: React.MouseEvent) => void }) => {
    const ticks = [];
    const step = 100;
    const subStep = 10;
    for (let i = 0; i <= size; i += subStep) {
        const isMajor = i % step === 0;
        const isMedium = i % 50 === 0 && !isMajor;
        const height = isMajor ? 12 : (isMedium ? 8 : 5);
        ticks.push(
            <div key={i} className={`absolute bg-slate-400/50 flex items-center justify-center pointer-events-none select-none`} style={orientation === 'h' ? { left: i, top: 0, height: height, width: 1 } : { top: i, left: 0, width: height, height: 1 }}>
                {isMajor && i > 0 && <span className={`absolute text-[9px] font-medium text-slate-500 ${orientation === 'h' ? 'top-4' : 'left-4'}`}>{i}</span>}
            </div>
        );
    }
    return <div onMouseDown={onMouseDown} className={`absolute z-[200] hover:bg-indigo-500/10 transition-colors no-export ${orientation === 'h' ? 'top-0 left-0 right-0 h-6 border-b border-slate-200/50 bg-white/80 backdrop-blur-[1px] cursor-row-resize' : 'top-0 left-0 bottom-0 w-6 border-r border-slate-200/50 bg-white/80 backdrop-blur-[1px] cursor-col-resize'}`}>{ticks}</div>;
};

const ProGrid = () => (
    <div className="absolute inset-0 pointer-events-none z-0 opacity-40 no-export">
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.15) 1px, transparent 1px)`, backgroundSize: '100px 100px' }} />
    </div>
);

const getBoundingBox = (ids: string[], layers: any[]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;
    ids.forEach(id => {
        const l = layers.find(x => x.id === id);
        if (l) {
            found = true;
            minX = Math.min(minX, l.position_x);
            minY = Math.min(minY, l.position_y);
            maxX = Math.max(maxX, l.position_x + l.width);
            maxY = Math.max(maxY, l.position_y + l.height);
        }
    });
    if (!found) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// --- GLASS OVERLAY COMPONENT (Optimized) ---
const GlassOverlay = React.memo(({ 
    shape, 
    canvasConfig, 
    blurAmount,
    tintColor,
    tintOpacity,
    isActive,
    isInteracting
}: { 
    shape: ShapeLayer, 
    canvasConfig: AppConfig['canvas'],
    blurAmount: number,
    tintColor: string,
    tintOpacity: number,
    isActive: boolean,
    isInteracting?: boolean
}) => {
    const bgBase = canvasConfig.background_gradient_enabled
        ? `linear-gradient(${canvasConfig.background_gradient_deg}deg, ${canvasConfig.background_gradient_start}, ${canvasConfig.background_gradient_end})`
        : canvasConfig.background_color;
    
    if (!isActive || isInteracting) {
        return (
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]" style={{ pointerEvents: 'none' }}>
                <div 
                    className="absolute inset-0" 
                    style={{ 
                        backgroundColor: tintColor, 
                        opacity: Math.min(1, tintOpacity + 0.3), 
                        backdropFilter: isInteracting ? undefined : `blur(${blurAmount}px)`, 
                        WebkitBackdropFilter: isInteracting ? undefined : `blur(${blurAmount}px)`,
                        mixBlendMode: shape.blend_mode as any || 'normal'
                    }} 
                />
            </div>
        );
    }

    const patternStyle = getBackgroundPatternStyle(
        canvasConfig.background_pattern, 
        canvasConfig.background_pattern_color, 
        canvasConfig.background_pattern_opacity
    );

    const bgImage = canvasConfig.background_image ? `url(${canvasConfig.background_image})` : undefined;

    return (
        <div className="absolute inset-0 overflow-hidden rounded-[inherit]" style={{ pointerEvents: 'none' }}>
            <div 
                style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    transform: `rotate(${-shape.rotation}deg)`,
                    transformOrigin: 'center center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div 
                    style={{
                        position: 'absolute',
                        width: canvasConfig.width,
                        height: canvasConfig.height,
                        left: -shape.position_x,
                        top: -shape.position_y,
                        background: bgBase,
                        filter: `blur(${blurAmount}px)`,
                        transform: 'scale(1.02)'
                    }}
                >
                    {bgImage && (
                        <div 
                            className="absolute inset-0" 
                            style={{ 
                                backgroundImage: bgImage, 
                                backgroundSize: 'cover', 
                                backgroundPosition: 'center',
                                opacity: canvasConfig.background_layer_opacity ?? 1,
                                filter: canvasConfig.background_layer_blur ? `blur(${canvasConfig.background_layer_blur}px)` : undefined
                            }} 
                        />
                    )}
                    {patternStyle.backgroundImage && (
                        <div 
                            className="absolute inset-0 z-0"
                            style={{
                                ...patternStyle,
                                opacity: canvasConfig.background_pattern_opacity ?? 0.1
                            }}
                        />
                    )}
                </div>
            </div>
            <div 
                className="absolute inset-0" 
                style={{ 
                    backgroundColor: tintColor, 
                    opacity: tintOpacity,
                    mixBlendMode: shape.blend_mode as any || 'normal'
                }} 
            />
        </div>
    );
});

interface TextLayerItemProps {
    layer: TextLayer;
    isSelected: boolean;
    isGroupSelected?: boolean;
    hideControls?: boolean;
    readOnly?: boolean;
    scale: number;
    onUpdate: (id: string, updates: any, save?: boolean) => void;
    onSelect: (e: any) => void;
    zIndex: number;
    isInteracting?: boolean;
}

const TextLayerItem: React.FC<TextLayerItemProps> = ({ layer, isSelected, isGroupSelected, hideControls, readOnly, scale, onUpdate, onSelect, zIndex, isInteracting }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const { fontFamily, fontWeight } = getFontStyle(layer.font);
    const isGradient = layer.gradient_enabled;
    const isFillEnabled = layer.fill_enabled !== false; 
    const gradStart = layer.gradient_start || '#000000';
    const gradEnd = layer.gradient_end || '#3b82f6';
    const gradDeg = layer.gradient_deg ?? 90;
    const bgGradient = isGradient ? `linear-gradient(${gradDeg}deg, ${gradStart}, ${gradEnd})` : undefined;
    const resizeMode = layer.resize_mode || 'auto-width';
    const align = layer.alignment || 'center';
    const isWarped = layer.warp_type && layer.warp_type !== 'none';
    
    const getWarpPath = (w: number, h: number) => {
        const type = layer.warp_type;
        const bendVal = (layer.warp_bend ?? 50) / 100;
        const midY = h / 2;
        if (type === 'circle') {
            if (Math.abs(bendVal) < 0.01) return `M 0,${midY} L ${w},${midY}`;
            const s = Math.abs(w * 0.5 * bendVal); 
            if (s < 1) return `M 0,${midY} L ${w},${midY}`;
            const r = (s*s + (w/2)*(w/2)) / (2*s);
            const sweep = bendVal > 0 ? 0 : 1;
            return `M 0,${midY} A ${r},${r} 0 0,${sweep} ${w},${midY}`;
        }
        const distortion = w * 0.35 * bendVal;
        if (type === 'arch') return `M 0,${midY} Q ${w/2},${midY - distortion * 1.5} ${w},${midY}`;
        if (type === 'wave') return `M 0,${midY} C ${w * 0.25},${midY - distortion} ${w * 0.75},${midY + distortion} ${w},${midY}`;
        return `M 0,${midY} L ${w},${midY}`;
    };

    const textStyle: React.CSSProperties = isGradient ? {
        color: 'transparent',
        backgroundImage: bgGradient,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '100% 100%',
        display: 'inline-block',
        textAlign: align as any,
    } : { 
        color: isFillEnabled ? layer.color : 'transparent',
        textAlign: align as any,
    };
    
    const strokeStyle = layer.stroke_enabled ? `${layer.stroke_width ?? 1}px ${layer.stroke_color ?? '#000000'}` : undefined;
    const shadowStyle = layer.shadow_enabled ? `${layer.shadow_offset_x ?? 2}px ${layer.shadow_offset_y ?? 2}px ${layer.shadow_blur ?? 4}px ${layer.shadow_color ?? 'rgba(0,0,0,0.5)'}` : undefined;

    const getMaskStyle = () => {
        if (!layer.mask_enabled) return undefined;
        const feather = layer.mask_feather || 50;
        const type = layer.mask_type || 'fade-bottom';
        const stop = Math.max(0, 100 - feather);
        let gradient = '';
        switch (type) {
            case 'fade-bottom': gradient = `linear-gradient(to bottom, black ${stop}%, transparent 100%)`; break;
            case 'fade-top': gradient = `linear-gradient(to top, black ${stop}%, transparent 100%)`; break;
            case 'fade-left': gradient = `linear-gradient(to left, black ${stop}%, transparent 100%)`; break;
            case 'fade-right': gradient = `linear-gradient(to right, black ${stop}%, transparent 100%)`; break;
            case 'radial': gradient = `radial-gradient(circle, black ${stop}%, transparent 100%)`; break;
            default: gradient = `linear-gradient(to bottom, black ${stop}%, transparent 100%)`;
        }
        return { WebkitMaskImage: gradient, maskImage: gradient, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' };
    };

    useLayoutEffect(() => {
        if (!textRef.current || readOnly || isWarped || isInteracting) return;
        const node = textRef.current;
        const rect = node.getBoundingClientRect();
        const measuredWidth = rect.width / scale;
        const measuredHeight = rect.height / scale;
        const tolerance = 1; 
        if (resizeMode === 'auto-width') {
            if (Math.abs(measuredWidth - layer.width) > tolerance || Math.abs(measuredHeight - layer.height) > tolerance) {
                setTimeout(() => onUpdate(layer.id, { width: measuredWidth, height: measuredHeight }, false), 0);
            }
        } else if (resizeMode === 'auto-height') {
            if (Math.abs(measuredHeight - layer.height) > tolerance) {
                setTimeout(() => onUpdate(layer.id, { height: measuredHeight }, false), 0);
            }
        }
    }, [layer.text, layer.font_size, layer.font, layer.letter_spacing, layer.line_height, layer.resize_mode, layer.width, scale, readOnly, isEditing, isWarped, isInteracting]);

    const disableInteraction = readOnly || isGroupSelected;
    const maskStyle = getMaskStyle();

    return (
        <Rnd
            key={layer.id} 
            size={{ width: layer.width, height: layer.height }} 
            position={{ x: layer.position_x, y: layer.position_y }}
            onDragStop={(e, d) => onUpdate(layer.id, { position_x: d.x, position_y: d.y }, true)}
            onResizeStop={(e, dir, ref, delta, pos) => {
                const newWidth = parseInt(ref.style.width);
                const newHeight = parseInt(ref.style.height);
                const updates: any = { width: newWidth, height: newHeight, position_x: pos.x, position_y: pos.y };
                if (resizeMode === 'auto-width') updates.resize_mode = 'auto-height';
                onUpdate(layer.id, updates, true);
            }}
            disableDragging={disableInteraction || layer.locked || isEditing} 
            enableResizing={!disableInteraction && !layer.locked && !isEditing}
            style={{ zIndex: zIndex, pointerEvents: disableInteraction ? 'none' : 'auto' }} 
            scale={scale}
            onMouseDown={onSelect}
            className={`selectable-layer layer-node-${layer.id} ${disableInteraction ? 'pointer-events-none' : ''}`}
        >
            <div style={{ width: '100%', height: '100%', transform: `rotate(${layer.rotation}deg)`, transformOrigin: 'center center' }} onDoubleClick={(e) => { if (!readOnly && !layer.locked && !isGroupSelected) { e.stopPropagation(); setIsEditing(true); } }}>
                {isWarped && !isEditing ? (
                    <svg width="100%" height="100%" overflow="visible" style={{ filter: layer.effects_enabled ? getEffectsStyle(layer.effects) : undefined, ...maskStyle }}>
                        <defs>
                            <path id={`path-${layer.id}`} d={getWarpPath(layer.width, layer.height)} fill="none" />
                            {isGradient && (
                                <linearGradient id={`grad-${layer.id}`} x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform={`rotate(${layer.gradient_deg || 90} .5 .5)`}>
                                    <stop offset="0%" stopColor={gradStart} />
                                    <stop offset="100%" stopColor={gradEnd} />
                                </linearGradient>
                            )}
                        </defs>
                        <text fill={isGradient ? `url(#grad-${layer.id})` : (isFillEnabled ? layer.color : 'transparent')} stroke={layer.stroke_enabled ? layer.stroke_color : 'none'} strokeWidth={layer.stroke_enabled ? layer.stroke_width : 0} fontSize={layer.font_size} fontFamily={fontFamily} fontWeight={fontWeight} style={{ textShadow: shadowStyle, letterSpacing: layer.letter_spacing, fontStyle: layer.italic ? 'italic' : 'normal', }} dominantBaseline="middle" textAnchor="middle">
                            <textPath href={`#path-${layer.id}`} startOffset="50%" method="align" spacing="auto">{layer.text}</textPath>
                        </text>
                    </svg>
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'), fontSize: layer.font_size, fontFamily: fontFamily, fontWeight: fontWeight, opacity: layer.opacity, lineHeight: layer.line_height ?? 1, letterSpacing: layer.letter_spacing, fontStyle: layer.italic ? 'italic' : 'normal', whiteSpace: resizeMode === 'auto-width' ? 'nowrap' : 'normal', wordBreak: 'normal', filter: layer.effects_enabled ? getEffectsStyle(layer.effects) : undefined, overflow: 'visible', position: 'relative', ...maskStyle }}>
                        <span ref={textRef} style={{ ...textStyle, WebkitTextStroke: strokeStyle, textShadow: shadowStyle, display: 'inline-block', width: resizeMode === 'auto-width' ? 'auto' : '100%', opacity: isEditing ? 0 : 1, whiteSpace: resizeMode === 'auto-width' ? 'nowrap' : 'normal', wordBreak: resizeMode === 'auto-width' ? 'normal' : 'break-word', }}>{layer.text}</span>
                        {isEditing && (
                            <textarea autoFocus value={layer.text} onChange={(e) => onUpdate(layer.id, { text: e.target.value }, false)} onBlur={() => { setIsEditing(false); onUpdate(layer.id, { text: layer.text }, true); }} onKeyDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit', color: isGradient ? (layer.fill_enabled ? layer.color : 'black') : (isFillEnabled ? layer.color : 'transparent'), textAlign: align as any, lineHeight: 'inherit', letterSpacing: 'inherit', fontStyle: 'inherit', background: 'transparent', border: 'none', outline: 'none', resize: 'none', overflow: 'hidden', whiteSpace: resizeMode === 'auto-width' ? 'nowrap' : 'normal', padding: 0, margin: 0, fontVariantNumeric: 'tabular-nums' }} spellCheck={false} />
                        )}
                    </div>
                )}
                {isSelected && !hideControls && !isGroupSelected && <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none no-export" />}
            </div>
        </Rnd>
    );
};

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({ config, scale, onUpdate, selectedIds, onSelect, readOnly, hideControls, domId, onFocusCanvas, isActive, handToolActive }) => {
    const { canvas, image_layers, additional_texts, shapes, layerOrder, groups } = config;
    const [draggingGuideId, setDraggingGuideId] = useState<string | null>(null);
    const [interactingId, setInteractingId] = useState<string | null>(null);

    useEffect(() => {
        if (!draggingGuideId) return;
        const handleMove = (e: MouseEvent) => {
            const container = document.getElementById(domId || '');
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const guideIndex = canvas.guides.findIndex(g => g.id === draggingGuideId);
            if (guideIndex === -1) return;
            const guide = canvas.guides[guideIndex];
            let pos = guide.orientation === 'horizontal' ? (e.clientY - rect.top) / scale : (e.clientX - rect.left) / scale;
            const newGuides = [...canvas.guides];
            newGuides[guideIndex] = { ...guide, position: pos };
            onUpdate({ ...config, canvas: { ...canvas, guides: newGuides } }, false);
        };
        const handleUp = () => {
            const guide = canvas.guides.find(g => g.id === draggingGuideId);
            if (guide) {
                if (guide.position < 0 || (guide.orientation === 'horizontal' ? guide.position > canvas.height : guide.position > canvas.width)) {
                    const newGuides = canvas.guides.filter(g => g.id !== draggingGuideId);
                    onUpdate({ ...config, canvas: { ...canvas, guides: newGuides } }, true);
                } else {
                    onUpdate(config, true);
                }
            }
            setDraggingGuideId(null);
        };
        window.addEventListener('mousemove', handleMove); 
        window.addEventListener('mouseup', handleUp);
        return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
    }, [draggingGuideId, config, scale, onUpdate, domId, canvas]);

    const handleCreateGuide = (e: React.MouseEvent, orientation: 'horizontal' | 'vertical') => {
        e.preventDefault(); e.stopPropagation();
        const container = document.getElementById(domId || '');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const pos = orientation === 'horizontal' ? (e.clientY - rect.top) / scale : (e.clientX - rect.left) / scale;
        const newId = `guide-${Date.now()}`;
        const newGuide: Guide = { id: newId, orientation, position: pos };
        onUpdate({ ...config, canvas: { ...canvas, guides: [...(canvas.guides || []), newGuide] } }, false);
        setDraggingGuideId(newId);
    };

    const handleContainerMouseDown = (e: React.MouseEvent) => {
        if (handToolActive) return; // Allow hand tool event bubbling to outer App container
        if (e.target === e.currentTarget && !readOnly) onSelect(null);
        onFocusCanvas?.();
    };

    const handleLayerMouseDown = (id: string, e: React.MouseEvent) => {
        if (handToolActive) return; // Allow panning even when clicking layers
        e.stopPropagation(); onFocusCanvas?.();
        if (readOnly) return;
        const parentGroup = groups?.find(g => g.layerIds.includes(id));
        if (parentGroup) { onSelect(parentGroup.id, e.shiftKey || e.metaKey); return; }
        const isMulti = e.shiftKey || e.metaKey;
        if (!selectedIds.includes(id) || isMulti) { onSelect(id, isMulti); }
    };

    const updateLayer = (id: string, updates: any, save = false) => {
        if (readOnly) return;
        const newImages = image_layers.map(l => l.id === id ? { ...l, ...updates } : l);
        const newTexts = additional_texts.map(l => l.id === id ? { ...l, ...updates } : l);
        const newShapes = (shapes || []).map(l => l.id === id ? { ...l, ...updates } : l);
        onUpdate({ ...config, image_layers: newImages, additional_texts: newTexts, shapes: newShapes }, save);
    };

    const handleBatchTransform = (data: { x?: number, y?: number, w?: number, h?: number }, isDrag: boolean) => {
        if (selectedIds.length <= 1) return;
        const allLayers = [...image_layers, ...additional_texts, ...(shapes || [])];
        const selectionRect = getBoundingBox(selectedIds, allLayers);
        if (!selectionRect) return;
        let newConfig = { ...config };
        if (isDrag && data.x !== undefined && data.y !== undefined) {
            const deltaX = data.x - selectionRect.x;
            const deltaY = data.y - selectionRect.y;
            const updatePos = (l: any) => ({ ...l, position_x: l.position_x + deltaX, position_y: l.position_y + deltaY });
            newConfig.image_layers = newConfig.image_layers.map(l => selectedIds.includes(l.id) ? updatePos(l) : l);
            newConfig.additional_texts = newConfig.additional_texts.map(l => selectedIds.includes(l.id) ? updatePos(l) : l);
            newConfig.shapes = (newConfig.shapes || []).map(l => selectedIds.includes(l.id) ? updatePos(l) : l);
        } else if (!isDrag && data.w !== undefined && data.h !== undefined && data.x !== undefined && data.y !== undefined) {
            const scaleX = data.w / selectionRect.width;
            const scaleY = data.h / selectionRect.height;
            const updateSizePos = (l: any) => {
                const relX = l.position_x - selectionRect.x;
                const relY = l.position_y - selectionRect.y;
                return { ...l, width: l.width * scaleX, height: l.height * scaleY, position_x: data.x! + (relX * scaleX), position_y: data.y! + (relY * scaleY), font_size: l.font_size ? l.font_size * Math.min(scaleX, scaleY) : undefined };
            };
            newConfig.image_layers = newConfig.image_layers.map(l => selectedIds.includes(l.id) ? updateSizePos(l) : l);
            newConfig.additional_texts = newConfig.additional_texts.map(l => selectedIds.includes(l.id) ? updateSizePos(l) : l);
            newConfig.shapes = (newConfig.shapes || []).map(l => selectedIds.includes(l.id) ? updateSizePos(l) : l);
        }
        onUpdate(newConfig, true);
    };

    const handleGroupTransform = (groupId: string, data: { x?: number, y?: number, w?: number, h?: number }, isDrag: boolean) => {
        const group = groups?.find(g => g.id === groupId);
        if (!group) return;
        const allLayers = [...image_layers, ...additional_texts, ...(shapes || [])];
        const groupRect = getBoundingBox(group.layerIds, allLayers);
        if (!groupRect) return;
        let newConfig = { ...config };
        if (isDrag && data.x !== undefined && data.y !== undefined) {
            const deltaX = data.x - groupRect.x;
            const deltaY = data.y - groupRect.y;
            const updatePos = (l: any) => ({ ...l, position_x: l.position_x + deltaX, position_y: l.position_y + deltaY });
            newConfig.image_layers = newConfig.image_layers.map(l => group.layerIds.includes(l.id) ? updatePos(l) : l);
            newConfig.additional_texts = newConfig.additional_texts.map(l => group.layerIds.includes(l.id) ? updatePos(l) : l);
            newConfig.shapes = (newConfig.shapes || []).map(l => group.layerIds.includes(l.id) ? updatePos(l) : l);
        } else if (!isDrag && data.w !== undefined && data.h !== undefined && data.x !== undefined && data.y !== undefined) {
            const scaleX = data.w / groupRect.width;
            const scaleY = data.h / groupRect.height;
            const updateSizePos = (l: any) => {
                const relX = l.position_x - groupRect.x;
                const relY = l.position_y - groupRect.y;
                return { ...l, width: l.width * scaleX, height: l.height * scaleY, position_x: data.x! + (relX * scaleX), position_y: data.y! + (relY * scaleY), font_size: l.font_size ? l.font_size * Math.min(scaleX, scaleY) : undefined };
            };
            newConfig.image_layers = newConfig.image_layers.map(l => group.layerIds.includes(l.id) ? updateSizePos(l) : l);
            newConfig.additional_texts = newConfig.additional_texts.map(l => group.layerIds.includes(l.id) ? updateSizePos(l) : l);
            newConfig.shapes = (newConfig.shapes || []).map(l => group.layerIds.includes(l.id) ? updateSizePos(l) : l);
        }
        onUpdate(newConfig, true);
    };

    const bgBase = canvas.background_gradient_enabled
        ? `linear-gradient(${canvas.background_gradient_deg}deg, ${canvas.background_gradient_start}, ${canvas.background_gradient_end})`
        : canvas.background_color;
    
    const patternStyle = getBackgroundPatternStyle(canvas.background_pattern, canvas.background_pattern_color, canvas.background_pattern_opacity);
    const bgImage = canvas.background_image ? `url(${canvas.background_image})` : undefined;
    const selectedGroupIds = (selectedIds || []).filter(id => typeof id === 'string' && id.startsWith('group-'));
    const isMultiSelection = selectedIds.length > 1;
    let multiSelectRect = null;
    if (isMultiSelection) {
        const allLayers = [...image_layers, ...additional_texts, ...(shapes || [])];
        const explicitLayerIds = selectedIds.filter(id => typeof id === 'string' && !id.startsWith('group-'));
        selectedIds.filter(id => typeof id === 'string' && id.startsWith('group-')).forEach(gid => {
            const g = groups?.find(grp => grp.id === gid);
            if(g) explicitLayerIds.push(...g.layerIds);
        });
        multiSelectRect = getBoundingBox(explicitLayerIds, allLayers);
    }

    return (
        <div 
            id={domId} 
            style={{ 
                width: canvas.width, height: canvas.height, position: 'relative', overflow: 'hidden', 
                backgroundColor: canvas.background_gradient_enabled ? undefined : bgBase,
                backgroundImage: canvas.background_gradient_enabled ? bgBase : undefined,
                transform: `scale(${scale})`, transformOrigin: 'top left',
                filter: canvas.global_effects_enabled ? getEffectsStyle(canvas.global_effects) : undefined,
                zIndex: 0, isolation: 'isolate', willChange: 'transform'
            }} 
            onMouseDown={handleContainerMouseDown}
            className={`relative shadow-sm transition-shadow duration-200 ${isActive ? 'ring-4 ring-indigo-500/50' : 'ring-1 ring-slate-200'} ${handToolActive ? 'pointer-events-none' : 'cursor-default'}`}
        >
            <div className="absolute inset-0 z-0" style={{ transform: 'translate3d(0,0,0)', pointerEvents: 'none', backgroundColor: canvas.background_color || '#ffffff' }}>
                {bgImage && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center', opacity: canvas.background_layer_opacity ?? 1, filter: `blur(${canvas.background_layer_blur ?? 0}px)` }} />}
                {patternStyle.backgroundImage && <div className="absolute inset-0 pointer-events-none z-0" style={{ ...patternStyle, opacity: canvas.background_pattern_opacity ?? 0.1 }} />}
            </div>

            {!hideControls && (
                <>
                    {canvas.show_grid && <ProGrid />}
                    {canvas.show_guides && (
                        <>
                            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-indigo-500 z-[90] pointer-events-none opacity-60 no-export"></div>
                            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-indigo-500 z-[90] pointer-events-none opacity-60 no-export"></div>
                        </>
                    )}
                    {canvas.safe_area > 0 && (
                        <div className="absolute border-2 border-emerald-500 border-dashed pointer-events-none z-[100] shadow-[0_0_0_1px_rgba(255,255,255,0.15)] no-export" style={{ top: canvas.safe_area, left: canvas.safe_area, right: canvas.safe_area, bottom: canvas.safe_area }}>
                            <div className="absolute top-1 left-1 flex items-center gap-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded-sm shadow-sm opacity-80"><span className="text-[7px] font-black tracking-widest">SAFE ZONE</span></div>
                        </div>
                    )}
                    {canvas.show_rulers && <RulerTrack orientation="h" size={canvas.width} onMouseDown={(e) => handleCreateGuide(e, 'horizontal')} />}
                    {canvas.show_rulers && <RulerTrack orientation="v" size={canvas.height} onMouseDown={(e) => handleCreateGuide(e, 'vertical')} />}
                    {canvas.show_guides && (canvas.guides || []).map(g => (
                        <div key={g.id} className={`absolute z-[250] no-export ${g.orientation === 'horizontal' ? 'cursor-row-resize' : 'cursor-col-resize'}`} style={g.orientation === 'horizontal' ? { top: g.position - 4, left: 0, right: 0, height: 9 } : { left: g.position - 4, top: 0, bottom: 0, width: 9 }} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDraggingGuideId(g.id); }}>
                            <div className="absolute bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)] opacity-60 hover:opacity-100 transition-opacity" style={g.orientation === 'horizontal' ? { top: 4, left: 0, right: 0, height: 1 } : { left: 4, top: 0, bottom: 0, width: 1 }} />
                        </div>
                    ))}
                </>
            )}

            {!hideControls && isMultiSelection && multiSelectRect && (
                <Rnd key="multi-select-box" size={{ width: multiSelectRect.width, height: multiSelectRect.height }} position={{ x: multiSelectRect.x, y: multiSelectRect.y }} onDragStop={(e, d) => handleBatchTransform({ x: d.x, y: d.y }, true)} onResizeStop={(e, dir, ref, delta, pos) => handleBatchTransform({ w: parseInt(ref.style.width), h: parseInt(ref.style.height), x: pos.x, y: pos.y }, false)} lockAspectRatio={true} style={{ zIndex: 99999, border: '1px dashed #818cf8', backgroundColor: 'rgba(99,102,241,0.05)' }} scale={scale} className="no-export"><div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-t-md shadow-md flex items-center gap-1 whitespace-nowrap"><span>{selectedIds.length} ITEMS SELECTED</span></div></Rnd>
            )}

            {!hideControls && selectedGroupIds.map(groupId => {
                const group = groups?.find(g => g.id === groupId);
                if (!group) return null;
                const rect = getBoundingBox(group.layerIds, [...image_layers, ...additional_texts, ...(shapes || [])]);
                if (!rect) return null;
                return (
                    <Rnd key={`group-ctrl-${groupId}`} size={{ width: rect.width, height: rect.height }} position={{ x: rect.x, y: rect.y }} onDragStop={(e, d) => handleGroupTransform(groupId, { x: d.x, y: d.y }, true)} onResizeStop={(e, dir, ref, delta, pos) => handleGroupTransform(groupId, { w: parseInt(ref.style.width), h: parseInt(ref.style.height), x: pos.x, y: pos.y }, false)} lockAspectRatio={true} style={{ zIndex: 9999, border: '1px dashed #818cf8', backgroundColor: 'rgba(99,102,241,0.05)' }} scale={scale} className="no-export group-controller"><div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-t-md shadow-md flex items-center gap-1"><span>GROUP</span></div></Rnd>
                );
            })}

            {layerOrder.map((id, index) => {
                const isSelected = selectedIds.includes(id);
                const parentGroup = groups?.find(g => g.layerIds.includes(id));
                const isGroupSelected = parentGroup && selectedIds.includes(parentGroup.id);
                const disableInteraction = readOnly || isGroupSelected || (isMultiSelection && isSelected) || handToolActive;
                const isInteracting = interactingId === id;
                const commonProps = { 
                    scale: scale, 
                    onMouseDown: (e: any) => handleLayerMouseDown(id, e), 
                    cancel: ".no-drag", 
                    className: `selectable-layer layer-node-${id} ${disableInteraction ? 'pointer-events-none' : ''}`,
                    onDragStart: () => setInteractingId(id),
                    onResizeStart: () => setInteractingId(id),
                    onDragStop: (e: any, d: any) => { setInteractingId(null); updateLayer(id, { position_x: d.x, position_y: d.y }, true); },
                    onResizeStop: (e: any, dir: any, ref: any, delta: any, pos: any) => {
                        setInteractingId(null);
                        const newWidth = parseInt(ref.style.width);
                        const newHeight = parseInt(ref.style.height);
                        updateLayer(id, { width: newWidth, height: newHeight, position_x: pos.x, position_y: pos.y }, true);
                    }
                };

                const shape = shapes?.find(l => l.id === id);
                if (shape && !shape.hidden) {
                    const hasGlass = (shape.effects?.backdropBlur ?? 0) > 0;
                    const layerOpacity = hasGlass ? 1 : (shape.opacity ?? 1);
                    let finalFill = shape.fill_color;
                    let finalGradient = undefined;
                    const isGlassMode = hasGlass;
                    if (shape.gradient_enabled && shape.gradient_stops && !isGlassMode) {
                        const stops = shape.gradient_stops.map((s, idx) => {
                            const c = hexToRgba(s.color, s.alpha ?? 1);
                            let pos = s.position;
                            if (pos === undefined || pos === null) pos = (idx === 0) ? 0 : 1;
                            return `${c} ${pos * 100}%`;
                        }).join(', ');
                        finalGradient = `linear-gradient(${shape.gradient_deg}deg, ${stops})`;
                        finalFill = 'transparent';
                    }
                    const borderRadius = shape.shape_type === 'circle' ? '50%' : `${shape.border_radius}px`;
                    const isLine = shape.shape_type === 'line';
                    const height = isLine ? Math.max(2, shape.stroke_width || 2) : shape.height;
                    const shadowStyle = shape.shadow_enabled ? `${shape.shadow_x ?? 0}px ${shape.shadow_y ?? 0}px ${shape.shadow_blur ?? 0}px ${shape.shadow_color ?? 'rgba(0,0,0,0.5)'}` : undefined;
                    const shouldApplyContainerBg = !isLine && !isGlassMode;
                    let clipPath = undefined;
                    if (shape.shape_type === 'triangle') clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
                    if (shape.shape_type === 'star') clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
                    let finalFilter = shape.effects_enabled ? getEffectsStyle(shape.effects) : '';
                    let finalBoxShadow = shadowStyle;
                    if ((shape.shape_type === 'triangle' || shape.shape_type === 'star') && shadowStyle) {
                        finalBoxShadow = undefined; 
                        const ds = `drop-shadow(${shape.shadow_x ?? 0}px ${shape.shadow_y ?? 0}px ${shape.shadow_blur ?? 0}px ${shape.shadow_color ?? 'rgba(0,0,0,0.5)'})`;
                        finalFilter = `${finalFilter} ${ds}`.trim();
                    }
                    if (!finalFilter) finalFilter = undefined;
                    return (
                        <Rnd key={id} size={{ width: shape.width, height: height }} position={{ x: shape.position_x, y: shape.position_y }} disableDragging={disableInteraction || shape.locked} enableResizing={!disableInteraction && !shape.locked} style={{ zIndex: index + 10, pointerEvents: disableInteraction ? 'none' : 'auto' }} {...commonProps}>
                            <div style={{ width: '100%', height: '100%', position: 'relative', transform: `rotate(${shape.rotation}deg)`, transformOrigin: 'center center' }}>
                                {isGlassMode ? (
                                    <div style={{ position: 'absolute', inset: 0, borderRadius: borderRadius, boxShadow: finalBoxShadow, clipPath: clipPath, overflow: 'hidden' }}>
                                        <GlassOverlay shape={shape} canvasConfig={canvas} blurAmount={shape.effects?.backdropBlur || 20} tintColor={shape.fill_color || '#ffffff'} tintOpacity={shape.opacity ?? 0.2} isActive={!!isActive} isInteracting={isInteracting} />
                                    </div>
                                ) : (
                                    <div style={{ position: 'absolute', inset: 0, backgroundColor: shouldApplyContainerBg ? finalFill : (isLine ? shape.stroke_color : undefined), backgroundImage: shouldApplyContainerBg ? finalGradient : undefined, opacity: layerOpacity, borderRadius, filter: finalFilter, boxShadow: finalBoxShadow, clipPath: clipPath, mixBlendMode: shape.blend_mode as any, transform: 'translate3d(0,0,0) translateZ(0)', }} className="layer-content" />
                                )}
                                {!isLine && shape.stroke_width > 0 && <div style={{ position: 'absolute', inset: 0, border: `${shape.stroke_width}px solid ${shape.stroke_color}`, borderRadius, clipPath: clipPath, pointerEvents: 'none' }}/>}
                                {isSelected && !hideControls && !isGroupSelected && !isMultiSelection && <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none no-export" style={{ borderRadius }} />}
                            </div>
                        </Rnd>
                    );
                }

                const img = image_layers.find(l => l.id === id);
                if (img && !img.hidden) {
                    const maskScale = img.mask_content_scale ?? 1;
                    const maskX = img.mask_content_x ?? 0;
                    const maskY = img.mask_content_y ?? 0;
                    const maskStyle = img.mask_enabled && img.mask_src ? { 
                        maskImage: `url("${img.mask_src}")`, 
                        WebkitMaskImage: `url("${img.mask_src}")`, 
                        maskSize: `${maskScale * 100}% ${maskScale * 100}%`,
                        WebkitMaskSize: `${maskScale * 100}% ${maskScale * 100}%`, 
                        maskPosition: `${50 + maskX}% ${50 + maskY}%`, 
                        WebkitMaskPosition: `${50 + maskX}% ${50 + maskY}%`, 
                        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
                        maskOrigin: 'border-box', WebkitMaskOrigin: 'border-box',
                        maskClip: 'border-box', WebkitMaskClip: 'border-box',
                        maskMode: 'alpha', WebkitMaskMode: 'alpha'
                    } : {};
                    return (
                        <Rnd key={id} size={{ width: img.width, height: img.height }} position={{ x: img.position_x, y: img.position_y }} lockAspectRatio={true} disableDragging={disableInteraction || img.locked} enableResizing={!disableInteraction && !img.locked} style={{ zIndex: index + 10, pointerEvents: disableInteraction ? 'none' : 'auto' }} {...commonProps}>
                            <div style={{ width: '100%', height: '100%', transform: `rotate(${img.rotation}deg)`, transformOrigin: 'center center' }}>
                                <div style={{ width: '100%', height: '100%', opacity: img.opacity, mixBlendMode: img.blend_mode as any }}>
                                    <div style={{ width: '100%', height: '100%', ...maskStyle }}>
                                        <img src={img.src} style={{ width: '100%', height: '100%', pointerEvents: 'none', objectFit: 'cover', borderRadius: `${img.border_radius}px`, filter: img.effects_enabled ? getEffectsStyle(img.effects) : undefined, transform: `${img.flipX ? 'scaleX(-1)' : ''} ${img.flipY ? 'scaleY(-1)' : ''}` }} />
                                    </div>
                                </div>
                                {isSelected && !hideControls && !isGroupSelected && !isMultiSelection && <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none no-export" />}
                            </div>
                        </Rnd>
                    );
                }

                const txt = additional_texts.find(l => l.id === id);
                if (txt && !txt.hidden) {
                    return <TextLayerItem key={txt.id} layer={txt} zIndex={index + 10} isSelected={isSelected} isGroupSelected={isGroupSelected || isMultiSelection} hideControls={hideControls} readOnly={readOnly} scale={scale} onUpdate={updateLayer} onSelect={(e) => handleLayerMouseDown(txt.id, e)} isInteracting={isInteracting} />;
                }
                return null;
            })}
        </div>
    );
};

export default React.memo(CanvasPreview);