
import React, { useState, useEffect, useMemo } from 'react';
import { ApiService, ServiceGroup, Credentials } from '../types';
import { X, CheckSquare, Square, ArrowRight, Plus, RefreshCw, Folder } from 'lucide-react';
import { useLanguage } from '../i18n';

interface ImportData {
  services: ApiService[];
  groups: ServiceGroup[];
  credentials?: Credentials;
}

interface ImportSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  importData: ImportData | null;
  existingServices: ApiService[];
  onConfirm: (selectedIndices: number[]) => void;
}

const ImportSelectionModal: React.FC<ImportSelectionModalProps> = ({
  isOpen,
  onClose,
  importData,
  existingServices,
  onConfirm
}) => {
  const { t } = useLanguage();
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (importData && isOpen) {
        // Default select all
        const allIndices = new Set(importData.services.map((_, i) => i));
        setSelectedIndices(allIndices);
    }
  }, [importData, isOpen]);

  const serviceStatuses = useMemo(() => {
      if (!importData) return [];
      return importData.services.map(s => {
          const exists = existingServices.some(es => es.name === s.name);
          return exists ? 'update' : 'new';
      });
  }, [importData, existingServices]);

  if (!isOpen || !importData) return null;

  const toggleAll = () => {
      if (selectedIndices.size === importData.services.length) {
          setSelectedIndices(new Set());
      } else {
          const all = new Set(importData.services.map((_, i) => i));
          setSelectedIndices(all);
      }
  };

  const toggleItem = (index: number) => {
      const newSet = new Set(selectedIndices);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      setSelectedIndices(newSet);
  };

  const handleConfirm = () => {
      onConfirm(Array.from(selectedIndices));
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col h-[650px] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div>
              <h2 className="font-semibold text-lg text-slate-900">{t.importSelection.title}</h2>
              <p className="text-xs text-gray-500 mt-1">
                  {t.importSelection.foundServices.replace('{{count}}', String(importData.services.length))}
              </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-4 text-sm flex-shrink-0">
            <button 
                onClick={toggleAll}
                className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition-colors"
            >
                {selectedIndices.size === importData.services.length ? (
                    <>
                        <CheckSquare size={18} className="text-indigo-600"/>
                        {t.importSelection.deselectAll}
                    </>
                ) : (
                    <>
                        <Square size={18} className="text-gray-400"/>
                        {t.importSelection.selectAll}
                    </>
                )}
            </button>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    <Plus size={12}/> {t.importSelection.new}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                    <RefreshCw size={12}/> {t.importSelection.update}
                </span>
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar space-y-4">
            {/* Services Section */}
            <div>
                 <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1 flex items-center gap-1">
                    <Folder size={12} /> {t.importSummary.services}
                 </h3>
                 <div className="space-y-2">
                    {importData.services.map((service, idx) => {
                        const status = serviceStatuses[idx];
                        const isSelected = selectedIndices.has(idx);
                        const group = importData.groups.find(g => g.id === service.groupId);

                        return (
                            <div 
                                key={idx} 
                                onClick={() => toggleItem(idx)}
                                className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                                    isSelected 
                                    ? 'bg-white border-indigo-400 shadow-sm ring-1 ring-indigo-400' 
                                    : 'bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 opacity-80 hover:opacity-100'
                                }`}
                            >
                                <div className={`flex-shrink-0 ${isSelected ? 'text-indigo-600' : 'text-gray-300'}`}>
                                    {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`font-medium text-sm truncate ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {service.name}
                                        </span>
                                        {status === 'new' ? (
                                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded flex-shrink-0">
                                                {t.importSelection.new}
                                            </span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded flex-shrink-0">
                                                {t.importSelection.update}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        {group && (
                                            <div className="flex items-center gap-1 truncate max-w-[150px]">
                                                <Folder size={12}/>
                                                <span>{group.name}</span>
                                            </div>
                                        )}
                                        <span className="text-gray-300">|</span>
                                        <span className="truncate max-w-[200px] font-mono opacity-80">{service.action}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                 </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-end flex-shrink-0">
             <div className="flex gap-3">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {t.common.cancel}
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={selectedIndices.size === 0}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                >
                    {t.importSelection.importBtn} 
                    <ArrowRight size={16} />
                </button>
             </div>
        </div>

      </div>
    </div>
  );
};

export default ImportSelectionModal;
