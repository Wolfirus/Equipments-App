import React, { useEffect, useMemo, useState } from "react";
import EquipmentCard from "../components/EquipmentCard";
import { equipmentAPI } from "../services/api";

export default function EquipmentCatalog() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filtres
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [includeUnavailable, setIncludeUnavailable] = useState(false);

  // ✅ période
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // map disponibilité par id équipement
  const [availabilityMap, setAvailabilityMap] = useState({}); // { [id]: { available_quantity, total_quantity, status } }

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const catsData = await equipmentAPI.categories();
      const catList = Array.isArray(catsData?.categories)
        ? catsData.categories
        : Array.isArray(catsData)
        ? catsData
        : [];
      setCategories(catList);

      const data = await equipmentAPI.list({ page: 1, limit: 200 });
      const list = Array.isArray(data?.equipment)
        ? data.equipment
        : Array.isArray(data)
        ? data
        : [];
      setItems(list);
    } catch (e) {
      setErr(e?.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ✅ Filtrage local clair (soutenance friendly)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return items.filter((x) => {
      const name = String(x.name || "").toLowerCase();
      const catName = String(x.category?.name || x.category || "").toLowerCase();
      const st = String(x.status || "").toLowerCase();

      const okSearch = !s || name.includes(s) || catName.includes(s);

      const okCat = !cat || catName === String(cat).toLowerCase();
      const okStatus = !status || st === String(status).toLowerCase();

      // si on n’inclut pas indisponible => on garde seulement available + qty>0
      const qty = Number(x.available_quantity ?? x.quantity ?? 0);
      const okAvail = includeUnavailable ? true : st === "available" && qty > 0;

      return okSearch && okCat && okStatus && okAvail;
    });
  }, [items, q, cat, status, includeUnavailable]);

  // ✅ Charger disponibilité par période (si les 2 dates sont présentes et valides)
  useEffect(() => {
    const run = async () => {
      // reset si pas de période
      if (!startDate || !endDate) {
        setAvailabilityMap({});
        return;
      }

      // validation dates
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
        setAvailabilityMap({});
        return;
      }

      // on calcule la disponibilité uniquement pour les équipements affichés
      const current = filtered;

      // on appelle en parallèle (Promise.all) => plus rapide
      const results = await Promise.all(
        current.map(async (eq) => {
          try {
            const data = await equipmentAPI.availability(eq._id, {
              start_date: startDate,
              end_date: endDate,
            });

            // ✅ parsing robuste selon ton backend
            // data peut être { available_quantity, total_quantity, status }
            // ou { data: {...} } selon ton request()
            const d = data?.data ? data.data : data;

            return [
              eq._id,
              {
                available_quantity:
                  d?.available_quantity ?? d?.available ?? d?.remaining ?? 0,
                total_quantity:
                  d?.total_quantity ?? d?.quantity ?? eq.quantity ?? 1,
                status: d?.status ?? eq.status,
              },
            ];
          } catch (err) {
            return [eq._id, null];
          }
        })
      );

      const map = {};
      for (const [id, val] of results) {
        if (val) map[id] = val;
      }
      setAvailabilityMap(map);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, filtered]);

  const resetFilters = () => {
    setQ("");
    setCat("");
    setStatus("");
    setIncludeUnavailable(false);
    setStartDate("");
    setEndDate("");
    setAvailabilityMap({});
  };

  const dateError = useMemo(() => {
    if (!startDate || !endDate) return "";
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "Dates invalides";
    if (e < s) return "La date fin doit être après la date début";
    return "";
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Catalogue d'équipements
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Recherchez et consultez la disponibilité par période.
        </p>
      </div>

      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {err}
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <input
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
            placeholder="Rechercher..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">Toutes catégories</option>
            {categories.map((c) => {
              const name = typeof c === "string" ? c : c?.name;
              if (!name) return null;
              return (
                <option key={name} value={name}>
                  {name}
                </option>
              );
            })}
          </select>

          <select
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tous statuts</option>
            <option value="available">Disponible</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retiré</option>
          </select>

          <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={includeUnavailable}
              onChange={(e) => setIncludeUnavailable(e.target.checked)}
            />
            Inclure indisponible
          </label>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-semibold"
              onClick={load}
              disabled={loading}
            >
              Rafraîchir
            </button>
            <button
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
        </div>

        {/* ✅ Période */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">Date début</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Date fin</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-end text-xs text-slate-500">
            {dateError ? (
              <span className="text-red-600">{dateError}</span>
            ) : startDate && endDate ? (
              <span>Disponibilité calculée pour la période.</span>
            ) : (
              <span>Sélectionnez une période pour voir la disponibilité.</span>
            )}
          </div>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-slate-600">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((eq) => (
            <EquipmentCard
              key={eq._id}
              equipment={eq}
              availability={
                startDate && endDate && !dateError ? availabilityMap[eq._id] || null : null
              }
              showReserve={false} // ✅ dans le catalogue: pas de "Réserver" (réserver dans détails)
            />
          ))}

          {!filtered.length && (
            <div className="text-slate-600">Aucun équipement.</div>
          )}
        </div>
      )}
    </div>
  );
}
