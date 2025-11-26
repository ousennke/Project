import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import RequestPanel from './components/RequestPanel';
import ResponsePanel from './components/ResponsePanel';
import SettingsModal, { SettingsTab } from './components/SettingsModal';
import ServiceSettingsModal from './components/ServiceSettingsModal';
import ImportSummaryModal, { ImportSummaryData } from './components/ImportSummaryModal';
import ImportSelectionModal from './components/ImportSelectionModal';
import ImportModeModal from './components/ImportModeModal';
import ConfirmDialog from './components/ConfirmDialog';
import { ApiService, Credentials, ResponseData, ServiceGroup } from './types';
import { signRequest } from './services/volcSigner';
import { LanguageProvider } from './i18n';

const DEFAULT_GROUP_ID = 'g_default';
const DEFAULT_SERVICE_ID = 's_default_1';

const DEFAULT_GROUPS: ServiceGroup[] = [
    { id: DEFAULT_GROUP_ID, name: 'Image Services', collapsed: false }
];

const DEFAULT_SERVICES: ApiService[] = [
  {
    id: DEFAULT_SERVICE_ID,
    groupId: DEFAULT_GROUP_ID,
    name: 'General 3.0 Text-to-Image',
    serviceName: 'cv',
    description: 'HighAesSmartDrawing',
    action: 'HighAesSmartDrawing',
    version: '2022-08-31',
    endpoint: 'https://visual.volcengineapi.com',
    region: 'cn-north-1',
    method: 'POST',
    docUrl: 'https://www.volcengine.com/docs/85128/1526761',
    params: [
      { id: 'p1', key: 'req_key', value: 'high_aes_general_v30l_zt2i', type: 'string', description: 'Algorithm name, fixed value', enabled: true },
      { id: 'p2', key: 'prompt', value: 'A majestic cyberpunk city with neon lights, rainy streets, cinematic lighting', type: 'string', description: 'Prompt for image generation', enabled: true },
      { id: 'p3', key: 'use_pre_llm', value: true, type: 'boolean', description: 'Enable prompt enhancement', enabled: true },
      { id: 'p4', key: 'scale', value: 2.5, type: 'float', description: 'Guidance scale [1-10]', enabled: true },
      { id: 'p5', key: 'seed', value: -1, type: 'integer', description: 'Random seed, -1 for random', enabled: true },
      { id: 'p6', key: 'width', value: 1024, type: 'integer', description: 'Image width', enabled: true },
      { id: 'p7', key: 'height', value: 1024, type: 'integer', description: 'Image height', enabled: true },
      { id: 'p8', key: 'return_url', value: true, type: 'boolean', enabled: true },
    ],
  }
];

// Helper to get value from nested object using string path like "data.task_id"
const getValueByPath = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Simple string hash for change detection
const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  return hash.toString();
};

const AppContent: React.FC = () => {
  const [groups, setGroups] = useState<ServiceGroup[]>(DEFAULT_GROUPS);
  const [services, setServices] = useState<ApiService[]>(DEFAULT_SERVICES);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(DEFAULT_SERVICES[0].id);
  
  const [credentials, setCredentials] = useState<Credentials>({
    accessKeyId: '',
    secretAccessKey: '',
  });
  const [proxyUrl, setProxyUrl] = useState('');
  
  // Modal States
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('general');
  const [showServiceSettings, setShowServiceSettings] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummaryData | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<any | null>(null);
  
  // Import States
  const [importModeData, setImportModeData] = useState<any | null>(null); // Holds data for Mode Selection
  const [importSelectionData, setImportSelectionData] = useState<any | null>(null); // Holds data for Granular Selection
  const [pendingImportCreds, setPendingImportCreds] = useState(false); // Stores credential decision

  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Layout State
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [requestPanelWidth, setRequestPanelWidth] = useState(500);
  const [isResizing, setIsResizing] = useState<'sidebar' | 'request' | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const storedCreds = localStorage.getItem('volc_playground_creds');
    if (storedCreds) {
      try { setCredentials(JSON.parse(storedCreds)); } catch(e){}
    }
    const storedProxy = localStorage.getItem('volc_playground_proxy');
    if (storedProxy) setProxyUrl(storedProxy);
    
    const storedConfig = localStorage.getItem('volc_playground_config');
    if (storedConfig) {
        try {
            const config = JSON.parse(storedConfig);
            if (config.groups && config.services) {
                setGroups(config.groups);
                setServices(config.services);
                // Select first service if available
                if (config.services.length > 0) {
                    setSelectedServiceId(config.services[0].id);
                }
            }
        } catch(e){}
    }
  }, []);

  // Check for default.json and handle updates
  useEffect(() => {
    const checkDefaultConfig = async () => {
      try {
        const res = await fetch('./default.json');
        if (!res.ok) return;
        
        const configText = await res.text();
        const currentHash = simpleHash(configText);
        const lastHash = localStorage.getItem('volc_playground_default_hash');
        
        // If we've already seen this exact version of default.json (accepted or rejected), do nothing
        if (currentHash === lastHash) return;

        const config = JSON.parse(configText);
        if (!config.groups || !config.services) return;

        const hasLocalConfig = localStorage.getItem('volc_playground_config');

        // If no local config, apply default.json immediately (First run)
        if (!hasLocalConfig) {
           applyConfig(config);
           localStorage.setItem('volc_playground_default_hash', currentHash);
           return;
        }

        // If local config exists but a new default.json is detected, prompt user
        setPendingConfig({ config, hash: currentHash });
        setShowUpdatePrompt(true);

      } catch (e) {
        console.error("Failed to check default.json", e);
      }
    };

    checkDefaultConfig();
  }, []);

  // Auto-save config
  useEffect(() => {
      const config = { groups, services };
      localStorage.setItem('volc_playground_config', JSON.stringify(config));
  }, [groups, services]);

  const applyConfig = (config: any) => {
      if (config.groups) setGroups(config.groups);
      if (config.services) {
          setServices(config.services);
          if (config.services.length > 0) {
              setSelectedServiceId(config.services[0].id);
          }
      }
      if (config.credentials) {
          setCredentials(config.credentials);
          localStorage.setItem('volc_playground_creds', JSON.stringify(config.credentials));
      }
  };

  const handleConfirmUpdate = () => {
      if (pendingConfig) {
          applyConfig(pendingConfig.config);
          localStorage.setItem('volc_playground_default_hash', pendingConfig.hash);
          setShowUpdatePrompt(false);
          
          // Show summary of what changed
          setImportSummary({
              serviceCount: pendingConfig.config.services.length,
              groupCount: pendingConfig.config.groups.length,
              hasCredentials: !!pendingConfig.config.credentials,
              serviceNames: pendingConfig.config.services.map((s: any) => s.name)
          });
          setPendingConfig(null);
      }
  };

  const handleCancelUpdate = () => {
      if (pendingConfig) {
          // Mark this hash as seen so we don't prompt again for this specific update
          localStorage.setItem('volc_playground_default_hash', pendingConfig.hash);
          setShowUpdatePrompt(false);
          setPendingConfig(null);
      }
  };

  // --- Resizing Logic ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      if (isResizing === 'sidebar') {
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        setSidebarWidth(newWidth);
      } else if (isResizing === 'request') {
        const offset = e.clientX - sidebarWidth;
        const maxW = window.innerWidth - sidebarWidth - 300; 
        const newWidth = Math.max(480, Math.min(maxW, offset));
        setRequestPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);


  const handleSaveCredentials = (creds: Credentials) => {
    setCredentials(creds);
    localStorage.setItem('volc_playground_creds', JSON.stringify(creds));
  };

  const handleSaveProxy = (url: string) => {
      setProxyUrl(url);
      localStorage.setItem('volc_playground_proxy', url);
  };

  // -- Data Manipulation Handlers --
  const handleAddGroup = () => {
    const newGroup: ServiceGroup = { id: `g_${Date.now()}`, name: 'New Group', collapsed: false };
    setGroups([...groups, newGroup]);
  };

  const handleRenameGroup = (id: string, name: string) => {
    setGroups(groups.map(g => g.id === id ? { ...g, name } : g));
  };

  const handleDeleteGroup = (id: string) => {
      setGroups(groups.filter(g => g.id !== id));
      const newServices = services.filter(s => s.groupId !== id);
      setServices(newServices);
      if (selectedServiceId && services.find(s => s.id === selectedServiceId)?.groupId === id) {
          if (newServices.length > 0) setSelectedServiceId(newServices[0].id);
          else setSelectedServiceId('');
      }
  };

  const handleToggleGroup = (id: string) => {
      setGroups(groups.map(g => g.id === id ? { ...g, collapsed: !g.collapsed } : g));
  };

  const handleAddService = (groupId: string) => {
    const newService: ApiService = {
      ...DEFAULT_SERVICES[0],
      id: `s_${Date.now()}`,
      groupId,
      name: 'New Service',
      params: DEFAULT_SERVICES[0].params.map(p => ({...p, id: `p_${Date.now()}_${Math.random()}`, enabled: true}))
    };
    setServices([...services, newService]);
    setSelectedServiceId(newService.id);
  };

  const handleDeleteService = (id: string) => {
    const newServices = services.filter(s => s.id !== id);
    setServices(newServices);
    if (selectedServiceId === id) {
        const deletedService = services.find(s => s.id === id);
        const groupServices = newServices.filter(s => s.groupId === deletedService?.groupId);
        if (groupServices.length > 0) {
            setSelectedServiceId(groupServices[0].id);
        } else if (newServices.length > 0) {
            setSelectedServiceId(newServices[0].id);
        } else {
            setSelectedServiceId('');
        }
    }
  };

  const handleUpdateService = (updated: ApiService) => {
    setServices(services.map(s => s.id === updated.id ? updated : s));
  };

  const handleMoveService = (serviceId: string, targetGroupId: string) => {
      setServices(services.map(s => s.id === serviceId ? { ...s, groupId: targetGroupId } : s));
  };

  const handleReorderService = (sourceId: string, targetId: string, position: 'before' | 'after') => {
    const sourceIndex = services.findIndex(s => s.id === sourceId);
    if (sourceIndex === -1) return;
    const newServices = [...services];
    const [moved] = newServices.splice(sourceIndex, 1);
    const targetIndex = newServices.findIndex(s => s.id === targetId);
    if (targetIndex === -1) {
        newServices.push(moved);
    } else {
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        const targetService = services.find(s => s.id === targetId);
        if (targetService && moved.groupId !== targetService.groupId) {
            moved.groupId = targetService.groupId;
        }
        newServices.splice(insertIndex, 0, moved);
    }
    setServices(newServices);
  };

  const handleReorderGroup = (sourceId: string, targetId: string, position: 'before' | 'after') => {
    const sourceIndex = groups.findIndex(g => g.id === sourceId);
    if (sourceIndex === -1) return;
    const newGroups = [...groups];
    const [moved] = newGroups.splice(sourceIndex, 1);
    const targetIndex = newGroups.findIndex(g => g.id === targetId);
    if (targetIndex === -1) {
        newGroups.push(moved);
    } else {
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        newGroups.splice(insertIndex, 0, moved);
    }
    setGroups(newGroups);
  };

  // -- Import / Export --
  const handleExportConfig = (includeCredentials: boolean) => {
    const config: any = { groups, services, version: 1 };
    if (includeCredentials) {
        config.credentials = credentials;
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volc_playground_config_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const config = JSON.parse(content);
            if (Array.isArray(config.groups) && Array.isArray(config.services)) {
                // Ensure params have 'enabled' prop for backward compatibility
                if (config.services) {
                    config.services = config.services.map((s: any) => ({
                        ...s,
                        params: s.params.map((p: any) => ({
                            ...p,
                            enabled: p.enabled !== undefined ? p.enabled : true
                        }))
                    }));
                }
                // Open Mode Selection Modal first
                setImportModeData(config);
                setShowSettings(false); 
            } else {
                alert('Invalid configuration format');
            }
        } catch (err) {
            alert('Failed to parse configuration file');
        }
    };
    reader.readAsText(file);
  };

  const handleImportModeSelect = (mode: 'overwrite' | 'merge', importCreds: boolean) => {
      if (!importModeData) return;

      if (mode === 'overwrite') {
          // Full Replacement Logic
          setGroups(importModeData.groups);
          setServices(importModeData.services);
          if (importModeData.services.length > 0) {
              setSelectedServiceId(importModeData.services[0].id);
          } else {
              setSelectedServiceId('');
          }

          let credsUpdated = false;
          if (importCreds && importModeData.credentials) {
              setCredentials(importModeData.credentials);
              localStorage.setItem('volc_playground_creds', JSON.stringify(importModeData.credentials));
              credsUpdated = true;
          }

          setImportSummary({
              serviceCount: importModeData.services.length,
              groupCount: importModeData.groups.length,
              hasCredentials: credsUpdated,
              serviceNames: importModeData.services.map((s: any) => s.name)
          });
          setImportModeData(null); // Close modal

      } else {
          // Merge Logic: Proceed to Selection Modal
          // Pass the credential decision to the next step via state or handle it later
          setPendingImportCreds(importCreds);
          setImportSelectionData(importModeData);
          setImportModeData(null); // Close mode modal, open selection modal
      }
  };

  const handleConfirmImportSelection = (selectedIndices: number[]) => {
    if (!importSelectionData) return;
    
    const selectedServices = selectedIndices.map(i => importSelectionData.services[i]);
    const { groups: importedGroups, credentials: importedCreds } = importSelectionData;

    // 1. Merge Groups
    const newGroups = [...groups];
    importedGroups.forEach((impG: ServiceGroup) => {
        const existingGIndex = newGroups.findIndex(g => g.id === impG.id);
        if (existingGIndex === -1) {
            newGroups.push(impG);
        }
    });

    // 2. Merge Services
    const newServices = [...services];
    let addedCount = 0;
    let updatedCount = 0;

    selectedServices.forEach((impS: ApiService) => {
        // Match by Name as requested
        const existingIndex = newServices.findIndex(s => s.name === impS.name);
        
        if (existingIndex >= 0) {
            // UPDATE: Keep local ID, overwrite content
            const existingId = newServices[existingIndex].id;
            newServices[existingIndex] = { ...impS, id: existingId };
            updatedCount++;
        } else {
            // ADD: Check ID collision. 
            let newId = impS.id;
            if (newServices.some(s => s.id === newId)) {
                 newId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            newServices.push({ ...impS, id: newId });
            addedCount++;
        }
    });

    setGroups(newGroups);
    setServices(newServices);
    
    // Apply Credentials if selected in the previous Mode modal
    let credsUpdated = false;
    if (pendingImportCreds && importedCreds) {
        setCredentials(importedCreds);
        localStorage.setItem('volc_playground_creds', JSON.stringify(importedCreds));
        credsUpdated = true;
    }

    setImportSelectionData(null);
    setPendingImportCreds(false);

    // Show Summary
    setImportSummary({
        serviceCount: addedCount + updatedCount,
        groupCount: newGroups.length, 
        hasCredentials: credsUpdated,
        serviceNames: selectedServices.map((s: ApiService) => s.name)
    });
  };

  // -- HTTP Logic --

  const makeRequest = async (service: ApiService, action: string, version: string, method: string, payload: any, signal?: AbortSignal) => {
      const queryParams = {
        Action: action,
        Version: version,
      };

      const bodyString = JSON.stringify(payload);

      const signatureHeaders = signRequest({
        method: method,
        pathname: '/', 
        params: queryParams,
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyString,
        region: service.region,
        serviceName: service.serviceName,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      });

      let fetchUrl = service.endpoint;
      if (proxyUrl) {
        fetchUrl = `${proxyUrl}${service.endpoint}`;
      }

      const url = new URL(fetchUrl);
      Object.entries(queryParams).forEach(([k, v]) => url.searchParams.append(k, v));

      return fetch(url.toString(), {
        method: method,
        headers: signatureHeaders,
        body: bodyString,
        signal: signal,
      });
  };

  const selectedService = services.find(s => s.id === selectedServiceId);

  const handleStopRequest = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      setLoading(false);
      setResponseData(prev => prev ? { ...prev, isPolling: false } : null);
  };

  const handleSendRequest = async () => {
    if (!selectedService) return;
    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      setSettingsInitialTab('credentials');
      setShowSettings(true);
      return;
    }

    // --- VALIDATION START ---
    // Check for empty file/string conversions - ONLY enabled params
    const pendingFiles = selectedService.params.filter(p => p.enabled !== false && p.type === 'file' && (!p.value || String(p.value).trim() === ''));
    if (pendingFiles.length > 0) {
        alert(`Parameter "${pendingFiles[0].key}" has a file selected but not converted or empty. Please click "To URL" or "To Base64" before running the request.`);
        return;
    }
    // --- VALIDATION END ---

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    
    // Create a local controller for this specific request session
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setResponseData(null);
    const startTime = Date.now();

    try {
      const payload: Record<string, any> = {};
      selectedService.params.forEach(p => {
         // Skip disabled params
         if (p.enabled === false) return;

         if (p.type === 'json' && typeof p.value === 'string') {
            try { payload[p.key] = JSON.parse(p.value); } catch { payload[p.key] = p.value; }
         } else {
             let val = p.value;
             
             // Special handling for File type: 
             // If value looks like a JSON array string (from multiple file uploads), parse it back to array
             if (p.type === 'file' && typeof val === 'string') {
                 try {
                     const parsed = JSON.parse(val);
                     if (Array.isArray(parsed)) val = parsed;
                 } catch {}
             }

             // Auto-wrap image_urls and binary_data_base64 if they are SINGLE strings
             if ((p.key === 'image_urls' || p.key === 'binary_data_base64') && typeof val === 'string') {
                 val = [val];
             }
             payload[p.key] = val;
         }
      });

      const res = await makeRequest(
          selectedService, 
          selectedService.action, 
          selectedService.version, 
          selectedService.method, 
          payload,
          controller.signal // Pass signal explicitly
      );

      const data = await res.json();
      const duration = Date.now() - startTime;
      
      setResponseData({
        status: res.status,
        statusText: res.statusText,
        headers: {}, 
        body: data,
        timestamp: duration,
        isPolling: false
      });

      if (!res.ok) {
          throw new Error(data?.ResponseMetadata?.Error?.Message || `HTTP Error ${res.status}`);
      }

      if (selectedService.asyncConfig?.enabled) {
          const config = selectedService.asyncConfig;
          const taskId = getValueByPath(data, config.submitResponseIdPath);
          
          if (!taskId) {
              throw new Error(`Async enabled, but could not find ID at '${config.submitResponseIdPath}' in response.`);
          }

          setResponseData(prev => prev ? { ...prev, isPolling: true } : null);
          
          const maxDuration = (config.timeoutSeconds || 120) * 1000;
          const pollStartTime = Date.now();

          const pollLoop = async () => {
              // Check timeout
              if (Date.now() - pollStartTime > maxDuration) {
                  setError(`Polling timed out after ${config.timeoutSeconds || 120} seconds.`);
                  setLoading(false);
                  setResponseData(prev => prev ? { ...prev, isPolling: false } : null);
                  return;
              }

              // Check cancellation using the local controller variable
              if (controller.signal.aborted) {
                  return;
              }

              await new Promise(resolve => setTimeout(resolve, config.pollInterval));
              
              // Check cancellation again after wait
              if (controller.signal.aborted) {
                  return;
              }

              try {
                  const pollPayload: Record<string, any> = {
                      [config.pollIdParamKey]: taskId
                  };
                  
                  // Inherit Params
                  if (config.inheritParams) {
                      Object.assign(pollPayload, payload);
                  }

                  // Static Params from JSON
                  if (config.staticParamsJson) {
                      try {
                          const staticParams = JSON.parse(config.staticParamsJson);
                          Object.assign(pollPayload, staticParams);
                      } catch (e) {
                          console.error("Failed to parse staticParamsJson", e);
                      }
                  }

                  const pollRes = await makeRequest(
                      selectedService,
                      config.pollAction,
                      config.pollVersion,
                      config.pollMethod,
                      pollPayload,
                      controller.signal // Pass signal explicitly
                  );

                  const pollData = await pollRes.json();
                  const pollDuration = Date.now() - startTime;
                  const status = getValueByPath(pollData, config.pollStatusPath);

                  setResponseData({
                      status: pollRes.status,
                      statusText: pollRes.statusText,
                      headers: {},
                      body: pollData,
                      timestamp: pollDuration,
                      isPolling: true
                  });

                  if (status === config.pollSuccessValue) {
                      setLoading(false);
                      setResponseData(prev => prev ? { ...prev, isPolling: false } : null);
                  } else if (config.pollFailedValue && status === config.pollFailedValue) {
                      let errorMsg = `Async Task Failed: Status '${status}'`;
                      if (config.pollErrorPath) {
                          const extractedErr = getValueByPath(pollData, config.pollErrorPath);
                          if (extractedErr) errorMsg += `: ${extractedErr}`;
                      }
                      setError(errorMsg);
                      setLoading(false);
                      setResponseData(prev => prev ? { ...prev, isPolling: false } : null);
                  } else {
                      pollLoop();
                  }

              } catch (err: any) {
                  if (err.name === 'AbortError') return;
                  console.error("Polling Error", err);
                  setError(`Polling Error: ${err.message}`);
                  setLoading(false);
                  setResponseData(prev => prev ? { ...prev, isPolling: false } : null);
              }
          };
          
          pollLoop();
      } else {
          setLoading(false);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
          console.log('Request Aborted');
          return;
      }
      console.error(err);
      let msg = err.message;
      if (msg === 'Failed to fetch') {
          msg = 'Network Error: Failed to fetch. This is likely a CORS issue. Please configure a Proxy in Settings (Gear Icon -> Network) or ensure the endpoint supports CORS.';
      }
      setError(msg);
      setLoading(false);
      setResponseData(prev => prev ? { ...prev, isPolling: false } : null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-slate-900 overflow-hidden">
      {/* Sidebar Area */}
      <div 
        style={{ width: sidebarWidth }} 
        className="flex-shrink-0 relative h-full"
      >
        <Sidebar
            groups={groups}
            services={services}
            selectedId={selectedServiceId}
            onSelect={setSelectedServiceId}
            onAddService={handleAddService}
            onAddGroup={handleAddGroup}
            onDeleteService={handleDeleteService}
            onDeleteGroup={handleDeleteGroup}
            onOpenGlobalSettings={() => {
                setSettingsInitialTab('general');
                setShowSettings(true);
            }}
            onOpenServiceSettings={(id) => setShowServiceSettings(id)}
            onToggleGroup={handleToggleGroup}
            onRenameGroup={handleRenameGroup}
            onMoveService={handleMoveService}
            onReorderService={handleReorderService}
            onReorderGroup={handleReorderGroup}
        />
        <div 
            className="absolute right-[-3px] top-0 w-[6px] h-full cursor-col-resize hover:bg-indigo-500 transition-colors z-50 opacity-0 hover:opacity-100"
            onMouseDown={(e) => { e.preventDefault(); setIsResizing('sidebar'); }}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {selectedService ? (
            <>
                <div 
                    style={{ width: requestPanelWidth }} 
                    className="border-r border-gray-200 h-full flex flex-col min-w-[300px] flex-shrink-0 relative"
                >
                    <RequestPanel
                        service={selectedService}
                        onUpdateService={handleUpdateService}
                        onSend={handleSendRequest}
                        onStop={handleStopRequest}
                        loading={loading}
                        corsProxy={proxyUrl}
                    />
                    <div 
                        className="absolute right-[-3px] top-0 w-[6px] h-full cursor-col-resize hover:bg-indigo-500 transition-colors z-50 opacity-0 hover:opacity-100"
                        onMouseDown={(e) => { e.preventDefault(); setIsResizing('request'); }}
                    />
                </div>

                <div className="flex-1 h-full flex flex-col min-w-[300px]">
                    <ResponsePanel
                        response={responseData}
                        error={error}
                        loading={loading}
                    />
                </div>
            </>
        ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
                Select or create a service to start
            </div>
        )}
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        credentials={credentials}
        onSave={handleSaveCredentials}
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
        proxyUrl={proxyUrl}
        onSaveProxy={handleSaveProxy}
        initialTab={settingsInitialTab}
      />

      <ServiceSettingsModal
        isOpen={!!showServiceSettings}
        onClose={() => setShowServiceSettings(null)}
        service={services.find(s => s.id === showServiceSettings) || null}
        groups={groups}
        onSave={handleUpdateService}
        onDelete={handleDeleteService}
      />

      <ImportSummaryModal 
        isOpen={!!importSummary}
        onClose={() => setImportSummary(null)}
        summary={importSummary}
      />

      <ImportModeModal 
        isOpen={!!importModeData}
        onClose={() => setImportModeData(null)}
        serviceCount={importModeData?.services?.length || 0}
        hasCredentialsInFile={!!importModeData?.credentials?.accessKeyId}
        onSelectMode={handleImportModeSelect}
      />

      <ImportSelectionModal
        isOpen={!!importSelectionData}
        onClose={() => setImportSelectionData(null)}
        importData={importSelectionData}
        existingServices={services}
        onConfirm={handleConfirmImportSelection}
      />

      <ConfirmDialog 
        isOpen={showUpdatePrompt}
        title="Configuration Update Found"
        message="There is the latest archive file, do you want to update?"
        onConfirm={handleConfirmUpdate}
        onCancel={handleCancelUpdate}
      />
    </div>
  );
};

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
}

export default App;