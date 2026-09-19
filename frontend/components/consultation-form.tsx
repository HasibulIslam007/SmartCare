"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api, Appointment, MedicalRecord, Medicine, dateLabel } from "@/services/api";
import { ErrorMessage, Submit } from "./shared";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export function ConsultationForm({ appointment, save, pending, error }: { appointment: Appointment; save: (data: unknown) => void; pending: boolean; error: unknown }) {
  const [medicines, setMedicines] = useState<Medicine[]>(appointment.record?.medicines ?? []);
  const history = useQuery({ queryKey: ['history', appointment.patient.id], queryFn: () => api<MedicalRecord[]>(`patients/${appointment.patient.id}/history`) });
  function change(index: number, field: keyof Medicine, value: string) { setMedicines(current => current.map((m, i) => i === index ? { ...m, [field]: value } : m)); }
  return <>
    <details className="patient-history"><summary>Previous consultation records ({history.data?.length ?? 0})</summary><ErrorMessage error={history.error}/>{history.data?.map(r => <div key={r.id}><strong>{dateLabel(r.createdAt)} · {r.diagnosis}</strong><p>{r.notes}</p></div>)}{history.data?.length === 0 && <p>No previous records.</p>}</details>
    <form className="form-stack" onSubmit={e => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); save({ notes: data.notes, diagnosis: data.diagnosis, advice: data.advice, medicines, ...(data.followUp ? { followUp: data.followUp } : {}) }); }}>
      <div><Label htmlFor="notes">Consultation notes</Label><Textarea id="notes" name="notes" required defaultValue={appointment.record?.notes} maxLength={5000}/></div>
      <div><Label htmlFor="diagnosis">Diagnosis</Label><Input id="diagnosis" name="diagnosis" required defaultValue={appointment.record?.diagnosis} maxLength={1000}/></div>
      <fieldset className="medicine-fieldset"><legend>Prescription</legend>{medicines.map((m,i) => <div className="medicine-row" key={i}><div className="form-grid">{(['medicine','dose','frequency','duration'] as const).map(field => <div key={field}><Label htmlFor={`${field}-${i}`}>{field[0].toUpperCase()+field.slice(1)}</Label><Input id={`${field}-${i}`} value={m[field]} onChange={e=>change(i,field,e.target.value)} required maxLength={100}/></div>)}</div><Button type="button" variant="ghost" onClick={()=>setMedicines(current=>current.filter((_,index)=>index!==i))} aria-label={`Remove medicine ${i+1}`}><Trash2 size={14}/>Remove medicine</Button></div>)}<Button type="button" variant="outline" disabled={medicines.length>=30} onClick={()=>setMedicines(current=>[...current,{medicine:'',dose:'',frequency:'',duration:''}])}><Plus size={15}/>Add medicine</Button></fieldset>
      <div><Label htmlFor="advice">Advice</Label><Textarea id="advice" name="advice" defaultValue={appointment.record?.advice} maxLength={2000}/></div>
      <div><Label htmlFor="follow-up">Follow-up date</Label><Input id="follow-up" name="followUp" type="date" defaultValue={appointment.record?.followUp?.slice(0,10)}/></div>
      <ErrorMessage error={error}/><Submit pending={pending}>Save consultation</Submit>
    </form>
  </>;
}
