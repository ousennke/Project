
import React from 'react';
import { CheckCircle, FileJson, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../i18n';

export interface ImportSummaryData {
  serviceCount: number;
  groupCount: number;
  hasCredentials: boolean;
  serviceNames: string[];
}

interface ImportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ImportSummaryData | null;
}

const ImportSummaryModal: React.FC<ImportSummaryModalProps> = ({ isOpen, onClose, summary }) => {
  const { t } = useLanguage();
  if (!isOpen || !summary) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col animate-in fade-in zoom-in duration-200">
        
        <div className="p-6 flex flex-col items-center text-center border-b border-gray-100">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={24} strokeWidth={3} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t.importSummary.successTitle}</h2>
            <p className="text-sm text-gray-500 mt-1">{t.importSummary.successMsg}</p>
        </div>

        <div className="p-6 space-y-4 bg-gray-50/50">
            
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-center">
                    <div className="text-xs text-gray-500 uppercase font-semibold">{t.importSummary.services}</div>
                    <div className="text-2xl font-bold text-indigo-600">{summary.serviceCount}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-center">
                    <div className="text-xs text-gray-500 uppercase font-semibold">{t.importSummary.groups}</div>
                    <div className="text-2xl font-bold text-indigo-600">{summary.groupCount}</div>
                </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${summary.hasCredentials ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                {summary.hasCredentials ? <ShieldCheck size={20} /> : <ShieldAlert size={20} className="opacity-50"/>}
                <div className="flex-1">
                    <div className="text-sm font-bold">{summary.hasCredentials ? t.importSummary.credsUpdated : t.importSummary.noCreds}</div>
                    <div className="text-xs opacity-80">{summary.hasCredentials ? t.importSummary.credsLoaded : t.importSummary.credsExisting}</div>
                </div>
            </div>

            <div>
                <div className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <FileJson size={12} /> {t.importSummary.importedServices}
                </div>
                <div className="bg-white border border-gray-200 rounded-lg max-h-32 overflow-y-auto custom-scrollbar p-2">
                    {summary.serviceNames.length > 0 ? (
                        <ul className="space-y-1">
                            {summary.serviceNames.map((name, i) => (
                                <li key={i} className="text-xs text-gray-700 py-1 px-2 bg-gray-50 rounded border border-transparent hover:border-gray-200 truncate">
                                    {name}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-xs text-gray-400 italic text-center py-2">{t.importSummary.noServicesFound}</div>
                    )}
                </div>
            </div>

        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
            <button 
                onClick={onClose}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
                {t.importSummary.gotIt}
            </button>
        </div>

      </div>
    </div>
  );
};

export default ImportSummaryModal;
