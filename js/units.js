export function toStablecoinUnits(amount, decimals) {
  return Math.round(parseFloat(amount) * Math.pow(10, decimals));
}

export function fromStablecoinUnits(units, decimals) {
  return (parseInt(units) / Math.pow(10, decimals)).toFixed(2);
}

export function toSQMUUnits(amount) {
  return Math.round(parseFloat(amount) * 100); // 2 decimals
}

export function fromSQMUUnits(units) {
  return (parseInt(units) / 100).toFixed(2);
}
