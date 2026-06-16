import { productListService } from "../services/product.service"

export async function productsController(req:any, res:any){

    res.status(200).send(await productListService(req.body.message))
}