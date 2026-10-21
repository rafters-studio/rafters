import { describe, expect, it } from 'vitest';
import { isBlockedRegistryHost } from '../../src/config/rafters-config.js';

describe('isBlockedRegistryHost', () => {
  it.each([
    ['localhost', 'http://localhost:8787'],
    ['localhost with trailing dot', 'http://localhost./'],
    ['*.localhost', 'https://registry.localhost'],
    ['0.0.0.0/8 lower edge', 'http://0.0.0.0'],
    ['0.0.0.0/8 upper edge', 'http://0.255.255.255'],
    ['127.0.0.0/8', 'http://127.0.0.1'],
    ['127.0.0.0/8 upper edge', 'http://127.255.255.254'],
    ['loopback in decimal form', 'http://2130706433/'],
    ['::1', 'http://[::1]:3000'],
    ['IPv4-mapped loopback', 'http://[::ffff:127.0.0.1]/'],
    ['IPv4-mapped private', 'http://[::ffff:a00:1]/'],
    ['10/8', 'http://10.0.0.5'],
    ['172.16/12 lower edge', 'http://172.16.0.1'],
    ['172.16/12 upper edge', 'http://172.31.255.255'],
    ['192.168/16', 'http://192.168.1.1'],
    ['169.254/16', 'http://169.254.1.1'],
    ['cloud metadata address', 'http://169.254.169.254/latest/meta-data'],
    ['fc00::/7 lower edge', 'http://[fc00::]'],
    ['fc00::/7 upper edge', 'http://[fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff]'],
    ['fe80::/10', 'http://[fe80::1]'],
    ['fe80::/10 upper edge', 'http://[febf::1]'],
    ['unparseable URL', 'not a url'],
  ])('blocks %s', (_label, url) => {
    expect(isBlockedRegistryHost(url)).toBe(true);
  });

  it.each([
    ['the default registry', 'https://rafters.studio'],
    ['a public IPv4 address', 'http://8.8.8.8'],
    ['just outside 0.0.0.0/8', 'http://1.0.0.0'],
    ['just outside 172.16/12', 'http://172.32.0.1'],
    ['a public IPv6 address', 'http://[2606:4700::1111]'],
    ['just below fc00::/7', 'http://[fbff:ffff:ffff:ffff:ffff:ffff:ffff:ffff]'],
    ['just above fc00::/7', 'http://[fe00::]'],
    ['just outside fe80::/10', 'http://[fec0::1]'],
  ])('allows %s', (_label, url) => {
    expect(isBlockedRegistryHost(url)).toBe(false);
  });
});
