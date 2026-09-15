local key = KEYS[1]

local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local tokens = redis.call("HGET", key, "tokens")
local last_refill = redis.call("HGET", key, "lastRefillTime")

-- First request: start with a full bucket.
if not tokens then
    tokens = capacity
    last_refill = now
end

tokens = tonumber(tokens)
last_refill = tonumber(last_refill)

-- Elapsed time in seconds.
local elapsed = (now - last_refill) / 1000

-- Refill the bucket.
local new_tokens = math.min(
    capacity,
    tokens + (elapsed * refill_rate)
)

-- The current request is happening now.
last_refill = now

if new_tokens >= 1 then
    new_tokens = new_tokens - 1

    redis.call(
        "HSET",
        key,
        "tokens",
        new_tokens,
        "lastRefillTime",
        last_refill
    )

    -- Keep inactive rate-limit keys from living forever.
    local ttl_seconds = math.ceil(capacity / refill_rate) + 1
    redis.call("EXPIRE", key, ttl_seconds)

    return {
        1,
        math.floor(new_tokens),
        0
    }
end

-- No token available.
redis.call(
    "HSET",
    key,
    "tokens",
    new_tokens,
    "lastRefillTime",
    last_refill
)

local ttl_seconds = math.ceil(capacity / refill_rate) + 1
redis.call("EXPIRE", key, ttl_seconds)

-- Time until one full token becomes available.
local tokens_needed = 1 - new_tokens
local retry_after_seconds = math.ceil(tokens_needed / refill_rate)

return {
    0,
    0,
    retry_after_seconds
}