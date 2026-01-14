import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { reservationAPI, equipmentAPI } from "../services/api";

const emptyForm = {
  equipment_id: "",
  start_date: "",
  end_date: "",
  quantity: 1,
  purpose: "",
  notes: "",
};

export default function ReservationManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillEquipment = searchParams.get("equipment") || "";

  const [reservations, setReservations] = useState([]);
  const [equipment, setEquipment] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // ✅ Mes réservations (backend: /reservations/me)
      const myData = await reservationAPI.me({ page: 1, limit: 50 });
      const myList = Array.isArray(myData)
        ? myData
        : Array.isArray(myData?.reservations)
        ? myData.reservations
        : [];
      setReservations(myList);

      // ✅ Liste équipements (backend: /equipment)
      const eqData = await equipmentAPI.list({ page: 1, limit: 200 });
      const eqList = Array.isArray(eqData)
        ? eqData
        : Array.isArray(eqData?.equipment)
        ? eqData.equipment
        : [];
      setEquipment(eqList);
    } catch (e) {
      setErr(e.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prefillEquipment) {
      setOpen(true);
      setForm((p) => ({ ...p, equipment_id: prefillEquipment }));
    }
  }, [prefillEquipment]);

  const equipmentOptions = useMemo(() => {
    // optionnel: filtrer seulement available
    return equipment;
  }, [equipment]);

  async function create(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");

    try {
      // ✅ Important: backend exige equipment_id, start_date, end_date, purpose
      const payload = {
        equipment_id: form.equipment_id,
        start_date: form.start_date,
        end_date: form.end_date,
        quantity: Number(form.quantity || 1),
        purpose: (form.purpose || "").trim(),
        notes: (form.notes || "").trim(),
      };

      await reservationAPI.create(payload);

      setOpen(false);
      setForm(emptyForm);
      await load();
      navigate("/reservations", { replace: true });
    } catch (e2) {
      setErr(e2.message || "Erreur création");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Réservations</h1>
          <p className="text-sm text-slate-600 mt-1">
            Créer et consulter vos réservations.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm"
            onClick={load}
            disabled={loading}
          >
            Rafraîchir
          </button>

          <button
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90 text-sm"
            onClick={() => {
              setForm((p) => ({ ...emptyForm, equipment_id: prefillEquipment || "" }));
              setOpen(true);
            }}
          >
            + Nouvelle réservation
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {err}
        </div>
      )}

      {/* Liste réservations */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-slate-900">Mes réservations</div>
          <div className="text-xs text-slate-500">{reservations.length} élément(s)</div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-600">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Équipement</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Période</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Quantité</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => {
                  const eqName =
                    r.equipment_id?.name ||
                    r.equipment?.name ||
                    r.equipment_name ||
                    "—";

                  return (
                    <tr key={r._id} className="border-t">
                      <td className="px-6 py-4 font-medium text-slate-900">{eqName}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {r.start_date ? new Date(r.start_date).toLocaleDateString("fr-FR") : "—"} →{" "}
                        {r.end_date ? new Date(r.end_date).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{r.quantity ?? 1}</td>
                      <td className="px-6 py-4 text-slate-600">{r.status || "—"}</td>
                    </tr>
                  );
                })}

                {!reservations.length && (
                  <tr className="border-t">
                    <td className="px-6 py-6 text-slate-600" colSpan={4}>
                      Aucune réservation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal création */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-slate-900">Nouvelle réservation</div>
              <button
                className="w-10 h-10 rounded-lg border border-gray-200"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={create}>
              <div>
                <label className="text-xs font-semibold text-slate-700">Équipement</label>
                <select
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                  value={form.equipment_id}
                  onChange={(e) => setForm((p) => ({ ...p, equipment_id: e.target.value }))}
                  required
                >
                  <option value="">—</option>
                  {equipmentOptions.map((x) => (
                    <option key={x._id} value={x._id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Date début</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.start_date}
                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Date fin</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.end_date}
                    onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Quantité</label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, quantity: Number(e.target.value) }))
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Motif</label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                  rows={3}
                  value={form.purpose}
                  onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Notes (optionnel)
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm"
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90 text-sm disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
