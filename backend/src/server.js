import express from "express";
import ticketRouter from "./routes/ticketRoutes.js"
import "dotenv/config"

const app = express();
const port = 3000;

app.use(express.json());

app.get("/", (req, res)=> {
    console.log("website is working");
    res.send("CampusFlow API");
});

app.use("/api/tickets", ticketRouter);

app.listen(port, ()=>{
    console.log(`Server is listening on the port : ${port}`);
})