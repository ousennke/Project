
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Link as LinkIcon, X, Loader2, FileCode, Check, AlertCircle, Plus, FileText } from 'lucide-react';
import { useLanguage } from '../i18n';

interface FileParamInputProps {
    value: string | string[];
    onChange: (value: string) => void;
    enableUrl?: boolean;
    enableBase64?: boolean;
    enableMulti?: boolean;
    corsProxy?: string;
    paramId: string;
}

// Internal state for a single file row
interface FileItem {
    id: string;
    file: File | null;
    preview: string | null;
    value: string; // The converted string (URL or Base64)
    processing: 'base64' | 'url' | null;
    error: string | null;
    fileType: 'image' | 'file';
}

const cleanValue = (val: string) => {
    if (!val) return '';
    let v = val.trim();
    // Remove surrounding quotes if present
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.substring(1, v.length - 1);
    }
    return v;
};

const FileParamInput: React.FC<FileParamInputProps> = ({
    value,
    onChange,
    enableUrl = true,
    enableBase64 = true,
    enableMulti = true,
    corsProxy,
    paramId
}) => {
    const { t } = useLanguage();

    // Track previous output to prevent infinite loops
    const prevOutputRef = useRef<string | undefined>(undefined);

    // Parse initial value into internal items state
    const [items, setItems] = useState<FileItem[]>(() => {
        let initialValues: string[] = [];

        if (Array.isArray(value)) {
            initialValues = value;
        } else if (typeof value === 'string') {
            // Allow empty string to create one empty slot
            if (value === '') {
                initialValues = [''];
            } else {
                try {
                    // Try parsing as JSON array
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed)) initialValues = parsed;
                    else initialValues = [value];
                } catch {
                    // Treat as single string
                    initialValues = [value];
                }
            }
        }

        if (initialValues.length === 0) {
            return [{ id: 'init_0', file: null, preview: null, value: '', processing: null, error: null, fileType: 'file' }];
        }

        return initialValues.map((rawVal, idx) => {
            const val = cleanValue(rawVal);
            let preview = null;
            let error = null;
            let fileType: 'image' | 'file' = 'file';

            // Attempt to detect if it's an image string
            const isImgUrl = val.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) != null;
            const isBase64Img = val.startsWith('data:image');

            if (isImgUrl || isBase64Img) {
                preview = val;
                fileType = 'image';
            }

            return {
                id: `init_${idx}`,
                file: null,
                preview: preview,
                value: val,
                processing: null,
                error: error,
                fileType: fileType
            };
        });
    });

    // Sync changes to parent
    useEffect(() => {
        // Map all values, INCLUDING empty ones, to preserve slot structure
        const allValues = items.map(i => i.value);

        let nextValue = '';
        if (allValues.length === 0) {
            nextValue = ''; // Should ideally not happen due to min 1 item logic, but safe fallback
        } else if (allValues.length === 1 && !enableMulti) {
            // If multi is disabled, just send string
            nextValue = allValues[0];
        } else {
            // If multi is enabled, ALWAYS send array, even if it has 1 item or empty items
            // This ensures the "slots" are persisted in the JSON
            nextValue = JSON.stringify(allValues);
        }

        // Prevent infinite loops: only call onChange if the value actually changed
        if (prevOutputRef.current !== nextValue) {
            prevOutputRef.current = nextValue;
            onChange(nextValue);
        }
    }, [items, onChange, enableMulti]);

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            { id: `new_${Date.now()}`, file: null, preview: null, value: '', processing: null, error: null, fileType: 'file' }
        ]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => {
            const newItems = [...prev];
            const item = newItems[index];
            if (item.preview && item.preview.startsWith('blob:')) {
                URL.revokeObjectURL(item.preview);
            }

            newItems.splice(index, 1);

            if (newItems.length === 0) {
                return [{ id: `reset_${Date.now()}`, file: null, preview: null, value: '', processing: null, error: null, fileType: 'file' }];
            }
            return newItems;
        });
    };

    const updateItem = (index: number, updates: Partial<FileItem>) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
    };

    const handleFileSelect = (index: number, file: File) => {
        const isImage = file.type.startsWith('image/');
        let preview = null;
        if (isImage) {
            preview = URL.createObjectURL(file);
        }

        updateItem(index, {
            file: file,
            preview: preview,
            value: '',
            error: null,
            fileType: isImage ? 'image' : 'file'
        });
    };

    const convertToBase64 = (index: number) => {
        const item = items[index];
        if (!item.file) return;

        updateItem(index, { processing: 'base64', error: null });

        const reader = new FileReader();
        reader.onload = (e) => {
            const res = e.target?.result as string;
            const rawBase64 = res.includes(',') ? res.split(',')[1] : res;
            updateItem(index, { value: rawBase64, processing: null });
        };
        reader.onerror = () => {
            updateItem(index, { error: 'Failed to read file', processing: null });
        };
        setTimeout(() => reader.readAsDataURL(item.file!), 300);
    };

    const uploadToTmpfiles = async (index: number) => {
        const item = items[index];
        if (!item.file) return;

        updateItem(index, { processing: 'url', error: null });

        try {
            const formData = new FormData();
            formData.append('file', item.file);

            // Use tmpfiles.org as it is generally CORS friendly
            // If user sets a proxy, use it, otherwise direct
            const targetUrl = 'https://tmpfiles.org/api/v1/upload';
            const fetchUrl = corsProxy ? `${corsProxy}${targetUrl}` : targetUrl;

            const res = await fetch(fetchUrl, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                throw new Error(`Upload failed: ${res.statusText}`);
            }

            const data = await res.json();

            if (data.status === 'success' && data.data && data.data.url) {
                // Convert to direct link
                // Original: https://tmpfiles.org/12345/image.png
                // Direct:   https://tmpfiles.org/dl/12345/image.png
                const originalUrl = data.data.url;
                const directUrl = originalUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

                updateItem(index, { value: directUrl, processing: null });
            } else {
                throw new Error('Invalid response from tmpfiles.org');
            }

        } catch (err: any) {
            console.error("Upload Error:", err);
            let msg = err.message || 'Upload failed';
            if (msg.includes('Failed to fetch')) {
                msg = 'Network/CORS Error. Tmpfiles.org usually supports CORS, but your browser blocked it. Ensure your VPN is active.';
            }
            updateItem(index, { error: msg, processing: null });
        }
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(index, e.dataTransfer.files[0]);
        }
    };

    const getValueType = (val: string): 'url' | 'base64' | 'unknown' => {
        if (!val) return 'unknown';
        if (val.startsWith('http') || val.startsWith('//')) return 'url';
        if (val.startsWith('data:')) return 'base64';
        if (val.length > 100 && !val.includes(' ')) return 'base64';
        return 'unknown';
    };

    const showUrlBtn = enableUrl !== false;
    const showBase64Btn = enableBase64 !== false;

    return (
        <div className="space-y-3">
            <div className="space-y-3">
                {items.map((item, index) => {
                    const valType = getValueType(item.value);

                    return (
                        <div key={item.id} className="relative flex gap-3 items-start p-2 bg-white border border-gray-100 rounded-lg shadow-sm group hover:border-indigo-200 transition-colors">

                            {(items.length > 1 || enableMulti) && (
                                <button
                                    onClick={() => handleRemoveItem(index)}
                                    className="absolute -top-2 -right-2 bg-white text-gray-400 border border-gray-200 rounded-full p-1 hover:text-red-500 hover:border-red-200 shadow-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove File"
                                >
                                    <X size={12} />
                                </button>
                            )}

                            {/* Preview / Input */}
                            <div
                                className={`relative w-20 h-20 flex-shrink-0 border-2 border-dashed rounded-lg overflow-hidden flex flex-col items-center justify-center transition-colors ${item.file ? 'border-indigo-200 bg-gray-50' : item.error ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 cursor-pointer'}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, index)}
                                onClick={() => !item.file && document.getElementById(`file-input-${paramId}-${item.id}`)?.click()}
                            >
                                {item.file ? (
                                    <div className="relative w-full h-full flex items-center justify-center group/preview">
                                        {item.fileType === 'image' && item.preview ? (
                                            <img
                                                src={item.preview}
                                                alt="Preview"
                                                className="w-full h-full object-cover bg-[url('https://bg.site-shot.com/checkers.png')]"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-gray-500 p-1 text-center">
                                                <FileText size={24} />
                                                <span className="text-[8px] leading-tight break-all mt-1 line-clamp-2">{item.file.name}</span>
                                            </div>
                                        )}

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateItem(index, { file: null, preview: null, value: '', error: null });
                                            }}
                                            className="absolute top-0 right-0 p-0.5 bg-black/40 text-white hover:bg-red-500 opacity-0 group-hover/preview:opacity-100 transition-opacity"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`flex flex-col items-center ${item.error ? 'text-red-400' : 'text-gray-400'}`}>
                                        {item.error ? <AlertCircle size={16} /> : <Upload size={16} />}
                                        <span className="text-[9px] mt-1 text-center">{item.error ? t.fileInput.error : t.fileInput.select}</span>
                                    </div>
                                )}
                                <input
                                    id={`file-input-${paramId}-${item.id}`}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) handleFileSelect(index, e.target.files[0]);
                                    }}
                                />
                            </div>

                            {/* Controls */}
                            <div className="flex-1 flex flex-col gap-2 min-w-0 h-full justify-between py-0.5">

                                {(item.file || (item.value && !item.error)) ? (
                                    <div className="flex gap-2">
                                        {showUrlBtn && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (item.file) uploadToTmpfiles(index);
                                                }}
                                                disabled={!!item.processing || !item.file}
                                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium border transition-all ${item.processing === 'url'
                                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                                                    : (valType === 'url')
                                                        ? 'bg-green-100 border-green-300 text-green-800 shadow-sm'
                                                        : item.file
                                                            ? 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                                                            : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed'
                                                    }`}
                                                title={item.file ? t.fileInput.convertUrl : t.fileInput.restoredUrl}
                                            >
                                                {item.processing === 'url' ? <Loader2 size={12} className="animate-spin" /> : <LinkIcon size={12} />}
                                                <span>{item.processing === 'url' ? t.fileInput.uploading : t.fileInput.toUrl}</span>
                                                {valType === 'url' && <Check size={12} className="ml-auto text-green-600" />}
                                            </button>
                                        )}
                                        {showBase64Btn && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (item.file) convertToBase64(index);
                                                }}
                                                disabled={!!item.processing || !item.file}
                                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium border transition-all ${item.processing === 'base64'
                                                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                                                    : (valType === 'base64')
                                                        ? 'bg-green-100 border-green-300 text-green-800 shadow-sm'
                                                        : item.file
                                                            ? 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-600'
                                                            : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed'
                                                    }`}
                                                title={item.file ? t.fileInput.convertBase64 : t.fileInput.restoredBase64}
                                            >
                                                {item.processing === 'base64' ? <Loader2 size={12} className="animate-spin" /> : <FileCode size={12} />}
                                                <span>{t.fileInput.toBase64}</span>
                                                {valType === 'base64' && <Check size={12} className="ml-auto text-green-600" />}
                                            </button>
                                        )}
                                    </div>
                                ) : item.error ? (
                                    <div className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded border border-red-200 flex items-center gap-1 break-all">
                                        <AlertCircle size={12} className="shrink-0" /> {item.error}
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-gray-400 italic bg-gray-50 p-1.5 rounded border border-dashed border-gray-200">
                                        Select a file to convert...
                                    </div>
                                )}

                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        value={item.value ? (item.value.length > 40 ? item.value.substring(0, 40) + '...' : item.value) : ''}
                                        placeholder="Converted value..."
                                        className={`w-full text-[10px] font-mono px-2 py-1.5 rounded border outline-none ${item.value ? 'bg-gray-50 text-gray-700 border-gray-200' : 'bg-transparent border-transparent text-gray-300'}`}
                                    />
                                    {item.value && !item.error && (
                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-green-600">
                                            <Check size={12} />
                                        </div>
                                    )}
                                    {item.error && (
                                        <div className="absolute inset-0 bg-red-50 text-red-600 text-[10px] flex items-center px-2 gap-1 rounded border border-red-100">
                                            <AlertCircle size={12} /> <span className="truncate">Check error above</span>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>

            {enableMulti && (
                <button
                    onClick={handleAddItem}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={14} /> {t.fileInput.addFile}
                </button>
            )}
        </div>
    );
};

export default FileParamInput;
