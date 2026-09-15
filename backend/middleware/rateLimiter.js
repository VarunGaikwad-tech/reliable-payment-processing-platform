const AppError = require("../utils/AppError");
const { consumeToken } = require("../services/rateLimiterService");

const rateLimiter = ({ capacity, refillRate }) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;

      const key = `rate_limit:user:${userId}`;

      const result = await consumeToken({
        key,
        capacity,
        refillRate,
      });

      res.setHeader("X-RateLimit-Limit", capacity);
      res.setHeader("X-RateLimit-Remaining", result.remaining);

      if (!result.allowed) {
        res.setHeader("Retry-After", result.retryAfter);

        return next(
          new AppError(
            "Too many requests. Please try again later.",
            429
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = rateLimiter;

// const AppError = require("../utils/AppError");
// const { consumeToken } = require("../services/rateLimiterService");

// const rateLimiter = ({ capacity, refillRate }) => {
//   return async (req, res, next) => {
//     try {
//       const userId = req.user.userId;

//       const key = `rate_limit:user:${userId}`;

//       const result = await consumeToken({
//         key,
//         capacity,
//         refillRate,
//       });

//       res.setHeader("X-RateLimit-Limit", capacity);
//       res.setHeader("X-RateLimit-Remaining", result.remaining);

//       if (!result.allowed) {
//         res.setHeader("Retry-After", Math.ceil(1 / refillRate));

//         return next(
//           new AppError(
//             "Too many requests. Please try again later.",
//             429
//           )
//         );
//       }

//       next();
//     } catch (error) {
//       next(error);
//     }
//   };
// };

// module.exports = rateLimiter;