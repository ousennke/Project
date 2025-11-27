

import React, { useState, useEffect, useRef } from 'react';
import { Credentials } from '../types';
import { X, Shield, AlertTriangle, Download, Upload, Database, KeyRound, Globe, FileText, Settings as SettingsIcon, BookOpen, ExternalLink } from 'lucide-react';
import { useLanguage } from '../i18n';

export type SettingsTab = 'general' | 'credentials' | 'storage' | 'network' | 'manual';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: Credentials;
  onSave: (creds: Credentials) => void;
  onExportConfig: (includeCredentials: boolean) => void;
  onImportConfig: (file: File) => void;
  proxyUrl?: string;
  onSaveProxy?: (url: string) => void;
  initialTab?: SettingsTab;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onSave,
  onExportConfig,
  onImportConfig,
  proxyUrl = '',
  onSaveProxy,
  initialTab = 'general'
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [form, setForm] = useState<Credentials>(credentials);
  const [proxyForm, setProxyForm] = useState(proxyUrl);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [includeCredsInExport, setIncludeCredsInExport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(credentials);
    setProxyForm(proxyUrl || '');
  }, [credentials, proxyUrl, isOpen]);

  useEffect(() => {
    if (isOpen) {
        setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportConfig(e.target.files[0]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col h-[500px]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <Shield className="text-indigo-600" size={20} />
            <h2 className="font-semibold text-lg">{t.settings.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-1/3 bg-gray-50 border-r border-gray-100 p-4 space-y-2 flex-shrink-0 flex flex-col">
             <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">{t.settings.globalConfig}</div>
             
             <button 
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'general' 
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
                }`}
             >
                <SettingsIcon size={16} />
                {t.settings.general}
             </button>

             <button 
                onClick={() => setActiveTab('credentials')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'credentials' 
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
                }`}
             >
                <KeyRound size={16} />
                {t.settings.credentials}
             </button>

             <button 
                onClick={() => setActiveTab('network')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'network' 
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
                }`}
             >
                <Globe size={16} />
                {t.settings.networkImages}
             </button>

             <button 
                onClick={() => setActiveTab('storage')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'storage' 
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
                }`}
             >
                <Database size={16} />
                {t.settings.dataStorage}
             </button>

             <button 
                onClick={() => setActiveTab('manual')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'manual' 
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
                }`}
             >
                <BookOpen size={16} />
                {t.settings.userManual}
             </button>

             <div className="mt-auto pt-6 px-2">
                 <div className="text-[10px] text-gray-400 font-medium border-t border-gray-200 pt-3 text-center leading-relaxed">
                     {t.settings.contactInfo}
                 </div>
             </div>
          </div>

          {/* Content */}
          <div className="w-2/3 p-6 overflow-y-auto custom-scrollbar">
            
            {/* General Tab */}
            {activeTab === 'general' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t.settings.general}</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">{t.settings.language}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setLanguage('en')}
                                        className={`flex items-center justify-center py-3 px-4 text-sm font-medium border rounded-xl transition-all ${
                                            language === 'en' 
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500' 
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-base">🇺🇸</span>
                                            <span>English</span>
                                        </div>
                                    </button>
                                    <button 
                                        onClick={() => setLanguage('zh')}
                                        className={`flex items-center justify-center py-3 px-4 text-sm font-medium border rounded-xl transition-all ${
                                            language === 'zh' 
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500' 
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-base">🇨🇳</span>
                                            <span>中文</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Credentials Tab */}
            {activeTab === 'credentials' && (
                <div className="space-y-6 h-full flex flex-col">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
                            {t.settings.volcCredentials}
                        </h3>
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-md mb-4">
                            <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-xs text-amber-700">
                                {t.settings.credWarning}
                                </p>
                            </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.ak}</label>
                            <input
                                type="text"
                                value={form.accessKeyId}
                                onChange={(e) => setForm({ ...form, accessKeyId: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-shadow font-mono"
                                placeholder="e.g. AKLT..."
                            />
                            </div>

                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.sk}</label>
                            <input
                                type="password"
                                value={form.secretAccessKey}
                                onChange={(e) => setForm({ ...form, secretAccessKey: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-shadow font-mono"
                                placeholder="e.g. T0RRN..."
                            />
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={() => {
                            onSave(form);
                            onClose();
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
                        >
                            {t.settings.saveCreds}
                        </button>
                    </div>
                </div>
            )}

            {/* Network Tab */}
            {activeTab === 'network' && (
                <div className="space-y-6 h-full flex flex-col">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {t.settings.networkUploads}
                        </h3>
                        
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <FileText size={14}/> {t.settings.uguuUpload}
                                </h4>
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700 leading-relaxed">
                                    {t.settings.uguuHint}
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <Globe size={14}/> {t.settings.corsProxy} <span className="text-[10px] font-normal text-gray-400 ml-1">(Optional)</span>
                                </h4>
                                <label className="block text-xs font-medium text-gray-500 mb-1">{t.settings.proxyPrefix}</label>
                                <input
                                    type="text"
                                    value={proxyForm}
                                    onChange={(e) => setProxyForm(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-shadow font-mono"
                                    placeholder="e.g. https://corsproxy.io/?"
                                />
                                <div className="mt-1.5 text-[10px] text-gray-400 leading-tight">
                                    {language === 'zh' 
                                        ? '注：仅当 API 响应被浏览器安全策略拦截时使用。如果您使用 VPN 且上传服务支持 CORS，此处通常可以留空。' 
                                        : 'Note: Only used if browser security blocks the API response. If you use a VPN and the upload service supports CORS, you can usually leave this empty.'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={() => {
                                if (onSaveProxy) onSaveProxy(proxyForm);
                                onClose();
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
                        >
                            {t.settings.saveChanges}
                        </button>
                    </div>
                </div>
            )}

            {/* Storage Tab */}
            {activeTab === 'storage' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {t.settings.dataStorage}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Manage your configuration data. You can export your services and groups to a JSON file for backup or sharing.
                        </p>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors bg-white">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Upload size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 text-sm">{t.settings.exportConfig}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{t.settings.exportHint}</p>
                                    </div>
                                </div>

                                <div className="pl-12">
                                    <label className="flex items-center gap-2 mb-4 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={includeCredsInExport}
                                            onChange={(e) => setIncludeCredsInExport(e.target.checked)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-600 group-hover:text-gray-900">{t.settings.includeCreds}</span>
                                    </label>

                                    <button 
                                        onClick={() => onExportConfig(includeCredsInExport)}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg w-full transition-colors"
                                    >
                                        {t.settings.downloadJson}
                                    </button>
                                    
                                    {includeCredsInExport && (
                                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                            <AlertTriangle size={12} /> {t.settings.includeCredsWarning}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors bg-white">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                        <Download size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 text-sm">{t.settings.importConfig}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{t.settings.importHint}</p>
                                    </div>
                                </div>
                                
                                <div className="pl-12">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg w-full transition-colors"
                                    >
                                        {t.settings.selectFile}
                                    </button>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".json"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* User Manual Tab */}
            {activeTab === 'manual' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t.settings.userManual}</h3>
                        
                        <div className="flex flex-col items-center justify-center h-64 border border-gray-200 rounded-xl bg-slate-50 p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                                <BookOpen size={32} />
                            </div>
                            
                            <div>
                                <h4 className="font-bold text-gray-900 mb-1">{t.settings.userManual}</h4>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                    {t.settings.manualHint}
                                </p>
                            </div>

                            <a 
                                href="https://bytedance.larkoffice.com/wiki/Vh2EwnkqOiFJF7kb4iJcR3ktn4c" 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                            >
                                {t.settings.openManual}
                                <ExternalLink size={16} />
                            </a>
                        </div>
                    </div>
                </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
