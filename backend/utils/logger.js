const write = (method, level, event, fields = {}) => {
  const entry = {
    ...fields,
    timestamp: new Date().toISOString(),
    level,
    event,
  };

  console[method](JSON.stringify(entry));
};

const info = (event, fields) => write("log", "info", event, fields);
const warn = (event, fields) => write("warn", "warn", event, fields);
const error = (event, err, fields = {}) => write("error", "error", event, {
  ...fields,
  error: {
    message: err.message,
    code: err.code,
    stack: err.stack,
  },
});

module.exports = { info, warn, error };
