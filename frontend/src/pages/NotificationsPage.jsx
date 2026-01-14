import React, { useEffect, useState } from "react";
import { notificationsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function NotificationsPage() {
  const { refreshUnread } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // backend -> data: { notifications, pagination, unread_count, filters }
      const data = await notificationsAPI.list({ page: 1, limit: 50 });
      setItems(data?.notifications || []);
      await refreshUnread();
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markRead(id) {
    try {
      await notificationsAPI.readOne(id);
      await load();
    } catch (e) {
      alert(e.message || "Erreur");
    }
  }

  async function markAll() {
    try {
      await notificationsAPI.readAll();
      await load();
    } catch (e) {
      alert(e.message || "Erreur");
    }
  }

  async function remove(id) {
    if (!window.confirm("Supprimer cette notification ?")) return;
    try {
      await notificationsAPI.remove(id);
      await load();
    } catch (e) {
      alert(e.message || "Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-600">Vos alertes et mises à jour.</p>
        </div>

        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm"
            onClick={load}
          >
            Rafraîchir
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90 text-sm"
            onClick={markAll}
          >
            Tout marquer comme lu
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {err}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-slate-900">Liste</div>
          <div className="text-xs text-slate-500">{items.length} notification(s)</div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-600">Chargement...</div>
        ) : (
          <div className="divide-y">
            {items.map((n) => (
              <div key={n._id} className="p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-slate-900">{n.title}</div>
                    {!n.read && (
                      <span className="text-xs bg-red-600 text-white rounded-full px-2 py-0.5">
                        Nouveau
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString("fr-FR") : ""}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                    {n.message}
                  </div>

                  {n.action_url && (
                    <a
                      href={n.action_url}
                      className="inline-block mt-3 text-sm text-slate-900 underline"
                    >
                      {n.action_text || "Ouvrir"}
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  {!n.read && (
                    <button
                      className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                      onClick={() => markRead(n._id)}
                    >
                      Marquer lu
                    </button>
                  )}
                  <button
                    className="px-3 py-2 rounded-lg bg-red-600 text-white hover:opacity-90 text-sm"
                    onClick={() => remove(n._id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}

            {!items.length && (
              <div className="p-6 text-slate-600">Aucune notification.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
