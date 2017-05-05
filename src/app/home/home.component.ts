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

  private username: string = "";
  private password: string = "";

  login() {
    this.authService.login(this.username, this.password)
      .subscribe(() => {
        this.router.navigate(['entrance']);
      });
  }
}
