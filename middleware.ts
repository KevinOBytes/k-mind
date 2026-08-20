import { auth } from '@/auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isAuthRoute = nextUrl.pathname === '/login' || nextUrl.pathname === '/register';
  const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname.startsWith('/map');

  if (isDashboardRoute) {
    if (!isLoggedIn) {
      return Response.redirect(new URL('/login', nextUrl));
    }
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL('/dashboard', nextUrl));
    }
  }

  return;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
