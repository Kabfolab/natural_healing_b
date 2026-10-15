import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

app.use(cors())
app.use(express.json())

function isAdmin(req,res,next){
  if(req.headers['x-admin-key'] !== process.env.ADMIN_KEY){
    return res.status(401).json({error:'Unauthorized - wrong admin key'})
  }
  next()
}

app.get('/', (req,res)=> res.json({ok:true, msg:"Nature Store API Live"}))

// PRODUCT CRUD
app.get('/api/products', async (req,res)=>{
  const q = req.query.name || ''
  const products = await prisma.product.findMany({
    where: q ? {name:{contains:q, mode:'insensitive'}} : {},
    orderBy:{createdAt:'desc'}
  })
  res.json(products)
})

app.get('/api/products/:id', async (req,res)=>{
  const product = await prisma.product.findUnique({where:{id:Number(req.params.id)}})
  if(!product) return res.status(404).json({error:'Not found'})
  res.json(product)
})

app.post('/api/products', isAdmin, async (req,res)=>{
  const product = await prisma.product.create({data:req.body})
  res.status(201).json(product)
})

app.put('/api/products/:id', isAdmin, async (req,res)=>{
  const product = await prisma.product.update({where:{id:Number(req.params.id)}, data:req.body})
  res.json(product)
})

app.delete('/api/products/:id', isAdmin, async (req,res)=>{
  await prisma.product.delete({where:{id:Number(req.params.id)}})
  res.status(204).send()
})

// ORDER CRUD
app.post('/api/orders', async (req,res)=>{
  const order = await prisma.order.create({data:req.body})
  res.status(201).json(order)
})

app.get('/api/orders', isAdmin, async (req,res)=>{
  const orders = await prisma.order.findMany({orderBy:{createdAt:'desc'}})
  res.json(orders)
})

// PAYSTACK VERIFY ONLY - because frontend will INIT
app.post('/api/paystack/verify/:ref', async (req,res)=>{
  try{
    const ref = req.params.ref
    const verify = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET}`}
    }).then(r=>r.json())

    if(verify.data?.status === 'success'){
      const order = await prisma.order.update({
        where:{paystackRef: ref},
        data:{status:'paid'}
      })
      return res.json({ok:true, order})
    } else {
      return res.status(400).json({ok:false, msg:'Payment not verified'})
    }
  }catch(e){ res.status(500).json({error:e.message}) }
})

const PORT = process.env.PORT || 8000
app.listen(PORT, ()=> console.log('API on '+PORT))
