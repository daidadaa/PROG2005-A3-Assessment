// api-logging.interceptor.ts - logs every http request/response
// Author: WU Shaowei - set up request logging and error formatting

import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

const REQUEST_TIMEOUT = 10000; // 10 seconds

export const apiLoggingInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<any>> => {
  const isApiCall = req.url.includes('prog2005.it.scu.edu.au');

  if (isApiCall) {
    console.log(`[HTTP] ${req.method} ${req.url}`);
  }

  return next(req).pipe(
    timeout(REQUEST_TIMEOUT),
    catchError((error: any) => {
      // just log and re-throw, let each service handle their own errors
      console.error(`[HTTP Error] ${error.status || 'network'} - ${req.url}`);

      // basic error messages for common cases
      if (error.status === 0) {
        console.warn('Looks like you are offline');
      } else if (error.status === 404) {
        console.warn('Resource not found on server');
      }

      return throwError(() => error);
    })
  );
};
