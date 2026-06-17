import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import readline from "readline";

// con este mcp hacemos lectura de la consola para permitir la interaccion de la IA con la BD, quitandole dichas conexiones a la api central

const directUrl = process.env.DIRECT_URL;
// comprobamos que existe el directurl en el archivo .env
if (!directUrl) {
  throw new Error("DIRECT_URL is required in .env");
}

// hacemos la conexion a la BD con la libreria de prisma
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: directUrl }),
});

function send(obj: any) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

console.error("Custom MCP stdio server: ready");
rl.on("line", async (line) => {
  let msg: any = null;
  try {
    //   console.log("line: ", line)
    msg = JSON.parse(line);
    // if(msg.message==="")
  } catch (err) {
    send({ id: null, ok: false, error: "invalid json" });
    return;
  }

  const id = msg.id ?? null;
  let lista; //variable lista que va a contener la lista de productos
  try {
    console.error("ESTE ES EL METODO: ", msg.method)
    // 1. NUEVA LÓGICA: Búsqueda Vectorial (Semántica)
    if (msg.method === "tools/search_semantic" && msg.params?.embedding) {
      // Transformamos el array de números en el formato string que exige pgvector: "[0.1, 0.2, ...]"
      const vectorString = `[${msg.params.embedding.join(",")}]`;
      const limite = msg.params.limit || 3;

      // Usamos Raw SQL porque Prisma no tiene un método nativo ORM para el operador <=> (Distancia del coseno)
      // Esto ordena toda la tabla devolviendo los más similares primero
      const listaSimilares = await prisma.$queryRawUnsafe(
        `
        SELECT id, title, price, description 
        FROM "Products" 
        ORDER BY embedding <=> $1::vector 
        LIMIT $2
      `,
        vectorString,
        limite,
      );

      send({ id, ok: true, result: listaSimilares });
      await prisma.$disconnect();

      // 2. LÓGICA ORIGINAL: Lista de productos completa
    } else if (msg.params?.input === "lista de productos") {
      const listaCompleta = await prisma.products.findMany();
      send({ id, ok: true, result: listaCompleta });
      await prisma.$disconnect();

      // 3. FALLBACK
    } else {
      send({
        id,
        ok: true,
        result: "si no quieres la lista de productos entonces no me jodas",
      });
    }
  } catch (error) {
    console.error("❌ Error en la base de datos MCP:", error);
    send({ id, ok: false, error: "Error procesando la consulta en la BD" });
  }
});
