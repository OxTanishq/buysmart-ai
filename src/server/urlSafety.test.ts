import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateOrReservedIp, validateProductUrl } from './urlSafety';

test('validateProductUrl accepts valid HTTPS merchant URLs', () => {
  const amz = validateProductUrl('https://www.amazon.in/dp/B0CS5Z3T4M');
  assert.equal(amz.valid, true);
  assert.equal(amz.isSupportedMerchant, true);
  assert.equal(amz.merchantName, 'Amazon India');

  const flipkart = validateProductUrl('https://www.flipkart.com/some-product/p/itm123');
  assert.equal(flipkart.valid, true);
  assert.equal(flipkart.merchantName, 'Flipkart');
});

test('validateProductUrl blocks SSRF vectors: localhost, private IPs, metadata, file://', () => {
  assert.equal(validateProductUrl('http://127.0.0.1:8080/admin').valid, false);
  assert.equal(validateProductUrl('http://localhost:3000/api/secret').valid, false);
  assert.equal(validateProductUrl('http://169.254.169.254/latest/meta-data/').valid, false);
  assert.equal(validateProductUrl('http://10.0.0.5/internal').valid, false);
  assert.equal(validateProductUrl('http://192.168.1.1/').valid, false);
  assert.equal(validateProductUrl('file:///etc/passwd').valid, false);
  assert.equal(validateProductUrl('javascript:alert(1)').valid, false);
  assert.equal(validateProductUrl('https://user:pass@amazon.in/').valid, false);
});

test('isPrivateOrReservedIp covers IPv4 and IPv6 loopback/ULA/link-local', () => {
  assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
  assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
  assert.equal(isPrivateOrReservedIp('172.32.0.1'), false);
  assert.equal(isPrivateOrReservedIp('::1'), true);
  assert.equal(isPrivateOrReservedIp('fe80::1'), true);
  assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
});
