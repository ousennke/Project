import React, { useState, useEffect, useRef } from 'react';
import { Upload, Link as LinkIcon, X, Loader2, FileCode, Check, AlertCircle, Plus } from 'lucide-react';
import { useLanguage } from '../i18n';

interface ImageParamInputProps {
  value: string | string[];
  onChange: (value: string) => void;
  imgbbApiKey?: string;
  enableUrl?: boolean;
  enableBase64?: boolean;
  enableMulti?: boolean;
}

const DEFAULT_IMGBB_KEY = 'c529a7eb097753d11cb28e5d64a212af';

// Internal state for a single image row
interface ImageItem {
  id: string;
  file: File | null;
  preview: string | null;
  value: string; // The converted string (URL or Base64)
  processing: 'base64' | 'url' | null;
  error: string | null;
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

const ImageParamInput: React.FC<ImageParamInputProps> = ({ 
    value, 
    onChange, 
    imgbbApiKey,
    enableUrl = true,
    enableBase64 = true,
    enableMulti = true
}) => {
  const { t } = useLanguage();
  
  // Track previous output to prevent infinite loops
  const prevOutputRef = useRef<string | undefined>(undefined);

  // Parse initial value into internal items state
  const [items, setItems] = useState<ImageItem[]>(() => {
      let initialValues: string[] = [];
      
      if (Array.isArray(value)) {
          initialValues = value;
      } else if (typeof value === 'string' && value.trim() !== '') {
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

      if (initialValues.length === 0) {
          return [{ id: 'init_0', file: null, preview: null, value: '', processing: null, error: null }];
      }

      return initialValues.map((rawVal, idx) => {
          const val = cleanValue(rawVal);
          let preview = null;
          let error = null;

          if (val.startsWith('http') || val.startsWith('//') || val.startsWith('data:')) {
              preview = val;
          } else if (val.length > 50) {
              // Attempt to restore preview for raw base64
              preview = `data:image/png;base64,${val}`;
          } else if (val.length > 0) {
              // Value exists but cannot be previewed/restored -> Lost Source Error
              error = "Local image not found";
          }

          return {
            id: `init_${idx}`,
            file: null,
            preview: preview,
            value: val,
            processing: null,
            error: error
          };
      });
  });

  // Sync changes to parent
  useEffect(() => {
      // Filter out empty values AND items with errors
      const validValues = items
          .filter(i => i.value !== '' && !i.error) 
          .map(i => i.value);
      
      let nextValue = '';
      if (validValues.length === 0) {
          nextValue = '';
      } else if (validValues.length === 1) {
          nextValue = validValues[0];
      } else {
          nextValue = JSON.stringify(validValues);
      }

      // Prevent infinite loops: only call onChange if the value actually changed
      if (prevOutputRef.current !== nextValue) {
          prevOutputRef.current = nextValue;
          onChange(nextValue);
      }
  }, [items, onChange]);

  const handleAddItem = () => {
      setItems(prev => [
          ...prev, 
          { id: `new_${Date.now()}`, file: null, preview: null, value: '', processing: null, error: null }
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
              return [{ id: `reset_${Date.now()}`, file: null, preview: null, value: '', processing: null, error: null }];
          }
          return newItems;
      });
  };

  const updateItem = (index: number, updates: Partial<ImageItem>) => {
      setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const handleFileSelect = (index: number, file: File) => {
      const objectUrl = URL.createObjectURL(file);
      updateItem(index, {
          file: file,
          preview: objectUrl,
          value: '',
          error: null
      });
  };

  const convertToBase64 = (index: number) => {
    const item = items[index];
    if (!item.file) return;

    updateItem(index, { processing: 'base64', error: null });

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result as string;
      const rawBase64 = res.split(',')[1];
      updateItem(index, { value: rawBase64, processing: null });
    };
    reader.onerror = () => {
      updateItem(index, { error: 'Failed to read file', processing: null });
    };
    setTimeout(() => reader.readAsDataURL(item.file!), 300);
  };

  const uploadToImgBB = async (index: number) => {
    const item = items[index];
    if (!item.file) return;

    updateItem(index, { processing: 'url', error: null });

    try {
      const formData = new FormData();
      formData.append('image', item.file);
      const key = imgbbApiKey || DEFAULT_IMGBB_KEY;
      
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
          method: 'POST',
          body: formData
      });
      
      const data = await res.json();
      
      if (data.success) {
          updateItem(index, { value: data.data.url, processing: null });
      } else {
          updateItem(index, { error: data.error?.message || 'ImgBB Upload failed', processing: null });
      }
    } catch (err: any) {
        updateItem(index, { error: err.message || 'Network error', processing: null });
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
                        title="Remove Image"
                      >
                          <X size={12} />
                      </button>
                  )}

                  {/* Preview / Input */}
                  <div 
                    className={`relative w-20 h-20 flex-shrink-0 border-2 border-dashed rounded-lg overflow-hidden flex flex-col items-center justify-center transition-colors ${item.file ? 'border-indigo-200 bg-gray-50' : item.error ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 cursor-pointer'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => !item.file && document.getElementById(`file-input-${item.id}`)?.click()}
                  >
                       {item.preview ? (
                          <div className="relative w-full h-full">
                              <img 
                                src={item.preview.startsWith('data') && !item.preview.startsWith('data:image') ? `data:image/png;base64,${item.preview}` : item.preview} 
                                alt="Preview" 
                                className="w-full h-full object-cover bg-[url('https://bg.site-shot.com/checkers.png')]" 
                                onError={(e) => (e.target as HTMLImageElement).style.opacity = '0.5'}
                              />
                              <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateItem(index, { file: null, preview: null, value: '', error: null });
                                }}
                                className="absolute top-0 right-0 p-0.5 bg-black/40 text-white hover:bg-red-500"
                              >
                                  <X size={10} />
                              </button>
                          </div>
                       ) : (
                           <div className={`flex flex-col items-center ${item.error ? 'text-red-400' : 'text-gray-400'}`}>
                               {item.error ? <AlertCircle size={16} /> : <Upload size={16} />}
                               <span className="text-[9px] mt-1">{item.error ? t.imageInput.error : t.imageInput.select}</span>
                           </div>
                       )}
                       <input 
                            id={`file-input-${item.id}`}
                            type="file" 
                            className="hidden" 
                            accept="image/*"
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
                                            if (item.file) uploadToImgBB(index);
                                        }}
                                        disabled={!!item.processing || !item.file}
                                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium border transition-all ${
                                            item.processing === 'url' 
                                            ? 'bg-indigo-100 border-indigo-300 text-indigo-800' 
                                            : (valType === 'url')
                                                ? 'bg-green-100 border-green-300 text-green-800 shadow-sm'
                                                : item.file
                                                    ? 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                                                    : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed'
                                        }`}
                                        title={item.file ? t.imageInput.convertUrl : t.imageInput.restoredUrl}
                                    >
                                        {item.processing === 'url' ? <Loader2 size={12} className="animate-spin"/> : <LinkIcon size={12} />}
                                        <span>{t.imageInput.toUrl}</span>
                                        {valType === 'url' && <Check size={12} className="ml-auto text-green-600"/>}
                                    </button>
                                )}
                                {showBase64Btn && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.file) convertToBase64(index);
                                        }}
                                        disabled={!!item.processing || !item.file}
                                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium border transition-all ${
                                            item.processing === 'base64' 
                                            ? 'bg-amber-100 border-amber-300 text-amber-800' 
                                            : (valType === 'base64')
                                                ? 'bg-green-100 border-green-300 text-green-800 shadow-sm'
                                                : item.file
                                                    ? 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-600'
                                                    : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed'
                                        }`}
                                        title={item.file ? t.imageInput.convertBase64 : t.imageInput.restoredBase64}
                                    >
                                        {item.processing === 'base64' ? <Loader2 size={12} className="animate-spin"/> : <FileCode size={12} />}
                                        <span>{t.imageInput.toBase64}</span>
                                        {valType === 'base64' && <Check size={12} className="ml-auto text-green-600"/>}
                                    </button>
                                )}
                          </div>
                      ) : item.error ? (
                          <div className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded border border-red-200 flex items-center gap-1">
                              <AlertCircle size={12} /> {item.error}
                          </div>
                      ) : (
                          <div className="text-[10px] text-gray-400 italic bg-gray-50 p-1.5 rounded border border-dashed border-gray-200">
                              Select an image to convert...
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
                                  <AlertCircle size={12} /> {item.error}
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
            <Plus size={14} /> {t.imageInput.addImage}
        </button>
      )}
    </div>
  );
};

export default ImageParamInput;