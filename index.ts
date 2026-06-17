import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from '@google/genai';
import productRoutes from "./src/routes/products.routes";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });;

async function crearVectorEnLaNube(texto: string) {
  // 2. Usamos el método embedContent en lugar de generateContent
  const response = await ai.models.embedContent({
    // IMPORTANTE: text-embedding-004 es el modelo de Google para vectores, no uses gemini-2.5-flash aquí
    model: 'gemini-embedding-2', 
    contents: texto,
    config: { outputDimensionality: 768 },
  });

  // 3. Devolvemos el array de números. En el nuevo SDK la estructura es ligeramente distinta
  return response.embeddings[0].values;
}






const port = 3000;
const api = express();
api.use(express.json());
api.use(cors());

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

api.post("/", async (req: any, res: any) => {
  const { title, price, description } = req.body;
  const producto = await prisma.Products.create({
    data: {
      title,
      price,
      description,
    },
  });


  const vector =await crearVectorEnLaNube(`Producto: ${title}. Descripción: ${description}. Precio: ${price}`);

  const vectorString = `[${vector.join(",")}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "Products" SET embedding = $1::vector WHERE id = $2`,
    vectorString,
    producto.id,
  );

  try {
    await prisma.$disconnect();
  } catch (e) {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }
  res
    .status(201)
    .send({ message: "Producto creado con vector semántico", producto });
});

api.use("/products", productRoutes);

api.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
