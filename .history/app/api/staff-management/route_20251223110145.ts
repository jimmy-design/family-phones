import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

// Placeholder for staff-management API
export async function GET() {
  return NextResponse.json({ message: "Staff management endpoint" });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Basic validation / sanitization
    const {
      first_name,
      last_name,
      email = null,
      phone = null,
      job_title = null,
      department = null,
      salary = null,
      hire_date = null,
      status = "Active",
    } = data || {};

    if (!first_name || !last_name) {
      return NextResponse.json({ error: "first_name and last_name are required" }, { status: 400 });
    }

    const payload = {
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: email ? String(email).trim() : null,
      phone: phone ? String(phone).trim() : null,
      job_title: job_title ? String(job_title).trim() : null,
      department: department ? String(department).trim() : null,
      salary: salary !== null && salary !== undefined && salary !== "" ? Number(salary) : null,
      hire_date: hire_date || null,
      status: status ? String(status).trim() : "Active",
    };

    const { data: inserted, error } = await supabase.from("employee").insert([payload]).select();
    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message || "Failed to insert employee" }, { status: 500 });
    }

    return NextResponse.json({ message: "Staff member added successfully", data: inserted });
  } catch (error) {
    console.error("Error with staff management:", error);
    return NextResponse.json({ error: "Failed to process staff management" }, { status: 500 });
  }
}