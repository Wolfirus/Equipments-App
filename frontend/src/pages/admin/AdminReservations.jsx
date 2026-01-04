import React, { useEffect, useMemo, useState } from "react";
import { reservationAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminReservations() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      const u = (x.user_id?.name || x.user_id?.email || "").toLowerCase();
      const e = (x.equipment_id?.name || "").toLowerCase();
      const st = (x.status || "").toLowerCase();
      return u.includes(s) || e.includes(s) || st.includes(s);
    });
  }, [items, q]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await reservationAPI.list({ page: 1, limit: 200 });
      const list = res?.data?.reservations || res?.reservations || res?.data || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id) {
    setErr("");
    try {
      await reservationAPI.approve(id, {});
      await load();
    } catch (e) {
      setErr(e.message || "Erreur approve");
    }
  }

  async function reject(id) {
    const reason = window.prompt("Motif du refus (optionnel):") || "";
    setErr("");
    try {
      await reservationAPI.reject(id, { reason });
      await load();
    } catch (e) {
      setErr(e.message || "Erreur reject");
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="bg-white shadow-xl rounded-2xl p-6">
        <div className="font-semibold text-slate-900">Accès admin requis.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion des réservations</h1>
          <p className="text-sm text-slate-600">Valider / refuser les demandes.</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm" onClick={load}>
          Rafraîchir
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2 w-full sm:max-w-md">
          <i className="ni ni-zoom-split-in text-slate-500" />
          <input className="w-full outline-none text-sm text-slate-700" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {err && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
            {err}
          </div>
        )}
      </div>

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-slate-900">Liste</div>
          <div className="text-xs text-slate-500">{filtered.length} réservation(s)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Utilisateur</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Équipement</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Période</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Statut</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr className="border-t">
                  <td className="px-6 py-6 text-slate-600" colSpan={5}>Chargement...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="border-t">
                  <td className="px-6 py-6 text-slate-600" colSpan={5}>Aucune réservation.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="px-6 py-4 text-slate-900">{r.user_id?.name || r.user_id?.email || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{r.equipment_id?.name || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(r.start_date).toLocaleDateString("fr-FR")} → {new Date(r.end_date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{r.status || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90" onClick={() => approve(r._id)}>
                          Approve
                        </button>
                        <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50" onClick={() => reject(r._id)}>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}
