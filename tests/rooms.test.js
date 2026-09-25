const request = require('supertest');
const app = require('../src/app');

async function registerAndLogin(role) {
  const email = `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: `${role} user`, email, password: 'password123', role });
  return res.body.token;
}

describe('Room routes', () => {
  it('allows anyone to list rooms (public)', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rejects room creation without a token', async () => {
    const res = await request(app).post('/api/rooms').send({
      roomNumber: 'A101',
      block: 'A',
      capacity: 2,
      pricePerSemester: 1000,
    });
    expect(res.status).toBe(401);
  });

  it('rejects room creation from a student', async () => {
    const studentToken = await registerAndLogin('student');
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ roomNumber: 'A102', block: 'A', capacity: 2, pricePerSemester: 1000 });
    expect(res.status).toBe(403);
  });

  it('allows an admin to create, update and delete a room', async () => {
    const adminToken = await registerAndLogin('admin');

    const create = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roomNumber: 'B201', block: 'B', capacity: 2, pricePerSemester: 1200 });
    expect(create.status).toBe(201);

    const update = await request(app)
      .put(`/api/rooms/${create.body._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pricePerSemester: 1300 });
    expect(update.status).toBe(200);
    expect(update.body.pricePerSemester).toBe(1300);

    const del = await request(app)
      .delete(`/api/rooms/${create.body._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it('rejects duplicate room numbers', async () => {
    const adminToken = await registerAndLogin('admin');
    await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roomNumber: 'C301', block: 'C', capacity: 2, pricePerSemester: 1000 });

    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roomNumber: 'C301', block: 'C', capacity: 2, pricePerSemester: 1000 });
    expect(res.status).toBe(409);
  });

  it('returns 404 for a nonexistent room', async () => {
    const res = await request(app).get('/api/rooms/64b000000000000000000000');
    expect(res.status).toBe(404);
  });
});
