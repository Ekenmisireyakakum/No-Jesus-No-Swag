export function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function fail(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}
