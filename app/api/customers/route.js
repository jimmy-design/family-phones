import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

// ✅ READ (Get all customers)
export async function GET() {
  const conn = await getConnection();
  const [rows] = await conn.execute("SELECT * FROM customers ORDER BY created_at DESC");
  await conn.end();
  return NextResponse.json(rows);
}

// ✅ CREATE (Add a new customer)
export async function POST(request) {
  const data = await request.json();
  const conn = await getConnection();

  // Provide safe defaults so modal-only fields can be inserted without errors
  const full_name = (data.full_name || "").trim();
  const phone_number = data.phone_number ?? null;
  const id_number = data.id_number ?? null;

  // Defaults for optional sale-related columns
  const product_id = data.product_id ?? 0; // default 0
  const product_name = data.product_name ?? ""; // empty string
  const total_price = data.total_price ?? 0.0; // 0.00
  const amount_deposited = data.amount_deposited ?? 0.0; // 0.00
  const payment_status = data.payment_status ?? "Pending";
  const payment_type = data.payment_type ?? "Installment";

  if (!full_name) {
    await conn.end();
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  const city = data.city ?? ""; // NOT NULL per schema
  const next_of_kin = data.next_of_kin ?? null;
  const installment_id = data.installment_id ?? null;
  const pay_status = data.payment_status ?? "Pending";
  const pay_type = data.payment_type ?? "Installment";

  if (!installment_id) {
    await conn.end();
    return NextResponse.json({ error: "installment_id is required" }, { status: 400 });
  }

  const [result] = await conn.execute(
    `INSERT INTO customers 
      (full_name, phone_number, id_number, city, next_of_kin, installment_id, amount_deposited, payment_status, payment_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      full_name,
      phone_number,
      id_number,
      city,
      next_of_kin,
      installment_id,
      amount_deposited,
      pay_status,
      pay_type,
    ]
  );

  await conn.end();
  return NextResponse.json({ id: result.insertId, message: "Customer added successfully" });
}

// ✅ UPDATE (Edit existing customer)
export async function PUT(request) {
  const data = await request.json();
  const conn = await getConnection();

  await conn.execute(
    `UPDATE customers 
     SET full_name=?, phone_number=?, id_number=?, product_id=?, product_name=?, 
         total_price=?, amount_deposited=?, payment_status=?, payment_type=? 
     WHERE customer_id=?`,
    [
      data.full_name,
      data.phone_number,
      data.id_number,
      data.product_id,
      data.product_name,
      data.total_price,
      data.amount_deposited,
      data.payment_status,
      data.payment_type,
      data.customer_id,
    ]
  );

  await conn.end();
  return NextResponse.json({ message: "Customer updated successfully" });
}

// ✅ DELETE (Remove customer)
export async function DELETE(request) {
  const { customer_id } = await request.json();
  const conn = await getConnection();
  await conn.execute("DELETE FROM customers WHERE customer_id=?", [customer_id]);
  await conn.end();
  return NextResponse.json({ message: "Customer deleted successfully" });
}
