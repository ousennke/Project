
import React, { useState, useEffect } from 'react';
import { ApiParam } from '../types';
import { X, Save, Type, AlignLeft, Hash, Settings2, Link as LinkIcon, FileCode, AlertTriangle, Files, Power, List } from 'lucide-react';
import { useLanguage } from '../i18n';

interface ParamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  param: ApiParam | null;
  onSave: (param: ApiParam) => void;
}

const ParamConfigModal: React.FC<ParamConfigModalProps> = ({
  isOpen,
  onClose,
  param,
  onSave,
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<ApiParam | null>(null);

  useEffect(() => {
    if (param) {
      setFormData({ ...param });
    }
  }, [param, isOpen]);

  if (!isOpen || !formData) return null;

  const handleChange = (field: keyof ApiParam, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleTypeChange = (newType: ApiParam['type']) => {
    if (!formData) return;
    
    // Attempt to convert value when type changes
    let newValue: any = formData.value;

    if (newType === 'boolean') {
       newValue = String(formData.value).toLowerCase() === 'true';
    } else if (newType === 'integer') {
       const num = parseInt(String(formData.value));
       newValue = isNaN(num) ? 0 : num;
    } else if (newType === 'float') {
       const num = parseFloat(String(formData.value));
       newValue = isNaN(num) ? 0.0 : num;
    } else if (newType === 'string') {
       newValue = String(formData.value);
    } else if (newType === 'file') {
        newValue = ''; // Reset for file
    }

    setFormData({ ...formData, type: newType, value: newValue });
  };

  const handleFileConfigChange = (key: 'enableUrlConversion' | 'enableBase64Conversion' | 'enableMultiFile', checked: boolean) => {
      setFormData(prev => prev ? ({ ...prev, [key]: checked }) : null);
  };

  // Validation: If type is file, at least one conversion method must be enabled (or undefined/default)
  // Explicitly check for false because undefined means true/enabled by default in logic
  const isFileInvalid = formData.type === 'file' && 
                         formData.enableUrlConversion === false && 
                         formData.enableBase64Conversion === false;

  const isEnabled = formData.enabled !== false;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Settings2 className="text-indigo-600" size={20} />
            <h2 className="font-semibold text-lg">{t.paramConfig.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">{t.paramConfig.keyName}</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => handleChange('key', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              placeholder="param_key"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                    <Type size={12}/> {t.paramConfig.dataType}
                </label>
                <select
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value as ApiParam['type'])}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                    <option value="string">String</option>
                    <option value="integer">Integer</option>
                    <option value="float">Float</option>
                    <option value="boolean">Boolean</option>
                    <option value="json">JSON</option>
                    <option value="file">File (convUrl/Base64)</option>
                </select>
            </div>
            <div>
                 <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                    <Hash size={12}/> {t.paramConfig.defaultValue}
                </label>
                {formData.type === 'boolean' ? (
                     <select
                        value={String(formData.value)}
                        onChange={(e) => handleChange('value', e.target.value === 'true')}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                    >
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </select>
                ) : formData.type === 'file' ? (
                    <div className="w-full p-2 border border-gray-200 bg-gray-50 rounded text-xs text-gray-400 italic">
                        {t.paramConfig.configuredViaUpload}
                    </div>
                ) : formData.type === 'string' && formData.enableMultiString ? (
                     <div className="w-full p-2 border border-gray-200 bg-gray-50 rounded text-xs text-gray-400 italic">
                        {t.paramConfig.configuredViaList}
                    </div>
                ) : (
                    <input
                        type={formData.type === 'integer' || formData.type === 'float' ? 'number' : 'text'}
                        step={formData.type === 'float' ? 'any' : '1'}
                        value={typeof formData.value === 'object' ? JSON.stringify(formData.value) : String(formData.value)}
                        onChange={(e) => {
                            let v: any = e.target.value;
                            if (formData.type === 'integer') v = parseInt(v) || 0;
                            if (formData.type === 'float') v = parseFloat(v) || 0;
                            handleChange('value', v);
                        }}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                )}
            </div>
          </div>

          {/* String Specific Options */}
          {formData.type === 'string' && (
               <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.enableMultiString || false} 
                            onChange={(e) => handleChange('enableMultiString', e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-gray-700 font-semibold flex items-center gap-1">
                             <List size={14}/> {t.paramConfig.enableMultiString}
                          </span>
                      </label>
                  </div>
               </div>
          )}

          {/* File Specific Options */}
          {formData.type === 'file' && (
              <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.enableMultiFile !== false} // Default true
                            onChange={(e) => handleFileConfigChange('enableMultiFile', e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-gray-700 font-semibold flex items-center gap-1">
                             <Files size={14}/> {t.paramConfig.enableMulti}
                          </span>
                      </label>
                  </div>

                  <div className={`p-3 rounded-lg border transition-colors ${isFileInvalid ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-100'}`}>
                      <label className={`block text-xs font-bold uppercase mb-2 ${isFileInvalid ? 'text-red-700' : 'text-indigo-800'}`}>{t.paramConfig.allowedConversions}</label>
                      <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={formData.enableUrlConversion !== false} // Default true
                                onChange={(e) => handleFileConfigChange('enableUrlConversion', e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-xs text-indigo-900 font-medium flex items-center gap-1">
                                <LinkIcon size={12}/> {t.paramConfig.enableUrl}
                              </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={formData.enableBase64Conversion !== false} // Default true
                                onChange={(e) => handleFileConfigChange('enableBase64Conversion', e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-xs text-indigo-900 font-medium flex items-center gap-1">
                                <FileCode size={12}/> {t.paramConfig.enableBase64}
                              </span>
                          </label>
                      </div>
                      
                      {isFileInvalid && (
                          <div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1 animate-pulse">
                              <AlertTriangle size={12} />
                              {t.paramConfig.conversionError}
                          </div>
                      )}
                  </div>
              </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                <AlignLeft size={12}/> {t.paramConfig.description}
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none h-20"
              placeholder="Describe what this parameter does..."
            />
          </div>

        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            {/* Enable/Disable Toggle Switch */}
            <div className="flex items-center gap-3">
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={isEnabled}
                        onChange={(e) => handleChange('enabled', e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <span className={`text-xs font-bold ${isEnabled ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {isEnabled ? t.request.enableParam : t.request.disableParam}
                </span>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {t.common.cancel}
                </button>
                <button
                    onClick={() => {
                        if (isFileInvalid) return;
                        onSave(formData);
                        onClose();
                    }}
                    disabled={isFileInvalid}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all ${
                        isFileInvalid 
                        ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                    <Save size={16} />
                    {t.common.save}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ParamConfigModal;
