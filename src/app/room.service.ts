import { Injectable } from '@angular/core';
import { Http } from '@angular/http'
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import * as io from 'socket.io-client';

@Injectable()
export class RoomService {

  constructor(private http: Http) { }

  private socket: SocketIOClient.Socket;

  rooms$: Observable<any>;
  roomConfirmed$: Observable<any>;
  joinRoomConfirmed$: Observable<any>;
  roomPlayers$: Observable<any>;
  waitingPlayers$: Observable<any>;

  connect() {
    if (this.isConnected()) {
      return;
    }

    this.socket = io('http://localhost:9000');

    this.socket.on('connect', () => {
      this.socket.emit('authenticate', { token: localStorage.getItem('authToken') })
        .on('authenticated', () => {
          console.log('authenticated')
        })
        .on('unauthorized', (msg) => {
          console.log("unauthorized: " + JSON.stringify(msg.data));
          throw new Error(msg.data.type);
        })
    })

    this.rooms$ = new Observable(observer => {
      this.socket.on('rooms', (rooms) => {
        observer.next(rooms);
      })
    })

    this.roomConfirmed$ = new Observable(observer => {
      this.socket.on('room-confirmed', (room) => {
        observer.next(room);
      })
    })

    this.roomPlayers$ = new Observable(observer => {
      this.socket.on('room-players', (players) => {
        observer.next(players);
      })
    })

    this.waitingPlayers$ = new Observable(observer => {
      this.socket.on('waiting-players', (players) => {
        observer.next(players);
      })
    })
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  getRooms() {
    this.socket.emit('get-rooms');
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

  invitePlayer(playerId) {
    if (this.isConnected()) {
      this.socket.emit('invite-player', playerId);
    }
  }

  ejectPlayer(playerId) {
    if (this.isConnected()) {
      this.socket.emit('eject-player', playerId);
    }
  }

  ready() {
    if (this.isConnected()) {
      this.socket.emit('ready')
    }
  }
}
