function ok(res, data = null, message = "") {
  return res.json({ success: true, message, data });
}

function created(res, data = null, message = "") {
  return res.status(201).json({ success: true, message, data });
}

function fail(res, status = 400, message = "Erreur", extra = {}) {
  return res.status(status).json({ success: false, message, ...extra });
}

module.exports = { ok, created, fail };
