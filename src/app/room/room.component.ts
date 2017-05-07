import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription'
import { RoomService } from '../room.service';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.styl']
})
export class RoomComponent implements OnInit, OnDestroy {
  roomInfo: any = {}
  players = []
  waitingPlayers = []

  roomConfirmSubscription: Subscription;
  roomPlayersSubscription: Subscription;
  waitingPlayersSubscription: Subscription;
  noRoomSubscription: Subscription;
  gameOverSubscription: Subscription;

  constructor(private roomService: RoomService, private router: Router) { }

  ngOnInit() {
    this.roomService.connect();

    this.roomConfirmSubscription = this.roomService.roomConfirmed.asObservable().subscribe(room =>
      this.roomInfo = room);

    this.roomPlayersSubscription = this.roomService.roomPlayers.asObservable().subscribe(players =>
      this.players = players);

    this.waitingPlayersSubscription = this.roomService.waitingPlayers$.subscribe(players =>
      this.waitingPlayers = players)

    this.noRoomSubscription = this.roomService.noRoom$.subscribe(() => {
      this.router.navigate(['entrance'])
    })

    this.gameOverSubscription = this.roomService.gameOver$.subscribe((result) => {
      this.roomService.roomConfirmed.next(undefined);
      this.router.navigate(['entrance']);
    })
  }

  ngOnDestroy() {
    this.roomConfirmSubscription.unsubscribe();
    this.roomPlayersSubscription.unsubscribe();
    this.waitingPlayersSubscription.unsubscribe();
    this.noRoomSubscription.unsubscribe();
    this.gameOverSubscription.unsubscribe();
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
