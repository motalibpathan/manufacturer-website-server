const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.port || 5000;

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5wdvl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.send(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    console.log("DB connected");
    const productCollection = client.db("SpadexTools").collection("products");
    const userCollection = client.db("SpadexTools").collection("users");
    const orderCollection = client.db("SpadexTools").collection("orders");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    };

    app.get("/product", async (req, res) => {
      const result = await productCollection.find({}).toArray();
      res.send(result);
    });

    app.post("/product", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await productCollection.findOne(filter);
      res.send(result);
    });

    app.delete("/product/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/user", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find({}).toArray();
      res.send(result);
    });

    app.get("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      res.send(user);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      console.log(user);
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET);
      res.send({ result, token });
    });

    app.patch("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const userInfo = req.body;
      const filter = { email: email };
      const updateDoc = {
        $set: userInfo,
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    app.post("/order", verifyJWT, async (req, res) => {
      const orderInfo = req.body;
      const productId = orderInfo.productId;

      const filter = { _id: ObjectId(productId) };
      const product = await productCollection.findOne(filter);

      const newQuantity = +product.quantity - +orderInfo.orderQuantity;

      const result = await productCollection.updateOne(filter, {
        $set: { quantity: newQuantity },
      });

      const orderInsert = await orderCollection.insertOne(orderInfo);

      res.send(orderInsert);
    });

    app.get("/order", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await orderCollection.find({}).toArray();
      res.send(result);
    });

    app.get("/order/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await orderCollection.find(filter).toArray();
      res.send(result);
    });
    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const { orderQuantity, productId } = req.body;

      const filter = { _id: ObjectId(id) };
      const deleteResult = await orderCollection.deleteOne(filter);
      console.log(deleteResult);

      // find product and update quantity
      if (deleteResult.deletedCount > 0) {
        const query = { _id: ObjectId(productId) };
        const product = await productCollection.findOne(query);

        const newQuantity =
          parseInt(product.quantity) + parseInt(orderQuantity);

        const result = await productCollection.updateOne(query, {
          $set: { quantity: newQuantity },
        });
      }

      res.send(deleteResult);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Spadex Tools website server is running...");
});

app.listen(port, () => {
  console.log("Spadex Tools web running on port", port);
});
