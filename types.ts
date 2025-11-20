
export interface ApiParam {
  id: string;
  key: string;
  value: string | number | boolean | object;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'json' | 'image';
  description?: string;
  required?: boolean;
  // Image specific config
  enableUrlConversion?: boolean;
  enableBase64Conversion?: boolean;
  enableMultiImage?: boolean;
}

export interface ServiceGroup {
  id: string;
  name: string;
  collapsed: boolean;
}

export interface AsyncConfig {
  enabled: boolean;
  pollAction: string; // e.g., CVSync2AsyncGetResult
  pollVersion: string; // e.g., 2022-08-31
  pollMethod: 'POST' | 'GET';
  
  // How to find the ID in the submit response
  submitResponseIdPath: string; // e.g., data.task_id
  
  // How to send the ID in the poll request
  pollIdParamKey: string; // e.g., task_id
  
  // Status check
  pollStatusPath: string; // e.g., data.status
  pollSuccessValue: string; // e.g., done
  pollFailedValue?: string; // e.g., failed
  pollErrorPath?: string; // e.g., data.error_message
  
  // Extra params needed for polling (e.g. req_key)
  staticParamsJson: string; // JSON string for static params
  inheritParams?: boolean; // If true, merge submit params into poll request
  
  pollInterval: number; // ms, default 2000
  timeoutSeconds: number; // seconds, default 120
  maxRetries: number; // default 60 (can be derived from timeout/interval, but kept for compatibility if needed)
}

export interface ApiService {
  id: string;
  groupId: string;
  name: string;
  serviceName: string; // e.g., "cv"
  description?: string;
  version: string; // e.g., "2022-08-31"
  action: string; // e.g., "HighAesSmartDrawing"
  endpoint: string; // e.g., "https://visual.volcengineapi.com"
  region: string; // e.g., "cn-north-1"
  docUrl?: string;
  params: ApiParam[];
  method: 'POST' | 'GET';
  asyncConfig?: AsyncConfig;
}

export interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
  isPolling?: boolean; // UI state for async
}

export enum ContentType {
  JSON = 'application/json',
  FORM = 'application/x-www-form-urlencoded',
}
