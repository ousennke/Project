
import React, { useState, useEffect, useCallback } from 'react';
import { ApiService, ApiParam } from '../types';
import { Plus, Trash2, Play, ExternalLink, Code, List, WrapText, Settings, HelpCircle, Square, GripVertical } from 'lucide-react';
import ParamConfigModal from './ParamConfigModal';
import ImageParamInput from './ImageParamInput';

interface RequestPanelProps {
  service: ApiService;
  onUpdateService: (service: ApiService) => void;
  onSend: () => void;
  onStop?: () => void;
  loading: boolean;
  imgbbApiKey?: string;
}

const RequestPanel: React.FC<RequestPanelProps> = ({
  service,
  onUpdateService,
  onSend,
  onStop,
  loading,
  imgbbApiKey
}) => {
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
      // Try parsing JSON strings if type is JSON
      if (p.type === 'json' && typeof p.value === 'string') {
        try {
           obj[p.key] = JSON.parse(p.value);
        } catch {
           obj[p.key] = p.value; // Fallback
        }
      } else {
        let val = p.value;
        
        // Parse Image arrays for preview
        if (p.type === 'image' && typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) val = parsed;
            } catch {}
        }

        // Auto-wrap image_urls and binary_data_base64 if they are SINGLE strings
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
        if (typeof value === 'number') {
             type = Number.isInteger(value) ? 'integer' : 'float';
        }
        else if (typeof value === 'boolean') type = 'boolean';
        else if (typeof value === 'object') type = 'json';

        return {
          id: existing ? existing.id : `gen_${index}_${Date.now()}`,
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : (value as string | number | boolean),
          type: existing ? existing.type : type,
          description: existing ? existing.description : undefined
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
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        e.preventDefault();
        return;
    }

    setDraggedParamId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: set custom drag image if needed
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

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex-none p-6 pb-4 border-b border-gray-200 bg-white z-10 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 flex-1 mr-4">
            <h1 className="text-xl font-bold text-slate-900 truncate" title={service.name}>{service.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1 font-mono">
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">{service.method}</span>
                <span className="truncate">{service.serviceName}</span>
                <span className="text-gray-300">•</span>
                <span className="truncate">{service.action}</span>
            </div>
          </div>
           {service.docUrl && (
            <a 
              href={service.docUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="flex-none flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Docs <ExternalLink size={14} />
            </a>
          )}
        </div>

        {/* Parameter Controls */}
        <div className="flex items-center justify-between mt-4 flex-wrap gap-4">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('form')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                viewMode === 'form' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={14} /> <span>Params</span>
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                viewMode === 'json' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
               <Code size={14}/> <span>JSON</span>
            </button>
          </div>

          {loading ? (
              <button
                onClick={onStop}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium shadow-md transition-all text-white shrink-0 bg-red-500 hover:bg-red-600 hover:shadow-lg active:transform active:scale-95"
              >
                 <Square size={16} fill="currentColor" />
                 Stop
              </button>
          ) : (
              <button
                onClick={onSend}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium shadow-md transition-all text-white shrink-0 bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:transform active:scale-95"
              >
                <Play size={16} fill="currentColor" />
                Run Request
              </button>
          )}
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

              return (
                <div 
                  key={param.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, param.id)}
                  onDragOver={(e) => handleDragOver(e, param.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, param.id)}
                  className={`relative flex items-start gap-2 group bg-white p-3 rounded border transition-all shadow-sm ${draggedParamId === param.id ? 'opacity-40 border-dashed border-indigo-300' : 'border-gray-200 hover:border-indigo-300'}`}
                >
                  {/* Drop Position Indicators */}
                  {showLineTop && <div className="absolute -top-1.5 left-0 right-0 h-1 bg-indigo-500 rounded-full z-20 pointer-events-none shadow" />}
                  {showLineBottom && <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-indigo-500 rounded-full z-20 pointer-events-none shadow" />}

                  {/* Drag Handle */}
                  <div 
                    className="mt-2 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing flex-shrink-0"
                    title="Drag to reorder"
                  >
                      <GripVertical size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 h-5">
                      <label className="block text-xs font-semibold text-gray-500 truncate">Key</label>
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
                      value={param.key}
                      onChange={(e) => {
                          const newParams = service.params.map(p => p.id === param.id ? {...p, key: e.target.value} : p);
                          onUpdateService({...service, params: newParams});
                      }}
                      className="w-full text-sm font-medium text-slate-800 border border-gray-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow"
                      placeholder="Key Name"
                    />
                  </div>
                  
                  <div className="flex-[2] min-w-0">
                    <label className="block text-xs font-semibold text-gray-500 mb-1 truncate flex items-center justify-between h-5">
                        <span>Value</span>
                        <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 px-1.5 rounded">{param.type}</span>
                    </label>
                    
                    {param.type === 'boolean' ? (
                      <select
                        value={String(param.value)}
                        onChange={(e) => handleParamChange(param.id, e.target.value === 'true')}
                        className="w-full bg-white text-sm border border-gray-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : param.type === 'json' ? (
                        <div className="relative">
                           <textarea
                              value={typeof param.value === 'string' ? param.value : JSON.stringify(param.value)}
                              onChange={(e) => handleParamChange(param.id, e.target.value)}
                              className="w-full text-xs font-mono text-slate-800 border border-gray-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[2.4rem] resize-y"
                              placeholder="{}"
                              rows={1}
                           />
                        </div>
                    ) : param.type === 'image' ? (
                        <ImageParamInput 
                          value={String(param.value)}
                          onChange={(val) => handleParamChange(param.id, val)}
                          imgbbApiKey={imgbbApiKey}
                          enableUrl={param.enableUrlConversion !== false}
                          enableBase64={param.enableBase64Conversion !== false}
                          enableMulti={param.enableMultiImage !== false}
                        />
                    ) : (
                       <input
                        type={param.type === 'integer' || param.type === 'float' ? 'number' : 'text'}
                        step={param.type === 'float' ? 'any' : '1'}
                        value={String(param.value)}
                        onChange={(e) => {
                          let val: string | number = e.target.value;
                          if (param.type === 'integer') val = parseInt(e.target.value);
                          if (param.type === 'float') val = parseFloat(e.target.value);
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
                  </div>
                  
                  <div className="pt-7 shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => setEditingParam(param)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Param Settings"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteParam(param.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete Param"
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
              <Plus size={16} /> Add Parameter
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
                    <span>{wordWrap ? 'Wrap' : 'No Wrap'}</span>
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
