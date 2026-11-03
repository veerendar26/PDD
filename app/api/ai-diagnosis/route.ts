import { NextRequest, NextResponse } from "next/server";
import { runStagedDiagnosis } from "@/lib/ai/vision-analyzer";
import { DiagnosisRequestPayload, ImageInputPayload } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Normalize images: accept array of images or legacy image_url
    let images: ImageInputPayload[] = [];
    if (Array.isArray(body.images) && body.images.length > 0) {
      images = body.images;
    } else if (body.image_url && typeof body.image_url === "string") {
      images = [
        {
          filename: body.image_filename || "uploaded_image.jpg",
          type: "image/jpeg",
          size: 1024,
          data: body.image_url,
        },
      ];
    }

    const payload: DiagnosisRequestPayload = {
      category: (body.category || "Electronics").trim(),
      issue_description: (body.issue_description || "").trim(),
      brand: (body.brand || "").trim(),
      model: (body.model || "").trim(),
      images,
      videos_attached_count: Number(body.videos_attached_count) || 0,
    };

    const diagnosis = await runStagedDiagnosis(payload);

    // Provide both enhanced fields and backwards-compatible legacy fields
    const responsePayload = {
      ...diagnosis,
      // Legacy compatibility fields
      issue_labels: diagnosis.defects.map((d) => d.title),
      confidence_scores: diagnosis.defects.map((d) =>
        d.evidence_type === "visual_confirmed"
          ? 0.95
          : d.evidence_type === "symptom_correlated"
          ? 0.8
          : 0.65
      ),
      estimated_cost_range: diagnosis.repair_estimate.cost_range,
      recommended_action: diagnosis.recommended_procedure,
      turnaround_estimate: diagnosis.repair_estimate.turnaround_time,
      tips: diagnosis.pre_service_tips,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("[API/ai-diagnosis] Error executing diagnosis:", error);
    return NextResponse.json(
      {
        overall_status: "error",
        selected_category: "Electronics",
        image_evaluations: [],
        has_blocking_mismatch: false,
        defects: [
          {
            title: "Hardware Diagnostic Inspection Required",
            category: "General",
            evidence_type: "requires_inspection",
            status_label: "Requires Physical Test",
            description: "An automated diagnostic could not be completed. A physical inspection by a verified technician is recommended.",
          },
        ],
        repair_estimate: {
          cost_range: "Quotation Pending Physical Inspection",
          is_quote_pending: true,
          pricing_note: "Technician diagnostic physical inspection required.",
          turnaround_time: "1 - 3 Hours",
          labor_time: "To be determined",
        },
        severity: "Moderate",
        recommended_procedure: "Comprehensive multi-point examination by verified technician.",
        inspection_required: true,
        pre_service_tips: ["Keep the unit in a safe location until the technician arrives."],
        follow_up_questions: ["Has the device been serviced previously?"],
        summary: "Physical inspection recommended by our certified technicians.",
        timestamp: new Date().toISOString(),
        // Legacy
        issue_labels: ["Hardware Diagnostic Inspection Required"],
        confidence_scores: [0.7],
        estimated_cost_range: "₹500 - ₹2,500",
        recommended_action: "Technician diagnostic physical inspection.",
        turnaround_estimate: "1 - 3 Hours",
        tips: ["Keep the unit in a safe location until the technician arrives."],
      },
      { status: 200 }
    );
  }
}
