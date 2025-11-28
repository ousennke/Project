import React, { useState, useRef, useEffect } from 'react';
import { HistoryItem } from '../types';
import { Clock, Info, AlertCircle, Image as ImageIcon, Video, FileText, Trash2, Download, X, Copy, Check, Loader2, Archive, Maximize2, Play } from 'lucide-react';
import { useLanguage } from '../i18n';
import JSZip from 'jszip';
import ConfirmDialog from './ConfirmDialog';

interface HistoryPanelProps {
    historyItems: HistoryItem[];
    onClear: () => void;
    corsProxy?: string;
}

// Helper to format date as YYYYMMDD_HHMMSS
const formatTime = (ts: number) => {
    const d = new Date(ts);
    const Y = d.getFullYear();
    const M = (d.getMonth() + 1).toString().padStart(2, '0');
    const D = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${Y}${M}${D}_${h}${m}${s}`;
};

// Helper to sanitize filename
const sanitizeFileName = (name: string) => {
    return name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').replace(/_+/g, '_');
};

// Helper to determine extension
const getExtension = (mimeType: string | null, mediaType: 'image' | 'video', url?: string): string => {
    // 1. Try MIME type
    if (mimeType) {
        const lower = mimeType.toLowerCase();
        if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
        if (lower.includes('png')) return 'png';
        if (lower.includes('gif')) return 'gif';
        if (lower.includes('webp')) return 'webp';
        if (lower.includes('mp4')) return 'mp4';
        if (lower.includes('webm')) return 'webm';
        if (lower.includes('quicktime') || lower.includes('mov')) return 'mov';
        if (lower.includes('avi')) return 'avi';
    }

    // 2. Try URL extension
    if (url) {
        try {
            const path = new URL(url).pathname;
            const parts = path.split('.');
            if (parts.length > 1) {
                const ext = parts.pop()?.toLowerCase();
                if (ext && ext.length >= 3 && ext.length <= 4) {
                    // Normalization
                    if (ext === 'jpeg') return 'jpg';
                    return ext;
                }
            }
        } catch (e) {
            // Ignore URL parse errors
        }
    }

    // 3. Fallback based on type
    return mediaType === 'video' ? 'mp4' : 'png';
};

// Smart Video Thumbnail Component that fetches blob to bypass referrer checks
const VideoThumbnail: React.FC<{ url: string; corsProxy?: string }> = ({ url, corsProxy }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let objectUrl: string | null = null;

        const fetchVideo = async () => {
            // If it's already a blob URL, just use it directly
            if (url.startsWith('blob:')) {
                setVideoSrc(url);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const fetchUrl = corsProxy ? `${corsProxy}${url}` : url;
                // Use no-referrer to bypass hotlink protection (403 Forbidden)
                // Use credentials: 'omit' to prevent sending cookies/auth headers which might trigger stricter checks
                const res = await fetch(fetchUrl, {
                    referrerPolicy: 'no-referrer',
                    credentials: 'omit'
                });

                if (!res.ok) throw new Error('Fetch failed');

                const blob = await res.blob();
                objectUrl = URL.createObjectURL(blob);

                if (isMounted) {
                    setVideoSrc(objectUrl);
                    setLoading(false);
                }
            } catch (e) {
                // Fallback to direct URL if blob fetch fails (e.g. CORS)
                // This might still 403 if referrer is checked, but it's the best fallback
                if (isMounted) {
                    setVideoSrc(url);
                    setLoading(false);
                }
            }
        };

        fetchVideo();

        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [url, corsProxy]);

    return (
        <div
            className="w-full h-full relative bg-black group"
            onMouseEnter={() => videoRef.current?.play().catch(() => { })}
            onMouseLeave={() => {
                if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.currentTime = 0;
                }
            }}
        >
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 size={16} className="text-white/50 animate-spin" />
                </div>
            )}

            {videoSrc && (
                <video
                    ref={videoRef}
                    src={videoSrc}
                    className={`w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity ${loading ? 'invisible' : 'visible'}`}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                />
            )}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                {!loading && (
                    <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm text-white">
                        <Play size={10} fill="currentColor" />
                    </div>
                )}
            </div>
            <div className="absolute top-1 right-1 text-white opacity-70">
                <Video size={10} />
            </div>
        </div>
    );
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({ historyItems, onClear, corsProxy }) => {
    const { t } = useLanguage();
    const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
    const [previewMedia, setPreviewMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);
    const [isZipping, setIsZipping] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showConfirmClear, setShowConfirmClear] = useState(false);

    const handleCopyJson = () => {
        if (!selectedItem) return;
        navigator.clipboard.writeText(JSON.stringify(selectedItem.responseBody, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadZip = async () => {
        if (historyItems.length === 0) return;
        setIsZipping(true);

        try {
            const zip = new JSZip();
            // Single root folder
            const zipName = `volc_history_${new Date().toISOString().split('T')[0]}`;
            const root = zip.folder(zipName);

            if (!root) throw new Error("Failed to create zip folder");

            // Process items
            for (let i = 0; i < historyItems.length; i++) {
                const item = historyItems[i];
                const timeStr = formatTime(item.timestamp);
                const serviceName = sanitizeFileName(item.serviceName);

                // Base filename: Time + ServiceName
                const baseFilename = `${timeStr}_${serviceName}`;

                // 1. Save JSON Metadata
                const meta = {
                    info: {
                        id: item.id,
                        serviceName: item.serviceName,
                        action: item.action,
                        timestamp: new Date(item.timestamp).toISOString(),
                        status: item.status,
                        durationMs: item.duration,
                        error: item.errorMsg
                    },
                    request: item.requestPayload,
                    response: item.responseBody
                };

                const jsonName = `${baseFilename}.json`;
                root.file(jsonName, JSON.stringify(meta, null, 2));

                // 2. Download Media
                if (item.status === 'success' && item.mediaItems.length > 0) {
                    for (let j = 0; j < item.mediaItems.length; j++) {
                        const media = item.mediaItems[j];

                        // Suffix for multiple files: _1, _2
                        const suffix = item.mediaItems.length > 1 ? `_${j + 1}` : '';
                        const fileStem = `${baseFilename}${suffix}`;

                        try {
                            // Handle Base64
                            if (media.url.startsWith('data:')) {
                                const match = media.url.match(/^data:([^;]+);base64,(.+)$/);
                                if (match) {
                                    const mime = match[1];
                                    const b64Data = match[2];
                                    const ext = getExtension(mime, media.type);
                                    root.file(`${fileStem}.${ext}`, b64Data, { base64: true });
                                }
                                continue;
                            }

                            // Handle URL download
                            // Check for cached blob URL first
                            let fetchUrl = media.url;
                            if (media.blobUrl) {
                                fetchUrl = media.blobUrl;
                            } else if (corsProxy) {
                                fetchUrl = `${corsProxy}${media.url}`;
                            }

                            // Add no-referrer and omit credentials to avoid 403 on protected assets
                            const res = await fetch(fetchUrl, {
                                referrerPolicy: 'no-referrer',
                                credentials: 'omit'
                            });

                            if (res.ok) {
                                const blob = await res.blob();
                                const ext = getExtension(blob.type, media.type, media.url);
                                root.file(`${fileStem}.${ext}`, blob);
                            } else {
                                root.file(`${fileStem}_error.txt`, `Failed to download: ${media.url} (Status: ${res.status})`);
                            }
                        } catch (e: any) {
                            // Save error file so user knows something went wrong
                            root.file(`${fileStem}_error.txt`, `Download Exception: ${e.message}\nURL: ${media.url}`);
                        }
                    }
                }
            }

            // Generate Zip
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${zipName}.zip`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (e) {
            console.error("Zip Error", e);
            alert(t.history.downloadError);
        } finally {
            setIsZipping(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative select-none">
            {/* Header */}
            <div className="flex-none p-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-slate-800">{t.history.title}</h2>
                    <div className="flex items-center gap-1 text-[10px] text-orange-600 mt-0.5">
                        <AlertCircle size={10} /> {t.history.sessionWarning}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadZip}
                        disabled={isZipping || historyItems.length === 0}
                        className={`p-1.5 rounded transition-colors ${isZipping || historyItems.length === 0 ? 'text-gray-300' : 'text-indigo-600 hover:bg-indigo-100'}`}
                        title={t.history.downloadZip}
                    >
                        {isZipping ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                    </button>
                    <button
                        onClick={() => setShowConfirmClear(true)}
                        disabled={historyItems.length === 0}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30"
                        title={t.history.clear}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-white custom-scrollbar">
                {historyItems.length === 0 && (
                    <div className="text-center text-gray-300 text-xs py-10 italic">
                        {t.history.empty}
                    </div>
                )}

                {historyItems.map((item) => (
                    <div key={item.id} className="relative pl-4 border-l-2 border-gray-100 pb-2 last:pb-0">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white ${item.status === 'success' ? 'bg-indigo-500' : 'bg-red-500'}`}></div>

                        <div className="text-[10px] text-gray-400 mb-1 flex justify-between items-center font-mono">
                            <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                            <span className="opacity-60">{item.duration}ms</span>
                        </div>

                        <div className="group relative bg-gray-50 rounded-lg border border-gray-100 overflow-hidden hover:border-indigo-200 transition-colors">
                            {/* Service Name Badge */}
                            <div className="px-2 py-1 bg-white border-b border-gray-100 text-[10px] font-medium text-gray-600 truncate flex justify-between items-center">
                                <span className="truncate max-w-[120px]" title={item.serviceName}>{item.serviceName}</span>
                                <button
                                    onClick={() => setSelectedItem(item)}
                                    className="text-gray-300 hover:text-indigo-600 transition-colors"
                                    title="View JSON"
                                >
                                    <Info size={12} />
                                </button>
                            </div>

                            {/* Content Preview */}
                            <div className="p-2">
                                {item.status === 'error' ? (
                                    <div className="text-xs text-red-600 break-words line-clamp-4 bg-red-50 p-1 rounded">
                                        {item.errorMsg || 'Unknown Error'}
                                    </div>
                                ) : (
                                    <>
                                        {item.mediaItems.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-1">
                                                {item.mediaItems.slice(0, 4).map((media, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="aspect-square bg-gray-200 rounded overflow-hidden relative group/media cursor-zoom-in"
                                                        onClick={() => setPreviewMedia(media)}
                                                    >
                                                        {media.type === 'image' ? (
                                                            <img src={media.url} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                                        ) : (
                                                            <VideoThumbnail url={media.blobUrl || media.url} corsProxy={corsProxy} />
                                                        )}
                                                        {/* Source Key Hint */}
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white p-0.5 truncate opacity-0 group-hover/media:opacity-100 transition-opacity">
                                                            {media.sourceKey}
                                                        </div>
                                                        {idx === 3 && item.mediaItems.length > 4 && (
                                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                                                                +{item.mediaItems.length - 4}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-500 flex items-center gap-1 italic">
                                                <FileText size={12} />
                                                JSON Response
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Modal Overlay (JSON) */}
            {selectedItem && (
                <div className="absolute inset-0 z-[50] bg-white/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
                    <div className="flex-none px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                        <h3 className="text-xs font-bold uppercase text-gray-600">{t.history.infoTitle}</h3>
                        <div className="flex gap-2">
                            <button onClick={handleCopyJson} className="text-indigo-600 hover:text-indigo-800" title="Copy JSON">
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        <div className="mb-4">
                            <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${selectedItem.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {selectedItem.status} ({selectedItem.statusCode})
                            </span>
                            <span className="text-xs text-gray-400 ml-2 font-mono">{selectedItem.id}</span>
                        </div>

                        {selectedItem.errorMsg && (
                            <div className="mb-4 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-100 font-mono break-all">
                                {selectedItem.errorMsg}
                            </div>
                        )}

                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Response JSON</div>
                        <pre className="text-xs font-mono text-slate-700 bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(selectedItem.responseBody, null, 2)}
                        </pre>

                        <div className="text-[10px] font-bold text-gray-400 uppercase mt-4 mb-1">Request Payload</div>
                        <pre className="text-[10px] font-mono text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(selectedItem.requestPayload || {}, null, 2)}
                        </pre>
                    </div>
                </div>
            )}

            {/* Media Preview Modal (Fullscreen) */}
            {previewMedia && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200"
                    onClick={() => setPreviewMedia(null)}
                >
                    <button
                        onClick={() => setPreviewMedia(null)}
                        className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div
                        className="relative max-w-full max-h-full overflow-hidden flex flex-col items-center justify-center"
                        onClick={e => e.stopPropagation()}
                    >
                        {previewMedia.type === 'image' ? (
                            <img
                                src={previewMedia.url}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                                alt="Full Preview"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <video
                                src={previewMedia.url}
                                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl outline-none"
                                controls
                                autoPlay
                            />
                        )}

                        <div className="mt-4 flex gap-4">
                            <a
                                href={previewMedia.url}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-colors"
                            >
                                <Download size={16} />
                                {t.common.download}
                            </a>
                            <a
                                href={previewMedia.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-medium transition-colors"
                            >
                                <Maximize2 size={16} />
                                Open Tab
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showConfirmClear}
                title={t.history.clear}
                message={t.sidebar.confirmDelete}
                onConfirm={() => {
                    onClear();
                    setShowConfirmClear(false);
                }}
                onCancel={() => setShowConfirmClear(false)}
            />
        </div>
    );
};

export default HistoryPanel;
