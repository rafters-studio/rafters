import { describe, expect, it } from 'vitest';
import { credentials, email, password, required, url } from '../src/built-in-rules';

describe('email rule', () => {
  it('accepts valid email', () => {
    expect(email.parse('user@example.com')).toBe('user@example.com');
  });
  it('rejects invalid email', () => {
    expect(() => email.parse('not-an-email')).toThrow();
  });
});

describe('password rule', () => {
  it('accepts password with 8+ chars', () => {
    expect(password.parse('12345678')).toBe('12345678');
  });
  it('rejects short password', () => {
    expect(() => password.parse('short')).toThrow();
  });
});

describe('required rule', () => {
  it('accepts non-empty string', () => {
    expect(required.parse('hello')).toBe('hello');
  });
  it('rejects empty string', () => {
    expect(() => required.parse('')).toThrow();
  });
});

describe('url rule', () => {
  it('accepts valid URL', () => {
    expect(url.parse('https://example.com')).toBe('https://example.com');
  });
  it('rejects invalid URL', () => {
    expect(() => url.parse('not a url')).toThrow();
  });
});

describe('credentials rule', () => {
  it('accepts valid credentials', () => {
    const data = { email: 'user@example.com', password: 'longpassword' };
    expect(credentials.parse(data)).toEqual(data);
  });
  it('rejects invalid email in credentials', () => {
    expect(() => credentials.parse({ email: 'bad', password: 'longpassword' })).toThrow();
  });
  it('rejects short password in credentials', () => {
    expect(() => credentials.parse({ email: 'user@example.com', password: 'short' })).toThrow();
  });
});
