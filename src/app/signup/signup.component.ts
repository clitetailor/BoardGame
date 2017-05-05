import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service'
import { Router } from '@angular/router'

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.styl']
})
export class SignupComponent implements OnInit {

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
  }

  signup(username, password) {
    this.authService.signup(username, password)
      .then(() => {
        this.router.navigate(['entrance'])
      })
      .catch(err => {
        console.error(err)
      });
  }
}
