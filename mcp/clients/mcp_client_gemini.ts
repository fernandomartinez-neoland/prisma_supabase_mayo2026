import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { Ollama } from "ollama";

import { spawn } from "child_process";
import readline from "readline";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing in .env");

const ai = new Ollama({
  host: "https://ollama.com",
  headers: { Authorization: "Bearer " + process.env.OLLAMA_API_KEY },
});

function spawnServer() {
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawn(npxCommand, ["tsx", "./mcp/mcp_server.ts"], {
    shell: true,
    stdio: ["pipe", "pipe", "inherit"],
  });
}

async function reqAI(msg: any) {
  const response = await ai.chat({
    model: "gpt-oss:120b",
    messages: [
      {
        role: "user",
        content: `Analiza el mensaje "${msg}" y si el usuario esta solicitando la lista de productos tu vas a devolver el mensaje 'lista de productos'`,
      },
    ],
    stream: true,
  });

  return response;
}

async function main() {
  const child = spawnServer();

  // Leer respuestas del servidor
  const serverReader = readline.createInterface({
    input: child.stdout as any,
    terminal: false,
  });

  // Leer entrada del usuario desde la consola
  const userReader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let messageId = 0;

  function send(obj: any) {
    const payload = JSON.stringify(obj);
    console.log("\n📤 Enviando al servidor:", payload);
    child.stdin.write(payload + "\n");
  }

  // Procesar respuestas del servidor
  serverReader.on("line", (line) => {
    let msg: any = null;
    try {
      msg = JSON.parse(line);
      console.log("📥 Respuesta del servidor:", JSON.stringify(msg, null, 2));
      if (msg.result !== undefined) {
        console.log("💬 Mensaje del servidor:", msg.result);
      }
    } catch (err) {
      console.error("❌ Error parseando JSON:", err);
    }
  });

  // Leer input del usuario y enviar al servidor
  userReader.on("line", async (userInput) => {
    if (userInput.toLowerCase() === "exit") {
      console.log("\n👋 Cerrando cliente...");
      userReader.close();
      child.kill();
      process.exit(0);
    }

    messageId++;
    const message = {
      id: messageId,
      method: "tools/list",
      params: { input: userInput },
    };

    const responseStream: any = await reqAI(message.params.input);

    let aiResponseText = "";

    // 3. Consumimos el stream por completo
    for await (const part of responseStream) {
      if (part.message?.content) {
        aiResponseText += part.message.content;
      }
    }
    message.params.input = aiResponseText;

    send(message);
  });

  console.log(
    "✅ Cliente MCP conectado. Escribe mensajes (o 'exit' para salir):\n",
  );
}

main();
