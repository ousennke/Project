
import React, { useState, useEffect, useRef } from 'react';
import { Credentials } from '../types';
import { X, Shield, AlertTriangle, Download, Upload, Database, KeyRound, Globe, Image as ImageIcon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: Credentials;
  onSave: (creds: Credentials) => void;
  onExportConfig: (includeCredentials: boolean) => void;
  onImportConfig: (file: File) => void;
  proxyUrl?: string;
  onSaveProxy?: (url: string) => void;
  imgbbKey?: string;
  onSaveImgbbKey?: (key: string) => void;
}

type Tab = 'credentials' | 'storage' | 'network';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onSave,
  onExportConfig,
  onImportConfig,
  proxyUrl = '',
  onSaveProxy,
  imgbbKey = '',
  onSaveImgbbKey
}) => {
  const [form, setForm] = useState<Credentials>(credentials);
  const [proxyForm, setProxyForm] = useState(proxyUrl);
  const [imgbbForm, setImgbbForm] = useState(imgbbKey);
  const [activeTab, setActiveTab] = useState<Tab>('credentials');
  const [includeCredsInExport, setIncludeCredsInExport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(credentials);
    setProxyForm(proxyUrl || '');
    setImgbbForm(imgbbKey || '');
  }, [credentials, proxyUrl, imgbbKey, isOpen]);

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
            <h2 className="font-semibold text-lg">Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-1/3 bg-gray-50 border-r border-gray-100 p-4 space-y-2 flex-shrink-0">
             <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Global Config</div>
             
             <button 
                onClick={() => setActiveTab('credentials')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'credentials' 
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
                }`}
             >
                <KeyRound size={16} />
                Credentials
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
                Network & Images
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
                Data & Storage
             </button>
          </div>

          {/* Content */}
          <div className="w-2/3 p-6 overflow-y-auto custom-scrollbar">
            
            {/* Credentials Tab */}
            {activeTab === 'credentials' && (
                <div className="space-y-6 h-full flex flex-col">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
                            VolcEngine Credentials
                        </h3>
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-md mb-4">
                            <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-xs text-amber-700">
                                stored locally in browser. Only used for signing requests.
                                </p>
                            </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Access Key ID (AK)</label>
                            <input
                                type="text"
                                value={form.accessKeyId}
                                onChange={(e) => setForm({ ...form, accessKeyId: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-shadow font-mono"
                                placeholder="e.g. AKLT..."
                            />
                            </div>

                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Secret Access Key (SK)</label>
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
                            Save Credentials
                        </button>
                    </div>
                </div>
            )}

            {/* Network Tab */}
            {activeTab === 'network' && (
                <div className="space-y-6 h-full flex flex-col">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Network & Uploads
                        </h3>
                        
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <Globe size={14}/> CORS Proxy
                                </h4>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Proxy URL Prefix</label>
                                <input
                                    type="text"
                                    value={proxyForm}
                                    onChange={(e) => setProxyForm(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-shadow font-mono"
                                    placeholder="e.g. https://cors-anywhere.herokuapp.com/"
                                />
                            </div>

                            <hr className="border-gray-100" />

                            <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <ImageIcon size={14}/> ImgBB Image Upload
                                </h4>
                                <label className="block text-xs font-medium text-gray-500 mb-1">API Key</label>
                                <input
                                    type="password"
                                    value={imgbbForm}
                                    onChange={(e) => setImgbbForm(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-shadow font-mono"
                                    placeholder="Leave empty to use built-in key"
                                />
                                <div className="mt-1 text-xs text-gray-400">
                                    Required for "Image" type parameters to upload to ImgBB. Leave blank to use default.Images uploaded using the default API (if left blank) will be deleted after 30 minutes.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={() => {
                                if (onSaveProxy) onSaveProxy(proxyForm);
                                if (onSaveImgbbKey) onSaveImgbbKey(imgbbForm);
                                onClose();
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* Storage Tab */}
            {activeTab === 'storage' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Data & Storage
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Manage your configuration data. You can export your services and groups to a JSON file for backup or sharing.
                        </p>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors bg-white">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Download size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 text-sm">Export Configuration</h4>
                                        <p className="text-xs text-gray-500 mt-1">Download current setup as JSON.</p>
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
                                        <span className="text-sm text-gray-600 group-hover:text-gray-900">Include Access Key & Secret Key</span>
                                    </label>

                                    <button 
                                        onClick={() => onExportConfig(includeCredsInExport)}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg w-full transition-colors"
                                    >
                                        Download JSON
                                    </button>
                                    
                                    {includeCredsInExport && (
                                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                            <AlertTriangle size={12} /> Warning: The exported file will contain sensitive secrets.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors bg-white">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                        <Upload size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 text-sm">Import Configuration</h4>
                                        <p className="text-xs text-gray-500 mt-1">Restore from a JSON file.</p>
                                    </div>
                                </div>
                                
                                <div className="pl-12">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg w-full transition-colors"
                                    >
                                        Select File...
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

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
