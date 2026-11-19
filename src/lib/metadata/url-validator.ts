/**
 * DevVault — URL Validator & SSRF Protection
 * 
 * Comprehensive URL sanitization, protocol restriction, port checking,
 * IP range blacklists, IPv4-mapped IPv6 decoding, and DNS resolution.
 */

import dns from 'dns';
import net from 'net';
import { InvalidURLError, SSRFError } from './errors';

/**
 * Standard allowed ports for public web resources.
 */
const ALLOWED_PORTS = new Set(['', '80', '443']);

/**
 * Blocked hostnames known to resolve internally or to cloud metadata services.
 */
const FORBIDDEN_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
  '[::1]',
  '[::]',
  '0:0:0:0:0:0:0:1',
  '0:0:0:0:0:0:0:0',
  '[0:0:0:0:0:0:0:1]',
  '[0:0:0:0:0:0:0:0]',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'metadata.internal',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

/**
 * Check if an IPv4 address is in private, loopback, link-local, or reserved ranges.
 */
export function isForbiddenIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 treated as forbidden
  }

  const [b0, b1, b2, b3] = parts;
  const num = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;

  // 0.0.0.0/8 (Current network / default route)
  if ((num >>> 24) === 0) return true;

  // 10.0.0.0/8 (Private network RFC 1918)
  if ((num >>> 24) === 10) return true;

  // 100.64.0.0/10 (Carrier-grade NAT RFC 6598: 100.64.0.0 - 100.127.255.255)
  if ((num >>> 22) === 401) return true;

  // 127.0.0.0/8 (Loopback RFC 1122)
  if ((num >>> 24) === 127) return true;

  // 169.254.0.0/16 (Link-local RFC 3927, includes cloud metadata 169.254.169.254)
  if ((num >>> 16) === ((169 << 8) | 254)) return true;

  // 172.16.0.0/12 (Private network RFC 1918: 172.16.0.0 - 172.31.255.255)
  if ((num >>> 20) === ((172 << 4) | 1)) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments RFC 6890)
  if ((num >>> 8) === ((192 << 16) | (0 << 8) | 0)) return true;

  // 192.0.2.0/24 (TEST-NET-1 RFC 5737)
  if ((num >>> 8) === ((192 << 16) | (0 << 8) | 2)) return true;

  // 192.88.99.0/24 (6to4 Relay Anycast RFC 3068)
  if ((num >>> 8) === ((192 << 16) | (88 << 8) | 99)) return true;

  // 192.168.0.0/16 (Private network RFC 1918)
  if ((num >>> 16) === ((192 << 8) | 168)) return true;

  // 198.18.0.0/15 (Network benchmark tests RFC 2544: 198.18.0.0 - 198.19.255.255)
  if ((num >>> 17) === ((198 << 7) | (18 >>> 1))) return true;

  // 198.51.100.0/24 (TEST-NET-2 RFC 5737)
  if ((num >>> 8) === ((198 << 16) | (51 << 8) | 100)) return true;

  // 203.0.113.0/24 (TEST-NET-3 RFC 5737)
  if ((num >>> 8) === ((203 << 16) | (0 << 8) | 113)) return true;

  // 224.0.0.0/4 (Multicast RFC 5771: 224.0.0.0 - 239.255.255.255)
  // 240.0.0.0/4 (Reserved RFC 1112: 240.0.0.0 - 255.255.255.255)
  if ((num >>> 28) >= 14) return true;

  // Alibaba Cloud metadata service
  if (b0 === 100 && b1 === 100 && b2 === 100 && b3 === 200) return true;

  return false;
}

/**
 * Check if an IPv6 address is in private, loopback, link-local, or reserved ranges.
 * Fully handles both dotted-decimal and hexadecimal IPv4-mapped forms, 6to4, and Teredo.
 */
export function isForbiddenIPv6(ip: string): boolean {
  let normalized = ip.toLowerCase().trim();
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    normalized = normalized.slice(1, -1);
  }

  // Unspecified (::)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // Loopback (::1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // IPv4-mapped IPv6 address (::ffff:0:0/96)
  if (normalized.startsWith('::ffff:') || normalized.startsWith('0:0:0:0:0:ffff:')) {
    const mapped = normalized.startsWith('::ffff:')
      ? normalized.slice(7)
      : normalized.slice(15);

    // Case 1: Dotted decimal (e.g. ::ffff:127.0.0.1)
    if (net.isIPv4(mapped)) {
      return isForbiddenIPv4(mapped);
    }

    // Case 2: Hexadecimal pairs (e.g. ::ffff:7f00:1 or ::ffff:a9fe:a9fe)
    const hexParts = mapped.split(':');
    if (hexParts.length === 2) {
      const w1 = parseInt(hexParts[0], 16);
      const w2 = parseInt(hexParts[1], 16);
      if (!isNaN(w1) && !isNaN(w2) && w1 >= 0 && w1 <= 0xffff && w2 >= 0 && w2 <= 0xffff) {
        const b0 = (w1 >> 8) & 0xff;
        const b1 = w1 & 0xff;
        const b2 = (w2 >> 8) & 0xff;
        const b3 = w2 & 0xff;
        return isForbiddenIPv4(`${b0}.${b1}.${b2}.${b3}`);
      }
    }
    return true; // Malformed IPv4-mapped treated as forbidden
  }

  // Unique Local Addresses (fc00::/7 -> fc00:: through fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-Local Unicast (fe80::/10 -> fe80:: through febf::)
  if (/^fe[89ab]/i.test(normalized)) return true;

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) return true;

  // Discard Prefix (100::/64)
  if (normalized.startsWith('100:') || normalized.startsWith('100::')) return true;

  // Documentation Prefix (2001:db8::/32)
  if (normalized.startsWith('2001:db8:') || normalized.startsWith('2001:0db8:')) return true;

  // Teredo tunneling (2001:0000::/32 RFC 4380 - embeds IPv4)
  if (normalized.startsWith('2001:0:') || normalized.startsWith('2001:0000:')) return true;

  // 6to4 Anycast / Deprecated (2002::/16 RFC 7526 - embeds IPv4)
  if (normalized.startsWith('2002:')) return true;

  return false;
}

/**
 * Check if an IP address (v4 or v6) is forbidden.
 */
export function isForbiddenIP(ip: string): boolean {
  let clean = ip.trim();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1);
  }

  const family = net.isIP(clean);
  if (family === 4) {
    return isForbiddenIPv4(clean);
  } else if (family === 6) {
    return isForbiddenIPv6(clean);
  }
  return true; // Not a valid IP format
}

/**
 * Validates a raw URL string against format, protocol, port, credentials, and known dangerous hosts.
 * Returns the parsed URL object.
 */
export function validateUrlStructure(rawUrl: string): URL {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new InvalidURLError('URL parameter must be a non-empty string.');
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InvalidURLError('The provided string is not a valid URL.');
  }

  // Protocol check: only http: and https: allowed
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InvalidURLError(`Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are allowed.`);
  }

  // Reject credentials in URL (e.g. http://user:pass@host)
  if (parsed.username || parsed.password) {
    throw new InvalidURLError('URLs containing embedded credentials are not permitted.');
  }

  // Port check: only standard ports or unspecified
  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new InvalidURLError(`Non-standard port "${parsed.port}" is not permitted. Only standard HTTP/HTTPS ports (80, 443) are allowed.`);
  }

  const rawHostname = parsed.hostname.toLowerCase();

  // Hostname check
  if (!rawHostname) {
    throw new InvalidURLError('URL must contain a valid hostname.');
  }

  // Normalize bracketed IPv6 hostnames (e.g. [::1] -> ::1)
  const cleanHostname = rawHostname.startsWith('[') && rawHostname.endsWith(']')
    ? rawHostname.slice(1, -1)
    : rawHostname;

  // Check forbidden hostnames
  if (
    FORBIDDEN_HOSTNAMES.has(rawHostname) ||
    FORBIDDEN_HOSTNAMES.has(cleanHostname) ||
    cleanHostname.endsWith('.localhost') ||
    cleanHostname.endsWith('.local') ||
    cleanHostname.endsWith('.internal') ||
    cleanHostname.endsWith('.corp') ||
    cleanHostname.endsWith('.onion')
  ) {
    throw new SSRFError(`Access to internal or local hostname "${rawHostname}" is prohibited.`);
  }

  // If hostname is directly an IP address, validate immediately
  const ipFamily = net.isIP(cleanHostname);
  if (ipFamily !== 0 && isForbiddenIP(cleanHostname)) {
    throw new SSRFError(`Access to IP address "${rawHostname}" is prohibited.`);
  }

  return parsed;
}

/**
 * Pre-resolves DNS for a hostname and validates ALL returned IP addresses.
 * Protects against DNS rebinding and hostnames pointing to internal IP ranges.
 */
export async function resolveAndValidateHost(hostname: string): Promise<string[]> {
  const raw = hostname.toLowerCase().trim();
  const cleanHost = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : raw;

  // If it's already an IP literal, validate and return
  const ipFamily = net.isIP(cleanHost);
  if (ipFamily !== 0) {
    if (isForbiddenIP(cleanHost)) {
      throw new SSRFError(`Access to IP "${cleanHost}" is prohibited.`);
    }
    return [cleanHost];
  }

  // Check forbidden hostnames
  if (FORBIDDEN_HOSTNAMES.has(cleanHost) || FORBIDDEN_HOSTNAMES.has(raw)) {
    throw new SSRFError(`Access to internal or local hostname "${cleanHost}" is prohibited.`);
  }

  try {
    const records = await dns.promises.lookup(cleanHost, { all: true });

    if (!records || records.length === 0) {
      throw new InvalidURLError(`Unable to resolve hostname "${cleanHost}".`);
    }

    const resolvedIPs: string[] = [];

    for (const record of records) {
      const ip = record.address;
      if (isForbiddenIP(ip)) {
        throw new SSRFError(
          `Security violation: hostname "${cleanHost}" resolved to prohibited address "${ip}".`
        );
      }
      resolvedIPs.push(ip);
    }

    return resolvedIPs;
  } catch (err) {
    if (err instanceof SSRFError || err instanceof InvalidURLError) {
      throw err;
    }
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOTFOUND' || nodeErr.code === 'EAI_AGAIN') {
      throw new InvalidURLError(`Hostname "${cleanHost}" could not be resolved by DNS.`);
    }
    throw new SSRFError(`DNS validation error for host "${cleanHost}": ${(err as Error).message}`);
  }
}

/**
 * Complete URL validation pipeline: syntax, structure, and DNS resolution.
 */
export async function validateAndResolveUrl(rawUrl: string): Promise<{ url: URL; resolvedIPs: string[] }> {
  const url = validateUrlStructure(rawUrl);
  const resolvedIPs = await resolveAndValidateHost(url.hostname);
  return { url, resolvedIPs };
}
