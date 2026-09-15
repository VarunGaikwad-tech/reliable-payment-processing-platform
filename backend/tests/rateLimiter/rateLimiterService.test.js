const redisClient = require("../../config/redis");
const { consumeToken } = require("../../services/rateLimiterService");

describe("Rate Limiter Service", () => {
  const key = "rate_limit:test-jest";

  beforeAll(async () => {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  });

  beforeEach(async () => {
    await redisClient.del(key);
  });

  afterAll(async () => {
    await redisClient.del(key);

    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  test("allows a request when bucket has tokens", async () => {
    const result = await consumeToken({
      key,
      capacity: 10,
      refillRate: 2,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.retryAfter).toBe(0);
  });

  test("allows exactly capacity number of requests", async () => {
    for (let i = 0; i < 10; i++) {
      const result = await consumeToken({
        key,
        capacity: 10,
        refillRate: 2,
      });

      expect(result.allowed).toBe(true);
    }

    const result = await consumeToken({
      key,
      capacity: 10,
      refillRate: 2,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThanOrEqual(1);
  });

  test("rejects request when bucket is empty", async () => {
    for (let i = 0; i < 10; i++) {
      await consumeToken({
        key,
        capacity: 10,
        refillRate: 2,
      });
    }

    const result = await consumeToken({
      key,
      capacity: 10,
      refillRate: 2,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThanOrEqual(1);
  });
  
  test("refills tokens after elapsed time", async () => {
    const capacity = 10;
    const refillRate = 2;

    // First request creates the bucket at t = 1000ms.
    let result = await consumeToken({
      key,
      capacity,
      refillRate,
      now: 1000,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);

    // Consume the remaining 9 tokens at the same time.
    for (let i = 0; i < 9; i++) {
      result = await consumeToken({
        key,
        capacity,
        refillRate,
        now: 1000,
      });
    }
  
    expect(result.remaining).toBe(0);

    // Move time forward by 1 second.
    result = await consumeToken({
      key,
      capacity,
      refillRate,
      now: 2000,
    });

    // 2 tokens refill, then this request consumes 1.
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  test("never allows bucket to exceed capacity", async () => {
    const capacity = 10;
    const refillRate = 2;

    // Create the bucket and consume one token.
    let result = await consumeToken({
      key,
      capacity,
      refillRate,
      now: 1000,
    });

    expect(result.remaining).toBe(9);

    // Jump far into the future.
    result = await consumeToken({
      key,
      capacity,
      refillRate,
      now: 100000,
    });

    // The bucket should refill to 10, then consume 1.
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });
});