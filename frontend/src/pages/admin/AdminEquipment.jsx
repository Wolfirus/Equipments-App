import React, { useEffect, useMemo, useState } from "react";
import { equipmentAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function Pill({ text }) {
  const cls =
    text === "available"
      ? "bg-green-100 text-green-700"
      : text === "maintenance"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-slate-200 text-slate-700";
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>{text || "unknown"}</span>;
}

export default function AdminEquipment() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", description: "", status: "available" });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => (x.name || "").toLowerCase().includes(s) || (x.category?.name || x.category || "").toLowerCase().includes(s));
  }, [items, q]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await equipmentAPI.list({ page: 1, limit: 200 });
      const list = res?.data?.equipment || res?.equipment || res?.data || [];
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

  function openCreate() {
    setEditing(null);
    setForm({ name: "", category: "", description: "", status: "available" });
    setOpen(true);
  }

  function openEdit(it) {
    setEditing(it);
    setForm({
      name: it.name || "",
      category: it.category?.name || it.category || "",
      description: it.description || "",
      status: it.status || "available",
    });
    setOpen(true);
  }

  async function save() {
    setErr("");
    try {
      if (editing?._id) await equipmentAPI.update(editing._id, form);
      else await equipmentAPI.create(form);
      setOpen(false);
      await load();
    } catch (e) {
      setErr(e.message || "Erreur save");
    }
  }

  async function remove(it) {
    if (!window.confirm("Supprimer cet équipement ?")) return;
    setErr("");
    try {
      await equipmentAPI.remove(it._id);
      await load();
    } catch (e) {
      setErr(e.message || "Erreur delete");
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
          <h1 className="text-2xl font-semibold text-slate-900">Gestion des équipements</h1>
          <p className="text-sm text-slate-600">CRUD équipements.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm" onClick={load}>
            Rafraîchir
          </button>
          <button className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90 text-sm" onClick={openCreate}>
            + Ajouter
          </button>
        </div>
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
          <div className="text-xs text-slate-500">{filtered.length} élément(s)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Nom</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Catégorie</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Statut</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr className="border-t">
                  <td className="px-6 py-6 text-slate-600" colSpan={4}>Chargement...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="border-t">
                  <td className="px-6 py-6 text-slate-600" colSpan={4}>Aucun équipement.</td>
                </tr>
              ) : (
                filtered.map((it) => (
                  <tr key={it._id} className="border-t">
                    <td className="px-6 py-4 font-medium text-slate-900">{it.name || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{it.category?.name || it.category || "—"}</td>
                    <td className="px-6 py-4"><Pill text={it.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50" onClick={() => openEdit(it)}>Modifier</button>
                        <button className="px-3 py-2 rounded-lg bg-red-600 text-white hover:opacity-90" onClick={() => remove(it)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-slate-900">{editing ? "Modifier" : "Ajouter"} équipement</div>
              <button className="w-10 h-10 rounded-lg border border-gray-200" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Nom</label>
                <input className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Catégorie</label>
                <input className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Statut</label>
                <select className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="available">available</option>
                  <option value="maintenance">maintenance</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm" onClick={() => setOpen(false)}>Annuler</button>
              <button className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90 text-sm" onClick={save}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
