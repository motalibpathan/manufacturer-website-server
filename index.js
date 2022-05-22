const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
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

async function run() {
  try {
    await client.connect();
    console.log("DB connected");
    const productCollection = client.db("SpadexTools").collection("products");
    const userCollection = client.db("SpadexTools").collection("users");
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
