import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.styl']
})
export class RoomComponent implements OnInit {
  roomInfo = {
    _id: 1231234134,
    title: "bla, bla, bla"
  }

  players = [{
    username: "bla, bla, bla",
    level: 5,
    ready: false
  }]

  pendingPlayers = [{
    username: "someone",
    level: 6
  }]

  constructor() { }

  ngOnInit() {
  }

}
