const generateAccountNumber = () => {
  const timestamp = Date.now().toString().slice(-6);

  const randomPart = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  return timestamp + randomPart;
};

module.exports = generateAccountNumber;