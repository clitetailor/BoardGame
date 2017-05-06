import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service'
import { Router } from '@angular/router'

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.styl']
})
export class SignupComponent implements OnInit {

  username: string;
  password: string;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
  }

  signup() {
    this.authService.signup(this.username, this.password)
      .then(() => {
        this.router.navigate(['entrance'])
      })
      .catch(err => {
        console.error(err)
      });
  }

  navigate(commands) {
    this.router.navigate(commands);
  }
}
