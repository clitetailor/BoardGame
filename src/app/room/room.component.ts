import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RoomService } from '../room.service';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.styl']
})
export class RoomComponent implements OnInit {
  roomInfo = {}
  players = []
  waitingPlayers = []

  constructor(private roomService: RoomService, private router: Router) { }

  ngOnInit() {
    this.roomService.connect();

    this.roomService.roomConfirmed.asObservable().subscribe(room =>
      this.roomInfo = room);

    this.roomService.roomPlayers.asObservable().subscribe(players =>
      this.players = players);

    this.roomService.noRoom$.subscribe(() => {
      this.router.navigate(['entrance'])
    })
  }

  ready() {
    this.roomService.ready();
  }

  ejectPlayer(username) {
    this.roomService.ejectPlayer(username);
  }

  exitRoom() {
    this.roomService.exitRoom();
  }

  invitePlayer(username) {
    this.roomService.invitePlayer(username);
  }
}
