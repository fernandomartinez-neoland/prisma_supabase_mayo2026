import express from "express";
import { productsController } from "../controllers/Products.controller.js"

const routes = express.Router();

routes.get("/lista", productsController);

export default routes;
