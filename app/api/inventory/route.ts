import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

// ✅ READ (Get all inventory items)
export async function GET() {
  const conn = await getConnection();
  const [rows] = await conn.execute("SELECT * FROM inventory ORDER BY date_updated DESC");
  await conn.end();
  return NextResponse.json(rows);
}

// ✅ CREATE (Add new inventory item)
export async function POST(request: Request) {
  const data = await request.json();
  const conn = await getConnection();

  const [result] = await conn.execute(
    `INSERT INTO inventory 
      (imei, model, name, price, offer_price, quantity, status, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.imei,
      data.model,
      data.name,
      data.price,
      data.offer_price,
      data.quantity || 0,
      data.status || "Available",
      data.updated_by || null,
    ]
  );

  await conn.end();
  return NextResponse.json({ id: result.insertId, message: "Inventory item added successfully" });
}

// ✅ UPDATE (Edit existing inventory item)
export async function PUT(request: Request) {
  const data = await request.json();
  const conn = await getConnection();

  await conn.execute(
    `UPDATE inventory 
     SET imei=?, model=?, name=?, price=?, offer_price=?, quantity=?, status=?, updated_by=? 
     WHERE id=?`,
    [
      data.imei,
      data.model,
      data.name,
      data.price,
      data.offer_price,
      data.quantity,
      data.status,
      data.updated_by,
      data.id,
    ]
  );

  await conn.end();
  return NextResponse.json({ message: "Inventory item updated successfully" });
}

// ✅ DELETE (Remove inventory item)
export async function DELETE(request: Request) {
  const { id } = await request.json();
  const conn = await getConnection();

  await conn.execute("DELETE FROM inventory WHERE id=?", [id]);

  await conn.end();
  return NextResponse.json({ message: "Inventory item deleted successfully" });
}
