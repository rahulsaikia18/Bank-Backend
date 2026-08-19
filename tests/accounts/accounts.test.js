const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/models/user.model');

describe('Accounts', () => {
  let token;
  let userId;

  beforeEach(async () => {
    // Register and login to get token
    const res = await request(app).post('/api/auth/register').send({
      name: 'Account Test User',
      email: 'account@test.com',
      password: 'password123',
    });
    token = res.body.token;
    userId = res.body.user._id;
  });

  describe('Create Account', () => {
    it('should create an account successfully', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ currency: 'INR' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.account).toBeDefined();
      expect(res.body.account.currency).toBe('INR');
      expect(res.body.account.user).toBe(userId);
    });

    it('should default to INR if currency is not provided', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toEqual(201);
      expect(res.body.account.currency).toBe('INR');
    });
  });

  describe('Get Accounts', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ currency: 'INR' });
    });

    it('should retrieve user accounts', async () => {
      const res = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accounts).toBeInstanceOf(Array);
      expect(res.body.accounts.length).toBe(1);
    });

    it('should return 401 for unauthorized access', async () => {
      const res = await request(app).get('/api/accounts');
      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });
});
