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
  roomConfirmedSubscription: Subscription;
  connectionSubscription: Subscription;

  title: string;
  maxPlayers: number;
  game: string;

  constructor(private roomService: RoomService, private router: Router) { }

  ngOnInit() {
    this.roomService.connect();

    this.roomsSubscription = this.roomService.rooms$.subscribe(rooms => {
      this.rooms = rooms;
    })

    this.roomConfirmedSubscription = this.roomService.roomConfirmed
      .asObservable()
      .subscribe((room) => {
        if (!room) {
          return;
        }
        this.router.navigate(['room']);
      })

    this.connectionSubscription = this.roomService.connected$.subscribe(() => {
      this.roomService.getRooms();
      this.roomService.checkRoom();
    })
  }

  ngOnDestroy() {
    this.roomsSubscription.unsubscribe();
    this.roomConfirmedSubscription.unsubscribe();
    this.connectionSubscription.unsubscribe();
  }

  createRoom() {
    this.roomService.createRoom(this.title, this.maxPlayers, this.game);
  }

  joinRoom(roomId) {
    this.roomService.joinRoom(roomId);
  }
}
