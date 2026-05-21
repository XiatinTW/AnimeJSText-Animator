/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { animate as anime, stagger, type JSAnimation } from 'animejs';
import { 
  Play, Pause, RotateCcw, Download, Copy, Settings2, 
  Type, Move, Sparkles, Sliders, ChevronDown, ChevronUp,
  Repeat
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type ElementType = 'text' | 'svg' | 'shape';

interface SceneElement {
  id: string;
  type: ElementType;
  content: string;
}

interface AnimationConfig {
  name: string;
  elements: SceneElement[];
  duration: number;
  delay: number;
  stagger: number;
  easing: string;
  // Transforms
  translateX: [number, number];
  translateY: [number, number];
  rotate: [number, number];
  scaleX: [number, number];
  scaleY: [number, number];
  opacity: [number, number];
  blur: [number, number];
  // Perspective
  perspective: number;
  background: string;
  textColor: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
}

interface CharOverride {
  duration?: number;
  delayOffset?: number;
  translateX?: [number, number];
  translateY?: [number, number];
  rotate?: [number, number];
  scaleX?: [number, number];
  scaleY?: [number, number];
  opacity?: [number, number];
  blur?: [number, number];
  textColor?: string;
}

const PRESETS: Record<string, Partial<AnimationConfig>> = {
  'Fade In Up': {
    translateY: [100, 0],
    opacity: [0, 1],
    scaleX: [1, 1],
    scaleY: [1, 1],
    rotate: [0, 0],
    blur: [10, 0],
    easing: 'outExpo'
  },
  'Pop & Spin': {
    scaleX: [0, 1],
    scaleY: [0, 1],
    rotate: [-180, 0],
    opacity: [0, 1],
    translateY: [0, 0],
    blur: [0, 0],
    easing: 'outBack'
  },
  'Side Slide': {
    translateX: [-200, 0],
    rotate: [15, 0],
    opacity: [0, 1],
    scaleX: [0.8, 1],
    scaleY: [0.8, 1],
    blur: [0, 0],
    easing: 'outQuart'
  },
  'Elastic Drop': {
    translateY: [-300, 0],
    opacity: [0, 1],
    scaleX: [1.2, 1],
    scaleY: [1.2, 1],
    blur: [0, 0],
    easing: 'outElastic'
  }
};

const EASING_OPTIONS = [
  'linear', 'inQuad', 'outQuad', 'inOutQuad', 'inCubic', 
  'outCubic', 'inOutCubic', 'inQuart', 'outQuart', 'inOutQuart',
  'inQuint', 'outQuint', 'inOutQuint', 'inSine', 'outSine',
  'inOutSine', 'inExpo', 'outExpo', 'inOutExpo', 'inCirc',
  'outCirc', 'inOutCirc', 'inBack', 'outBack', 'inOutBack',
  'inElastic', 'outElastic', 'inOutElastic'
];

const DEFAULT_CONFIG: AnimationConfig = {
  name: 'Fade In Up',
  elements: [
    { id: '1', type: 'text', content: 'Hello World' },
    { id: '2', type: 'shape', content: 'star' }
  ],
  duration: 1200,
  delay: 0,
  stagger: 150,
  easing: 'outExpo',
  translateX: [0, 0],
  translateY: [100, 0],
  rotate: [0, 0],
  scaleX: [1, 1],
  scaleY: [1, 1],
  opacity: [0, 1],
  blur: [0, 0],
  perspective: 1000,
  background: '#0a0a0a',
  textColor: '#ffffff',
  fontSize: 64,
  fontWeight: 900,
  letterSpacing: -2,
};

// --- Components ---

export default function App() {
  const [config, setConfig] = useState<AnimationConfig>(DEFAULT_CONFIG);
  const [overrides, setOverrides] = useState<Record<number, CharOverride>>({});
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'transform' | 'style' | 'individual'>('text');

  const animationRef = useRef<JSAnimation | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const [timelineHeight, setTimelineHeight] = useState(192); // default h-48 = 192px
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startY = e.clientY;
    const startHeight = timelineHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(120, Math.min(600, startHeight - deltaY));
      setTimelineHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [timelineHeight]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    const touch = e.touches[0];
    const startY = touch.clientY;
    const startHeight = timelineHeight;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!isDragging.current) return;
      const deltaY = moveEvent.touches[0].clientY - startY;
      const newHeight = Math.max(120, Math.min(600, startHeight - deltaY));
      setTimelineHeight(newHeight);
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [timelineHeight]);

  // Flatten all elements into animatable units
  const animUnits = useMemo(() => {
    const units: { id: string; type: 'char' | 'svg'; content: string; elementId: string }[] = [];
    config.elements.forEach(el => {
      if (el.type === 'text') {
        el.content.split('').forEach((char, i) => {
          units.push({ id: `${el.id}-${i}`, type: 'char', content: char, elementId: el.id });
        });
      } else if (el.type === 'shape') {
        units.push({ id: el.id, type: 'svg', content: el.content, elementId: el.id });
      } else {
        units.push({ id: el.id, type: 'svg', content: el.content, elementId: el.id });
      }
    });
    return units;
  }, [config.elements]);

  // Compute the absolute total duration of the timeline based on all element delays and individual durations
  const actualTotalDuration = useMemo(() => {
    if (animUnits.length === 0) return config.duration;
    let maxEndTime = 0;
    animUnits.forEach((_, i) => {
      const charDuration = overrides[i]?.duration || config.duration;
      const charDelay = i * config.stagger + (overrides[i]?.delayOffset || 0);
      const endTime = charDelay + charDuration;
      if (endTime > maxEndTime) {
        maxEndTime = endTime;
      }
    });
    return maxEndTime;
  }, [animUnits, config.duration, config.stagger, overrides]);

  const runAnimation = (autoplay = false) => {
    if (animationRef.current) {
      animationRef.current.pause();
    }

    const { 
      duration, stagger: staggerVal, easing, 
      translateX, translateY, rotate, scaleX, scaleY, opacity, blur
    } = config;

    animationRef.current = anime('.anim-item', {
      translateX: (_, i) => overrides[i]?.translateX || translateX,
      translateY: (_, i) => overrides[i]?.translateY || translateY,
      rotate: (_, i) => overrides[i]?.rotate || rotate,
      scaleX: (_, i) => overrides[i]?.scaleX || scaleX,
      scaleY: (_, i) => overrides[i]?.scaleY || scaleY,
      opacity: (_, i) => overrides[i]?.opacity || opacity,
      filter: (_, i) => {
        const [start, end] = overrides[i]?.blur || blur;
        return [`blur(${start}px)`, `blur(${end}px)`];
      },
      duration: (_, i) => overrides[i]?.duration || duration,
      delay: (_, i) => stagger(staggerVal)(null as any, i, animUnits.length) + (overrides[i]?.delayOffset || 0),
      ease: easing,
      autoplay,
      loop: isLooping,
      onUpdate: (anim) => {
        setProgress(anim.progress * 100);
      },
      onComplete: () => {
        if (!isLooping) {
          setIsPlaying(false);
        }
      }
    });

    if (!autoplay) {
      animationRef.current.seek(animationRef.current.duration * (progress / 100));
    }
  };

  useEffect(() => {
    // Maintain the existing playing state when config or overrides change
    runAnimation(isPlaying);
  }, [config, overrides, isLooping]);

  const togglePlay = () => {
    if (!animationRef.current) return;
    if (isPlaying) {
      animationRef.current.pause();
    } else {
      if (animationRef.current.completed) {
        animationRef.current.restart();
      } else {
        animationRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (animationRef.current) {
      animationRef.current.seek(animationRef.current.duration * (val / 100));
      setProgress(val);
      setIsPlaying(false);
    }
  };

  const handleExport = () => {
    setShowExport(true);
  };

  const generateCode = () => {
    const { 
      duration, stagger: staggerVal, easing, 
      translateX, translateY, rotate, scaleX, scaleY, opacity, blur,
      fontSize, textColor, fontWeight, letterSpacing
    } = config;

    const hasOverrides = Object.keys(overrides).length > 0;

    const jsCode = hasOverrides 
      ? `
const overrides = ${JSON.stringify(overrides, null, 2)};

animate('#anime-scene .anim-item', {
  translateX: (el, i) => overrides[i]?.translateX || [${translateX[0]}, ${translateX[1]}],
  translateY: (el, i) => overrides[i]?.translateY || [${translateY[0]}, ${translateY[1]}],
  rotate: (el, i) => overrides[i]?.rotate || [${rotate[0]}, ${rotate[1]}],
  scaleX: (el, i) => overrides[i]?.scaleX || [${scaleX[0]}, ${scaleX[1]}],
  scaleY: (el, i) => overrides[i]?.scaleY || [${scaleY[0]}, ${scaleY[1]}],
  opacity: (el, i) => overrides[i]?.opacity || [${opacity[0]}, ${opacity[1]}],
  filter: (el, i) => {
    const b = overrides[i]?.blur || [${blur[0]}, ${blur[1]}];
    return [\`blur(\${b[0]}px)\`, \`blur(\${b[1]}px)\`];
  },
  duration: (el, i) => overrides[i]?.duration || ${duration},
  delay: (el, i) => (i * ${staggerVal}) + (overrides[i]?.delayOffset || 0),
  ease: '${easing}',
  loop: ${isLooping}
});`
      : `
animate('#anime-scene .anim-item', {
  translateX: [${translateX[0]}, ${translateX[1]}],
  translateY: [${translateY[0]}, ${translateY[1]}],
  rotate: [${rotate[0]}, ${rotate[1]}],
  scaleX: [${scaleX[0]}, ${scaleX[1]}],
  scaleY: [${scaleY[0]}, ${scaleY[1]}],
  opacity: [${opacity[0]}, ${opacity[1]}],
  filter: [\`blur(${blur[0]}px)\`, \`blur(${blur[1]}px)\`],
  duration: ${duration},
  delay: stagger(${staggerVal}),
  ease: '${easing}',
  loop: ${isLooping}
});`;

    const htmlContent = animUnits.map(unit => {
      if (unit.type === 'char') {
        return `<span class="anim-item letter" style="display: inline-block;">${unit.content === ' ' ? '&nbsp;' : unit.content}</span>`;
      } else {
        return `<div class="anim-item shape" style="display: inline-block; width: 1em; height: 1em;">${getShapeSvg(unit.content)}</div>`;
      }
    }).join('\n  ');

    return `
// HTML
<div id="anime-scene" style="font-size: ${fontSize}px; font-weight: ${fontWeight}; letter-spacing: ${letterSpacing}px; color: ${textColor}; display: flex; align-items: center; gap: 0.2em;">
  ${htmlContent}
</div>

// JavaScript (requires anime.js v4)
import { animate, stagger } from 'animejs';
${jsCode}
`.trim();
  };

  return (
    <div className="h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-indigo-500/30 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Anime Text FX Studio
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
          >
            <Download className="w-4 h-4" />
            Export Code
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Controls */}
        <div className="w-80 border-r border-neutral-800 bg-neutral-900 flex flex-col shrink-0">
          <div className="flex border-b border-neutral-800">
            {[
              { id: 'text', icon: Type, label: 'Text' },
              { id: 'transform', icon: Move, label: 'Motion' },
              { id: 'style', icon: Settings2, label: 'Style' },
              { id: 'individual', icon: Sliders, label: 'Adjust' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 py-4 flex flex-col items-center gap-1 text-xs font-medium transition-colors",
                  activeTab === tab.id ? "text-indigo-400 bg-indigo-500/5" : "text-neutral-500 hover:text-neutral-300"
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {activeTab === 'text' && (
              <div className="space-y-6">
                {/* Animation Settings (Grouped Together) */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Presets</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(PRESETS).map(presetName => (
                        <button
                          key={presetName}
                          onClick={() => setConfig({ ...config, ...PRESETS[presetName], name: presetName })}
                          className={cn(
                            "px-3 py-2 text-[10px] rounded-lg border transition-all text-center",
                            config.name === presetName 
                              ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400" 
                              : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                          )}
                        >
                          {presetName}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t border-neutral-800/60">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Easing Function</label>
                    <select 
                      value={config.easing}
                      onChange={(e) => setConfig({ ...config, easing: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer hover:border-neutral-600 transition-colors"
                    >
                      {EASING_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>

                  <div className="space-y-4">
                     <ControlSlider 
                      label="Duration" 
                      value={config.duration} 
                      min={200} max={3000} stepped 
                      onChange={v => setConfig({...config, duration: v})} 
                      unit="ms"
                    />
                    <ControlSlider 
                      label="Stagger" 
                      value={config.stagger} 
                      min={0} max={1000} stepped 
                      onChange={v => setConfig({...config, stagger: v})} 
                      unit="ms"
                    />
                  </div>
                </div>

                {/* Scene Elements */}
                <div className="space-y-4 pt-6 border-t border-neutral-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Scene Elements</label>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setConfig({ ...config, elements: [...config.elements, { id: Date.now().toString(), type: 'text', content: 'TEXT' }] })}
                        className="p-1 px-2 bg-neutral-800 hover:bg-neutral-700 rounded text-[9px] font-bold text-neutral-300 transition-colors"
                      >
                        + TEXT
                      </button>
                      <button 
                         onClick={() => setConfig({ ...config, elements: [...config.elements, { id: Date.now().toString(), type: 'shape', content: 'circle' }] })}
                        className="p-1 px-2 bg-neutral-800 hover:bg-neutral-700 rounded text-[9px] font-bold text-neutral-300 transition-colors"
                      >
                        + SHAPE
                      </button>
                      <button 
                         onClick={() => setConfig({ ...config, elements: [...config.elements, { id: Date.now().toString(), type: 'svg', content: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>' }] })}
                        className="p-1 px-2 bg-neutral-800 hover:bg-neutral-700 rounded text-[9px] font-bold text-neutral-300 transition-colors"
                      >
                        + SVG
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {config.elements.map((el, i) => (
                      <div key={el.id} className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">Layer {i+1} • {el.type}</span>
                          <button 
                            onClick={() => {
                              const newElements = [...config.elements];
                              newElements.splice(i, 1);
                              setConfig({ ...config, elements: newElements });
                            }}
                            className="text-xs text-red-500/50 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                        
                        {el.type === 'text' && (
                          <textarea
                            value={el.content}
                            onChange={(e) => {
                              const newElements = [...config.elements];
                              newElements[i].content = e.target.value;
                              setConfig({ ...config, elements: newElements });
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none h-12 resize-none"
                          />
                        )}

                        {el.type === 'shape' && (
                          <select
                            value={el.content}
                            onChange={(e) => {
                              const newElements = [...config.elements];
                              newElements[i].content = e.target.value;
                              setConfig({ ...config, elements: newElements });
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs outline-none"
                          >
                            <option value="circle">Circle</option>
                            <option value="square">Square</option>
                            <option value="triangle">Triangle</option>
                            <option value="star">Star</option>
                          </select>
                        )}

                        {el.type === 'svg' && (
                          <textarea
                            value={el.content}
                            onChange={(e) => {
                              const newElements = [...config.elements];
                              newElements[i].content = e.target.value;
                              setConfig({ ...config, elements: newElements });
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-[9px] font-mono focus:ring-1 focus:ring-indigo-500 outline-none h-20 resize-none overflow-x-auto whitespace-pre"
                            placeholder="Paste <svg> tag here..."
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transform' && (
              <div className="space-y-6">
                <RangeControl 
                  label="Translate X" 
                  values={config.translateX} 
                  min={-500} max={500} 
                  onChange={v => setConfig({...config, translateX: v})} 
                />
                <RangeControl 
                  label="Translate Y" 
                  values={config.translateY} 
                  min={-500} max={500} 
                  onChange={v => setConfig({...config, translateY: v})} 
                />
                <RangeControl 
                  label="Rotation" 
                  values={config.rotate} 
                  min={-180} max={180} 
                  onChange={v => setConfig({...config, rotate: v})} 
                  unit="°"
                />
                <RangeControl 
                  label="Scale X" 
                  values={config.scaleX} 
                  min={0} max={3} step={0.1}
                  onChange={v => setConfig({...config, scaleX: v})} 
                />
                <RangeControl 
                  label="Scale Y" 
                  values={config.scaleY} 
                  min={0} max={3} step={0.1}
                  onChange={v => setConfig({...config, scaleY: v})} 
                />
                <RangeControl 
                  label="Opacity" 
                  values={config.opacity} 
                  min={0} max={1} step={0.1}
                  onChange={v => setConfig({...config, opacity: v})} 
                />
                <RangeControl 
                  label="Blur Filter" 
                  values={config.blur} 
                  min={0} max={40} 
                  onChange={v => setConfig({...config, blur: v})} 
                  unit="px"
                />
                <ControlSlider 
                  label="Perspective" 
                  value={config.perspective} 
                  min={100} max={2000} stepped 
                  onChange={v => setConfig({...config, perspective: v})} 
                  unit="px"
                />
              </div>
            )}

            {activeTab === 'style' && (
              <div className="space-y-6">
                <ControlSlider 
                  label="Font Size" 
                  value={config.fontSize} 
                  min={12} max={200} 
                  onChange={v => setConfig({...config, fontSize: v})} 
                  unit="px"
                />
                <ControlSlider 
                  label="Font Weight" 
                  value={config.fontWeight} 
                  min={100} max={900} step={100}
                  onChange={v => setConfig({...config, fontWeight: v})} 
                />
                <ControlSlider 
                  label="Letter Spacing" 
                  value={config.letterSpacing} 
                  min={-20} max={50} 
                  onChange={v => setConfig({...config, letterSpacing: v})} 
                  unit="px"
                />

                <div className="space-y-4 pt-4 border-t border-neutral-800">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Text Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={config.textColor}
                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                        className="w-10 h-10 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={config.textColor}
                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 text-xs outline-none uppercase font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Background</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={config.background}
                        onChange={(e) => setConfig({ ...config, background: e.target.value })}
                        className="w-10 h-10 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={config.background}
                        onChange={(e) => setConfig({ ...config, background: e.target.value })}
                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 text-xs outline-none uppercase font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'individual' && (
              <div className="space-y-6">
                {selectedIdx === null ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-neutral-800/20 rounded-2xl border border-dashed border-neutral-800">
                    <Sliders className="w-8 h-8 text-neutral-700 mb-3" />
                    <p className="text-xs text-neutral-500">Select a character in the timeline or workspace to edit individually</p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-indigo-500/20 rounded flex items-center justify-center text-xs font-bold text-indigo-400 border border-indigo-500/30">
                          {animUnits[selectedIdx]?.type === 'char' 
                            ? (animUnits[selectedIdx].content === ' ' ? '_' : animUnits[selectedIdx].content)
                            : 'SVG'
                          }
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium">Index {selectedIdx}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const newOverrides = { ...overrides };
                          delete newOverrides[selectedIdx];
                          setOverrides(newOverrides);
                        }}
                        className="text-[10px] text-red-400/70 hover:text-red-400 underline transition-colors"
                      >
                        Reset Overrides
                      </button>
                    </div>

                    <ControlSlider 
                      label="Duration" 
                      value={overrides[selectedIdx]?.duration || config.duration} 
                      min={200} max={3000} stepped 
                      onChange={v => setOverrides({ ...overrides, [selectedIdx]: { ...overrides[selectedIdx], duration: v } })} 
                      unit="ms"
                    />

                    <ControlSlider 
                      label="Delay Offset" 
                      value={overrides[selectedIdx]?.delayOffset || 0} 
                      min={-1000} max={1000} stepped 
                      onChange={v => setOverrides({ ...overrides, [selectedIdx]: { ...overrides[selectedIdx], delayOffset: v } })} 
                      unit="ms"
                    />

                    <RangeControl 
                      label="Individual Translate X" 
                      values={overrides[selectedIdx]?.translateX || config.translateX} 
                      min={-500} max={500} 
                      onChange={v => setOverrides({ ...overrides, [selectedIdx]: { ...overrides[selectedIdx], translateX: v } })} 
                    />

                    <RangeControl 
                      label="Individual Translate Y" 
                      values={overrides[selectedIdx]?.translateY || config.translateY} 
                      min={-500} max={500} 
                      onChange={v => setOverrides({ ...overrides, [selectedIdx]: { ...overrides[selectedIdx], translateY: v } })} 
                    />

                    <RangeControl 
                      label="Individual Rotation" 
                      values={overrides[selectedIdx]?.rotate || config.rotate} 
                      min={-180} max={180} 
                      onChange={v => setOverrides({ ...overrides, [selectedIdx]: { ...overrides[selectedIdx], rotate: v } })} 
                      unit="°"
                    />
                    
                    <RangeControl 
                      label="Individual Scale X" 
                      values={overrides[selectedIdx]?.scaleX || config.scaleX} 
                      min={0} max={3} step={0.1}
                      onChange={v => setOverrides({ ...overrides, [selectedIdx]: { ...overrides[selectedIdx], scaleX: v } })} 
                    />

                    <RangeControl 
                      label="Individual Scale Y" 
                      values={overrides[selectedIdx]?.scaleY || config.scaleY} 
                      min={0} max={3} step={0.1}
                      onChange={v => setOverrides({ ...overrides, [selectedIdx]: { ...overrides[selectedIdx], scaleY: v } })} 
                    />

                    <RangeControl 
                      label="Individual Opacity" 
                      values={overrides[selectedIdx]?.opacity || config.opacity} 
                      min={0} max={1} step={0.1}
                      onChange={v => setOverrides({ ...overrides, [selectedIdx]: { ...overrides[selectedIdx], opacity: v } })} 
                    />

                    <RangeControl 
                      label="Individual Blur" 
                      values={overrides[selectedIdx]?.blur || config.blur} 
                      min={0} max={40} 
                      onChange={v => setOverrides({ ...overrides, [selectedIdx]: { ...overrides[selectedIdx], blur: v } })} 
                      unit="px"
                    />

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Custom Color</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={overrides[selectedIdx]?.textColor || config.textColor}
                          onChange={(e) => setOverrides({ ...overrides, [selectedIdx]: { ...overrides[selectedIdx], textColor: e.target.value } })}
                          className="w-10 h-10 bg-transparent border-none cursor-pointer"
                        />
                         <button 
                            onClick={() => {
                              const newOverrides = { ...overrides };
                              const { textColor, ...rest } = newOverrides[selectedIdx] || {};
                              newOverrides[selectedIdx] = rest;
                              setOverrides(newOverrides);
                            }}
                            className="text-[10px] text-neutral-500 hover:text-neutral-400"
                          >
                            Reset Color
                          </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col bg-neutral-950 relative overflow-hidden">
          {/* Canvas */}
          <div 
            className="flex-1 flex items-center justify-center p-8 transition-colors duration-500"
            style={{ backgroundColor: config.background }}
          >
            <div 
              ref={textRef}
              className="flex items-center flex-wrap justify-center gap-[0.2em] tracking-tight"
              style={{ 
                fontSize: `${config.fontSize}px`, 
                fontWeight: config.fontWeight,
                letterSpacing: `${config.letterSpacing}px`,
                color: config.textColor,
                perspective: `${config.perspective}px`
              }}
            >
              {animUnits.map((unit, i) => (
                <div 
                  key={unit.id} 
                  onClick={() => {
                    setSelectedIdx(i);
                    setActiveTab('individual');
                  }}
                  className={cn(
                    "anim-item inline-flex items-center justify-center cursor-pointer transition-shadow rounded px-1",
                    selectedIdx === i ? "ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]" : "hover:bg-indigo-500/10"
                  )}
                  style={{ 
                    whiteSpace: 'pre',
                    color: overrides[i]?.textColor || config.textColor,
                    width: unit.type === 'svg' ? '1em' : 'auto',
                    height: unit.type === 'svg' ? '1em' : 'auto',
                  }}
                >
                  {unit.type === 'char' ? unit.content : (
                    <div 
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: getShapeSvg(unit.content) }} 
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Resize Handle / Bar Divider */}
          <div 
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="h-1 bg-neutral-800/80 hover:bg-indigo-500 cursor-ns-resize transition-colors relative z-20 flex items-center justify-center select-none group"
            title="Drag to resize timeline"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-[2px] bg-indigo-300 rounded-full shadow-[0_0_8px_rgba(99,102,241,1)]" />
            </div>
          </div>

          {/* Timeline Bar */}
          <div 
            style={{ height: `${timelineHeight}px` }}
            className="border-t border-neutral-800 bg-neutral-900 flex flex-col shrink-0"
          >
            <div className="h-10 border-b border-neutral-800 flex items-center px-6 gap-6">
              <div className="flex items-center gap-2">
                 <button 
                  onClick={togglePlay}
                  className="p-1.5 hover:bg-neutral-800 rounded-full transition-colors text-white"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </button>
                <button 
                  onClick={() => {
                    animationRef.current?.restart();
                    setIsPlaying(true);
                  }}
                  className="p-1.5 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsLooping(!isLooping)}
                  className={cn(
                    "p-1.5 rounded-full transition-all flex items-center justify-center",
                    isLooping 
                      ? "text-indigo-400 bg-indigo-500/15 hover:bg-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.2)]" 
                      : "text-neutral-400 hover:bg-neutral-800"
                  )}
                  title={isLooping ? "Loop On" : "Loop Off"}
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 flex items-center gap-4 group">
                <span className="text-[10px] font-mono text-neutral-500 w-10">
                  {Math.round(progress)}%
                </span>
                <div className="relative flex-1 h-6 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer focus:outline-none accent-indigo-500 accent-height-4"
                  />
                </div>
                <span className="text-[10px] font-mono text-neutral-500 whitespace-nowrap min-w-[90px] text-right">
                  {Math.round((progress / 100) * actualTotalDuration)}ms / {Math.round(actualTotalDuration)}ms
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-neutral-950/20 pt-4">
              <div className="px-6 min-w-max">
                 <div className="space-y-1">
                    {/* Character Tracks Visualization */}
                    {animUnits.map((unit, i) => {
                      const charDuration = overrides[i]?.duration || config.duration;
                      const charDelay = i * config.stagger + (overrides[i]?.delayOffset || 0);
                      const maxViewDuration = actualTotalDuration;
                      
                      return (
                        <div 
                          key={unit.id} 
                          onClick={() => {
                            setSelectedIdx(i);
                            setActiveTab('individual');
                          }}
                          className={cn(
                            "flex h-6 items-center gap-4 cursor-pointer transition-colors px-1 rounded",
                            selectedIdx === i ? "bg-indigo-500/10" : "hover:bg-neutral-800"
                          )}
                        >
                          <span className={cn(
                            "w-4 text-[9px] font-mono text-center transition-colors",
                            selectedIdx === i ? "text-indigo-400 font-bold" : "text-neutral-600"
                          )}>
                            {unit.type === 'char' ? (unit.content === ' ' ? '_' : unit.content) : '■'}
                          </span>
                          <div className="relative w-[600px] h-2 bg-neutral-800/50 rounded-full overflow-hidden border border-neutral-800">
                            <div 
                              className={cn(
                                "absolute h-full rounded-full transition-all duration-300",
                                selectedIdx === i ? "bg-indigo-500/50" : "bg-indigo-500/20"
                              )}
                              style={{ 
                                left: `${(charDelay / maxViewDuration) * 100}%`,
                                width: `${(charDuration / maxViewDuration) * 100}%`
                              }}
                            />
                            {/* Mask for current progress */}
                             <div 
                              className={cn(
                                "absolute h-full shadow-[0_0_8px_rgba(129,140,248,0.5)] transition-all duration-75",
                                selectedIdx === i ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" : "bg-indigo-400"
                              )}
                              style={{ 
                                left: `${(charDelay / maxViewDuration) * 100}%`,
                                width: `${Math.max(0, Math.min(1, ( (progress/100 * actualTotalDuration) - charDelay) / charDuration)) * (charDuration / maxViewDuration) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-400" />
                Export Animation
              </h3>
              <button 
                onClick={() => setShowExport(false)}
                className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-500 transition-colors"
              >
                <ChevronDown className="w-5 h-5 rotate-180" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-neutral-500 font-medium">Generated Snippet</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generateCode());
                    // Simple toast or feedback could be added here
                  }}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy to Clipboard
                </button>
              </div>
              <div className="bg-black rounded-xl p-4 overflow-x-auto border border-white/5 max-h-[50vh]">
                <pre className="text-xs font-mono text-indigo-300/90 leading-relaxed">
                  <code>{generateCode()}</code>
                </pre>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex gap-4 items-start">
                <div className="w-8 h-8 bg-indigo-500/20 rounded flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-xs text-neutral-400 leading-relaxed">
                  <p className="font-medium text-neutral-300 mb-1">How to use</p>
                  1. Include <code className="text-indigo-300">anime.min.js</code> in your project.<br />
                  2. Copy the HTML structure into your body.<br />
                  3. Execute the script after the DOM is ready.
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/50 flex justify-end">
              <button 
                onClick={() => setShowExport(false)}
                className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full text-sm font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px; width: 16px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          border: 2px solid #000;
          box-shadow: 0 0 10px rgba(99,102,241,0.4);
          margin-top: -6px;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%; height: 4px;
          border-radius: 2px;
          background: #222;
        }
        /* Hide number input spinners */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        /* Custom Scrollbar Styles */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #4f46e5;
        }
        /* For Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: #333 transparent;
        }
      `}</style>
    </div>
  );
}

// --- Helpers ---

function getShapeSvg(content: string) {
  if (content.trim().startsWith('<svg')) return content;
  
  const shapes: Record<string, string> = {
    circle: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="currentColor"/></svg>',
    square: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="currentColor"/></svg>',
    triangle: '<svg viewBox="0 0 100 100"><path d="M50 10 L90 90 L10 90 Z" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 100 100"><path d="M50 5 L63 38 L98 38 L70 59 L81 92 L50 72 L19 92 L30 59 L2 38 L37 38 Z" fill="currentColor"/></svg>'
  };
  return shapes[content] || shapes.circle;
}

function ControlSlider({ 
  label, value, min, max, unit = '', stepped = false, step = 1, onChange 
}: { 
  label: string; value: number; min: number; max: number; unit?: string; stepped?: boolean; step?: number; onChange: (v: number) => void 
}) {
  const actualStep = stepped ? 10 : step;
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-4">
        <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold shrink-0">{label}</label>
        <div className="flex items-center gap-1.5 bg-neutral-800 rounded px-1.5 py-0.5 border border-neutral-700 shrink-0">
          <input 
            type="number"
            value={value}
            min={min}
            max={max}
            step={actualStep}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-12 bg-transparent text-right text-[10px] font-mono text-indigo-400 outline-none appearance-none"
          />
          <span className="text-[10px] font-mono text-neutral-500">{unit}</span>
        </div>
      </div>
      <input 
        type="range" 
        min={min} max={max} 
        step={actualStep}
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-indigo-500"
      />
    </div>
  );
}

function RangeControl({ 
  label, values, min, max, step = 1, unit = '', onChange 
}: { 
  label: string; values: [number, number]; min: number; max: number; step?: number; unit?: string; onChange: (v: [number, number]) => void 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-3 bg-neutral-800/30 p-3 rounded-xl border border-neutral-800 transition-all hover:border-neutral-700">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center gap-4 group"
      >
        <div className="flex flex-col items-start gap-0.5 min-w-0">
          <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold group-hover:text-neutral-400 transition-colors uppercase truncate w-full text-left">{label}</label>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-neutral-400">{values[0]}{unit}</span>
            <span className="text-neutral-600">→</span>
            <span className="text-indigo-400">{values[1]}{unit}</span>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform shrink-0", isExpanded && "rotate-180")} />
      </button>
      
      {isExpanded && (
        <div className="space-y-4 pt-2 animate-in slide-in-from-top-1 duration-200 border-t border-neutral-800/50 mt-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-3 text-[9px] text-neutral-500 uppercase font-medium">
              <span className="shrink-0">Start State</span>
              <div className="flex items-center gap-1 bg-neutral-800 rounded px-1.5 py-0.5 border border-neutral-700 shrink-0">
                <input 
                  type="number"
                  value={values[0]}
                  min={min}
                  max={max}
                  step={step}
                  onChange={(e) => onChange([parseFloat(e.target.value) || 0, values[1]])}
                  className="w-10 bg-transparent text-right text-[10px] font-mono text-neutral-400 outline-none"
                />
                <span>{unit}</span>
              </div>
            </div>
            <input 
              type="range" 
              min={min} max={max} step={step}
              value={values[0]} 
              onChange={(e) => onChange([parseFloat(e.target.value), values[1]])}
              className="w-full accent-neutral-600 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-3 text-[9px] text-neutral-500 uppercase font-medium">
              <span className="shrink-0">End State</span>
              <div className="flex items-center gap-1 bg-neutral-800 rounded px-1.5 py-0.5 border border-neutral-700 shrink-0">
                <input 
                  type="number"
                  value={values[1]}
                  min={min}
                  max={max}
                  step={step}
                  onChange={(e) => onChange([values[0], parseFloat(e.target.value) || 0])}
                  className="w-10 bg-transparent text-right text-[10px] font-mono text-indigo-400 outline-none"
                />
                <span>{unit}</span>
              </div>
            </div>
            <input 
              type="range" 
              min={min} max={max} step={step}
              value={values[1]} 
              onChange={(e) => onChange([values[0], parseFloat(e.target.value)])}
              className="w-full accent-indigo-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

