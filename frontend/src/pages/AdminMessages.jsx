import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { messagesAPI } from "../services/api";

export default function AdminMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const isManager = user?.role === "admin" || user?.role === "supervisor";

  const fetchMessages = async () => {
    setLoading(true);
    setErr("");
    try {
      const list = await messagesAPI.list();
      setMessages(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e.message || "Erreur lors du chargement des messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManager) fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager]);

  const deleteMessage = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce message ?")) return;
    try {
      await messagesAPI.remove(id);
      setMessages((prev) => prev.filter((m) => m._id !== id));
    } catch (e) {
      alert(e.message || "Erreur lors de la suppression");
    }
  };

  if (!isManager) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="font-semibold text-slate-900">Accès administrateur/superviseur requis.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
          <p className="text-sm text-slate-600 mt-1">Messages reçus depuis la page Contact.</p>
        </div>
        <button
          className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm"
          onClick={fetchMessages}
        >
          Rafraîchir
        </button>
      </div>

      {err && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">{err}</div>}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-slate-900">Liste</div>
          <div className="text-xs text-slate-500">{messages.length} message(s)</div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-600">Chargement...</div>
        ) : (
          <div className="divide-y">
            {messages.map((m) => (
              <div key={m._id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {m.name} <span className="text-slate-500 font-normal">({m.email})</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString("fr-FR") : ""}
                    </div>
                  </div>

                  <button
                    className="px-3 py-2 rounded-lg bg-red-600 text-white hover:opacity-90 text-sm"
                    onClick={() => deleteMessage(m._id)}
                  >
                    Supprimer
                  </button>
                </div>

                <p className="mt-4 text-sm text-slate-700 whitespace-pre-wrap">{m.message}</p>
              </div>
            ))}

            {!messages.length && <div className="p-6 text-slate-600">Aucun message.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
