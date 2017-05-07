import { Injectable } from '@angular/core';
import { Http } from '@angular/http'
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject'
import * as io from 'socket.io-client';

@Injectable()
export class RoomService {

  constructor(private http: Http) { }

  private socket: SocketIOClient.Socket;
  roomConfirmed: ReplaySubject<any>;
  roomPlayers: ReplaySubject<any>;

  connected$: Observable<any>;
  rooms$: Observable<any>;
  joinRoomConfirmed$: Observable<any>;
  waitingPlayers$: Observable<any>;
  noRoom$: Observable<any>;

  connect() {
    if (this.isConnected()) {
      return;
    }

    this.socket = io('http://localhost:9000');

    this.socket.on('connect', () => {
      this.socket.emit('authenticate', { token: localStorage.getItem('authToken') })
        .on('authenticated', () => {
          this.checkRoom();

          console.log('authenticated')
        })
        .on('unauthorized', (msg) => {
          console.log("unauthorized: " + JSON.stringify(msg.data));
          throw new Error(msg.data.type);
        })
    })

    this.connected$ = new Observable(observer => {
      this.socket.on('connect', () => {
        observer.next();
      })
    })

    this.rooms$ = new Observable(observer => {
      this.socket.on('rooms', (rooms) => {
        observer.next(rooms);
      })
    })

    this.roomConfirmed = new ReplaySubject<any>(1)

    let a = new ReplaySubject<any>(5);

    this.socket.on('room-confirmed', (room) => {
      this.roomConfirmed.next(room);
    })

    this.roomPlayers = new ReplaySubject<any[]>(1);

    this.socket.on('room-players', (players) => {
      console.log(players)
      this.roomPlayers.next(players);
    })

    this.waitingPlayers$ = new Observable(observer => {
      this.socket.on('waiting-players', (players) => {
        console.log(players)
        observer.next(players);
      })
    })

    this.noRoom$ = new Observable(observer => {
      this.socket.on('no-room', () => {
        observer.next();
      })
    })
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  checkRoom() {
    if (this.isConnected()) {
      this.socket.emit('check-room');
    }
  }

  getRooms() {
    if (this.isConnected()) {
      this.socket.emit('get-rooms')
    }
  }

  createRoom(title: string, maxPlayers: number, game: string) {
    if (this.isConnected()) {
      this.socket.emit('create-room', title, maxPlayers, game);
    }
  }

  joinRoom(roomId: number) {
    if (this.isConnected()) {
      this.socket.emit('join-room', roomId);
    }
  }

  exitRoom() {
    if (this.isConnected()) {
      this.socket.emit('exit-room');
    }
  }

  invitePlayer(username) {
    if (this.isConnected()) {
      this.socket.emit('invite-player', username);
    }
  }

  ejectPlayer(username) {
    if (this.isConnected()) {
      this.socket.emit('eject-player', username);
    }
  }

  ready() {
    if (this.isConnected()) {
      this.socket.emit('ready')
    }
  }
}
