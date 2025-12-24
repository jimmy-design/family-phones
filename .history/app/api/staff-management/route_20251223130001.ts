import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

export async function GET() {
  try {
    const { data, error } = await supabase.from("employee").select("*");
    if (error) {
      console.error("Supabase GET error (employee):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Error fetching staff:", err);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Basic validation / sanitization and mapping camelCase -> snake_case
    const {
      firstName,
      lastName,
      email = null,
      phone = null,
      jobTitle = null,
      department = null,
      salary = null,
      hireDate = null,
      status = "Active",
    } = data || {};

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
    }

    const payload = {
      first_name: String(firstName).trim(),
      last_name: String(lastName).trim(),
      email: email ? String(email).trim() : null,
      phone: phone ? String(phone).trim() : null,
      job_title: jobTitle ? String(jobTitle).trim() : null,
      department: department ? String(department).trim() : null,
      salary: salary !== null && salary !== undefined && salary !== "" ? Number(salary) : null,
      hire_date: hireDate || null,
      status: status ? String(status).trim() : "Active",
    };

    const { data: inserted, error } = await supabase.from("employee").insert([payload]).select();
    if (error) {
      console.error("Supabase insert error (employee):", error);
      return NextResponse.json({ error: error.message || "Failed to insert employee" }, { status: 500 });
    }

    return NextResponse.json({ message: "Staff member added successfully", data: inserted }, { status: 201 });
  } catch (error) {
    console.error("Error with staff management:", error);
    return NextResponse.json({ error: "Failed to process staff management" }, { status: 500 });
  }
}