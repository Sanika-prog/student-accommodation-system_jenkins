const request = require('supertest');
const app = require('../src/app');

async function registerAndLogin(role, suffix) {
  const email = `${role}-${suffix}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: `${role} ${suffix}`, email, password: 'password123', role });
  return res.body.token;
}

async function createRoom(adminToken, overrides = {}) {
  const res = await request(app)
    .post('/api/rooms')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ roomNumber: 'R1', block: 'X', capacity: 1, pricePerSemester: 900, ...overrides });
  return res.body;
}

describe('Application workflow', () => {
  it('lets a student apply for a room and track it, and an admin approve it', async () => {
    const adminToken = await registerAndLogin('admin', 'a1');
    const studentToken = await registerAndLogin('student', 's1');
    const room = await createRoom(adminToken, { roomNumber: 'R1' });

    const apply = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ roomId: room._id, notes: 'First choice' });
    expect(apply.status).toBe(201);
    expect(apply.body.status).toBe('pending');

    const mine = await request(app)
      .get('/api/applications/my')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.length).toBe(1);

    const approve = await request(app)
      .put(`/api/applications/${apply.body._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe('approved');

    // Room should now be full (capacity 1, 1 occupied)
    const roomAfter = await request(app).get(`/api/rooms/${room._id}`);
    expect(roomAfter.body.occupied).toBe(1);
    expect(roomAfter.body.status).toBe('full');
  });

  it('rejects a duplicate pending application for the same room', async () => {
    const adminToken = await registerAndLogin('admin', 'a2');
    const studentToken = await registerAndLogin('student', 's2');
    const room = await createRoom(adminToken, { roomNumber: 'R2' });

    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ roomId: room._id });

    const dup = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ roomId: room._id });
    expect(dup.status).toBe(409);
  });

  it('rejects applying for a full room', async () => {
    const adminToken = await registerAndLogin('admin', 'a3');
    const student1 = await registerAndLogin('student', 's3');
    const student2 = await registerAndLogin('student', 's4');
    const room = await createRoom(adminToken, { roomNumber: 'R3', capacity: 1 });

    const firstApp = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${student1}`)
      .send({ roomId: room._id });

    await request(app)
      .put(`/api/applications/${firstApp.body._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    const secondApp = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${student2}`)
      .send({ roomId: room._id });
    expect(secondApp.status).toBe(400);
  });

  it('prevents a student from viewing all applications (admin only)', async () => {
    const studentToken = await registerAndLogin('student', 's5');
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it('prevents an admin from applying for a room (student only)', async () => {
    const adminToken = await registerAndLogin('admin', 'a4');
    const room = await createRoom(adminToken, { roomNumber: 'R4' });
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roomId: room._id });
    expect(res.status).toBe(403);
  });

  it('rejects an invalid status transition value', async () => {
    const adminToken = await registerAndLogin('admin', 'a5');
    const studentToken = await registerAndLogin('student', 's6');
    const room = await createRoom(adminToken, { roomNumber: 'R5' });
    const apply = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ roomId: room._id });

    const res = await request(app)
      .put(`/api/applications/${apply.body._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'maybe-later' });
    expect(res.status).toBe(400);
  });
});
