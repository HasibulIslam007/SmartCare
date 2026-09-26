"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Access } from "@/components/access";
import { ErrorMessage, Loading, PageHeading, Empty } from "@/components/shared";
import { api, Notification } from "@/services/api";
import { Button } from "@/components/ui/button";

function Content() {
  const client = useQueryClient();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => api<Notification[]>("notifications") });
  const readAll = useMutation({ mutationFn: () => api("notifications/read-all", { method: "PATCH" }), onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }) });
  const read = useMutation({ mutationFn: (id: string) => api(`notifications/${id}/read`, { method: "PATCH" }), onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }) });
  return <>
    <PageHeading eyebrow="STAY IN THE LOOP" title="Notifications" description="Important updates from your SmartCare team." />
    <div className="section-title"><div><span className="eyebrow">YOUR UPDATES</span><h2>Recent notifications</h2></div><Button variant="outline" onClick={() => readAll.mutate()} disabled={readAll.isPending}>Mark all read</Button></div>
    <ErrorMessage error={notifications.error} />
    {notifications.isPending ? <Loading /> : notifications.data?.length ? <div className="space-y-3">{notifications.data.map((item) => <article key={item.id} className={`rounded-xl border p-5 ${item.read ? "opacity-70" : "bg-card"}`}><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-muted-foreground">{item.message}</p><time className="mt-3 block text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time></div>{!item.read && <Button variant="ghost" onClick={() => read.mutate(item.id)}>Mark read</Button>}</div></article>)}</div> : <Empty title="You’re all caught up" text="New appointment, queue, report, and prescription updates will appear here." />}
  </>;
}
export default function Notifications() { return <Access roles={["PATIENT"]}><Content /></Access>; }