import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

app.use(cors())
app.use(express.json())

// helper for admin auth
function isAdmin(req,res,next){
  if(req.headers['x-admin-key'] !== process.env.ADMIN_KEY){
    return res.status(401).json({error:'Unauthorized - wrong admin key'})
  }
  next()
}

app.get('/', (req,res)=> res.json({ok:true, msg:"Nature Store API Live - CRUD Ready"}))

// ================= PRODUCT CRUD =================

// READ ALL + search ?name=jinja
app.get('/api/products', async (req,res)=>{
  const q = req.query.name || ''
  const products = await prisma.product.findMany({
    where:{name:{contains:q, mode:'insensitive'}},
    orderBy:{createdAt:'desc'}
  })
  res.json(products)
})

// READ ONE
app.get('/api/products/:id', async (req,res)=>{
  const id = Number(req.params.id)
  const product = await prisma.product.findUnique({where:{id}})
  if(!product) return res.status(404).json({error:'Not found'})
  res.json(product)
})

// CREATE - admin only
app.post('/api/products', isAdmin, async (req,res)=>{
  try{
    const product = await prisma.product.create({data:req.body})
    res.status(201).json(product)
  }catch(e){
    res.status(400).json({error:e.message})
  }
})

// UPDATE - admin only
app.put('/api/products/:id', isAdmin, async (req,res)=>{
  try{
    const id = Number(req.params.id)
    const product = await prisma.product.update({
      where:{id},
      data:req.body
    })
    res.json(product)
  }catch(e){
    res.status(400).json({error:e.message})
  }
})

// DELETE - admin only
app.delete('/api/products/:id', isAdmin, async (req,res)=>{
  const id = Number(req.params.id)
  await prisma.product.delete({where:{id}})
  res.status(204).send()
})

// ================= ORDER CRUD =================

// Customer create order (pending)
app.post('/api/orders', async (req,res)=>{
  const order = await prisma.order.create({data:req.body})
  res.status(201).json(order)
})

// Admin get all orders
app.get('/api/orders', isAdmin, async (req,res)=>{
  const orders = await prisma.order.findMany({orderBy:{createdAt:'desc'}})
  res.json(orders)
})

// Admin update order status to delivered
app.put('/api/orders/:id', isAdmin, async (req,res)=>{
  const id = Number(req.params.id)
  const order = await prisma.order.update({where:{id}, data:req.body})
  res.json(order)
})

const PORT = process.env.PORT || 8000
app.listen(PORT, ()=> console.log('API on '+PORT))
