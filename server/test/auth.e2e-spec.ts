import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true })); // Apply global pipes as in main.ts
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    // Clean up database before running tests
    await prismaService.sellerProfile.deleteMany({});
    await prismaService.user.deleteMany({});
  });

  afterAll(async () => {
    await prismaService.sellerProfile.deleteMany({});
    await prismaService.user.deleteMany({});
    await app.close();
  });

  it('/auth/register (POST) - should register a new user', async () => {
    const registrationData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registrationData)
      .expect(201);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('email', registrationData.email);
    expect(response.body).toHaveProperty('requiresVerification', true);
    expect(response.body).toHaveProperty('verificationCode');
  });

  it('/auth/login (POST) - should log in an existing user', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginData)
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('/auth/login (POST) - should not log in with incorrect credentials', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'wrongpassword',
    };

    await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginData)
      .expect(401); // Unauthorized
  });

  it('/protected (GET) - should access protected resource with valid token', async () => {
    // First, log in to get a token
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginData)
      .expect(200);

    const { accessToken } = loginResponse.body;

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('/protected (GET) - should not access protected resource without token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401); // Unauthorized
  });
});
