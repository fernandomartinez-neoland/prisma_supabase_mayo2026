import "dotenv/config";
import { Ollama } from "ollama";
import readline from "readline";
import { spawn } from "child_process";

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
        content: `Analiza el mensaje "${msg}" y si el usuario esta solicitando la lista de productos tu vas a devolver el mensaje unicamente 'lista de productos', no quiero que envies algo diferente, no importa el contexto o las emociones, si estan pidiendo la lista de productos tu solo devuelve la cadenad e caracteres "lista de productos"`,
      },
    ],
    stream: true,
  });

  return response;
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
  const message = {
    id: messageId,
    method: "tools/list",
    params: { input: msg },
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
