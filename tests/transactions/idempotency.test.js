const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/models/user.model');
const accountModel = require('../../src/models/account.model');
const jwt = require('jsonwebtoken');

describe('Idempotency (Network Retry Handling)', () => {
  let sysToken, senderToken, receiverToken;
  let senderAccountId, receiverAccountId;

  beforeEach(async () => {
    // 1. Setup System User
    const sysUser = await userModel.create({
      name: 'System Admin',
      email: 'system-idempotency@test.com',
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
      email: 'sender-idemp@test.com',
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
      email: 'receiver-idemp@test.com',
      password: 'password123',
    });
    receiverToken = receiverRes.body.token;
    const receiverAccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${receiverToken}`)
      .send({ currency: 'INR' });
    receiverAccountId = receiverAccRes.body.account._id;

    // 3. Fund accounts
    await request(app)
      .post('/api/transactions/system/initial-funds')
      .set('Authorization', `Bearer ${sysToken}`)
      .send({ toAccount: senderAccountId, amount: 5000, idempotencyKey: 'fund-sender' });

    await request(app)
      .post('/api/transactions/system/initial-funds')
      .set('Authorization', `Bearer ${sysToken}`)
      .send({ toAccount: receiverAccountId, amount: 1000, idempotencyKey: 'fund-receiver' });
  });

  it('should process the first request and return the existing result on retry (Sequential Retry)', async () => {
    const idempotencyKey = 'retry-test-key-123';
    const transferPayload = {
      fromAccount: senderAccountId,
      toAccount: receiverAccountId,
      amount: 1500,
      idempotencyKey,
    };

    // --- FIRST REQUEST ---
    const res1 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${senderToken}`)
      .send(transferPayload);

    expect(res1.statusCode).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.message).toBe('Transaction completed successfully');
    
    const transactionId = res1.body.transaction._id;

    // --- SECOND REQUEST (Network Retry) ---
    const res2 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${senderToken}`)
      .send(transferPayload);

    // It should succeed, but explicitly state it was already completed
    expect(res2.statusCode).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.message).toBe('Transaction already completed');
    
    // It MUST return the EXACT same transaction record
    expect(res2.body.transaction._id).toBe(transactionId);

    // --- VERIFY BALANCES ---
    // Sender: 5000 - 1500 = 3500 (NOT 2000, which would happen if double-charged)
    const senderBal = await request(app)
      .get(`/api/accounts/balance/${senderAccountId}`)
      .set('Authorization', `Bearer ${senderToken}`);
    expect(senderBal.body.balance).toBe(3500);

    // Receiver: 1000 + 1500 = 2500 (NOT 4000)
    const receiverBal = await request(app)
      .get(`/api/accounts/balance/${receiverAccountId}`)
      .set('Authorization', `Bearer ${receiverToken}`);
    expect(receiverBal.body.balance).toBe(2500);
  });

  it('should prevent double-spending under concurrent race conditions (Concurrent Retry)', async () => {
    const idempotencyKey = 'race-condition-key-456';
    const transferPayload = {
      fromAccount: senderAccountId,
      toAccount: receiverAccountId,
      amount: 2000,
      idempotencyKey,
    };

    // Fire two identical requests at the exact same millisecond
    const req1 = request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${senderToken}`)
      .send(transferPayload);
      
    const req2 = request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${senderToken}`)
      .send(transferPayload);

    const [res1, res2] = await Promise.all([req1, req2]);

    // One request must succeed, and the other must be caught by either the 
    // findOne check OR the MongoDB unique index constraint (409 Conflict).
    const statuses = [res1.statusCode, res2.statusCode];
    
    // At least one MUST be 200 OK.
    expect(statuses).toContain(200);
    
    // The other will either be 200 (if it hit the findOne check after the first saved)
    // or 409 (if it hit the DB unique constraint exactly at the same time).
    // Let's just ensure balances reflect EXACTLY ONE transaction.

    // Sender: 5000 - 2000 = 3000
    const senderBal = await request(app)
      .get(`/api/accounts/balance/${senderAccountId}`)
      .set('Authorization', `Bearer ${senderToken}`);
    expect(senderBal.body.balance).toBe(3000);

    // Receiver: 1000 + 2000 = 3000
    const receiverBal = await request(app)
      .get(`/api/accounts/balance/${receiverAccountId}`)
      .set('Authorization', `Bearer ${receiverToken}`);
    expect(receiverBal.body.balance).toBe(3000);
  });
});
