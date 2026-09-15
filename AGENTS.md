# Payment System — Codex Instructions

## Project
Reliable distributed payment processing system.

## Stack
Node.js
Express
PostgreSQL
Redis
Kafka
Docker
Jest

## Rules

- Do not modify files unless explicitly asked.
- Explain the reasoning behind architectural changes.
- Preserve layered architecture.
- Do not put database queries in controllers or services.
- Repository layer owns PostgreSQL access.
- Services own business logic.
- Controllers only handle HTTP concerns.
- Monetary amounts are represented in paise.
- Never use floating-point arithmetic for money.
- Transfers must remain atomic.
- Preserve transaction idempotency.
- Preserve deterministic account locking.
- Treat PostgreSQL as the source of truth.
- Use the transactional outbox for Kafka events.
- Add tests for changes affecting payment correctness.
- Never expose secrets or credentials.
- Never silently weaken authentication, authorization, or validation.
- Do not introduce new infrastructure, dependencies, services, or architectural patterns unless there is a demonstrated requirement.
- Prefer the simplest design that satisfies the reliability and correctness requirement.
- Do not convert the modular monolith into microservices without explicit approval.
- Do not add Kubernetes, service meshes, Kafka Streams, schema registries, dead-letter systems, or similar infrastructure unless explicitly requested.
- Run relevant tests after modifying code.
- Do not change database schema or production behavior without explaining the reason and impact.
- Preserve existing API contracts unless the task explicitly requires changing them.
- For database changes, preserve PostgreSQL constraints as the final enforcement layer; application validation must not be the only protection for financial invariants.
- Treat integration tests as potentially stateful: clean up every database record created by a test.
- Never use production-like credentials, tokens, or secrets in committed test scripts.