import { NextRequest, NextResponse } from 'next/server';

// This tells Next.js to use the Edge runtime, which is required for Cloudflare D1
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data } = body;

    // Connect to the D1 database using the binding we set up in Cloudflare
    const db = process.env.DB as any; 

    if (!db) {
      return NextResponse.json({ error: "Database connection not found" }, { status: 500 });
    }

    // We will use a transaction to insert all rows efficiently
    const stmt = db.prepare(
      `INSERT INTO survey_responses (workgroup, attendance, topics_json) VALUES (?, ?, ?)`
    );

    const batch = data.map((row: any) => {
      return stmt.bind(
        row.workGroup || "Unknown",
        row.attendance || "Unknown",
        JSON.stringify(row.topics) // Store the array of topics as a JSON string
      );
    });

    // Execute the batch insert
    await db.batch(batch);

    return NextResponse.json({ success: true, message: `Inserted ${data.length} responses.` });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}