import express from "express";

// This will help us connect to the database
import db from "../db/connection.js";

// This helps convert the id from a string to ObjectId for the _id.
import { ObjectId } from "mongodb";

// router is an instance of the express router.
// We use it to define our routes.
// The router will be added as middleware and will take control of requests starting with path /record.
const router = express.Router();

// This section will help you get a list of all the records or filter by level.
router.get("/", async (req, res) => {
  try {
    let collection = await db.collection("records");

    // Get the level from query parameters
    const { level } = req.query;

    // Create a filter if a level is provided
    const filter = level ? { level: level } : {};

    // Fetch records based on the filter
    let results = await collection.find(filter).toArray();
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving records");
  }
});

// This section will help you get a single record by id.
router.get("/:id", async (req, res) => {
  try {
    let collection = await db.collection("records");
    let query = { _id: new ObjectId(req.params.id) };
    let result = await collection.findOne(query);

    if (!result) res.status(404).send("Record not found");
    else res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving record");
  }
});

// This section will help you create a new record.
router.post("/", async (req, res) => {
  try {
    let newDocument = {
      name: req.body.name,
      position: req.body.position,
      level: req.body.level,
    };
    let collection = await db.collection("records");
    let result = await collection.insertOne(newDocument);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding record");
  }
});

// This section will help you update a record by id.
router.patch("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send("Invalid ID format");
  }
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const updates = {
      $set: {
        name: req.body.name,
        position: req.body.position,
        level: req.body.level,
      },
    };

    let collection = await db.collection("records");
    let result = await collection.updateOne(query, updates);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating record");
  }
});

// This section will help you delete a record.
router.delete("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send("Invalid ID format");
  }
  try {
    const query = { _id: new ObjectId(req.params.id) };

    const collection = db.collection("records");
    let result = await collection.deleteOne(query);

    if (result.deletedCount === 0) {
      res.status(404).send("Record not found");
    } else {
      res.status(200).json(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting record");
  }
});



router.delete("/bulk-delete", async (req, res) => {
  const ids = req.body.ids;  // Assume IDs are passed as an array in the request body

  // Validate all provided IDs
  if (!ids.every(ObjectId.isValid)) {
    return res.status(400).send("Invalid ID format in array");
  }

  try {
    const query = { _id: { $in: ids.map(id => new ObjectId(id)) } };
    const collection = db.collection("records");
    const result = await collection.deleteMany(query);

    if (result.deletedCount === 0) {
      return res.status(404).send("No records found to delete");
    }
    res.status(200).send({ deletedCount: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting records");
  }
});




export default router;
