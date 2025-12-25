
import React, { useState, useRef } from 'react';
import { extractMindMapFromImage, generateMindMapFromText } from './services/geminiService';
import MindMapCanvas, { MindMapCanvasRef } from './components/MindMapCanvas';
import { AppState, MindMapNode } from './types';
import { AI_CONFIG } from './config';

type Mode = 'image' | 'doc';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('image');
  const [textInput, setTextInput] = useState('');
  const [state, setState] = useState<AppState>({
    isProcessing: false,
    error: null,
    mindMapData: null,
    imageUrl: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<MindMapCanvasRef>(null);

  // 处理文本生成
  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setState(prev => ({ ...prev, isProcessing: true, error: null, mindMapData: null }));
    try {
      const data = await generateMindMapFromText(textInput);
      setState(prev => ({ ...prev, mindMapData: data, isProcessing: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isProcessing: false, error: err.message }));
    }
  };

  // 处理图片/文档文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    if (mode === 'image') {
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setState(prev => ({ ...prev, imageUrl: base64, isProcessing: true, error: null, mindMapData: null }));
        try {
          const data = await extractMindMapFromImage(base64);
          setState(prev => ({ ...prev, mindMapData: data, isProcessing: false }));
        } catch (err: any) {
          setState(prev => ({ ...prev, isProcessing: false, error: err.message }));
        }
      };
      reader.readAsDataURL(file);
    } else {
      // 文档模式支持读取文本
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        setTextInput(content);
      };
      reader.readAsText(file);
    }
  };

  const reset = () => {
    setState({ isProcessing: false, error: null, mindMapData: null, imageUrl: null });
    setTextInput('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdfe] text-slate-900">
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-2.5 rounded-2xl shadow-lg shadow-indigo-100">
            <i className="fas fa-project-diagram text-white text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter">VisionMind <span className="text-indigo-600">Pro</span></h1>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Requirement & Visual Intelligence</p>
          </div>
        </div>

        {state.mindMapData && (
          <div className="flex items-center gap-3">
            <button onClick={reset} className="px-5 py-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-all">
              <i className="fas fa-arrow-left mr-2"></i> 返回
            </button>
            
            <button 
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-xl text-sm font-black transition-all"
              onClick={() => {
                const blob = new Blob([JSON.stringify(state.mindMapData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `visionmind_export.json`;
                a.click();
              }}
            >
              <i className="fas fa-code mr-2"></i> 导出 JSON
            </button>

            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-black transition-all shadow-xl shadow-indigo-100"
              onClick={() => canvasRef.current?.exportImage()}
            >
              <i className="fas fa-image mr-2"></i> 导出图片
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {!state.mindMapData && !state.isProcessing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100">
            <div className="max-w-3xl w-full text-center">
              <div className="inline-flex p-1 bg-slate-200/50 rounded-2xl mb-12">
                <button 
                  onClick={() => setMode('image')}
                  className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${mode === 'image' ? 'bg-white shadow-xl text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <i className="fas fa-image mr-2"></i> 图片重构
                </button>
                <button 
                  onClick={() => setMode('doc')}
                  className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${mode === 'doc' ? 'bg-white shadow-xl text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <i className="fas fa-file-alt mr-2"></i> 需求建模
                </button>
              </div>

              {mode === 'image' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-6xl font-black mb-6 tracking-tighter text-slate-900">
                    一键还原 <br/><span className="text-indigo-600">视觉逻辑</span>
                  </h2>
                  <p className="text-slate-500 text-lg mb-10 max-w-xl mx-auto">
                    上传任何思维导图、流程图或笔记图片，AI 将精准提取并转化为可交互的数字资产。
                  </p>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group relative overflow-hidden shadow-2xl shadow-slate-200/50"
                  >
                    <div className="relative z-10">
                      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-500">
                        <i className="fas fa-plus text-3xl text-indigo-600"></i>
                      </div>
                      <p className="text-xl font-black text-slate-800">上传导图图片</p>
                      <p className="text-sm text-slate-400 mt-2">支持 JPG, PNG, WebP (建议 4K 清晰度)</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                  <h2 className="text-5xl font-black mb-6 tracking-tighter text-center">
                    从文字到 <span className="text-indigo-600">蓝图</span>
                  </h2>
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100">
                    <textarea 
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="在此粘贴需求文档、产品说明、项目规划或会议纪要..."
                      className="w-full h-64 bg-slate-50 border-none rounded-2xl p-6 text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all resize-none font-medium text-lg leading-relaxed mb-6"
                    />
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim()}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                      >
                        <i className="fas fa-wand-magic-sparkles"></i> 立即生成思维导图
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-5 rounded-2xl transition-all"
                        title="上传文档文件 (.txt, .md)"
                      >
                        <i className="fas fa-file-upload text-xl"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} />
              
              {state.error && (
                <div className="mt-8 p-5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-4 animate-bounce">
                  <i className="fas fa-exclamation-triangle text-lg"></i>
                  {state.error}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex h-full overflow-hidden">
            <div className="hidden lg:flex flex-col w-80 bg-white border-r border-slate-100 shrink-0">
              <div className="p-6 border-b border-slate-50">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-info-circle"></i> {mode === 'image' ? '源图参考' : '需求摘要'}
                </h3>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {mode === 'image' && state.imageUrl ? (
                  <img src={state.imageUrl} className="w-full rounded-2xl shadow-lg ring-4 ring-slate-50" />
                ) : (
                  <div className="text-sm text-slate-600 font-medium leading-relaxed italic opacity-80">
                    {textInput.substring(0, 1000)}...
                  </div>
                )}
                
                <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">架构质量</p>
                    <p className="text-sm font-black text-indigo-700">深度逻辑建模已完成</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">模型引擎</p>
                    <p className="text-sm font-black text-slate-700">{mode === 'doc' ? 'Gemini 3 Pro' : 'Gemini 3 Flash'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-slate-50 relative overflow-hidden">
              {state.isProcessing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-xl z-[60] flex flex-col items-center justify-center">
                  <div className="relative mb-12">
                    <div className="w-24 h-24 border-8 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fas fa-brain text-2xl text-indigo-600 animate-pulse"></i>
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                    {mode === 'image' ? '正在重构视觉神经元...' : '正在进行深度架构建模...'}
                  </h3>
                  <p className="text-slate-400 font-bold mt-4 uppercase tracking-[0.3em] text-xs">
                    Powered by Google Gemini Intelligence
                  </p>
                </div>
              )}
              {state.mindMapData && <MindMapCanvas ref={canvasRef} data={state.mindMapData} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
