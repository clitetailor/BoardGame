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
}
