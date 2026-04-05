import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { generateInvoicePdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    let query = admin
      .from("transactions")
      .select(
        `
        id,
        order_id,
        amount,
        discount_amount,
        final_amount,
        status,
        coupon_code,
        created_at,
        user_id,
        products ( name ),
        app_credentials ( account_data ),
        profiles ( full_name )
      `
      )
      .eq("order_id", params.orderId);

    if (profile?.role !== "admin") {
      query = query.eq("user_id", user.id);
    }

    const { data: transaction, error: transactionError } = await query.single();

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const product = Array.isArray(transaction.products)
      ? transaction.products[0]
      : transaction.products;

    const credential = Array.isArray(transaction.app_credentials)
      ? transaction.app_credentials[0]
      : transaction.app_credentials;

    const customer = Array.isArray(transaction.profiles)
      ? transaction.profiles[0]
      : transaction.profiles;

    const pdfBytes = await generateInvoicePdf({
      orderId: transaction.order_id,
      productName: product?.name || "Produk Premium",
      customerName:
        customer?.full_name ||
        profile?.full_name ||
        user.email ||
        "Customer",
      amount: Number(transaction.amount),
      discountAmount: Number(transaction.discount_amount ?? 0),
      finalAmount: Number(transaction.final_amount ?? transaction.amount),
      status: transaction.status,
      createdAt: transaction.created_at,
      credential: credential?.account_data ?? null,
      couponCode: transaction.coupon_code ?? null
    });

    const pdfBuffer = Buffer.from(pdfBytes);

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${transaction.order_id}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "private, no-store, max-age=0, must-revalidate"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invoice gagal dibuat"
      },
      { status: 500 }
    );
  }
}