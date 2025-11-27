
import React, { useState, useEffect, useRef } from 'react';
import { ResponseData } from '../types';
import { Image as ImageIcon, FileJson, AlertCircle, Copy, Check, Video, WrapText, Loader2, Download, PlayCircle, Key, Bug, Clock, Lock } from 'lucide-react';
import { useLanguage } from '../i18n';

interface ResponsePanelProps {
  response: ResponseData | null;
  error: string | null;
  loading?: boolean;
  corsProxy?: string;
}

// Sub-component to handle smart video loading (Direct vs Proxy/Blob)
const VideoRenderer: React.FC<{ 
    url: string; 
    corsProxy?: string; 
    onSuccess?: () => void;
    hideOnError?: boolean;
}> = ({ url, corsProxy, onSuccess, hideOnError }) => {
    const [src, setSrc] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const isFallbackRef = useRef(false);

    useEffect(() => {
        let isMounted = true;
        let activeObjectUrl: string | null = null;
        isFallbackRef.current = false;

        const loadVideo = async () => {
            setStatus('loading');
            setErrorMsg(null);
            setSrc(null); // Ensure source is cleared before loading new one
            
            try {
                let fetchUrl = url;
                if (corsProxy) {
                    fetchUrl = `${corsProxy}${url}`;
                }

                // Use no-referrer to avoid some hotlinking protections
                const res = await fetch(fetchUrl, { referrerPolicy: 'no-referrer' });
                if (!res.ok) throw new Error(`Failed to load video: ${res.statusText}`);
                
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);
                activeObjectUrl = objectUrl;
                
                if (isMounted) {
                    setSrc(objectUrl);
                    // Status remains 'loading' until onLoadedData fires
                } else {
                    URL.revokeObjectURL(objectUrl);
                }
            } catch (err: any) {
                if (isMounted) {
                    console.warn("Video Auto-Fetch failed, trying direct URL:", err);
                    isFallbackRef.current = true;
                    setSrc(url); 
                }
            }
        };

        loadVideo();

        return () => {
            isMounted = false;
            if (activeObjectUrl) {
                URL.revokeObjectURL(activeObjectUrl);
            }
        };
    }, [url, corsProxy]);

    const handleError = () => {
        // If we were trying the blob (proxy) and it failed (e.g. codec issue), try fallback
        if (!isFallbackRef.current && src && src !== url) {
             console.warn("Playback failed on proxy/blob, trying direct URL...");
             isFallbackRef.current = true;
             setSrc(url);
             // Maintain loading state during switch
             setStatus('loading');
             setErrorMsg(null);
             return;
        }

        // Real error on fallback
        if (status !== 'error') {
            setStatus('error');
            setErrorMsg("File not found or format unsupported.");
        }
    };

    // If hideOnError is true (meaning another video succeeded), and we have an error, render nothing.
    if (hideOnError && status === 'error') {
        return null;
    }

    return (
        <div className="w-full bg-black flex flex-col items-center justify-center min-h-[300px] relative rounded-lg overflow-hidden group">
            {status === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm z-20 text-white">
                    <Loader2 size={32} className="animate-spin mb-2" />
                    <span className="text-xs font-medium">Loading Video...</span>
                </div>
            )}

            {src && (
                <video 
                    controls 
                    playsInline
                    preload="metadata"
                    className="w-full h-auto max-h-[600px] outline-none"
                    key={src} // Re-render on src change
                    crossOrigin={undefined}
                    onLoadedData={() => {
                        // If video successfully loads (e.g. via fallback), clear any previous errors
                        setStatus('success');
                        setErrorMsg(null);
                        if (onSuccess) onSuccess();
                    }}
                    onError={handleError}
                >
                    <source src={src} />
                    Your browser does not support the video tag.
                </video>
            )}

            {/* Overlay Controls */}
            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <a 
                    href={url} 
                    download 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 border border-white/20 shadow-lg transition-all"
                >
                    <Download size={12} /> Download
                </a>
            </div>

            {/* Error Message */}
            {status === 'error' && (
                 <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-white text-xs p-3 rounded border border-red-500/50 shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 z-20 pointer-events-none">
                     <div className="font-bold mb-1 flex items-center gap-2">
                         <AlertCircle size={14} /> Playback Error
                     </div>
                     {errorMsg}
                     <div className="mt-1 text-[10px] opacity-80">
                         {isFallbackRef.current ? "Direct URL fallback failed." : "Attempting fallback to direct URL..."}
                     </div>
                 </div>
            )}
        </div>
    );
};

// Component to manage list of media and coordinate error hiding
const MediaList: React.FC<{ 
    mediaItems: Array<{ type: 'image' | 'video', url: string, sourceKey: string }>;
    corsProxy?: string;
    t: any;
}> = ({ mediaItems, corsProxy, t }) => {
    // Track how many videos have successfully loaded
    const [successCount, setSuccessCount] = useState(0);

    const handleVideoSuccess = () => {
        setSuccessCount(prev => prev + 1);
    };

    return (
        <div className="grid grid-cols-1 gap-8">
            {mediaItems.map((item, idx) => (
                <div key={idx} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10 pointer-events-none">
                        <div className="px-2 py-1 bg-black/60 backdrop-blur text-white text-xs rounded flex items-center gap-1">
                            {item.type === 'image' ? <ImageIcon size={12} /> : <Video size={12} />}
                            {item.type === 'image' ? t.response.image : t.response.video} {idx + 1}
                        </div>
                        <div className="px-2 py-1 bg-indigo-600/90 backdrop-blur text-white text-[10px] rounded font-mono shadow-sm flex items-center gap-1 border border-indigo-400/30">
                            <Key size={10} /> {item.sourceKey}
                        </div>
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
                        <VideoRenderer 
                            url={item.url} 
                            corsProxy={corsProxy} 
                            onSuccess={handleVideoSuccess}
                            // If we have at least one success, hide this one if it errors
                            hideOnError={successCount > 0}
                        />
                    )}
                    
                    <div className="p-3 bg-white border-t border-gray-200 text-xs text-gray-500 font-mono truncate flex justify-between items-center">
                        <span className="truncate flex-1 mr-2 opacity-70" title={item.url}>{item.url.substring(0, 100)}...</span>
                        <a href={item.url} download={`generated-file-${idx}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex-shrink-0 flex items-center gap-1">
                            <Download size={12} />
                            {t.common.download}
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ResponsePanel: React.FC<ResponsePanelProps> = ({ response, error, loading, corsProxy }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'preview' | 'raw' | 'debug'>('preview');
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
          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-200 font-mono break-all whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
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

  const extractMedia = (data: any): Array<{ type: 'image' | 'video', url: string, sourceKey: string }> => {
    const media: Array<{ type: 'image' | 'video', url: string, sourceKey: string }> = [];
    const seen = new Set<string>();

    const add = (type: 'image' | 'video', url: string, sourceKey: string) => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        // If sourceKey is missing or generic, try to be cleaner (optional)
        const displayKey = sourceKey || 'unknown';
        media.push({ type, url, sourceKey: displayKey });
    };
    
    // Check if a string looks like a URL
    const isUrl = (s: string) => s.startsWith('http') || s.startsWith('//') || s.startsWith('data:');

    const traverse = (obj: any, currentKey: string) => {
      if (!obj) return;
      
      if (typeof obj === 'string') {
         // Recursive parse: If string looks like JSON object/array, try to parse it
         // This handles cases like "resp_data": "{\"video_url\": ...}"
         if (obj.trim().startsWith('{') || obj.trim().startsWith('[')) {
             try {
                 const parsed = JSON.parse(obj);
                 // We pass currentKey because if the string was a value of 'resp_data', 
                 // the parsed object effectively belongs to 'resp_data' context unless we find deeper keys.
                 traverse(parsed, currentKey); 
                 // IMPORTANT: Return here so we don't process the JSON string itself as a URL
                 return;
             } catch (e) {
                 // Not valid JSON, ignore and proceed to regex checks
             }
         }

         // Check for extension
         if (obj.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i) || obj.startsWith('data:image')) {
             add('image', obj, currentKey);
         } else if (obj.match(/^https?:\/\/.*\.(mp4|mov|webm|avi)(\?.*)?$/i)) {
             add('video', obj, currentKey);
         } 
         // Check for mime_type in query params - Strict check: must look like a URL
         else if ((obj.includes('mime_type=video') || obj.includes('mime_type=image')) && isUrl(obj)) {
             if (obj.includes('mime_type=video')) add('video', obj, currentKey);
             else add('image', obj, currentKey);
         }
         return;
      }

      if (Array.isArray(obj)) {
        // For arrays, we usually want to know the parent key (e.g. "image_urls")
        obj.forEach(item => traverse(item, currentKey));
        return;
      }
      
      if (typeof obj === 'object') {
         // Specific known keys - pass specific key name
         if (obj.image_url) add('image', obj.image_url, 'image_url');
         if (obj.image_urls && Array.isArray(obj.image_urls)) {
             obj.image_urls.forEach((u: any) => typeof u === 'string' && add('image', u, 'image_urls'));
         }
         
         if (obj.video_url) add('video', obj.video_url, 'video_url');
         if (obj.preview_url) add('video', obj.preview_url, 'preview_url');
         
         if (obj.video_urls && Array.isArray(obj.video_urls)) {
             obj.video_urls.forEach((u: any) => typeof u === 'string' && add('video', u, 'video_urls'));
         }

         // Heuristic for loose keys containing "video" or "preview" combined with URL-like values
         Object.keys(obj).forEach(key => {
             const lowerKey = key.toLowerCase();
             const val = obj[key];
             
             // Check if key contains 'video' or 'preview' AND ends in 'url' or 'uri'
             if ((lowerKey.includes('video') || lowerKey.includes('preview')) && (lowerKey.includes('url') || lowerKey.includes('uri'))) {
                 if (typeof val === 'string' && isUrl(val)) {
                     add('video', val, key);
                 } else if (Array.isArray(val)) {
                     val.forEach((v: any) => {
                         if (typeof v === 'string' && isUrl(v)) add('video', v, key);
                     });
                 }
             }
         });

         const b64Keys = ['binary_data_base64', 'base64', 'image_base64'];
         b64Keys.forEach(key => {
             if (obj[key]) {
                 const val = obj[key];
                 const list = Array.isArray(val) ? val : [val];
                 list.forEach((item: any) => {
                     if (typeof item === 'string') {
                         const url = item.startsWith('data:') ? item : `data:image/png;base64,${item}`;
                         add('image', url, key);
                     }
                 });
             }
         });
         
         // Generic recursion - Pass the KEY as the new context
         Object.entries(obj).forEach(([key, val]) => {
             traverse(val, key);
         });
      }
    };

    traverse(data, 'root');
    return media; // Use the local array
  };

  const mediaItems = extractMedia(response.body);
  const showDebug = response.isPolling || (response.pollHistory && response.pollHistory.length > 0);

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
            {response.pollHistory && (
                <div className="px-2 py-1 rounded text-xs font-bold bg-cyan-100 text-cyan-700 uppercase tracking-wide shrink-0">
                    {response.pollHistory.length} Polls
                </div>
            )}
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
            {showDebug && (
                 <button 
                    onClick={() => setActiveTab('debug')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${activeTab === 'debug' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Bug size={12} /> Debug
                </button>
            )}
        </div>
      </div>

      {activeTab === 'preview' ? (
        <div className="flex-1 overflow-y-auto p-6 bg-white">
            <div className="space-y-6">
                {mediaItems.length > 0 ? (
                    <MediaList 
                        mediaItems={mediaItems} 
                        corsProxy={corsProxy} 
                        t={t}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                         <FileJson size={32} className="mb-2 opacity-50" />
                         <span>{t.response.noMedia}</span>
                         <button onClick={() => setActiveTab('raw')} className="text-indigo-600 hover:underline text-sm mt-1">{t.response.viewJson}</button>
                    </div>
                )}
            </div>
        </div>
      ) : activeTab === 'raw' ? (
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
      ) : (
          /* Debug Tab */
          <div className="flex-1 overflow-y-auto p-0 bg-gray-50">
             <div className="p-4 space-y-4">
                 <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                     <Clock size={16} /> Polling History
                 </h3>
                 
                 {!response.pollHistory || response.pollHistory.length === 0 ? (
                     <div className="text-sm text-gray-400 italic p-4 text-center">No polling history available yet.</div>
                 ) : (
                     <div className="space-y-3">
                         {response.pollHistory.map((item, i) => (
                             <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                 <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                                     <div className="flex items-center gap-2">
                                         <span className="font-bold text-gray-600">#{i + 1}</span>
                                         <span className="text-gray-400 font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                     </div>
                                     <div className={`font-bold ${item.status === 200 ? 'text-green-600' : 'text-red-600'}`}>
                                         {item.status} {item.statusText}
                                     </div>
                                 </div>
                                 <div className="p-3 text-xs font-mono break-all text-gray-600 bg-white">
                                     <div className="font-semibold text-gray-400 mb-1 flex items-center gap-2">
                                         Request URL:
                                         <div className="group relative">
                                            <Lock size={10} className="text-amber-500 cursor-help" />
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-gray-800 text-white text-[10px] p-2 rounded hidden group-hover:block z-50">
                                                Link requires Authorization headers. Cannot be opened directly in browser.
                                            </div>
                                         </div>
                                     </div>
                                     <div className="p-2 bg-gray-100 rounded text-gray-800 mb-2 border border-gray-200 select-all">
                                         {item.url}
                                     </div>
                                     {item.body && (
                                         <>
                                            <div className="font-semibold text-gray-400 mb-1">Response Body:</div>
                                            <pre className="p-2 bg-slate-800 text-slate-300 rounded overflow-x-auto border border-slate-700">
                                                {JSON.stringify(item.body, null, 2)}
                                            </pre>
                                         </>
                                     )}
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
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
