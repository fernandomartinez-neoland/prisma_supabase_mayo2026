import "dotenv/config";
import { Ollama } from "ollama";
import readline from "readline";
import { spawn } from "child_process";
import { GoogleGenAI } from "@google/genai";

const aiOllama = new Ollama({
  host: "https://ollama.com",
  headers: { Authorization: "Bearer " + process.env.OLLAMA_API_KEY },
});

// conectamos a la api de la IA de google
const aiGoogle = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// esta funcion vectoriza lo que se manda a investigar
async function crearVectorEnLaNube(texto: string) {
  const response = await aiGoogle.models.embedContent({
    model: "gemini-embedding-2",
    contents: texto,
    config: { outputDimensionality: 768 },
  });
  return response.embeddings[0].values;
}

function spawnServer() {
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawn(npxCommand, ["tsx", "./mcp/mcp_server.ts"], {
    shell: true,
    stdio: ["pipe", "pipe", "inherit"],
  });
}

async function reqAI(msg: any) {
  const response = await aiOllama.chat({
    model: "gpt-oss:120b",
    messages: [
      {
        role: "user",
        content: `Analiza el mensaje "${msg}". Si el usuario pide la lista completa de productos, devuelve UNICAMENTE 'lista de productos'. Si el usuario describe un producto, busca características, o pide recomendaciones, devuelve UNICAMENTE 'busqueda semantica'. No añades nada más.`,
      },
    ],
  });
  return response.message.content?.trim();
}

//ESTA FUNCION LA IMPORTAMOS EN EL SERVICIO Y ES LA QUE ORQUESTA LAS INTERACCIONES
export async function mcpProductClient(msg: string): Promise<any> {
  const child = spawnServer();
  const serverReader = readline.createInterface({
    input: child.stdout as any,
    terminal: false,
  });

  //   con esto la IA tiene diferenciacion de mensajes
  let messageId = 0;

  //   aqui le enviamos las cosas al servidor mcp
  function send(obj: any) {
    const payload = JSON.stringify(obj);
    console.log("\n📤 Enviando al servidor:", payload);
    child.stdin.write(payload + "\n");
  }
  messageId++;
  const messagePayload = {
    id: messageId,
    method: "tools/list",
    params: { input: msg },
  };

  const intencion: any = await reqAI(messagePayload.params.input);

  let aiResponseText = "";

  if (intencion === "busqueda semantica") {
    console.log("🔍 Ejecutando vectorización con gemini-embedding-2...");

    // USAMOS TU FUNCIÓN PARA LA BÚSQUEDA
    const vectorResult = await crearVectorEnLaNube(msg);

    messagePayload.method = "tools/search_semantic";
    messagePayload.params = {
      embedding: vectorResult,
      limit: 3, // Traer los 3 más parecidos
    };
  } else if (intencion === "lista de productos") {
    messagePayload.method = "tools/list";
    messagePayload.params = { input: "lista de productos" };
  } else {
    // Fallback por si la IA devuelve otra cosa
    messagePayload.method = "tools/list";
    messagePayload.params = { input: msg };
  }

  send(messagePayload);

  //   generamos una promesa para asegurar que la funcion siempre responda cuando el servidor mcp responda
  return new Promise((resolve, reject) => {
    // Procesar respuestas del servidor
    serverReader.on("line", (line) => {
      let msg: any = null;
      try {
        msg = JSON.parse(line);
        //   console.log("📥 Respuesta del servidor:", JSON.stringify(msg, null, 2));
        if (msg.result !== undefined) {
          console.log("💬 Mensaje del servidor:", msg.result);
          // child.kill();
          resolve(msg.result);
        }
      } catch (err) {
        console.error("❌ Error parseando JSON:", err);
        reject("algo salio mal");
      }
    });
  });
}
