const authService = require("../services/authService");

const register = async (req, res) => {
  const { name, email, password } = req.body;

  const user = await authService.register(
    name,
    email,
    password
  );

  res.status(201).json({
    success: true,
    user,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(
    email,
    password
  );

  res.status(200).json({
    success: true,
    ...result,
  });
};

module.exports = {
  register,
  login,
};