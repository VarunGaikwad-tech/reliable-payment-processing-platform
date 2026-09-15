const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isUuid = (value) => typeof value === "string" && uuidPattern.test(value);

const normalizeEmail = (value) => (
  typeof value === "string" ? value.trim().toLowerCase() : value
);

const isEmail = (value) => (
  typeof value === "string" && value.length <= 255 && emailPattern.test(value)
);

module.exports = {
  isUuid,
  normalizeEmail,
  isEmail,
};
