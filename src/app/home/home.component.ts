import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'
import { AuthService } from '../auth.service'

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.styl']
})
export class HomeComponent implements OnInit {
  username: string;
  password: string;

  constructor(
    private authService: AuthService,
    private router: Router) { }

  ngOnInit() {
  }

  login() {
    this.authService.login(this.username, this.password)
      .then(() => {
        this.router.navigate(['entrance']);
      })
      .catch(err => {
        console.error(err);
      });
  }

  navigate(commands) {
    this.router.navigate(commands);
  }
}
