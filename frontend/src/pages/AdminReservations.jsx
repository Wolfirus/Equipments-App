import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { reservationAPI } from "../services/api";

export default function AdminReservations() {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isManager = role === "admin" || role === "supervisor";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      // ✅ manager => /reservations/manage
      const data = await reservationAPI.manage({ page: 1, limit: 200 });

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.reservations)
        ? data.reservations
        : [];

      setItems(list);
    } catch (e) {
      setErr(e?.message || "Erreur chargement réservations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManager) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((r) => {
      const eqName = (
        r.equipment_id?.name ||
        r.equipment?.name ||
        r.equipment_name ||
        ""
      ).toLowerCase();

      const userName = (
        r.user_id?.name ||
        r.user?.name ||
        r.requested_by ||
        ""
      ).toLowerCase();

      const okSearch = !s || eqName.includes(s) || userName.includes(s);
      const okStatus = !status || String(r.status || "").toLowerCase() === status;
      return okSearch && okStatus;
    });
  }, [items, q, status]);

  const act = async (id, action) => {
    try {
      setBusyId(id);

      if (action === "approve") {
        await reservationAPI.approve(id);
      }

      if (action === "reject") {
        const reason =
          window.prompt("Motif du refus (optionnel) :", "Demande refusée") ||
          "Demande refusée";
        await reservationAPI.reject(id, reason);
      }

      if (action === "cancel") {
        await reservationAPI.cancel(id);
      }

      await load();
    } catch (e) {
      alert(e?.message || "Erreur action");
    } finally {
      setBusyId(null);
    }
  };

  if (!isManager) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="font-semibold text-slate-900">
          Accès administrateur/superviseur requis.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Gestion des réservations
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Valider, refuser ou annuler les réservations.
          </p>
        </div>

        <button
          className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm"
          onClick={load}
          disabled={loading}
        >
          Rafraîchir
        </button>
      </div>

      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {err}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
            placeholder="Rechercher (équipement / utilisateur)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvée</option>
            <option value="rejected">Refusée</option>
            <option value="cancelled">Annulée</option>
            <option value="active">Active</option>
            <option value="completed">Terminée</option>
            <option value="overdue">En retard</option>
          </select>
          <div className="text-xs text-slate-500 flex items-center">
            {filtered.length} résultat(s)
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="font-semibold text-slate-900">Liste</div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-600">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">
                    Équipement
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">
                    Période
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r) => {
                  const eqName =
                    r.equipment_id?.name ||
                    r.equipment?.name ||
                    r.equipment_name ||
                    "—";

                  const uName =
                    r.user_id?.name ||
                    r.user?.name ||
                    r.requested_by ||
                    "—";

                  const busy = busyId === r._id;

                  const st = String(r.status || "").toLowerCase();
                  const canManage = st === "pending";

                  return (
                    <tr key={r._id} className="border-t">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {eqName}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{uName}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {r.start_date
                          ? new Date(r.start_date).toLocaleDateString("fr-FR")
                          : "—"}{" "}
                        →{" "}
                        {r.end_date
                          ? new Date(r.end_date).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{st || "—"}</td>

                      {/* ✅ Boutons uniquement si pending */}
                      <td className="px-6 py-4 text-right">
                        {canManage ? (
                          <div className="inline-flex gap-2">
                            <button
                              className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:opacity-90 disabled:opacity-60"
                              disabled={busy}
                              onClick={() => act(r._id, "approve")}
                            >
                              Valider
                            </button>

                            <button
                              className="px-3 py-2 rounded-lg bg-amber-600 text-white hover:opacity-90 disabled:opacity-60"
                              disabled={busy}
                              onClick={() => act(r._id, "reject")}
                            >
                              Refuser
                            </button>

                            <button
                              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
                              disabled={busy}
                              onClick={() => act(r._id, "cancel")}
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Traitée
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr className="border-t">
                    <td className="px-6 py-6 text-slate-600" colSpan={5}>
                      Aucune réservation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
