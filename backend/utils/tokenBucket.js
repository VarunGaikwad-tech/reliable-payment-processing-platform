// const bucket = new TokenBucket(10, 2);
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;       // maximum tokens
    this.refillRate = refillRate;   // tokens per second

    this.tokens = capacity;
    this.lastRefillTime = Date.now();
  }

  consume() {
    const now = Date.now();

    // How many seconds have passed since the last refill
    const elapsedTime = (now - this.lastRefillTime) / 1000;

    // Calculate tokens to add
    const tokensToAdd = elapsedTime * this.refillRate;

    // Refill, but never exceed capacity
    this.tokens = Math.min(
      this.capacity,
      this.tokens + tokensToAdd
    );

    // Update the refill timestamp
    this.lastRefillTime = now;

    // Do we have a token?
    if (this.tokens >= 1) {
      this.tokens -= 1;

      return {
        allowed: true,
        remaining: Math.floor(this.tokens),
      };
    }

    return {
      allowed: false,
      remaining: 0,
    };
  }
}

module.exports = TokenBucket;