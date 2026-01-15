import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function EquipmentCard({
  equipment,
  availability = null, // { available_quantity, total_quantity, status } ou null
  showReserve = false, // dans le catalogue: false (réserver seulement dans détails)
  onReserve,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [loadingReserve, setLoadingReserve] = useState(false);

  const statusLabel = (status) => {
    const st = String(status || "").toLowerCase();
    if (st === "available") return "Disponible";
    if (st === "maintenance") return "Maintenance";
    if (st === "retired") return "Retiré";
    return st || "—";
  };

  const statusBar = (status) => {
    const st = String(status || "").toLowerCase();
    if (st === "available") return "bg-emerald-500";
    if (st === "maintenance") return "bg-amber-500";
    if (st === "retired") return "bg-slate-500";
    return "bg-slate-400";
  };

  // ✅ Prix sans monnaie (juste nombre + unité)
  const fmt = (v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return n.toFixed(2);
  };

  const hourly = fmt(equipment?.rental_info?.hourly_rate ?? equipment?.hourly_rate);
  const daily = fmt(equipment?.rental_info?.daily_rate ?? equipment?.daily_rate);

  // ✅ Disponibilité: si availability fourni => on l’utilise (période)
  const totalQty = useMemo(() => {
    return Number(availability?.total_quantity ?? equipment?.quantity ?? 1);
  }, [availability, equipment]);

  const availableQty = useMemo(() => {
    // si availability null => on montre la dispo globale
    const v = availability?.available_quantity;
    if (v === undefined || v === null) {
      return Number(equipment?.available_quantity ?? equipment?.quantity ?? 0);
    }
    return Number(v);
  }, [availability, equipment]);

  const effectiveStatus = useMemo(() => {
    // si availability fournit un status, sinon status equipment
    return availability?.status || equipment?.status;
  }, [availability, equipment]);

  const canReserve = useMemo(() => {
    const st = String(effectiveStatus || "").toLowerCase();
    return st === "available" && availableQty > 0;
  }, [effectiveStatus, availableQty]);

  const reserve = async () => {
    if (!equipment?._id) return;
    try {
      setLoadingReserve(true);
      if (typeof onReserve === "function") {
        await onReserve(equipment._id);
      } else {
        navigate(`/equipment/${equipment._id}`);
      }
    } finally {
      setLoadingReserve(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* barre de statut */}
      <div className={`h-2 w-full ${statusBar(effectiveStatus)}`} />

      <div className="p-4">
        {/* image */}
        <div className="w-full h-44 rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center">
          {equipment?.image_url && !imageError ? (
            <img
              src={equipment.image_url}
              alt={equipment?.name || "equipment"}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="text-5xl">📦</div>
          )}
        </div>

        {/* infos */}
        <div className="mt-4">
          <div className="text-base font-semibold text-slate-900">
            {equipment?.name || "—"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {equipment?.category?.name || equipment?.category || "—"}
          </div>

          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <div>
              <span className="font-semibold">Statut :</span>{" "}
              {statusLabel(effectiveStatus)}
            </div>

            {/* ✅ Affichage disponibilité selon période si availability existe */}
            <div>
              <span className="font-semibold">Disponibilité :</span>{" "}
              {availability ? (
                <span>
                  {availableQty}/{totalQty} (période)
                </span>
              ) : (
                <span>
                  {availableQty}/{totalQty}
                </span>
              )}
            </div>

            {(hourly || daily) && (
              <div className="pt-1">
                {hourly && (
                  <div>
                    <span className="font-semibold">Heure :</span> {hourly} / h
                  </div>
                )}
                {daily && (
                  <div>
                    <span className="font-semibold">Jour :</span> {daily} / jour
                  </div>
                )}
              </div>
            )}

            {/* message si période sélectionnée et indisponible */}
            {availability && availableQty <= 0 && (
              <div className="text-xs text-slate-500 mt-2">
                Indisponible pour cette période.
              </div>
            )}
          </div>

          {/* actions (✅ un seul "Voir détails") */}
          <div className="mt-4 flex items-center gap-2">
            <button
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-slate-800"
              onClick={() => navigate(`/equipment/${equipment._id}`)}
            >
              Voir détails
            </button>

            {/* optionnel: réserver (souvent uniquement dans page détails) */}
            {showReserve && user && (
              <button
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-semibold disabled:opacity-60"
                onClick={reserve}
                disabled={!canReserve || loadingReserve}
                title={!canReserve ? "Indisponible" : "Réserver"}
              >
                {loadingReserve ? "..." : "Réserver"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
