import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { equipmentAPI } from "../services/api";

const DEFAULT_CATEGORIES = [
  "Matériels de bureau",
  "Imprimantes",
  "PC",
  "Écrans",
  "Réseau",
  "Accessoires",
];

const emptyForm = {
  name: "",
  description: "",
  category: "",
  status: "available",
  quantity: 1,
  image_url: "",
};

export default function AdminEquipments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      // ===== CATEGORIES =====
      const catsRes = await equipmentAPI.getCategories();
      if (!catsRes.success) {
        // si backend categories plante -> fallback
        setCategories(DEFAULT_CATEGORIES);
      } else {
        const catList =
          catsRes?.data?.categories ||
          catsRes?.data ||
          [];

        const normalized = Array.isArray(catList) ? catList : [];
        setCategories(normalized.length ? normalized : DEFAULT_CATEGORIES);
      }

      // ===== EQUIPMENT =====
      const eqRes = await equipmentAPI.getEquipment({ page: 1, limit: 200 });
      if (!eqRes.success) {
        setErr(eqRes.error || "Erreur lors de la récupération des équipements");
        setItems([]);
      } else {
        const list =
          eqRes?.data?.equipment ||
          eqRes?.data?.data ||
          eqRes?.data ||
          [];
        setItems(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      setErr(e?.message || "Erreur lors de la récupération des équipements");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => (x.name || "").toLowerCase().includes(s));
  }, [items, q]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditId(item._id);

    const qte = Number(item.total_quantity ?? item.quantity ?? 1) || 1;

    setForm({
      name: item.name || "",
      description: item.description || "",
      category: item.category?.name || item.category || "",
      status: item.status || "available",
      quantity: qte,
      image_url: item.image_url || item.image || "",
    });

    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");

    try {
      const totalQty = Number(form.quantity || 1);

      // ✅ Ton backend veut total_quantity + available_quantity
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        status: form.status,
        total_quantity: totalQty,
        available_quantity: form.status === "retired" ? 0 : totalQty,
        image_url: form.image_url,
      };

      let res;
      if (editId) res = await equipmentAPI.update(editId, payload);
      else res = await equipmentAPI.create(payload);

      if (!res.success) {
        setErr(res.error || "Erreur sauvegarde");
        return;
      }

      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      await load();
    } catch (e2) {
      setErr(e2?.message || "Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Supprimer cet équipement ?")) return;
    const res = await equipmentAPI.remove(id);
    if (!res.success) {
      alert(res.error || "Erreur suppression");
      return;
    }
    setItems((prev) => prev.filter((x) => x._id !== id));
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="font-semibold text-slate-900">Accès administrateur requis.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion des équipements</h1>
          <p className="text-sm text-slate-600 mt-1">Créer, modifier, supprimer les équipements.</p>
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
            onClick={openCreate}
          >
            + Ajouter
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {err}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <input
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
          placeholder="Rechercher un équipement..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-slate-900">Liste</div>
          <div className="text-xs text-slate-500">{filtered.length} élément(s)</div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-600">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Nom</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Catégorie</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Statut</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Quantité</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => {
                  const qty = x.total_quantity ?? x.quantity ?? "—";
                  return (
                    <tr key={x._id} className="border-t">
                      <td className="px-6 py-4 font-medium text-slate-900">{x.name || "—"}</td>
                      <td className="px-6 py-4 text-slate-600">{x.category?.name || x.category || "—"}</td>
                      <td className="px-6 py-4 text-slate-600">{x.status || "—"}</td>
                      <td className="px-6 py-4 text-slate-600">{qty}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                            onClick={() => openEdit(x)}
                          >
                            Modifier
                          </button>
                          <button
                            className="px-3 py-2 rounded-lg bg-red-600 text-white hover:opacity-90"
                            onClick={() => remove(x._id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr className="border-t">
                    <td className="px-6 py-6 text-slate-600" colSpan={5}>
                      Aucun équipement.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-slate-900">
                {editId ? "Modifier équipement" : "Nouvel équipement"}
              </div>
              <button
                className="w-10 h-10 rounded-lg border border-gray-200"
                onClick={() => setOpen(false)}
                type="button"
              >
                ✕
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={submit}>
              <div>
                <label className="text-xs font-semibold text-slate-700">Nom</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Catégorie</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    required
                  >
                    <option value="">—</option>
                    {categories.map((c) =>
                      typeof c === "string" ? (
                        <option key={c} value={c}>{c}</option>
                      ) : (
                        <option key={c._id} value={c.name || c._id}>{c.name || c._id}</option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Statut</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="available">Disponible</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retiré</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Quantité totale</label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.quantity}
                    onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Image URL</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.image_url}
                    onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                  />
                </div>
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
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90 text-sm"
                  disabled={saving}
                >
                  {saving ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
