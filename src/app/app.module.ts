import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule, JsonpModule, Http, RequestOptions } from '@angular/http';
import { RouterModule, Routes } from '@angular/router';
import { AuthHttp, AuthConfig } from 'angular2-jwt';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { EntranceComponent } from './entrance/entrance.component';
import { RoomComponent } from './room/room.component';
import { SignupComponent } from './signup/signup.component';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RoomService } from './room.service';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { RoomsFilterPipe } from './entrance/rooms-filter.pipe'

const appRoutes = [
  { path: '', component: HomeComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'entrance', component: EntranceComponent, canActivate: [AuthGuard] },
  { path: 'room', component: RoomComponent, canActivate: [AuthGuard] },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: '**', component: PageNotFoundComponent }
]

export function authHttpServiceFactory(http: Http, options: RequestOptions) {
  return new AuthHttp(new AuthConfig({
    tokenName: 'token',
    tokenGetter: (() => localStorage.getItem('authToken')),
    globalHeaders: [{ 'Content-Type': 'application/json' }],
  }), http, options);
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    EntranceComponent,
    RoomComponent,
    SignupComponent,
    UnauthorizedComponent,
    PageNotFoundComponent,
    RoomsFilterPipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(appRoutes),
    JsonpModule
  ],
  providers: [
    AuthService,
    {
      provide: AuthHttp,
      useFactory: authHttpServiceFactory,
      deps: [Http, RequestOptions]
    },
    AuthGuard,
    RoomService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
