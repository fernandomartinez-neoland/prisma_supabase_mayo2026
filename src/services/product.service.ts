import { mcpProductClient } from "../../mcp/clients/mcp_IA_client_product";
export async function productListService(msg:string) {

    const clientResult=await mcpProductClient(msg)
    console.log("SERVICIO: ", clientResult)
  return clientResult
}
