export type ImageMatchStatus =
  | "valid_match"
  | "possible_mismatch"
  | "wrong_category"
  | "unrelated_image"
  | "unreadable_image"
  | "insufficient_evidence"
  | "needs_review";

export interface ImageInputPayload {
  filename: string;
  type: string;
  size: number;
  data: string; // Base64 or data URL
}

export interface ImageValidationResult {
  id: string;
  filename: string;
  status: ImageMatchStatus;
  apparent_category: string;
  apparent_device_type: string;
  confidence_level: "High" | "Medium" | "Low" | "Uncertain";
  match_with_selected_category: boolean;
  visual_evidence_found: string[];
  is_fault_visually_verifiable: boolean;
  explanation: string;
  recommendation: string;
}

export interface DefectFinding {
  title: string;
  category: string;
  evidence_type: "visual_confirmed" | "symptom_correlated" | "requires_inspection";
  status_label: "Confirmed by Image" | "Probable Cause" | "Possible Cause" | "Requires Physical Test";
  description: string;
}

export interface RepairEstimate {
  cost_range: string;
  is_quote_pending: boolean;
  pricing_note: string;
  turnaround_time: string;
  labor_time: string;
}

export interface EnhancedDiagnosisResult {
  overall_status:
    | "verified"
    | "mismatch_detected"
    | "insufficient_evidence"
    | "symptom_hypothesis_only"
    | "error";
  selected_category: string;
  image_evaluations: ImageValidationResult[];
  has_blocking_mismatch: boolean;
  blocking_reason?: string;
  defects: DefectFinding[];
  repair_estimate: RepairEstimate;
  severity: "Low" | "Moderate" | "High" | "Critical";
  recommended_procedure: string;
  inspection_required: boolean;
  pre_service_tips: string[];
  follow_up_questions: string[];
  summary: string;
  timestamp: string;
}

export interface DiagnosisRequestPayload {
  category: string;
  issue_description: string;
  brand?: string;
  model?: string;
  images?: ImageInputPayload[];
  videos_attached_count?: number;
}
