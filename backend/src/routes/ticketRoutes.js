import express from "express";
import pool from "../db/pool.js";

const router = express.Router();


router.get("/", async (req, res)=>{
    const result = await pool.query("SELECT * FROM tickets");
     
    res.json(result.rows[0])
});

router.get("/:id", async (req, res) =>{
    const result = req.params.id;
    const text = "SELECT * FROM tickets WHERE id = $1";
    const values = [result];
    
    try{
        const dbResult =  await pool.query(text, values);

        res.status(200).json({
            message : "data extracted", 
            data : dbResult.rows
        });
    }catch(err){
        console.log("Database error :", err.message);
    }

});

router.post("/",async (req, res)=>{
    const {id, description, created_by, status, assigned_to, timestamp} = req.body;

    const text = "INSERT INTO tickets values($1, $2, $3, $4, $5) RETURNING id";
    const values = [id, description, created_by,status,  assigned_to];
    
    try{
        const result = await pool.query(text, values);
        res.status(201).json({
            message : "Data recieved succesffuly",
            data : result.rows[0]
        });
    }catch(err){
        console.log("Database error : ", err.message);
    }
});

router.delete("/:id", async (req, res)=>{
    const result = req.params.id;
    const text = "DELETE FROM tickets where id = $1"
    const values = [result];

    try{
        const dbQuery = await pool.query(text, values);

        res.status(200).json({
            message : "Deleted",
            data : dbQuery.rows[0]
        });
    }catch(err){
        console.log(err.message);
    }
})

router.patch("/:id", async (req, res)=>{
    const {id} = req.params;

    const {description, created_by, status, assigned_to} = req.body;
    const text = "UPDATE tickets SET  description = COALESCE($2, description), created_by = COALESCE($3, created_by), status = COALESCE($4, status), assigned_to = COALESCE($5, assigned_to) WHERE id = $1 RETURNING *"; 
    const values = [id, description, created_by, status, assigned_to];
    try{
        const dbQuery = await pool.query(text, values);

        if(dbQuery.rows.length === 0){
            return res.status(404).json({
                error : "user not found"
            });
        }

        res.status(200).json({
            message : "Updated values",
            data : dbQuery.rows[0]
        });
    }catch(err){
        console.log(err.message);
    }
});

export default router;