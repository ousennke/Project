import CryptoJS from 'crypto-js';

interface SignOptions {
  method: string;
  pathname: string;
  params: Record<string, any>;
  headers: Record<string, string>;
  body?: any;
  region: string;
  serviceName: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

// Constants adapted from the script
const UNSIGNABLE_HEADERS = [
  'authorization',
  'content-type',
  'content-length',
  'user-agent',
  'presigned-expires',
  'expect',
  'x-amzn-trace-id',
];

const CONSTANTS = {
  algorithm: 'HMAC-SHA256',
  v4Identifier: 'request',
  dateHeader: 'X-Date',
  tokenHeader: 'x-security-token',
  contentSha256Header: 'X-Content-Sha256',
  kDatePrefix: '', // Volcengine doesn't use "AWS4" prefix for kDate usually, referencing the provided script
};

// Helper functions
const uriEscape = (str: string): string => {
  try {
    return encodeURIComponent(str)
      .replace(/[^A-Za-z0-9_.~\-%]+/g, (match) => {
        // This mimics the escape function behavior for specific chars
        return match.split('').map(c => '%' + c.charCodeAt(0).toString(16).toUpperCase()).join('');
      })
      .replace(
        /[*]/g,
        (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
      );
  } catch (e) {
    return '';
  }
};

const queryParamsToString = (params: Record<string, any>, sort = true): string => {
  const keys = Object.keys(params);
  if (sort) keys.sort();
  
  return keys
    .map((key) => {
      const val = params[key];
      if (typeof val === 'undefined' || val === null) return '';

      const escapedKey = uriEscape(key);
      if (!escapedKey) return '';

      if (Array.isArray(val)) {
        return `${escapedKey}=${val
          .map(String)
          .map(uriEscape)
          .sort()
          .join(`&${escapedKey}=`)}`;
      }

      return `${escapedKey}=${uriEscape(String(val))}`;
    })
    .filter((v) => v)
    .join('&');
};

const hmac = (key: string | CryptoJS.lib.WordArray, string: string) => {
  return CryptoJS.HmacSHA256(string, key);
};

const sha256 = (data: string) => {
  return CryptoJS.SHA256(data);
};

const iso8601 = (date: Date = new Date()) => {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

// Core Signature Class Logic adapted
class VolcSigner {
  options: SignOptions;
  timestamp: string;
  dateStr: string;

  constructor(options: SignOptions) {
    this.options = options;
    const now = new Date();
    this.timestamp = iso8601(now).replace(/[:\-]|\.\d{3}/g, ''); // YYYYMMDDTHHmmssZ
    this.dateStr = this.timestamp.substr(0, 8); // YYYYMMDD
  }

  getSignatureHeaders(): Record<string, string> {
    // 1. Prepare Headers
    const headers: Record<string, string> = { ...this.options.headers };
    
    headers[CONSTANTS.dateHeader] = this.timestamp;
    if (this.options.sessionToken) {
      headers[CONSTANTS.tokenHeader] = this.options.sessionToken;
    }

    // Calculate Body Hash
    let bodyStr = '';
    if (this.options.body) {
        if (typeof this.options.body === 'string') {
            bodyStr = this.options.body;
        } else {
            bodyStr = JSON.stringify(this.options.body);
        }
    }
    headers[CONSTANTS.contentSha256Header] = sha256(bodyStr).toString(CryptoJS.enc.Hex);

    // 2. Canonical String
    const canonicalString = this.createCanonicalString(headers, bodyStr);

    // 3. String to Sign
    const credentialScope = [this.dateStr, this.options.region, this.options.serviceName, CONSTANTS.v4Identifier].join('/');
    const stringToSign = [
      CONSTANTS.algorithm,
      this.timestamp,
      credentialScope,
      sha256(canonicalString).toString(CryptoJS.enc.Hex)
    ].join('\n');

    // 4. Signing Key
    const kDate = hmac(CONSTANTS.kDatePrefix + this.options.secretAccessKey, this.dateStr);
    const kRegion = hmac(kDate, this.options.region);
    const kService = hmac(kRegion, this.options.serviceName);
    const signingKey = hmac(kService, CONSTANTS.v4Identifier);

    // 5. Signature
    const signature = hmac(signingKey, stringToSign).toString(CryptoJS.enc.Hex);

    // 6. Authorization Header
    const signedHeaders = this.getSignedHeaders(headers);
    const authHeader = `${CONSTANTS.algorithm} Credential=${this.options.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      ...headers,
      'Authorization': authHeader
    };
  }

  private createCanonicalString(headers: Record<string, string>, bodyStr: string): string {
    const parts = [];
    parts.push(this.options.method.toUpperCase());
    parts.push(this.options.pathname || '/');
    parts.push(queryParamsToString(this.options.params) || '');
    parts.push(this.getCanonicalHeaders(headers) + '\n');
    parts.push(this.getSignedHeaders(headers));
    parts.push(headers[CONSTANTS.contentSha256Header] || sha256(bodyStr).toString(CryptoJS.enc.Hex));
    return parts.join('\n');
  }

  private getCanonicalHeaders(headers: Record<string, string>): string {
    const sortedKeys = Object.keys(headers)
        .map(k => k.toLowerCase())
        .sort();
    
    // Create map for easy lookup of original values (case insensitive match)
    const headerMap: Record<string, string> = {};
    Object.keys(headers).forEach(k => {
        headerMap[k.toLowerCase()] = headers[k].toString().trim().replace(/\s+/g, ' ');
    });

    return sortedKeys
        .filter(k => !UNSIGNABLE_HEADERS.includes(k))
        .map(k => `${k}:${headerMap[k]}`)
        .join('\n');
  }

  private getSignedHeaders(headers: Record<string, string>): string {
    return Object.keys(headers)
        .map(k => k.toLowerCase())
        .filter(k => !UNSIGNABLE_HEADERS.includes(k))
        .sort()
        .join(';');
  }
}

export const signRequest = (options: SignOptions): Record<string, string> => {
  const signer = new VolcSigner(options);
  return signer.getSignatureHeaders();
};
