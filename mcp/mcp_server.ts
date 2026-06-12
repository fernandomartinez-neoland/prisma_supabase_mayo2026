import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.ts";
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
  } catch (err) {
    send({ id: null, ok: false, error: "invalid json" });
    return;
  }

  const id = msg.id ?? null;
  send({ id, ok: true, result: "hola tu" });
});
