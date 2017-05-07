import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription'
import { Router } from '@angular/router'
import { RoomService } from '../room.service'

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

  constructor(private roomService: RoomService, private router: Router) { }

  ngOnInit() {
    this.roomService.connect();

    this.roomsSubscription = this.roomService.rooms$.subscribe(rooms => {
      this.rooms = rooms;
    })

    this.roomService.getRooms();

    this.roomService.roomConfirmed
      .asObservable()
      .subscribe(() => {
        this.router.navigate(['room']);
      })
  }

  ngOnDestroy() {
    this.roomsSubscription.unsubscribe();
  }

  createRoom() {
    this.roomService.createRoom(this.title, this.maxPlayers, this.game);
  }
}
