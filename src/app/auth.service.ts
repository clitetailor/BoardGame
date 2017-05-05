import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';


@Injectable()
export class AuthService {

  constructor(private http: Http) { }

  loggedIn() {
    return localStorage.getItem('authToken') !== undefined;
  }

  login(username, password) {
    return this.http.post("http://localhost:9000/login", { username, password })
      .map(this.extractData)
      .catch(this.handleError);
  }

  signup(username, password) {
    return this.http.post("http://localhost:9000/signup", { username, password })
      .toPromise()
      .then(this.jwtToken)
      .catch(this.handleError);
  }

  private jwtToken(res: Response) {
    console.log(res.text())
    localStorage.setItem('authToken', res.text());
  }

  private extractData(res: Response) {
    let body = res.json();
    return body.data || {}
  }

  private handleError(error: Response | any) {
    console.log(error);

    let errMsg: string;
    if (error instanceof Response) {
      const body = error.text() || '';
      const err = body || JSON.stringify(body);

      switch (error.status) {
        case 401: {
          errMsg = 'Invalid username or password';
          break;
        }

        case 409: {
          errMsg = 'Username already exists';
          break;
        }

        case 500: {
          errMsg = 'Something has broken';
          break;
        }

        default: {
          errMsg = `Error ${error.status}`
        }
      }
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    return Promise.reject(errMsg);
  }
}
