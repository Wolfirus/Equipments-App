import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { equipmentAPI } from "../services/api";

// ✅ Catégories autorisées par ton modèle backend (Equipment.js)
const CATEGORY_ENUM = [
  "Computers",
  "Audio/Video",
  "Office Equipment",
  "Tools",
  "Sports",
  "Laboratory",
  "Medical",
  "Photography",
  "Gaming",
  "Kitchen",
  "Cleaning",
  "Safety",
  "Other",
];

// ✅ Statuts autorisés par ton modèle backend
const STATUS_ENUM = [
  { value: "available", label: "Disponible" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retiré" },
];

const emptyForm = {
  name: "",
  description: "",
  category: "Other",
  status: "available",
  total_quantity: 1,
  available_quantity: 1,
  image_url: "",
};

export default function AdminEquipments() {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isManager = role === "admin" || role === "supervisor";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await equipmentAPI.list({ page: 1, limit: 200 });
      const list = Array.isArray(data?.equipment)
        ? data.equipment
        : Array.isArray(data)
        ? data
        : [];
      setItems(list);
    } catch (e) {
      setErr(e?.message || "Erreur chargement équipements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isManager) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => String(x.name || "").toLowerCase().includes(s));
  }, [items, q]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(item) {
    setEditId(item._id);

    setForm({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "Other",
      status: item.status || "available",
      total_quantity: Number(item.total_quantity ?? item.quantity ?? 1),
      available_quantity: Number(item.available_quantity ?? item.total_quantity ?? 1),
      image_url: Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : "",
    });

    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
    setErr("");
  }

  // ✅ Payload compatible backend:
  // - total_quantity obligatoire
  // - description obligatoire
  // - images[] au lieu de image_url
  function buildPayload() {
    const totalQty = Number(form.total_quantity || 0);
    const availQty =
      form.available_quantity === "" || form.available_quantity === null || form.available_quantity === undefined
        ? totalQty
        : Number(form.available_quantity);

    return {
      name: String(form.name || "").trim(),
      description: String(form.description || "").trim(),
      category: form.category,
      status: form.status,
      total_quantity: totalQty,
      available_quantity: Math.max(0, Math.min(availQty, totalQty)), // clamp
      images: form.image_url ? [String(form.image_url).trim()] : [],
    };
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");

    try {
      const payload = buildPayload();

      // ✅ validations claires pour la soutenance
      const missing = [];
      if (!payload.name) missing.push("name");
      if (!payload.description) missing.push("description");
      if (!payload.category) missing.push("category");
      if (!payload.total_quantity || payload.total_quantity < 1) missing.push("total_quantity");

      if (missing.length) {
        setErr(`Champs requis manquants: ${missing.join(", ")}`);
        setSaving(false);
        return;
      }

      if (!CATEGORY_ENUM.includes(payload.category)) {
        setErr("Catégorie invalide (doit être une valeur du catalogue).");
        setSaving(false);
        return;
      }

      if (!STATUS_ENUM.map((s) => s.value).includes(payload.status)) {
        setErr("Statut invalide.");
        setSaving(false);
        return;
      }

      if (editId) {
        await equipmentAPI.update(editId, payload);
      } else {
        await equipmentAPI.create(payload);
      }

      closeModal();
      await load();
    } catch (e2) {
      // backend renvoie souvent: { success:false, message, errors:[...] }
      const msg =
        e2?.message ||
        (Array.isArray(e2?.errors) ? e2.errors.join(" | ") : "") ||
        "Erreur sauvegarde";
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Supprimer cet équipement ?")) return;
    try {
      await equipmentAPI.remove(id);
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e) {
      alert(e?.message || "Erreur suppression");
    }
  }

  if (!isManager) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="font-semibold text-slate-900">Accès admin/superviseur requis.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion des équipements</h1>
          <p className="text-sm text-slate-600 mt-1">Créer, modifier et supprimer les équipements.</p>
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

      {/* Error */}
      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {err}
        </div>
      )}

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <input
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
          placeholder="Rechercher un équipement..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Table */}
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
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Qté (totale)</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Qté (dispo)</th>
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

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-slate-900">
                {editId ? "Modifier équipement" : "Nouvel équipement"}
              </div>
              <button
                className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={submit}>
              <div>
                <label className="text-xs font-semibold text-slate-700">Nom *</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description * (obligatoire)</label>
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
                  <label className="text-xs font-semibold text-slate-700">Catégorie *</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORY_ENUM.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Statut</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    {STATUS_ENUM.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Quantité totale *</label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.total_quantity}
                    onChange={(e) => {
                      const total = Number(e.target.value || 1);
                      setForm((p) => ({
                        ...p,
                        total_quantity: total,
                        // par défaut on aligne disponible sur total
                        available_quantity: Math.min(Number(p.available_quantity || total), total),
                      }));
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Quantité disponible (optionnel)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                    value={form.available_quantity}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, available_quantity: Number(e.target.value) }))
                    }
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    Si vide, le backend met disponible = total.
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Image URL (optionnel — doit finir par .jpg/.png/.webp)
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                  value={form.image_url}
                  onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm"
                  onClick={closeModal}
                >
                  Annuler
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90 text-sm disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </div>

              <div className="text-xs text-slate-500 pt-2">
                * Champs obligatoires imposés par le backend : name, description, category, total_quantity.
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
