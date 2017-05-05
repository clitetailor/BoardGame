import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-entrance',
  templateUrl: './entrance.component.html',
  styleUrls: ['./entrance.component.styl']
})
export class EntranceComponent implements OnInit {
  rooms = [{
    _id: 35423542345,
    title: "bla, bla, bla",
    game: "yolo",
    maxPlayers: 4,
    numberOfPlayers: 3
  }]

  constructor() { }

  ngOnInit() {
  }

}
