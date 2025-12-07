export function validatePayment(paymentInfo: {
  cardNumber: string;
  expiryDate: string;
}): boolean {
  const { cardNumber, expiryDate } = paymentInfo;

  // Validate card number (16 digits)
  if (!/^\d{16}$/.test(cardNumber)) {
    return false;
  }

  // Validate expiry date (MM/YY format)
  if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
    return false;
  }

  const [month, year] = expiryDate.split("/");
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;

  if (
    parseInt(year) < currentYear ||
    (parseInt(year) === currentYear && parseInt(month) < currentMonth)
  ) {
    return false;
  }

  return true;
}
