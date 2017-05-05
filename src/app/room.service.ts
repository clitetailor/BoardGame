import { Injectable } from '@angular/core';
import { Http } from '@angular/http'

@Injectable()
export class RoomService {

  constructor(private http: Http) { }

  connect() {

  }

  getRooms(roomId: number) {
    return this.http.get(`/api/rooms/${roomId}`)
  }


}
