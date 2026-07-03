export interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  contraindications: string;
}

export interface DiagnosticResult {
  kl_grade?: number;
  confidence?: number;
  diagnosis_summary?: string;
  recommendation?: string;
  warnings?: string[];
  exercise_video_urls?: string[];
  medications?: Medication[];
}
