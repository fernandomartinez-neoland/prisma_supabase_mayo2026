import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import express from "express";
import cors from "cors";

import productRoutes from './routes/products.routes'

const port = 3000;
const api = express();
api.use(express.json());
api.use(cors());

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

api.post("/", async (req: any, res: any) => {
  const val = await prisma.Products.create({
    data: {
      title: "tablet",
      price: 15.3,
      description: "es hecha en china",
    },
  });
  console.log(val);
  try {
    await prisma.$disconnect();
  } catch (e) {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }
  res.send("holi");
});


api.use("/products", productRoutes)

api.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

