const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/models/user.model');
const accountModel = require('../../src/models/account.model');
const jwt = require('jsonwebtoken');

describe('Concurrency & Race Conditions', () => {
  let sysToken, senderToken, receiverToken;
  let senderAccountId, receiverAccountId;

  beforeEach(async () => {
    // 1. Setup System User
    const sysUser = await userModel.create({
      name: 'System Admin',
      email: 'system-concurrency@test.com',
      password: 'password123',
    });
    await userModel.collection.updateOne(
      { _id: sysUser._id },
      { $set: { systemUser: true } }
    );
    await accountModel.create({ user: sysUser._id, currency: 'INR' });
    sysToken = jwt.sign({ userId: sysUser._id }, process.env.JWT_SECRET);

    // 2. Setup Sender & Receiver
    const senderRes = await request(app).post('/api/auth/register').send({
      name: 'Sender',
      email: 'sender-race@test.com',
      password: 'password123',
    });
    senderToken = senderRes.body.token;
    const senderAccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ currency: 'INR' });
    senderAccountId = senderAccRes.body.account._id;

    const receiverRes = await request(app).post('/api/auth/register').send({
      name: 'Receiver',
      email: 'receiver-race@test.com',
      password: 'password123',
    });
    receiverToken = receiverRes.body.token;
    const receiverAccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${receiverToken}`)
      .send({ currency: 'INR' });
    receiverAccountId = receiverAccRes.body.account._id;

    // 3. Fund Sender with EXACTLY ₹1000
    await request(app)
      .post('/api/transactions/system/initial-funds')
      .set('Authorization', `Bearer ${sysToken}`)
      .send({ toAccount: senderAccountId, amount: 1000, idempotencyKey: 'fund-sender-1000' });
  });

  it('should prevent double-spending when two simultaneous withdrawals exceed balance', async () => {
    // Balance is ₹1000.
    // Two simultaneous requests of ₹800.
    // If vulnerable to race conditions, both check balance simultaneously (see ₹1000),
    // both pass, and both insert ledgers. Balance becomes -₹600.
    // We expect one to succeed and one to fail.

    const req1 = request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        fromAccount: senderAccountId,
        toAccount: receiverAccountId,
        amount: 800,
        idempotencyKey: 'race-req-1',
      });

    const req2 = request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        fromAccount: senderAccountId,
        toAccount: receiverAccountId,
        amount: 800,
        idempotencyKey: 'race-req-2', // Different key to bypass standard idempotency check!
      });

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.statusCode, res2.statusCode];
    
    // One MUST succeed (200), One MUST fail due to insufficient funds (400) or DB WriteConflict lock abort (500)
    expect(statuses.includes(200)).toBe(true);
    expect(statuses.includes(400) || statuses.includes(500)).toBe(true);

    // Final balance validation
    const senderBal = await request(app)
      .get(`/api/accounts/balance/${senderAccountId}`)
      .set('Authorization', `Bearer ${senderToken}`);
      
    // 1000 - 800 = 200. Must strictly be 200, not -600.
    expect(senderBal.body.balance).toBe(200);

    const receiverBal = await request(app)
      .get(`/api/accounts/balance/${receiverAccountId}`)
      .set('Authorization', `Bearer ${receiverToken}`);
      
    // Must strictly be 800, not 1600.
    expect(receiverBal.body.balance).toBe(800);
  });
});
