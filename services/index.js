const axios = require("axios");
const technicalindicators = require("technicalindicators");
require("dotenv").config();

const binanceAPI = axios.create({
  baseURL: "https://api.binance.com",
  headers: { "X-MBX-APIKEY": process.env.BINANCE_API_KEY },
});

async function getPriceBySymbol(symbol) {
  try {
    const response = await binanceAPI.get(
      `api/v3/ticker/price?symbol=${symbol}`
    );
    return response;
  } catch (error) {
    console.error("Error fetching price:", error);
    throw error;
  }
}

const calculateEMA = (data, period) => {
  let k = 2 / (period + 1);
  let emaArray = [parseFloat(data[0][4])];
  for (let i = 1; i < data.length; i++) {
    emaArray.push(data[i][4] * k + emaArray[i - 1] * (1 - k));
  }
  return emaArray;
};

async function getClosePrices(symbol, interval, limit) {
  try {
    const response = await binanceAPI.get(
      `/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );

    return response.data.map((candle) => parseFloat(candle[4]));
  } catch (error) {
    console.log("Error fetching data from Binance API", error);
    throw error;
  }
}

function calculateMACD(closePrices, shortPeriod, longPeriod, signalPeriod) {
  return technicalindicators.MACD.calculate({
    values: closePrices,
    fastPeriod: shortPeriod,
    slowPeriod: longPeriod,
    signalPeriod: signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
}

async function getMACD(
  symbol,
  interval,
  shortPeriod,
  longPeriod,
  signalPeriod,
  limit
) {
  try {
    const closePrices = await getClosePrices(symbol, interval, limit);
    const macd = calculateMACD(
      closePrices,
      shortPeriod,
      longPeriod,
      signalPeriod
    );
    return macd;
  } catch (error) {
    console.error("Error calculating MACD", error);
    throw error;
  }
}

async function getRSI(symbol, interval, period, limit) {
  try {
    const closePrices = await getClosePrices(symbol, interval, limit);
    const rsi = calculateRSI(closePrices, period);
    return rsi;
  } catch (error) {
    console.error("Error calculating RSI", error);
    throw error;
  }
}

function calculateRSI(closePrices, period) {
  return technicalindicators.RSI.calculate({
    values: closePrices,
    period: period,
  });
}

function calculateSMA(closePrices, period) {
  return technicalindicators.SMA.calculate({
    period: period,
    values: closePrices,
  });
}

const calculateKDJ = (data) => {
  const kPeriod = 14;
  const dPeriod = 3;

  const kValues = [];
  const dValues = [];
  const jValues = [];

  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const high = Math.max(...slice.map((candle) => parseFloat(candle[2])));
    const low = Math.min(...slice.map((candle) => parseFloat(candle[3])));
    const close = parseFloat(data[i][4]);

    const rsv = ((close - low) / (high - low)) * 100;
    const k =
      i === kPeriod - 1
        ? rsv
        : (kValues[kValues.length - 1] * (dPeriod - 1)) / dPeriod +
          rsv / dPeriod;
    const d =
      i === kPeriod - 1
        ? k
        : (dValues[dValues.length - 1] * (dPeriod - 1)) / dPeriod + k / dPeriod;

    kValues.push(k);
    dValues.push(d);
    jValues.push(3 * k - 2 * d);
  }

  return {
    kValues,
    dValues,
    jValues,
  };
};

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  let sma = [];
  let upper = [];
  let lower = [];
  let pb = [];

  for (let i = 0; i < prices.length; i++) {
    if (i >= period - 1) {
      let sum = 0;
      for (let j = i - (period - 1); j <= i; j++) {
        sum += prices[j];
      }
      let mean = sum / period;
      sma.push(mean);

      let variance = 0;
      for (let j = i - (period - 1); j <= i; j++) {
        variance += Math.pow(prices[j] - mean, 2);
      }
      let stdDevCalc = Math.sqrt(variance / period);

      upper.push(mean + stdDevCalc * stdDev);
      lower.push(mean - stdDevCalc * stdDev);

      let currentPrice = prices[i];
      pb.push(
        (currentPrice - lower[lower.length - 1]) /
          (upper[upper.length - 1] - lower[lower.length - 1])
      );
    } else {
      sma.push(null);
      upper.push(null);
      lower.push(null);
      pb.push(null);
    }
  }

  return {
    middle: sma,
    upper: upper,
    lower: lower,
    pb: pb,
  };
}

async function getOrderBook(symbol, limit) {
  try {
    const response = await binanceAPI.get(
      `/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching order book:", error);
    throw error;
  }
}

async function getRecentTrades(symbol, limit = 5) {
  try {
    const response = await binanceAPI.get(
      `/api/v3/trades?symbol=${symbol.toUpperCase()}&limit=${limit}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching recent trades:", error);
    throw error;
  }
}

module.exports = {
  binanceAPI,
  calculateMACD,
  calculateEMA,
  getRSI,
  calculateRSI,
  calculateSMA,
  getClosePrices,
  getMACD,
  calculateKDJ,
  calculateBollingerBands,
  getOrderBook,
  getRecentTrades,
  getPriceBySymbol,
};
