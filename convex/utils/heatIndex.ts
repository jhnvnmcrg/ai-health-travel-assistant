export function calculateHeatIndex(
  temperatureC: number,
  humidity: number,
): number {
  const tempF = (temperatureC * 9) / 5 + 32;

  let hiF = 0.5 * (tempF + 61 + (tempF - 68) * 1.2 + humidity * 0.094);
  hiF = (hiF + tempF) / 2;

  if (hiF >= 80) {
    hiF =
      -42.379 +
      2.04901523 * tempF +
      10.14333127 * humidity -
      0.22475541 * tempF * humidity -
      0.00683783 * tempF * tempF -
      0.05481717 * humidity * humidity +
      0.00122874 * tempF * tempF * humidity +
      0.00085282 * tempF * humidity * humidity -
      0.00000199 * tempF * tempF * humidity * humidity;

    if (humidity < 13 && tempF >= 80 && tempF <= 112) {
      hiF -=
        ((13 - humidity) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
    } else if (humidity > 85 && tempF >= 80 && tempF <= 87) {
      hiF += ((humidity - 85) / 10) * ((87 - tempF) / 5);
    }
  }

  const hiC = ((hiF - 32) * 5) / 9;

  return Number(hiC.toFixed(1));
}
