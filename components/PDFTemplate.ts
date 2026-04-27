export interface PDFTemplate {
  hospitalName: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  hospitalLogo?: string;
  doctorTitle: string;
  doctorSignature: string;
  footerText?: string;
  language: 'az' | 'en' | 'ru' | 'tr';
  customFields?: {
    label: string;
    value: string;
  }[];
}

export const defaultPDFTemplate: PDFTemplate = {
  hospitalName: "Tıp Mərkəzi",
  hospitalAddress: "Bakı şəhəri, Azərbaycan",
  hospitalPhone: "+994 12 123 45 67",
  doctorTitle: "Həkim",
  doctorSignature: "Rəsmi möhür və imza",
  footerText: "Bu sənəd elektron imza ilə təsdiqlənmişdir",
  language: 'az',
  customFields: []
};

// Klinik ayarları için localStorage'dan yükleme
export function loadPDFTemplate(): PDFTemplate {
  if (typeof window === 'undefined') return defaultPDFTemplate;

  const saved = localStorage.getItem('hospital_pdf_template');
  if (saved) {
    try {
      return { ...defaultPDFTemplate, ...JSON.parse(saved) };
    } catch {
      return defaultPDFTemplate;
    }
  }
  return defaultPDFTemplate;
}

// Klinik ayarlarını kaydetme
export function savePDFTemplate(template: Partial<PDFTemplate>): void {
  if (typeof window === 'undefined') return;

  const current = loadPDFTemplate();
  const updated = { ...current, ...template };
  localStorage.setItem('hospital_pdf_template', JSON.stringify(updated));
}