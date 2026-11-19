function handler(event) {
  var request = event.request;
  if (!/\.[A-Za-z0-9]+$/.test(request.uri)) {
    request.uri = "/index.html";
  }
  return request;
}
