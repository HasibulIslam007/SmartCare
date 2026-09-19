import { deflateSync } from "node:zlib";

type Medicine = { medicine: string; dose: string; frequency: string; duration: string };

function escapePdfText(value: string) {
  return value.replace(/[\\()\r\n]/g, (character) => `\\${character}`);
}

export function createPrescriptionPdf(input: {
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  patientName: string;
  doctorName: string;
  departmentName: string;
  date: string;
  diagnosis: string;
  advice: string;
  followUp: string | null;
  medicines: Medicine[];
}) {
  const lines = [
    input.hospitalName,
    input.hospitalAddress,
    input.hospitalPhone ? `Phone: ${input.hospitalPhone}` : "",
    "PRESCRIPTION",
    `Date: ${input.date}`,
    `Patient: ${input.patientName}`,
    `Doctor: ${input.doctorName} — ${input.departmentName}`,
    `Diagnosis: ${input.diagnosis}`,
    "Medicines:",
    ...input.medicines.map((medicine, index) => `${index + 1}. ${medicine.medicine} | ${medicine.dose} | ${medicine.frequency} | ${medicine.duration}`),
    `Advice: ${input.advice || "None"}`,
    ...(input.followUp ? [`Follow-up: ${input.followUp}`] : []),
    "Consult your doctor for medical decisions.",
  ].filter(Boolean);
  const stream = ["BT", "/F1 11 Tf", "50 760 Td", ...lines.flatMap((line, index) => [index ? "0 -18 Td" : "", `(${escapePdfText(line)}) Tj`]), "ET"].filter(Boolean).join("\n");
  const compressed = deflateSync(Buffer.from(stream));
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n${compressed.toString("latin1")}\nendstream`,
  ];
  const chunks = [Buffer.from("%PDF-1.4\n")];
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.concat(chunks).length);
    chunks.push(Buffer.from(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`, "latin1"));
  }
  const bodyLength = Buffer.concat(chunks).length;
  const xref = [`xref\n0 ${objects.length + 1}`, "0000000000 65535 f ", ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)].join("\n");
  chunks.push(Buffer.from(`${xref}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${bodyLength}\n%%EOF\n`, "latin1"));
  return Buffer.concat(chunks);
}