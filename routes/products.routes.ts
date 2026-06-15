import express from "express";
import { productsController } from "../controllers/Products.controller";

const routes = express.Router();

routes.get("/lista", productsController);

export default routes;
