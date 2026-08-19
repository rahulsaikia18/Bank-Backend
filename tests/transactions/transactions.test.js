const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/models/user.model');
const accountModel = require('../../src/models/account.model');
const jwt = require('jsonwebtoken');

describe('Banking & Transactions', () => {
  let sysToken;
  let sysUser;
  let sysAccount;

  let senderToken;
  let senderId;
  let senderAccountId;

  let receiverToken;
  let receiverId;
  let receiverAccountId;

  beforeEach(async () => {
    // 1. Setup System User
    sysUser = await userModel.create({
      name: 'System Admin',
      email: 'system@test.com',
      password: 'password123',
    });
    // Bypass immutable restriction for test setup
    await userModel.collection.updateOne(
      { _id: sysUser._id },
      { $set: { systemUser: true } }
    );
    sysAccount = await accountModel.create({ user: sysUser._id, currency: 'INR' });
    sysToken = jwt.sign({ userId: sysUser._id }, process.env.JWT_SECRET);

    // 2. Setup Sender
    const senderRes = await request(app).post('/api/auth/register').send({
      name: 'Sender',
      email: 'sender@test.com',
      password: 'password123',
    });
    senderToken = senderRes.body.token;
    senderId = senderRes.body.user._id;
    const senderAccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ currency: 'INR' });
    senderAccountId = senderAccRes.body.account._id;

    // 3. Setup Receiver
    const receiverRes = await request(app).post('/api/auth/register').send({
      name: 'Receiver',
      email: 'receiver@test.com',
      password: 'password123',
    });
    receiverToken = receiverRes.body.token;
    receiverId = receiverRes.body.user._id;
    const receiverAccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${receiverToken}`)
      .send({ currency: 'INR' });
    receiverAccountId = receiverAccRes.body.account._id;
  });

  describe('Deposit / Initial Funds', () => {
    it('should successfully deposit funds to an account via system user', async () => {
      const res = await request(app)
        .post('/api/transactions/system/initial-funds')
        .set('Authorization', `Bearer ${sysToken}`)
        .send({
          toAccount: senderAccountId,
          amount: 5000,
          idempotencyKey: 'init-1',
        });

      if (res.statusCode !== 201) console.error('Initial funds failed:', res.body);


      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);

      const balRes = await request(app)
        .get(`/api/accounts/balance/${senderAccountId}`)
        .set('Authorization', `Bearer ${senderToken}`);
      
      expect(balRes.body.balance).toBe(5000);
    });
  });

  describe('Transfers', () => {
    beforeEach(async () => {
      // Fund Sender with ₹5000
      await request(app)
        .post('/api/transactions/system/initial-funds')
        .set('Authorization', `Bearer ${sysToken}`)
        .send({
          toAccount: senderAccountId,
          amount: 5000,
          idempotencyKey: 'fund-sender',
        });

      // Fund Receiver with ₹1000
      await request(app)
        .post('/api/transactions/system/initial-funds')
        .set('Authorization', `Bearer ${sysToken}`)
        .send({
          toAccount: receiverAccountId,
          amount: 1000,
          idempotencyKey: 'fund-receiver',
        });
    });

    it('should successfully transfer funds (₹5000 → ₹2000)', async () => {
      // Transfer ₹2000 from Sender to Receiver
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          fromAccount: senderAccountId,
          toAccount: receiverAccountId,
          amount: 2000,
          idempotencyKey: 'transfer-1',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);

      // Check Sender Balance: Expected ₹5000 - ₹2000 = ₹3000
      const senderBal = await request(app)
        .get(`/api/accounts/balance/${senderAccountId}`)
        .set('Authorization', `Bearer ${senderToken}`);
      expect(senderBal.body.balance).toBe(3000);

      // Check Receiver Balance: Expected ₹1000 + ₹2000 = ₹3000
      const receiverBal = await request(app)
        .get(`/api/accounts/balance/${receiverAccountId}`)
        .set('Authorization', `Bearer ${receiverToken}`);
      expect(receiverBal.body.balance).toBe(3000);
    });

    it('should prevent duplicate transactions with same idempotency key', async () => {
      // First Transfer
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          fromAccount: senderAccountId,
          toAccount: receiverAccountId,
          amount: 1000,
          idempotencyKey: 'duplicate-key',
        });

      // Duplicate Transfer
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          fromAccount: senderAccountId,
          toAccount: receiverAccountId,
          amount: 1000,
          idempotencyKey: 'duplicate-key',
        });

      // Should return success but message indicates it's already completed
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Transaction already completed');

      // Balances should only change by ₹1000 total, not ₹2000
      const senderBal = await request(app)
        .get(`/api/accounts/balance/${senderAccountId}`)
        .set('Authorization', `Bearer ${senderToken}`);
      expect(senderBal.body.balance).toBe(4000);
    });

    it('should fail when transferring to an invalid account', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          fromAccount: senderAccountId,
          toAccount: '507f1f77bcf86cd799439011', // Fake object id
          amount: 1000,
          idempotencyKey: 'invalid-acct',
        });

      expect(res.statusCode).toEqual(404);
      expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });
  });

  describe('Insufficient Balance Transfer', () => {
    beforeEach(async () => {
      // Fund Sender with exactly ₹500
      await request(app)
        .post('/api/transactions/system/initial-funds')
        .set('Authorization', `Bearer ${sysToken}`)
        .send({
          toAccount: senderAccountId,
          amount: 500,
          idempotencyKey: 'fund-sender-low',
        });
        
       // Receiver starts empty (₹0)
    });

    it('should fail transfer and leave balances unchanged', async () => {
      // Attempt to transfer ₹1000
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          fromAccount: senderAccountId,
          toAccount: receiverAccountId,
          amount: 1000,
          idempotencyKey: 'fail-transfer-1',
        });

      // Transaction failed
      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toBe('INSUFFICIENT_BALANCE');
      expect(res.body.success).toBe(false);

      // Sender remains ₹500
      const senderBal = await request(app)
        .get(`/api/accounts/balance/${senderAccountId}`)
        .set('Authorization', `Bearer ${senderToken}`);
      expect(senderBal.body.balance).toBe(500);

      // Receiver unchanged (₹0)
      const receiverBal = await request(app)
        .get(`/api/accounts/balance/${receiverAccountId}`)
        .set('Authorization', `Bearer ${receiverToken}`);
      expect(receiverBal.body.balance).toBe(0);
    });
  });
});
