const {
  binanceAPI,
  calculateSMA,
  getRSI,
  getMACD,
  getClosePrices,
  calculateKDJ,
  getOrderBook,
  getRecentTrades,
  getPriceBySymbol,
} = require("../services");

const { BollingerBands } = require("technicalindicators");
const asyncErrorWrapper = require("express-async-handler");
const { default: axios } = require("axios");
require("dotenv").config();

const priceBySymbol = asyncErrorWrapper(async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const response = await getPriceBySymbol(symbol);
    const { price } = response.data;

    return res.status(200).json({ succes: true, symbol, price });
  } catch (error) {
    console.error("Error fetching price:", error);
    return res.status(400).json(error);
  }
});

const historicalPrices = asyncErrorWrapper(async (req, res) => {
  try {
    const { symbol, interval, startTime, endTime } = req.query;

    if (!symbol || !interval || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required query parameters",
      });
    }

    const response = await binanceAPI.get(`/api/v3/klines`, {
      params: {
        symbol: symbol.toUpperCase(),
        interval,
        startTime,
        endTime: endTime.trim(),
      },
    });

    const formattedData = response.data.map((entry) => ({
      symbol,
      openTime: entry[0],
      open: entry[1],
      high: entry[2],
      low: entry[3],
      close: entry[4],
      volume: entry[5],
      closeTime: entry[6],
      quoteAssetVolume: entry[7],
      numberOfTrades: entry[8],
      takerBuyBaseAssetVolume: entry[9],
      takerBuyQuoteAssetVolume: entry[10],
      ignore: entry[11],
    }));

    return res.status(200).json(formattedData);
  } catch (error) {
    console.log("Error fetching historical data:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching historical data",
      error,
    });
  }
});

const getIndicator = asyncErrorWrapper(async (req, res) => {
  try {
    const { indicator } = req.params;

    if (indicator === "rsi") {
      const { symbol, interval, period, limit } = req.query;

      if (!symbol || !interval || !period) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required query parameters: symbol, interval, period",
        });
      }

      try {
        const rsi = await getRSI(symbol, interval, period, limit);

        return res.status(200).json({
          success: true,
          symbol,
          interval,
          period,
          rsi,
        });
      } catch (error) {
        console.log("Error:", error);

        return res.status(500).json({
          success: false,
          message: "Error fetching rsi data",
        });
      }
    }

    if (indicator === "sma") {
      const { symbol, interval, period, limit } = req.query;

      if (!symbol || !interval || !period) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required query parameters: symbol, interval, period",
        });
      }
      try {
        const closePrices = await getClosePrices(
          symbol,
          interval,
          parseInt(limit)
        );
        const sma = calculateSMA(closePrices, parseInt(period));

        return res.status(200).json({
          success: true,
          symbol,
          interval,
          period,
          sma,
        });
      } catch (error) {
        console.error(
          "Error fetching sma data:",
          error.response ? error.response.data : error.message
        );
        return res.status(500).send("Error fetching sma data");
      }
    }

    if (indicator === "macd") {
      const { symbol, interval, shortPeriod, longPeriod, signalPeriod, limit } =
        req.query;

      if (
        !symbol ||
        !interval ||
        !shortPeriod ||
        !longPeriod ||
        !signalPeriod
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required query parameters: symbol, interval, shortPeriod, longPeriod, signalPeriod",
        });
      }
      try {
        const macd = await getMACD(
          symbol,
          interval,
          shortPeriod,
          longPeriod,
          signalPeriod,
          limit
        );

        return res.status(200).json({
          success: true,
          macd,
        });
      } catch (error) {
        console.error(
          "Error fetching kline data:",
          error.response ? error.response.data : error.message
        );
        return res.status(500).json({
          success: false,
          message: "Error fetching kline data",
        });
      }
    }

    if (indicator === "kdj") {
      const { symbol, interval, limit } = req.query;

      if (!symbol || !interval || !limit) {
        return res.status(400).json({
          success: false,
          message: "Missing required query parameters: symbol, interval, limit",
        });
      }

      try {
        const response = await binanceAPI.get(
          `api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
        );

        const data = response.data;
        const kdj = calculateKDJ(data);

        return res.status(200).json({
          success: true,
          symbol,
          interval,
          kdj,
        });
      } catch (error) {
        console.log(error);
        return res.status(400).json({
          success: false,
          message: "Error fetching kdj data.",
        });
      }
    }

    if (indicator === "bb") {
      const { symbol, interval, startTime, endTime } = req.query;

      if (!symbol || !interval || !startTime || !endTime) {
        return res.status(400).json({
          succes: false,
          error: "Please provide symbol, interval, startTime, and endTime",
        });
      }

      try {
        const response = await axios.get(
          `https://api.binance.com/api/v3/klines`,
          {
            params: {
              symbol: symbol,
              interval: interval,
              startTime: startTime,
              endTime: endTime,
            },
          }
        );

        const closePrices = response.data.map((candle) =>
          parseFloat(candle[4])
        ); // Close prices

        const input = {
          period: 20,
          values: closePrices,
          stdDev: 2,
        };

        const bollingerBands = BollingerBands.calculate(input);

        return res.status(200).json({
          success: true,
          symbol,
          interval,
          startTime,
          endTime,
          BollingerBands: bollingerBands,
        });
      } catch (error) {
        console.error(`Error fetching data from Binance API: ${error.message}`);
        return res.status(500).json({
          error: `Failed to fetch data from Binance API: ${error.message}`,
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: "Please provide a valid indicator.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching kline data.",
      error,
    });
  }
});

const orderBook = asyncErrorWrapper(async (req, res) => {
  try {
    const { symbol, limit } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required",
      });
    }

    const orderBook = await getOrderBook(symbol, limit);

    return res.status(200).json({
      symbol,
      bids: orderBook.bids.map(([price, quantity]) => ({ price, quantity })),
      asks: orderBook.asks.map(([price, quantity]) => ({ price, quantity })),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order book",
    });
  }
});

const recentTrades = asyncErrorWrapper(async (req, res) => {
  try {
    const { type } = req.params;
    const { symbol, limit } = req.query;

    if (!symbol || !limit) {
      return res.status(400).json({
        success: false,
        error: "Missing query parameters: symbol or limit",
      });
    }

    if (type === "buy") {
      try {
        const recentTrades = await getRecentTrades(symbol, limit);
        const buyTrades = recentTrades.filter((trade) => !trade.isBuyerMaker);

        return res.status(200).json({
          success: true,
          symbol: symbol.toUpperCase(),
          trades: buyTrades.map((trade) => ({
            price: trade.price,
            quantity: trade.qty,
            timestamp: new Date(trade.time).toISOString(),
            side: "buy",
          })),
        });
      } catch (error) {
        console.log(error);
        return res
          .status(500)
          .json({ success: false, error: "Failed to fetch recent buy trades" });
      }
    }

    if (type === "sell") {
      try {
        const recentTrades = await getRecentTrades(symbol, limit);
        const sellTrades = recentTrades.filter((trade) => trade.isBuyerMaker);

        return res.status(200).json({
          symbol: symbol.toUpperCase(),
          trades: sellTrades.map((trade) => ({
            price: trade.price,
            quantity: trade.qty,
            timestamp: new Date(trade.time).toISOString(),
            side: "sell",
          })),
        });
      } catch (error) {
        console.log(error);
        return res
          .status(500)
          .json({ error: "Failed to fetch recent sell trades" });
      }
    }

    return res.status(500).json({
      success: false,
      error: "Failed to fetch recent trades",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch recent trades",
    });
  }
});

module.exports = {
  priceBySymbol,
  historicalPrices,
  getIndicator,
  orderBook,
  recentTrades,
};
