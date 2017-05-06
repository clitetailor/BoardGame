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

  roomSubscription: Subscription;

  constructor(private roomService: RoomService) { }

  ngOnInit() {
    this.roomService.connect();

    this.roomSubscription = this.roomService.rooms$.subscribe(rooms => {
      console.log(rooms);
      this.rooms = rooms;
    })

    this.roomService.getRooms();
  }

  ngOnDestroy() {
    this.roomSubscription.unsubscribe();
  }

  createRoom(title: string, maxPlayers: number, game: string) {
    this.roomService.createRoom(title, maxPlayers, game);
  }
}
