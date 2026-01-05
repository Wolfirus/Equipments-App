import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { equipmentAPI } from "../services/api";

/** نفس base url و token كيف services/api.js (باش ما نزيدوش ملفات) */
const API_BASE =
  (process.env.REACT_APP_API_URL || "").replace(/\/$/, "") || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("auth_token");
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
}

const defaultCategories = [
  // خليهوم متوافقين مع EquipmentSchema enum متاع category (بالإنجليزي)
  { name: "Computers", description: "PC, laptops, accessoires informatique" },
  { name: "Office Equipment", description: "Imprimantes, scanners, fournitures bureau" },
  { name: "Audio/Video", description: "Projecteurs, micros, caméras..." },
  { name: "Tools", description: "Outils et matériel technique" },
  { name: "Laboratory", description: "Matériel de laboratoire" },
  { name: "Other", description: "Autres équipements" },
];

const emptyForm = {
  name: "",
  description: "",
  category: "",
  status: "available",
  total_quantity: 1,
  available_quantity: 1,
  image_url: "",
};

export default function AdminEquipments() {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const isAdmin = user?.role === "admin";

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      // categories
      const cats = await equipmentAPI.getCategories();
      const catList = cats?.data?.categories || cats?.categories || [];
      setCategories(Array.isArray(catList) ? catList : []);

      // equipments
      const res = await equipmentAPI.getEquipment({ page: 1, limit: 200 });
      const list = res?.data?.equipment || res?.equipment || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e.message || "Erreur chargement");
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
    const tq = Number(item.total_quantity ?? item.quantity ?? 1);
    const aq = Number(item.available_quantity ?? Math.min(tq, tq));
    setForm({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      status: item.status || "available",
      total_quantity: tq,
      available_quantity: aq,
      image_url: Array.isArray(item.images) && item.images.length ? item.images[0] : "",
    });
    setOpen(true);
  };

  /** زر يعمل création catégories وقت اللي DB فارغة */
  const createDefaultCategories = async () => {
    setSaving(true);
    setErr("");
    try {
      // نعمل create وحدة وحدة (backend عندك POST /api/categories)
      for (const c of defaultCategories) {
        await apiRequest("/categories", {
          method: "POST",
          body: JSON.stringify(c),
        });
      }
      await load();
    } catch (e) {
      setErr(e.message || "Erreur création catégories");
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");

    try {
      const totalQ = Number(form.total_quantity || 0);
      const availQ = Number(form.available_quantity || 0);

      if (!form.name?.trim()) throw new Error("Nom requis");
      if (!form.description?.trim()) throw new Error("Description requise");
      if (!form.category?.trim()) throw new Error("Catégorie requise");
      if (!Number.isFinite(totalQ) || totalQ < 1) throw new Error("total_quantity doit être >= 1");
      if (!Number.isFinite(availQ) || availQ < 0) throw new Error("available_quantity doit être >= 0");
      if (availQ > totalQ) throw new Error("available_quantity ne peut pas dépasser total_quantity");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        status: form.status,
        total_quantity: totalQ,
        available_quantity: availQ,
        ...(form.image_url?.trim() ? { images: [form.image_url.trim()] } : {}),
      };

      if (editId) {
        // backend route هو PATCH /api/equipment/:id
        await apiRequest(`/equipment/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await equipmentAPI.create(payload);
      }

      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      await load();
    } catch (e2) {
      setErr(e2.message || "Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Supprimer cet équipement ?")) return;
    try {
      await equipmentAPI.remove(id);
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e) {
      alert(e.message || "Erreur suppression");
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="font-semibold text-slate-900">Accès administrateur requis.</div>
      </div>
    );
  }

  const categoriesEmpty = !loading && categories.length === 0;

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

      {categoriesEmpty && (
        <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Aucune catégorie trouvée.</div>
            <div className="text-xs opacity-80">
              Clique pour créer des catégories par défaut (Bureau, PC, etc.).
            </div>
          </div>
          <button
            className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:opacity-90 text-sm"
            onClick={createDefaultCategories}
            disabled={saving}
          >
            {saving ? "Création..." : "Créer catégories"}
          </button>
        </div>
      )}

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
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Total</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Disponible</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => (
                  <tr key={x._id} className="border-t">
                    <td className="px-6 py-4 font-medium text-slate-900">{x.name || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{x.category || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{x.status || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{x.total_quantity ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{x.available_quantity ?? "—"}</td>
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
                ))}

                {!filtered.length && (
                  <tr className="border-t">
                    <td className="px-6 py-6 text-slate-600" colSpan={6}>
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
              <button className="w-10 h-10 rounded-lg border border-gray-200" onClick={() => setOpen(false)}>
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
                  required
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
                    {categories.map((c) => (
                      <option key={c._id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {categories.length === 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      Pas de catégories → clique sur “Créer catégories” en haut.
                    </div>
                  )}
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
                  <label className="text-xs font-semibold text-slate-700">Total (total_quantity)</label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.total_quantity}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setForm((p) => ({
                        ...p,
                        total_quantity: v,
                        available_quantity: Math.min(Number(p.available_quantity || 0), v),
                      }));
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Disponible (available_quantity)</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.available_quantity}
                    onChange={(e) => setForm((p) => ({ ...p, available_quantity: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Image URL (optionnel)</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                  value={form.image_url}
                  onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
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
