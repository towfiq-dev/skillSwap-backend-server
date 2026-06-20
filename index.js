const express = require('express');
const cors = require("cors");
const Stripe = require("stripe");
const app = express()
require('dotenv').config()
const port = 5000
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Hello World!')
})


const uri = process.env.MONGO_DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)
const requireAuth = async(req, res, next) =>{
  const authHeader = req?.headers.authorization
   if(!authHeader){
    return res.status(401).json({message: "Unauthorized"})
  }

  const token = authHeader.split(" ")[1]
  if(!token){
    return res.status(401).json({message: "Unauthorized"})
  }
  try{
    const {payload} = await jwtVerify(token, JWKS)
     req.user = payload;
    next()
  }catch(error){
    return res.status(403).json({message: "Forbidden"})

  }

}
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  next();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("aligntask_db")
    const tasksCollection = database.collection("tasks")
    const proposalsCollection = database.collection("proposals")
    const paymentsCollection = database.collection("payments")
    const usersCollection = database.collection("user");

    
  //for getting task
  app.get("/tasks", async (req, res) => {
  try {
    const { userId } = req.query;

    const filter = userId ? { userId } : {};

    const tasks = await tasksCollection.find(filter).toArray();

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
    //for posting tasks
    app.post("/tasks", async (req, res) => {
  try {
    const { title, category, description, budget, deadline, userId } = req.body;

    if (!title || !category || !description || !budget || !deadline) {
      return res.status(400).json({ error: "All fields are required" });
    }

   const newTask = {
  title,
  category,
  description,
  budget: Number(budget),
  deadline,

  userId,
  clientName: req.body.clientName,
  clientEmail: req.body.clientEmail,

  status: "open",
  createdAt: new Date(),
};

    const result = await tasksCollection.insertOne(newTask);

    res.status(201).json({
      success: true,
      taskId: result.insertedId,
      message: "Task created successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//delete tasks
app.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const task = await tasksCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

   if (task.status !== "open") {
  return res.status(400).json({
    error: "Only open tasks can be deleted",
  });
}

const result = await tasksCollection.deleteOne({
  _id: new ObjectId(id),
});

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});


//updating tasks
app.patch("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
const task = await tasksCollection.findOne({
  _id: new ObjectId(id),
});

if (!task) {
  return res.status(404).json({
    error: "Task not found",
  });
}

if (task.status !== "open") {
  return res.status(400).json({
    error: "Only open tasks can be edited",
  });
}
    const result = await tasksCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title: req.body.title,
          category: req.body.category,
          description: req.body.description,
          budget: Number(req.body.budget),
          deadline: req.body.deadline,
        },
      }
    );

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server Connect on port ${port}`)
})