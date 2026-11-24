import net from 'node:net';

export interface ValidatedUrlResult {
  valid: boolean;
  normalizedUrl?: string;
  hostname?: string;
  merchantName?: string;
  isSupportedMerchant: boolean;
  error?: string;
}

const SUPPORTED_MERCHANTS: Array<{ suffix: string; name: string }> = [
  { suffix: 'amazon.in', name: 'Amazon India' },
  { suffix: 'amazon.com', name: 'Amazon US' },
  { suffix: 'amzn.in', name: 'Amazon India' },
  { suffix: 'flipkart.com', name: 'Flipkart' },
  { suffix: 'croma.com', name: 'Croma' },
  { suffix: 'reliancedigital.in', name: 'Reliance Digital' },
  { suffix: 'myntra.com', name: 'Myntra' },
  { suffix: 'ajio.com', name: 'AJIO' },
  { suffix: 'meesho.com', name: 'Meesho' },
  { suffix: 'ebay.com', name: 'eBay' },
  { suffix: 'walmart.com', name: 'Walmart' },
  { suffix: 'bestbuy.com', name: 'Best Buy' },
  { suffix: 'apple.com', name: 'Apple Official' },
  { suffix: 'samsung.com', name: 'Samsung Official' },
  { suffix: 'lenovo.com', name: 'Lenovo Official' },
  { suffix: 'dell.com', name: 'Dell Official' },
  { suffix: 'sony.co.in', name: 'Sony India' },
  { suffix: 'sony.com', name: 'Sony Official' },
  { suffix: 'nike.com', name: 'Nike Official' },
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
  '169.254.169.254',
]);

export function isPrivateOrReservedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    const parts = ip.split('.').map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
    if (lower.startsWith('::ffff:')) {
      const mapped = lower.slice('::ffff:'.length);
      return isPrivateOrReservedIp(mapped);
    }
    return false;
  }
  return false;
}

export function validateProductUrl(rawUrl: string): ValidatedUrlResult {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, isSupportedMerchant: false, error: 'Please provide a product URL.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      isSupportedMerchant: false,
      error: 'Invalid URL format. Include https:// (e.g., https://www.amazon.in/...).',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      isSupportedMerchant: false,
      error: 'Only http:// and https:// product URLs are permitted.',
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      isSupportedMerchant: false,
      error: 'URLs containing embedded credentials are not allowed.',
    };
  }

  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return {
      valid: false,
      isSupportedMerchant: false,
      error: 'Non-standard network ports are blocked for security.',
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return {
      valid: false,
      isSupportedMerchant: false,
      error: 'Local or internal network addresses are blocked.',
    };
  }

  if (net.isIP(hostname) !== 0) {
    if (isPrivateOrReservedIp(hostname)) {
      return {
        valid: false,
        isSupportedMerchant: false,
        error: 'Private, loopback, and metadata IP addresses are blocked.',
      };
    }
    return {
      valid: false,
      isSupportedMerchant: false,
      error: 'Direct IP address URLs are not recognized shopping storefronts. Use a merchant domain.',
    };
  }

  if (!hostname.includes('.')) {
    return {
      valid: false,
      isSupportedMerchant: false,
      error: 'Hostname must be a valid public domain.',
    };
  }

  const matched = SUPPORTED_MERCHANTS.find(
    (m) => hostname === m.suffix || hostname.endsWith(`.${m.suffix}`),
  );

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    hostname,
    merchantName: matched?.name ?? hostname,
    isSupportedMerchant: Boolean(matched),
  };
}
