// CloudFront Function `rento-vroom-web-router` (viewer request) on the website distribution
// E19WXD8ZXT5ZQM (plan §1.4, §13.1). It is published by hand, not by the pipeline; see
// "Changing the page router" in DEPLOYING_UPDATES.md. Runtime: cloudfront-js-2.0.
// It runs on the default behaviour and on the /cars/* and /rental/* behaviours.

// The static public pages that have their own prerendered file (src/seo/pages.ts; a test keeps
// this list the same). Page "/x" is served from "/pages/x.html", and "/" from "/pages/home.html".
var PAGES = [
  '/',
  '/cars',
  '/search',
  '/how-it-works',
  '/become-a-host',
  '/safety',
  '/insurance',
  '/faq',
  '/help',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/cancellation-policy',
  '/host-agreement',
  '/guest-agreement',
  '/login',
  '/signup',
  '/forgot-password',
];

// Vehicle and destination pages get their tags from the backend: the /cars/* and /rental/* behaviours
// send them to api.<domain>/pages (plan §1.4). Their URLs pass through unchanged.
var BACKEND_PAGES = ['/cars/', '/rental/'];

function queryString(request) {
  var qs = Object.keys(request.querystring)
    .map(function (k) {
      return k + '=' + request.querystring[k].value;
    })
    .join('&');
  return qs ? '?' + qs : '';
}

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } },
  };
}

function handler(event) {
  var request = event.request;

  // The bare domain moves to www, keeping the path and query string.
  if (request.headers.host.value === 'rentovroom.com') {
    return redirect('https://www.rentovroom.com' + request.uri + queryString(request));
  }

  // "/how-it-works/" is the same page as "/how-it-works".
  var uri = request.uri;
  if (uri.length > 1 && uri.charAt(uri.length - 1) === '/') uri = uri.slice(0, -1);

  for (var i = 0; i < BACKEND_PAGES.length; i++) {
    if (request.uri.indexOf(BACKEND_PAGES[i]) === 0) {
      // One URL per page: "/cars/x/" moves to "/cars/x", and "/cars/" to "/cars" (Browse cars).
      if (uri !== request.uri) return redirect(uri + queryString(request));
      return request;
    }
  }

  if (PAGES.indexOf(uri) !== -1) {
    request.uri = '/pages/' + (uri === '/' ? 'home' : uri.slice(1)) + '.html';
  } else if (uri.split('/').pop().indexOf('.') === -1) {
    // Every other app URL (account, host, admin, checkout, not found) loads the app itself.
    request.uri = '/index.html';
  }
  return request;
}
