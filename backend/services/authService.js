const bcrypt = require("bcrypt");
const userRepository = require("../repositories/userRepository");

const jwt = require("jsonwebtoken");
const config = require("../config/env");

const AppError = require("../utils/AppError");
const { isEmail, normalizeEmail } = require("../utils/validation");

const register = async (name, email, password) => {
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
    throw new AppError(
      "Name, email and password are required",
      400
    );
  }

  const normalizedName = name.trim();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedName || !normalizedEmail || !password) {
    throw new AppError("Name, email and password are required", 400);
  }

  if (normalizedName.length > 100 || !isEmail(normalizedEmail)) {
    throw new AppError("Invalid name or email", 400);
  }

  const existingUser = await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError(
      "Email already registered",
      409
    );
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // 4. Create user
  let user;
  try {
    user = await userRepository.createUser(
      normalizedName,
      normalizedEmail,
      passwordHash
    );
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Email already registered", 409);
    }

    throw error;
  }

  return user;
};

const login = async (email, password) => {
  if (typeof email !== "string" || typeof password !== "string") {
    throw new AppError(
      "Email and password are required",
      400
    );
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw new AppError("Email and password are required", 400);
  }

  if (!isEmail(normalizedEmail)) {
    throw new AppError("Invalid email", 400);
  }

  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token,
  };
};

module.exports = {
  register,
  login,
};
