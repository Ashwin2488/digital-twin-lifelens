import { Router } from "express";
import { asyncRoute, ok } from "../middleware/errors.js";
import { listProducts } from "../store/memoryStore.js";

const router = Router();

router.get(
  "/",
  asyncRoute((_req, res) => {
    ok(res, { products: listProducts(), scraped: false });
  })
);

export default router;
