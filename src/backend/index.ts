import express from "express";
import cors from "cors";
const app = express();

const PORT = process.env.PORT ?? 8080;

app.use(cors());

app.get("/newznab/:id", (req, res) => {
  return res.send("woo");
});

app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});
