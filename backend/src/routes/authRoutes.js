import express from "express";
import bcrypt from "bcrypt";
import pool from "../db/pool.js";

const router = express.Router();

async function generateHashPassword(plainText){
    const saltRounds = 10;

    const hashedPassword = await bcrypt.hash(plainText, saltRounds);

    return hashedPassword;
}

router.post("/student/register", async (req , res)=>{

    const client = await pool.connect();

    try{
        
        await client.query("BEGIN");
        
        const {prn, name, email, password, department, year, roll_no, hosteller} = req.body;
        
        const hashPassword = await generateHashPassword(password);

        const auth_text = "INSERT INTO auth_account(email, password_hash) VALUES($1, $2) RETURNING id";
        const auth_values = [email, hashPassword];
        
        const authQuery = await pool.query(auth_text, auth_values);
        
        const student_text = "INSERT INTO students (prn, auth_id, name, department, year,roll_no, hosteller) VALUES ($1, $2, $3, $4, $5, $6, $7)";
        const auth_id = authQuery.rows[0].id;
        const student_values = [prn, auth_id, name, department, year, roll_no, hosteller];
        
        const studnetQuery = await pool.query(student_text, student_values);

        await client.query("COMMIT");


        res.status(201).json({
            message : "data saved",
        })
    }catch(err){
        
        await client.query("ROLLBACK");

        console.log("Database error : ", err);

        res.status(500).json({
            message : "Registration failed"
        });
    }finally{
        client.release();
    } 
})

export default router;