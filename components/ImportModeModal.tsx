
import React, { useState } from 'react';
import { RefreshCw, GitMerge, Shield, CheckSquare, Square, ShieldAlert, X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../i18n';

interface ImportModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceCount: number;
  hasCredentialsInFile: boolean;
  onSelectMode: (mode: 'overwrite' | 'merge', importCreds: boolean) => void;
}

const ImportModeModal: React.FC<ImportModeModalProps> = ({
  isOpen,
  onClose,
  serviceCount,
  hasCredentialsInFile,
  onSelectMode
}) => {
  const { t } = useLanguage();
  const [importCreds, setImportCreds] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div>
              <h2 className="font-semibold text-lg text-slate-900">{t.importMode.title}</h2>
              <p className="text-xs text-gray-500 mt-1">
                  {serviceCount} {t.importMode.servicesFound}
              </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">

            {/* Credential Checkbox - Moved to Top */}
            <div 
                onClick={() => hasCredentialsInFile && setImportCreds(!importCreds)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    hasCredentialsInFile 
                        ? (importCreds ? 'bg-emerald-50 border-emerald-300 cursor-pointer' : 'bg-white border-gray-200 hover:border-emerald-300 cursor-pointer') 
                        : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                }`}
            >
                <div className={`flex-shrink-0 ${hasCredentialsInFile ? (importCreds ? 'text-emerald-600' : 'text-gray-300') : 'text-gray-300'}`}>
                    {hasCredentialsInFile ? (
                        importCreds ? <CheckSquare size={20} /> : <Square size={20} />
                    ) : (
                        <Square size={20} />
                    )}
                </div>
                
                <div className="flex-1 min-w-0 flex items-center justify-between">
                    <span className={`font-medium text-sm ${hasCredentialsInFile ? 'text-gray-900' : 'text-gray-500'}`}>
                        {t.importMode.importCreds}
                    </span>
                    
                    {hasCredentialsInFile ? (
                         <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded">
                            {t.importMode.credFound}
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                            <ShieldAlert size={10} />
                            {t.importMode.credNotFound}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Mode Selection Cards - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onSelectMode('overwrite', importCreds)}
                    className="group relative flex flex-col items-start p-4 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50/30 transition-all text-left shadow-sm hover:shadow-md h-full"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-200 transition-colors">
                            <RefreshCw size={18} />
                        </div>
                        <span className="font-bold text-slate-900 text-sm group-hover:text-red-700 transition-colors">{t.importMode.overwrite}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        {t.importMode.overwriteDesc}
                    </p>
                </button>

                <button
                    onClick={() => onSelectMode('merge', importCreds)}
                    className="group relative flex flex-col items-start p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-left shadow-sm hover:shadow-md h-full"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-200 transition-colors">
                            <GitMerge size={18} />
                        </div>
                        <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">{t.importMode.merge}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        {t.importMode.mergeDesc}
                    </p>
                </button>
            </div>

        </div>

      </div>
    </div>
  );
};

export default ImportModeModal;
