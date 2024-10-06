import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function downloadResume() {
  const resumeElement = document.getElementById('resume-preview');
  if (!resumeElement) return;

  try {
    const canvas = await html2canvas(resumeElement, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save('resume.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

