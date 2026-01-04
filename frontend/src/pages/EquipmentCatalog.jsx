import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { equipmentAPI } from "../services/api";
import EquipmentCard from "../components/EquipmentCard";

export default function EquipmentCatalog() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const isSingle = Boolean(id);

  useEffect(() => {
    (async () => {
      try {
        const cats = await equipmentAPI.getCategories();
        const list = cats?.data?.categories || cats?.categories || cats?.data || [];
        setCategories(Array.isArray(list) ? list : []);
      } catch {
        // ignore categories failure
      }
    })();
  }, []);

  async function load() {
    setLoading(true);
    setErr("");

    try {
      if (isSingle) {
        const one = await equipmentAPI.getEquipmentById(id);
        const data = one?.data?.data || one?.data || one;
        setItems(data ? [data] : []);
      } else {
        const res = await equipmentAPI.getEquipment({
          search,
          category,
          status,
          available: availableOnly ? true : undefined,
          page: 1,
          limit: 24,
        });

        const list = res?.data?.equipment || res?.equipment || res?.data || [];
        setItems(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isSingle]);

  const filtered = useMemo(() => {
    if (isSingle) return items;

    const s = search.trim().toLowerCase();
    return items.filter((x) => {
      const name = (x.name || "").toLowerCase();
      const catName = x.category?.name || x.category || "";
      const okSearch = !s || name.includes(s);
      const okCat = !category || String(catName) === String(category);
      const okStatus = !status || x.status === status;
      const okAvail =
        !availableOnly || x.available === true || x.status === "available";
      return okSearch && okCat && okStatus && okAvail;
    });
  }, [items, search, category, status, availableOnly, isSingle]);

  const handleReserve = (equipmentId) =>
    navigate(`/reservations?equipment=${equipmentId}`);

  const categoryOptions = useMemo(() => {
    // supports categories as strings or objects like {_id, name}
    return categories
      .map((c) => {
        if (typeof c === "string") return { value: c, label: c };
        const label = c?.name || c?.label || c?._id;
        const value = c?.name || c?._id;
        return value ? { value, label: label || value } : null;
      })
      .filter(Boolean);
  }, [categories]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isSingle ? "Détail équipement" : "Catalogue d'équipements"}
          </h1>
          <p className="text-sm text-slate-600">
            {isSingle
              ? "Consultez les informations de l’équipement."
              : "Recherchez et réservez facilement."}
          </p>
        </div>

        {isSingle && (
          <button
            className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm"
            onClick={() => navigate("/equipment")}
          >
            ← Retour
          </button>
        )}
      </div>

      {!isSingle && (
        <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Toutes catégories</option>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tous statuts</option>
              <option value="available">Disponible</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <button
              className={`rounded-xl px-4 py-3 text-sm border ${
                availableOnly
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setAvailableOnly((v) => !v)}
            >
              {availableOnly ? "Disponible seulement" : "Inclure indisponible"}
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:opacity-90"
              onClick={load}
            >
              Appliquer
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm"
              onClick={() => {
                setSearch("");
                setCategory("");
                setStatus("");
                setAvailableOnly(false);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {err}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-slate-600">
          Chargement...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item._id}
              className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
            >
              <EquipmentCard
                equipment={item}
                onReserve={handleReserve}
                compact={!isSingle}
              />

              {!isSingle && (
                <button
                  className="mt-3 w-full px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                  onClick={() => navigate(`/equipment/${item._id}`)}
                >
                  Voir détails
                </button>
              )}
            </div>
          ))}

          {!filtered.length && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-slate-600">
              Aucun équipement trouvé.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
