import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

interface Sale extends RowDataPacket {
  id: number;
  customer_id: number;
  inventory_item_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

// ✅ CREATE (Add new sale)
export async function POST(request: Request) {
  const data = await request.json();
  const conn = await getConnection();

  try {
    // Begin transaction
    await conn.beginTransaction();

    // Insert the sale record
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO sales 
        (customer_id, inventory_item_id, quantity, unit_price, total_amount, payment_method, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.customer_id,
        data.inventory_item_id,
        data.quantity,
        data.unit_price,
        data.total_amount,
        data.payment_method,
        data.payment_status || "Paid",
      ]
    );

    // Update inventory quantity
    await conn.execute(
      `UPDATE inventory 
       SET quantity = quantity - ? 
       WHERE id = ?`,
      [data.quantity, data.inventory_item_id]
    );

    // Commit transaction
    await conn.commit();

    await conn.end();
    return NextResponse.json({ id: result.insertId, message: "Sale created successfully" });
  } catch (error) {
    // Rollback transaction in case of error
    await conn.rollback();
    await conn.end();
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}

// ✅ READ (Get all sales)
export async function GET() {
  const conn = await getConnection();
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT s.*, c.full_name as customer_name, i.name as item_name 
     FROM sales s 
     JOIN customers c ON s.customer_id = c.customer_id 
     JOIN inventory i ON s.inventory_item_id = i.id 
     ORDER BY s.created_at DESC`
  );
  await conn.end();
  return NextResponse.json(rows);
}