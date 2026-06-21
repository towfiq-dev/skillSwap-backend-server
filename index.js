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
//browsing tasks
app.get("/browse-tasks", async (req, res) => {
  const tasks = await tasksCollection
    .find({ status: "open" })
    .toArray();

  res.json(tasks);
});
//posting proposals 
app.post("/proposals", async (req, res) => {
  try {
   const {
  taskId,
  freelancerId,
  freelancerName,
  freelancerEmail,
  budget,
  deliveryDate,
  message,
} = req.body;
    // 1. prevent duplicate proposal
    const existing = await proposalsCollection.findOne({
      taskId,
      freelancerId,
    });

    if (existing) {
      return res.status(400).json({
        error: "You already submitted a proposal",
      });
    }
if (!freelancerId || !freelancerEmail) {
  return res.status(403).json({
    error: "Only freelancers can apply",
  });
}
   const proposal = {
  taskId,
  freelancerId,
  freelancerEmail,
   freelancerName,
  budget: Number(budget),

  deliveryDate: new Date(deliveryDate),

  message,
  status: "pending",
  createdAt: new Date(),
};
    const result = await proposalsCollection.insertOne(proposal);

    res.json({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//client-stats
app.get("/client/stats/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const tasks = await tasksCollection
      .find({ clientEmail: email })
      .toArray();

    const totalTasks = tasks.length;

    const openTasks = tasks.filter(
      (task) => task.status === "open"
    ).length;

    const inProgressTasks = tasks.filter(
      (task) => task.status === "in progress"
    ).length;

    const completedTasks = tasks.filter(
      (task) => task.status === "completed"
    ).length;

    const payments = await paymentsCollection
      .find({ clientEmail: email })
      .toArray();

    const totalSpent = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    res.json({
      totalTasks,
      openTasks,
      inProgressTasks,
      completedTasks,
      totalSpent,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});
//get proposals
app.get("/proposals/:taskId", async (req, res) => {
  try {
    const proposals = await proposalsCollection
      .find({ taskId: req.params.taskId })
      .toArray();

    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//accepting and rejecting proposals
app.patch("/proposals/accept/:id", async (req, res) => {
  try {
    const proposalId = req.params.id;

    const proposal = await proposalsCollection.findOne({
      _id: new ObjectId(proposalId),
    });

    if (!proposal) {
      return res.status(404).json({ error: "Not found" });
    }

    // ❌ BLOCK IF TASK ALREADY STARTED OR PAID
    const task = await tasksCollection.findOne({
      _id: new ObjectId(proposal.taskId),
    });


    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

   if (task.status !== "open") {
  return res.status(400).json({
    error: "This task is already accepted or in payment flow",
  });
}

    // 1. mark accepted proposal
    await proposalsCollection.updateOne(
      { _id: new ObjectId(proposalId) },
      { $set: { status: "accepted" } }
    );

    // 2. reject all others
    await proposalsCollection.updateMany(
      {
        taskId: proposal.taskId,
        _id: { $ne: new ObjectId(proposalId) },
      },
      { $set: { status: "rejected" } }
    );

    // 3. update task (LOCK IT)
    await tasksCollection.updateOne(
      { _id: new ObjectId(proposal.taskId) },
      {
        $set: {
          status: "awaiting_payment", 
          acceptedProposalId: proposalId,
        },
      }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//payment lock 
app.patch("/tasks/mark-paid/:taskId", async (req, res) => {
  try {
    await tasksCollection.updateOne(
  { _id: new ObjectId(req.params.taskId) },
  {
    $set: {
      status: "in progress",
      paid: true,
      locked: true, 
    },
  }
);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//rejecting proposals
app.patch("/proposals/reject/:id", async (req, res) => {
  await proposalsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: "rejected" } }
  );

  res.json({ success: true });
});

//getting tasks details
app.get("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const task = await tasksCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//for payment/checkout
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { proposalId, amount, clientEmail } = req.body;

   const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  mode: "payment",

  customer_email: clientEmail,

  line_items: [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: "Freelancer Task Payment",
        },
        unit_amount: Number(amount) * 100,
      },
      quantity: 1,
    },
  ],

  metadata: {
    proposalId,
  },

  success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
});

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//confirm session
app.post("/confirm-session", async (req, res) => {
  try {
    const { session_id } = req.body;

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not confirmed" });
    }

    const proposalId = session.metadata.proposalId;

    const proposal = await proposalsCollection.findOne({
      _id: new ObjectId(proposalId),
    });

    const task = await tasksCollection.findOne({
      _id: new ObjectId(proposal.taskId),
    });

    // mark accepted
    await proposalsCollection.updateOne(
      { _id: new ObjectId(proposalId) },
      { $set: { status: "accepted" } }
    );

    // update task
    await tasksCollection.updateOne(
      { _id: new ObjectId(proposal.taskId) },
      {
        $set: {
          status: "in progress",
          acceptedProposalId: proposalId,
        },
      }
    );

    // save payment
   await paymentsCollection.insertOne({
  proposalId,
  taskTitle: task.title,

  freelancerName: proposal.freelancerName,
  freelancerEmail: proposal.freelancerEmail, // ✅ ADD THIS

  clientEmail: task.clientEmail, // optional but useful

  amount: proposal.budget,
  paidAt: new Date(),
});

    res.json({
      success: true,
      taskTitle: task.title,
      freelancerName: proposal.freelancerName,
      amount: proposal.budget,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//get payment for admin
app.get("/payments", async (req, res) => {
  try {
    const payments = await paymentsCollection
      .find()
      .sort({ paidAt: -1 })
      .toArray();

    res.json(payments);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});
//earning page for freelancer
app.get("/payments/freelancer/:email", async (req, res) => {
  try {
    const payments = await paymentsCollection
      .find({
        freelancerEmail: req.params.email,
      })
      .toArray();

    res.json(payments);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

//for freelancer stat
app.get("/freelancer/stats/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const proposals = await proposalsCollection
      .find({ freelancerEmail: email })
      .toArray();

    const total = proposals.length;
    const pending = proposals.filter(p => p.status === "pending").length;
    const accepted = proposals.filter(p => p.status === "accepted").length;

    const earnings = await paymentsCollection
      .find({ freelancerEmail: email })
      .toArray();

    const totalEarnings = earnings.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    res.json({
      totalProposals: total,
      pendingProposals: pending,
      acceptedProposals: accepted,
      totalEarnings,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//get freelancer proposal
app.get("/proposals/freelancer/:email", async (req, res) => {
  const proposals = await proposalsCollection
    .find({ freelancerEmail: req.params.email })
    .toArray();

  res.json(proposals);
});

//show active projects 
app.get("/freelancer/active-projects/:email", async (req, res) => {
  try {
    const email = req.params.email;

    // 1. find accepted proposals of this freelancer
    const proposals = await proposalsCollection
      .find({
        freelancerEmail: email,
        status: "accepted",
      })
      .toArray();

    const taskIds = proposals.map(p => new ObjectId(p.taskId));

    // 2. get tasks that are in progress
    const tasks = await tasksCollection
      .find({
        _id: { $in: taskIds },
        status: "in progress",
      })
      .toArray();

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//delivery save 
app.patch("/tasks/submit-deliverable/:id", async (req, res) => {
  try {
    const { deliverableUrl } = req.body;

    const task = await tasksCollection.findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (task.status !== "in progress") {
      return res.status(400).json({ error: "Task not active" });
    }

    await tasksCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          status: "completed",
          deliverable_url: deliverableUrl,
          completedAt: new Date(),
        },
      }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//for profile
app.patch("/freelancer/profile/:email", async (req, res) => {
  const { name, image, skills, bio, rate } = req.body;

  await usersCollection.updateOne(
    { email: req.params.email },
    {
      $set: { name, image, skills, bio, rate },
    }
  );

  res.json({ success: true });
});
//updating profile
app.patch("/users/profile/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const update = {
      name: req.body.name,
      image: req.body.photo,
      skills: req.body.skills,
      bio: req.body.bio,
      hourlyRate: req.body.hourlyRate,
    };

    await usersCollection.updateOne(
      { email },
      {
        $set: update,
        $setOnInsert: {
          email,
          role: "client",      // default role (important)
          blocked: false,      // ✅ ALWAYS ADDED
          createdAt: new Date()
        }
      },
      { upsert: true } // ✅ THIS IS THE MISSING PIECE
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//getting profile
app.get("/users/profile/:email", async (req, res) => {
  const user = await usersCollection.findOne({
    email: req.params.email,
  });

  res.json(user || {});
});

//getting all freelancers
app.get("/freelancers", async (req, res) => {
  try {
    const freelancers = await usersCollection
      .find({ role: "freelancer" })
      .toArray();

    res.json(freelancers);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});
//get single freelancer
app.get("/freelancers/:id", async (req, res) => {
  try {
    const freelancer = await usersCollection.findOne({
      _id: new ObjectId(req.params.id),
      role: "freelancer",
    });

    if (!freelancer) {
      return res.status(404).json({
        error: "Freelancer not found",
      });
    }

    res.json(freelancer);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

//ensuring users get block feild 
app.post("/users/ensure", async (req, res) => {
  try {
    const { email, name, image, role } = req.body;

    await usersCollection.updateOne(
      { email },
      {
        $setOnInsert: {
          email,
          name,
          image,
          role: role || "client",
          blocked: false,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//admin stats 
app.get("/admin/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await usersCollection.countDocuments();
    const totalTasks = await tasksCollection.countDocuments();

    const payments = await paymentsCollection.find().toArray();

    const totalRevenue = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const activeTasks = await tasksCollection.countDocuments({
      status: { $in: ["open", "in progress", "awaiting_payment"] },
    });

    res.json({
      totalUsers,
      totalTasks,
      totalRevenue,
      activeTasks,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//get users for admin
app.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  const users = await usersCollection.find().toArray();
  res.json(users);
});
//block users
app.patch("/admin/users/block/:id", requireAuth, requireAdmin, async (req, res) => {
  await usersCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { blocked: true } }
  );

  res.json({ success: true });
});
//unblock users
app.patch("/admin/users/unblock/:id", requireAuth, requireAdmin, async (req, res) => {
  await usersCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { blocked: false } }
  );

  res.json({ success: true });
});
//get all tasks for admin
app.get("/admin/tasks", requireAuth, requireAdmin, async (req, res) => {
  const tasks = await tasksCollection.find().toArray();
  res.json(tasks);
});
//delete tasks by admin
app.delete("/admin/tasks/:id", requireAuth, requireAdmin, async (req, res) => {
  await tasksCollection.deleteOne({
    _id: new ObjectId(req.params.id),
  });

  res.json({ success: true });
});

//admin payment 
app.get("/admin/payments", requireAuth, requireAdmin, async (req, res) => {
  const payments = await paymentsCollection
    .find()
    .sort({ paidAt: -1 })
    .toArray();

  res.json(payments);
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