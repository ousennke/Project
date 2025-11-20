
import React, { useState, useEffect } from 'react';
import { ApiService, ServiceGroup, AsyncConfig } from '../types';
import { X, Save, Globe, Link as LinkIcon, Layers, Tag, Trash2, AlertTriangle, Repeat, Clock, Code2 } from 'lucide-react';

interface ServiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ApiService | null;
  groups: ServiceGroup[];
  onSave: (service: ApiService) => void;
  onDelete: (id: string) => void;
}

type Tab = 'basic' | 'async';

const ServiceSettingsModal: React.FC<ServiceSettingsModalProps> = ({
  isOpen,
  onClose,
  service,
  groups,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<ApiService | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('basic');

  useEffect(() => {
    if (service) {
      setFormData({ ...service });
      // Initialize async config if not present
      if (!service.asyncConfig) {
          setFormData(prev => prev ? ({
              ...prev,
              asyncConfig: {
                  enabled: false,
                  pollAction: 'Poll Action',
                  pollVersion: service.version,
                  pollMethod: 'POST',
                  submitResponseIdPath: 'data.task_id',
                  pollIdParamKey: 'task_id',
                  pollStatusPath: 'data.status',
                  pollSuccessValue: 'done',
                  staticParamsJson: '{"req_key": "..."}',
                  inheritParams: false,
                  pollInterval: 2000,
                  timeoutSeconds: 120,
                  maxRetries: 150
              }
          }) : null);
      }
    }
    setIsDeleting(false);
    setActiveTab('basic');
  }, [service, isOpen]);

  if (!isOpen || !formData) return null;

  const handleChange = (key: keyof ApiService, value: any) => {
    setFormData((prev) => prev ? { ...prev, [key]: value } : null);
  };

  const handleAsyncChange = (key: keyof AsyncConfig, value: any) => {
      setFormData(prev => {
          if (!prev || !prev.asyncConfig) return prev;
          return {
              ...prev,
              asyncConfig: {
                  ...prev.asyncConfig,
                  [key]: value
              }
          };
      });
  };

  const handleDeleteClick = () => {
      if (isDeleting) {
          onDelete(formData.id);
          onClose();
      } else {
          setIsDeleting(true);
          setTimeout(() => setIsDeleting(false), 3000);
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <Layers className="text-indigo-600" size={20} />
            <h2 className="font-semibold text-lg">Service Configuration</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 px-6">
            <button
                onClick={() => setActiveTab('basic')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'basic' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Basic Settings
            </button>
            <button
                onClick={() => setActiveTab('async')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'async' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Repeat size={14} />
                Async Workflow
            </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
          
          {activeTab === 'basic' && (
            <>
                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Display Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                        placeholder="e.g. Text to Image"
                    />
                    </div>
                    
                    <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Group</label>
                    <select
                        value={formData.groupId}
                        onChange={(e) => handleChange('groupId', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                    >
                        {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                    </div>

                    <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Description</label>
                    <input
                        type="text"
                        value={formData.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="Service description..."
                    />
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* API Details */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Globe size={16} className="text-gray-400"/> API Endpoint
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Host / Endpoint</label>
                            <input
                                type="text"
                                value={formData.endpoint}
                                onChange={(e) => handleChange('endpoint', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
                            <select
                                value={formData.method}
                                onChange={(e) => handleChange('method', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                            >
                                <option value="POST">POST</option>
                                <option value="GET">GET</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
                            <input
                                type="text"
                                value={formData.region}
                                onChange={(e) => handleChange('region', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                placeholder="cn-north-1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Version</label>
                            <input
                                type="text"
                                value={formData.version}
                                onChange={(e) => handleChange('version', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                placeholder="2022-01-01"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
                        <input
                            type="text"
                            value={formData.action}
                            onChange={(e) => handleChange('action', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                            placeholder="ActionName"
                        />
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* Metadata */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Tag size={16} className="text-gray-400"/> Documentation
                    </h3>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Documentation URL</label>
                        <div className="relative">
                            <LinkIcon size={14} className="absolute left-3 top-3 text-gray-400"/>
                            <input
                                type="text"
                                value={formData.docUrl || ''}
                                onChange={(e) => handleChange('docUrl', e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 rounded text-sm text-blue-600"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>
            </>
          )}

          {activeTab === 'async' && formData.asyncConfig && (
            <div className="space-y-6">
                <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <div>
                        <h4 className="font-semibold text-indigo-900">Enable Async Workflow</h4>
                        <p className="text-xs text-indigo-700 mt-1">Automatically poll for results after submission.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={formData.asyncConfig.enabled}
                            onChange={(e) => handleAsyncChange('enabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                {formData.asyncConfig.enabled && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        
                        {/* Polling Request */}
                        <div>
                            <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">Polling Request</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Poll Action</label>
                                    <input
                                        type="text"
                                        value={formData.asyncConfig.pollAction}
                                        onChange={(e) => handleAsyncChange('pollAction', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                                        placeholder="e.g. GetResult"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Poll Version</label>
                                    <input
                                        type="text"
                                        value={formData.asyncConfig.pollVersion}
                                        onChange={(e) => handleAsyncChange('pollVersion', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                                        placeholder="2022-08-31"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* JSON Editor for Static Params - Moved Here */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                <Code2 size={12} /> Static Poll Params (JSON)
                            </label>
                            <textarea
                                value={formData.asyncConfig.staticParamsJson || '{}'}
                                onChange={(e) => handleAsyncChange('staticParamsJson', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded text-xs font-mono h-24 focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50"
                                placeholder='{"req_key": "..."}'
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Use this to set fixed parameters like req_key for the polling request.</p>
                        </div>

                        {/* Polling Logic */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">ID Extraction & Passing</h5>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">ID Key in Poll Request</label>
                                        <input
                                            type="text"
                                            value={formData.asyncConfig.pollIdParamKey}
                                            onChange={(e) => handleAsyncChange('pollIdParamKey', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                                            placeholder="e.g. task_id"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">Status Checking</h5>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Success Value</label>
                                            <input
                                                type="text"
                                                value={formData.asyncConfig.pollSuccessValue}
                                                onChange={(e) => handleAsyncChange('pollSuccessValue', e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                                                placeholder="e.g. done"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Error Path (Opt)</label>
                                            <input
                                                type="text"
                                                value={formData.asyncConfig.pollErrorPath || ''}
                                                onChange={(e) => handleAsyncChange('pollErrorPath', e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                                                placeholder="data.error"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                         {/* Timing */}
                        <div>
                             <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                <Clock size={12} /> Timing & Options
                             </h5>
                             <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Poll Interval (ms)</label>
                                    <input
                                        type="number"
                                        value={formData.asyncConfig.pollInterval}
                                        onChange={(e) => handleAsyncChange('pollInterval', parseInt(e.target.value))}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Timeout (s)</label>
                                    <input
                                        type="number"
                                        value={formData.asyncConfig.timeoutSeconds ?? 120}
                                        onChange={(e) => handleAsyncChange('timeoutSeconds', parseInt(e.target.value))}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <div className="flex items-end pb-2">
                                     <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.asyncConfig.inheritParams}
                                            onChange={(e) => handleAsyncChange('inheritParams', e.target.checked)}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Inherit Submit Params
                                    </label>
                                </div>
                             </div>
                        </div>

                    </div>
                )}
            </div>
          )}

        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          
          <button
            type="button"
            onClick={handleDeleteClick}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                isDeleting 
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm' 
                : 'text-red-600 bg-red-50 hover:bg-red-100'
            }`}
          >
            {isDeleting ? (
                <>
                    <AlertTriangle size={16} />
                    Confirm Delete?
                </>
            ) : (
                <>
                    <Trash2 size={16} />
                    Delete Service
                </>
            )}
          </button>

          <div className="flex gap-3">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={() => {
                onSave(formData);
                onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
                <Save size={16} />
                Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceSettingsModal;
