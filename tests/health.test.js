const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('returns 200 and reports db connection state', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
  });
});

describe('GET /metrics', () => {
  it('exposes prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });
});

describe('GET /api/student', () => {
  it('returns the required marker-check payload', async () => {
    const res = await request(app).get('/api/student');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('studentId');
  });
});

describe('Unknown route', () => {
  it('returns 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
  });
});
