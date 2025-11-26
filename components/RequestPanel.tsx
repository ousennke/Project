

import React, { useState } from 'react';
import { ResponseData } from '../types';
import { Image as ImageIcon, FileJson, AlertCircle, Copy, Check, Video, WrapText, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n';

interface ResponsePanelProps {
  response: ResponseData | null;
  error: string | null;
  loading?: boolean;
}

const ResponsePanel: React.FC<ResponsePanelProps> = ({ response, error, loading }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  // Immediate Loading State (Request in progress, no response yet)
  if (loading && !response) {
    return (
      <div className="h-full bg-white border-l border-gray-200 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
          <Loader2 size={48} className="text-indigo-600 animate-spin mb-4 opacity-80" />
          <p className="text-sm font-medium text-gray-500 animate-pulse">{t.response.processing}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-white border-l border-gray-200 p-6 flex items-center justify-center text-center">
        <div className="max-w-xs">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t.response.failed}</h3>
          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-200 font-mono break-all">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="h-full bg-gray-50/50 border-l border-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={32} className="opacity-50" />
          </div>
          <p className="text-sm">{t.response.noResult}</p>
        </div>
      </div>
    );
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(response.body, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const extractMedia = (data: any): Array<{ type: 'image' | 'video', url: string }> => {
    const media: Array<{ type: 'image' | 'video', url: string }> = [];
    const seen = new Set<string>();

    const add = (type: 'image' | 'video', url: string) => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        media.push({ type, url });
    };
    
    const traverse = (obj: any) => {
      if (!obj) return;
      
      if (typeof obj === 'string') {
         // Check for extension
         if (obj.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i) || obj.startsWith('data:image')) {
             add('image', obj);
         } else if (obj.match(/^https?:\/\/.*\.(mp4|mov|webm|avi)(\?.*)?$/i)) {
             add('video', obj);
         } 
         // Check for mime_type in query params
         else if (obj.includes('mime_type=video') || obj.includes('mime_type=image')) {
             if (obj.includes('mime_type=video')) add('video', obj);
             else add('image', obj);
         }
         return;
      }

      if (Array.isArray(obj)) {
        obj.forEach(traverse);
        return;
      }
      
      if (typeof obj === 'object') {
         if (obj.image_url) add('image', obj.image_url);
         if (obj.image_urls && Array.isArray(obj.image_urls)) {
             obj.image_urls.forEach((u: any) => typeof u === 'string' && add('image', u));
         }
         
         if (obj.video_url) add('video', obj.video_url);
         if (obj.video_urls && Array.isArray(obj.video_urls)) {
             obj.video_urls.forEach((u: any) => typeof u === 'string' && add('video', u));
         }

         const b64Keys = ['binary_data_base64', 'base64', 'image_base64'];
         b64Keys.forEach(key => {
             if (obj[key]) {
                 const val = obj[key];
                 const list = Array.isArray(val) ? val : [val];
                 list.forEach((item: any) => {
                     if (typeof item === 'string') {
                         const url = item.startsWith('data:') ? item : `data:image/png;base64,${item}`;
                         add('image', url);
                     }
                 });
             }
         });
         
         Object.values(obj).forEach(traverse);
      }
    };

    traverse(data);
    return media;
  };

  const mediaItems = extractMedia(response.body);

  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col w-full min-w-0 relative">
      
      {/* Polling Overlay */}
      {response.isPolling && (
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-100 z-50 overflow-hidden">
              <div className="h-full bg-indigo-500 animate-linear-progress"></div>
          </div>
      )}
      {response.isPolling && (
          <div className="absolute top-14 right-4 z-40 bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium animate-pulse">
              <Loader2 size={12} className="animate-spin"/>
              {t.response.polling}
          </div>
      )}

      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50 shadow-sm z-10 flex-shrink-0">
        <div className="flex gap-2 items-center overflow-hidden">
            <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide shrink-0 ${response.status >= 200 && response.status < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {response.status} {response.statusText}
            </div>
            <div className="px-2 py-1 text-xs text-gray-500 font-mono bg-gray-200 rounded shrink-0">
                {response.timestamp}ms
            </div>
        </div>
        <div className="flex bg-gray-200 rounded-md p-0.5 shrink-0">
            <button 
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${activeTab === 'preview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                {t.response.preview}
            </button>
            <button 
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${activeTab === 'raw' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                {t.response.raw}
            </button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <div className="flex-1 overflow-y-auto p-6 bg-white">
            <div className="space-y-6">
                {mediaItems.length > 0 ? (
                    <div className="grid grid-cols-1 gap-8">
                        {mediaItems.map((item, idx) => (
                            <div key={idx} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
                                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur text-white text-xs rounded flex items-center gap-1 z-10 pointer-events-none">
                                    {item.type === 'image' ? <ImageIcon size={12} /> : <Video size={12} />}
                                    {item.type === 'image' ? t.response.image : t.response.video} {idx + 1}
                                </div>
                                
                                {item.type === 'image' ? (
                                    <div className="flex items-center justify-center bg-[url('https://bg.site-shot.com/checkers.png')] bg-repeat min-h-[200px] bg-gray-100">
                                        <img 
                                            src={item.url} 
                                            alt={`Result ${idx}`} 
                                            className="max-w-full h-auto max-h-[600px] object-contain"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full bg-black flex items-center justify-center min-h-[300px]">
                                        <video 
                                            controls 
                                            playsInline
                                            preload="metadata"
                                            className="w-full h-auto max-h-[600px]"
                                        >
                                            <source src={item.url} type="video/mp4" />
                                            <source src={item.url} />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                )}
                                
                                <div className="p-3 bg-white border-t border-gray-200 text-xs text-gray-500 font-mono truncate flex justify-between items-center">
                                    <span className="truncate flex-1 mr-2 opacity-70" title={item.url}>{item.url.substring(0, 100)}...</span>
                                    <a href={item.url} download={`generated-file-${idx}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex-shrink-0">
                                        {t.common.download}
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                         <FileJson size={32} className="mb-2 opacity-50" />
                         <span>{t.response.noMedia}</span>
                         <button onClick={() => setActiveTab('raw')} className="text-indigo-600 hover:underline text-sm mt-1">{t.response.viewJson}</button>
                    </div>
                )}
            </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-slate-900">
            <div className="flex items-center justify-end gap-2 p-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
                <button
                    onClick={() => setWordWrap(!wordWrap)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        wordWrap 
                        ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                    title={wordWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
                >
                    <WrapText size={14} />
                    <span>{wordWrap ? t.request.wrap : t.request.noWrap}</span>
                </button>
                <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    title={t.common.copy}
                >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    <span>{copied ? t.common.copied : t.common.copy}</span>
                </button>
            </div>
            
            <div className="flex-1 relative w-full min-w-0 overflow-hidden">
                <pre className={`w-full h-full text-slate-50 p-4 text-xs font-mono leading-5 ${wordWrap ? 'whitespace-pre-wrap overflow-y-auto' : 'whitespace-pre overflow-auto'}`}>
                    {JSON.stringify(response.body, null, 2)}
                </pre>
            </div>
        </div>
      )}
      
      <style>{`
        @keyframes linear-progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 50%; margin-left: 25%; }
          100% { width: 100%; margin-left: 100%; }
        }
        .animate-linear-progress {
          animation: linear-progress 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default ResponsePanel;
