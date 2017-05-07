import { Component, OnInit } from '@angular/core';
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

  constructor(private roomService: RoomService) { }

  ngOnInit() {
    this.roomService.roomConfirmed$.subscribe(room =>
      this.roomInfo = room);

    this.roomService.roomPlayers$.subscribe(players =>
      this.players = players);
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
