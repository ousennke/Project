import React, { useState, useEffect, useCallback } from 'react';
import { ApiService, ApiParam } from '../types';
import { Plus, Trash2, Play, ExternalLink, Code, List, WrapText, Settings, HelpCircle, Square, GripVertical, Clock, Zap, FileText } from 'lucide-react';
import ParamConfigModal from './ParamConfigModal';
import FileParamInput from './FileParamInput';
import StringArrayInput from './StringArrayInput';
import { useLanguage } from '../i18n';

interface RequestPanelProps {
  service: ApiService;
  onUpdateService: (service: ApiService) => void;
  onSend: () => void;
  onStop?: () => void;
  loading: boolean;
  corsProxy?: string;
}

const RequestPanel: React.FC<RequestPanelProps> = ({
  service,
  onUpdateService,
  onSend,
  onStop,
  loading,
  corsProxy
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'form' | 'json'>('form');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState(true);
  const [editingParam, setEditingParam] = useState<ApiParam | null>(null);

  // Drag and Drop State
  const [draggedParamId, setDraggedParamId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Compute JSON from params for code view
  const getJsonFromParams = useCallback(() => {
    const obj: Record<string, any> = {};
    service.params.forEach(p => {
      // Skip disabled parameters
      if (p.enabled === false) return;

      // Try parsing JSON strings if type is JSON
      if (p.type === 'json' && typeof p.value === 'string') {
        try {
           obj[p.key] = JSON.parse(p.value);
        } catch {
           obj[p.key] = p.value; // Fallback
        }
      } else {
        let val = p.value;
        
        // Parse File arrays for preview
        if (p.type === 'file' && typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) val = parsed;
            } catch {}
        }
        
        // Handle Multi String
        if (p.type === 'string' && p.enableMultiString) {
             if (typeof val === 'string') {
                 try {
                     const parsed = JSON.parse(val);
                     if (Array.isArray(parsed)) val = parsed;
                     else val = [val]; // Wrap single string if parsing fails to array but succeeds to something else (unlikely) or just wrap raw string
                 } catch {
                     val = [val]; // Wrap raw string
                 }
             } else if (!Array.isArray(val)) {
                 val = [val]; // Wrap numbers/bools if they somehow got here
             }
        }

        // Auto-wrap image_urls and binary_data_base64 if they are SINGLE strings (Legacy compat)
        if ((p.key === 'image_urls' || p.key === 'binary_data_base64') && typeof val === 'string') {
             val = [val];
        }
        obj[p.key] = val;
      }
    });
    return JSON.stringify(obj, null, 2);
  }, [service.params]);

  const [jsonValue, setJsonValue] = useState(getJsonFromParams());

  useEffect(() => {
    if (viewMode === 'form') {
      setJsonValue(getJsonFromParams());
      setJsonError(null);
    }
  }, [getJsonFromParams, viewMode]);

  const handleParamChange = (id: string, value: any) => {
    const newParams = service.params.map((p) =>
      p.id === id ? { ...p, value } : p
    );
    onUpdateService({ ...service, params: newParams });
  };

  const handleUpdateParamConfig = (updatedParam: ApiParam) => {
    const exists = service.params.some(p => p.id === updatedParam.id);
    
    let newParams;
    if (exists) {
        // Update existing
        newParams = service.params.map(p => p.id === updatedParam.id ? updatedParam : p);
    } else {
        // Add new
        newParams = [...service.params, updatedParam];
    }
    
    onUpdateService({ ...service, params: newParams });
  };

  const handleAddParam = () => {
    const newParam: ApiParam = {
      id: Date.now().toString(),
      key: '',
      value: '',
      type: 'string',
      enabled: true,
    };
    // Open modal immediately for the new param
    setEditingParam(newParam);
  };

  const handleDeleteParam = (id: string) => {
    onUpdateService({
      ...service,
      params: service.params.filter((p) => p.id !== id),
    });
  };

  const handleJsonChange = (val: string) => {
    setJsonValue(val);
    try {
      const parsed = JSON.parse(val);
      setJsonError(null);
      const newParams: ApiParam[] = Object.entries(parsed).map(([key, value], index) => {
        const existing = service.params.find(p => p.key === key);
        
        // Infer type if creating new from JSON
        let type: ApiParam['type'] = 'string';
        let enableMultiString = false;
        
        if (typeof value === 'number') {
             type = Number.isInteger(value) ? 'integer' : 'float';
        }
        else if (typeof value === 'boolean') type = 'boolean';
        else if (typeof value === 'object') {
            if (Array.isArray(value) && value.every(i => typeof i === 'string')) {
                type = 'string';
                enableMultiString = true;
            } else {
                type = 'json';
            }
        }

        return {
          id: existing ? existing.id : `gen_${index}_${Date.now()}`,
          key,
          value: (typeof value === 'object' && !enableMultiString) ? JSON.stringify(value) : (enableMultiString ? JSON.stringify(value) : (value as string | number | boolean)),
          type: existing ? existing.type : type,
          description: existing ? existing.description : undefined,
          enabled: true,
          enableMultiString: existing ? existing.enableMultiString : enableMultiString
        };
      });
      
      onUpdateService({ ...service, params: newParams });
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  // --- Drag and Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
    // Allow interacting with inputs without dragging
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'SVG', 'PATH'].includes(target.tagName) || target.isContentEditable || target.closest('button')) {
        e.preventDefault();
        return;
    }

    setDraggedParamId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedParamId === id) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    
    setDropTargetId(id);
    setDropPosition(position);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedParamId || draggedParamId === targetId) {
        setDraggedParamId(null);
        setDropTargetId(null);
        setDropPosition(null);
        return;
    }

    const fromIndex = service.params.findIndex(p => p.id === draggedParamId);
    if (fromIndex === -1) return;

    const newParams = [...service.params];
    const [movedItem] = newParams.splice(fromIndex, 1);
    
    const targetIndex = newParams.findIndex(p => p.id === targetId);
    if (targetIndex !== -1) {
        const insertIndex = dropPosition === 'after' ? targetIndex + 1 : targetIndex;
        newParams.splice(insertIndex, 0, movedItem);
    } else {
        newParams.push(movedItem);
    }

    onUpdateService({ ...service, params: newParams });
    
    setDraggedParamId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  const isAsync = service.asyncConfig?.enabled;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex-none p-6 pb-4 border-b border-gray-200 bg-white z-10 shadow-sm">
        
        {/* Title Row */}
        <div className="flex items-center gap-3 mb-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate shrink" title={service.name}>{service.name}</h1>
          
          {isAsync ? (
              <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase tracking-wide">
                  <Clock size={10} strokeWidth={2.5} /> {t.common.async}
              </span>
          ) : (
              <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase tracking-wide">
                  <Zap size={10} strokeWidth={2.5} className="fill-blue-400/30" /> {t.common.sync}
              </span>
          )}
        </div>

        {/* Description Row */}
        <div className="text-sm text-gray-500 mb-4 truncate">
            {service.description || t.request.description}
        </div>

        {/* Parameter Controls */}
        <div className="flex items-center justify-between mt-4 gap-4">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('form')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                viewMode === 'form' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={14} /> <span>{t.request.params}</span>
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                viewMode === 'json' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
               <Code size={14}/> <span>{t.request.json}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {service.docUrl && (
                 <button 
                 onClick={() => {
                     if (service.docUrl) window.open(service.docUrl, '_blank');
                 }}
                 className="flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-all bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-indigo-600 hover:border-indigo-300 active:scale-95"
                 title={t.request.apiDocs}
               >
                 <FileText size={16} />
                 <span>{t.request.apiDocs}</span>
               </button>
            )}

            <div className="flex items-center gap-2 bg-gray-100 p-0.5 rounded-lg">
                <button
                    onClick={onSend}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 rounded-md font-medium shadow-sm transition-all text-white shrink-0 bg-indigo-600 hover:bg-indigo-700 hover:shadow active:transform active:scale-95 disabled:bg-indigo-400"
                >
                    {loading ? (
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                         <Play size={16} fill="currentColor" />
                    )}
                    {t.request.runRequest}
                </button>
                {loading && (
                    <button
                        onClick={onStop}
                        className="p-2 rounded-md text-gray-500 hover:text-red-500 hover:bg-white transition-colors"
                        title={t.request.stop}
                    >
                        <Square size={16} fill="currentColor" />
                    </button>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={`flex-1 min-h-0 flex flex-col min-w-0 ${viewMode === 'form' ? 'bg-gray-50' : 'bg-white'}`}>
        {viewMode === 'form' ? (
          <div className="overflow-y-auto p-6 space-y-3 h-full custom-scrollbar">
            {service.params.map((param) => {
              const isDragTarget = dropTargetId === param.id;
              const showLineTop = isDragTarget && dropPosition === 'before';
              const showLineBottom = isDragTarget && dropPosition === 'after';
              
              const type = (param.type as any) === 'image' ? 'file' : param.type;
              const isEnabled = param.enabled !== false; // default true

              return (
                <div 
                  key={param.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, param.id)}
                  onDragOver={(e) => handleDragOver(e, param.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, param.id)}
                  className={`relative flex items-start gap-2 group bg-white p-3 rounded border transition-all shadow-sm ${draggedParamId === param.id ? 'opacity-40 border-dashed border-indigo-300' : isEnabled ? 'border-gray-200 hover:border-indigo-300' : 'border-gray-200 opacity-60 grayscale bg-gray-50/50'}`}
                >
                  {/* Drop Position Indicators */}
                  {showLineTop && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-indigo-500 rounded-full z-20 pointer-events-none shadow" />}
                  {showLineBottom && <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-indigo-500 rounded-full z-20 pointer-events-none shadow" />}

                  {/* Drag Handle */}
                  <div 
                    className="mt-2 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing flex-shrink-0"
                    title={t.request.dragReorder}
                  >
                      <GripVertical size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 h-5">
                      <label className={`block text-xs font-semibold truncate ${isEnabled ? 'text-gray-500' : 'text-gray-400'}`}>{t.request.key}</label>
                      {param.description && (
                          <div className="text-gray-400 group/tooltip relative cursor-help flex items-center">
                              <HelpCircle size={12} />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap z-10 shadow-lg transition-opacity">
                                  {param.description}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                              </div>
                          </div>
                      )}
                    </div>
                    <input
                      type="text"
                      disabled={!isEnabled}
                      value={param.key}
                      onChange={(e) => {
                          const newParams = service.params.map(p => p.id === param.id ? {...p, key: e.target.value} : p);
                          onUpdateService({...service, params: newParams});
                      }}
                      className="w-full text-sm font-medium text-slate-800 border border-gray-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow disabled:bg-transparent disabled:text-gray-400"
                      placeholder="Key Name"
                    />
                  </div>
                  
                  <div className="flex-[2] min-w-0">
                    <label className={`block text-xs font-semibold mb-1 truncate flex items-center justify-between h-5 ${isEnabled ? 'text-gray-500' : 'text-gray-400'}`}>
                        <span>{t.request.value}</span>
                        <div className="flex items-center gap-2">
                             {param.type === 'string' && param.enableMultiString && <span className="text-[10px] bg-purple-50 text-purple-600 px-1 rounded">Array</span>}
                             <span className={`text-[10px] font-mono px-1.5 rounded ${isEnabled ? 'text-indigo-500 bg-indigo-50' : 'text-gray-400 bg-gray-100'}`}>{type}</span>
                        </div>
                    </label>
                    
                    {isEnabled ? (
                        <>
                            {type === 'boolean' ? (
                            <select
                                value={String(param.value)}
                                onChange={(e) => handleParamChange(param.id, e.target.value === 'true')}
                                className="w-full bg-white text-sm border border-gray-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                            >
                                <option value="true">true</option>
                                <option value="false">false</option>
                            </select>
                            ) : type === 'json' ? (
                                <div className="relative">
                                <textarea
                                    value={typeof param.value === 'string' ? param.value : JSON.stringify(param.value)}
                                    onChange={(e) => handleParamChange(param.id, e.target.value)}
                                    className="w-full text-xs font-mono text-slate-800 border border-gray-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[2.4rem] resize-y"
                                    placeholder="{}"
                                    rows={1}
                                />
                                </div>
                            ) : type === 'file' ? (
                                <FileParamInput 
                                value={String(param.value)}
                                onChange={(val) => handleParamChange(param.id, val)}
                                enableUrl={param.enableUrlConversion !== false}
                                enableBase64={param.enableBase64Conversion !== false}
                                enableMulti={param.enableMultiFile !== false}
                                corsProxy={corsProxy}
                                />
                            ) : (type === 'string' && param.enableMultiString) ? (
                                <StringArrayInput 
                                    value={param.value} 
                                    onChange={(val) => handleParamChange(param.id, val)}
                                />
                            ) : (
                            <input
                                type={type === 'integer' || type === 'float' ? 'number' : 'text'}
                                step={type === 'float' ? 'any' : '1'}
                                value={String(param.value)}
                                onChange={(e) => {
                                let val: string | number = e.target.value;
                                if (type === 'integer') val = parseInt(e.target.value);
                                if (type === 'float') val = parseFloat(e.target.value);
                                // Handle NaN for empty input
                                if (typeof val === 'number' && isNaN(val)) val = 0; 
                                // If input is just text for number fields (like minus sign), keep as is to allow typing
                                if (e.target.value === '' || e.target.value === '-') val = e.target.value;
                                
                                handleParamChange(param.id, val);
                                }}
                                className="w-full text-sm text-slate-800 border border-gray-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow"
                                placeholder="Value"
                            />
                            )}
                        </>
                    ) : (
                        <div className="w-full border border-gray-200 rounded p-1.5 bg-gray-50 text-sm text-gray-400 h-[34px] flex items-center">
                            <span className="truncate italic">Disabled</span>
                        </div>
                    )}

                  </div>
                  
                  <div className="pt-7 shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => setEditingParam(param)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title={t.request.paramSettings}
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteParam(param.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title={t.request.deleteParam}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            
            <button
              onClick={handleAddParam}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2 px-2 py-1 rounded hover:bg-indigo-50 w-fit transition-colors"
            >
              <Plus size={16} /> {t.request.addParam}
            </button>
          </div>
        ) : (
          <div className="relative h-full w-full overflow-hidden min-w-0">
             <div className="absolute top-2 right-4 z-20">
                <button
                    onClick={() => setWordWrap(!wordWrap)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md border shadow-sm text-xs font-medium transition-colors ${
                        wordWrap 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                    title={wordWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
                >
                    <WrapText size={14} />
                    <span>{wordWrap ? t.request.wrap : t.request.noWrap}</span>
                </button>
             </div>
             <textarea
                value={jsonValue}
                onChange={(e) => handleJsonChange(e.target.value)}
                className={`w-full h-full resize-none p-6 pt-10 font-mono text-sm outline-none border-none bg-slate-50 text-slate-800 focus:bg-white transition-colors custom-scrollbar ${jsonError ? 'bg-red-50' : ''} ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'}`}
                spellCheck={false}
              />
              {jsonError && (
                  <div className="absolute bottom-0 left-0 right-0 bg-red-100 text-red-700 px-4 py-2 text-xs shadow-inner border-t border-red-200 flex items-center gap-2 z-30">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      Error: {jsonError}
                  </div>
              )}
          </div>
        )}
      </div>

      <ParamConfigModal 
        isOpen={!!editingParam}
        onClose={() => setEditingParam(null)}
        param={editingParam}
        onSave={handleUpdateParamConfig}
      />
    </div>
  );
};

export default RequestPanel;