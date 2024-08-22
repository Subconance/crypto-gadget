const express = require("express");
const {
  priceBySymbol,
  historicalPrices,
  getIndicator,
  orderBook,
  recentTrades,
} = require("../controllers");

const router = express.Router();

router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Crypto Gadget API",
  });
});

router.get("/price/:symbol", priceBySymbol);
router.get("/historical", historicalPrices);
router.get("/indicators/:indicator", getIndicator);
router.get("/order-book", orderBook);
router.get("/recent-trades/:type", recentTrades);

module.exports = router;
