import { Component, OnInit, OnDestroy } from '@angular/core';
import { RoomService } from '../room.service'
import { Subscription } from 'rxjs/Subscription'

@Component({
  selector: 'app-entrance',
  templateUrl: './entrance.component.html',
  styleUrls: ['./entrance.component.styl']
})
export class EntranceComponent implements OnInit, OnDestroy {
  rooms: any[] = []
  search: string = "";

  roomsSubscription: Subscription;

  title: string;
  maxPlayers: number;
  game: string;

  constructor(private roomService: RoomService) { }

  ngOnInit() {
    this.roomService.connect();

    this.roomsSubscription = this.roomService.rooms$.subscribe(rooms => {
      console.log(rooms);
      this.rooms = rooms;
    })

    this.roomService.getRooms();
  }

  ngOnDestroy() {
    this.roomsSubscription.unsubscribe();
  }

  createRoom() {
    this.roomService.createRoom(this.title, this.maxPlayers, this.game);
  }
}
