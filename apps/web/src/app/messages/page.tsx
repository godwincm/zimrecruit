"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuthStore";
import toast from "react-hot-toast";

type Conversation = {
  id: string;
  participant_id: string;
  participant_name: string;
  last_message?: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  body: string;
  created_at: string;
};

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  const nav = useMemo(() => {
    const home = user?.roles.includes("admin") ? "/admin" :
      user?.roles.includes("verifier") ? "/verifier" :
      user?.roles.includes("employer") ? "/employer" : "/applicant";
    return [
      { href: home, label: "Dashboard", icon: "Overview" },
      { href: "/messages", label: "Messages", icon: "Applications" },
    ];
  }, [user]);

  const loadConversations = async () => {
    const result = await api.messages.conversations();
    setConversations(result.conversations);
    setActiveId(current => current || result.conversations[0]?.id || "");
  };

  useEffect(() => {
    Promise.all([loadConversations(), api.messages.contacts().then(result => setContacts(result.contacts))])
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    api.messages.list(activeId).then(result => setMessages(result.messages)).catch((err: Error) => toast.error(err.message));

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => setMessages(current => current.some(item => item.id === (payload.new as Message).id)
          ? current
          : [...current, payload.new as Message])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  const startConversation = async (participantId: string) => {
    if (!participantId) return;
    const result = await api.messages.create(participantId);
    await loadConversations();
    setActiveId(result.conversationId);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!activeId || !text) return;
    await api.messages.send(activeId, text);
    setBody("");
    const result = await api.messages.list(activeId);
    setMessages(result.messages);
    await loadConversations();
  };

  return (
    <DashboardLayout title="Messages" subtitle="Private conversations powered by Supabase Realtime" nav={nav}>
      <div className="mb-4 flex justify-end">
        <select className="wire-field max-w-xs" defaultValue="" onChange={(event) => startConversation(event.target.value)}>
          <option value="">Start a conversation...</option>
          {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.full_name}</option>)}
        </select>
      </div>
      {loading ? <div className="flex h-52 items-center justify-center"><Spinner /></div> : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="overflow-hidden p-0">
            {conversations.length === 0 && <p className="p-4 text-sm text-[var(--fg-muted)]">No conversations yet.</p>}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setActiveId(conversation.id)}
                className={`block w-full border-b border-[var(--border)] p-4 text-left ${activeId === conversation.id ? "bg-[var(--primary-fade)]" : ""}`}
              >
                <div className="text-sm font-semibold">{conversation.participant_name}</div>
                <div className="truncate text-xs text-[var(--fg-muted)]">{conversation.last_message ?? "New conversation"}</div>
              </button>
            ))}
          </Card>
          <Card className="flex min-h-[460px] flex-col p-0">
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {!activeId && <p className="text-sm text-[var(--fg-muted)]">Choose a conversation to begin.</p>}
              {messages.map((message) => (
                <div key={message.id} className={`max-w-[82%] rounded-xl p-3 text-sm ${message.sender_id === user?.id ? "ml-auto bg-[var(--primary)] text-white" : "bg-[var(--muted)]"}`}>
                  <p>{message.body}</p>
                  <p className="mt-1 text-[11px] opacity-70">{new Date(message.created_at).toLocaleString("en-ZW")}</p>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="flex gap-3 border-t border-[var(--border)] p-4">
              <input value={body} onChange={(event) => setBody(event.target.value)} disabled={!activeId} className="wire-field flex-1" placeholder="Write a message..." />
              <button type="submit" disabled={!activeId || !body.trim()} className="wire-button">Send</button>
            </form>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
