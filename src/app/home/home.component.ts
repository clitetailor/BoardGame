import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'
import { AuthService } from '../auth.service'

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.styl']
})
export class HomeComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private router: Router) { }

  ngOnInit() {
  }

  login(username, password) {
    this.authService.login(username, password)
      .then(() => {
        this.router.navigate(['entrance']);
      })
      .catch(err => {
        console.error(err);
      });
  }
}
