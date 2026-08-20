const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/models/user.model');
const jwt = require('jsonwebtoken');

describe('Authentication', () => {
  const testUser = {
    name: 'Rahul',
    email: 'rahul@test.com',
    password: 'password123',
  };

  describe('Register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app).post('/api/auth/register').send(testUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should fail if email is already registered', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const res = await request(app).post('/api/auth/register').send(testUser);

      expect(res.statusCode).toEqual(422);
      expect(res.body.code).toBe('USER_ALREADY_EXISTS');
    });
  });

  describe('Login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should fail with invalid password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'wrongpassword',
      });

      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should fail with unregistered email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'notfound@test.com',
        password: 'password123',
      });

      expect(res.statusCode).toEqual(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('Protected Routes (Token Validation)', () => {
    it('should fail if no token is provided', async () => {
      const res = await request(app).get('/api/accounts');
      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should fail with an invalid token format', async () => {
      const res = await request(app)
        .get('/api/accounts')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should fail with an expired token', async () => {
      // Create a token expired 1 hour ago
      const expiredToken = jwt.sign(
        { userId: '123456789012' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${expiredToken}`);
        
      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('Refresh Token', () => {
    let refreshToken;
    beforeEach(async () => {
      const res = await request(app).post('/api/auth/register').send(testUser);
      refreshToken = res.body.refreshToken;
    });

    it('should return a new access token when a valid refresh token is provided', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should fail with an invalid refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'invalid_refresh_token' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should fail if refresh token is omitted', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});

      expect(res.statusCode).toEqual(401);
    });
  });
});
