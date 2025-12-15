// frontend/src/api/reservations.js
import { reservationAPI } from "../services/api";

export const getReservations = (params = {}) => reservationAPI.getReservations(params);
export const getReservationById = (id) => reservationAPI.getReservationById(id);
export const approveReservation = (id, notes = "") => reservationAPI.approveReservation(id, notes);
export const rejectReservation = (id, notes = "") => reservationAPI.rejectReservation(id, notes);
export const getReservationStats = (params = {}) => reservationAPI.getReservationStats(params);
